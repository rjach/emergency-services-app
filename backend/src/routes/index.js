const express = require('express');
const { getHealth } = require('../controllers/healthController');
const authRoutes = require('./authRoutes');
const userContactRoutes = require('./userContactRoutes');

const router = express.Router();

router.get('/health', getHealth);
router.use('/auth', authRoutes);
router.use('/user/contacts', userContactRoutes);

module.exports = router;
