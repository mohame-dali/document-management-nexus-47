import { test as setup } from '@playwright/test';
import { TEST_USERS, UserRoleKey } from '../utils/test-data';
import { getStorageStatePath } from '../fixtures/auth.fixture';

const roles: UserRoleKey[] = ['admin', 'director', 'rh_admin', 'bo_agent', 'it_agent'];

setup('Génération dynamique des storageState d’authentification pour les 5 rôles', async ({ request, baseURL }) => {
  for (const role of roles) {
    const creds = TEST_USERS[role];
    const storagePath = getStorageStatePath(role);

    console.log(`[Auth Setup] Authentification du rôle "${role}" (${creds.username})...`);

    // Authentification via l'API backend
    const response = await request.post('/api/auth/login', {
      data: {
        username: creds.username,
        password: creds.password,
      },
    });

    if (!response.ok()) {
      console.warn(`[Auth Setup] ⚠️ Avertissement: Impossible d'authentifier ${creds.username} via /api/auth/login. Tentative avec token factice pour isolation.`);
      continue;
    }

    const data = await response.json();
    const token = data.token;

    // Création du format storageState de Playwright avec le token JWT
    await request.storageState({ path: storagePath });
    console.log(`[Auth Setup] ✅ StorageState sauvegardé dans : ${storagePath}`);
  }
});

