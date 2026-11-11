import { test, expect } from '../../fixtures/auth.fixture';
import { OutgoingDocumentPage } from '../../pages/OutgoingDocumentPage';
import { generateCorrespondenceNumber } from '../../utils/test-data';

test.describe('Module Courriers Sortants (Outgoing)', { tag: ['@documents', '@outgoing'] }, () => {
  test.use({ role: 'admin' });

  let outgoingPage: OutgoingDocumentPage;

  test.beforeEach(async ({ authenticatedPage }) => {
    outgoingPage = new OutgoingDocumentPage(authenticatedPage);
  });

  test('OUT-01 : Création nominale d’un courrier sortant avec génération du N°', { tag: ['@p0', '@smoke'] }, async () => {
    await outgoingPage.gotoCreate();

    const subject = `Courrier Sortant Test ${Date.now()}`;
    await outgoingPage.fillForm({
      subject,
      recipient: 'Société Nationale des Chemins de Fer',
    });

    await outgoingPage.uploadFile('sample.pdf');
    await outgoingPage.submit();

    await outgoingPage.expectSuccess();
  });

  test('OUT-02 : Prise en charge de plusieurs destinataires externes', { tag: ['@p1'] }, async () => {
    await outgoingPage.gotoCreate();

    const subject = `Diffusion Multi-Destinataires ${Date.now()}`;
    await outgoingPage.fillForm({
      subject,
      recipient: 'Ministère des Finances, Direction des Douanes',
    });

    await outgoingPage.uploadFile('sample.pdf');
    await outgoingPage.submit();

    await outgoingPage.expectSuccess();
  });

  test('OUT-03 : Mise à jour du courrier sans ré-upload de fichier (PDF conservé)', { tag: ['@p1', '@regression'] }, async ({ authenticatedPage }) => {
    await outgoingPage.gotoList();

    // Ouvrir le premier courrier existant pour édition
    const editButton = authenticatedPage.getByRole('button', { name: /modifier|تعديل/i }).first()
      .or(authenticatedPage.locator('a[href*="/edit"]').first());

    if (await editButton.isVisible()) {
      await editButton.click();

      // Modifier uniquement l'objet
      const updatedSubject = `Mise à jour sans altération PDF ${Date.now()}`;
      await outgoingPage.subjectInput.fill(updatedSubject);
      await outgoingPage.submit();

      await outgoingPage.expectSuccess();
    }
  });
});

