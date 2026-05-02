const User = require('../models/User');

function activityToPublic(entry) {
  return {
    id: `${entry.incidentId}-${entry.createdAt?.getTime?.() || 0}`,
    kind: entry.kind,
    incidentId: entry.incidentId ? entry.incidentId.toString() : '',
    serviceType: entry.serviceType,
    summary: entry.summary || '',
    statusLabel: entry.statusLabel || 'SUBMITTED',
    createdAt: entry.createdAt,
  };
}

async function listMyActivities(req, res) {
  try {
    const user = await User.findById(req.user.id)
      .select('recentActivities')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const raw = Array.isArray(user.recentActivities) ? user.recentActivities : [];
    const sorted = [...raw].sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });

    return res.status(200).json({
      success: true,
      activities: sorted.map(activityToPublic),
    });
  } catch (err) {
    console.error('listMyActivities error:', err);
    return res.status(500).json({
      success: false,
      message: 'Could not load activity',
    });
  }
}

module.exports = {
  listMyActivities,
};
