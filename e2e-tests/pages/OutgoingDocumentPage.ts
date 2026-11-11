import { Page, Locator, expect } from '@playwright/test';
import * as path from 'path';

export class OutgoingDocumentPage {
  readonly page: Page;
  readonly newDocumentButton: Locator;
  readonly subjectInput: Locator;
  readonly recipientInput: Locator;
  readonly addRecipientButton: Locator;
  readonly fileInput: Locator;
  readonly submitButton: Locator;
  readonly successToast: Locator;

  constructor(page: Page) {
    this.page = page;
    this.newDocumentButton = page.getByRole('button', { name: /nouveau courrier sortant|إضافة صادر/i })
      .or(page.getByRole('link', { name: /nouveau courrier sortant|إضافة صادر/i }));
    this.subjectInput = page.getByLabel(/objet|موضوع/i)
      .or(page.locator('input[name="subject"]'));
    this.recipientInput = page.getByLabel(/destinataire|المرسل إليه/i)
      .or(page.locator('input[name="assignedTo"], input[placeholder*="destinataire"]'));
    this.addRecipientButton = page.getByRole('button', { name: /ajouter destinataire|إضافة/i });
    this.fileInput = page.locator('input[type="file"]');
    this.submitButton = page.getByRole('button', { name: /enregistrer|sauvegarder|حفظ|créer/i });
    this.successToast = page.getByText(/succès|enregistré avec succès|تم الحفظ/i);
  }

  async gotoList() {
    await this.page.goto('/dashboard/mail/outgoing');
  }

  async gotoCreate() {
    await this.page.goto('/dashboard/mail/outgoing/create');
  }

  async fillForm(data: { subject: string; recipient: string }) {
    await this.subjectInput.fill(data.subject);
    if (await this.recipientInput.isVisible()) {
      await this.recipientInput.fill(data.recipient);
    }
  }

  async uploadFile(fileName: string) {
    const filePath = path.resolve(__dirname, '../fixtures/test-files', fileName);
    await this.fileInput.setInputFiles(filePath);
  }

  async submit() {
    await this.submitButton.click();
  }

  async expectSuccess() {
    await expect(this.successToast.first()).toBeVisible({ timeout: 10000 });
  }
}

