const path = require('path');
const fs = require('fs');

// ═══════════════════════════════════════════════════════════════
// Configuration Modèles GGUF (node-llama-cpp)
// ═══════════════════════════════════════════════════════════════
const CHAT_MODEL_PATH = process.env.LLAMA_CHAT_MODEL_PATH
  || (fs.existsSync(path.join(__dirname, '../../models/ALLaM-AI_ALLaM-7B-Instruct-preview-Q4_K_M.gguf'))
    ? path.join(__dirname, '../../models/ALLaM-AI_ALLaM-7B-Instruct-preview-Q4_K_M.gguf')
    : path.join(__dirname, '../../models/qwen2.5-7b-instruct-q4_k_m.gguf'));

const EMBEDDING_MODEL_PATH = process.env.LLAMA_EMBEDDING_MODEL_PATH
  || (fs.existsSync(path.join(__dirname, '../../models/bge-m3-q4_k_m.gguf'))
    ? path.join(__dirname, '../../models/bge-m3-q4_k_m.gguf')
    : path.join(__dirname, '../../models/nomic-embed-text-v1.5.Q8_0.gguf'));

const LLAMA_THREADS = parseInt(process.env.LLAMA_THREADS || '4', 10);
const LLAMA_GPU_LAYERS = parseInt(process.env.LLAMA_GPU_LAYERS || '0', 10);

// Noms pour compatibilité
const MODELS = {
  main: path.basename(CHAT_MODEL_PATH),
  chat: path.basename(CHAT_MODEL_PATH),
  fallback: path.basename(CHAT_MODEL_PATH),
  embedding: path.basename(EMBEDDING_MODEL_PATH),
};

// ═══════════════════════════════════════════════════════════════
// Singleton Models & Contexts (node-llama-cpp)
// ═══════════════════════════════════════════════════════════════
let llamaModule = null;
let llamaInstance = null;
let chatModel = null;
let chatContext = null;
let embeddingModel = null;
let embeddingContext = null;
let initPromise = null;

async function getLlamaModule() {
  if (!llamaModule) {
    // node-llama-cpp v3 est un package ESM avec top-level await
    llamaModule = await import('node-llama-cpp');
  }
  return llamaModule;
}

/**
 * Initialise le moteur node-llama-cpp et charge les deux modèles GGUF
 */
async function initModels() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      if (!fs.existsSync(CHAT_MODEL_PATH)) {
        const err = new Error(`Chat model file not found: ${CHAT_MODEL_PATH}`);
        err.code = 'AI_SERVICE_DOWN';
        throw err;
      }
      if (!fs.existsSync(EMBEDDING_MODEL_PATH)) {
        const err = new Error(`Embedding model file not found: ${EMBEDDING_MODEL_PATH}`);
        err.code = 'AI_SERVICE_DOWN';
        throw err;
      }

      const { getLlama } = await getLlamaModule();

      llamaInstance = await getLlama({
        gpu: LLAMA_GPU_LAYERS > 0 ? 'auto' : false,
      });

      console.log(`[AI] Chargement modèle chat : ${CHAT_MODEL_PATH} (threads: ${LLAMA_THREADS}, gpu: ${LLAMA_GPU_LAYERS})`);
      chatModel = await llamaInstance.loadModel({
        modelPath: CHAT_MODEL_PATH,
        gpuLayers: LLAMA_GPU_LAYERS,
      });

      chatContext = await chatModel.createContext({
        contextSize: 2048,
        threads: LLAMA_THREADS,
      });

      console.log(`[AI] Chargement modèle embedding : ${EMBEDDING_MODEL_PATH}`);
      embeddingModel = await llamaInstance.loadModel({
        modelPath: EMBEDDING_MODEL_PATH,
        gpuLayers: LLAMA_GPU_LAYERS,
      });

      embeddingContext = await embeddingModel.createEmbeddingContext({
        threads: LLAMA_THREADS,
      });

      console.log('[AI] Modèles GGUF prêts via node-llama-cpp');
      return true;
    } catch (err) {
      console.error('[AI] Échec initialisation node-llama-cpp :', err.message);
      // Réinitialiser la promesse pour permettre une ré-initialisation ultérieure
      initPromise = null;
      if (err.code !== 'AI_SERVICE_DOWN') {
        err.code = 'AI_SERVICE_DOWN';
      }
      throw err;
    }
  })();

  return initPromise;
}

/**
 * Chat avec le modèle GGUF local via node-llama-cpp
 * @param {string} prompt - Prompt utilisateur
 * @param {string} systemPrompt - Prompt système optionnel
 * @param {object} options - Options (temperature, maxTokens, timeoutMs)
 * @returns {Promise<string>} - Réponse texte
 */
async function chat(prompt, systemPrompt = '', options = {}) {
  await initModels();
  const { LlamaChatSession } = await getLlamaModule();

  const contextSequence = chatContext.getSequence();
  const session = new LlamaChatSession({
    contextSequence,
    systemPrompt: systemPrompt || undefined,
  });

  const timeoutMs = options.timeoutMs || 120000;

  try {
    const promptPromise = session.prompt(prompt, {
      temperature: options.temperature ?? 0.2,
      maxTokens: options.maxTokens ?? 1024,
    });

    const timeoutPromise = new Promise((_, reject) => {
      const timer = setTimeout(() => {
        const err = new Error('AI_TIMEOUT');
        err.code = 'AI_TIMEOUT';
        reject(err);
      }, timeoutMs);
      if (timer.unref) timer.unref();
    });

    const response = await Promise.race([promptPromise, timeoutPromise]);
    const cleanContent = typeof response === 'string' ? response : (response?.response || '');
    return cleanContent;
  } catch (err) {
    if (err.code === 'AI_TIMEOUT') {
      throw err;
    }
    const error = new Error('AI_SERVICE_DOWN');
    error.code = 'AI_SERVICE_DOWN';
    error.original = err.message;
    throw error;
  } finally {
    try {
      contextSequence.dispose();
    } catch (_) {
      // Ignorer l'erreur de libération de séquence
    }
  }
}

/**
 * Vérifie l'état de fonctionnement du service IA et la présence des modèles
 * Conserve le nom 'checkOllamaHealth' pour une compatibilité absolue avec les appelants
 */
async function checkOllamaHealth() {
  const chatExists = fs.existsSync(CHAT_MODEL_PATH);
  const embExists = fs.existsSync(EMBEDDING_MODEL_PATH);

  if (!chatExists || !embExists) {
    return {
      ok: false,
      engine: 'node-llama-cpp',
      url: 'embedded (node-llama-cpp)',
      chatModel: path.basename(CHAT_MODEL_PATH),
      chatInstalled: chatExists,
      embeddingInstalled: embExists,
      installedModels: [
        ...(chatExists ? [path.basename(CHAT_MODEL_PATH)] : []),
        ...(embExists ? [path.basename(EMBEDDING_MODEL_PATH)] : [])
      ],
      error: 'MODELS_NOT_DOWNLOADED',
    };
  }

  try {
    await initModels();
    return {
      ok: true,
      engine: 'node-llama-cpp',
      url: 'embedded (node-llama-cpp)',
      chatModel: path.basename(CHAT_MODEL_PATH),
      chatInstalled: true,
      embeddingInstalled: true,
      installedModels: [path.basename(CHAT_MODEL_PATH), path.basename(EMBEDDING_MODEL_PATH)],
    };
  } catch (error) {
    return {
      ok: false,
      engine: 'node-llama-cpp',
      url: 'embedded (node-llama-cpp)',
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
  } catch (e) {
    // Continuer avec les fallbacks
  }

  // 3. Extraire le premier objet JSON valide par regex
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    const jsonStr = jsonMatch[0];
    try {
      return JSON.parse(jsonStr);
    } catch (e) {
      // Continuer
    }

    // 4. Nettoyage : trailing commas, single quotes, undefined
    let cleaned = jsonStr
      .replace(/,\s*([}\]])/g, '$1')
      .replace(/:\s*'([^']*)'/g, ': "$1"')
      .replace(/:\s*(undefined)\b/g, ': null');

    try {
      return JSON.parse(cleaned);
    } catch (e) {
      // Échec définitif
    }
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

  const response = await chat(userPrompt, systemPrompt, {
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
      .map(l => l.trim())
      .filter(l => l.length > 15 && l.length < 200)[0];
    
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
 * Convertit un texte en vecteur d'embedding via node-llama-cpp
 * @param {string} text - Texte à convertir
 * @returns {Promise<number[]>} - Vecteur d'embedding
 */
async function getEmbedding(text) {
  if (!text || text.trim().length === 0) {
    const err = new Error('EMPTY_TEXT');
    err.code = 'EMPTY_TEXT';
    throw err;
  }

  await initModels();
  const truncated = text.trim().slice(0, 4000);

  try {
    const embedding = await embeddingContext.getEmbeddingFor(truncated);
    if (!embedding || !embedding.vector) {
      const err = new Error('EMBEDDING_INVALID');
      err.code = 'EMBEDDING_INVALID';
      throw err;
    }

    return Array.from(embedding.vector);
  } catch (error) {
    if (error.code === 'EMPTY_TEXT' || error.code === 'EMBEDDING_INVALID') {
      throw error;
    }
    const err = new Error('EMBEDDING_ERROR');
    err.code = 'EMBEDDING_ERROR';
    err.original = error.message;
    throw err;
  }
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

  const response = await chat(userPrompt, systemPrompt, {
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

  const response = await chat(userPrompt, systemPrompt, {
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
  cosineSimilarity,
  MODELS,
};
