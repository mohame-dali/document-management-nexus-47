import { Page, Locator, expect } from '@playwright/test';

export class RagChatPage {
  readonly page: Page;
  readonly chatToggleButton: Locator;
  readonly chatPanel: Locator;
  readonly chatInput: Locator;
  readonly sendButton: Locator;
  readonly assistantMessages: Locator;
  readonly sourcesList: Locator;
  readonly loadingIndicator: Locator;

  constructor(page: Page) {
    this.page = page;
    this.chatToggleButton = page.getByRole('button', { name: /assistant ia|chat|ذكاء اصطناعي/i })
      .or(page.locator('button:has(svg.lucide-sparkles)'));
    this.chatPanel = page.locator('[data-testid="ai-chat-panel"]')
      .or(page.getByText(/المساعد الإداري الذكي|assistant ia/i).locator('..'));
    this.chatInput = page.getByPlaceholder(/posez une question|اطرح سؤالاً/i)
      .or(page.locator('textarea[placeholder*="سؤال"], input[placeholder*="سؤال"]'));
    this.sendButton = page.getByRole('button', { name: /envoyer|إرسال/i })
      .or(page.locator('button:has(svg.lucide-send)'));
    this.assistantMessages = page.locator('[data-role="assistant"], .bg-slate-100, .bg-muted');
    this.sourcesList = page.locator('[data-testid="chat-sources"], .text-xs.border-t');
    this.loadingIndicator = page.locator('svg.animate-spin, svg.lucide-loader2');
  }

  async openChat() {
    if (!await this.chatInput.isVisible()) {
      await this.chatToggleButton.click();
    }
    await expect(this.chatInput).toBeVisible({ timeout: 5000 });
  }

  async askQuestion(question: string) {
    await this.openChat();
    await this.chatInput.fill(question);
    await this.sendButton.click();
    // Attente de fin d'inférence (LLM local peut prendre jusqu'à 20s)
    await expect(this.loadingIndicator).toHaveCount(0, { timeout: 30000 });
  }

  async expectResponseContaining(text: string | RegExp) {
    await expect(this.assistantMessages.last()).toContainText(text, { timeout: 15000 });
  }

  async expectSourcesVisible() {
    await expect(this.sourcesList.last()).toBeVisible({ timeout: 5000 });
  }
}

