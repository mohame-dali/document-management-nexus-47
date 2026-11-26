'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'user_personnel_sync_test_secret_2026';

const User = require('../models/User');
const Personnel = require('../models/Personnel');
const Department = require('../models/Department');
const OrganizationSettings = require('../models/OrganizationSettings');
const AuditLog = require('../models/AuditLog');

const {
  createPersonnel,
  updatePersonnel,
  linkUserToPersonnel,
} = require('../controllers/personnelController');
const {
  createUser,
  updateUser,
  deleteUser,
} = require('../controllers/users/managementControllers');
const { deactivateUser } = require('../controllers/users/accountControllers');
const {
  getTrash,
  restoreItem,
  permanentDelete,
  emptyTrash,
} = require('../controllers/trashController');
const { checkRHAccess } = require('../middleware/auth');

function createChainableQuery(resolvedValue) {
  const query = {
    populate() { return query; },
    select() { return query; },
    sort() { return query; },
    skip() { return query; },
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

test('createPersonnel seeds initial LABO affectation and updatePersonnel records LABO -> QT (CHEF QT) transition with User department replacement', async () => {
  const laboDeptId = new mongoose.Types.ObjectId();
  const qtDeptId = new mongoose.Types.ObjectId();
  const rhDeptId = new mongoose.Types.ObjectId();
  const personnelId = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();
  const rhManagerId = new mongoose.Types.ObjectId();

  let createdPayload = null;

  await withStubs(
    [
      [Department, 'findById', (id) => {
        if (String(id) === String(laboDeptId)) return createChainableQuery({ _id: laboDeptId, name: 'LABO' });
        if (String(id) === String(qtDeptId)) return createChainableQuery({ _id: qtDeptId, name: 'QT' });
        return createChainableQuery(null);
      }],
      [Personnel, 'findOne', () => createChainableQuery(null)],
      [User, 'findOne', () => createChainableQuery(null)],
      [Personnel, 'create', async (payload) => {
        createdPayload = payload;
        return { _id: personnelId, ...payload };
      }],
      [AuditLog, 'create', async () => ({ _id: new mongoose.Types.ObjectId() })],
    ],
    async () => {
      const req = {
        body: {
          nom: 'Benali',
          prenom: 'Karim',
          cin: 'AB123456',
          emailPersonnel: 'k.benali@org.local',
          activeDepartment: String(laboDeptId),
          fonction: 'Technicien LABO',
          dateEmbauche: '2024-01-15',
        },
        user: { _id: rhManagerId, role: 'AdminDepartment', activeDepartment: rhDeptId, username: 'rh_manager' },
        ip: '127.0.0.1',
      };
      const res = createMockRes();
      let nextErr = null;

      await createPersonnel(req, res, (err) => { nextErr = err; });

      assert.equal(nextErr, null);
      assert.equal(res.statusCode, 201);
      assert.equal(res.body.success, true);
      assert.equal(createdPayload.posteActuel, 'Technicien LABO');
      assert.equal(createdPayload.historiqueAffectations.length, 1);
      assert.equal(String(createdPayload.historiqueAffectations[0].departement), String(laboDeptId));
      assert.equal(createdPayload.historiqueAffectations[0].departementName, 'LABO');
      assert.equal(createdPayload.historiqueAffectations[0].poste, 'Technicien LABO');
      assert.equal(createdPayload.historiqueAffectations[0].dateFin, null);
      assert.equal(createdPayload.historiqueAffectations[0].isCurrent, true);
    }
  );

  // Now simulate transfer LABO -> QT as CHEF QT with linkedUser
  let personnelSaved = false;
  let userSaved = false;

  const personnelDoc = {
    _id: personnelId,
    nom: 'Benali',
    prenom: 'Karim',
    cin: 'AB123456',
    emailPersonnel: 'k.benali@org.local',
    activeDepartment: laboDeptId,
    departments: [laboDeptId],
    poste: 'Technicien LABO',
    posteActuel: 'Technicien LABO',
    statut: 'actif',
    userId,
    isDeleted: false,
    historiqueAffectations: [
      {
        poste: 'Technicien LABO',
        departement: laboDeptId,
        departementName: 'LABO',
        dateDebut: new Date('2024-01-15'),
        dateFin: null,
        reference: '',
        observations: '',
        isCurrent: true,
      },
    ],
    async save() {
      personnelSaved = true;
      return this;
    },
  };

  const linkedUserDoc = {
    _id: userId,
    username: 'kbenali',
    role: 'User',
    personnelId,
    activeDepartment: laboDeptId,
    departments: [laboDeptId],
    isDeleted: false,
    async save() {
      userSaved = true;
      return this;
    },
  };

  await withStubs(
    [
      [Personnel, 'findOne', (filter) => {
        if (filter && filter.emailPersonnel) return createChainableQuery(null);
        return createChainableQuery(personnelDoc);
      }],
      [Department, 'findById', (id) => {
        if (String(id) === String(qtDeptId)) return createChainableQuery({ _id: qtDeptId, name: 'QT' });
        return createChainableQuery(null);
      }],
      [User, 'findOne', () => createChainableQuery(linkedUserDoc)],
      [AuditLog, 'create', async () => ({ _id: new mongoose.Types.ObjectId() })],
    ],
    async () => {
      const req = {
        params: { id: String(personnelId) },
        body: {
          activeDepartment: String(qtDeptId),
          posteActuel: 'CHEF QT',
        },
        user: { _id: rhManagerId, role: 'AdminDepartment', activeDepartment: rhDeptId, username: 'rh_manager' },
        ip: '127.0.0.1',
      };
      const res = createMockRes();
      let nextErr = null;

      await updatePersonnel(req, res, (err) => { nextErr = err; });

      assert.equal(nextErr, null);
      assert.equal(res.statusCode, 200);
      assert.equal(personnelSaved, true);
      assert.equal(userSaved, true);

      // Career history check
      assert.equal(personnelDoc.historiqueAffectations.length, 2);
      const oldEntry = personnelDoc.historiqueAffectations[0];
      const newEntry = personnelDoc.historiqueAffectations[1];
      assert.equal(oldEntry.departementName, 'LABO');
      assert.ok(oldEntry.dateFin instanceof Date);
      assert.equal(oldEntry.isCurrent, false);

      assert.equal(String(newEntry.departement), String(qtDeptId));
      assert.equal(newEntry.departementName, 'QT');
      assert.equal(newEntry.poste, 'CHEF QT');
      assert.equal(newEntry.dateFin, null);
      assert.equal(newEntry.isCurrent, true);

      // Linked user departments replacement check (no stale LABO access)
      assert.equal(String(linkedUserDoc.activeDepartment), String(qtDeptId));
      const deptIds = linkedUserDoc.departments.map(d => String(d));
      assert.equal(deptIds.includes(String(qtDeptId)), true);
      assert.equal(deptIds.includes(String(laboDeptId)), false);
    }
  );
});

test('createPersonnel and updatePersonnel reject duplicate non-empty emailPersonnel with 409 Conflict', async () => {
  const existingId = new mongoose.Types.ObjectId();
  const targetId = new mongoose.Types.ObjectId();

  // Duplicate on createPersonnel
  await withStubs(
    [
      [Personnel, 'findOne', (filter) => {
        if (filter && filter.emailPersonnel === 'dup@org.local') {
          return createChainableQuery({ _id: existingId, emailPersonnel: 'dup@org.local' });
        }
        return createChainableQuery(null);
      }],
    ],
    async () => {
      const req = {
        body: { nom: 'Dup', prenom: 'Agent', emailPersonnel: '  DUP@org.local ' },
        user: { _id: new mongoose.Types.ObjectId(), role: 'Admin' },
      };
      const res = createMockRes();
      let nextErr = null;
      await createPersonnel(req, res, (err) => { nextErr = err; });

      assert.equal(nextErr, null);
      assert.equal(res.statusCode, 409);
      assert.equal(res.body.code, 'DUPLICATE_EMAIL');
    }
  );

  // Duplicate on updatePersonnel
  await withStubs(
    [
      [Personnel, 'findOne', (filter) => {
        if (filter && filter._id && filter._id.$ne) {
          return createChainableQuery({ _id: existingId, emailPersonnel: 'dup@org.local' });
        }
        return createChainableQuery({
          _id: targetId,
          nom: 'Target',
          prenom: 'Agent',
          userId: null,
          activeDepartment: null,
          isDeleted: false,
        });
      }],
    ],
    async () => {
      const req = {
        params: { id: String(targetId) },
        body: { emailPersonnel: 'dup@org.local' },
        user: { _id: new mongoose.Types.ObjectId(), role: 'Admin' },
      };
      const res = createMockRes();
      let nextErr = null;
      await updatePersonnel(req, res, (err) => { nextErr = err; });

      assert.equal(nextErr, null);
      assert.equal(res.statusCode, 409);
      assert.equal(res.body.code, 'DUPLICATE_EMAIL');
    }
  );
});

test('User deactivation/reactivation and updateUser sync Personnel.statut (actif <-> inactif) while preserving link and checking username !== cin', async () => {
  const userId = new mongoose.Types.ObjectId();
  const personnelId = new mongoose.Types.ObjectId();
  const rhDeptId = new mongoose.Types.ObjectId();
  const rhManagerId = new mongoose.Types.ObjectId();

  // 1. deactivateUser -> reactivateUser
  const personnelUpdates = [];
  await withStubs(
    [
      [OrganizationSettings, 'findOne', () => createChainableQuery({ rhDepartmentId: rhDeptId })],
      [User, 'findOne', () => createChainableQuery({
        _id: userId,
        username: 'emp_sync',
        role: 'User',
        personnelId,
        isActive: true,
        departments: [],
        isDeleted: false,
      })],
      [User, 'findByIdAndUpdate', (_id, update) => createChainableQuery({
        _id: userId,
        username: 'emp_sync',
        role: 'User',
        personnelId,
        isActive: update.isActive,
      })],
      [Personnel, 'updateMany', async (filter, update) => {
        personnelUpdates.push({ filter, update });
        return { modifiedCount: 1 };
      }],
    ],
    async () => {
      const resReactivate = createMockRes();
      let nextErr = null;
      await deactivateUser(
        {
          params: { id: String(userId) },
          body: { isActive: true },
          user: { _id: rhManagerId, role: 'AdminDepartment', activeDepartment: rhDeptId },
        },
        resReactivate,
        (err) => { nextErr = err; }
      );
      assert.equal(nextErr, null);
      assert.equal(resReactivate.statusCode, 200);
      assert.deepEqual(personnelUpdates[0].update.$set, { statut: 'actif' });
      assert.equal(String(resReactivate.body.data.personnelId), String(personnelId));
    }
  );

  // 2. updateUser toggling isActive: false sets Personnel.statut = 'inactif' & preserves link
  const linkedPersonnelDoc = {
    _id: personnelId,
    userId,
    statut: 'actif',
    activeDepartment: null,
    departments: [],
    historiqueAffectations: [],
    isDeleted: false,
    savedCount: 0,
    async save() {
      this.savedCount += 1;
      return this;
    },
  };

  const userDoc = {
    _id: userId,
    username: 'emp_sync',
    role: 'User',
    personnelId,
    activeDepartment: null,
    departments: [],
    isActive: true,
    isDeleted: false,
    async save() {
      return this;
    },
  };

  await withStubs(
    [
      [OrganizationSettings, 'findOne', () => createChainableQuery({ rhDepartmentId: rhDeptId })],
      [User, 'findOne', () => createChainableQuery(userDoc)],
      [User, 'findById', () => createChainableQuery(userDoc)],
      [Personnel, 'findOne', () => createChainableQuery(linkedPersonnelDoc)],
    ],
    async () => {
      const res = createMockRes();
      let nextErr = null;
      await updateUser(
        {
          params: { id: String(userId) },
          body: { isActive: false },
          user: { _id: rhManagerId, role: 'AdminDepartment', activeDepartment: rhDeptId, username: 'rh_manager' },
        },
        res,
        (err) => { nextErr = err; }
      );
      assert.equal(nextErr, null);
      assert.equal(res.statusCode, 200);
      assert.equal(linkedPersonnelDoc.statut, 'inactif');
      assert.equal(String(linkedPersonnelDoc.userId), String(userId));
      assert.equal(linkedPersonnelDoc.savedCount, 1);
    }
  );

  // 3. updateUser rejects username matching an active Personnel.cin with 400
  await withStubs(
    [
      [OrganizationSettings, 'findOne', () => createChainableQuery({ rhDepartmentId: rhDeptId })],
      [User, 'findOne', () => createChainableQuery({ ...userDoc, isActive: true })],
      [Personnel, 'findOne', (filter) => {
        if (filter && filter.cin === 'CD998877') {
          return createChainableQuery({ _id: new mongoose.Types.ObjectId(), cin: 'CD998877' });
        }
        return createChainableQuery(null);
      }],
    ],
    async () => {
      const res = createMockRes();
      let nextErr = null;
      await updateUser(
        {
          params: { id: String(userId) },
          body: { username: 'CD998877' },
          user: { _id: rhManagerId, role: 'AdminDepartment', activeDepartment: rhDeptId, username: 'rh_manager' },
        },
        res,
        (err) => { nextErr = err; }
      );
      assert.equal(nextErr, null);
      assert.equal(res.statusCode, 400);
      assert.match(res.body.message, /CIN/i);
    }
  );
});

test('RBAC boundaries: RH AdminDepartment manages employee accounts across departments, Admin cannot be linked/mutated as HR employee, and non-RH AdminDepartment is blocked from HR/Trash', async () => {
  const rhDeptId = new mongoose.Types.ObjectId();
  const qtDeptId = new mongoose.Types.ObjectId();
  const rhManagerUser = { _id: new mongoose.Types.ObjectId(), role: 'AdminDepartment', activeDepartment: rhDeptId, username: 'rh_mgr' };
  const nonRhManagerUser = { _id: new mongoose.Types.ObjectId(), role: 'AdminDepartment', activeDepartment: qtDeptId, username: 'qt_mgr' };
  const techAdminUser = { _id: new mongoose.Types.ObjectId(), role: 'Admin', username: 'sysadmin' };

  const adminTargetId = new mongoose.Types.ObjectId();
  const personnelId = new mongoose.Types.ObjectId();
  const employeeUserId = new mongoose.Types.ObjectId();

  // 1. Admin & RH manager are blocked (403) from linking an Admin account to a Personnel
  await withStubs(
    [
      [Personnel, 'findOne', () => createChainableQuery({ _id: personnelId, userId: null, isDeleted: false })],
      [User, 'findOne', () => createChainableQuery({ _id: adminTargetId, username: 'rootadmin', role: 'Admin', isDeleted: false })],
    ],
    async () => {
      for (const actor of [techAdminUser, rhManagerUser]) {
        const res = createMockRes();
        let nextErr = null;
        await linkUserToPersonnel(
          {
            params: { personnelId: String(personnelId) },
            body: { userId: String(adminTargetId) },
            user: actor,
          },
          res,
          (err) => { nextErr = err; }
        );
        assert.equal(nextErr, null);
        assert.equal(res.statusCode, 403);
        assert.equal(res.body.code, 'ADMIN_TECHNICAL_ONLY');
      }
    }
  );

  // 2. Admin cannot be created with personnelId (403), and RH manager cannot create an Admin user (403)
  await withStubs(
    [
      [OrganizationSettings, 'findOne', () => createChainableQuery({ rhDepartmentId: rhDeptId })],
    ],
    async () => {
      const resAdminLink = createMockRes();
      let err1 = null;
      await createUser(
        {
          body: { username: 'newadmin', password: 'Password1!', role: 'Admin', personnelId: String(personnelId) },
          user: techAdminUser,
        },
        resAdminLink,
        (e) => { err1 = e; }
      );
      assert.equal(err1, null);
      assert.equal(resAdminLink.statusCode, 403);
      assert.equal(resAdminLink.body.code, 'ADMIN_TECHNICAL_ONLY');

      let err2 = null;
      await createUser(
        {
          body: { username: 'rh_tries_admin', password: 'Password1!', role: 'Admin' },
          user: rhManagerUser,
        },
        createMockRes(),
        (e) => { err2 = e; }
      );
      assert.ok(err2);
      assert.equal(err2.statusCode, 403);
    }
  );

  // 3. RH manager CAN create an operational User in another department (QT) linked to Personnel
  await withStubs(
    [
      [OrganizationSettings, 'findOne', () => createChainableQuery({ rhDepartmentId: rhDeptId })],
      [Personnel, 'findOne', (filter) => {
        if (filter && filter.cin) return createChainableQuery(null);
        return createChainableQuery({
          _id: personnelId,
          userId: null,
          statut: 'en_attente',
          activeDepartment: qtDeptId,
          departments: [qtDeptId],
          posteActuel: 'CHEF QT',
          historiqueAffectations: [],
          isDeleted: false,
          async save() { return this; },
        });
      }],
      [Department, 'findById', () => createChainableQuery({ _id: qtDeptId, name: 'QT' })],
      [User, 'updateMany', async () => ({ modifiedCount: 0 })],
      [User, 'findOne', () => createChainableQuery(null)],
      [User, 'create', async (payload) => ({ _id: employeeUserId, ...payload })],
      [User, 'findById', () => createChainableQuery({ _id: employeeUserId, username: 'qt_chef', role: 'AdminDepartment', activeDepartment: qtDeptId })],
    ],
    async () => {
      const res = createMockRes();
      let nextErr = null;
      await createUser(
        {
          body: {
            username: 'qt_chef',
            password: 'Password1!',
            role: 'AdminDepartment',
            departments: [String(qtDeptId)],
            activeDepartment: String(qtDeptId),
            personnelId: String(personnelId),
          },
          user: rhManagerUser,
        },
        res,
        (e) => { nextErr = e; }
      );
      assert.equal(nextErr, null);
      assert.equal(res.statusCode, 201);
      assert.equal(res.body.success, true);
    }
  );

  // 4. RH manager is blocked (403) from updatePersonnel on Personnel linked to Admin, updateUser on Admin, deactivateUser on Admin, deleteUser on Admin
  await withStubs(
    [
      [OrganizationSettings, 'findOne', () => createChainableQuery({ rhDepartmentId: rhDeptId })],
      [Personnel, 'findOne', () => createChainableQuery({ _id: personnelId, userId: adminTargetId, isDeleted: false })],
      [User, 'findOne', () => createChainableQuery({ _id: adminTargetId, username: 'sysadmin', role: 'Admin', departments: [], isDeleted: false })],
    ],
    async () => {
      const resUpdatePers = createMockRes();
      let errPers = null;
      await updatePersonnel(
        { params: { id: String(personnelId) }, body: { posteActuel: 'X' }, user: rhManagerUser },
        resUpdatePers,
        (e) => { errPers = e; }
      );
      assert.equal(errPers, null);
      assert.equal(resUpdatePers.statusCode, 403);
      assert.equal(resUpdatePers.body.code, 'ADMIN_TECHNICAL_ONLY');

      let errUpdUser = null;
      await updateUser(
        { params: { id: String(adminTargetId) }, body: { username: 'renamed' }, user: rhManagerUser },
        createMockRes(),
        (e) => { errUpdUser = e; }
      );
      assert.equal(errUpdUser?.statusCode, 403);

      let errDeact = null;
      await deactivateUser(
        { params: { id: String(adminTargetId) }, body: { isActive: false }, user: rhManagerUser },
        createMockRes(),
        (e) => { errDeact = e; }
      );
      assert.equal(errDeact?.statusCode, 403);

      let errDel = null;
      await deleteUser(
        { params: { id: String(adminTargetId) }, user: rhManagerUser },
        createMockRes(),
        (e) => { errDel = e; }
      );
      assert.equal(errDel?.statusCode, 403);
    }
  );

  // 5. Non-RH AdminDepartment is blocked (403) on checkRHAccess, createUser, and all /api/trash Personnel operations, whereas RH manager can restore trashed Personnel across departments
  await withStubs(
    [
      [OrganizationSettings, 'findOne', () => createChainableQuery({ rhDepartmentId: rhDeptId })],
      [Personnel, 'findById', () => createChainableQuery({
        _id: personnelId,
        nom: 'Old',
        prenom: 'QT',
        activeDepartment: qtDeptId,
        userId: null,
        isDeleted: true,
        async save() { return this; },
      })],
    ],
    async () => {
      // checkRHAccess blocks non-RH AdminDepartment
      const rhGateRes = createMockRes();
      let rhGateCalledNext = false;
      await checkRHAccess({ user: nonRhManagerUser }, rhGateRes, () => { rhGateCalledNext = true; });
      assert.equal(rhGateCalledNext, false);
      assert.equal(rhGateRes.statusCode, 403);

      // createUser blocks non-RH AdminDepartment
      let nonRhCreateErr = null;
      await createUser(
        { body: { username: 'qt_user', password: 'Password1!', role: 'User' }, user: nonRhManagerUser },
        createMockRes(),
        (e) => { nonRhCreateErr = e; }
      );
      assert.equal(nonRhCreateErr?.statusCode, 403);

      // Trash get/restore/permanentDelete/empty blocks non-RH AdminDepartment for personnel
      let errTrashGet = null;
      await getTrash({ query: { type: 'personnel' }, user: nonRhManagerUser }, createMockRes(), (e) => { errTrashGet = e; });
      assert.equal(errTrashGet?.statusCode, 403);

      let errTrashRestore = null;
      await restoreItem({ params: { type: 'personnel', id: String(personnelId) }, user: nonRhManagerUser }, createMockRes(), (e) => { errTrashRestore = e; });
      assert.equal(errTrashRestore?.statusCode, 403);

      let errTrashPermDel = null;
      await permanentDelete({ params: { type: 'personnel', id: String(personnelId) }, user: nonRhManagerUser }, createMockRes(), (e) => { errTrashPermDel = e; });
      assert.equal(errTrashPermDel?.statusCode, 403);

      let errTrashEmpty = null;
      await emptyTrash({ query: { type: 'personnel' }, user: nonRhManagerUser }, createMockRes(), (e) => { errTrashEmpty = e; });
      assert.equal(errTrashEmpty?.statusCode, 403);

      // RH manager CAN restore a trashed Personnel belonging to another department (QT)
      const rhRestoreRes = createMockRes();
      let rhRestoreErr = null;
      await restoreItem(
        { params: { type: 'personnel', id: String(personnelId) }, user: rhManagerUser },
        rhRestoreRes,
        (e) => { rhRestoreErr = e; }
      );
      assert.equal(rhRestoreErr, null);
      assert.equal(rhRestoreRes.statusCode, 200);
      assert.equal(rhRestoreRes.body.success, true);
    }
  );
});
