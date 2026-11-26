'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'user_personnel_linking_test_secret_2026';

const User = require('../models/User');
const Personnel = require('../models/Personnel');
const AuditLog = require('../models/AuditLog');
const { linkUserToPersonnel } = require('../controllers/personnelController');
const { deleteUser, permanentDeleteUser } = require('../controllers/users/managementControllers');
const { deactivateUser } = require('../controllers/users/accountControllers');

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

function createMockRes() {
  const res = {
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
  return res;
}

function withStubs(stubs, fn) {
  const originals = stubs.map(([obj, key]) => [obj, key, obj[key]]);
  for (const [obj, key, impl] of stubs) {
    obj[key] = impl;
  }
  return Promise.resolve()
    .then(fn)
    .finally(() => {
      for (const [obj, key, orig] of originals) {
        obj[key] = orig;
      }
    });
}

test('linkUserToPersonnel cleans stale/deleted conflicts and succeeds on standalone MongoDB', async () => {
  const personnelId = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();
  const staleDeletedUserId = new mongoose.Types.ObjectId();
  const deptId = new mongoose.Types.ObjectId();
  const adminId = new mongoose.Types.ObjectId();

  const userUpdateCalls = [];
  const personnelUpdateCalls = [];
  let personnelSaved = false;
  let userSaved = false;

  const personnelDoc = {
    _id: personnelId,
    userId: staleDeletedUserId,
    statut: 'en_attente',
    activeDepartment: deptId,
    isDeleted: false,
    async save() {
      personnelSaved = true;
      return this;
    },
  };

  const userDoc = {
    _id: userId,
    username: 'jdoe',
    role: 'User',
    personnelId: null,
    departments: [],
    activeDepartment: null,
    isDeleted: false,
    async save() {
      userSaved = true;
      return this;
    },
  };

  await withStubs(
    [
      [User, 'updateMany', async (filter, update) => {
        userUpdateCalls.push({ filter, update });
        return { modifiedCount: 1 };
      }],
      [Personnel, 'updateMany', async (filter, update) => {
        personnelUpdateCalls.push({ filter, update });
        return { modifiedCount: 0 };
      }],
      [Personnel, 'findOne', () => createChainableQuery(personnelDoc)],
      [User, 'findOne', () => createChainableQuery(userDoc)],
      [User, 'findById', (id) => {
        if (String(id) === String(staleDeletedUserId)) {
          return createChainableQuery({ _id: staleDeletedUserId, isDeleted: true, personnelId });
        }
        return createChainableQuery(null);
      }],
      [AuditLog, 'create', async () => ({ _id: new mongoose.Types.ObjectId() })],
      [mongoose, 'startSession', async () => ({
        startTransaction() {
          const err = new Error('Transaction numbers are only allowed on a replica set member');
          err.code = 20;
          throw err;
        },
        async abortTransaction() {},
        async endSession() {},
      })],
    ],
    async () => {
      const req = {
        params: { personnelId: String(personnelId) },
        body: { userId: String(userId) },
        user: { _id: adminId, role: 'Admin', username: 'admin' },
        ip: '127.0.0.1',
      };
      const res = createMockRes();
      let nextErr = null;

      await linkUserToPersonnel(req, res, (err) => { nextErr = err; });

      assert.equal(nextErr, null);
      assert.equal(res.statusCode, 200);
      assert.equal(res.body.success, true);
      assert.equal(personnelSaved, true);
      assert.equal(userSaved, true);
      assert.equal(String(personnelDoc.userId), String(userId));
      assert.equal(personnelDoc.statut, 'actif');
      assert.equal(String(userDoc.personnelId), String(personnelId));
      assert.equal(String(userDoc.activeDepartment), String(deptId));

      assert.equal(userUpdateCalls.length, 1);
      assert.equal(userUpdateCalls[0].filter.isDeleted, true);
      assert.equal(userUpdateCalls[0].update.$set.personnelId, null);

      assert.equal(personnelUpdateCalls.length, 1);
      assert.equal(personnelUpdateCalls[0].filter.isDeleted, true);
      assert.equal(personnelUpdateCalls[0].update.$set.userId, null);
    }
  );
});

test('linkUserToPersonnel rejects with 409 when personnel is mutually linked to another active user', async () => {
  const personnelId = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();
  const otherActiveUserId = new mongoose.Types.ObjectId();

  const personnelDoc = {
    _id: personnelId,
    userId: otherActiveUserId,
    statut: 'actif',
    isDeleted: false,
  };
  const userDoc = {
    _id: userId,
    role: 'User',
    personnelId: null,
    isDeleted: false,
  };

  await withStubs(
    [
      [User, 'updateMany', async () => ({ modifiedCount: 0 })],
      [Personnel, 'updateMany', async () => ({ modifiedCount: 0 })],
      [Personnel, 'findOne', () => createChainableQuery(personnelDoc)],
      [User, 'findOne', () => createChainableQuery(userDoc)],
      [User, 'findById', () => createChainableQuery({
        _id: otherActiveUserId,
        isDeleted: false,
        personnelId,
      })],
    ],
    async () => {
      const req = {
        params: { personnelId: String(personnelId) },
        body: { userId: String(userId) },
        user: { _id: new mongoose.Types.ObjectId(), role: 'Admin' },
      };
      const res = createMockRes();
      let nextErr = null;

      await linkUserToPersonnel(req, res, (err) => { nextErr = err; });

      assert.equal(nextErr, null);
      assert.equal(res.statusCode, 409);
      assert.equal(res.body.success, false);
      assert.equal(res.body.code, 'PERSONNEL_ALREADY_LINKED');
    }
  );
});

test('linkUserToPersonnel rolls back standalone personnel save and returns 409 on E11000 error', async () => {
  const personnelId = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();
  const rollbackCalls = [];

  const personnelDoc = {
    _id: personnelId,
    userId: null,
    statut: 'en_attente',
    activeDepartment: null,
    isDeleted: false,
    async save() {
      return this;
    },
  };

  const userDoc = {
    _id: userId,
    username: 'dupuser',
    role: 'User',
    personnelId: null,
    departments: [],
    activeDepartment: null,
    isDeleted: false,
    async save() {
      const err = new Error('E11000 duplicate key error collection: users index: unique_personnel_account');
      err.code = 11000;
      throw err;
    },
  };

  await withStubs(
    [
      [User, 'updateMany', async () => ({ modifiedCount: 0 })],
      [Personnel, 'updateMany', async () => ({ modifiedCount: 0 })],
      [Personnel, 'findOne', () => createChainableQuery(personnelDoc)],
      [User, 'findOne', () => createChainableQuery(userDoc)],
      [Personnel, 'updateOne', async (filter, update) => {
        rollbackCalls.push({ filter, update });
        return { modifiedCount: 1 };
      }],
      [mongoose, 'startSession', async () => ({
        startTransaction() {
          const err = new Error('Transaction numbers are only allowed on a replica set member');
          err.code = 20;
          throw err;
        },
        async abortTransaction() {},
        async endSession() {},
      })],
    ],
    async () => {
      const req = {
        params: { personnelId: String(personnelId) },
        body: { userId: String(userId) },
        user: { _id: new mongoose.Types.ObjectId(), role: 'Admin' },
      };
      const res = createMockRes();
      let nextErr = null;

      await linkUserToPersonnel(req, res, (err) => { nextErr = err; });

      assert.equal(nextErr, null);
      assert.equal(res.statusCode, 409);
      assert.equal(res.body.success, false);
      assert.equal(res.body.code, 'DUPLICATE_KEY_E11000');
      assert.match(res.body.message, /déjà lié|ancien compte supprimé/i);

      assert.equal(rollbackCalls.length, 1);
      assert.deepEqual(rollbackCalls[0].update.$set, {
        userId: null,
        statut: 'en_attente',
      });
    }
  );
});

test('deleteUser and permanentDeleteUser clear Personnel.userId and revert statut from actif to en_attente', async () => {
  const targetUserId = new mongoose.Types.ObjectId();
  const linkedPersonnelId = new mongoose.Types.ObjectId();
  const adminId = new mongoose.Types.ObjectId();

  // 1. Soft delete
  const softDeletePersonnelUpdates = [];
  await withStubs(
    [
      [User, 'findOne', () => createChainableQuery({
        _id: targetUserId,
        username: 'employee1',
        role: 'User',
        personnelId: linkedPersonnelId,
        isDeleted: false,
      })],
      [User, 'updateOne', async () => ({ modifiedCount: 1 })],
      [Personnel, 'updateMany', async (filter, update) => {
        softDeletePersonnelUpdates.push({ filter, update });
        return { modifiedCount: 1 };
      }],
    ],
    async () => {
      const req = {
        params: { id: String(targetUserId) },
        user: { _id: adminId, role: 'Admin' },
      };
      const res = createMockRes();
      let nextErr = null;

      await deleteUser(req, res, (err) => { nextErr = err; });
      assert.equal(nextErr, null);
      assert.equal(res.statusCode, 200);
      assert.equal(softDeletePersonnelUpdates.length, 2);
      assert.equal(softDeletePersonnelUpdates[0].filter.statut, 'actif');
      assert.deepEqual(softDeletePersonnelUpdates[0].update.$set, { userId: null, statut: 'en_attente' });
      assert.deepEqual(softDeletePersonnelUpdates[1].update.$set, { userId: null });
    }
  );

  // 2. Permanent delete
  const permDeletePersonnelUpdates = [];
  await withStubs(
    [
      [User, 'findById', () => createChainableQuery({
        _id: targetUserId,
        username: 'employee1',
        role: 'User',
        personnelId: linkedPersonnelId,
        isDeleted: true,
      })],
      [User, 'findByIdAndDelete', async () => ({ _id: targetUserId })],
      [Personnel, 'updateMany', async (filter, update) => {
        permDeletePersonnelUpdates.push({ filter, update });
        return { modifiedCount: 1 };
      }],
    ],
    async () => {
      const req = {
        params: { id: String(targetUserId) },
        user: { _id: adminId, role: 'Admin' },
      };
      const res = createMockRes();
      let nextErr = null;

      await permanentDeleteUser(req, res, (err) => { nextErr = err; });
      assert.equal(nextErr, null);
      assert.equal(res.statusCode, 200);
      assert.equal(permDeletePersonnelUpdates.length, 2);
      assert.deepEqual(permDeletePersonnelUpdates[0].update.$set, { userId: null, statut: 'en_attente' });
    }
  );
});

test('deactivateUser preserves User.personnelId <-> Personnel.userId and sets Personnel statut to inactif when deactivating', async () => {
  const targetUserId = new mongoose.Types.ObjectId();
  const linkedPersonnelId = new mongoose.Types.ObjectId();
  const adminId = new mongoose.Types.ObjectId();

  let capturedUserUpdate = null;
  const personnelUpdates = [];

  await withStubs(
    [
      [User, 'findOne', () => createChainableQuery({
        _id: targetUserId,
        username: 'employee2',
        role: 'User',
        personnelId: linkedPersonnelId,
        departments: [],
        isDeleted: false,
      })],
      [User, 'findByIdAndUpdate', (_id, update) => {
        capturedUserUpdate = update;
        return createChainableQuery({
          _id: targetUserId,
          username: 'employee2',
          isActive: false,
          personnelId: linkedPersonnelId,
        });
      }],
      [Personnel, 'updateMany', async (filter, update) => {
        personnelUpdates.push({ filter, update });
        return { modifiedCount: 1 };
      }],
    ],
    async () => {
      const req = {
        params: { id: String(targetUserId) },
        body: { isActive: false },
        user: { _id: adminId, role: 'Admin' },
      };
      const res = createMockRes();
      let nextErr = null;

      await deactivateUser(req, res, (err) => { nextErr = err; });
      assert.equal(nextErr, null);
      assert.equal(res.statusCode, 200);
      assert.deepEqual(capturedUserUpdate, { isActive: false });
      assert.equal(personnelUpdates.length, 1);
      assert.deepEqual(personnelUpdates[0].update.$set, { statut: 'inactif' });
    }
  );
});

test('Frontend components contain rollback, multi-page personnel fetch, and 8-char password alignment', () => {
  const root = path.resolve(__dirname, '../..');
  const createUserSrc = fs.readFileSync(path.join(root, 'src/pages/users/CreateUser.tsx'), 'utf8');
  const inlineModalSrc = fs.readFileSync(path.join(root, 'src/components/hr/InlineCreateUserModal.tsx'), 'utf8');
  const userFormSrc = fs.readFileSync(path.join(root, 'src/components/users/UserForm.tsx'), 'utf8');

  assert.match(createUserSrc, /deleteUser\(newUser\._id\)/);
  assert.match(createUserSrc, /permanentDeleteUser\(newUser\._id\)/);
  assert.match(createUserSrc, /throw linkError/);

  assert.match(inlineModalSrc, /deleteUser\(newUser\._id\)/);
  assert.match(inlineModalSrc, /permanentDeleteUser\(newUser\._id\)/);
  assert.match(inlineModalSrc, /throw linkError/);

  assert.match(userFormSrc, /totalPages\s*=\s*res\?\.pagination\?\.pages/);
  assert.doesNotMatch(userFormSrc, /6 أحرف على الأقل/);
  assert.match(userFormSrc, /8 أحرف على الأقل/);
});
