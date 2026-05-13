const express = require('express');
const { getHealth } = require('../controllers/healthController');
const authRoutes = require('./authRoutes');
const userContactRoutes = require('./userContactRoutes');
const incidentRoutes = require('./incidentRoutes');
const userActivityRoutes = require('./userActivityRoutes');
const notificationRoutes = require('./notificationRoutes');

const router = express.Router();

router.get('/health', getHealth);
router.use('/auth', authRoutes);
router.use('/user/contacts', userContactRoutes);
router.use('/user/activity', userActivityRoutes);
router.use('/', notificationRoutes);
router.use('/', incidentRoutes);

module.exports = router;
