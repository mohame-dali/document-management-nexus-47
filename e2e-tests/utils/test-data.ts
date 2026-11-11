import { expect, Page, Locator } from '@playwright/test';

export type UserRoleKey = 'admin' | 'director' | 'rh_admin' | 'bo_agent' | 'it_agent';

export interface UserAccount {
  username: string;
  role: 'Admin' | 'Director' | 'AdminDepartment' | 'AdminTuningDesk' | 'User';
  departmentName?: string;
}

export const TEST_USERS: Record<UserRoleKey, { username: string; password: string; role: 'Admin' | 'Director' | 'AdminDepartment' | 'AdminTuningDesk' | 'User'; departmentName?: string }> = {
  admin: {
    username: process.env.ADMIN_USER || 'admin',
    password: process.env.ADMIN_PASS || 'Admin123!',
    role: 'Admin' as const,
  },
  director: {
    username: process.env.DIRECTOR_USER || 'director',
    password: process.env.DIRECTOR_PASS || 'Director123!',
    role: 'Director' as const,
  },
  rh_admin: {
    username: process.env.RH_ADMIN_USER || 'rh_admin',
    password: process.env.RH_ADMIN_PASS || 'RhAdmin123!',
    role: 'AdminDepartment' as const,
    departmentName: 'Ressources Humaines',
  },
  bo_agent: {
    username: process.env.BO_AGENT_USER || 'bo_agent',
    password: process.env.BO_AGENT_PASS || 'BoAgent123!',
    role: 'User' as const,
    departmentName: "Bureau d'Ordre",
  },
  it_agent: {
    username: process.env.IT_AGENT_USER || 'it_agent',
    password: process.env.IT_AGENT_PASS || 'ItAgent123!',
    role: 'User' as const,
    departmentName: 'Informatique',
  },
};

export function generateUniqueCIN(): string {
  const randomNum = Math.floor(10000000 + Math.random() * 90000000);
  return String(randomNum).substring(0, 8);
}

export function generateCorrespondenceNumber(prefix = 'CORR'): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${year}-${rand}`;
}

export function generateTestEmail(prefix = 'user'): string {
  const timestamp = Date.now();
  return `${prefix}.${timestamp}@test-dms.local`;
}

// Custom Assertions
export async function expectNoXSS(page: Page): Promise<void> {
  let dialogDetected = false;
  page.on('dialog', async (dialog) => {
    dialogDetected = true;
    await dialog.dismiss();
  });
  await page.waitForTimeout(500);
  expect(dialogDetected, 'Alerte XSS détectée à l’écran !').toBeFalsy();
}

export async function expectRTL(element: Locator): Promise<void> {
  const dir = await element.getAttribute('dir');
  expect(dir).toBe('rtl');
}

export async function expectNoDataLeak(
  content: string,
  unauthorizedDepartmentKeywords: string[]
): Promise<void> {
  for (const keyword of unauthorizedDepartmentKeywords) {
    expect(
      content.toLowerCase().includes(keyword.toLowerCase()),
      `Fuite de données détectée ! Le mot-clé interdit "${keyword}" est présent.`
    ).toBeFalsy();
  }
}
