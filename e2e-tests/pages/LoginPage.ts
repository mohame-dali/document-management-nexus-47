import { Page, Locator, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly togglePasswordButton: Locator;
  readonly submitButton: Locator;
  readonly errorMessageAlert: Locator;

  constructor(page: Page) {
    this.page = page;
    this.usernameInput = page.getByRole('textbox', { name: /username|nom d'utilisateur|اسم المستخدم/i })
      .or(page.locator('input[name="username"]'));
    this.passwordInput = page.locator('input[name="password"]');
    this.togglePasswordButton = page.getByRole('button', { name: /mot de passe|password/i })
      .or(page.locator('button[aria-label*="mot de passe"], button[aria-label*="password"]'));
    this.submitButton = page.getByRole('button', { name: /se connecter|connexion|login|دخول/i });
    this.errorMessageAlert = page.getByRole('alert');
  }

  async goto() {
    await this.page.goto('/login');
    await expect(this.submitButton).toBeVisible();
  }

  async login(username: string, password: string) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async togglePasswordVisibility() {
    await this.togglePasswordButton.click();
  }

  async expectErrorMessage(expectedText?: string | RegExp) {
    await expect(this.errorMessageAlert).toBeVisible();
    if (expectedText) {
      await expect(this.errorMessageAlert).toContainText(expectedText);
    }
  }

  async expectSuccessfulLogin() {
    await expect(this.page).toHaveURL(/\/dashboard/);
  }
}

