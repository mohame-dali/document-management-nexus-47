const fs = require('fs');
const path = require('path');
const { spawn, execFile } = require('child_process');

const MAX_BUFFER_BYTES = 2 * 1024 * 1024; // 2 Mo

class CommandTimeoutError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'CommandTimeoutError';
    this.isTimeout = true;
    this.details = details;
  }
}

class CommandAbortedError extends Error {
  constructor(message = 'Command aborted by caller') {
    super(message);
    this.name = 'CommandAbortedError';
    this.isAborted = true;
  }
}

class CommandExecutionError extends Error {
  constructor(message, { exitCode = null, stdout = '', stderr = '' } = {}) {
    super(message);
    this.name = 'CommandExecutionError';
    this.exitCode = exitCode;
    this.stdout = stdout;
    this.stderr = stderr;
  }
}

function getPowershellPath() {
  if (process.env.POWERSHELL_PATH && process.env.POWERSHELL_PATH.trim()) {
    return process.env.POWERSHELL_PATH.trim();
  }
  return process.platform === 'win32' ? 'powershell.exe' : 'powershell';
}

function getScanimagePath() {
  if (process.env.SCANIMAGE_PATH && process.env.SCANIMAGE_PATH.trim()) {
    return process.env.SCANIMAGE_PATH.trim();
  }
  return 'scanimage';
}

function getImg2pdfPath() {
  if (process.env.IMG2PDF_PATH && process.env.IMG2PDF_PATH.trim()) {
    return process.env.IMG2PDF_PATH.trim();
  }
  return 'img2pdf';
}

function getTesseractPath() {
  if (process.env.TESSERACT_PATH && process.env.TESSERACT_PATH.trim()) {
    return process.env.TESSERACT_PATH.trim();
  }
  return 'tesseract';
}

function isExecutableFile(filePath) {
  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) return false;
    if (process.platform !== 'win32') {
      fs.accessSync(filePath, fs.constants.X_OK);
    }
    return true;
  } catch (_) {
    return false;
  }
}

function commandExists(commandName) {
  if (!commandName || typeof commandName !== 'string') return false;
  const trimmed = commandName.trim();
  if (!trimmed) return false;

  if (path.isAbsolute(trimmed) || trimmed.includes('/') || trimmed.includes('\\')) {
    return isExecutableFile(path.resolve(trimmed));
  }

  const pathEnv = process.env.PATH || '';
  const dirs = pathEnv.split(path.delimiter).filter(Boolean);
  const extensions = process.platform === 'win32' ? ['', '.exe', '.cmd', '.bat'] : [''];

  for (const dir of dirs) {
    for (const ext of extensions) {
      const candidate = path.join(dir, `${trimmed}${ext}`);
      if (isExecutableFile(candidate)) {
        return true;
      }
    }
  }
  return false;
}

function killChildProcess(child) {
  if (!child || child.killed || !child.pid) return;

  try {
    child.kill('SIGTERM');
  } catch (_) {
    // Process may already have exited
  }

  if (process.platform === 'win32') {
    try {
      execFile('taskkill', ['/T', '/F', '/PID', String(child.pid)], { windowsHide: true }, () => {});
    } catch (_) {
      // Ignore taskkill errors
    }
  }

  const forceTimer = setTimeout(() => {
    try {
      if (child.exitCode === null && child.signalCode === null) {
        child.kill('SIGKILL');
      }
    } catch (_) {
      // Ignore already exited
    }
  }, 250);

  if (typeof forceTimer.unref === 'function') {
    forceTimer.unref();
  }
}

/**
 * Execute an external binary safely with execFile/spawn (no shell, argument array, timeout & process kill).
 */
function runCommand(command, args = [], options = {}) {
  const {
    timeoutMs = 120000,
    signal = null,
    cwd = process.cwd(),
    env = null,
    stdoutToFile = null,
    onStdoutLine = null,
    onStderrLine = null,
  } = options;

  if (!command || typeof command !== 'string') {
    return Promise.reject(new CommandExecutionError('Invalid binary command'));
  }

  if (!Array.isArray(args)) {
    return Promise.reject(new CommandExecutionError('Command arguments must be an array'));
  }

  if (signal && signal.aborted) {
    return Promise.reject(new CommandAbortedError());
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    let timedOut = false;
    let aborted = false;
    let stdout = '';
    let stderr = '';
    let stdoutLineBuf = '';
    let stderrLineBuf = '';
    let fileStream = null;
    let fileStreamDone = !stdoutToFile;
    let childExited = false;
    let exitCode = null;
    let exitSignal = null;

    const mergedEnv = env ? { ...process.env, ...env } : process.env;

    let child;
    try {
      child = spawn(command, args, {
        shell: false,
        cwd,
        env: mergedEnv,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (spawnErr) {
      return reject(
        new CommandExecutionError(`Failed to spawn command: ${spawnErr.message}`, {
          exitCode: null,
          stdout: '',
          stderr: spawnErr.message,
        })
      );
    }

    let timer = null;

    const cleanupListeners = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (signal) {
        signal.removeEventListener('abort', onAbort);
      }
    };

    const finalizeIfReady = () => {
      if (settled || !childExited || !fileStreamDone) return;
      settled = true;
      cleanupListeners();

      if (onStdoutLine && stdoutLineBuf) {
        try { onStdoutLine(stdoutLineBuf); } catch (_) {}
      }
      if (onStderrLine && stderrLineBuf) {
        try { onStderrLine(stderrLineBuf); } catch (_) {}
      }

      if (aborted) {
        return reject(new CommandAbortedError());
      }
      if (timedOut) {
        return reject(
          new CommandTimeoutError(`Command timed out after ${timeoutMs}ms`, {
            stdout,
            stderr,
          })
        );
      }
      if (exitCode !== 0) {
        return reject(
          new CommandExecutionError(
            `Command exited with code ${exitCode}${exitSignal ? ` (signal ${exitSignal})` : ''}`,
            { exitCode, stdout, stderr }
          )
        );
      }

      resolve({ exitCode: 0, stdout, stderr });
    };

    const onAbort = () => {
      aborted = true;
      killChildProcess(child);
      if (fileStream) {
        try { fileStream.destroy(); } catch (_) {}
        fileStreamDone = true;
      }
    };

    if (signal) {
      signal.addEventListener('abort', onAbort, { once: true });
    }

    if (timeoutMs > 0) {
      timer = setTimeout(() => {
        timedOut = true;
        killChildProcess(child);
        if (fileStream) {
          try { fileStream.destroy(); } catch (_) {}
          fileStreamDone = true;
        }
      }, timeoutMs);
    }

    if (stdoutToFile) {
      fileStream = fs.createWriteStream(stdoutToFile);
      fileStream.on('finish', () => {
        fileStreamDone = true;
        finalizeIfReady();
      });
      fileStream.on('error', (streamErr) => {
        fileStreamDone = true;
        if (!settled) {
          settled = true;
          cleanupListeners();
          killChildProcess(child);
          reject(new CommandExecutionError(`Failed writing stdout file: ${streamErr.message}`));
        }
      });
      child.stdout.pipe(fileStream);
    } else {
      child.stdout.on('data', (chunk) => {
        const text = chunk.toString('utf8');
        if (stdout.length < MAX_BUFFER_BYTES) {
          stdout += text.slice(0, MAX_BUFFER_BYTES - stdout.length);
        }
        if (onStdoutLine) {
          stdoutLineBuf += text;
          const parts = stdoutLineBuf.split(/\r?\n/);
          stdoutLineBuf = parts.pop() || '';
          for (const line of parts) {
            if (line.trim()) {
              try { onStdoutLine(line); } catch (_) {}
            }
          }
        }
      });
    }

    child.stderr.on('data', (chunk) => {
      const text = chunk.toString('utf8');
      if (stderr.length < MAX_BUFFER_BYTES) {
        stderr += text.slice(0, MAX_BUFFER_BYTES - stderr.length);
      }
      if (onStderrLine) {
        stderrLineBuf += text;
        const parts = stderrLineBuf.split(/\r?\n/);
        stderrLineBuf = parts.pop() || '';
        for (const line of parts) {
          if (line.trim()) {
            try { onStderrLine(line); } catch (_) {}
          }
        }
      }
    });

    child.on('error', (err) => {
      if (fileStream) {
        try { fileStream.destroy(); } catch (_) {}
        fileStreamDone = true;
      }
      if (!settled) {
        settled = true;
        cleanupListeners();
        reject(
          new CommandExecutionError(`Command error: ${err.message}`, {
            exitCode: null,
            stdout,
            stderr: stderr || err.message,
          })
        );
      }
    });

    child.on('close', (code, sig) => {
      childExited = true;
      exitCode = code;
      exitSignal = sig;
      finalizeIfReady();
    });
  });
}

module.exports = {
  CommandTimeoutError,
  CommandAbortedError,
  CommandExecutionError,
  getPowershellPath,
  getScanimagePath,
  getImg2pdfPath,
  getTesseractPath,
  commandExists,
  runCommand,
};
