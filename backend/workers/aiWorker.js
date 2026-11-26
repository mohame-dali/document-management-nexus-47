const path = require('path');
const fs = require('fs');

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

const LLAMA_THREADS = Math.max(1, parseInt(process.env.LLAMA_THREADS || '4', 10) || 4);
const LLAMA_GPU_LAYERS = Math.max(0, parseInt(process.env.LLAMA_GPU_LAYERS || '0', 10) || 0);
const MAX_CONCURRENCY = Math.max(1, parseInt(process.env.AI_WORKER_MAX_CONCURRENCY || '1', 10) || 1);

const CHAT_MODEL_NAME = path.basename(CHAT_MODEL_PATH);
const EMBEDDING_MODEL_NAME = path.basename(EMBEDDING_MODEL_PATH);

let llamaModule = null;
let llamaInstance = null;
let chatModel = null;
let chatContext = null;
let embeddingModel = null;
let embeddingContext = null;
let initPromise = null;
let activeEmbeddingDimension = null;
let isShuttingDown = false;

// Bounded concurrency semaphore inside worker
let activeTasks = 0;
const taskQueue = [];
const cancelledRequestIds = new Set();

function sendResponse(msg) {
  if (typeof process.send === 'function' && process.connected) {
    try {
      process.send(msg);
    } catch (err) {
      console.error('[AI Worker] Erreur envoi IPC:', err.message);
    }
  }
}

async function getLlamaModule() {
  if (!llamaModule) {
    llamaModule = await import('node-llama-cpp');
  }
  return llamaModule;
}

async function initModels() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      if (!fs.existsSync(CHAT_MODEL_PATH)) {
        const err = new Error(`AI_SERVICE_DOWN: Modèle chat introuvable (${CHAT_MODEL_NAME})`);
        err.code = 'AI_SERVICE_DOWN';
        throw err;
      }
      if (!fs.existsSync(EMBEDDING_MODEL_PATH)) {
        const err = new Error(`AI_SERVICE_DOWN: Modèle embedding introuvable (${EMBEDDING_MODEL_NAME})`);
        err.code = 'AI_SERVICE_DOWN';
        throw err;
      }

      const { getLlama } = await getLlamaModule();
      llamaInstance = await getLlama({
        gpu: LLAMA_GPU_LAYERS > 0 ? 'auto' : false,
      });

      console.log(`[AI Worker:${process.pid}] Chargement modèle chat : ${CHAT_MODEL_NAME} (threads: ${LLAMA_THREADS}, gpu: ${LLAMA_GPU_LAYERS})`);
      chatModel = await llamaInstance.loadModel({
        modelPath: CHAT_MODEL_PATH,
        gpuLayers: LLAMA_GPU_LAYERS,
      });

      chatContext = await chatModel.createContext({
        contextSize: parseInt(process.env.LLAMA_CONTEXT_SIZE || '2048', 10) || 2048,
        threads: LLAMA_THREADS,
      });

      console.log(`[AI Worker:${process.pid}] Chargement modèle embedding : ${EMBEDDING_MODEL_NAME}`);
      embeddingModel = await llamaInstance.loadModel({
        modelPath: EMBEDDING_MODEL_PATH,
        gpuLayers: LLAMA_GPU_LAYERS,
      });

      embeddingContext = await embeddingModel.createEmbeddingContext({
        threads: LLAMA_THREADS,
      });

      // Probe once to capture active embedding dimension accurately if not yet known
      if (!activeEmbeddingDimension) {
        try {
          const probe = await embeddingContext.getEmbeddingFor('dimension_probe');
          if (probe && probe.vector && probe.vector.length > 0) {
            activeEmbeddingDimension = probe.vector.length;
          }
        } catch (probeErr) {
          console.warn(`[AI Worker:${process.pid}] Probe dimension embedding différé:`, probeErr.message);
        }
      }

      console.log(`[AI Worker:${process.pid}] Modèles GGUF prêts (embedding: ${EMBEDDING_MODEL_NAME}, dim: ${activeEmbeddingDimension || 'auto'})`);
      return true;
    } catch (err) {
      console.error(`[AI Worker:${process.pid}] Échec initialisation node-llama-cpp :`, err.message);
      initPromise = null;
      if (err.code !== 'AI_SERVICE_DOWN') {
        err.code = 'AI_SERVICE_DOWN';
      }
      throw err;
    }
  })();

  return initPromise;
}

function runWithConcurrencyLimit(requestId, fn) {
  return new Promise((resolve, reject) => {
    const execute = async () => {
      if (cancelledRequestIds.has(requestId)) {
        cancelledRequestIds.delete(requestId);
        const cancelErr = new Error('AI_TIMEOUT');
        cancelErr.code = 'AI_TIMEOUT';
        return reject(cancelErr);
      }
      activeTasks++;
      try {
        const result = await fn();
        resolve(result);
      } catch (err) {
        reject(err);
      } finally {
        activeTasks--;
        const next = taskQueue.shift();
        if (next) {
          setImmediate(next);
        }
      }
    };

    if (activeTasks < MAX_CONCURRENCY) {
      execute();
    } else {
      taskQueue.push(execute);
    }
  });
}

async function handleChat(requestId, payload) {
  const { prompt, systemPrompt = '', options = {} } = payload || {};
  await initModels();
  if (cancelledRequestIds.has(requestId)) {
    const cancelErr = new Error('AI_TIMEOUT');
    cancelErr.code = 'AI_TIMEOUT';
    throw cancelErr;
  }

  const { LlamaChatSession } = await getLlamaModule();
  const contextSequence = chatContext.getSequence();
  const session = new LlamaChatSession({
    contextSequence,
    systemPrompt: systemPrompt || undefined,
  });

  const timeoutMs = Number(options.timeoutMs) || 120000;
  let timer = null;

  try {
    const promptPromise = session.prompt(prompt, {
      temperature: options.temperature ?? 0.2,
      maxTokens: options.maxTokens ?? 1024,
    });

    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => {
        const err = new Error('AI_TIMEOUT');
        err.code = 'AI_TIMEOUT';
        reject(err);
      }, timeoutMs);
      if (timer.unref) timer.unref();
    });

    const response = await Promise.race([promptPromise, timeoutPromise]);
    return typeof response === 'string' ? response : (response?.response || '');
  } catch (err) {
    if (err.code === 'AI_TIMEOUT') {
      throw err;
    }
    const wrapped = new Error('AI_SERVICE_DOWN');
    wrapped.code = 'AI_SERVICE_DOWN';
    wrapped.original = err.message;
    throw wrapped;
  } finally {
    if (timer) clearTimeout(timer);
    try {
      contextSequence.dispose();
    } catch (_) {}
  }
}

async function handleEmbedding(requestId, payload) {
  const { text } = payload || {};
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    const err = new Error('EMPTY_TEXT');
    err.code = 'EMPTY_TEXT';
    throw err;
  }

  await initModels();
  if (cancelledRequestIds.has(requestId)) {
    const cancelErr = new Error('AI_TIMEOUT');
    cancelErr.code = 'AI_TIMEOUT';
    throw cancelErr;
  }

  const truncated = text.trim().slice(0, 4000);
  try {
    const embedding = await embeddingContext.getEmbeddingFor(truncated);
    if (!embedding || !embedding.vector || embedding.vector.length === 0) {
      const err = new Error('EMBEDDING_INVALID');
      err.code = 'EMBEDDING_INVALID';
      throw err;
    }

    const vector = Array.from(embedding.vector);
    activeEmbeddingDimension = vector.length;
    return {
      vector,
      model: EMBEDDING_MODEL_NAME,
      dimension: vector.length,
    };
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

async function handleHealth() {
  const chatExists = fs.existsSync(CHAT_MODEL_PATH);
  const embExists = fs.existsSync(EMBEDDING_MODEL_PATH);

  if (!chatExists || !embExists) {
    return {
      ok: false,
      engine: 'node-llama-cpp',
      url: 'worker (node-llama-cpp)',
      chatModel: CHAT_MODEL_NAME,
      embeddingModel: EMBEDDING_MODEL_NAME,
      embeddingDimension: activeEmbeddingDimension,
      chatInstalled: chatExists,
      embeddingInstalled: embExists,
      installedModels: [
        ...(chatExists ? [CHAT_MODEL_NAME] : []),
        ...(embExists ? [EMBEDDING_MODEL_NAME] : []),
      ],
      workerPid: process.pid,
      error: 'MODELS_NOT_DOWNLOADED',
    };
  }

  await initModels();
  return {
    ok: true,
    engine: 'node-llama-cpp',
    url: 'worker (node-llama-cpp)',
    chatModel: CHAT_MODEL_NAME,
    embeddingModel: EMBEDDING_MODEL_NAME,
    embeddingDimension: activeEmbeddingDimension,
    chatInstalled: true,
    embeddingInstalled: true,
    installedModels: [CHAT_MODEL_NAME, EMBEDDING_MODEL_NAME],
    workerPid: process.pid,
  };
}

async function cleanupAndExit(exitCode = 0) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  try {
    if (chatContext && typeof chatContext.dispose === 'function') {
      await chatContext.dispose();
    }
  } catch (_) {}
  try {
    if (embeddingContext && typeof embeddingContext.dispose === 'function') {
      await embeddingContext.dispose();
    }
  } catch (_) {}
  try {
    if (chatModel && typeof chatModel.dispose === 'function') {
      await chatModel.dispose();
    }
  } catch (_) {}
  try {
    if (embeddingModel && typeof embeddingModel.dispose === 'function') {
      await embeddingModel.dispose();
    }
  } catch (_) {}
  try {
    if (llamaInstance && typeof llamaInstance.dispose === 'function') {
      await llamaInstance.dispose();
    }
  } catch (_) {}

  process.exit(exitCode);
}

process.on('message', async (message) => {
  if (!message || typeof message !== 'object') return;
  const { id, type, payload } = message;

  if (type === 'cancel') {
    if (id) cancelledRequestIds.add(id);
    return;
  }

  if (type === 'shutdown') {
    sendResponse({ id, ok: true, result: { stopped: true } });
    await cleanupAndExit(0);
    return;
  }

  if (type === 'ping') {
    sendResponse({
      id,
      ok: true,
      result: {
        ok: true,
        pid: process.pid,
        initialized: Boolean(chatContext && embeddingContext),
        embeddingModel: EMBEDDING_MODEL_NAME,
        embeddingDimension: activeEmbeddingDimension,
        activeTasks,
        queuedTasks: taskQueue.length,
        memoryUsage: process.memoryUsage(),
      },
    });
    return;
  }

  try {
    let result;
    if (type === 'health') {
      result = await runWithConcurrencyLimit(id, () => handleHealth());
    } else if (type === 'chat') {
      result = await runWithConcurrencyLimit(id, () => handleChat(id, payload));
    } else if (type === 'embedding') {
      result = await runWithConcurrencyLimit(id, () => handleEmbedding(id, payload));
    } else {
      const err = new Error(`Unknown worker command: ${type}`);
      err.code = 'UNKNOWN_COMMAND';
      throw err;
    }

    sendResponse({ id, ok: true, result });
  } catch (err) {
    sendResponse({
      id,
      ok: false,
      error: {
        message: err.message || 'AI_WORKER_ERROR',
        code: err.code || 'AI_SERVICE_DOWN',
        original: err.original || null,
      },
    });
  }
});

process.on('SIGTERM', () => {
  void cleanupAndExit(0);
});

process.on('SIGINT', () => {
  void cleanupAndExit(0);
});

process.on('disconnect', () => {
  void cleanupAndExit(0);
});

process.on('uncaughtException', (err) => {
  console.error(`[AI Worker:${process.pid}] uncaughtException:`, err);
  void cleanupAndExit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error(`[AI Worker:${process.pid}] unhandledRejection:`, reason);
});

// Signal parent that IPC channel is ready
sendResponse({ type: 'ready', pid: process.pid });
