const OrganizationSettings = require('../models/OrganizationSettings');

function extractId(value) {
  if (!value) return null;
  if (typeof value === 'string') return value.trim() || null;
  if (typeof value === 'object') {
    if (value._id) return value._id.toString();
    if (value.id) return String(value.id);
    if (typeof value.toString === 'function') {
      const str = value.toString();
      return str === '[object Object]' ? null : str;
    }
  }
  return String(value);
}

async function isRHAdminDepartment(user) {
  if (!user || user.role !== 'AdminDepartment') return false;
  const settings = await OrganizationSettings.findOne();
  const rhDeptId = extractId(settings?.rhDepartmentId);
  const userDeptId = extractId(user.activeDepartment);
  return Boolean(rhDeptId && userDeptId && rhDeptId === userDeptId);
}

module.exports = {
  extractId,
  isRHAdminDepartment,
};
