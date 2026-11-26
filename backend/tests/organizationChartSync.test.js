'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const mongoose = require('mongoose');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'org_chart_sync_test_secret_2026';

const Department = require('../models/Department');
const Personnel = require('../models/Personnel');
const OrganizationSettings = require('../models/OrganizationSettings');
const User = require('../models/User');
const { getOrganizationChart } = require('../controllers/organizationChartController');

function createChainableQuery(resolvedValue, capture = null) {
  const query = {
    populate() {
      return query;
    },
    select(fields) {
      if (capture) capture.selectFields = fields;
      return query;
    },
    sort() {
      return query;
    },
    limit() {
      return query;
    },
    lean() {
      return Promise.resolve(resolvedValue);
    },
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
  return {
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
}

function containsKeyOrValue(obj, forbiddenKey, forbiddenValues) {
  if (obj === null || obj === undefined) return false;
  if (typeof obj === 'string') {
    return forbiddenValues.some((v) => obj.includes(v));
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

test('Organization Chart immediately reflects deleted AdminTuningDesk (BO) replacement and linked Personnel with null activeDepartment', async () => {
  const boDeptId = new mongoose.Types.ObjectId();
  const rhDeptId = new mongoose.Types.ObjectId();
  const serviceDeptId = new mongoose.Types.ObjectId();

  const oldBoUserId = new mongoose.Types.ObjectId();
  const newBoUserId = new mongoose.Types.ObjectId();
  const linkedBoUserId = new mongoose.Types.ObjectId();
  const linkedBoPersonnelId = new mongoose.Types.ObjectId();

  let usersStore = [
    {
      _id: oldBoUserId,
      username: 'bo_ancien',
      role: 'AdminTuningDesk',
      photo: '',
      email: 'bo.old@example.tn',
      departments: [],
      activeDepartment: null,
      personnelId: null,
      isActive: true,
      isDeleted: false,
    },
  ];

  let personnelStore = [];
  let lastUserFilter = null;

  const filterUsers = (filter = {}) => {
    lastUserFilter = filter;
    return usersStore.filter((u) => {
      if (filter?.isDeleted?.$ne === true && u.isDeleted === true) return false;
      if (filter?.isActive === true && u.isActive !== true) return false;
      return true;
    });
  };

  await withStubs(
    [
      [
        OrganizationSettings,
        'findOne',
        () =>
          createChainableQuery({
            nomAdministration: 'Administration Centrale',
            bureauDirecteurDepartmentId: null,
            bureauOrdreDepartmentId: boDeptId,
            rhDepartmentId: rhDeptId,
          }),
      ],
      [
        Department,
        'find',
        () =>
          createChainableQuery([
            { _id: boDeptId, name: "Bureau d'Ordre", isActive: true },
            { _id: rhDeptId, name: 'Ressources Humaines', isActive: true },
            { _id: serviceDeptId, name: 'Service Informatique', isActive: true },
          ]),
      ],
      [Personnel, 'find', () => createChainableQuery(personnelStore)],
      [User, 'find', (filter) => createChainableQuery(filterUsers(filter))],
    ],
    async () => {
      // Step 1: Initial chart shows bo_ancien under bureau_ordre
      const res1 = createMockRes();
      let err1 = null;
      await getOrganizationChart({}, res1, (e) => {
        err1 = e;
      });
      assert.equal(err1, null);
      assert.equal(res1.statusCode, 200);
      assert.deepEqual(lastUserFilter, { isDeleted: { $ne: true }, isActive: true });

      const boNode1 = res1.body.data.regalienDepartments.find((d) => d.unitType === 'bureau_ordre');
      assert.ok(boNode1, 'bureau_ordre node must exist');
      assert.equal(boNode1.totalPersonnel, 1);
      assert.equal(boNode1.personnel[0].nom, 'bo_ancien');

      // Step 2: Soft-delete bo_ancien, create standalone bo_nouveau + linked bo_personnel (with Personnel.activeDepartment in another dept)
      usersStore[0].isDeleted = true;
      const linkedPersonnelObj = {
        _id: linkedBoPersonnelId,
        nom: 'Trabelsi',
        prenom: 'Sami',
        poste: "Agent Bureau d'Ordre",
        photo: '',
        emailPersonnel: 'sami.trabelsi@example.tn',
        activeDepartment: { _id: serviceDeptId, name: 'Service Informatique' },
        departments: [serviceDeptId],
        userId: { _id: linkedBoUserId, role: 'AdminTuningDesk', isActive: true, isDeleted: false },
        statut: 'actif',
        isDeleted: false,
      };
      personnelStore = [linkedPersonnelObj];

      usersStore.push(
        {
          _id: newBoUserId,
          username: 'bo_nouveau',
          role: 'AdminTuningDesk',
          photo: '',
          email: 'bo.new@example.tn',
          departments: [],
          activeDepartment: null,
          personnelId: null,
          isActive: true,
          isDeleted: false,
        },
        {
          _id: linkedBoUserId,
          username: 'sami.bo',
          role: 'AdminTuningDesk',
          photo: '',
          email: 'sami.trabelsi@example.tn',
          departments: [],
          activeDepartment: null,
          personnelId: linkedPersonnelObj,
          isActive: true,
          isDeleted: false,
        }
      );

      const res2 = createMockRes();
      let err2 = null;
      await getOrganizationChart({}, res2, (e) => {
        err2 = e;
      });
      assert.equal(err2, null);
      assert.equal(res2.statusCode, 200);

      const boNode2 = res2.body.data.regalienDepartments.find((d) => d.unitType === 'bureau_ordre');
      const serviceNode2 = res2.body.data.operationalDepartments.find(
        (d) => String(d._id) === String(serviceDeptId)
      );

      assert.equal(boNode2.totalPersonnel, 2);
      const boNames = boNode2.personnel.map((p) => p.nom);
      assert.ok(!boNames.includes('bo_ancien'), 'Deleted bo_ancien must disappear immediately');
      assert.ok(boNames.includes('bo_nouveau'), 'New standalone AdminTuningDesk must appear in bureau_ordre');
      assert.ok(boNames.includes('Trabelsi'), 'Linked AdminTuningDesk personnel must appear in bureau_ordre');
      const boNouveauNode = boNode2.personnel.find((p) => p.nom === 'bo_nouveau');
      const boTrabelsiNode = boNode2.personnel.find((p) => p.nom === 'Trabelsi');
      assert.equal(boNouveauNode.username, 'bo_nouveau');
      assert.equal(boTrabelsiNode.username, 'sami.bo');
      assert.equal(
        serviceNode2.totalPersonnel,
        0,
        'Linked AdminTuningDesk personnel must not be duplicated in other departments'
      );
    }
  );
});

test('Organization Chart excludes inactive users, resolves live Director, and never selects or leaks cin', async () => {
  const boDeptId = new mongoose.Types.ObjectId();
  const serviceDeptId = new mongoose.Types.ObjectId();
  const directorUserId = new mongoose.Types.ObjectId();
  const directorPersonnelId = new mongoose.Types.ObjectId();
  const deptAdminUserId = new mongoose.Types.ObjectId();
  const inactiveUserId = new mongoose.Types.ObjectId();
  const inactivePersonnelId = new mongoose.Types.ObjectId();
  const activePersonnelId = new mongoose.Types.ObjectId();

  const personnelCapture = { selectFields: '' };
  const userCapture = { selectFields: '' };

  const directorPersonnel = {
    _id: directorPersonnelId,
    nom: 'Mansouri',
    prenom: 'Leila',
    poste: 'Directrice Générale',
    photo: '',
    cin: '09876543',
    emailPersonnel: 'leila@example.tn',
    activeDepartment: null,
    departments: [],
    statut: 'actif',
    isDeleted: false,
  };

  const personnelRows = [
    {
      ...directorPersonnel,
      userId: { _id: directorUserId, role: 'Director', isActive: true, isDeleted: false },
    },
    {
      _id: inactivePersonnelId,
      nom: 'Inactive',
      prenom: 'Employee',
      poste: 'Technicien',
      photo: '',
      cin: '11223344',
      emailPersonnel: 'inactive@example.tn',
      activeDepartment: { _id: serviceDeptId, name: 'Service Technique' },
      departments: [serviceDeptId],
      userId: { _id: inactiveUserId, role: 'User', isActive: false, isDeleted: false },
      statut: 'actif',
      isDeleted: false,
    },
    {
      _id: activePersonnelId,
      nom: 'Khelifi',
      prenom: 'Nabil',
      poste: 'Ingénieur',
      photo: '',
      cin: '55667788',
      emailPersonnel: 'nabil@example.tn',
      activeDepartment: { _id: serviceDeptId, name: 'Service Technique' },
      departments: [serviceDeptId],
      userId: null,
      statut: 'actif',
      isDeleted: false,
    },
  ];

  const activeUsers = [
    {
      _id: directorUserId,
      username: 'l.mansouri',
      role: 'Director',
      photo: '',
      email: 'leila@example.tn',
      departments: [],
      activeDepartment: null,
      personnelId: directorPersonnel,
    },
    {
      _id: deptAdminUserId,
      username: 'chef.tech',
      role: 'AdminDepartment',
      photo: '',
      email: 'chef.tech@example.tn',
      departments: [serviceDeptId],
      activeDepartment: serviceDeptId,
      personnelId: null,
    },
  ];

  await withStubs(
    [
      [
        OrganizationSettings,
        'findOne',
        () =>
          createChainableQuery({
            nomAdministration: 'Administration Test',
            bureauDirecteurDepartmentId: null,
            bureauOrdreDepartmentId: boDeptId,
            rhDepartmentId: null,
          }),
      ],
      [
        Department,
        'find',
        () =>
          createChainableQuery([
            { _id: boDeptId, name: "Bureau d'Ordre", isActive: true },
            { _id: serviceDeptId, name: 'Service Technique', isActive: true },
          ]),
      ],
      [Personnel, 'find', () => createChainableQuery(personnelRows, personnelCapture)],
      [User, 'find', () => createChainableQuery(activeUsers, userCapture)],
    ],
    async () => {
      const res = createMockRes();
      let err = null;
      await getOrganizationChart({}, res, (e) => {
        err = e;
      });

      assert.equal(err, null);
      assert.equal(res.statusCode, 200);

      assert.doesNotMatch(personnelCapture.selectFields || '', /\bcin\b/);
      assert.doesNotMatch(userCapture.selectFields || '', /\bcin\b/);

      assert.equal(res.body.data.director.nom, 'Mansouri');
      assert.equal(res.body.data.director.username, 'l.mansouri');
      assert.equal(
        containsKeyOrValue(res.body, 'cin', ['09876543', '11223344', '55667788']),
        false,
        'Organization chart response must never contain cin key or values'
      );

      const serviceNode = res.body.data.operationalDepartments.find(
        (d) => String(d._id) === String(serviceDeptId)
      );
      const memberNames = serviceNode.personnel.map((p) => p.nom);
      assert.ok(memberNames.includes('Khelifi'));
      assert.ok(memberNames.includes('chef.tech'));
      assert.equal(serviceNode.personnel.find((p) => p.nom === 'Khelifi')?.username, null);
      assert.equal(serviceNode.personnel.find((p) => p.nom === 'chef.tech')?.username, 'chef.tech');
      assert.ok(!memberNames.includes('Inactive'), 'Personnel linked to inactive user must be excluded');
      assert.ok(!memberNames.includes('Mansouri'), 'Director must not be duplicated inside operational departments');
    }
  );
});

test('Frontend user mutations invalidate organization-chart query cache and service types exclude cin', () => {
  const root = path.resolve(__dirname, '../..');
  const createUserSrc = fs.readFileSync(path.join(root, 'src/pages/users/CreateUser.tsx'), 'utf8');
  const editUserSrc = fs.readFileSync(path.join(root, 'src/pages/users/EditUser.tsx'), 'utf8');
  const usersPageSrc = fs.readFileSync(path.join(root, 'src/pages/UsersPage.tsx'), 'utf8');
  const inlineModalSrc = fs.readFileSync(
    path.join(root, 'src/components/hr/InlineCreateUserModal.tsx'),
    'utf8'
  );
  const chartServiceSrc = fs.readFileSync(
    path.join(root, 'src/services/organizationChartService.ts'),
    'utf8'
  );

  const countInvalidations = (src) =>
    (src.match(/invalidateQueries\(\s*\{\s*queryKey:\s*\[\s*'organization-chart'\s*\]\s*\}\s*\)/g) || [])
      .length;

  assert.equal(countInvalidations(createUserSrc), 1, 'CreateUser must invalidate organization-chart');
  assert.equal(
    countInvalidations(editUserSrc),
    2,
    'EditUser must invalidate organization-chart on update and photo upload'
  );
  assert.equal(
    countInvalidations(usersPageSrc),
    4,
    'UsersPage must invalidate organization-chart on delete, restore, permanent delete, and toggle activation'
  );
  assert.equal(
    countInvalidations(inlineModalSrc),
    1,
    'InlineCreateUserModal must invalidate organization-chart'
  );
  assert.doesNotMatch(chartServiceSrc, /\bcin\??:/, 'organizationChartService types must not expose cin');
});
