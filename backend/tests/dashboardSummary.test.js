'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'dashboard_summary_test_secret_2026';

const IncomingDocument = require('../models/IncomingDocument');
const OutgoingDocument = require('../models/OutgoingDocument');
const Personnel = require('../models/Personnel');
const AuditLog = require('../models/AuditLog');
const SemanticIndex = require('../models/SemanticIndex');
const OrganizationSettings = require('../models/OrganizationSettings');
const Attendance = require('../models/Attendance');
const AttendanceDeclaration = require('../models/AttendanceDeclaration');
const Department = require('../models/Department');
const Message = require('../models/Message');
const { getDashboardSummary } = require('../controllers/dashboardController');

function createChainableQuery(resolvedValue) {
  const query = {
    populate() {
      return query;
    },
    select() {
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

test('getDashboardSummary returns Admin system health, pending personnel, and up to 5 critical audit items', async () => {
  const rhDeptId = new mongoose.Types.ObjectId();
  const auditLogs = [
    {
      _id: new mongoose.Types.ObjectId(),
      action: 'user_create',
      entityType: 'User',
      entityId: 'u1',
      userId: { username: 'admin1', role: 'Admin' },
      createdAt: new Date('2026-04-01T10:00:00Z'),
    },
    {
      _id: new mongoose.Types.ObjectId(),
      action: 'user_delete',
      entityType: 'User',
      entityId: 'u2',
      userDetails: { username: 'admin1', role: 'Admin' },
      createdAt: new Date('2026-04-01T09:00:00Z'),
    },
  ];

  let incomingCountIdx = 0;
  let outgoingCountIdx = 0;

  await withStubs(
    [
      [OrganizationSettings, 'findOne', () => createChainableQuery({ rhDepartmentId: rhDeptId })],
      [
        IncomingDocument,
        'countDocuments',
        async () => {
          incomingCountIdx += 1;
          return incomingCountIdx === 1 ? 14 : 2;
        },
      ],
      [
        OutgoingDocument,
        'countDocuments',
        async () => {
          outgoingCountIdx += 1;
          return outgoingCountIdx === 1 ? 9 : 1;
        },
      ],
      [SemanticIndex, 'countDocuments', async () => 85],
      [
        Personnel,
        'countDocuments',
        async (filter) => {
          assert.equal(filter.statut, 'en_attente');
          assert.equal(filter.userId, null);
          return 4;
        },
      ],
      [AuditLog, 'find', () => createChainableQuery(auditLogs)],
    ],
    async () => {
      const req = {
        user: { _id: new mongoose.Types.ObjectId(), role: 'Admin', activeDepartment: null },
        query: { year: '2026' },
      };
      const res = createMockRes();
      let err = null;
      await getDashboardSummary(req, res, (e) => {
        err = e;
      });

      assert.equal(err, null);
      assert.equal(res.statusCode, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.role, 'Admin');
      assert.equal(res.body.data.isRHAdmin, false);
      assert.equal(res.body.data.admin.system.semanticIndex.indexedDocs, 23);
      assert.equal(res.body.data.admin.system.semanticIndex.failedDocs, 3);
      assert.equal(res.body.data.admin.system.semanticIndex.totalVectors, 85);
      assert.equal(res.body.data.admin.pendingPersonnelCount, 4);
      assert.equal(res.body.data.admin.recentCriticalAudit.length, 2);
      assert.equal(res.body.data.admin.recentCriticalAudit[0].username, 'admin1');
    }
  );
});

test('getDashboardSummary returns Bureau dOrdre (AdminTuningDesk) today mail pulse and OCR jobs', async () => {
  const capturedIncomingFilters = [];
  const capturedOutgoingFilters = [];

  await withStubs(
    [
      [OrganizationSettings, 'findOne', () => createChainableQuery(null)],
      [
        IncomingDocument,
        'countDocuments',
        async (filter) => {
          capturedIncomingFilters.push(filter);
          if (filter.createdAt) return 7;
          if (filter.$or) return 3;
          if (filter.ocrStatus) return 2;
          return 0;
        },
      ],
      [
        OutgoingDocument,
        'countDocuments',
        async (filter) => {
          capturedOutgoingFilters.push(filter);
          if (filter.createdAt) return 5;
          if (filter.ocrStatus) return 1;
          return 0;
        },
      ],
    ],
    async () => {
      const req = {
        user: { _id: new mongoose.Types.ObjectId(), role: 'AdminTuningDesk', activeDepartment: null },
        query: { year: '2026' },
      };
      const res = createMockRes();
      let err = null;
      await getDashboardSummary(req, res, (e) => {
        err = e;
      });

      assert.equal(err, null);
      assert.equal(res.statusCode, 200);
      assert.deepEqual(res.body.data.bureauOrdre, {
        todayIncoming: 7,
        todayOutgoing: 5,
        unroutedIncoming: 3,
        activeOcrJobs: 3,
      });
      assert.equal(capturedIncomingFilters.length, 3);
      assert.equal(capturedOutgoingFilters.length, 2);
    }
  );
});

test('getDashboardSummary detects HR Admin when AdminDepartment matches rhDepartmentId', async () => {
  const rhDeptId = new mongoose.Types.ObjectId();

  await withStubs(
    [
      [OrganizationSettings, 'findOne', () => createChainableQuery({ rhDepartmentId: rhDeptId })],
      [
        Personnel,
        'countDocuments',
        async (filter) => (filter.statut === 'actif' ? 42 : 6),
      ],
      [
        Attendance,
        'countDocuments',
        async (filter) => (filter.statut === 'present' ? 38 : 4),
      ],
      [AttendanceDeclaration, 'countDocuments', async () => 5],
    ],
    async () => {
      const req = {
        user: {
          _id: new mongoose.Types.ObjectId(),
          role: 'AdminDepartment',
          activeDepartment: { _id: rhDeptId, name: 'Ressources Humaines' },
        },
        query: { year: '2026' },
      };
      const res = createMockRes();
      let err = null;
      await getDashboardSummary(req, res, (e) => {
        err = e;
      });

      assert.equal(err, null);
      assert.equal(res.statusCode, 200);
      assert.equal(res.body.data.isRHAdmin, true);
      assert.deepEqual(res.body.data.hr, {
        activePersonnel: 42,
        pendingAccounts: 6,
        todayAttendance: { present: 38, absent: 4 },
        pendingDeclarations: 5,
      });
    }
  );
});

test('getDashboardSummary returns cross-department Director summary', async () => {
  await withStubs(
    [
      [OrganizationSettings, 'findOne', () => createChainableQuery(null)],
      [
        IncomingDocument,
        'countDocuments',
        async (filter) => {
          if (filter.year) return 120;
          if (filter.activity) return 8;
          return 25;
        },
      ],
      [OutgoingDocument, 'countDocuments', async () => 74],
      [Department, 'countDocuments', async () => 9],
    ],
    async () => {
      const req = {
        user: { _id: new mongoose.Types.ObjectId(), role: 'Director', activeDepartment: null },
        query: { year: '2026' },
      };
      const res = createMockRes();
      let err = null;
      await getDashboardSummary(req, res, (e) => {
        err = e;
      });

      assert.equal(err, null);
      assert.equal(res.statusCode, 200);
      assert.deepEqual(res.body.data.director, {
        incomingTotal: 120,
        outgoingTotal: 74,
        unansweredIncoming: 25,
        unansweredUrgentIncoming: 8,
        activeDepartments: 9,
      });
    }
  );
});

test('getDashboardSummary strictly scopes non-RH AdminDepartment and User to activeDepartment and recipient inbox', async () => {
  const rhDeptId = new mongoose.Types.ObjectId();
  const financeDeptId = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();
  const personnelId = new mongoose.Types.ObjectId();

  const capturedIncomingFilters = [];
  const capturedInboxFilters = [];

  const mockMessages = [
    {
      _id: new mongoose.Types.ObjectId(),
      subject: 'Note budgétaire urgente',
      priority: 'urgent',
      sender: { username: 'director', role: 'Director' },
      recipients: [{ user: userId, read: false }],
      createdAt: new Date('2026-04-02T08:30:00Z'),
    },
  ];

  await withStubs(
    [
      [OrganizationSettings, 'findOne', () => createChainableQuery({ rhDepartmentId: rhDeptId })],
      [
        IncomingDocument,
        'countDocuments',
        async (filter) => {
          capturedIncomingFilters.push(filter);
          return filter.activity ? 2 : 11;
        },
      ],
      [
        Message,
        'countDocuments',
        async (filter) => {
          capturedInboxFilters.push(filter);
          return 3;
        },
      ],
      [
        Message,
        'find',
        (filter) => {
          capturedInboxFilters.push(filter);
          return createChainableQuery(mockMessages);
        },
      ],
    ],
    async () => {
      const req = {
        user: {
          _id: userId,
          role: 'AdminDepartment',
          activeDepartment: { _id: financeDeptId, name: 'Finances' },
          personnelId,
        },
        query: { year: '2026' },
      };
      const res = createMockRes();
      let err = null;
      await getDashboardSummary(req, res, (e) => {
        err = e;
      });

      assert.equal(err, null);
      assert.equal(res.statusCode, 200);
      assert.equal(res.body.data.isRHAdmin, false);
      assert.equal(capturedIncomingFilters.length, 2);
      assert.equal(capturedIncomingFilters[0]['assignedTo.id'], String(financeDeptId));
      assert.equal(capturedIncomingFilters[1]['assignedTo.id'], String(financeDeptId));
      assert.equal(String(capturedInboxFilters[0].recipients.$elemMatch.user), String(userId));
      assert.equal(String(capturedInboxFilters[1]['recipients.user']), String(userId));
      assert.equal(res.body.data.department.departmentName, 'Finances');
      assert.equal(res.body.data.department.unansweredIncoming, 11);
      assert.equal(res.body.data.department.urgentIncoming, 2);
      assert.equal(res.body.data.department.unreadMessagesCount, 3);
      assert.equal(res.body.data.department.myPersonnelId, String(personnelId));
      assert.equal(res.body.data.department.recentMessages[0].read, false);
      assert.equal(res.body.data.department.recentMessages[0].senderUsername, 'director');
    }
  );
});
