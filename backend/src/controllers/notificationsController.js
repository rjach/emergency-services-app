const mongoose = require('mongoose');
const Notification = require('../models/Notification');

function notificationToPublic(doc) {
  return {
    id: doc._id.toString(),
    type: doc.type,
    title: doc.title || '',
    body: doc.body || '',
    incidentId: doc.incidentId ? doc.incidentId.toString() : null,
    read: Boolean(doc.read),
    createdAt: doc.createdAt,
  };
}

async function listMine(req, res) {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || '30'), 10) || 30));
    const userId = new mongoose.Types.ObjectId(req.user.id);

    const [items, unreadCount] = await Promise.all([
      Notification.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
      Notification.countDocuments({ user: userId, read: false }),
    ]);

    return res.status(200).json({
      success: true,
      notifications: items.map(notificationToPublic),
      unreadCount,
    });
  } catch (err) {
    console.error('listMine notifications error:', err);
    return res.status(500).json({
      success: false,
      message: 'Could not load notifications',
    });
  }
}

async function markRead(req, res) {
  try {
    const id = req.params.id;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid notification id' });
    }
    const userId = new mongoose.Types.ObjectId(req.user.id);

    const updated = await Notification.findOneAndUpdate(
      { _id: id, user: userId },
      { $set: { read: true } },
      { new: true }
    ).lean();

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    const unreadCount = await Notification.countDocuments({ user: userId, read: false });

    return res.status(200).json({
      success: true,
      notification: notificationToPublic(updated),
      unreadCount,
    });
  } catch (err) {
    console.error('markRead notification error:', err);
    return res.status(500).json({
      success: false,
      message: 'Could not update notification',
    });
  }
}

async function markAllRead(req, res) {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    await Notification.updateMany({ user: userId, read: false }, { $set: { read: true } });

    return res.status(200).json({
      success: true,
      unreadCount: 0,
    });
  } catch (err) {
    console.error('markAllRead notifications error:', err);
    return res.status(500).json({
      success: false,
      message: 'Could not mark notifications read',
    });
  }
}

module.exports = {
  listMine,
  markRead,
  markAllRead,
};
