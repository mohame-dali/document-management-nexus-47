import { Page, Locator, expect } from '@playwright/test';

export class GlobalSearchPage {
  readonly page: Page;
  readonly searchInput: Locator;
  readonly searchResultsDropdown: Locator;
  readonly incomingSection: Locator;
  readonly outgoingSection: Locator;
  readonly personnelSection: Locator;
  readonly noResultsMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchInput = page.getByRole('textbox', { name: /recherche|بحث|search/i })
      .or(page.locator('#global-search-input'));
    this.searchResultsDropdown = page.locator('[role="menu"], [data-radix-menu-content]');
    this.incomingSection = page.getByText(/courriers entrants|الوارد/i);
    this.outgoingSection = page.getByText(/courriers sortants|الصادر/i);
    this.personnelSection = page.getByText(/personnel|الموظفون/i);
    this.noResultsMessage = page.getByText(/aucun résultat|لا توجد نتائج/i);
  }

  async search(query: string) {
    await this.searchInput.fill(query);
    // Attente du déclenchement du debounce
    await this.page.waitForTimeout(400);
  }

  async expectResultContaining(text: string) {
    await expect(this.searchResultsDropdown.getByText(text).first()).toBeVisible({ timeout: 5000 });
  }

  async expectNoResultFor(text: string) {
    const item = this.searchResultsDropdown.getByText(text);
    await expect(item).toHaveCount(0);
  }
}

