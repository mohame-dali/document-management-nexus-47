const axios = require('axios');

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_TIMEOUT = 60000;

// Modèles disponibles
const MODELS = {
  // Modèle principal : rapide, sans thinking, JSON fiable
  main: process.env.OLLAMA_CHAT_MODEL || 'qwen2.5:7b',
  // Modèle fallback : raisonnement (thinking)
  fallback: process.env.OLLAMA_FALLBACK_MODEL || 'qwen3.5:latest',
  // Modèle embeddings (pour RAG futur)
  embedding: process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text',
};

// Alias pour compatibilité
const CHAT_MODEL = MODELS.main;

/**
 * Chat avec Ollama (support thinking + fallback automatique)
 * @param {string} prompt - Le prompt utilisateur
 * @param {string} systemPrompt - Prompt système optionnel
 * @param {object} options - Options (format, temperature, maxTokens, model, useFallback)
 */
async function chat(prompt, systemPrompt = '', options = {}) {
  const messages = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: prompt });

  // Modèle à utiliser
  const model = options.model || MODELS.main;

  try {
    const response = await axios.post(
      `${OLLAMA_URL}/api/chat`,
      {
        model,
        messages,
        stream: false,
        format: options.format || undefined,
        think: false, // Désactiver thinking pour avoir content
        options: {
          temperature: options.temperature ?? 0.2,
          num_predict: options.maxTokens ?? 2000,
        },
      },
      { timeout: OLLAMA_TIMEOUT }
    );

    const data = response.data || {};
    const msg = data.message || {};

    // Extraction robuste : content OU thinking
    let content = msg.content || '';
    if (!content && msg.thinking) {
      console.log('[Ollama] Content vide, extraction depuis thinking');
      content = msg.thinking;
    }
    if (!content) {
      content = data.response || '';
    }

    console.log('[Ollama Debug] Full response:', 
      JSON.stringify(response.data).substring(0, 1000));
    console.log('[Ollama Debug] Content preview:', content.substring(0, 500));

    // Si contenu vide ET fallback autorisé → essayer qwen2.5 / fallback
    if (!content && model === MODELS.main && options.useFallback !== false) {
      console.log('[Ollama] Réponse vide, tentative avec fallback', MODELS.fallback);
      return await chat(prompt, systemPrompt, {
        ...options,
        model: MODELS.fallback,
        useFallback: false, // Éviter boucle infinie
      });
    }

    console.log(`[Ollama] Model: ${model}, Content length: ${content.length}`);
    return content;
  } catch (error) {
    // Si erreur ET fallback autorisé ET pas déjà en fallback
    if (model === MODELS.main && options.useFallback !== false) {
      console.log(`[Ollama] Erreur avec ${model}, fallback vers ${MODELS.fallback}`);
      try {
        return await chat(prompt, systemPrompt, {
          ...options,
          model: MODELS.fallback,
          useFallback: false,
        });
      } catch (fallbackError) {
        console.error('[Ollama] Fallback aussi échoué:', fallbackError.message);
      }
    }

    // Gestion des erreurs
    if (error.code === 'ECONNREFUSED') {
      const err = new Error('AI_SERVICE_DOWN');
      err.code = 'AI_SERVICE_DOWN';
      throw err;
    }
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      const err = new Error('AI_TIMEOUT');
      err.code = 'AI_TIMEOUT';
      throw err;
    }
    const err = new Error('AI_ERROR');
    err.code = 'AI_ERROR';
    err.original = error.message;
    throw err;
  }
}

/**
 * Vérifie Ollama + modèle installé
 */
async function checkOllamaHealth() {
  try {
    const response = await axios.get(`${OLLAMA_URL}/api/tags`, { timeout: 5000 });
    const models = response.data?.models || [];
    const hasChat = models.some(m => m.name?.includes(CHAT_MODEL.split(':')[0]));
    return {
      ok: hasChat,
      url: OLLAMA_URL,
      chatModel: CHAT_MODEL,
      chatInstalled: hasChat,
      installedModels: models.map(m => m.name),
    };
  } catch (error) {
    return {
      ok: false,
      url: OLLAMA_URL,
      error: error.code === 'ECONNREFUSED' ? 'OLLAMA_NOT_RUNNING' : 'OLLAMA_UNREACHABLE',
    };
  }
}

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
    console.error('[Ollama] Impossible de parser la réponse:', response.substring(0, 500));
    const err = new Error('AI_INVALID_JSON');
    err.code = 'AI_INVALID_JSON';
    throw err;
  }

  // Log pour diagnostic
  console.log('[AI] Parsed result:', JSON.stringify(parsed));

  // Si subject vide ET pas null → tenter extraction basique
  if (!parsed.subject && truncatedText) {
    // Fallback : prendre la première ligne non vide comme objet
    const firstMeaningfulLine = truncatedText
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 15 && l.length < 200)[0];
    
    if (firstMeaningfulLine) {
      parsed.subject = firstMeaningfulLine.substring(0, 150);
      console.log('[AI] Subject fallback:', parsed.subject);
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
 * Convertit un texte en vecteur d'embedding via Ollama
 * @param {string} text - Texte à convertir
 * @returns {Promise<number[]>} - Vecteur de ~768 dimensions
 */
async function getEmbedding(text) {
  if (!text || text.trim().length === 0) {
    const err = new Error('EMPTY_TEXT');
    err.code = 'EMPTY_TEXT';
    throw err;
  }

  // Tronquer si trop long (limite nomic-embed-text ~4000 chars)
  const truncated = text.trim().slice(0, 4000);

  try {
    const response = await axios.post(
      `${OLLAMA_URL}/api/embeddings`,
      {
        model: MODELS.embedding,
        prompt: truncated,
      },
      { timeout: 30000 }
    );

    if (!response.data || !response.data.embedding) {
      const err = new Error('EMBEDDING_INVALID');
      err.code = 'EMBEDDING_INVALID';
      throw err;
    }

    return response.data.embedding;
  } catch (error) {
    // Log complet pour diagnostic
    console.error(`[Ollama] Erreur embedding:`, {
      code: error.code,
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      textLength: truncated.length,
      model: MODELS.embedding,
    });

    if (error.code === 'ECONNREFUSED') {
      const err = new Error('AI_SERVICE_DOWN');
      err.code = 'AI_SERVICE_DOWN';
      throw err;
    }
    if (error.code === 'EMPTY_TEXT' || error.code === 'EMBEDDING_INVALID') {
      throw error;
    }
    const err = new Error('EMBEDDING_ERROR');
    err.code = 'EMBEDDING_ERROR';
    err.original = error.message;
    err.statusCode = error.response?.status;
    err.ollamaError = error.response?.data?.error;
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

module.exports = {
  chat,
  checkOllamaHealth,
  extractDocumentInfo,
  parseRobustJson,
  getEmbedding,
  cosineSimilarity,
  MODELS,
};
