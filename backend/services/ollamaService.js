const path = require('path');
const fs = require('fs');
const { fork } = require('child_process');

// ═══════════════════════════════════════════════════════════════
function resolveModelPath(envPath, targetFilename) {
  if (envPath) {
    if (fs.existsSync(envPath)) return envPath;
    const dir = path.dirname(envPath);
    const correctedPath = path.join(dir, targetFilename);
    if (fs.existsSync(correctedPath)) return correctedPath;
    return envPath;
  }
  return path.join(__dirname, '../../models', targetFilename);
}

const CHAT_MODEL_PATH = resolveModelPath(
  process.env.LLAMA_CHAT_MODEL_PATH,
  'ALLaM-AI_ALLaM-7B-Instruct-preview-Q4_K_M.gguf'
);

const EMBEDDING_MODEL_PATH = resolveModelPath(
  process.env.LLAMA_EMBEDDING_MODEL_PATH,
  'bge-m3-q4_k_m.gguf'
);

const WORKER_SCRIPT_PATH = path.resolve(__dirname, '../workers/aiWorker.js');
const WORKER_STARTUP_TIMEOUT_MS = Number(process.env.AI_WORKER_STARTUP_TIMEOUT_MS) || 10000;

// Noms pour compatibilité
const MODELS = {
  main: path.basename(CHAT_MODEL_PATH),
  chat: path.basename(CHAT_MODEL_PATH),
  fallback: path.basename(CHAT_MODEL_PATH),
  embedding: path.basename(EMBEDDING_MODEL_PATH),
};

// ═══════════════════════════════════════════════════════════════
// Isolated AI Worker Process Manager (child_process.fork + IPC)
// ═══════════════════════════════════════════════════════════════
let workerProcess = null;
let workerReadyPromise = null;
let isIntentionalShutdown = false;
let requestCounter = 0;
const pendingRequests = new Map();

function rejectAllPending(reasonMessage, reasonCode = 'AI_SERVICE_DOWN') {
  for (const [reqId, pending] of pendingRequests.entries()) {
    clearTimeout(pending.timer);
    const err = new Error(reasonMessage || reasonCode);
    err.code = reasonCode;
    pending.reject(err);
    pendingRequests.delete(reqId);
  }
}

function handleWorkerMessage(msg) {
  if (!msg || typeof msg !== 'object') return;
  if (msg.type === 'ready') return;

  const { id, ok, result, error } = msg;
  if (!id || !pendingRequests.has(id)) return;

  const pending = pendingRequests.get(id);
  clearTimeout(pending.timer);
  pendingRequests.delete(id);

  if (ok) {
    pending.resolve(result);
  } else {
    const err = new Error(error?.message || 'AI_SERVICE_DOWN');
    err.code = error?.code || 'AI_SERVICE_DOWN';
    if (error?.original) err.original = error.original;
    pending.reject(err);
  }
}

function spawnWorker() {
  if (workerProcess && workerProcess.connected && !workerProcess.killed) {
    return workerReadyPromise;
  }

  isIntentionalShutdown = false;

  workerReadyPromise = new Promise((resolve, reject) => {
    const child = fork(WORKER_SCRIPT_PATH, [], {
      env: {
        ...process.env,
        LLAMA_CHAT_MODEL_PATH: CHAT_MODEL_PATH,
        LLAMA_EMBEDDING_MODEL_PATH: EMBEDDING_MODEL_PATH,
      },
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    });

    workerProcess = child;
    let settledReady = false;

    const readyTimer = setTimeout(() => {
      if (!settledReady) {
        settledReady = true;
        const err = new Error('AI worker startup timeout');
        err.code = 'AI_SERVICE_DOWN';
        reject(err);
      }
    }, WORKER_STARTUP_TIMEOUT_MS);
    if (typeof readyTimer.unref === 'function') readyTimer.unref();

    if (child.stdout) {
      child.stdout.on('data', (chunk) => {
        const line = chunk.toString().trim();
        if (line) console.log(line);
      });
    }
    if (child.stderr) {
      child.stderr.on('data', (chunk) => {
        const line = chunk.toString().trim();
        if (line) console.error(line);
      });
    }

    const onMessage = (msg) => {
      if (msg && msg.type === 'ready' && !settledReady) {
        settledReady = true;
        clearTimeout(readyTimer);
        resolve(child);
        return;
      }
      handleWorkerMessage(msg);
    };

    child.on('message', onMessage);

    child.on('error', (err) => {
      console.error(`[AI] Erreur processus worker IA:`, err.message);
      if (!settledReady) {
        settledReady = true;
        clearTimeout(readyTimer);
        reject(err);
      }
    });

    child.on('exit', (code, signal) => {
      clearTimeout(readyTimer);
      if (workerProcess === child) {
        workerProcess = null;
        workerReadyPromise = null;
      }

      if (!settledReady) {
        settledReady = true;
        const err = new Error(`AI worker exited during startup (code=${code}, signal=${signal})`);
        err.code = 'AI_SERVICE_DOWN';
        reject(err);
      }

      if (!isIntentionalShutdown) {
        console.warn(`[AI] Worker IA arrêté de façon inattendue (code=${code}, signal=${signal}) — prêt pour redémarrage automatique`);
      }

      rejectAllPending('AI_SERVICE_DOWN', 'AI_SERVICE_DOWN');
    });
  });

  return workerReadyPromise;
}

async function ensureWorker() {
  if (workerProcess && workerProcess.connected && !workerProcess.killed && workerReadyPromise) {
    return workerReadyPromise;
  }
  return spawnWorker();
}

async function sendWorkerRequest(type, payload = {}, timeoutMs = 120000) {
  const child = await ensureWorker();
  if (!child || !child.connected) {
    const err = new Error('AI_SERVICE_DOWN');
    err.code = 'AI_SERVICE_DOWN';
    throw err;
  }

  const id = `ai_${++requestCounter}_${Date.now()}`;

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id);
        try {
          if (child.connected) {
            child.send({ id, type: 'cancel' });
          }
        } catch (_) {}
        const timeoutErr = new Error('AI_TIMEOUT');
        timeoutErr.code = 'AI_TIMEOUT';
        reject(timeoutErr);
      }
    }, timeoutMs);
    if (typeof timer.unref === 'function') timer.unref();

    pendingRequests.set(id, { resolve, reject, timer });

    try {
      child.send({ id, type, payload });
    } catch (sendErr) {
      clearTimeout(timer);
      pendingRequests.delete(id);
      const err = new Error('AI_SERVICE_DOWN');
      err.code = 'AI_SERVICE_DOWN';
      err.original = sendErr.message;
      reject(err);
    }
  });
}

/**
 * Vérifie que le worker IA isolé répond via IPC (spawn automatique si arrêté/crashé)
 */
async function pingAIWorker() {
  return sendWorkerRequest('ping', {}, 5000);
}

/**
 * Arrête proprement le worker IA isolé
 */
async function shutdownAIWorker() {
  const child = workerProcess;
  if (!child) {
    workerReadyPromise = null;
    return { stopped: true };
  }

  isIntentionalShutdown = true;

  const exitPromise = new Promise((resolve) => {
    if (child.exitCode !== null || child.signalCode !== null) {
      return resolve();
    }
    child.once('exit', () => resolve());
  });

  try {
    if (child.connected) {
      await Promise.race([
        sendWorkerRequest('shutdown', {}, 2000).catch(() => {}),
        new Promise((r) => setTimeout(r, 2000)),
      ]);
    }
  } catch (_) {}

  try {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill('SIGTERM');
    }
  } catch (_) {}

  await Promise.race([exitPromise, new Promise((r) => setTimeout(r, 1000))]);

  try {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill('SIGKILL');
    }
  } catch (_) {}

  workerProcess = null;
  workerReadyPromise = null;
  rejectAllPending('AI worker shut down', 'AI_SERVICE_DOWN');
  return { stopped: true };
}

/**
 * Chat avec le modèle GGUF local via le worker isolé node-llama-cpp
 * @param {string} prompt - Prompt utilisateur
 * @param {string} systemPrompt - Prompt système optionnel
 * @param {object} options - Options (temperature, maxTokens, timeoutMs)
 * @returns {Promise<string>} - Réponse texte
 */
async function chat(prompt, systemPrompt = '', options = {}) {
  const timeoutMs = Number(options.timeoutMs) || 120000;
  return sendWorkerRequest('chat', { prompt, systemPrompt, options }, timeoutMs + 5000);
}

/**
 * Retourne l'état instantané du worker IA et de la présence des modèles sans bloquer
 */
function getWorkerRuntimeStatus() {
  const chatInstalled = fs.existsSync(CHAT_MODEL_PATH);
  const embeddingInstalled = fs.existsSync(EMBEDDING_MODEL_PATH);
  const alive = Boolean(workerProcess && workerProcess.connected && !workerProcess.killed);

  return {
    alive,
    pid: alive ? workerProcess.pid : null,
    engine: 'node-llama-cpp',
    chatModel: MODELS.chat,
    embeddingModel: MODELS.embedding,
    chatInstalled,
    embeddingInstalled,
    modelsReady: chatInstalled && embeddingInstalled,
  };
}

/**
 * Vérifie l'état de fonctionnement du service IA et la présence des modèles
 * Conserve le nom 'checkOllamaHealth' pour compatibilité avec les appelants existants
 */
async function checkOllamaHealth() {
  const chatExists = fs.existsSync(CHAT_MODEL_PATH);
  const embExists = fs.existsSync(EMBEDDING_MODEL_PATH);

  if (!chatExists || !embExists) {
    return {
      ok: false,
      engine: 'node-llama-cpp',
      url: 'worker (node-llama-cpp)',
      chatModel: MODELS.chat,
      embeddingModel: MODELS.embedding,
      chatInstalled: chatExists,
      embeddingInstalled: embExists,
      installedModels: [
        ...(chatExists ? [MODELS.chat] : []),
        ...(embExists ? [MODELS.embedding] : []),
      ],
      error: 'MODELS_NOT_DOWNLOADED',
    };
  }

  try {
    return await sendWorkerRequest('health', {}, 120000);
  } catch (error) {
    return {
      ok: false,
      engine: 'node-llama-cpp',
      url: 'worker (node-llama-cpp)',
      chatModel: MODELS.chat,
      embeddingModel: MODELS.embedding,
      error: error.code || error.message || 'AI_SERVICE_DOWN',
    };
  }
}

/**
 * Parser JSON robuste avec nettoyage thinking, markdown et trailing commas
 * @param {string} rawText
 * @returns {object|null}
 */
function parseRobustJson(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;

  let text = rawText.trim();

  // Nettoyer les préfixes typiques de thinking
  text = text.replace(/^(thinking|reasoning|answer|response|assistant)\s*:?\s*/i, '');

  // Chercher la première accolade ouvrante
  const firstBrace = text.indexOf('{');
  if (firstBrace > 0) {
    text = text.substring(firstBrace);
  }

  // 1. Enlever les blocs markdown ```json ... ``` ou ``` ... ```
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (codeBlockMatch) {
    text = codeBlockMatch[1].trim();
  }

  // 2. Essayer de parser directement
  try {
    return JSON.parse(text);
  } catch (_) {}

  // 3. Extraire le premier objet JSON valide par regex
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    const jsonStr = jsonMatch[0];
    try {
      return JSON.parse(jsonStr);
    } catch (_) {}

    // 4. Nettoyage : trailing commas, single quotes, undefined
    const cleaned = jsonStr
      .replace(/,\s*([}\]])/g, '$1')
      .replace(/:\s*'([^']*)'/g, ': "$1"')
      .replace(/:\s*(undefined)\b/g, ': null');

    try {
      return JSON.parse(cleaned);
    } catch (_) {}
  }

  return null;
}

/**
 * Extrait les informations structurées d'un texte OCR
 * @param {string} ocrText
 */
async function extractDocumentInfo(ocrText) {
  if (!ocrText || ocrText.trim().length < 20) {
    const err = new Error('OCR_TOO_SHORT');
    err.code = 'OCR_TOO_SHORT';
    throw err;
  }

  const truncatedText = ocrText.slice(0, 4000);

  const systemPrompt = `Tu es un assistant administratif spécialisé dans l'analyse de courriers officiels tunisiens (arabe et français). Tu extrais les informations structurées d'un texte OCR. Tu réponds UNIQUEMENT en JSON valide, sans commentaire, sans markdown.`;

  const userPrompt = `Tu es un assistant qui extrait des données de courriers administratifs.

RÈGLES STRICTES :
1. Réponds UNIQUEMENT en JSON, aucun texte avant/après
2. N'utilise JAMAIS de backticks markdown
3. Si une info est absente du texte, utilise null
4. Ne JAMAIS laisser un champ vide (chaîne vide) → utiliser null

FORMAT JSON (obligatoire) :
{"subject":"...","source":"...","correspondenceNumber":null,"correspondenceDate":null,"typeDocument":"note","confidence":0.9}

EXEMPLES :

Exemple 1 :
Texte : "Facture électricité STEG - Décembre 2025 - N°12345"
JSON : {"subject":"Facture électricité STEG - Décembre 2025","source":"STEG","correspondenceNumber":"12345","correspondenceDate":null,"typeDocument":"facture","confidence":0.95}

Exemple 2 :
Texte : "Le ministère de l'éducation informe les directeurs..."
JSON : {"subject":"Information aux directeurs","source":"Ministère de l'éducation","correspondenceNumber":null,"correspondenceDate":null,"typeDocument":"note","confidence":0.85}

═══ TEXTE À ANALYSER ═══
"""
${truncatedText}
"""

Réponds MAINTENANT avec UNIQUEMENT le JSON :`;

  const response = await module.exports.chat(userPrompt, systemPrompt, {
    format: 'json',
    temperature: 0.1,
    maxTokens: 500,
  });

  const parsed = parseRobustJson(response);

  if (!parsed) {
    console.error('[AI] Impossible de parser la réponse JSON:', response?.substring(0, 500));
    const err = new Error('AI_INVALID_JSON');
    err.code = 'AI_INVALID_JSON';
    throw err;
  }

  // Si subject vide ET pas null → tenter extraction basique
  if (!parsed.subject && truncatedText) {
    const firstMeaningfulLine = truncatedText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 15 && l.length < 200)[0];

    if (firstMeaningfulLine) {
      parsed.subject = firstMeaningfulLine.substring(0, 150);
    }
  }

  return {
    subject: parsed.subject || null,
    source: parsed.source || null,
    correspondenceNumber: parsed.correspondenceNumber || null,
    correspondenceDate: parsed.correspondenceDate || null,
    typeDocument: parsed.typeDocument || null,
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
  };
}

/**
 * Convertit un texte en vecteur d'embedding avec métadonnées (modèle & dimension)
 * @param {string} text - Texte à convertir
 * @returns {Promise<{ vector: number[], model: string, dimension: number }>}
 */
async function getEmbeddingWithMeta(text) {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    const err = new Error('EMPTY_TEXT');
    err.code = 'EMPTY_TEXT';
    throw err;
  }

  const res = await sendWorkerRequest('embedding', { text: text.trim().slice(0, 4000) }, 60000);
  if (!res || !Array.isArray(res.vector) || res.vector.length === 0) {
    const err = new Error('EMBEDDING_INVALID');
    err.code = 'EMBEDDING_INVALID';
    throw err;
  }

  return {
    vector: res.vector,
    model: res.model || MODELS.embedding,
    dimension: res.dimension || res.vector.length,
  };
}

/**
 * Convertit un texte en vecteur d'embedding via le worker isolé node-llama-cpp
 * @param {string} text - Texte à convertir
 * @returns {Promise<number[]>} - Vecteur d'embedding
 */
async function getEmbedding(text) {
  const { vector } = await module.exports.getEmbeddingWithMeta(text);
  return vector;
}

/**
 * Calcule la similarité cosinus entre deux vecteurs
 * @param {number[]} vecA - Premier vecteur
 * @param {number[]} vecB - Deuxième vecteur
 * @returns {number} - Similarité cosinus entre -1 et 1
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || !Array.isArray(vecA) || !Array.isArray(vecB)) {
    return 0;
  }
  if (vecA.length === 0 || vecB.length === 0 || vecA.length !== vecB.length) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Résume automatiquement le texte OCR d'un courrier administratif
 * @param {string} ocrText - Texte extrait par OCR
 * @param {object} options - Options (maxLength)
 */
async function summarizeDocument(ocrText, options = {}) {
  if (!ocrText || ocrText.trim().length < 50) {
    const err = new Error('Texte OCR trop court pour résumé (min 50 caractères)');
    err.code = 'OCR_TOO_SHORT';
    throw err;
  }

  const maxLength = options.maxLength || 200;
  const truncatedText = ocrText.slice(0, 6000);

  const systemPrompt = `Tu es un assistant administratif tunisien.
Tu résumes des courriers officiels (arabe et français) de manière claire et concise.
Tu réponds UNIQUEMENT en JSON valide, sans commentaire, sans markdown.`;

  const userPrompt = `Analyse ce courrier et produis un résumé structuré.

Texte OCR :
"""
${truncatedText}
"""

Réponds au format JSON strict :
{
  "summary": "Résumé en 2-3 phrases (max ${maxLength} caractères)",
  "keyPoints": ["Point 1", "Point 2", "Point 3"],
  "language": "ar",
  "urgency": "normal"
}`;

  const response = await module.exports.chat(userPrompt, systemPrompt, {
    format: 'json',
    temperature: 0.2,
    maxTokens: 800,
    timeoutMs: options.timeoutMs || 120000,
  });

  const parsed = parseRobustJson(response);
  if (!parsed || !parsed.summary) {
    console.error('[AI] Impossible de parser le résumé JSON:', response?.substring(0, 300));
    if (response && response.trim().length > 10) {
      return {
        summary: response.trim().substring(0, maxLength * 2),
        keyPoints: [],
        language: 'mixed',
        urgency: 'normal',
      };
    }
    const err = new Error('AI_INVALID_JSON');
    err.code = 'AI_INVALID_JSON';
    throw err;
  }

  return {
    summary: parsed.summary,
    keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
    language: parsed.language || 'mixed',
    urgency: parsed.urgency || 'normal',
  };
}

/**
 * Traduit un texte administratif entre l'arabe et le français
 * @param {string} text - Texte à traduire
 * @param {string} targetLang - Langue cible ('ar' ou 'fr')
 * @param {object} options - Options
 */
async function translateText(text, targetLang = 'fr', options = {}) {
  if (!text || text.trim().length < 5) {
    const err = new Error('Texte trop court pour traduction (min 5 caractères)');
    err.code = 'TEXT_TOO_SHORT';
    throw err;
  }

  const truncatedText = text.slice(0, 6000);
  const targetLanguageName = targetLang === 'ar' ? 'arabe' : 'français';

  const systemPrompt = `Tu es un traducteur assermenté spécialisé dans les courriers et correspondances administratifs tunisiens.
Traduis fidèlement le texte fourni vers le ${targetLanguageName}.
Tu réponds UNIQUEMENT en JSON valide, sans commentaire, sans balise markdown.`;

  const userPrompt = `Traduis ce texte administratif vers le ${targetLanguageName}.

Texte source :
"""
${truncatedText}
"""

Réponds au format JSON strict :
{
  "translatedText": "Texte fidèlement traduit en ${targetLanguageName}",
  "sourceLang": "${targetLang === 'ar' ? 'fr' : 'ar'}",
  "targetLang": "${targetLang}"
}`;

  const response = await module.exports.chat(userPrompt, systemPrompt, {
    format: 'json',
    temperature: 0.1,
    maxTokens: 2000,
    timeoutMs: options.timeoutMs || 180000,
  });

  const parsed = parseRobustJson(response);
  if (!parsed || !parsed.translatedText) {
    console.error('[AI] Impossible de parser la traduction JSON:', response?.substring(0, 300));
    if (response && response.trim().length > 5) {
      return {
        translatedText: response.trim(),
        sourceLang: targetLang === 'ar' ? 'fr' : 'ar',
        targetLang,
      };
    }
    const err = new Error('AI_INVALID_JSON');
    err.code = 'AI_INVALID_JSON';
    throw err;
  }

  return {
    translatedText: parsed.translatedText,
    sourceLang: parsed.sourceLang || (targetLang === 'ar' ? 'fr' : 'ar'),
    targetLang,
  };
}

module.exports = {
  chat,
  checkOllamaHealth,
  extractDocumentInfo,
  summarizeDocument,
  translateText,
  parseRobustJson,
  getEmbedding,
  getEmbeddingWithMeta,
  cosineSimilarity,
  pingAIWorker,
  shutdownAIWorker,
  getWorkerRuntimeStatus,
  MODELS,
};
