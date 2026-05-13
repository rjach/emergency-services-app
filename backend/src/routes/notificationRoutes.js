const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const { listMine, markRead, markAllRead } = require('../controllers/notificationsController');

const router = express.Router();

router.get('/notifications', requireAuth, listMine);
router.patch('/notifications/:id/read', requireAuth, markRead);
router.post('/notifications/read-all', requireAuth, markAllRead);

module.exports = router;
