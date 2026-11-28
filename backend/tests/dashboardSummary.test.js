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
const AttendanceDeclaration = require('../models/AttendanceDeclaration');
const Department = require('../models/Department');
const { getDashboardSummary, getDashboardStats } = require('../controllers/dashboardController');
const { authorizeExecutiveDashboard } = require('../middleware/auth');

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

test('getDashboardSummary returns Admin executive bottlenecks, system health, and critical audit items', async () => {
  const auditLogs = [
    {
      _id: new mongoose.Types.ObjectId(),
      action: 'user_create',
      entityType: 'User',
      entityId: 'u1',
      userId: { username: 'admin1', role: 'Admin' },
      createdAt: new Date('2026-04-01T10:00:00Z'),
    },
  ];

  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const mockFollowUpDocs = [
    {
      _id: new mongoose.Types.ObjectId(),
      serialNumber: 12,
      year: 2026,
      subject: 'Courrier urgent sans responsable',
      arrivalDate: yesterday,
      activity: 'Réponse urgente',
      dateActivity: yesterday,
      assignedTo: [{ id: { _id: new mongoose.Types.ObjectId(), name: 'Direction Générale' }, name: 'Direction Générale' }],
      responsibleUser: null,
    },
  ];

  await withStubs(
    [
      [
        IncomingDocument,
        'countDocuments',
        async (filter) => {
          if (filter.isIndexed) return 14;
          if (filter.isDeleted && filter.$or && filter.$or.some((c) => c.indexError)) return 2;
          if (filter.activity) return 3;
          if (filter.$and) return 5;
          return 0;
        },
      ],
      [
        IncomingDocument,
        'find',
        () => createChainableQuery(mockFollowUpDocs),
      ],
      [
        OutgoingDocument,
        'countDocuments',
        async (filter) => (filter.isIndexed ? 9 : 1),
      ],
      [SemanticIndex, 'countDocuments', async () => 85],
      [AttendanceDeclaration, 'countDocuments', async () => 4],
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
      assert.equal(res.body.data.executive.urgentOrOverdueCount, 3);
      assert.equal(res.body.data.executive.unassignedResponsibleCount, 5);
      assert.equal(res.body.data.executive.pendingHrRequestsCount, 4);
      assert.equal(res.body.data.executive.followUpDocuments.length, 1);
      assert.equal(res.body.data.executive.followUpDocuments[0].urgencyStatus, 'overdue');
      assert.equal(res.body.data.admin.system.semanticIndex.indexedDocs, 23);
      assert.equal(res.body.data.admin.pendingPersonnelCount, 4);
    }
  );
});

test('getDashboardSummary returns cross-department Director and Directeur executive summary', async () => {
  const today = new Date();
  const mockFollowUpDocs = [
    {
      _id: new mongoose.Types.ObjectId(),
      serialNumber: 44,
      year: 2026,
      subject: 'Demande en attente d’affectation',
      arrivalDate: today,
      activity: '',
      dateActivity: null,
      assignedTo: [{ id: { _id: new mongoose.Types.ObjectId(), name: 'Finances' }, name: 'Finances' }],
      responsibleUser: null,
    },
    {
      _id: new mongoose.Types.ObjectId(),
      serialNumber: 45,
      year: 2026,
      subject: 'Dossier urgent à traiter',
      arrivalDate: today,
      activity: 'Suivi urgent',
      dateActivity: today,
      assignedTo: [{ id: { _id: new mongoose.Types.ObjectId(), name: 'RH' }, name: 'RH' }],
      responsibleUser: new mongoose.Types.ObjectId(),
    },
  ];

  await withStubs(
    [
      [
        IncomingDocument,
        'countDocuments',
        async (filter) => {
          if (filter.year) return 120;
          if (filter.activity && filter.$or && !filter.$and) return 8;
          if (filter.$and) return 6;
          return 25;
        },
      ],
      [IncomingDocument, 'find', () => createChainableQuery(mockFollowUpDocs)],
      [OutgoingDocument, 'countDocuments', async () => 74],
      [AttendanceDeclaration, 'countDocuments', async () => 7],
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
      assert.equal(res.body.data.executive.urgentOrOverdueCount, 8);
      assert.equal(res.body.data.executive.unassignedResponsibleCount, 6);
      assert.equal(res.body.data.executive.pendingHrRequestsCount, 7);
      // Urgent item is prioritized before unassigned-only item
      assert.equal(res.body.data.executive.followUpDocuments[0].serialNumber, 45);
      assert.equal(res.body.data.executive.followUpDocuments[0].urgencyStatus, 'urgent');
      assert.equal(res.body.data.executive.followUpDocuments[1].serialNumber, 44);
      assert.equal(res.body.data.executive.followUpDocuments[1].urgencyStatus, 'unassigned');
      assert.deepEqual(res.body.data.director, {
        incomingTotal: 120,
        outgoingTotal: 74,
        unansweredIncoming: 25,
        unansweredUrgentIncoming: 8,
        activeDepartments: 9,
      });

      // Also verify case-insensitive Directeur position access
      const directeurReq = {
        user: { _id: new mongoose.Types.ObjectId(), role: 'AdminDepartment', position: 'Directeur' },
        query: { year: '2026' },
      };
      const directeurRes = createMockRes();
      await getDashboardSummary(directeurReq, directeurRes, (e) => {
        err = e;
      });
      assert.equal(err, null);
      assert.equal(directeurRes.statusCode, 200);
      assert.ok(directeurRes.body.data.executive);
    }
  );
});

test('dashboard summary, stats, and middleware return 403 Forbidden for AdminDepartment, AdminTuningDesk (bo), and User roles', async () => {
  const nonExecutiveUsers = [
    { _id: new mongoose.Types.ObjectId(), role: 'AdminDepartment', activeDepartment: { name: 'RH' } },
    { _id: new mongoose.Types.ObjectId(), role: 'AdminTuningDesk', activeDepartment: null },
    { _id: new mongoose.Types.ObjectId(), role: 'User', activeDepartment: { name: 'Finances' } },
  ];

  for (const user of nonExecutiveUsers) {
    const summaryRes = createMockRes();
    await getDashboardSummary({ user, query: { year: '2026' } }, summaryRes, () => {});
    assert.equal(summaryRes.statusCode, 403);
    assert.equal(summaryRes.body.success, false);

    const statsRes = createMockRes();
    await getDashboardStats({ user, query: { year: '2026' } }, statsRes, () => {});
    assert.equal(statsRes.statusCode, 403);
    assert.equal(statsRes.body.success, false);

    let nextCalled = false;
    const mwRes = createMockRes();
    authorizeExecutiveDashboard({ user }, mwRes, () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, false);
    assert.equal(mwRes.statusCode, 403);
  }
});
