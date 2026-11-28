import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const mongoose = require('mongoose');
const User = require('../../backend/models/User.js');
const OrganizationSettings = require('../../backend/models/OrganizationSettings.js');
const loginController = require('../../backend/controllers/auth/loginController.js');

const createMockRes = () => {
  const res: Record<string, unknown> = {
    statusCode: 200,
    body: null,
    cookies: [] as Array<{ name: string; value: string }>,
  };
  res.status = vi.fn((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.cookie = vi.fn((name: string, value: string) => {
    (res.cookies as Array<{ name: string; value: string }>).push({ name, value });
    return res;
  });
  res.json = vi.fn((payload: unknown) => {
    res.body = payload;
    return res;
  });
  return res as {
    statusCode: number;
    body: Record<string, unknown>;
    status: ReturnType<typeof vi.fn>;
    cookie: ReturnType<typeof vi.fn>;
    json: ReturnType<typeof vi.fn>;
  };
};

describe('Configurable Max Failed Login Attempts & Account Lockout', () => {
  const originalReadyStateDescriptor = Object.getOwnPropertyDescriptor(mongoose.connection, 'readyState');

  beforeEach(() => {
    loginController.__resetUnknownAttempts();
    Object.defineProperty(mongoose.connection, 'readyState', {
      configurable: true,
      get: () => 1,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalReadyStateDescriptor) {
      Object.defineProperty(mongoose.connection, 'readyState', originalReadyStateDescriptor);
    }
  });

  const mockSettings = (maxLoginAttempts: number | null) => {
    vi.spyOn(OrganizationSettings, 'findOne').mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(
          maxLoginAttempts === null ? null : { maxLoginAttempts }
        ),
      }),
    } as never);
  };

  it('enforces configured maxLoginAttempts (3) with 401 counters then 423 lockout', async () => {
    mockSettings(3);

    const dbUser = {
      _id: 'user-1',
      username: 'agent1',
      role: 'User',
      departments: [],
      activeDepartment: null,
      photo: '',
      isActive: true,
      failedLoginAttempts: 0,
      lockUntil: null as Date | null,
      matchPassword: vi.fn(async (pwd: string) => pwd === 'CorrectPass1'),
      getSignedJwtToken: vi.fn(() => 'mock-jwt-token'),
    };

    vi.spyOn(User, 'findOne').mockReturnValue({
      select: vi.fn().mockResolvedValue(dbUser),
    } as never);

    const updateOneSpy = vi.spyOn(User, 'updateOne').mockImplementation(
      async (_filter: unknown, update: { $set?: { failedLoginAttempts?: number; lockUntil?: Date | null } }) => {
        if (update?.$set) {
          if (update.$set.failedLoginAttempts !== undefined) {
            dbUser.failedLoginAttempts = update.$set.failedLoginAttempts;
          }
          if ('lockUntil' in update.$set) {
            dbUser.lockUntil = update.$set.lockUntil ?? null;
          }
        }
        return { acknowledged: true, modifiedCount: 1 } as never;
      }
    );

    const next = vi.fn();

    // Attempt 1/3
    const res1 = createMockRes();
    await loginController.login({ body: { username: 'agent1', password: 'wrong' }, ip: '10.0.0.1' }, res1, next);
    expect(res1.statusCode).toBe(401);
    expect(res1.body).toMatchObject({
      success: false,
      locked: false,
      attempts: 1,
      maxAttempts: 3,
      remainingAttempts: 2,
    });

    // Attempt 2/3
    const res2 = createMockRes();
    await loginController.login({ body: { username: 'agent1', password: 'wrong' }, ip: '10.0.0.1' }, res2, next);
    expect(res2.statusCode).toBe(401);
    expect(res2.body).toMatchObject({
      success: false,
      locked: false,
      attempts: 2,
      maxAttempts: 3,
      remainingAttempts: 1,
    });

    // Attempt 3/3 -> Lockout 423
    const res3 = createMockRes();
    await loginController.login({ body: { username: 'agent1', password: 'wrong' }, ip: '10.0.0.1' }, res3, next);
    expect(res3.statusCode).toBe(423);
    expect(res3.body).toMatchObject({
      success: false,
      locked: true,
      attempts: 3,
      maxAttempts: 3,
      remainingAttempts: 0,
    });
    expect(typeof res3.body.lockUntil).toBe('string');
    expect(updateOneSpy).toHaveBeenCalledTimes(3);

    // Attempt 4 with CORRECT password while still locked -> MUST remain 423
    const res4 = createMockRes();
    await loginController.login({ body: { username: 'agent1', password: 'CorrectPass1' }, ip: '10.0.0.1' }, res4, next);
    expect(res4.statusCode).toBe(423);
    expect(res4.body).toMatchObject({
      success: false,
      locked: true,
      attempts: 3,
      maxAttempts: 3,
      remainingAttempts: 0,
    });
  });

  it('resets failedLoginAttempts and lockUntil upon successful login when not locked or after expiry', async () => {
    mockSettings(5);

    const dbUser = {
      _id: 'user-2',
      username: 'agent2',
      role: 'User',
      departments: [],
      activeDepartment: null,
      photo: '',
      isActive: true,
      failedLoginAttempts: 3,
      lockUntil: new Date(Date.now() - 1000), // expired lockout
      matchPassword: vi.fn(async (pwd: string) => pwd === 'ValidPass1'),
      getSignedJwtToken: vi.fn(() => 'mock-jwt-token'),
    };

    vi.spyOn(User, 'findOne').mockReturnValue({
      select: vi.fn().mockResolvedValue(dbUser),
    } as never);
    const updateOneSpy = vi.spyOn(User, 'updateOne').mockResolvedValue({ acknowledged: true } as never);

    const res = createMockRes();
    const next = vi.fn();
    await loginController.login({ body: { username: 'agent2', password: 'ValidPass1' }, ip: '10.0.0.2' }, res, next);

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ success: true, token: 'mock-jwt-token' });
    expect(updateOneSpy).toHaveBeenCalledWith(
      { _id: 'user-2' },
      { $set: { failedLoginAttempts: 0, lockUntil: null } }
    );
  });

  it('tracks failed attempts for unknown usernames in memory without leaking user existence', async () => {
    mockSettings(null); // default 5

    vi.spyOn(User, 'findOne').mockReturnValue({
      select: vi.fn().mockResolvedValue(null),
    } as never);

    const next = vi.fn();
    for (let i = 1; i <= 4; i++) {
      const res = createMockRes();
      await loginController.login({ body: { username: 'GhostUser', password: 'bad' }, ip: '192.168.1.50' }, res, next);
      expect(res.statusCode).toBe(401);
      expect(res.body).toMatchObject({
        success: false,
        locked: false,
        attempts: i,
        maxAttempts: 5,
        remainingAttempts: 5 - i,
        message: 'Invalid credentials',
      });
    }

    const res5 = createMockRes();
    await loginController.login({ body: { username: 'ghostuser', password: 'bad' }, ip: '192.168.1.50' }, res5, next);
    expect(res5.statusCode).toBe(423);
    expect(res5.body).toMatchObject({
      success: false,
      locked: true,
      attempts: 5,
      maxAttempts: 5,
      remainingAttempts: 0,
    });
  });

  it('rejects non-string credentials payload to block NoSQL operator injection', async () => {
    const res = createMockRes();
    const next = vi.fn();
    await loginController.login({ body: { username: { $ne: '' }, password: 'abc' }, ip: '127.0.0.1' }, res, next);
    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({ success: false });
  });
});
