const express = require('express');
const jwt = require('jsonwebtoken');
const mockDb = require('./mockDb');

const router = express.Router();

// Helper to extract authenticated user from token
function getAuthUser(req) {
  let token = null;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, mockDb.JWT_SECRET);
    const user = mockDb.users.find(u => u._id === decoded.id) || mockDb.users[0];
    return user;
  } catch (e) {
    return null;
  }
}

function requireAuth(req, res, next) {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Non autorisé' });
  }
  req.user = user;
  next();
}

// Health and info
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.get('/info', (req, res) => {
  res.json({ version: '1.0.0', environment: 'development' });
});

router.get('/test', (req, res) => {
  res.json({ message: 'API is working' });
});

// AUTH
router.post('/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username) {
    return res.status(400).json({ success: false, error: 'Nom d\'utilisateur requis' });
  }
  let user = mockDb.users.find(u => u.username.toLowerCase() === username.toLowerCase());
  if (!user) {
    // If not found, create or allow default admin login
    if (username.toLowerCase() === 'admin') {
      user = mockDb.users[0];
    } else {
      user = {
        _id: 'user_' + Date.now(),
        username: username,
        password: password || 'admin123',
        role: username.toLowerCase().includes('dept') ? 'AdminDepartment' : 'Admin',
        departments: [mockDb.departments[0]],
        activeDepartment: mockDb.departments[0],
        photo: '',
        isActive: true,
        createdAt: new Date().toISOString()
      };
      mockDb.users.push(user);
    }
  }

  const token = mockDb.generateToken(user);
  res.cookie('token', token, { httpOnly: true, maxAge: 30 * 24 * 60 * 60 * 1000 });
  res.json({
    success: true,
    token,
    user: mockDb.getSafeUser(user)
  });
});

router.get('/auth/me', requireAuth, (req, res) => {
  res.json({
    success: true,
    data: mockDb.getSafeUser(req.user)
  });
});

router.post('/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true, data: {} });
});

router.get('/auth/test-admin', (req, res) => {
  res.json({ success: true, message: 'Admin user exists', username: 'admin' });
});

router.post('/auth/reset-admin', (req, res) => {
  const admin = mockDb.users.find(u => u.username === 'admin');
  if (admin) admin.password = 'admin123';
  res.json({ success: true, message: 'Admin password reset successfully', username: 'admin', password: 'admin123' });
});

router.put('/auth/switchdepartment/:departmentId', requireAuth, (req, res) => {
  const dept = mockDb.departments.find(d => d._id === req.params.departmentId);
  if (dept) {
    req.user.activeDepartment = dept;
  }
  res.json({ success: true, data: mockDb.getSafeUser(req.user) });
});

router.put('/auth/updatepassword', requireAuth, (req, res) => {
  const { newPassword } = req.body;
  if (newPassword) req.user.password = newPassword;
  res.json({ success: true, message: 'Mot de passe mis à jour' });
});

// DEPARTMENTS
router.get('/departments', (req, res) => {
  res.json({ success: true, count: mockDb.departments.length, data: mockDb.departments });
});

router.get('/departments/:id', (req, res) => {
  const dept = mockDb.departments.find(d => d._id === req.params.id);
  if (!dept) return res.status(404).json({ success: false, error: 'Département non trouvé' });
  res.json({ success: true, data: dept });
});

router.post('/departments', requireAuth, (req, res) => {
  const newDept = {
    _id: 'dept_' + Date.now(),
    name: req.body.name || 'Nouveau Département',
    description: req.body.description || '',
    isActive: true,
    createdAt: new Date().toISOString(),
    createdBy: { username: req.user.username }
  };
  mockDb.departments.push(newDept);
  res.status(201).json({ success: true, data: newDept });
});

router.put('/departments/:id', requireAuth, (req, res) => {
  const idx = mockDb.departments.findIndex(d => d._id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Département non trouvé' });
  mockDb.departments[idx] = { ...mockDb.departments[idx], ...req.body };
  res.json({ success: true, data: mockDb.departments[idx] });
});

router.delete('/departments/:id', requireAuth, (req, res) => {
  mockDb.departments = mockDb.departments.filter(d => d._id !== req.params.id);
  res.json({ success: true, data: {} });
});

// USERS
router.get('/users', (req, res) => {
  const safeUsers = mockDb.users.map(u => mockDb.getSafeUser(u));
  res.json({ success: true, count: safeUsers.length, data: safeUsers });
});

router.get('/users/:id', (req, res) => {
  const user = mockDb.users.find(u => u._id === req.params.id);
  if (!user) return res.status(404).json({ success: false, error: 'Utilisateur non trouvé' });
  res.json({ success: true, data: mockDb.getSafeUser(user) });
});

router.post('/users', requireAuth, (req, res) => {
  const newUser = {
    _id: 'user_' + Date.now(),
    username: req.body.username,
    password: req.body.password || 'admin123',
    role: req.body.role || 'User',
    departments: (req.body.departments || []).map(id => mockDb.departments.find(d => d._id === id)).filter(Boolean),
    activeDepartment: null,
    photo: '',
    isActive: req.body.isActive !== false,
    createdAt: new Date().toISOString()
  };
  if (newUser.departments.length > 0) {
    newUser.activeDepartment = newUser.departments[0];
  }
  mockDb.users.push(newUser);
  res.status(201).json({ success: true, data: mockDb.getSafeUser(newUser) });
});

router.put('/users/:id', requireAuth, (req, res) => {
  const idx = mockDb.users.findIndex(u => u._id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Utilisateur non trouvé' });
  const updated = { ...mockDb.users[idx], ...req.body };
  if (req.body.departments) {
    updated.departments = req.body.departments.map(id => mockDb.departments.find(d => d._id === id)).filter(Boolean);
  }
  mockDb.users[idx] = updated;
  res.json({ success: true, data: mockDb.getSafeUser(updated) });
});

router.delete('/users/:id', requireAuth, (req, res) => {
  mockDb.users = mockDb.users.filter(u => u._id !== req.params.id);
  res.json({ success: true, data: {} });
});

// FOLDERS
router.get('/folders', (req, res) => {
  const deptId = req.query.department || req.query.departmentId;
  let result = mockDb.folders;
  if (deptId) {
    result = result.filter(f => (f.department?._id === deptId || f.department === deptId));
  }
  res.json({ success: true, count: result.length, data: result });
});

router.post('/folders', requireAuth, (req, res) => {
  const dept = mockDb.departments.find(d => d._id === req.body.department) || mockDb.departments[0];
  const newFolder = {
    _id: 'folder_' + Date.now(),
    name: req.body.name || 'Nouveau Dossier',
    parent: req.body.parent || null,
    department: dept,
    status: req.body.status || 'En cours',
    createdBy: mockDb.getSafeUser(req.user),
    createdAt: new Date().toISOString(),
    documentCount: 0
  };
  mockDb.folders.push(newFolder);
  res.status(201).json({ success: true, data: newFolder });
});

router.get('/folders/:id', (req, res) => {
  const folder = mockDb.folders.find(f => f._id === req.params.id);
  if (!folder) return res.status(404).json({ success: false, error: 'Dossier non trouvé' });
  res.json({ success: true, data: folder });
});

router.put('/folders/:id', requireAuth, (req, res) => {
  const idx = mockDb.folders.findIndex(f => f._id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Dossier non trouvé' });
  mockDb.folders[idx] = { ...mockDb.folders[idx], ...req.body };
  res.json({ success: true, data: mockDb.folders[idx] });
});

router.delete('/folders/:id', requireAuth, (req, res) => {
  mockDb.folders = mockDb.folders.filter(f => f._id !== req.params.id);
  res.json({ success: true, data: {} });
});

// INCOMING DOCUMENTS
router.get('/incoming-documents', (req, res) => {
  let result = mockDb.incomingDocuments;
  if (req.query.year) {
    result = result.filter(d => String(d.year) === String(req.query.year));
  }
  if (req.query.q) {
    const q = req.query.q.toLowerCase();
    result = result.filter(d => 
      (d.subject && d.subject.toLowerCase().includes(q)) ||
      (d.correspondenceNumber && d.correspondenceNumber.toLowerCase().includes(q)) ||
      (d.source && d.source.toLowerCase().includes(q))
    );
  }
  res.json({ success: true, count: result.length, data: result });
});

router.get('/incoming-documents/:id', (req, res) => {
  const doc = mockDb.incomingDocuments.find(d => d._id === req.params.id);
  if (!doc) return res.status(404).json({ success: false, error: 'Document non trouvé' });
  res.json({ success: true, data: doc });
});

router.post('/incoming-documents', requireAuth, (req, res) => {
  const year = parseInt(req.body.year) || new Date().getFullYear();
  const serial = mockDb.incomingDocuments.filter(d => d.year === year).length + 1;
  const newDoc = {
    _id: 'inc_' + Date.now(),
    serialNumber: req.body.serialNumber ? parseInt(req.body.serialNumber) : serial,
    year,
    arrivalDate: req.body.arrivalDate || new Date().toISOString().split('T')[0],
    correspondenceNumber: req.body.correspondenceNumber || `COR-${year}-${serial}`,
    correspondenceDate: req.body.correspondenceDate || new Date().toISOString().split('T')[0],
    typeDocument: req.body.typeDocument || 'Courrier',
    source: req.body.source || 'Externe',
    subject: req.body.subject || 'Sans objet',
    assignedTo: req.body.assignedTo || [],
    activity: req.body.activity || '',
    dateActivity: req.body.dateActivity || '',
    folder: req.body.folder || null,
    responsibleUser: req.user,
    createdAt: new Date().toISOString()
  };
  mockDb.incomingDocuments.unshift(newDoc);
  res.status(201).json({ success: true, data: newDoc });
});

router.put('/incoming-documents/:id', requireAuth, (req, res) => {
  const idx = mockDb.incomingDocuments.findIndex(d => d._id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Document non trouvé' });
  mockDb.incomingDocuments[idx] = { ...mockDb.incomingDocuments[idx], ...req.body };
  res.json({ success: true, data: mockDb.incomingDocuments[idx] });
});

router.delete('/incoming-documents/:id', requireAuth, (req, res) => {
  mockDb.incomingDocuments = mockDb.incomingDocuments.filter(d => d._id !== req.params.id);
  res.json({ success: true, data: {} });
});

// OUTGOING DOCUMENTS
router.get('/outgoing-documents', (req, res) => {
  let result = mockDb.outgoingDocuments;
  if (req.query.year) {
    result = result.filter(d => String(d.year) === String(req.query.year));
  }
  if (req.query.q) {
    const q = req.query.q.toLowerCase();
    result = result.filter(d => 
      (d.subject && d.subject.toLowerCase().includes(q)) ||
      (d.source?.name && d.source.name.toLowerCase().includes(q))
    );
  }
  res.json({ success: true, count: result.length, data: result });
});

router.get('/outgoing-documents/:id', (req, res) => {
  const doc = mockDb.outgoingDocuments.find(d => d._id === req.params.id);
  if (!doc) return res.status(404).json({ success: false, error: 'Document non trouvé' });
  res.json({ success: true, data: doc });
});

router.post('/outgoing-documents', requireAuth, (req, res) => {
  const year = parseInt(req.body.year) || new Date().getFullYear();
  const serial = mockDb.outgoingDocuments.filter(d => d.year === year).length + 1;
  const newDoc = {
    _id: 'out_' + Date.now(),
    serialNumber: req.body.serialNumber ? parseInt(req.body.serialNumber) : serial,
    year,
    issueDate: req.body.issueDate || new Date().toISOString().split('T')[0],
    typeDocument: req.body.typeDocument || 'Note de service',
    source: req.body.source || { id: mockDb.departments[0]._id, name: mockDb.departments[0].name },
    assignedTo: req.body.assignedTo || [],
    pourInfo: req.body.pourInfo || [],
    subject: req.body.subject || 'Sans objet',
    folder: req.body.folder || null,
    createdAt: new Date().toISOString()
  };
  mockDb.outgoingDocuments.unshift(newDoc);
  res.status(201).json({ success: true, data: newDoc });
});

router.put('/outgoing-documents/:id', requireAuth, (req, res) => {
  const idx = mockDb.outgoingDocuments.findIndex(d => d._id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Document non trouvé' });
  mockDb.outgoingDocuments[idx] = { ...mockDb.outgoingDocuments[idx], ...req.body };
  res.json({ success: true, data: mockDb.outgoingDocuments[idx] });
});

router.delete('/outgoing-documents/:id', requireAuth, (req, res) => {
  mockDb.outgoingDocuments = mockDb.outgoingDocuments.filter(d => d._id !== req.params.id);
  res.json({ success: true, data: {} });
});

// DOCUMENT OPTIONS
router.get('/document-options', (req, res) => {
  let result = mockDb.documentOptions;
  if (req.query.category) {
    result = result.filter(o => o.category === req.query.category);
  }
  res.json({ success: true, count: result.length, data: result });
});

router.post('/document-options', requireAuth, (req, res) => {
  const newOpt = {
    _id: 'opt_' + Date.now(),
    category: req.body.category || 'typeDocument',
    name: req.body.name,
    code: req.body.code || req.body.name.toUpperCase().replace(/\s+/g, '_'),
    isActive: true
  };
  mockDb.documentOptions.push(newOpt);
  res.status(201).json({ success: true, data: newOpt });
});

router.put('/document-options/:id', requireAuth, (req, res) => {
  const idx = mockDb.documentOptions.findIndex(o => o._id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Option non trouvée' });
  mockDb.documentOptions[idx] = { ...mockDb.documentOptions[idx], ...req.body };
  res.json({ success: true, data: mockDb.documentOptions[idx] });
});

router.delete('/document-options/:id', requireAuth, (req, res) => {
  mockDb.documentOptions = mockDb.documentOptions.filter(o => o._id !== req.params.id);
  res.json({ success: true, data: {} });
});

// SERIAL NUMBER
router.get('/serial-number/next', (req, res) => {
  const year = parseInt(req.query.year) || new Date().getFullYear();
  const type = req.query.type || 'incoming';
  const list = type === 'outgoing' ? mockDb.outgoingDocuments : mockDb.incomingDocuments;
  const count = list.filter(d => d.year === year).length;
  const nextSerial = count + 1;
  res.json({
    success: true,
    data: {
      nextSerial,
      formattedSerial: `${year}/${String(nextSerial).padStart(3, '0')}`
    }
  });
});

router.get('/serial-number', (req, res) => {
  res.json({
    success: true,
    data: {
      currentYear: new Date().getFullYear(),
      incomingNextSerial: mockDb.incomingDocuments.length + 1,
      outgoingNextSerial: mockDb.outgoingDocuments.length + 1
    }
  });
});

// NOTIFICATIONS & AUDIT
router.get('/activity-notifications', (req, res) => {
  res.json({ success: true, count: 0, data: [] });
});

router.get('/activity-notifications/count', (req, res) => {
  res.json({ success: true, count: 0 });
});

router.put('/activity-notifications/:id/read', (req, res) => {
  res.json({ success: true, message: 'Notification marquée comme lue' });
});

router.delete('/activity-notifications/:id', (req, res) => {
  res.json({ success: true, message: 'Notification supprimée' });
});

router.get('/responsible-notifications', (req, res) => {
  res.json({ success: true, count: 0, data: [] });
});

router.get('/responsible-notifications/unread', (req, res) => {
  res.json({ success: true, count: 0, data: [] });
});

router.put('/responsible-notifications/:id/read', (req, res) => {
  res.json({ success: true, message: 'Notification marquée comme lue' });
});

router.put('/responsible-notifications/:id/dismiss', (req, res) => {
  res.json({ success: true, message: 'Notification ignorée' });
});

router.get('/audit-logs', (req, res) => {
  let logs = [...mockDb.auditLogs];
  if (req.query && req.query.limit) {
    const limit = parseInt(req.query.limit, 10);
    if (!isNaN(limit) && limit > 0) {
      logs = logs.slice(0, limit);
    }
  }
  res.json({ success: true, count: logs.length, data: logs });
});

router.post('/audit-logs', requireAuth, (req, res) => {
  const newLog = {
    _id: 'audit_' + Date.now(),
    action: req.body.action || 'system_action',
    entityType: req.body.entityType || 'user',
    entityId: req.body.entityId || req.user._id,
    userId: req.user._id,
    userDetails: {
      username: req.user.username,
      role: req.user.role
    },
    details: req.body.details || {},
    ipAddress: req.ip || '127.0.0.1',
    createdAt: new Date().toISOString(),
    timestamp: new Date().toISOString()
  };
  mockDb.auditLogs.unshift(newLog);
  res.status(201).json({ success: true, data: newLog });
});

router.get('/messages', (req, res) => {
  res.json({ success: true, count: mockDb.messages.length, data: mockDb.messages });
});

router.get('/messages/unread/count', (req, res) => {
  res.json({ success: true, count: 0 });
});

router.post('/messages', requireAuth, (req, res) => {
  const newMsg = {
    _id: 'msg_' + Date.now(),
    sender: mockDb.getSafeUser(req.user),
    recipients: req.body.recipients || [],
    subject: req.body.subject || 'Sans sujet',
    content: req.body.content || '',
    createdAt: new Date().toISOString()
  };
  mockDb.messages.push(newMsg);
  res.status(201).json({ success: true, data: newMsg });
});

router.get('/templates', (req, res) => {
  res.json({ success: true, count: mockDb.templates.length, data: mockDb.templates });
});

router.get('/scan/status', (req, res) => {
  res.json({
    success: true,
    data: {
      connected: true,
      mode: 'simulation',
      activeDevice: 'Simulated Scanner S1'
    }
  });
});

router.get('/scan/devices', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 'sim_device_1', name: 'Simulated Scanner S1', type: 'Flatbed', status: 'available' }
    ]
  });
});

router.get('/scan/recent', (req, res) => {
  res.json({ success: true, data: [] });
});

router.post('/scan/start', (req, res) => {
  res.json({
    success: true,
    data: {
      message: 'Numérisation simulée effectuée avec succès',
      scannedDocument: '/placeholder.svg'
    }
  });
});

router.get('/message-settings', (req, res) => {
  res.json({ success: true, data: { retentionPeriodDays: 90 } });
});

router.get('/backup/history', (req, res) => {
  res.json({ success: true, data: [] });
});

router.get('/backup/policy', (req, res) => {
  res.json({ success: true, data: { autoBackup: false } });
});

let mockDeclarations = [
  {
    _id: 'decl_1',
    personnelId: {
      _id: '65f000000000000000000050',
      nom: 'بن علي',
      prenom: 'كريم',
      matricule: 'EMP-001',
      activeDepartment: { _id: '65f000000000000000000020', name: 'Ressources Humaines' }
    },
    userId: { _id: '65f000000000000000000001', username: 'admin' },
    departmentId: { _id: '65f000000000000000000020', name: 'Ressources Humaines', code: 'RH' },
    date: new Date(Date.now() + 86400000).toISOString(),
    statut: 'absent',
    motif: 'service',
    leaveReasonId: { _id: 'lr_service', nom: 'مهمة عمل / مصلحة', code: 'service', impacteSolde: false },
    detailsMotif: {
      nomService: 'وزارة المالية',
      commentaire: 'إيداع الكشوفات الدورية'
    },
    heureArrivee: '',
    validationStatus: 'en_attente',
    createdAt: new Date().toISOString()
  }
];

let mockLeaveReasons = [
  { _id: 'lr_conge', nom: 'عطلة سنوية', code: 'conge_annuel', categorie: 'conge', impacteSolde: true, isActive: true },
  { _id: 'lr_service', nom: 'مصلحة إدارية', code: 'service', categorie: 'service', impacteSolde: false, requiresServiceName: true, isActive: true },
  { _id: 'lr_mission', nom: 'مأمورية عمل', code: 'mission', categorie: 'mission', impacteSolde: false, requiresLieu: true, requiresObjet: true, isActive: true },
  { _id: 'lr_maladie', nom: 'إجازة مرضية', code: 'maladie', categorie: 'maladie', impacteSolde: false, isActive: true },
  { _id: 'lr_formation', nom: 'تكوين / تدريب', code: 'formation', categorie: 'formation', impacteSolde: false, requiresFormationDetails: true, isActive: true }
];

router.get('/hr/leave-reasons', (req, res) => {
  res.json({ success: true, count: mockLeaveReasons.length, data: mockLeaveReasons });
});

router.post('/attendance/declarations', (req, res) => {
  const user = getAuthUser(req) || mockDb.users[0];
  const newDecl = {
    _id: 'decl_' + Date.now(),
    personnelId: {
      _id: '65f000000000000000000050',
      nom: user.username,
      prenom: '',
      matricule: 'EMP-' + Math.floor(100 + Math.random() * 900),
      activeDepartment: mockDb.departments[1]
    },
    userId: user,
    departmentId: mockDb.departments[1],
    date: req.body.date,
    statut: req.body.statut,
    motif: req.body.motif || '',
    leaveReasonId: mockLeaveReasons.find(r => r._id === req.body.leaveReasonId || r.code === req.body.motif) || null,
    detailsMotif: req.body.detailsMotif || {},
    heureArrivee: req.body.heureArrivee || '',
    validationStatus: 'en_attente',
    createdAt: new Date().toISOString()
  };
  mockDeclarations.unshift(newDecl);
  res.status(201).json({ success: true, data: newDecl });
});

router.get('/attendance/declarations/me', (req, res) => {
  res.json({ success: true, count: mockDeclarations.length, data: mockDeclarations });
});

router.get('/attendance/declarations', (req, res) => {
  let list = [...mockDeclarations];
  if (req.query.validationStatus && req.query.validationStatus !== 'all') {
    list = list.filter(d => d.validationStatus === req.query.validationStatus);
  }
  res.json({ success: true, count: list.length, data: list });
});

router.put('/attendance/declarations/:id/approve', (req, res) => {
  const decl = mockDeclarations.find(d => d._id === req.params.id);
  if (!decl) return res.status(404).json({ success: false, message: 'Déclaration introuvable' });
  decl.validationStatus = 'approuvee';
  decl.validatedBy = { username: 'Admin' };
  decl.validatedAt = new Date().toISOString();
  if (req.body.adminComment) decl.adminComment = req.body.adminComment;
  res.json({ success: true, message: 'Déclaration approuvée', data: decl });
});

router.put('/attendance/declarations/:id/reject', (req, res) => {
  const decl = mockDeclarations.find(d => d._id === req.params.id);
  if (!decl) return res.status(404).json({ success: false, message: 'Déclaration introuvable' });
  decl.validationStatus = 'rejetee';
  decl.validatedBy = { username: 'Admin' };
  decl.validatedAt = new Date().toISOString();
  decl.rejectionReason = req.body.reason || req.body.rejectionReason || '';
  if (req.body.adminComment) decl.adminComment = req.body.adminComment;
  res.json({ success: true, message: 'Déclaration rejetée', data: decl });
});

router.put('/attendance/declarations/:id', (req, res) => {
  const decl = mockDeclarations.find(d => d._id === req.params.id);
  if (!decl) return res.status(404).json({ success: false, message: 'Déclaration introuvable' });
  Object.assign(decl, req.body, { validationStatus: 'modifiee' });
  res.json({ success: true, message: 'Déclaration modifiée', data: decl });
});

router.delete('/attendance/declarations/:id', (req, res) => {
  mockDeclarations = mockDeclarations.filter(d => d._id !== req.params.id);
  res.json({ success: true, message: 'Déclaration supprimée' });
});

// ============================================================
// MOCK RH DATA & ROUTES (Fallback when Mongo is offline)
// ============================================================

let mockEcoles = [
  { _id: 'ecole_1', nom: 'École Nationale d\'Administration', nomAr: 'المدرسة الوطنية للإدارة', pays: 'Tunisie', ville: 'Tunis', type: 'Public', isActive: true },
  { _id: 'ecole_2', nom: 'Institut des Hautes Études Commerciales', nomAr: 'معهد الدراسات التجارية العليا', pays: 'Tunisie', ville: 'Carthage', type: 'Public', isActive: true },
  { _id: 'ecole_3', nom: 'École Polytechnique de Paris', nomAr: 'المدرسة متعددة التقنيات بباريس', pays: 'France', ville: 'Paris', type: 'Public', isActive: true },
];

let mockTypesFormation = [
  { _id: 'type_1', code: 'GEST_ADMIN', nom: 'Gestion administrative moderne', nomAr: 'التصرف الإداري الحديث', categorie: 'continue', isActive: true },
  { _id: 'type_2', code: 'NUM_ARCHIV', nom: 'Numérisation et archivage électronique', nomAr: 'الرقمنة والأرشفة الإلكترونية', categorie: 'technique', isActive: true },
  { _id: 'type_3', code: 'CYBER_SEC', nom: 'Sécurité informatique et protection des données', nomAr: 'أمن المعلومات وحماية المعطيات', categorie: 'technique', isActive: true },
];

let mockStages = [
  {
    _id: 'stage_1',
    personnelId: {
      _id: '65f000000000000000000050',
      nom: 'بن علي',
      prenom: 'كريم',
      matricule: 'EMP-001',
      poste: 'Chef de division',
      activeDepartment: { _id: '65f000000000000000000020', name: 'Ressources Humaines' }
    },
    localisation: 'tunisie',
    pays: 'Tunisie',
    lieuStage: 'Tunis',
    sujetStage: 'Cycle supérieur en gouvernance numérique',
    ecoleId: mockEcoles[0],
    typeFormationId: mockTypesFormation[0],
    dateDebut: '2024-01-15',
    dateFin: '2024-03-15',
    statut: 'acheve',
    resultat: 'admis',
    mention: 'Très bien',
    observations: 'Participation exemplaire',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

let mockPromotions = [];
let mockPostes = [];
let mockDiplomes = [];
let mockSanctions = [];

// Référentiels
router.get('/hr/references/ecoles', (req, res) => {
  res.json({ success: true, count: mockEcoles.length, data: mockEcoles });
});

router.post('/hr/references/ecoles', (req, res) => {
  const newEcole = { _id: 'ecole_' + Date.now(), isActive: true, ...req.body };
  mockEcoles.push(newEcole);
  res.status(201).json({ success: true, data: newEcole });
});

router.get('/hr/references/types-formation', (req, res) => {
  res.json({ success: true, count: mockTypesFormation.length, data: mockTypesFormation });
});

router.post('/hr/references/types-formation', (req, res) => {
  const newType = { _id: 'type_' + Date.now(), isActive: true, ...req.body };
  mockTypesFormation.push(newType);
  res.status(201).json({ success: true, data: newType });
});

// Stages
router.get('/hr/stages/stats', (req, res) => {
  const tunisie = mockStages.filter(s => s.localisation === 'tunisie').length;
  const etranger = mockStages.filter(s => s.localisation === 'etranger').length;
  res.json({
    success: true,
    data: {
      total: mockStages.length,
      parLocalisation: { tunisie, etranger },
      parStatut: { acheve: mockStages.filter(s => s.statut === 'acheve').length },
      parResultat: { admis: mockStages.filter(s => s.resultat === 'admis').length }
    }
  });
});

router.get('/hr/stages', (req, res) => {
  let list = [...mockStages];
  if (req.query.personnelId) {
    list = list.filter(s => (s.personnelId?._id || s.personnelId) === req.query.personnelId);
  }
  if (req.query.localisation) {
    list = list.filter(s => s.localisation === req.query.localisation);
  }
  if (req.query.statut) {
    list = list.filter(s => s.statut === req.query.statut);
  }
  res.json({
    success: true,
    count: list.length,
    pagination: { total: list.length, page: 1, pages: 1, limit: 10 },
    data: list
  });
});

router.get('/hr/stages/:id', (req, res) => {
  const item = mockStages.find(s => s._id === req.params.id);
  if (!item) return res.status(404).json({ success: false, message: 'Stage introuvable' });
  res.json({ success: true, data: item });
});

router.post('/hr/stages', (req, res) => {
  const newStage = {
    _id: 'stage_' + Date.now(),
    ...req.body,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  mockStages.push(newStage);
  res.status(201).json({ success: true, data: newStage });
});

router.put('/hr/stages/:id', (req, res) => {
  const item = mockStages.find(s => s._id === req.params.id);
  if (!item) return res.status(404).json({ success: false, message: 'Stage introuvable' });
  Object.assign(item, req.body, { updatedAt: new Date().toISOString() });
  res.json({ success: true, data: item });
});

router.delete('/hr/stages/:id', (req, res) => {
  mockStages = mockStages.filter(s => s._id !== req.params.id);
  res.json({ success: true, message: 'Stage supprimé' });
});

router.get('/hr/personnel/:personnelId/stages', (req, res) => {
  const list = mockStages.filter(s => (s.personnelId?._id || s.personnelId) === req.params.personnelId);
  res.json({
    success: true,
    count: list.length,
    data: {
      tunisie: list.filter(s => s.localisation === 'tunisie'),
      etranger: list.filter(s => s.localisation === 'etranger')
    }
  });
});

// Personnel History (Promotions, Postes, Diplomes, Sanctions)
router.get('/hr/personnel/:personnelId/promotions', (req, res) => {
  const list = mockPromotions.filter(p => p.personnelId === req.params.personnelId);
  res.json({ success: true, count: list.length, data: list });
});
router.post('/hr/personnel/:personnelId/promotions', (req, res) => {
  const item = { _id: 'promo_' + Date.now(), personnelId: req.params.personnelId, ...req.body, createdAt: new Date().toISOString() };
  mockPromotions.push(item);
  res.status(201).json({ success: true, data: item });
});

router.get('/hr/personnel/:personnelId/postes', (req, res) => {
  const list = mockPostes.filter(p => p.personnelId === req.params.personnelId);
  res.json({ success: true, count: list.length, data: list });
});
router.post('/hr/personnel/:personnelId/postes', (req, res) => {
  const item = { _id: 'poste_' + Date.now(), personnelId: req.params.personnelId, ...req.body, createdAt: new Date().toISOString() };
  mockPostes.push(item);
  res.status(201).json({ success: true, data: item });
});

router.get('/hr/personnel/:personnelId/diplomes', (req, res) => {
  const list = mockDiplomes.filter(d => d.personnelId === req.params.personnelId);
  res.json({ success: true, count: list.length, data: list });
});
router.post('/hr/personnel/:personnelId/diplomes', (req, res) => {
  const item = { _id: 'diplome_' + Date.now(), personnelId: req.params.personnelId, ...req.body, createdAt: new Date().toISOString() };
  mockDiplomes.push(item);
  res.status(201).json({ success: true, data: item });
});

router.get('/hr/personnel/:personnelId/sanctions', (req, res) => {
  const list = mockSanctions.filter(s => s.personnelId === req.params.personnelId);
  res.json({ success: true, count: list.length, data: list });
});
router.post('/hr/personnel/:personnelId/sanctions', (req, res) => {
  const item = { _id: 'sanction_' + Date.now(), personnelId: req.params.personnelId, ...req.body, createdAt: new Date().toISOString() };
  mockSanctions.push(item);
  res.status(201).json({ success: true, data: item });
});

router.get('/hr/personnel/:personnelId/full-history', (req, res) => {
  const pid = req.params.personnelId;
  res.json({
    success: true,
    data: {
      promotions: mockPromotions.filter(p => p.personnelId === pid),
      postes: mockPostes.filter(p => p.personnelId === pid),
      diplomes: mockDiplomes.filter(d => d.personnelId === pid),
      sanctions: mockSanctions.filter(s => s.personnelId === pid)
    }
  });
});

router.get('/hr/my-profile/full-history', (req, res) => {
  res.json({
    success: true,
    data: {
      promotions: [],
      postes: [],
      diplomes: [],
      sanctions: []
    }
  });
});

module.exports = router;
