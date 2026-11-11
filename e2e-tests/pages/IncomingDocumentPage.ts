import { Page, Locator, expect } from '@playwright/test';
import * as path from 'path';

export class IncomingDocumentPage {
  readonly page: Page;
  readonly newDocumentButton: Locator;
  readonly correspondenceNumberInput: Locator;
  readonly subjectInput: Locator;
  readonly sourceInput: Locator;
  readonly departmentSelect: Locator;
  readonly fileInput: Locator;
  readonly submitButton: Locator;
  readonly successToast: Locator;
  readonly fieldErrors: Locator;

  constructor(page: Page) {
    this.page = page;
    this.newDocumentButton = page.getByRole('button', { name: /nouveau courrier|إضافة وارد|ajouter/i })
      .or(page.getByRole('link', { name: /nouveau courrier|إضافة وارد/i }));
    this.correspondenceNumberInput = page.getByLabel(/numéro de correspondance|رقم المراسلة/i)
      .or(page.locator('input[name="correspondenceNumber"]'));
    this.subjectInput = page.getByLabel(/objet|موضوع/i)
      .or(page.locator('input[name="subject"]'));
    this.sourceInput = page.getByLabel(/source|الجهة المصدرة|provenance/i)
      .or(page.locator('input[name="source"]'));
    this.departmentSelect = page.getByLabel(/département|القسم/i)
      .or(page.locator('[data-testid="department-select"]'));
    this.fileInput = page.locator('input[type="file"]');
    this.submitButton = page.getByRole('button', { name: /enregistrer|sauvegarder|حفظ|créer/i });
    this.successToast = page.getByText(/succès|enregistré avec succès|تم الحفظ/i);
    this.fieldErrors = page.locator('p[id*="form-item-message"], p.text-destructive, p.text-red-500');
  }

  async gotoList() {
    await this.page.goto('/dashboard/mail/incoming');
  }

  async gotoCreate() {
    await this.page.goto('/dashboard/mail/incoming/create');
  }

  async fillForm(data: {
    correspondenceNumber: string;
    subject: string;
    source?: string;
  }) {
    await this.correspondenceNumberInput.fill(data.correspondenceNumber);
    await this.subjectInput.fill(data.subject);
    if (data.source && await this.sourceInput.isVisible()) {
      await this.sourceInput.fill(data.source);
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

  async expectValidationErrors() {
    await expect(this.fieldErrors.first()).toBeVisible();
  }
}

