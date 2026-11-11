import { test as base, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { TEST_USERS, UserRoleKey } from '../utils/test-data';

const AUTH_DIR = path.resolve(__dirname, '../.auth');

export function getStorageStatePath(role: UserRoleKey): string {
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }
  return path.join(AUTH_DIR, `${role}.json`);
}

export type AuthFixtures = {
  role: UserRoleKey;
  authenticatedPage: Page;
};

export const test = base.extend<AuthFixtures>({
  role: ['admin', { option: true }],

  authenticatedPage: async ({ browser, role }, use) => {
    const storageStatePath = getStorageStatePath(role);

    if (!fs.existsSync(storageStatePath)) {
      throw new Error(
        `État d'authentification manquant pour le rôle "${role}". Veuillez exécuter le projet de setup au préalable.`
      );
    }

    const context = await browser.newContext({ storageState: storageStatePath });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect } from '@playwright/test';
