const express = require('express');
const { signup, signin, me } = require('../controllers/authController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/signup', signup);
router.post('/signin', signin);
router.get('/me', requireAuth, me);

module.exports = router;
