import { User, Department } from './index';

export type PersonnelStatut = 'en_attente' | 'actif' | 'inactif';
export type PersonnelSexe = 'Homme' | 'Femme';

export interface Personnel {
  _id: string;
  nom: string;
  prenom: string;
  dateNaissance?: string | null;
  lieuNaissance?: string;
  sexe?: PersonnelSexe;
  cin?: string;
  adresse?: string;
  telephone?: string;
  emailPersonnel?: string;
  poste?: string;
  activeDepartment?: Department | string | null;
  departments?: (Department | string)[];
  dateEmbauche?: string | null;
  statut: PersonnelStatut;
  userId?: User | string | null;
  notes?: string;
  photo?: string;
  createdAt?: string;
  createdBy?: User | string | null;
}

export interface PersonnelListResponse {
  success: boolean;
  data: Personnel[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface PersonnelFilters {
  search?: string;
  statut?: string;
  activeDepartment?: string;
  page?: number;
  limit?: number;
}

export type DocumentType = 'IncomingDocument' | 'OutgoingDocument';

export interface PopulatedDocument {
  _id: string;
  serialNumber?: number | string;
  year?: number | string;
  subject?: string;
  title?: string;
  entryDate?: string;
  issueDate?: string;
  date?: string;
  sender?: string;
  recipient?: string;
  destination?: string;
  source?: string;
  fileUrl?: string;
  filePath?: string;
  department?: Department | string | null;
}

export interface PersonnelDocument {
  _id: string;
  personnelId: string | Personnel;
  typeAssociation: string;
  documentType: DocumentType;
  documentId: string;
  document?: PopulatedDocument | null;
  commentaire?: string;
  dateAssociation: string;
  associePar?: {
    _id: string;
    username: string;
    email?: string;
  } | null;
  createdAt?: string;
}

export interface DocumentPersonnelAssociation {
  _id: string;
  personnel: Personnel;
  typeAssociation: string;
  commentaire?: string;
  dateAssociation: string;
  associePar?: {
    _id: string;
    username: string;
    email?: string;
  } | null;
  createdAt?: string;
}

export interface CreatePersonnelDocumentPayload {
  documentType: DocumentType;
  documentId: string;
  typeAssociation: string;
  commentaire?: string;
}

export interface UpdatePersonnelDocumentPayload {
  typeAssociation?: string;
  commentaire?: string;
}
