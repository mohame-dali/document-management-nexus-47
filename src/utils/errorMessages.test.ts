import { describe, it, expect } from 'vitest';
import { getErrorMessage } from './errorMessages';

describe('errorMessages', () => {
  it('retourne un message backend traduit', () => {
    const err = { response: { data: { message: 'Personnel introuvable' } } };
    expect(getErrorMessage(err)).toBe('الموظف غير موجود');
  });

  it('traduit les codes HTTP', () => {
    expect(getErrorMessage({ response: { status: 403 } })).toBe('ليس لديك صلاحية للقيام بهذا الإجراء');
    expect(getErrorMessage({ response: { status: 404 } })).toBe('العنصر المطلوب غير موجود');
  });

  it('retourne un message par défaut', () => {
    expect(getErrorMessage(null)).toBe('حدث خطأ غير متوقع');
  });
});
