
export interface User {
  _id: string;
  username: string;
  role: 'Director' | 'Admin' | 'AdminDepartment' | 'AdminTuningDesk' | 'User';
  departments: Department[];
  activeDepartment: Department | null;
  photo: string;
  isActive: boolean;
  createdAt: string;
  personnelId?: string | null;
}

export interface Department {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  createdBy?: User | string;
}

export interface Folder {
  _id: string;
  name: string;
  parent: string | null | Folder;
  department: string | Department;
  status: 'En cours' | 'Fermé';
  createdBy: string | User;
  createdAt: string;
  documentCount?: number;
}

export interface IncomingDocument {
  _id: string;
  serialNumber: number;
  year: number;
  arrivalDate: string;
  correspondenceNumber: string;
  correspondenceDate: string;
  typeDocument?: string;
  activity?: string;
  dateActivity?: string;
  source?: string;
  subject: string;
  scannedDocument?: string;
  ocrText?: string;
  assignedTo: Array<{
    id: Department | string;
    name: string;
  }>;
  answer?: OutgoingDocument | string | null;
  responsibleUser?: User | string | null;
  folder?: Folder | string | null;
  createdAt: string;
}

export interface OutgoingDocument {
  _id: string;
  serialNumber: number;
  year: number;
  issueDate: string;
  typeDocument?: string;
  source: {
    id: Department | string;
    name: string;
  };
  assignedTo?: string[];
  pourInfo?: string[];
  subject: string;
  ocrText?: string;
  scannedDocument?: string;
  reference?: IncomingDocument | string | null;
  folder?: Folder | string | null;
  createdAt: string;
}

export interface ActivityNotification {
  _id: string;
  documentId: IncomingDocument | string;
  activity: string;
  dateActivity: string;
  notificationType: 'today' | 'tomorrow' | '2days' | '3days' | 'overdue';
  recipients: Array<{
    userId: User | string;
    read: boolean;
    readAt?: string;
  }>;
  message: string;
  title: string;
  type: 'success' | 'warning' | 'error' | 'info' | 'document_created' | 'document_updated' | 'user_created' | 'user_updated' | 'department_created' | 'department_updated';
  isRead: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface Message {
  _id: string;
  sender: User | string;
  recipients: {
    user: User | string;
    read: boolean;
    readAt?: string;
  }[];
  subject: string;
  content: string;
  priority?: 'normal' | 'high' | 'urgent';
  attachments?: Array<{
    filename?: string;
    path?: string;
    size?: number;
    mimetype?: string;
    url?: string;
  }>;
  messageType?: 'one-to-one' | 'one-to-many';
  crossDepartment?: boolean;
  isRead?: boolean;
  isSender?: boolean;
  recipientCount?: number;
  createdAt: string;
  updatedAt?: string;
}

export type PriorityType = 'low' | 'normal' | 'high' | 'urgent';
export type FolderStatus = 'En cours' | 'Fermé';
export type UserRole = 'Director' | 'Admin' | 'AdminDepartment' | 'AdminTuningDesk' | 'User';

export * from './hr';
