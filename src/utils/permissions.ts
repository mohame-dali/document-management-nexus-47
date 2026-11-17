import {
  IncomingDocument,
  OutgoingDocument,
  Personnel,
  User,
  UserRole,
} from '@/types';

type IdLike =
  | string
  | { _id?: string; id?: string }
  | null
  | undefined;

export function extractEntityId(value: IdLike): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value._id === 'string' && value._id) return value._id;
  if (typeof value.id === 'string' && value.id) return value.id;
  return null;
}

/**
 * Rôles autorisés par backend/routes/personnelDocumentRoutes.js :
 *   authorize('Admin', 'AdminDepartment', 'AdminTuningDesk')
 * sur POST /api/hr/personnel/:personnelId/documents,
 *     PUT  /api/hr/personnel-documents/:associationId,
 *     DELETE /api/hr/personnel-documents/:associationId.
 */
const LINK_PERSONNEL_ALLOWED_ROLES: readonly UserRole[] = [
  'Admin',
  'AdminDepartment',
  'AdminTuningDesk',
];

export interface CanLinkPersonnelOptions {
  /** Personnel ciblé (vérification du département cible côté backend) */
  personnel?: Pick<Personnel, 'activeDepartment'> | null;
  /** ID du département RH issu de OrganizationSettings.rhDepartmentId */
  rhDepartmentId?: IdLike;
}

/**
 * Reproduit EXACTEMENT la règle backend (personnelDocumentRoutes.js +
 * canUserLinkPersonnel dans backend/controllers/personnelDocumentController.js) :
 *
 * 1. Utilisateur et document requis.
 * 2. Rôle dans ['Admin', 'AdminDepartment', 'AdminTuningDesk'].
 * 3. 'Admin' => autorisé sans restriction de département.
 * 4. 'AdminDepartment' ou 'AdminTuningDesk' => requiert un activeDepartment non nul
 *    (AdminTuningDesk / Chef de Bureau d'Ordre a activeDepartment === null => false).
 *    - Si activeDepartment === rhDepartmentId (RH) => autorisé pour tout personnel.
 *    - Sinon, si un personnel cible est fourni => autorisé uniquement si
 *      personnel.activeDepartment === user.activeDepartment.
 *
 * NOTE DE SÉCURITÉ : ce masquage côté interface est purement ergonomique ;
 * le backend demeure la seule autorité de sécurité.
 */
export function canLinkPersonnel(
  user: User | null | undefined,
  document: IncomingDocument | OutgoingDocument | { _id?: string } | null | undefined,
  options?: CanLinkPersonnelOptions
): boolean {
  if (!user || !document) {
    return false;
  }

  if (!LINK_PERSONNEL_ALLOWED_ROLES.includes(user.role)) {
    return false;
  }

  if (user.role === 'Admin') {
    return true;
  }

  // AdminDepartment ou AdminTuningDesk : doit avoir un département actif valide
  const userActiveDeptId = extractEntityId(user.activeDepartment);
  if (!userActiveDeptId) {
    return false;
  }

  // Chef du département RH => accès complet sur tous les employés
  const rhDeptId = extractEntityId(options?.rhDepartmentId);
  if (rhDeptId && userActiveDeptId === rhDeptId) {
    return true;
  }

  // Si un employé cible est fourni, son département actif doit correspondre à celui de l'utilisateur
  if (options?.personnel) {
    const personnelDeptId = extractEntityId(options.personnel.activeDepartment);
    return Boolean(personnelDeptId && personnelDeptId === userActiveDeptId);
  }

  return true;
}
