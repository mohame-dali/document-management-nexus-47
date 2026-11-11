import { test, expect } from '@playwright/test';

test.describe('Sécurité — Protection contre le Path Traversal', { tag: ['@security', '@traversal'] }, () => {
  test('RBAC-04 : Blocage immédiat des séquences de traversée de répertoire (/../..)', { tag: ['@p0'] }, async ({ request }) => {
    // Connexion admin pour obtenir un jeton valide
    const loginRes = await request.post('/api/auth/login', {
      data: { username: 'admin', password: 'Admin123!' },
    });
    const { token } = await loginRes.json();

    const attackVectors = [
      '/api/files/incoming/fakeid/../../../../etc/passwd',
      '/api/files/incoming/fakeid/..%2f..%2f..%2fetc%2fpasswd',
      '/courrier/../../../etc/passwd',
      '/courrier/..%2f..%2f..%2fpackage.json',
    ];

    for (const vector of attackVectors) {
      const response = await request.get(vector, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Le serveur doit rejeter la requête par une erreur 400 Bad Request, 403 Forbidden ou 404 Not Found
      expect([400, 403, 404]).toContain(response.status());

      // Vérifier que le contenu système /etc/passwd n'est jamais renvoyé
      const body = await response.text();
      expect(body).not.toContain('root:x:0:0:');
      expect(body).not.toContain('"dependencies"');
    }
  });
});

