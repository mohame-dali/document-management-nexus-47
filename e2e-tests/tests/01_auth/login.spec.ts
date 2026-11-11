import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { DashboardPage } from '../../pages/DashboardPage';
import { TEST_USERS } from '../../utils/test-data';
import { DmsApiClient } from '../../utils/api-client';

test.describe('Module Authentification & Sécurité des Sessions', { tag: ['@auth'] }, () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
  });

  test('AUTH-01 : Connexion valide avec redirection et présence du token', { tag: ['@p0', '@smoke'] }, async ({ page }) => {
    await loginPage.goto();
    await loginPage.login(TEST_USERS.admin.username, TEST_USERS.admin.password);

    await loginPage.expectSuccessfulLogin();
    await dashboardPage.expectStatsLoaded();

    // Vérifier la présence du token en localStorage
    const token = await page.evaluate(() => localStorage.getItem('token') || localStorage.getItem('dms_token'));
    expect(token).toBeTruthy();
  });

  test('AUTH-02 : Rejet lors d’une tentative avec mot de passe incorrect (401)', { tag: ['@p0'] }, async () => {
    await loginPage.goto();
    await loginPage.login(TEST_USERS.admin.username, 'WrongPassword123!');

    await loginPage.expectErrorMessage(/invalide|incorrect|failed/i);
  });

  test('AUTH-03 : Blocage d’un mot de passe faible lors de la mise à jour', { tag: ['@p1'] }, async ({ page, request }) => {
    // Connexion préalable
    await loginPage.goto();
    await loginPage.login(TEST_USERS.bo_agent.username, TEST_USERS.bo_agent.password);
    await loginPage.expectSuccessfulLogin();

    // Tentative de modification directe avec mot de passe faible via API
    const token = await page.evaluate(() => localStorage.getItem('token') || localStorage.getItem('dms_token'));
    const response = await request.put('/api/auth/updatepassword', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        currentPassword: TEST_USERS.bo_agent.password,
        newPassword: 'short',
      },
    });

    expect(response.status()).toBe(400);
  });

  test('AUTH-05 : Redirection vers /login sur token expiré ou corrompu', { tag: ['@p0'] }, async ({ page }) => {
    await page.goto('/login');
    // Injecter un token expiré
    await page.evaluate(() => {
      localStorage.setItem('token', 'invalid_expired_jwt_token_simulation');
    });

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('AUTH-06 : Déconnexion avec invalidation et blocage du retour arrière', { tag: ['@p1'] }, async ({ page }) => {
    await loginPage.goto();
    await loginPage.login(TEST_USERS.admin.username, TEST_USERS.admin.password);
    await loginPage.expectSuccessfulLogin();

    await dashboardPage.logout();
    await expect(page).toHaveURL(/\/login/);

    // Tentative de retour en arrière
    await page.goBack();
    await expect(page).toHaveURL(/\/login/);
  });

  test('AUTH-07 : Accès non autorisé bloqué sur /api/auth/reset-admin (API direct)', { tag: ['@p0', '@security'] }, async ({ request }) => {
    const apiClient = new DmsApiClient(request);
    const result = await apiClient.resetAdminDirect();

    // En environnement sécurisé, la route doit être rejetée (403, 404 ou 401)
    expect([401, 403, 404]).toContain(result.status);
  });
});

