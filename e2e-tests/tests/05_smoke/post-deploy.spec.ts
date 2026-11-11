import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { DashboardPage } from '../../pages/DashboardPage';
import { IncomingDocumentPage } from '../../pages/IncomingDocumentPage';
import { OutgoingDocumentPage } from '../../pages/OutgoingDocumentPage';
import { GlobalSearchPage } from '../../pages/GlobalSearchPage';
import { RagChatPage } from '../../pages/RagChatPage';
import { TEST_USERS, generateCorrespondenceNumber } from '../../utils/test-data';

test.describe('Checklist de Smoke Test Post-Déploiement (< 90s)', { tag: ['@smoke', '@p0'] }, () => {
  test('ST-01 : Vérification de la disponibilité et santé de l’API', async ({ request }) => {
    const res = await request.get('/api/dashboard/stats?year=2026');
    // Si non connecté, doit répondre au moins 401 ou 200 (serveur vivant)
    expect([200, 401]).toContain(res.status());
  });

  test('ST-02 à ST-10 : Parcours rapide de validation post-déploiement', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    const incomingPage = new IncomingDocumentPage(page);
    const outgoingPage = new OutgoingDocumentPage(page);
    const searchPage = new GlobalSearchPage(page);
    const ragPage = new RagChatPage(page);

    // ST-02 : Login
    await loginPage.goto();
    await loginPage.login(TEST_USERS.admin.username, TEST_USERS.admin.password);
    await loginPage.expectSuccessfulLogin();

    // ST-03 : Dashboard KPI
    await dashboardPage.expectStatsLoaded();

    // ST-04 : Création rapide Courrier Entrant
    await incomingPage.gotoCreate();
    const corrNum = generateCorrespondenceNumber('SMOKE-IN');
    await incomingPage.fillForm({
      correspondenceNumber: corrNum,
      subject: `Smoke Test Courrier Entrant ${corrNum}`,
    });
    await incomingPage.uploadFile('sample.pdf');
    await incomingPage.submit();
    await incomingPage.expectSuccess();

    // ST-06 : Création rapide Courrier Sortant
    await outgoingPage.gotoCreate();
    await outgoingPage.fillForm({
      subject: `Smoke Test Courrier Sortant ${Date.now()}`,
      recipient: 'Destinataire Smoke Test',
    });
    await outgoingPage.uploadFile('sample.pdf');
    await outgoingPage.submit();
    await outgoingPage.expectSuccess();

    // ST-07 : Recherche Globale
    await dashboardPage.goto();
    await searchPage.search('Smoke Test');
    await expect(searchPage.searchResultsDropdown).toBeVisible({ timeout: 5000 });

    // ST-10 : Bascule de Langue (FR ⇄ AR)
    const langSwitcher = page.getByRole('button', { name: /langue|العربية|français/i }).first()
      .or(page.locator('[data-testid="language-switcher"]'));
    if (await langSwitcher.isVisible()) {
      await langSwitcher.click();
      await page.waitForTimeout(300);
    }

    // ST-09 : Consultation Corbeille
    await page.goto('/dashboard/trash');
    await expect(page).toHaveURL(/\/dashboard\/trash/);

    // ST-02 (fin) : Déconnexion
    await dashboardPage.logout();
    await expect(page).toHaveURL(/\/login/);
  });
});

