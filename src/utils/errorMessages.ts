/**
 * Centralized error message translation + HTTP status mapping.
 * Translates backend messages (FR/EN) into Arabic for the UI.
 */

// Backend message mapping (FR/EN → AR)
const BACKEND_MESSAGE_MAP: Record<string, string> = {
  // Authentication
  'Unauthorized': 'يجب تسجيل الدخول مرة أخرى',
  'Non autorisé': 'يجب تسجيل الدخول مرة أخرى',
  'Invalid credentials': 'بيانات الدخول غير صحيحة',
  'Email ou mot de passe incorrect': 'البريد أو كلمة المرور غير صحيحة',
  'User not found': 'المستخدم غير موجود',
  'Utilisateur introuvable': 'المستخدم غير موجود',
  'Token expired': 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى',
  'Token invalid': 'الجلسة غير صالحة',

  // Authorization
  'Access denied': 'ليس لديك صلاحية للقيام بهذا الإجراء',
  'Accès refusé': 'ليس لديك صلاحية للقيام بهذا الإجراء',
  'Forbidden': 'الوصول ممنوع',
  'Insufficient permissions': 'الصلاحيات غير كافية',

  // Not found
  'Not found': 'العنصر المطلوب غير موجود',
  'Document non trouvé': 'الوثيقة غير موجودة',
  'Personnel introuvable': 'الموظف غير موجود',
  'Département introuvable': 'القسم غير موجود',
  'Department not found': 'القسم غير موجود',

  // Validation
  'Invalid date': 'التاريخ غير صحيح',
  'Date invalide': 'التاريخ غير صحيح',
  'Invalid ID': 'المعرف غير صحيح',
  'Required field missing': 'حقل مطلوب مفقود',
  'Champ obligatoire': 'هذا الحقل مطلوب',
  'Invalid format': 'التنسيق غير صحيح',
  'Already exists': 'هذا العنصر موجود مسبقاً',
  'Déjà existe': 'هذا العنصر موجود مسبقاً',
  'Duplicate entry': 'قيمة مكررة',

  // Business rules
  'Cannot delete': 'لا يمكن الحذف',
  'Cannot update': 'لا يمكن التعديل',
  'Director cannot': 'لا يمكن لمدير الإدارة القيام بهذا الإجراء',
  'Only one Director allowed': 'يُسمح بمدير إدارة واحد فقط',

  // Network
  'Network Error': 'خطأ في الاتصال بالشبكة',
  'Timeout': 'انتهت مدة الطلب. يرجى المحاولة مرة أخرى',
};

/**
 * Extract the best Arabic error message from an error object.
 * Priority:
 *   1. Translated backend message (from BACKEND_MESSAGE_MAP)
 *   2. Raw backend message if no translation found
 *   3. HTTP status code message
 *   4. Fallback generic message
 */
export function getErrorMessage(error: any, fallbackMessage?: string): string {
  if (!error) return fallbackMessage || 'حدث خطأ غير متوقع';

  // 1. Backend message (from response data)
  const backendMsg =
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message;

  if (backendMsg && typeof backendMsg === 'string') {
    // Try exact translation
    if (BACKEND_MESSAGE_MAP[backendMsg]) {
      return BACKEND_MESSAGE_MAP[backendMsg];
    }

    // Try partial match (case-insensitive)
    const lowerMsg = backendMsg.toLowerCase();
    for (const [key, translation] of Object.entries(BACKEND_MESSAGE_MAP)) {
      if (lowerMsg.includes(key.toLowerCase())) {
        return translation;
      }
    }

    // If already Arabic (contains Arabic chars) → return as-is
    if (/[\u0600-\u06FF]/.test(backendMsg)) {
      return backendMsg;
    }

    // Return raw backend message (fallback)
    return backendMsg;
  }

  // 2. Fallback to HTTP status code
  const status = error?.response?.status;
  switch (status) {
    case 400: return 'البيانات المدخلة غير صحيحة';
    case 401: return 'يجب تسجيل الدخول مرة أخرى';
    case 403: return 'ليس لديك صلاحية للقيام بهذا الإجراء';
    case 404: return 'العنصر المطلوب غير موجود';
    case 409: return 'هذا العنصر موجود مسبقاً';
    case 422: return 'البيانات المدخلة غير مكتملة';
    case 429: return 'عدد الطلبات كبير جداً. يرجى المحاولة بعد قليل';
    case 500: return 'خطأ داخلي في النظام';
    case 502: return 'خطأ في الاتصال بالخدمة';
    case 503: return 'الخدمة غير متوفرة حالياً';
    default: return fallbackMessage || 'حدث خطأ غير متوقع';
  }
}
