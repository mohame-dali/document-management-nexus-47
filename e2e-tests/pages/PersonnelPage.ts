import { Page, Locator, expect } from '@playwright/test';

export class PersonnelPage {
  readonly page: Page;
  readonly newPersonnelButton: Locator;
  readonly nomInput: Locator;
  readonly prenomInput: Locator;
  readonly cinInput: Locator;
  readonly submitButton: Locator;
  readonly successToast: Locator;
  readonly duplicateCinAlert: Locator;

  constructor(page: Page) {
    this.page = page;
    this.newPersonnelButton = page.getByRole('button', { name: /nouveau|nouvelle fiche|إضافة موظف/i })
      .or(page.getByRole('link', { name: /nouveau|nouvelle fiche|إضافة موظف/i }));
    this.nomInput = page.getByLabel(/nom|اللقب/i)
      .or(page.locator('input[name="nom"]'));
    this.prenomInput = page.getByLabel(/prénom|الاسم/i)
      .or(page.locator('input[name="prenom"]'));
    this.cinInput = page.getByLabel(/cin|بطاقة التعريف/i)
      .or(page.locator('input[name="cin"]'));
    this.submitButton = page.getByRole('button', { name: /enregistrer|sauvegarder|حفظ/i });
    this.successToast = page.getByText(/succès|enregistré avec succès|تم الحفظ/i);
    this.duplicateCinAlert = page.getByText(/cin existe déjà|doublon|déjà attribué/i);
  }

  async gotoList() {
    await this.page.goto('/dashboard/hr/personnel');
  }

  async gotoCreate() {
    await this.page.goto('/dashboard/hr/personnel/new');
  }

  async fillPersonnelForm(data: { nom: string; prenom: string; cin: string }) {
    await this.nomInput.fill(data.nom);
    await this.prenomInput.fill(data.prenom);
    await this.cinInput.fill(data.cin);
  }

  async submit() {
    await this.submitButton.click();
  }

  async expectSuccess() {
    await expect(this.successToast.first()).toBeVisible({ timeout: 10000 });
  }

  async expectDuplicateError() {
    await expect(this.duplicateCinAlert.first()).toBeVisible({ timeout: 5000 });
  }
}

