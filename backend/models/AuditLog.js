
const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: [
      'document_create',
      'document_update', 
      'document_delete',
      'document_view',
      'document_download',
      'document_moved_to_folder',
      'document_removed_from_folder',
      'folder_create',
      'folder_update',
      'folder_delete',
      'user_create',
      'user_update',
      'user_delete',
      'user_login',
      'user_logout',
      'PERMANENT_DELETE',
      'EMPTY_TRASH',
      'attendance_batch_save',
      'presence_settings_balance_change',
      'personnel_create',
      'personnel_update',
      'personnel_delete',
      'personnel_restore',
      'personnel_link_user',
      'personnel_photo_upload',
      'personnel_document_link',
      'personnel_document_unlink',
      'attendance_declaration_create',
      'attendance_declaration_approve',
      'attendance_declaration_reject',
      'rh_stage_create',
      'rh_stage_update',
      'rh_stage_delete'
    ]
  },
  entityType: {
    type: String,
    required: true,
    enum: [
      'document',
      'folder',
      'user',
      'trash',
      'personnel',
      'incoming',
      'outgoing',
      'message',
      'Attendance',
      'PresenceSettings',
      'Personnel',
      'RHStage',
      'AttendanceDeclaration'
    ]
  },
  entityId: {
    type: String,
    required: false,
    default: 'none'
  },
  userId: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  userDetails: {
    username: String,
    role: String
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ipAddress: String
}, {
  timestamps: true
});

// Index for better query performance
AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ userId: 1 });
AuditLogSchema.index({ entityType: 1 });
AuditLogSchema.index({ action: 1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
