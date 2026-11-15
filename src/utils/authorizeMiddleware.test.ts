import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { authorize } = require('../../backend/middleware/auth.js');

describe('SEC-01 : authorize() middleware security', () => {
  it('should block non-admin users attempting to bypass role check via /messages in query string', () => {
    const middleware = authorize('Admin');
    const req = {
      user: { role: 'User', username: 'testuser' },
      originalUrl: '/api/users/12345?bypass=/messages',
    };
    const res = {};
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeDefined();
    expect(err.statusCode).toBe(403);
    expect(err.message).toContain('not authorized');
  });

  it('should block non-admin users attempting to bypass role check via /messaging in query string', () => {
    const middleware = authorize('Admin');
    const req = {
      user: { role: 'User', username: 'testuser' },
      originalUrl: '/api/departments?ref=/messaging',
    };
    const res = {};
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeDefined();
    expect(err.statusCode).toBe(403);
  });

  it('should allow authorized roles (e.g. Admin)', () => {
    const middleware = authorize('Admin');
    const req = {
      user: { role: 'Admin', username: 'adminuser' },
      originalUrl: '/api/users/12345',
    };
    const res = {};
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(); // called with no error
  });

  it('should allow multi-role authorization (e.g. Director, Admin, AdminDepartment)', () => {
    const middleware = authorize('Director', 'Admin', 'AdminDepartment');
    const reqDept = {
      user: { role: 'AdminDepartment', username: 'depthead' },
      originalUrl: '/api/folders',
    };
    const nextDept = vi.fn();
    middleware(reqDept, {}, nextDept);
    expect(nextDept).toHaveBeenCalledWith();

    const reqUser = {
      user: { role: 'User', username: 'simpleuser' },
      originalUrl: '/api/folders',
    };
    const nextUser = vi.fn();
    middleware(reqUser, {}, nextUser);
    const err = nextUser.mock.calls[0][0];
    expect(err).toBeDefined();
    expect(err.statusCode).toBe(403);
  });
});
