const express = require('express');
const router = express.Router();

// Mock User
const mockAdminUser = {
  _id: 'mock-admin-id-0001',
  username: 'admin',
  name: 'Administrateur',
  role: 'Admin',
  email: 'admin@dms.local',
  isActive: true,
  departments: [
    { _id: 'mock-dept-01', name: 'Direction Générale' },
  ],
  activeDepartment: { _id: 'mock-dept-01', name: 'Direction Générale' },
};

// Auth endpoints
router.post('/auth/login', (req, res) => {
  const username = req.body?.username;
  const password = req.body?.password;

  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ success: false, message: 'Invalid credentials format' });
  }
  if (username.length > 100 || password.length > 200) {
    return res.status(400).json({ success: false, message: 'Invalid credentials format' });
  }

  const token = 'mock-jwt-token-dev-session';
  res.json({
    success: true,
    token,
    user: mockAdminUser,
  });
});

router.get('/auth/me', (req, res) => {
  res.json({
    success: true,
    user: mockAdminUser,
  });
});

router.post('/auth/logout', (req, res) => {
  res.json({ success: true, message: 'Déconnexion réussie' });
});

// AI Health check fallback
router.get('/ai/health', (req, res) => {
  try {
    const { checkOllamaHealth } = require('./services/ollamaService');
    checkOllamaHealth().then(health => res.json({ success: true, data: health }))
      .catch(() => res.json({ success: true, data: { ok: true, engine: 'node-llama-cpp' } }));
  } catch (_) {
    res.json({
      success: true,
      data: {
        ok: true,
        engine: 'node-llama-cpp',
        chatModel: 'qwen2.5-1.5b-instruct-q4_k_m.gguf',
        chatInstalled: true,
        embeddingInstalled: true,
      },
    });
  }
});

// Scan endpoints
router.get('/scan/status', (req, res) => {
  res.json({ success: true, status: 'ready', devices: [] });
});

router.get('/scan/devices', (req, res) => {
  res.json({ success: true, devices: [] });
});

// Generic fallback for any other unhandled GET / POST / etc.
router.use((req, res) => {
  if (req.method === 'GET') {
    const path = req.path;
    if (path.includes('/search') || path.includes('/conversation')) {
      return res.json({
        success: true,
        count: 0,
        data: [],
      });
    }
    if (path.match(/\/[a-f0-9]{24}$/) || (path.match(/\/[^/]+$/) && !path.endsWith('s'))) {
      return res.json({
        success: true,
        data: null,
      });
    }
    return res.json({
      success: true,
      count: 0,
      data: [],
      pagination: { page: 1, limit: 10, total: 0 },
    });
  }

  // Mutations (POST, PUT, DELETE, PATCH)
  res.json({
    success: true,
    message: 'Opération simulée avec succès (Mode Dev)',
    data: { _id: 'mock-' + Date.now(), ...req.body },
  });
});

module.exports = router;
