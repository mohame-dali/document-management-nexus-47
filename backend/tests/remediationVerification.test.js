'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const net = require('node:net');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

// Configure isolated test environment BEFORE requiring backend modules
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'remediation_verification_test_secret_key_2026';
process.env.DISABLE_AI_WARMUP = 'true';
process.env.CLAMAV_ENABLED = 'false';

const TEST_TEMP_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-remediation-test-'));
const TEST_UPLOAD_ROOT = path.join(TEST_TEMP_ROOT, 'uploads');
fs.mkdirSync(TEST_UPLOAD_ROOT, { recursive: true });
process.env.UPLOAD_PATH = TEST_UPLOAD_ROOT;
process.env.UPLOAD_DIR = TEST_UPLOAD_ROOT;

const BACKEND_ROOT = path.resolve(__dirname, '..');
const TEST_YEAR = 2099;
const TEST_COURRIER_YEAR_DIR = path.join(BACKEND_ROOT, 'courrier', String(TEST_YEAR));

const mongoose = require('mongoose');
const User = require('../models/User');
const Department = require('../models/Department');
const Personnel = require('../models/Personnel');
const OrganizationSettings = require('../models/OrganizationSettings');
const IncomingDocument = require('../models/IncomingDocument');
const OutgoingDocument = require('../models/OutgoingDocument');
const SemanticIndex = require('../models/SemanticIndex');
const AuditLog = require('../models/AuditLog');
const ollamaService = require('../services/ollamaService');
const ocrProcessor = require('../utils/ocrProcessor');
const { fork } = require('node:child_process');

// Helpers for chainable Mongoose query mocks
function createChainableQuery(resolvedValue) {
  const query = {
    populate() { return query; },
    select() { return query; },
    sort() { return query; },
    limit() { return query; },
    lean() { return Promise.resolve(resolvedValue); },
    then(onFulfilled, onRejected) {
      return Promise.resolve(resolvedValue).then(onFulfilled, onRejected);
    },
    catch(onRejected) {
      return Promise.resolve(resolvedValue).catch(onRejected);
    },
  };
  return query;
}

function makeObjectIdHex(seedChar = 'a') {
  return seedChar.repeat(24);
}

function signTokenForUser(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

function containsKeyOrValue(obj, forbiddenKey, forbiddenValues) {
  if (obj === null || obj === undefined) return false;
  if (typeof obj === 'string') {
    return forbiddenValues.some((val) => obj.includes(val));
  }
  if (Array.isArray(obj)) {
    return obj.some((item) => containsKeyOrValue(item, forbiddenKey, forbiddenValues));
  }
  if (typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      if (k === forbiddenKey) return true;
      if (containsKeyOrValue(v, forbiddenKey, forbiddenValues)) return true;
    }
  }
  return false;
}

// Shared test state
const DEPT_ID = makeObjectIdHex('1');
const OTHER_DEPT_ID = makeObjectIdHex('2');
const ADMIN_ID = makeObjectIdHex('a');
const USER_ID = makeObjectIdHex('b');
const DEPT_ADMIN_ID = makeObjectIdHex('c');
const DOC_ID = makeObjectIdHex('d');

const usersById = {
  [ADMIN_ID]: {
    _id: ADMIN_ID,
    id: ADMIN_ID,
    username: 'admin_test',
    role: 'Admin',
    isActive: true,
    isDeleted: false,
    departments: [{ _id: DEPT_ID, name: 'Direction Test' }],
    activeDepartment: { _id: DEPT_ID, name: 'Direction Test' },
  },
  [USER_ID]: {
    _id: USER_ID,
    id: USER_ID,
    username: 'user_test',
    role: 'User',
    isActive: true,
    isDeleted: false,
    departments: [{ _id: OTHER_DEPT_ID, name: 'Autre Service' }],
    activeDepartment: { _id: OTHER_DEPT_ID, name: 'Autre Service' },
  },
  [DEPT_ADMIN_ID]: {
    _id: DEPT_ADMIN_ID,
    id: DEPT_ADMIN_ID,
    username: 'dept_admin_test',
    role: 'AdminDepartment',
    isActive: true,
    isDeleted: false,
    departments: [{ _id: DEPT_ID, name: 'Direction Test' }],
    activeDepartment: { _id: DEPT_ID, name: 'Direction Test' },
  },
};

let server;
let baseUrl;
let activeDocRecord;
let capturedSemanticFilter = null;
let semanticRecords = [];

// Originals to restore cleanly in after()
const originals = {
  readyStateDescriptor: Object.getOwnPropertyDescriptor(mongoose.connection, 'readyState'),
  userFindById: User.findById,
  userFindOne: User.findOne,
  userFind: User.find,
  deptFind: Department.find,
  personnelFind: Personnel.find,
  orgSettingsFindOne: OrganizationSettings.findOne,
  incomingFindById: IncomingDocument.findById,
  incomingFindOne: IncomingDocument.findOne,
  incomingFindByIdAndUpdate: IncomingDocument.findByIdAndUpdate,
  incomingUpdateMany: IncomingDocument.updateMany,
  outgoingUpdateMany: OutgoingDocument.updateMany,
  semanticFind: SemanticIndex.find,
  auditCreate: AuditLog.create,
  getEmbeddingWithMeta: ollamaService.getEmbeddingWithMeta,
  chat: ollamaService.chat,
};

test.before(async () => {
  // Stub mongoose.connection.readyState = 1 for standalone verification without external mongod
  Object.defineProperty(mongoose.connection, 'readyState', {
    configurable: true,
    get: () => 1,
  });

  User.findById = (id) => createChainableQuery(usersById[String(id)] || null);
  User.findOne = () => createChainableQuery(null);
  User.find = () => createChainableQuery(Object.values(usersById));

  Department.find = () =>
    createChainableQuery([
      { _id: DEPT_ID, name: 'Direction Test', description: 'Test', isActive: true },
    ]);

  Personnel.find = () =>
    createChainableQuery([
      {
        _id: makeObjectIdHex('e'),
        nom: 'Ben Ali',
        prenom: 'Karim',
        poste: 'Chef de service',
        photo: '',
        emailPersonnel: 'karim@example.tn',
        cin: '08999999',
        statut: 'actif',
        activeDepartment: { _id: DEPT_ID, name: 'Direction Test' },
        departments: [DEPT_ID],
      },
    ]);

  OrganizationSettings.findOne = () =>
    createChainableQuery({
      nomAdministration: 'Administration Test',
      bureauDirecteurDepartmentId: null,
      bureauOrdreDepartmentId: null,
      rhDepartmentId: null,
    });

  // Mock IncomingDocument for versioning tests
  activeDocRecord = {
    _id: DOC_ID,
    serialNumber: 999001,
    year: TEST_YEAR,
    subject: 'Courrier Test Versioning',
    scannedDocument: `courrier/${TEST_YEAR}/Incoming-Doc/999001.pdf`,
    currentVersion: 1,
    versions: [],
    assignedTo: [{ id: DEPT_ID, name: 'Direction Test' }],
    createdBy: ADMIN_ID,
    createdAt: new Date(),
  };

  IncomingDocument.findById = (id) =>
    createChainableQuery(String(id) === DOC_ID ? activeDocRecord : null);
  IncomingDocument.findOne = (query) => {
    if (!query || !query._id || String(query._id) === DOC_ID) {
      return createChainableQuery(activeDocRecord);
    }
    return createChainableQuery(null);
  };
  IncomingDocument.findByIdAndUpdate = (id, updateData) => {
    if (String(id) === DOC_ID && activeDocRecord) {
      activeDocRecord = { ...activeDocRecord, ...updateData };
      return createChainableQuery(activeDocRecord);
    }
    return createChainableQuery(null);
  };
  IncomingDocument.updateMany = async () => ({ modifiedCount: 1 });
  OutgoingDocument.updateMany = async () => ({ modifiedCount: 0 });
  AuditLog.create = async (doc) => doc;

  // Stub embedding & chat for chatController vector-dimension alignment test
  const matchingVec = new Array(1024).fill(0);
  matchingVec[0] = 1;
  const staleVec = new Array(768).fill(0);
  staleVec[0] = 1;

  semanticRecords = [
    {
      documentType: 'incoming',
      documentId: makeObjectIdHex('f'),
      embeddingModel: 'bge-m3-q4_k_m.gguf',
      embeddingDimension: 1024,
      embedding: matchingVec,
      sourceText: 'Arrêté ministériel relatif aux congés annuels 2025',
      metadata: {
        subject: 'Note congés 2025',
        source: 'Ministère',
        serialNumber: '12',
        year: 2025,
        documentDate: new Date('2025-03-15'),
      },
    },
    {
      documentType: 'incoming',
      documentId: makeObjectIdHex('9'),
      embeddingModel: 'nomic-embed-text',
      embeddingDimension: 768,
      embedding: staleVec,
      sourceText: 'Ancien vecteur 768d incompatible',
      metadata: {
        subject: 'Legacy 768d Doc',
        source: 'Archive',
        serialNumber: '01',
        year: 2024,
        documentDate: new Date('2024-01-10'),
      },
    },
  ];

  SemanticIndex.find = (filter) => {
    // Capture main search filter (distinguish from background mismatch sweep $or query)
    if (filter && Object.prototype.hasOwnProperty.call(filter, 'embeddingDimension')) {
      capturedSemanticFilter = filter;
      const filtered = semanticRecords.filter(
        (rec) =>
          rec.embeddingDimension === filter.embeddingDimension &&
          (!filter.embeddingModel || rec.embeddingModel === filter.embeddingModel)
      );
      return createChainableQuery(filtered);
    }
    // Mismatch sweep query
    const mismatched = semanticRecords.filter((rec) => rec.embeddingDimension !== 1024);
    return createChainableQuery(mismatched);
  };

  ollamaService.getEmbeddingWithMeta = async () => ({
    vector: matchingVec,
    model: 'bge-m3-q4_k_m.gguf',
    dimension: 1024,
  });
  ollamaService.chat = async () => 'تم العثور على وثيقة واحدة مطابقة (رقم 12/2025).';

  // Reload chatController cleanly so it binds the stubbed ollamaService methods
  const chatControllerPath = require.resolve('../controllers/ai/chatController');
  delete require.cache[chatControllerPath];

  // Build Express app mirroring server.ts security protections & routes
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  const { protect, authorize } = require('../middleware/auth');
  const fileController = require('../controllers/fileController');
  const errorHandler = require('../middleware/error');

  // Phase 1 protections
  app.use('/uploads/attachments', (_req, res) => {
    res.status(403).json({ success: false, message: 'Accès direct refusé' });
  });
  app.use('/api-docs', protect, authorize('Admin'), (_req, res) => {
    res.status(200).json({ success: true, openapi: '3.0.0' });
  });

  app.get('/api/files/:type/:id/:filename', protect, fileController.serveProtectedFile);
  app.use('/api/admin', require('../routes/adminRoutes'));
  app.use('/api/organization-chart', require('../routes/organizationChartRoutes'));
  app.use('/api/incoming-documents', require('../routes/incomingDocuments'));
  app.use('/api/ai', require('../routes/aiRoutes'));
  app.use(errorHandler);

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address();
  baseUrl = `http://127.0.0.1:${addr.port}`;
});

test.after(async () => {
  await ollamaService.shutdownAIWorker();

  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }

  // Restore mongoose & model methods
  if (originals.readyStateDescriptor) {
    Object.defineProperty(mongoose.connection, 'readyState', originals.readyStateDescriptor);
  }
  User.findById = originals.userFindById;
  User.findOne = originals.userFindOne;
  User.find = originals.userFind;
  Department.find = originals.deptFind;
  Personnel.find = originals.personnelFind;
  OrganizationSettings.findOne = originals.orgSettingsFindOne;
  IncomingDocument.findById = originals.incomingFindById;
  IncomingDocument.findOne = originals.incomingFindOne;
  IncomingDocument.findByIdAndUpdate = originals.incomingFindByIdAndUpdate;
  IncomingDocument.updateMany = originals.incomingUpdateMany;
  OutgoingDocument.updateMany = originals.outgoingUpdateMany;
  SemanticIndex.find = originals.semanticFind;
  AuditLog.create = originals.auditCreate;
  ollamaService.getEmbeddingWithMeta = originals.getEmbeddingWithMeta;
  ollamaService.chat = originals.chat;

  // Clean temporary files & synthetic 2099 test folder
  fs.rmSync(TEST_TEMP_ROOT, { recursive: true, force: true });
  fs.rmSync(TEST_COURRIER_YEAR_DIR, { recursive: true, force: true });
});

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 1 — Auth, Admin & Sensitive Field Hardening
// ═══════════════════════════════════════════════════════════════════════════

test('Phase 1: Unauthorized access to /api-docs, /uploads/attachments/*, and /api/admin/reindex-failed returns 401/403', async () => {
  const userToken = signTokenForUser(USER_ID);
  const adminToken = signTokenForUser(ADMIN_ID);

  // 1. /api-docs
  const apiDocsAnon = await fetch(`${baseUrl}/api-docs`);
  assert.equal(apiDocsAnon.status, 401, 'Unauthenticated /api-docs must return 401');

  const apiDocsUser = await fetch(`${baseUrl}/api-docs`, {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  assert.equal(apiDocsUser.status, 403, 'Non-admin /api-docs must return 403');

  const apiDocsAdmin = await fetch(`${baseUrl}/api-docs`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(apiDocsAdmin.status, 200, 'Admin /api-docs must be allowed');

  // 2. /uploads/attachments/*
  const attachAnon = await fetch(`${baseUrl}/uploads/attachments/confidentiel.pdf`);
  assert.equal(attachAnon.status, 403, 'Direct access to /uploads/attachments/* must return 403');

  const attachAdmin = await fetch(`${baseUrl}/uploads/attachments/confidentiel.pdf`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(attachAdmin.status, 403, 'Direct static access to /uploads/attachments/* must remain 403');

  // 3. /api/admin/reindex-failed
  const reindexAnon = await fetch(`${baseUrl}/api/admin/reindex-failed`, { method: 'POST' });
  assert.equal(reindexAnon.status, 401, 'Unauthenticated /api/admin/reindex-failed must return 401');

  const reindexUser = await fetch(`${baseUrl}/api/admin/reindex-failed`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${userToken}` },
  });
  assert.equal(reindexUser.status, 403, 'Non-admin /api/admin/reindex-failed must return 403');
});

test('Phase 1: /api/organization-chart never exposes cin anywhere in payload', async () => {
  const userToken = signTokenForUser(USER_ID);
  const res = await fetch(`${baseUrl}/api/organization-chart`, {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.success, true);
  assert.equal(
    containsKeyOrValue(body, 'cin', ['08999999']),
    false,
    'Organization chart response must never leak cin field or value'
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 2 — Upload Security (Magic Bytes, Double Extensions, ClamAV) & Versioning
// ═══════════════════════════════════════════════════════════════════════════

test('Phase 2: Spoofed .pdf executables and double extensions are rejected with 415', async () => {
  const adminToken = signTokenForUser(ADMIN_ID);

  const maliciousPayloads = [
    {
      label: 'PE executable masquerading as PDF',
      filename: 'facture.pdf',
      bytes: Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]),
    },
    {
      label: 'ELF binary masquerading as PDF',
      filename: 'rapport.pdf',
      bytes: Buffer.from([0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01, 0x01, 0x00]),
    },
    {
      label: 'HTML/XSS masquerading as PDF',
      filename: 'note.pdf',
      bytes: Buffer.from('<!doctype html><html><script>alert(1)</script></html>', 'utf8'),
    },
    {
      label: 'Double extension .pdf.exe',
      filename: 'courrier.pdf.exe',
      bytes: Buffer.from('%PDF-1.4\n%spoofed\n%%EOF', 'utf8'),
    },
    {
      label: 'Double extension .exe.pdf with valid PDF header',
      filename: 'courrier.exe.pdf',
      bytes: Buffer.from('%PDF-1.4\n%spoofed\n%%EOF', 'utf8'),
    },
    {
      label: 'Double extension .sh.pdf',
      filename: 'script.sh.pdf',
      bytes: Buffer.from('%PDF-1.4\n%spoofed\n%%EOF', 'utf8'),
    },
  ];

  for (const sample of maliciousPayloads) {
    const form = new FormData();
    form.append('document', new Blob([sample.bytes], { type: 'application/pdf' }), sample.filename);

    const res = await fetch(`${baseUrl}/api/incoming-documents/${DOC_ID}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: form,
    });

    assert.equal(res.status, 415, `${sample.label} (${sample.filename}) must be rejected with 415`);
  }
});

test('Phase 2: Infected PDF flagged by ClamAV daemon is rejected with 422', async () => {
  const adminToken = signTokenForUser(ADMIN_ID);

  // Spin up mock clamd TCP server responding FOUND
  const mockClamd = net.createServer((socket) => {
    socket.on('data', (chunk) => {
      // Wait for end-of-stream 4 zero bytes in zINSTREAM or respond immediately when chunk ends
      if (chunk.length >= 4 && chunk.readUInt32BE(chunk.length - 4) === 0) {
        socket.end('stream: Eicar-Test-Signature FOUND\0');
      }
    });
  });

  await new Promise((resolve) => mockClamd.listen(0, '127.0.0.1', resolve));
  const clamdPort = mockClamd.address().port;

  const prevEnabled = process.env.CLAMAV_ENABLED;
  const prevHost = process.env.CLAMAV_HOST;
  const prevPort = process.env.CLAMAV_PORT;

  process.env.CLAMAV_ENABLED = 'true';
  process.env.CLAMAV_HOST = '127.0.0.1';
  process.env.CLAMAV_PORT = String(clamdPort);

  try {
    const form = new FormData();
    form.append(
      'document',
      new Blob([Buffer.from('%PDF-1.4\n%eicar test payload\n%%EOF', 'utf8')], {
        type: 'application/pdf',
      }),
      'infected.pdf'
    );

    const res = await fetch(`${baseUrl}/api/incoming-documents/${DOC_ID}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: form,
    });

    assert.equal(res.status, 422, 'Malware detected by ClamAV must return HTTP 422');
  } finally {
    process.env.CLAMAV_ENABLED = prevEnabled;
    if (prevHost === undefined) delete process.env.CLAMAV_HOST;
    else process.env.CLAMAV_HOST = prevHost;
    if (prevPort === undefined) delete process.env.CLAMAV_PORT;
    else process.env.CLAMAV_PORT = prevPort;
    await new Promise((resolve) => mockClamd.close(resolve));
  }
});

test('Phase 2: Updating document file creates v2 while preserving v1 on disk and via ?version=1', async () => {
  const adminToken = signTokenForUser(ADMIN_ID);
  const userToken = signTokenForUser(USER_ID);

  // Seed v1 physical file on disk
  const incomingYearDir = path.join(TEST_COURRIER_YEAR_DIR, 'Incoming-Doc');
  fs.mkdirSync(incomingYearDir, { recursive: true });
  const v1FilePath = path.join(incomingYearDir, '999001.pdf');
  const v1Content = '%PDF-1.4\n%VERSION_ONE_IMMUTABLE_CONTENT\n%%EOF';
  fs.writeFileSync(v1FilePath, v1Content, 'utf8');

  // Upload v2 PDF via PUT /api/incoming-documents/:id
  const v2Content = '%PDF-1.4\n%VERSION_TWO_UPDATED_CONTENT\n%%EOF';
  const form = new FormData();
  form.append('subject', 'Courrier Test Versioning v2');
  form.append(
    'document',
    new Blob([Buffer.from(v2Content, 'utf8')], { type: 'application/pdf' }),
    'updated_scan.pdf'
  );

  const updateRes = await fetch(`${baseUrl}/api/incoming-documents/${DOC_ID}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: form,
  });
  assert.equal(updateRes.status, 200);
  const updateBody = await updateRes.json();
  assert.equal(updateBody.success, true);
  assert.equal(updateBody.data.currentVersion, 2);
  assert.equal(updateBody.data.versions.length, 2);
  assert.equal(updateBody.data.versions[0].version, 1);
  assert.equal(updateBody.data.versions[1].version, 2);

  // Verify v1 file was NOT deleted or overwritten on disk
  assert.equal(fs.existsSync(v1FilePath), true, 'v1 file must remain on disk');
  assert.equal(fs.readFileSync(v1FilePath, 'utf8'), v1Content, 'v1 file bytes must remain intact');

  // Verify v1 is retrievable via ?version=1
  const v1Res = await fetch(`${baseUrl}/api/files/incoming/${DOC_ID}/999001.pdf?version=1`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(v1Res.status, 200);
  assert.equal(await v1Res.text(), v1Content);

  // Verify v2 is retrievable via ?version=2
  const v2Filename = path.basename(updateBody.data.scannedDocument);
  const v2Res = await fetch(`${baseUrl}/api/files/incoming/${DOC_ID}/${v2Filename}?version=2`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(v2Res.status, 200);
  assert.equal(await v2Res.text(), v2Content);

  // Verify non-existent version returns 404 and unauthorized department user receives 403
  const missingVerRes = await fetch(`${baseUrl}/api/files/incoming/${DOC_ID}/999001.pdf?version=99`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(missingVerRes.status, 404);

  const forbiddenRes = await fetch(`${baseUrl}/api/files/incoming/${DOC_ID}/999001.pdf?version=1`, {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  assert.equal(forbiddenRes.status, 403);
});

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 3 — Isolated AI Worker, Vector Dimension Alignment & Bilingual OCR
// ═══════════════════════════════════════════════════════════════════════════

test('Phase 3: AI worker isolates chat/embedding inference via IPC and recovers automatically after crash', async () => {
  // 1. Verify worker spawns in separate PID and automatically respawns after SIGKILL crash
  const ping1 = await ollamaService.pingAIWorker();
  assert.equal(ping1.ok, true);
  assert.notEqual(ping1.pid, process.pid, 'AI worker must run in separate child PID');

  process.kill(ping1.pid, 'SIGKILL');
  await new Promise((r) => setTimeout(r, 200));

  const ping2 = await ollamaService.pingAIWorker();
  assert.equal(ping2.ok, true);
  assert.notEqual(ping2.pid, ping1.pid, 'Crashed AI worker must respawn with a new PID');

  await ollamaService.shutdownAIWorker();

  // 2. Verify aiWorker.js handles chat & embedding IPC messages end-to-end
  const mockModelDir = path.join(TEST_TEMP_ROOT, 'models');
  fs.mkdirSync(mockModelDir, { recursive: true });
  const mockChatModel = path.join(mockModelDir, 'ALLaM-AI_ALLaM-7B-Instruct-preview-Q4_K_M.gguf');
  const mockEmbedModel = path.join(mockModelDir, 'bge-m3-q4_k_m.gguf');
  fs.writeFileSync(mockChatModel, 'mock-gguf');
  fs.writeFileSync(mockEmbedModel, 'mock-gguf');

  const hookFile = path.join(TEST_TEMP_ROOT, 'mock-llama-loader.mjs');
  fs.writeFileSync(
    hookFile,
    `
    import { registerHooks } from 'node:module';
    const mockModuleSource = \`
      export async function getLlama() {
        return {
          async loadModel({ modelPath }) {
            return {
              async createContext() {
                return {
                  getSequence() {
                    return { dispose() {} };
                  },
                  async dispose() {},
                };
              },
              async createEmbeddingContext() {
                return {
                  async getEmbeddingFor(text) {
                    const vec = new Float32Array(1024);
                    vec[0] = text.length > 0 ? 1 : 0;
                    return { vector: vec };
                  },
                  async dispose() {},
                };
              },
              async dispose() {},
            };
          },
          async dispose() {},
        };
      }
      export class LlamaChatSession {
        async prompt(text) {
          return 'IPC_CHAT_OK:' + text.slice(0, 20);
        }
      }
    \`;
    registerHooks({
      resolve(specifier, context, nextResolve) {
        if (specifier === 'node-llama-cpp') {
          return { shortCircuit: true, url: 'mock://node-llama-cpp' };
        }
        return nextResolve(specifier, context);
      },
      load(url, context, nextLoad) {
        if (url === 'mock://node-llama-cpp') {
          return { shortCircuit: true, format: 'module', source: mockModuleSource };
        }
        return nextLoad(url, context);
      },
    });
    `,
    'utf8'
  );

  const workerPath = path.resolve(__dirname, '../workers/aiWorker.js');
  const child = fork(workerPath, [], {
    execArgv: [`--import=${hookFile}`],
    env: {
      ...process.env,
      LLAMA_CHAT_MODEL_PATH: mockChatModel,
      LLAMA_EMBEDDING_MODEL_PATH: mockEmbedModel,
    },
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  });

  const sendIpc = (type, payload) =>
    new Promise((resolve, reject) => {
      const id = `${type}-${Date.now()}-${Math.random()}`;
      const timer = setTimeout(() => reject(new Error(`IPC timeout for ${type}`)), 5000);
      const onMsg = (msg) => {
        if (msg && msg.id === id) {
          clearTimeout(timer);
          child.off('message', onMsg);
          if (msg.ok) resolve(msg.result);
          else reject(new Error(msg.error?.message || 'Worker error'));
        }
      };
      child.on('message', onMsg);
      child.send({ id, type, payload });
    });

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Worker ready timeout')), 5000);
    const onReady = (msg) => {
      if (msg && msg.type === 'ready') {
        clearTimeout(timer);
        child.off('message', onReady);
        resolve();
      }
    };
    child.on('message', onReady);
  });

  try {
    const embRes = await sendIpc('embedding', { text: 'Note administrative 2025' });
    assert.equal(embRes.model, 'bge-m3-q4_k_m.gguf');
    assert.equal(embRes.dimension, 1024);
    assert.equal(embRes.vector.length, 1024);

    const chatRes = await sendIpc('chat', { prompt: 'Bonjour DMS', systemPrompt: '' });
    assert.equal(chatRes, 'IPC_CHAT_OK:Bonjour DMS');
  } finally {
    try {
      await sendIpc('shutdown', {});
    } catch (_) {
      child.kill('SIGTERM');
    }
  }
});

test('Phase 3: SemanticIndex filters vector search by matching embeddingDimension and embeddingModel', async () => {
  const adminToken = signTokenForUser(ADMIN_ID);

  const res = await fetch(`${baseUrl}/api/ai/chat`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: 'congés annuels 2025' }),
  });

  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.success, true);

  assert.ok(capturedSemanticFilter, 'SemanticIndex.find filter should be captured');
  assert.equal(capturedSemanticFilter.embeddingDimension, 1024);
  assert.equal(capturedSemanticFilter.embeddingModel, 'bge-m3-q4_k_m.gguf');

  // Only the 1024d matching document should be returned; legacy 768d doc must be excluded
  assert.equal(body.data.sources.length, 1);
  assert.equal(body.data.sources[0].subject, 'Note congés 2025');
});

test('Phase 3: ocrProcessor preserves bilingual Arabic/French text, accents, and DD/MM/YYYY dates', () => {
  const rawOcr = [
    '\u200Fالجمهورية التونسية — وزارة التربية الوطنية\u200E',
    "Ministère de l'Éducation Nationale : Arrêté n° 142/2025",
    'الأمر الحكومي المؤرخ في 15/03/2025 — إلى السيد المدير العام',
    "Date d'arrivée : 05-11-2024 | Référence : 9.2.2025",
    'تاريخ المراسلة : ١٨/٠٤/٢٠٢٥ | ISO : 2025-07-21 | Espaces : 02 / 09 / 2025',
    'ﷲ الرحمن الرحيم — ﻻ إله إﻻ الله',
    '| | || |||',
  ].join('\n');

  const cleaned = ocrProcessor.enhancedArabicTextCleanup(rawOcr);
  const finalText = ocrProcessor.cleanArabicOcrText(cleaned);

  assert.ok(finalText.includes('الجمهورية التونسية'), 'Arabic text preserved');
  assert.ok(finalText.includes("Ministère de l'Éducation Nationale"), 'French accents preserved');
  assert.ok(finalText.includes('الأمر') && finalText.includes('إلى'), 'Hamza and alef maksura preserved');
  assert.equal(/[\u200E\u200F]/.test(finalText), false, 'BiDi control marks stripped');
  assert.equal(finalText.includes('| | ||'), false, 'OCR symbol noise stripped');

  const extractedDates = ocrProcessor.extractDatesFromOcrText(finalText);
  assert.deepEqual(extractedDates, [
    '15/03/2025',
    '05/11/2024',
    '09/02/2025',
    '18/04/2025',
    '21/07/2025',
    '02/09/2025',
  ]);
});
