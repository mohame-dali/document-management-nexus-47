/**
 * Script d'initialisation des motifs d'absence de base (14 motifs)
 * 
 * UTILISATION (manuelle, à exécuter après validation) :
 *   cd backend
 *   node scripts/seedLeaveReasons.js
 * 
 * ⚠️ Ce script NE DOIT PAS être exécuté automatiquement.
 * ⚠️ Il initialise UNIQUEMENT la collection `leavereasons`.
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const LeaveReason = require('../models/LeaveReason');

const BASE_LEAVE_REASONS = [
  {
    code: 'conge_annuel',
    labelAr: 'عطلة سنوية',
    labelFr: 'Congé annuel',
    category: 'conge',
    impacteSolde: true,
    color: '#ebf8f1',
    order: 1,
    icon: 'Calendar',
    isSystem: true,
    isActive: true,
    createdBy: null
  },
  {
    code: 'conge_exceptionnel',
    labelAr: 'عطلة استثنائية',
    labelFr: 'Congé exceptionnel',
    category: 'conge',
    impacteSolde: true,
    color: '#ebf8f1',
    order: 2,
    icon: 'CalendarCheck',
    isSystem: true,
    isActive: true,
    createdBy: null
  },
  {
    code: 'absence_injustifiee',
    labelAr: 'غياب غير مبرر',
    labelFr: 'Absence injustifiée',
    category: 'autre',
    impacteSolde: true,
    color: '#feeeee',
    order: 3,
    icon: 'AlertTriangle',
    isSystem: true,
    isActive: true,
    createdBy: null
  },
  {
    code: 'conge_maladie',
    labelAr: 'عطلة مرضية',
    labelFr: 'Congé maladie',
    category: 'conge',
    impacteSolde: false,
    color: '#feeeee',
    order: 4,
    icon: 'HeartPulse',
    requiresDocument: true,
    isSystem: true,
    isActive: true,
    createdBy: null
  },
  {
    code: 'conge_maternite',
    labelAr: 'عطلة أمومة',
    labelFr: 'Congé maternité',
    category: 'conge',
    impacteSolde: false,
    color: '#f0e6ff',
    order: 5,
    icon: 'Baby',
    isSystem: true,
    isActive: true,
    createdBy: null
  },
  {
    code: 'conge_paternite',
    labelAr: 'عطلة أبوة',
    labelFr: 'Congé paternité',
    category: 'conge',
    impacteSolde: false,
    color: '#f0e6ff',
    order: 6,
    icon: 'Users',
    isSystem: true,
    isActive: true,
    createdBy: null
  },
  {
    code: 'conge_sans_solde',
    labelAr: 'عطلة بدون راتب',
    labelFr: 'Congé sans solde',
    category: 'conge',
    impacteSolde: false,
    color: '#f7fafc',
    order: 7,
    icon: 'CalendarOff',
    isSystem: true,
    isActive: true,
    createdBy: null
  },
  {
    code: 'formation',
    labelAr: 'تكوين',
    labelFr: 'Formation',
    category: 'formation',
    impacteSolde: false,
    color: '#ebf4ff',
    order: 8,
    icon: 'GraduationCap',
    requiresFormationDetails: true,
    isSystem: true,
    isActive: true,
    createdBy: null
  },
  {
    code: 'mission',
    labelAr: 'مهمة',
    labelFr: 'Mission',
    category: 'mission',
    impacteSolde: false,
    color: '#f0e6ff',
    order: 9,
    icon: 'Briefcase',
    requiresLieu: true,
    isSystem: true,
    isActive: true,
    createdBy: null
  },
  {
    code: 'service',
    labelAr: 'خدمة',
    labelFr: 'Service',
    category: 'service',
    impacteSolde: false,
    color: '#fef9e7',
    order: 10,
    icon: 'Layers',
    requiresServiceName: true,
    isSystem: true,
    isActive: true,
    createdBy: null
  },
  {
    code: 'recuperation',
    labelAr: 'راحة',
    labelFr: 'Récupération',
    category: 'autre',
    impacteSolde: false,
    color: '#fef3cd',
    order: 11,
    icon: 'Clock',
    isSystem: true,
    isActive: true,
    createdBy: null
  },
  {
    code: 'detachement_externe',
    labelAr: 'إلحاق خارجي',
    labelFr: 'Détachement externe',
    category: 'autre',
    impacteSolde: false,
    color: '#f7fafc',
    order: 12,
    icon: 'ExternalLink',
    isSystem: true,
    isActive: true,
    createdBy: null
  },
  {
    code: 'disponibilite',
    labelAr: 'استيداع',
    labelFr: 'Disponibilité',
    category: 'autre',
    impacteSolde: false,
    color: '#f7fafc',
    order: 13,
    icon: 'PauseCircle',
    isSystem: true,
    isActive: true,
    createdBy: null
  },
  {
    code: 'greve',
    labelAr: 'إضراب',
    labelFr: 'Grève',
    category: 'autre',
    impacteSolde: false,
    color: '#f7fafc',
    order: 14,
    icon: 'Ban',
    isSystem: true,
    isActive: true,
    createdBy: null
  }
];

async function seedLeaveReasons() {
  let createdCount = 0;
  let skippedCount = 0;

  try {
    const dbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/document-management';
    await mongoose.connect(dbUri);
    console.log('✅ Connecté à MongoDB pour le seed des motifs d\'absence...');

    for (const reason of BASE_LEAVE_REASONS) {
      const existing = await LeaveReason.findOne({ code: reason.code });
      if (existing) {
        skippedCount++;
      } else {
        await LeaveReason.create(reason);
        createdCount++;
      }
    }

    console.log('\n=========================================');
    console.log('📋 RAPPORT DU SEED DES MOTIFS D\'ABSENCE :');
    console.log(`   • Motifs créés   : ${createdCount}`);
    console.log(`   • Motifs skippés : ${skippedCount}`);
    console.log(`   • Total traité   : ${BASE_LEAVE_REASONS.length}`);
    console.log('=========================================\n');

    await mongoose.connection.close();
    console.log('✅ Connexion MongoDB fermée proprement.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors du seed des motifs d\'absence :', error);
    try {
      await mongoose.connection.close();
    } catch (_) {}
    process.exit(1);
  }
}

if (require.main === module) {
  seedLeaveReasons();
}

module.exports = {
  BASE_LEAVE_REASONS,
  seedLeaveReasons
};
