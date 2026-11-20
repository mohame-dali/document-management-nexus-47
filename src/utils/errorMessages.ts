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

  // File upload
  'Fichier trop volumineux. Maximum 10 Mo.': 'حجم الملف كبير جداً. الحد الأقصى 10 ميغابايت',
  'Fichier trop volumineux': 'حجم الملف كبير جداً. الحد الأقصى 10 ميغابايت',
  'File too large': 'حجم الملف كبير جداً. الحد الأقصى 10 ميغابايت',
  'LIMIT_FILE_SIZE': 'حجم الملف كبير جداً. الحد الأقصى 10 ميغابايت',

  // Network
  'Network Error': 'خطأ في الاتصال بالشبكة',
  'Timeout': 'انتهت مدة الطلب. يرجى المحاولة مرة أخرى',
};

const BACKEND_MESSAGE_MAP_FR: Record<string, string> = {
  'Unauthorized': 'Veuillez vous reconnecter',
  'Non autorisé': 'Veuillez vous reconnecter',
  'Invalid credentials': 'Identifiants incorrects',
  'Email ou mot de passe incorrect': 'E-mail ou mot de passe incorrect',
  'User not found': 'Utilisateur introuvable',
  'Utilisateur introuvable': 'Utilisateur introuvable',
  'Token expired': 'Session expirée. Veuillez vous reconnecter',
  'Token invalid': 'Session invalide',
  'Access denied': "Vous n'avez pas l'autorisation d'effectuer cette action",
  'Accès refusé': "Vous n'avez pas l'autorisation d'effectuer cette action",
  'Forbidden': 'Accès refusé',
  'Insufficient permissions': 'Permissions insuffisantes',
  'Not found': 'Élément introuvable',
  'Document non trouvé': 'Document introuvable',
  'Personnel introuvable': 'Personnel introuvable',
  'Département introuvable': 'Département introuvable',
  'Department not found': 'Département introuvable',
  'Invalid date': 'Date invalide',
  'Date invalide': 'Date invalide',
  'Invalid ID': 'Identifiant invalide',
  'Required field missing': 'Champ obligatoire manquant',
  'Champ obligatoire': 'Ce champ est obligatoire',
  'Invalid format': 'Format invalide',
  'Already exists': 'Cet élément existe déjà',
  'Déjà existe': 'Cet élément existe déjà',
  'Duplicate entry': 'Valeur en double',
  'Cannot delete': 'Suppression impossible',
  'Cannot update': 'Mise à jour impossible',
  'Director cannot': 'Le directeur ne peut pas effectuer cette action',
  'Only one Director allowed': 'Un seul directeur est autorisé',
  'Fichier trop volumineux. Maximum 10 Mo.': 'Fichier trop volumineux. Maximum 10 Mo.',
  'Fichier trop volumineux': 'Fichier trop volumineux. Maximum 10 Mo.',
  'File too large': 'Fichier trop volumineux. Maximum 10 Mo.',
  'LIMIT_FILE_SIZE': 'Fichier trop volumineux. Maximum 10 Mo.',
  'Network Error': 'Erreur de connexion réseau',
  'Timeout': 'Délai de requête dépassé. Veuillez réessayer',
};

/**
 * Extract the best localized error message from an error object.
 * Priority:
 *   1. Translated backend message
 *   2. Raw backend message if no translation found
 *   3. HTTP status code message
 *   4. Fallback generic message
 */
export function getErrorMessage(
  error: unknown,
  fallbackMessage?: string,
  language: 'ar' | 'fr' = 'ar'
): string {
  const defaultFallback =
    language === 'fr' ? 'Une erreur inattendue est survenue' : 'حدث خطأ غير متوقع';
  if (!error) return fallbackMessage || defaultFallback;

  const messageMap = language === 'fr' ? BACKEND_MESSAGE_MAP_FR : BACKEND_MESSAGE_MAP;

  const err = error as {
    response?: {
      status?: number;
      data?: {
        message?: string;
        error?: string;
      };
    };
    message?: string;
  };

  // 1. Backend message (from response data)
  const backendMsg =
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message;

  if (backendMsg && typeof backendMsg === 'string') {
    // Try exact translation
    if (messageMap[backendMsg]) {
      return messageMap[backendMsg];
    }

    // Try partial match (case-insensitive)
    const lowerMsg = backendMsg.toLowerCase();
    for (const [key, translation] of Object.entries(messageMap)) {
      if (lowerMsg.includes(key.toLowerCase())) {
        return translation;
      }
    }

    // If already matches target language script, return as-is
    if (language === 'ar' && /[\u0600-\u06FF]/.test(backendMsg)) {
      return backendMsg;
    }

    // Return raw backend message (fallback)
    return backendMsg;
  }

  // 2. Fallback to HTTP status code
  const status = err?.response?.status;
  if (language === 'fr') {
    switch (status) {
      case 400: return 'Données saisies invalides';
      case 401: return 'Veuillez vous reconnecter';
      case 403: return "Vous n'avez pas l'autorisation d'effectuer cette action";
      case 404: return 'Élément introuvable';
      case 409: return 'Cet élément existe déjà';
      case 413: return 'Fichier trop volumineux. Maximum 10 Mo.';
      case 422: return 'Données saisies incomplètes';
      case 429: return 'Trop de requêtes. Veuillez réessayer dans un moment';
      case 500: return 'Erreur interne du système';
      case 502: return 'Erreur de connexion au service';
      case 503: return 'Service actuellement indisponible';
      default: return fallbackMessage || defaultFallback;
    }
  }

  switch (status) {
    case 400: return 'البيانات المدخلة غير صحيحة';
    case 401: return 'يجب تسجيل الدخول مرة أخرى';
    case 403: return 'ليس لديك صلاحية للقيام بهذا الإجراء';
    case 404: return 'العنصر المطلوب غير موجود';
    case 409: return 'هذا العنصر موجود مسبقاً';
    case 413: return 'حجم الملف كبير جداً. الحد الأقصى 10 ميغابايت';
    case 422: return 'البيانات المدخلة غير مكتملة';
    case 429: return 'عدد الطلبات كبير جداً. يرجى المحاولة بعد قليل';
    case 500: return 'خطأ داخلي في النظام';
    case 502: return 'خطأ في الاتصال بالخدمة';
    case 503: return 'الخدمة غير متوفرة حالياً';
    default: return fallbackMessage || defaultFallback;
  }
}
