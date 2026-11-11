import { Page, Locator, expect } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly incomingTotalCard: Locator;
  readonly outgoingTotalCard: Locator;
  readonly pendingTotalCard: Locator;
  readonly userMenuButton: Locator;
  readonly logoutButton: Locator;
  readonly yearSelector: Locator;
  readonly errorBanner: Locator;

  constructor(page: Page) {
    this.page = page;
    this.incomingTotalCard = page.getByText(/courriers entrants|الوارد/i).first();
    this.outgoingTotalCard = page.getByText(/courriers sortants|الصادر/i).first();
    this.pendingTotalCard = page.getByText(/en attente|في الانتظار/i).first();
    this.userMenuButton = page.getByRole('button', { name: /profil|utilisateur|compte/i })
      .or(page.locator('[data-testid="user-menu-btn"]'));
    this.logoutButton = page.getByRole('menuitem', { name: /déconnexion|logout|خروج/i })
      .or(page.getByRole('button', { name: /déconnexion|logout|خروج/i }));
    this.yearSelector = page.getByRole('combobox', { name: /année|year|سنة/i })
      .or(page.locator('[data-testid="year-select"]'));
    this.errorBanner = page.getByRole('alert');
  }

  async goto() {
    await this.page.goto('/dashboard');
    await expect(this.page).toHaveURL(/\/dashboard/);
  }

  async selectYear(year: string) {
    if (await this.yearSelector.isVisible()) {
      await this.yearSelector.click();
      await this.page.getByRole('option', { name: year }).click();
    }
  }

  async logout() {
    if (await this.userMenuButton.isVisible()) {
      await this.userMenuButton.click();
    }
    await this.logoutButton.click();
  }

  async expectStatsLoaded() {
    await expect(this.incomingTotalCard).toBeVisible();
    await expect(this.outgoingTotalCard).toBeVisible();
  }
}

