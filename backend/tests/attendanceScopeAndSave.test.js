'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

process.env.NODE_ENV = 'test';

const Department = require('../models/Department');
const OrganizationSettings = require('../models/OrganizationSettings');
const Personnel = require('../models/Personnel');
const Attendance = require('../models/Attendance');
const PresenceSettings = require('../models/PresenceSettings');
const LeaveReason = require('../models/LeaveReason');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

const { getDailyAttendance, saveBatchAttendance } = require('../controllers/attendanceController');
const { getMonthlyAttendanceSheet } = require('../controllers/hr/monthlyReportController');
const errorHandler = require('../middleware/error');

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

function makeRes() {
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

const RH_DEPT_ID = new mongoose.Types.ObjectId().toString();
const BD_DEPT_ID = new mongoose.Types.ObjectId().toString();
const BO_DEPT_ID = new mongoose.Types.ObjectId().toString();
const LABO_DEPT_ID = new mongoose.Types.ObjectId().toString();

const AGENT_RH_ID = new mongoose.Types.ObjectId().toString();
const AGENT_BD_ID = new mongoose.Types.ObjectId().toString();
const AGENT_BO_ID = new mongoose.Types.ObjectId().toString();
const AGENT_LABO_ID = new mongoose.Types.ObjectId().toString();
const AGENT_NULL_DEPT_ID = new mongoose.Types.ObjectId().toString();

const LINKED_USER_ID = new mongoose.Types.ObjectId().toString();
const ACTOR_ID = new mongoose.Types.ObjectId().toString();
const LEAVE_CONGE_ID = new mongoose.Types.ObjectId().toString();
const LEAVE_ABS_ID = new mongoose.Types.ObjectId().toString();

const ALL_DEPARTMENTS = [
  { _id: RH_DEPT_ID, name: 'RH', description: 'Ressources Humaines (RH)', isActive: true },
  { _id: BD_DEPT_ID, name: 'Bureau Directeur', description: 'Direction Générale (DG)', isActive: true },
  { _id: BO_DEPT_ID, name: "Bureau d'Ordre", description: "Bureau d'Ordre (BO)", isActive: true },
  { _id: LABO_DEPT_ID, name: 'LABO', description: 'Laboratoire', isActive: true },
];

const ALL_PERSONNEL = [
  {
    _id: AGENT_RH_ID,
    nom: 'Ben Ali',
    prenom: 'Sami',
    cin: '01010101',
    activeDepartment: { _id: RH_DEPT_ID, name: 'RH' },
    statut: 'Actif',
  },
  {
    _id: AGENT_BD_ID,
    nom: 'Directeur',
    prenom: 'Karim',
    cin: '02020202',
    activeDepartment: { _id: BD_DEPT_ID, name: 'Bureau Directeur' },
    statut: 'Actif',
  },
  {
    _id: AGENT_BO_ID,
    nom: 'Ordre',
    prenom: 'Nadia',
    cin: '03030303',
    activeDepartment: { _id: BO_DEPT_ID, name: "Bureau d'Ordre" },
    statut: 'Actif',
  },
  {
    _id: AGENT_LABO_ID,
    nom: 'Guesmi',
    prenom: 'Ali',
    cin: '04040404',
    activeDepartment: { _id: LABO_DEPT_ID, name: 'LABO' },
    statut: 'Actif',
  },
];

function extractDeptId(p) {
  if (!p?.activeDepartment) return null;
  return typeof p.activeDepartment === 'object' ? p.activeDepartment._id.toString() : p.activeDepartment.toString();
}

function matchesPersonnelFilter(p, filter) {
  if (!filter || !filter.activeDepartment) return true;
  const pDept = extractDeptId(p);
  if (typeof filter.activeDepartment === 'string') {
    return pDept === filter.activeDepartment;
  }
  if (filter.activeDepartment && Array.isArray(filter.activeDepartment.$in)) {
    return filter.activeDepartment.$in.includes(pDept);
  }
  return true;
}

test('Attendance Scope & Save Behavior', async (t) => {
  const originals = {
    orgFindOne: OrganizationSettings.findOne,
    deptFind: Department.find,
    deptFindById: Department.findById,
    persFind: Personnel.find,
    attFind: Attendance.find,
    attFindOneAndUpdate: Attendance.findOneAndUpdate,
    psFindOne: PresenceSettings.findOne,
    lrFind: LeaveReason.find,
    userFind: User.find,
    auditCreate: AuditLog.create,
  };

  let capturedUpserts = [];
  let simulateDuplicateOnce = false;

  t.beforeEach(() => {
    capturedUpserts = [];
    simulateDuplicateOnce = false;

    OrganizationSettings.findOne = () =>
      createChainableQuery({
        rhDepartmentId: RH_DEPT_ID,
        bureauDirecteurDepartmentId: BD_DEPT_ID,
        bureauOrdreDepartmentId: BO_DEPT_ID,
        nomAdministration: 'Admin Test',
      });

    Department.find = () => createChainableQuery(ALL_DEPARTMENTS);
    Department.findById = (id) =>
      createChainableQuery(ALL_DEPARTMENTS.find((d) => String(d._id) === String(id)) || null);

    Personnel.find = (filter) => {
      if (filter && filter._id && Array.isArray(filter._id.$in)) {
        const ids = filter._id.$in.map(String);
        const allPool = [
          ...ALL_PERSONNEL,
          {
            _id: AGENT_NULL_DEPT_ID,
            nom: 'SansDept',
            prenom: 'Amine',
            cin: '05050505',
            activeDepartment: null,
            departments: [],
            userId: LINKED_USER_ID,
            statut: 'Actif',
          },
        ];
        return createChainableQuery(allPool.filter((p) => ids.includes(String(p._id))));
      }
      return createChainableQuery(ALL_PERSONNEL.filter((p) => matchesPersonnelFilter(p, filter)));
    };

    Attendance.find = () => createChainableQuery([]);

    Attendance.findOneAndUpdate = async (filter, update, options) => {
      if (simulateDuplicateOnce && options.upsert) {
        simulateDuplicateOnce = false;
        const dupErr = new Error('E11000 duplicate key error collection');
        dupErr.code = 11000;
        throw dupErr;
      }
      capturedUpserts.push({ filter, update, options });
      return { _id: new mongoose.Types.ObjectId(), ...filter, ...update.$set };
    };

    PresenceSettings.findOne = () =>
      createChainableQuery({
        annee: 2026,
        autoriserSaisieFuture: true,
        autoriserSaisieRetroactive: true,
        motifsDeductibles: ['conge_annuel', 'absence_injustifiee'],
      });

    LeaveReason.find = () =>
      createChainableQuery([
        { _id: LEAVE_CONGE_ID, code: 'conge_annuel', labelAr: 'إجازة سنوية', impacteSolde: true, isActive: true },
        { _id: LEAVE_ABS_ID, code: 'absence_injustifiee', labelAr: 'غياب غير مبرر', impacteSolde: true, isActive: true },
      ]);

    User.find = () =>
      createChainableQuery([
        {
          _id: LINKED_USER_ID,
          personnelId: AGENT_NULL_DEPT_ID,
          role: 'Director',
          activeDepartment: null,
        },
      ]);

    AuditLog.create = async () => ({});
  });

  t.after(() => {
    OrganizationSettings.findOne = originals.orgFindOne;
    Department.find = originals.deptFind;
    Department.findById = originals.deptFindById;
    Personnel.find = originals.persFind;
    Attendance.find = originals.attFind;
    Attendance.findOneAndUpdate = originals.attFindOneAndUpdate;
    PresenceSettings.findOne = originals.psFindOne;
    LeaveReason.find = originals.lrFind;
    User.find = originals.userFind;
    AuditLog.create = originals.auditCreate;
  });

  await t.test('Admin and Director retain full multi-department visibility including LABO', async () => {
    for (const role of ['Admin', 'Director']) {
      const req = {
        user: { _id: ACTOR_ID, role, activeDepartment: RH_DEPT_ID },
        query: { date: '2026-04-10' },
      };
      const res = makeRes();
      await getDailyAttendance(req, res, (e) => { throw e; });
      assert.equal(res.statusCode, 200);
      assert.equal(res.body.count, 4);
      assert.ok(res.body.data.some((row) => row.personnel._id === AGENT_LABO_ID));
    }
  });

  await t.test('rh_manager (AdminDepartment of RH) only sees RH, BD, BO and NEVER LABO', async () => {
    const req = {
      user: { _id: ACTOR_ID, role: 'AdminDepartment', activeDepartment: RH_DEPT_ID },
      isAdminRH: true,
      query: { date: '2026-04-10' },
    };
    const res = makeRes();
    await getDailyAttendance(req, res, (e) => { throw e; });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.count, 3);
    const ids = res.body.data.map((r) => r.personnel._id);
    assert.ok(ids.includes(AGENT_RH_ID));
    assert.ok(ids.includes(AGENT_BD_ID));
    assert.ok(ids.includes(AGENT_BO_ID));
    assert.ok(!ids.includes(AGENT_LABO_ID));

    // Explicitly requesting LABO departmentId must be rejected with 403
    const forbiddenReq = {
      user: { _id: ACTOR_ID, role: 'AdminDepartment', activeDepartment: RH_DEPT_ID },
      isAdminRH: true,
      query: { date: '2026-04-10', departmentId: LABO_DEPT_ID },
    };
    const forbiddenRes = makeRes();
    await getDailyAttendance(forbiddenReq, forbiddenRes, (e) => { throw e; });
    assert.equal(forbiddenRes.statusCode, 403);
  });

  await t.test('Monthly report controller enforces same RH/BD/BO scope for rh_manager', async () => {
    const reqAll = {
      user: { _id: ACTOR_ID, role: 'AdminDepartment', activeDepartment: RH_DEPT_ID },
      query: { year: '2026', month: '4' },
    };
    const resAll = makeRes();
    await getMonthlyAttendanceSheet(reqAll, resAll, (e) => { throw e; });
    assert.equal(resAll.statusCode, 200);
    const ids = resAll.body.data.records.map((r) => r.personnel._id);
    assert.ok(!ids.includes(AGENT_LABO_ID));
    assert.equal(ids.length, 3);

    const reqLabo = {
      user: { _id: ACTOR_ID, role: 'AdminDepartment', activeDepartment: RH_DEPT_ID },
      query: { year: '2026', month: '4', departmentId: LABO_DEPT_ID },
    };
    const resLabo = makeRes();
    await getMonthlyAttendanceSheet(reqLabo, resLabo, (e) => { throw e; });
    assert.equal(resLabo.statusCode, 403);
  });

  await t.test('Standard AdminDepartment (LABO) only sees LABO and Bureau Directeur', async () => {
    const req = {
      user: { _id: ACTOR_ID, role: 'AdminDepartment', activeDepartment: LABO_DEPT_ID },
      query: { date: '2026-04-10' },
    };
    const res = makeRes();
    await getDailyAttendance(req, res, (e) => { throw e; });
    assert.equal(res.statusCode, 200);
    const ids = res.body.data.map((r) => r.personnel._id);
    assert.deepEqual(ids.sort(), [AGENT_BD_ID, AGENT_LABO_ID].sort());

    const forbiddenReq = {
      user: { _id: ACTOR_ID, role: 'AdminDepartment', activeDepartment: LABO_DEPT_ID },
      query: { date: '2026-04-10', departmentId: BO_DEPT_ID },
    };
    const forbiddenRes = makeRes();
    await getDailyAttendance(forbiddenReq, forbiddenRes, (e) => { throw e; });
    assert.equal(forbiddenRes.statusCode, 403);
  });

  await t.test('saveBatchAttendance saves all 4 pill statuses, notes on present/absent, null dept fallback, and retries E11000', async () => {
    simulateDuplicateOnce = true;

    const req = {
      user: { _id: ACTOR_ID, role: 'AdminDepartment', activeDepartment: RH_DEPT_ID },
      isAdminRH: true,
      ip: '127.0.0.1',
      body: {
        date: '2026-04-10',
        entries: [
          {
            personnelId: AGENT_RH_ID,
            statut: 'present',
            detailsMotif: { commentaire: 'Présent avec note' },
          },
          {
            personnelId: AGENT_BO_ID,
            statut: 'late',
            heureArrivee: '08:45',
            detailsMotif: { commentaire: 'Retard transport' },
          },
          {
            personnelId: AGENT_BD_ID,
            statut: 'absent',
            motif: 'absence_injustifiee',
            detailsMotif: { commentaire: 'Note absence' },
          },
          {
            personnelId: AGENT_NULL_DEPT_ID,
            statut: 'leave_mission',
            leaveType: 'conge_annuel',
            notes: 'Congé annuel validé',
          },
        ],
      },
    };

    const res = makeRes();
    await saveBatchAttendance(req, res, (e) => { throw e; });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.count, 4);
    assert.equal(capturedUpserts.length, 4);

    // 1. Present retains note
    assert.equal(capturedUpserts[0].update.$set.statut, 'present');
    assert.equal(capturedUpserts[0].update.$set.detailsMotif.commentaire, 'Présent avec note');

    // 2. Late maps to present + heureArrivee + note
    assert.equal(capturedUpserts[1].update.$set.statut, 'present');
    assert.equal(capturedUpserts[1].update.$set.heureArrivee, '08:45');
    assert.equal(capturedUpserts[1].update.$set.detailsMotif.commentaire, 'Retard transport');

    // 3. Absent retains motif & note
    assert.equal(capturedUpserts[2].update.$set.statut, 'absent');
    assert.equal(capturedUpserts[2].update.$set.motif, 'absence_injustifiee');
    assert.equal(capturedUpserts[2].update.$set.detailsMotif.commentaire, 'Note absence');

    // 4. Null activeDepartment resolved via linked Director user -> BD_DEPT_ID
    assert.equal(capturedUpserts[3].update.$set.departmentId, BD_DEPT_ID);
    assert.equal(capturedUpserts[3].update.$set.motif, 'conge_annuel');
    assert.equal(capturedUpserts[3].update.$set.detailsMotif.commentaire, 'Congé annuel validé');
  });

  await t.test('rh_manager cannot save attendance for LABO personnel (returns 403)', async () => {
    const req = {
      user: { _id: ACTOR_ID, role: 'AdminDepartment', activeDepartment: RH_DEPT_ID },
      isAdminRH: true,
      body: {
        date: '2026-04-10',
        entries: [{ personnelId: AGENT_LABO_ID, statut: 'present' }],
      },
    };
    const res = makeRes();
    await saveBatchAttendance(req, res, (e) => { throw e; });
    assert.equal(res.statusCode, 403);
    assert.equal(capturedUpserts.length, 0);
  });

  await t.test('errorHandler propagates message property for Mongoose ValidationError', () => {
    const validationErr = {
      name: 'ValidationError',
      errors: {
        departmentId: { message: 'Path `departmentId` is required.' },
      },
    };
    const res = makeRes();
    errorHandler(validationErr, {}, res, () => {});
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.success, false);
    assert.ok(res.body.message.includes('departmentId'));
    assert.equal(res.body.message, res.body.error);
  });
});
