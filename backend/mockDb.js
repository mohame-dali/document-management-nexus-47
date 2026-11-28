const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'nexus47-super-secret-key-ai-studio';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '30d';

// Seed Departments
let departments = [
  {
    _id: '65f000000000000000000010',
    name: 'Direction Générale',
    description: 'Direction et gestion générale de l\'établissement',
    isActive: true,
    createdAt: '2026-01-01T08:00:00.000Z',
    createdBy: { username: 'admin' }
  },
  {
    _id: '65f000000000000000000020',
    name: 'Ressources Humaines',
    description: 'Gestion du personnel, des recrutements et de la formation',
    isActive: true,
    createdAt: '2026-01-02T09:00:00.000Z',
    createdBy: { username: 'admin' }
  },
  {
    _id: '65f000000000000000000030',
    name: 'Finances & Comptabilité',
    description: 'Budget, exécution financière, ordonnancement et comptabilité',
    isActive: true,
    createdAt: '2026-01-03T10:00:00.000Z',
    createdBy: { username: 'admin' }
  },
  {
    _id: '65f000000000000000000040',
    name: 'Affaires Juridiques',
    description: 'Contentieux, conventions et conformité réglementaire',
    isActive: true,
    createdAt: '2026-01-04T11:00:00.000Z',
    createdBy: { username: 'admin' }
  }
];

// Seed Users
let users = [
  {
    _id: '65f000000000000000000001',
    username: 'admin',
    password: 'admin123',
    role: 'Admin',
    departments: [departments[0], departments[1], departments[2], departments[3]],
    activeDepartment: departments[0],
    photo: '',
    isActive: true,
    createdAt: '2026-01-01T08:00:00.000Z'
  },
  {
    _id: '65f000000000000000000002',
    username: 'dept_admin',
    password: 'admin123',
    role: 'AdminDepartment',
    departments: [departments[2]],
    activeDepartment: departments[2],
    photo: '',
    isActive: true,
    createdAt: '2026-01-05T08:00:00.000Z'
  },
  {
    _id: '65f000000000000000000003',
    username: 'bureau_ordre',
    password: 'admin123',
    role: 'AdminTuningDesk',
    departments: [],
    activeDepartment: null,
    photo: '',
    isActive: true,
    createdAt: '2026-01-06T08:00:00.000Z'
  }
];

// Seed Folders
let folders = [
  {
    _id: '65f000000000000000000051',
    name: 'Courriers Officiels 2026',
    parent: null,
    department: departments[0],
    status: 'En cours',
    createdBy: users[0],
    createdAt: '2026-01-10T09:00:00.000Z',
    documentCount: 2
  },
  {
    _id: '65f000000000000000000052',
    name: 'Dossiers Budgétaires',
    parent: null,
    department: departments[2],
    status: 'En cours',
    createdBy: users[0],
    createdAt: '2026-01-15T10:00:00.000Z',
    documentCount: 1
  }
];

// Seed Incoming Documents
let incomingDocuments = [
  {
    _id: '65f000000000000000000061',
    serialNumber: 1,
    year: 2026,
    arrivalDate: '2026-02-15',
    correspondenceNumber: 'MIN-FIN/2026/089',
    correspondenceDate: '2026-02-12',
    typeDocument: 'Courrier officiel',
    source: 'Ministère des Finances',
    subject: 'Notification des crédits alloués pour l\'exercice 2026',
    assignedTo: [{ id: departments[2]._id, name: departments[2].name }],
    activity: 'Exécution budgétaire',
    dateActivity: '2026-03-31',
    folder: folders[1]._id,
    responsibleUser: users[0],
    createdAt: '2026-02-15T11:00:00.000Z'
  },
  {
    _id: '65f000000000000000000062',
    serialNumber: 2,
    year: 2026,
    arrivalDate: '2026-03-01',
    correspondenceNumber: 'RH-DIR/2026/014',
    correspondenceDate: '2026-02-27',
    typeDocument: 'Circulaire',
    source: 'Secrétariat Général',
    subject: 'Mise en application du nouveau protocole de dématérialisation',
    assignedTo: [{ id: departments[0]._id, name: departments[0].name }, { id: departments[1]._id, name: departments[1].name }],
    activity: 'Information générale',
    dateActivity: '2026-03-15',
    folder: folders[0]._id,
    responsibleUser: users[0],
    createdAt: '2026-03-01T09:30:00.000Z'
  }
];

// Seed Outgoing Documents
let outgoingDocuments = [
  {
    _id: '65f000000000000000000071',
    serialNumber: 1,
    year: 2026,
    issueDate: '2026-02-20',
    typeDocument: 'Note de service',
    source: { id: departments[0]._id, name: departments[0].name },
    assignedTo: ['Ensemble des départements'],
    pourInfo: ['Cabinet'],
    subject: 'Organisation des flux documentaires et archivage numérique 2026',
    folder: folders[0]._id,
    createdAt: '2026-02-20T14:00:00.000Z'
  }
];

// Seed Document Options
let documentOptions = [
  { _id: '65f000000000000000000081', category: 'typeDocument', name: 'Courrier officiel', code: 'COURRIER', isActive: true },
  { _id: '65f000000000000000000082', category: 'typeDocument', name: 'Note de service', code: 'NOTE', isActive: true },
  { _id: '65f000000000000000000083', category: 'typeDocument', name: 'Circulaire', code: 'CIRCULAIRE', isActive: true },
  { _id: '65f000000000000000000084', category: 'typeDocument', name: 'Bordereau d\'envoi', code: 'BORDEREAU', isActive: true },
  { _id: '65f000000000000000000085', category: 'source', name: 'Ministère des Finances', code: 'MIN_FIN', isActive: true },
  { _id: '65f000000000000000000086', category: 'source', name: 'Secrétariat Général', code: 'SEC_GEN', isActive: true }
];

// Seed Audit Logs
let auditLogs = [
  {
    _id: '65f000000000000000000091',
    user: users[0],
    userId: users[0]._id,
    userDetails: {
      username: users[0].username,
      role: users[0].role
    },
    action: 'user_login',
    entityType: 'user',
    entityId: users[0]._id,
    details: { message: 'Connexion de l\'administrateur système' },
    ipAddress: '127.0.0.1',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    timestamp: new Date(Date.now() - 3600000).toISOString()
  },
  {
    _id: '65f000000000000000000092',
    user: users[0],
    userId: users[0]._id,
    userDetails: {
      username: users[0].username,
      role: users[0].role
    },
    action: 'document_create',
    entityType: 'document',
    entityId: incomingDocuments[0]._id,
    details: { subject: incomingDocuments[0].subject },
    ipAddress: '127.0.0.1',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    timestamp: new Date(Date.now() - 7200000).toISOString()
  },
  {
    _id: '65f000000000000000000093',
    user: users[0],
    userId: users[0]._id,
    userDetails: {
      username: users[0].username,
      role: users[0].role
    },
    action: 'folder_create',
    entityType: 'folder',
    entityId: folders[0]._id,
    details: { name: folders[0].name },
    ipAddress: '127.0.0.1',
    createdAt: new Date(Date.now() - 14400000).toISOString(),
    timestamp: new Date(Date.now() - 14400000).toISOString()
  }
];

// Seed Messages
let messages = [];

// Seed Templates
let templates = [];

function generateToken(user) {
  return jwt.sign(
    { id: user._id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRE }
  );
}

function getSafeUser(user) {
  const { password, ...safe } = user;
  return safe;
}

module.exports = {
  users,
  departments,
  folders,
  incomingDocuments,
  outgoingDocuments,
  documentOptions,
  auditLogs,
  messages,
  templates,
  generateToken,
  getSafeUser,
  JWT_SECRET,
  JWT_EXPIRE
};
