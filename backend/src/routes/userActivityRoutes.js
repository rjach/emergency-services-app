const express = require('express');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { listMyActivities } = require('../controllers/userActivityController');

const router = express.Router();

router.use(requireAuth);
router.use(requireRole('user'));
router.get('/', listMyActivities);

module.exports = router;
