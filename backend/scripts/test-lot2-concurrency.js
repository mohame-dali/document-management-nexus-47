#!/usr/bin/env node
/**
 * backend/scripts/test-lot2-concurrency.js
 * Suite de vérification LOT 2 intégrité :
 * - Mode MongoDB réel si process.env.MONGODB_URI est défini (et sans --unit)
 * - Mode autonome déterministe (stubs en mémoire sur les vrais contrôleurs/helpers) sinon ou avec --unit
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const mongoose = require('mongoose');

const Counter = require('../models/Counter');
const IncomingDocument = require('../models/IncomingDocument');
const OutgoingDocument = require('../models/OutgoingDocument');
const Folder = require('../models/Folder');
const Message = require('../models/Message');
const Personnel = require('../models/Personnel');
const BackupHistory = require('../models/BackupHistory');
const AuditLog = require('../models/AuditLog');

const documentHelper = require('../utils/documentHelper');
const serialNumberCtrl = require('../controllers/serialNumber');
const outgoingDetailCtrl = require('../controllers/outgoingDocuments/detailControllers');
const outgoingUpdateCtrl = require('../controllers/outgoingDocuments/managementControllers/documentUpdateController');
const incomingDeleteCtrl = require('../controllers/incomingDocuments/managementControllers/documentDeleteController');
const outgoingDeleteCtrl = require('../controllers/outgoingDocuments/managementControllers/documentDeleteController');
const trashCtrl = require('../controllers/trashController');
const backupCtrl = require('../controllers/backup');

function createResRecorder() {
  const rec = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return rec;
}

function createNextRecorder() {
  let captured = null;
  const next = (err) => {
    captured = err;
  };
  next.getError = () => captured;
  return next;
}

function stubMethod(target, methodName, impl) {
  const original = target[methodName];
  target[methodName] = impl;
  return () => {
    target[methodName] = original;
  };
}

async function runUnitVerification() {
  console.log('=== LOT 2 Verification Suite (Mode autonome / contrôleurs réels) ===');
  const restores = [];

  try {
    // 1. Test de concurrence : 10 allocations simultanées sans doublon
    {
      const countersStore = new Map();
      const counterLockQueue = new Map();

      const withSerializedCounterLock = async (key, fn) => {
        const prev = counterLockQueue.get(key) || Promise.resolve();
        let release;
        const nextPromise = new Promise((r) => {
          release = r;
        });
        counterLockQueue.set(key, nextPromise);
        await prev;
        try {
          return await fn();
        } finally {
          release();
        }
      };

      const r1 = stubMethod(Counter, 'findById', (id) => ({
        lean: async () => {
          await new Promise((r) => setTimeout(r, 2));
          return countersStore.get(id) || null;
        },
      }));
      const r2 = stubMethod(Counter, 'updateOne', async (filter, update) => {
        await withSerializedCounterLock(filter._id, async () => {
          if (!countersStore.has(filter._id)) {
            countersStore.set(filter._id, {
              _id: filter._id,
              ...update.$setOnInsert,
            });
          }
        });
        return { acknowledged: true };
      });
      const r3 = stubMethod(Counter, 'findOneAndUpdate', async (filter, update) => {
        // Simuler une latence async avant l'opération atomique MongoDB findOneAndUpdate
        await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 10)));
        return withSerializedCounterLock(filter._id, async () => {
          const cur = countersStore.get(filter._id) || {
            _id: filter._id,
            ...(update.$setOnInsert || {}),
            seq: 0,
          };
          cur.seq += update.$inc.seq;
          countersStore.set(filter._id, cur);
          return { ...cur };
        });
      });
      const r4 = stubMethod(IncomingDocument, 'findOne', () => ({
        sort: () => ({
          select: () => ({
            lean: async () => null,
          }),
        }),
      }));
      const r5 = stubMethod(IncomingDocument, 'exists', async () => null);

      const results = await Promise.all(
        Array.from({ length: 10 }, () => documentHelper.getNextSerialNumber(2026, 'incoming'))
      );

      r5();
      r4();
      r3();
      r2();
      r1();

      assert.strictEqual(results.length, 10, '10 numéros doivent être retournés');
      assert.strictEqual(new Set(results).size, 10, `Doublon détecté dans: ${JSON.stringify(results)}`);
      const sorted = [...results].sort((a, b) => a - b);
      assert.deepStrictEqual(sorted, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      console.log('  [PASS] 1. Concurrence 10 créations simultanées -> [1..10] sans doublon:', results.join(','));
    }

    // 2. validateSerialNumber exclut isDeleted: true
    {
      let capturedQuery = null;
      const r = stubMethod(OutgoingDocument, 'findOne', async (query) => {
        capturedQuery = query;
        return null;
      });
      const req = { query: { serialNumber: '42', year: '2026', type: 'outgoing' } };
      const res = createResRecorder();
      const next = createNextRecorder();
      await serialNumberCtrl.validateSerialNumber(req, res, next);
      r();

      assert.strictEqual(next.getError(), null);
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.data.isValid, true);
      assert.deepStrictEqual(capturedQuery, {
        serialNumber: 42,
        year: 2026,
        isDeleted: { $ne: true },
      });
      console.log('  [PASS] 2. validateSerialNumber exclut les documents soft-deleted');
    }

    // 3. outgoingDocuments/detailControllers gère activeDepartment null sans 500
    {
      const docId = new mongoose.Types.ObjectId().toString();
      const fakeDoc = {
        _id: docId,
        isDeleted: false,
        scannedDocument: null,
        source: { id: new mongoose.Types.ObjectId() },
        reference: null,
      };
      const r = stubMethod(OutgoingDocument, 'findById', () => ({
        populate: () => ({
          populate: () => ({
            populate: async () => fakeDoc,
          }),
        }),
      }));
      const req = {
        params: { id: docId },
        user: { _id: new mongoose.Types.ObjectId(), username: 'deptuser', role: 'AdminDepartment', activeDepartment: null },
      };
      const res = createResRecorder();
      const next = createNextRecorder();
      await outgoingDetailCtrl.getOutgoingDocument(req, res, next);
      r();

      const err = next.getError();
      assert(err, 'Une ErrorResponse 403 doit être transmise à next');
      assert.strictEqual(err.statusCode, 403);
      console.log('  [PASS] 3. detailControllers garde activeDepartment=null -> 403');
    }

    // 4. outgoing documentUpdateController : lecture previousReferenceId avant update/populate & synchro bidirectionnelle
    {
      const outgoingId = new mongoose.Types.ObjectId().toString();
      const prevIncomingId = new mongoose.Types.ObjectId().toString();
      const nextIncomingId = new mongoose.Types.ObjectId().toString();
      const deptId = new mongoose.Types.ObjectId().toString();

      const updateOneCalls = [];
      const incomingUpdateCalls = [];
      const outgoingUpdateManyCalls = [];

      const r1 = stubMethod(OutgoingDocument, 'findById', async () => ({
        _id: outgoingId,
        isDeleted: false,
        reference: new mongoose.Types.ObjectId(prevIncomingId),
        source: { id: new mongoose.Types.ObjectId(deptId) },
        year: 2026,
        serialNumber: 12,
      }));
      const r2 = stubMethod(IncomingDocument, 'findById', async (id) => ({
        _id: id,
        isDeleted: false,
        assignedTo: [{ id: new mongoose.Types.ObjectId(deptId) }],
      }));
      const r3 = stubMethod(OutgoingDocument, 'findByIdAndUpdate', () => ({
        populate: () => ({
          populate: () => ({
            populate: async () => ({
              _id: outgoingId,
              reference: { _id: nextIncomingId },
            }),
          }),
        }),
      }));
      const r4 = stubMethod(IncomingDocument, 'updateOne', async (filter, update) => {
        updateOneCalls.push({ filter, update });
        return { modifiedCount: 1 };
      });
      const r5 = stubMethod(OutgoingDocument, 'updateMany', async (filter, update) => {
        outgoingUpdateManyCalls.push({ filter, update });
        return { modifiedCount: 0 };
      });
      const r6 = stubMethod(IncomingDocument, 'findByIdAndUpdate', async (id, update) => {
        incomingUpdateCalls.push({ id, update });
        return { _id: id };
      });

      const req = {
        params: { id: outgoingId },
        user: { _id: new mongoose.Types.ObjectId(), role: 'AdminDepartment', activeDepartment: deptId },
        body: { referenceId: nextIncomingId },
      };
      const res = createResRecorder();
      const next = createNextRecorder();
      await outgoingUpdateCtrl.updateOutgoingDocument(req, res, next);

      r6();
      r5();
      r4();
      r3();
      r2();
      r1();

      assert.strictEqual(next.getError(), null);
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(updateOneCalls.length, 1);
      assert.deepStrictEqual(updateOneCalls[0].filter, { _id: prevIncomingId, answer: outgoingId });
      assert.deepStrictEqual(updateOneCalls[0].update, { $set: { answer: null } });
      assert.strictEqual(incomingUpdateCalls.length, 1);
      assert.strictEqual(incomingUpdateCalls[0].id, nextIncomingId);
      assert.deepStrictEqual(incomingUpdateCalls[0].update, { $set: { answer: outgoingId } });
      console.log('  [PASS] 4. documentUpdateController délient l\'ancienne référence et lie la nouvelle');
    }

    // 5. Soft-delete entrant et sortant préservent answer et reference
    {
      const answerId = new mongoose.Types.ObjectId();
      const inDoc = {
        _id: new mongoose.Types.ObjectId(),
        isDeleted: false,
        answer: answerId,
        savedOpts: null,
        async save(opts) {
          this.savedOpts = opts;
          return this;
        },
      };
      const rIn = stubMethod(IncomingDocument, 'findById', async () => inDoc);
      const nextIn = createNextRecorder();
      await incomingDeleteCtrl.deleteIncomingDocument(
        { params: { id: inDoc._id.toString() }, user: { _id: new mongoose.Types.ObjectId() } },
        createResRecorder(),
        nextIn
      );
      rIn();
      assert.strictEqual(nextIn.getError(), null);
      assert.strictEqual(inDoc.isDeleted, true);
      assert.strictEqual(inDoc.answer, answerId, 'answer doit être préservé après soft-delete');

      const refId = new mongoose.Types.ObjectId();
      const outDoc = {
        _id: new mongoose.Types.ObjectId(),
        isDeleted: false,
        reference: refId,
        savedOpts: null,
        async save(opts) {
          this.savedOpts = opts;
          return this;
        },
      };
      const rOut = stubMethod(OutgoingDocument, 'findById', async () => outDoc);
      const nextOut = createNextRecorder();
      await outgoingDeleteCtrl.deleteOutgoingDocument(
        { params: { id: outDoc._id.toString() }, user: { _id: new mongoose.Types.ObjectId() } },
        createResRecorder(),
        nextOut
      );
      rOut();
      assert.strictEqual(nextOut.getError(), null);
      assert.strictEqual(outDoc.isDeleted, true);
      assert.strictEqual(outDoc.reference, refId, 'reference doit être préservée après soft-delete');
      console.log('  [PASS] 5. Soft-delete entrant & sortant préservent les liens answer/reference');
    }

    // 6. trashController : emptyTrash refuse dossier avec éléments actifs (400) & permanentDelete message partiel -> 409
    {
      const folderId = new mongoose.Types.ObjectId();
      const rF1 = stubMethod(Folder, 'find', () => ({
        select: () => ({
          lean: async () => [{ _id: folderId }],
        }),
      }));
      const rF2 = stubMethod(Folder, 'countDocuments', async () => 0);
      const rF3 = stubMethod(IncomingDocument, 'countDocuments', async () => 2);
      const rF4 = stubMethod(OutgoingDocument, 'countDocuments', async () => 0);
      let deletedInEmpty = false;
      const rF5 = stubMethod(Folder, 'findByIdAndDelete', async () => {
        deletedInEmpty = true;
      });

      const nextEmpty = createNextRecorder();
      await trashCtrl.emptyTrash(
        { query: { type: 'folder' }, user: { _id: new mongoose.Types.ObjectId(), role: 'Admin' }, ip: '127.0.0.1' },
        createResRecorder(),
        nextEmpty
      );
      rF5(); rF4(); rF3(); rF2(); rF1();

      const emptyErr = nextEmpty.getError();
      assert(emptyErr, 'emptyTrash doit refuser si un dossier supprimé contient des documents actifs');
      assert.strictEqual(emptyErr.statusCode, 400);
      assert.strictEqual(deletedInEmpty, false);

      // permanentDelete message supprimé uniquement par userA (pas userB) -> 409 (jamais 200)
      const userA = new mongoose.Types.ObjectId();
      const userB = new mongoose.Types.ObjectId();
      const msgId = new mongoose.Types.ObjectId().toString();
      let msgDeleted = false;
      const rM1 = stubMethod(Message, 'findById', async () => ({
        _id: msgId,
        sender: userA,
        recipients: [{ user: userB }],
        deletedBy: [userA],
        attachments: [],
        async deleteOne() {
          msgDeleted = true;
        },
      }));
      const nextMsg = createNextRecorder();
      const resMsg = createResRecorder();
      await trashCtrl.permanentDelete(
        { params: { type: 'message', id: msgId }, user: { _id: userA, role: 'Admin' }, ip: '127.0.0.1' },
        resMsg,
        nextMsg
      );
      rM1();

      const msgErr = nextMsg.getError();
      assert(msgErr, 'permanentDelete message doit retourner 409 tant que toutes les parties n\'ont pas supprimé');
      assert.strictEqual(msgErr.statusCode, 409);
      assert.strictEqual(msgDeleted, false);
      console.log('  [PASS] 6. trashController : emptyTrash -> 400 sur dossier non vide & permanentDelete message -> 409');
    }

    // 7. backup.js : restoreBackup échoue avec HTTP 500 si étape échoue (jamais de succès factice)
    {
      const tmpBackupDir = path.join(process.cwd(), 'backups');
      fs.mkdirSync(tmpBackupDir, { recursive: true });
      const fakeZipPath = path.join(tmpBackupDir, `lot2-test-backup-${Date.now()}.zip`);
      fs.writeFileSync(fakeZipPath, 'not-a-valid-zip');
      const backupId = new mongoose.Types.ObjectId().toString();

      const rB1 = stubMethod(BackupHistory, 'findById', async (id) => {
        if (String(id) === backupId) {
          return {
            _id: backupId,
            status: 'completed',
            filePath: fakeZipPath,
            fileSize: 15,
            createdAt: new Date(),
            async save() { return this; },
          };
        }
        return null;
      });
      const rB2 = stubMethod(AuditLog, 'create', async () => ({}));
      const rB3 = stubMethod(BackupHistory, 'create', async (doc) => ({
        _id: new mongoose.Types.ObjectId(),
        ...doc,
      }));
      const rB4 = stubMethod(BackupHistory, 'findByIdAndUpdate', async () => null);

      const req = {
        body: { backupId, confirmation: 'CONFIRM_RESTORE' },
        user: { _id: new mongoose.Types.ObjectId(), role: 'Admin' },
        ip: '127.0.0.1',
      };
      const res = createResRecorder();
      try {
        await backupCtrl.restoreBackup(req, res);
      } finally {
        rB4(); rB3(); rB2(); rB1();
        fs.rmSync(fakeZipPath, { force: true });
      }

      assert.strictEqual(res.statusCode, 500, 'restoreBackup doit renvoyer 500 en cas d\'échec (safetyBackup/unzip/mongorestore)');
      assert.strictEqual(res.body.success, false);
      console.log('  [PASS] 7. backup.restoreBackup retourne HTTP 500 sur échec réel (zéro succès factice)');
    }

    console.log('\n🎉 Tous les tests unitaires/intégration LOT 2 ont réussi.');
  } finally {
    while (restores.length > 0) {
      restores.pop()();
    }
  }
}

async function runLiveMongoConcurrencyTest() {
  const dbUri = process.env.MONGODB_URI;
  const scratchYear = 2099;
  const counterId = `incoming:${scratchYear}`;
  let connected = false;

  console.log('=== LOT 2 Verification Suite (Mode MongoDB LIVE) ===');
  try {
    const isLocalOrStandalone = !dbUri.includes('+srv') && !dbUri.includes('replicaSet');
    await mongoose.connect(dbUri, {
      ...(isLocalOrStandalone ? { directConnection: true } : {}),
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 15000,
    });
    connected = true;

    await IncomingDocument.deleteMany({ year: scratchYear });
    await Counter.deleteOne({ _id: counterId });

    const dummyDeptId = new mongoose.Types.ObjectId();
    const dummyUserId = new mongoose.Types.ObjectId();

    const createdDocs = await Promise.all(
      Array.from({ length: 10 }, async (_, idx) => {
        const serialNumber = await documentHelper.getNextSerialNumber(scratchYear, 'incoming');
        return IncomingDocument.create({
          serialNumber,
          year: scratchYear,
          receptionDate: new Date(),
          source: 'TEST-CONCURRENCY',
          assignedTo: [{ id: dummyDeptId, name: 'Test Dept' }],
          subject: `Test concurrence LOT 2 #${idx + 1}`,
          createdBy: dummyUserId,
        });
      })
    );

    const serials = createdDocs.map((d) => d.serialNumber);
    assert.strictEqual(serials.length, 10);
    assert.strictEqual(new Set(serials).size, 10, `Doublons détectés: ${serials.join(',')}`);
    assert.deepStrictEqual([...serials].sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

    console.log('  [PASS] 10 créations simultanées MongoDB -> serialNumbers uniques:', serials.join(','));
  } finally {
    if (connected) {
      await IncomingDocument.deleteMany({ year: scratchYear }).catch(() => {});
      await Counter.deleteOne({ _id: counterId }).catch(() => {});
      await mongoose.connection.close();
    }
  }
}

async function main() {
  const forceUnit = process.argv.includes('--unit');
  if (!forceUnit && process.env.MONGODB_URI) {
    await runLiveMongoConcurrencyTest();
  } else {
    await runUnitVerification();
  }
}

main().catch((err) => {
  console.error('❌ Échec de la vérification LOT 2:', err);
  process.exit(1);
});
