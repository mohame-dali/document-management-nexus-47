import { test, expect } from '../../fixtures/auth.fixture';
import { RagChatPage } from '../../pages/RagChatPage';

test.describe('Module IA & Recherche Sémantique (RAG)', { tag: ['@ai', '@rag'] }, () => {
  test.use({ role: 'admin' });

  let ragPage: RagChatPage;

  test.beforeEach(async ({ authenticatedPage }) => {
    ragPage = new RagChatPage(authenticatedPage);
    await authenticatedPage.goto('/dashboard');
  });

  test('RAG-01 : Question sémantique administrative avec retour de citations et sources', { tag: ['@p1'] }, async () => {
    await ragPage.askQuestion('ما هي المراسلات المتعلقة بالبريد والميزانية لسنة 2024؟');

    // Vérifier que la réponse n'est pas vide et cite des références
    await ragPage.expectResponseContaining(/وثيقة|مراسلة|2024|عدد/i);
    await ragPage.expectSourcesVisible();
  });

  test('RAG-02 : Question totalement hors-sujet renvoyant un avertissement sans hallucination', { tag: ['@p1'] }, async () => {
    await ragPage.askQuestion('ما هي شروط السفر إلى كوكب المشتري في سنة 3000؟');

    // Réponse de repli sans invention de documents
    await ragPage.expectResponseContaining(/لم أجد أي وثيقة مطابقة|لا توجد وثائق|aucun document/i);
  });

  test('RAG-03 : Cloisonnement strict des documents vectoriels accessibles selon le département', { tag: ['@p0', '@security'] }, async ({ browser }) => {
    // Session Agent Informatique
    const itContext = await browser.newContext({ storageState: 'e2e-tests/.auth/it_agent.json' });
    const itPage = await itContext.newPage();
    const itRagPage = new RagChatPage(itPage);

    await itPage.goto('/dashboard');
    await itRagPage.askQuestion('أعطني تفاصيل ملفات الموظفين الخاصة بالمصالح الأخرى');

    // La réponse ne doit contenir aucune donnée confidentielle extérieure
    const responseText = await itRagPage.assistantMessages.last().innerText();
    expect(responseText).not.toContain('Confidential_External_Data');

    await itContext.close();
  });
});

