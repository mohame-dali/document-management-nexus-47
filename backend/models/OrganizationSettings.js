const mongoose = require('mongoose');

const organizationSettingsSchema = new mongoose.Schema({
  nomAdministration: {
    type: String,
    default: '',
    trim: true
  },
  logoAdministration: {
    type: String,
    default: ''
  },
  rhDepartmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    default: null
  },
  bureauDirecteurDepartmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    default: null
  },
  bureauOrdreDepartmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    default: null
  },
  typesAssociationPersonnel: {
    type: [String],
    default: ['Stage', 'Formation', 'Diplôme', 'Autre']
  },
  dateInitialisation: {
    type: Date,
    default: Date.now
  },
  misAJourPar: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
});

module.exports = mongoose.model('OrganizationSettings', organizationSettingsSchema);
