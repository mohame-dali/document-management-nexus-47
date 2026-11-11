import { test, expect } from '../../fixtures/auth.fixture';
import { IncomingDocumentPage } from '../../pages/IncomingDocumentPage';
import { generateCorrespondenceNumber } from '../../utils/test-data';
import { DmsApiClient } from '../../utils/api-client';

test.describe('Module Courriers Entrants (Incoming)', { tag: ['@documents', '@incoming'] }, () => {
  test.use({ role: 'admin' });

  let incomingPage: IncomingDocumentPage;

  test.beforeEach(async ({ authenticatedPage }) => {
    incomingPage = new IncomingDocumentPage(authenticatedPage);
  });

  test('INC-01 : Création nominale d’un courrier entrant avec fichier PDF', { tag: ['@p0', '@smoke'] }, async ({ authenticatedPage }) => {
    await incomingPage.gotoCreate();

    const corrNum = generateCorrespondenceNumber('INC-E2E');
    await incomingPage.fillForm({
      correspondenceNumber: corrNum,
      subject: `Courrier Entrant Test Automatisé ${corrNum}`,
      source: 'Ministère des Technologies',
    });

    await incomingPage.uploadFile('sample.pdf');
    await incomingPage.submit();

    await incomingPage.expectSuccess();
  });

  test('INC-02 : Validation des champs obligatoires vides avec erreurs inline', { tag: ['@p1'] }, async () => {
    await incomingPage.gotoCreate();
    await incomingPage.submit();

    await incomingPage.expectValidationErrors();
  });

  test('INC-04 : Numérotation unique lors de créations parallèles (Concurrence N et N+1)', { tag: ['@p0'] }, async ({ request }) => {
    const apiClient = new DmsApiClient(request);
    await apiClient.login('admin', 'Admin123!');

    const year = new Date().getFullYear();
    const corr1 = generateCorrespondenceNumber('PAR-1');
    const corr2 = generateCorrespondenceNumber('PAR-2');

    // Déclenchement simultané de deux requêtes de création
    const [res1, res2] = await Promise.all([
      apiClient.postIncomingDocument({
        correspondenceNumber: corr1,
        correspondenceDate: new Date().toISOString(),
        arrivalDate: new Date().toISOString(),
        subject: `Test Concurrence 1 - ${corr1}`,
        year,
      }),
      apiClient.postIncomingDocument({
        correspondenceNumber: corr2,
        correspondenceDate: new Date().toISOString(),
        arrivalDate: new Date().toISOString(),
        subject: `Test Concurrence 2 - ${corr2}`,
        year,
      }),
    ]);

    expect(res1.status).toBe(201);
    expect(res2.status).toBe(201);

    const doc1 = res1.data as { serialNumber?: number };
    const doc2 = res2.data as { serialNumber?: number };

    // Vérifier l'unicité stricte des numéros d'ordre séquentiels
    expect(doc1.serialNumber).toBeDefined();
    expect(doc2.serialNumber).toBeDefined();
    expect(doc1.serialNumber).not.toEqual(doc2.serialNumber);
  });

  test('INC-05 : Rejet du téléversement d’un fichier exécutable (.exe)', { tag: ['@p1', '@security'] }, async ({ authenticatedPage }) => {
    await incomingPage.gotoCreate();

    const corrNum = generateCorrespondenceNumber('EXE-REJECT');
    await incomingPage.fillForm({
      correspondenceNumber: corrNum,
      subject: `Tentative Injection Exécutable ${corrNum}`,
    });

    await incomingPage.uploadFile('malware.exe');
    await incomingPage.submit();

    // L'interface ou le toast doit signaler le refus du format
    await expect(
      authenticatedPage.getByText(/format non supporté|seuls les fichiers pdf|invalid file/i)
    ).toBeVisible({ timeout: 5000 });
  });
});

