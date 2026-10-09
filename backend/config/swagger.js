const path = require('path');
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'DMS API — Système de Gestion de Courrier et Personnel',
      version: '1.0.0',
      description: 'Documentation complète de l\'API du système DMS (Courrier entrant/sortant, RH, Sauvegardes, IA).',
      contact: {
        name: 'DMS Support',
      },
    },
    servers: [
      { url: 'http://localhost:5000', description: 'Backend seul' },
      { url: 'http://localhost:3000', description: 'Fullstack Vite' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'Message d\'erreur' },
          },
        },
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string' },
            role: { type: 'string' },
            department: { type: 'string' },
          },
        },
        IncomingDocument: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            title: { type: 'string' },
            referenceNumber: { type: 'string' },
            sender: { type: 'string' },
            status: { type: 'string' },
            date: { type: 'string', format: 'date-time' },
          },
        },
        OutgoingDocument: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            title: { type: 'string' },
            referenceNumber: { type: 'string' },
            recipient: { type: 'string' },
            status: { type: 'string' },
          },
        },
        Personnel: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            matricule: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            department: { type: 'string' },
            position: { type: 'string' },
            status: { type: 'string' },
          },
        },
        Backup: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            fileName: { type: 'string' },
            size: { type: 'number' },
            type: { type: 'string', enum: ['manual', 'automatic'] },
            status: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      { name: 'Système', description: 'Statut et santé du serveur' },
      { name: 'Authentification', description: 'Connexion, profil et jetons JWT' },
      { name: 'Courriers Entrants', description: 'Gestion des documents entrants et OCR' },
      { name: 'Courriers Sortants', description: 'Gestion des courriers sortants et décharges' },
      { name: 'Ressources Humaines', description: 'Personnel, congés, présences et stages' },
      { name: 'Sauvegardes', description: 'Politiques, historique et restauration' },
      { name: 'IA & OCR', description: 'Résumé, traduction et extraction assistée' },
    ],
    paths: {
      '/api/test': {
        get: {
          summary: 'Tester la connectivité de l\'API',
          tags: ['Système'],
          responses: {
            200: {
              description: 'API fonctionnelle',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { type: 'string', example: 'API is working' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/auth/login': {
        post: {
          summary: 'Connexion utilisateur',
          tags: ['Authentification'],
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', format: 'email', example: 'admin@dms.tn' },
                    password: { type: 'string', example: 'Password123' },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Authentification réussie avec jeton JWT',
            },
            401: {
              description: 'Identifiants invalides',
            },
          },
        },
      },
      '/api/auth/me': {
        get: {
          summary: 'Informations de l\'utilisateur connecté',
          tags: ['Authentification'],
          responses: {
            200: {
              description: 'Profil utilisateur',
            },
            401: {
              description: 'Non authentifié',
            },
          },
        },
      },
      '/api/incoming-documents': {
        get: {
          summary: 'Lister les courriers entrants',
          tags: ['Courriers Entrants'],
          responses: {
            200: {
              description: 'Liste des courriers entrants paginée',
            },
          },
        },
      },
      '/api/outgoing-documents': {
        get: {
          summary: 'Lister les courriers sortants',
          tags: ['Courriers Sortants'],
          responses: {
            200: {
              description: 'Liste des courriers sortants paginée',
            },
          },
        },
      },
      '/api/backup/history': {
        get: {
          summary: 'Historique des sauvegardes du système',
          tags: ['Sauvegardes'],
          responses: {
            200: {
              description: 'Liste des sauvegardes manuelles et programmées',
            },
          },
        },
      },
      '/api/backup/manual': {
        post: {
          summary: 'Déclencher une sauvegarde manuelle',
          tags: ['Sauvegardes'],
          responses: {
            200: {
              description: 'Sauvegarde créée avec succès',
            },
          },
        },
      },
      '/api/backup/restore': {
        post: {
          summary: 'Restaurer une sauvegarde avec confirmation',
          tags: ['Sauvegardes'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['backupId', 'confirmation'],
                  properties: {
                    backupId: { type: 'string' },
                    confirmation: { type: 'string', example: 'CONFIRM_RESTORE' },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Restauration terminée',
            },
          },
        },
      },
      '/api/ai/summarize': {
        post: {
          summary: 'Résumer un texte de document OCR via IA',
          tags: ['IA & OCR'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['ocrText'],
                  properties: {
                    ocrText: { type: 'string', example: 'Texte extrait...' },
                    maxLength: { type: 'number', example: 200 },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Résumé généré',
            },
          },
        },
      },
      '/api/ai/translate': {
        post: {
          summary: 'Traduire un texte entre Arabe et Français via IA',
          tags: ['IA & OCR'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['text', 'sourceLang', 'targetLang'],
                  properties: {
                    text: { type: 'string', example: 'Bonjour' },
                    sourceLang: { type: 'string', enum: ['fr', 'ar'], example: 'fr' },
                    targetLang: { type: 'string', enum: ['fr', 'ar'], example: 'ar' },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Traduction générée',
            },
          },
        },
      },
    },
  },
  apis: [
    path.join(__dirname, '../routes/*.js'),
    './backend/routes/*.js',
    './routes/*.js',
  ],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
