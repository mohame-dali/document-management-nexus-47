import { describe, it, expect } from 'vitest';
import { generateUsername, generatePassword, suggestRole } from './credentialsGenerator';

describe('credentialsGenerator', () => {
  describe('generateUsername', () => {
    it('génère prenom.nom en minuscules', () => {
      expect(generateUsername('Sami', 'Chabani')).toBe('sami.chabani');
    });
    it('supprime les accents', () => {
      expect(generateUsername('Éric', 'Café')).toBe('eric.cafe');
    });
    it('gère les noms vides', () => {
      expect(generateUsername('', 'Nom')).toBe('nom');
      expect(generateUsername('Prénom', '')).toBe('prenom');
      expect(generateUsername('', '')).toBe('user');
    });
  });

  describe('generatePassword', () => {
    it('génère un mot de passe de 10 caractères par défaut', () => {
      expect(generatePassword()).toHaveLength(10);
    });
    it('génère des mots de passe différents', () => {
      const p1 = generatePassword();
      const p2 = generatePassword();
      expect(p1).not.toBe(p2);
    });
  });

  describe('suggestRole', () => {
    it('retourne Director pour bureauDirecteur', () => {
      expect(suggestRole('dir-id', { bureauDirecteurDepartmentId: 'dir-id' })).toBe('Director');
    });
    it('retourne User par défaut', () => {
      expect(suggestRole('other-id', { bureauDirecteurDepartmentId: 'dir-id' })).toBe('User');
    });
  });
});
