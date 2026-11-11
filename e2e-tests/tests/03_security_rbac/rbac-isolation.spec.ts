import { test, expect } from '../../fixtures/auth.fixture';
import { GlobalSearchPage } from '../../pages/GlobalSearchPage';

test.describe('Sécurité & Cloisonnement RBAC Inter-Départements', { tag: ['@security', '@rbac'] }, () => {
  test('RBAC-01 : Blocage de l’accès URL direct aux courriers d’un autre département (403)', { tag: ['@p0'] }, async ({ browser }) => {
    // Session Agent Informatique (dépt IT)
    const itContext = await browser.newContext({ storageState: 'e2e-tests/.auth/it_agent.json' });
    const itPage = await itContext.newPage();

    // Tenter d'accéder à l'URL d'un courrier assigné exclusivement au département RH
    await itPage.goto('/dashboard/mail/incoming/6ae4b19c845958f58154de3d');

    // Vérifier l'interception de sécurité
    const accessDenied = itPage.getByText(/accès refusé|non autorisé|interdit|403|forbidden/i);
    await expect(accessDenied.first()).toBeVisible({ timeout: 5000 });

    await itContext.close();
  });

  test('RBAC-03 : Étanchéité de la recherche globale sans fuite d’autres départements', { tag: ['@p0'] }, async ({ browser }) => {
    // Session Agent Bureau d'Ordre
    const boContext = await browser.newContext({ storageState: 'e2e-tests/.auth/bo_agent.json' });
    const boPage = await boContext.newPage();
    const searchPage = new GlobalSearchPage(boPage);

    await boPage.goto('/dashboard');

    // Rechercher un mot-clé confidentiel propre à un autre département
    await searchPage.search('Dossier Disciplinaire RH Exclusif');

    // Aucun document confidentiel RH ne doit fuiter dans les résultats
    await searchPage.expectNoResultFor('Dossier Disciplinaire RH Exclusif');

    await boContext.close();
  });

  test('RBAC-05 : Rejet (401) lors de l’accès direct au fichier PDF sans session active', { tag: ['@p0'] }, async ({ browser, request }) => {
    // Contexte anonyme sans cookie ni token
    const anonContext = await browser.newContext();
    const anonPage = await anonContext.newPage();

    // Tenter de télécharger directement un document physique
    const response = await request.get('/courrier/2026/Incoming-Doc/1.pdf');

    // Le middleware 'protect' doit bloquer l'accès
    expect([401, 403, 302]).toContain(response.status());

    await anonContext.close();
  });
});

