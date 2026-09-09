// Small helper so controllers don't repeat AuditLog.create({...}) everywhere.
const AuditLog = require('../models/AuditLog');

async function logAction({ user, action, tender, bidder, details }) {
  await AuditLog.create({
    user: user?._id,
    userName: user?.name || 'System',
    action,
    tender,
    bidder,
    details,
  });
}

module.exports = { logAction };
