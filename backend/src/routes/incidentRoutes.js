const express = require('express');
const { optionalAuth, requireAuth, requireRole } = require('../middleware/authMiddleware');
const { createIncident, listAgencyIncidents } = require('../controllers/incidentsController');
const { createIncidentFromVoice } = require('../controllers/voiceIncidentController');

const router = express.Router();

router.post('/incidents', optionalAuth, createIncident);
router.post('/incidents/voice', optionalAuth, createIncidentFromVoice);
router.get('/agency/incidents', requireAuth, requireRole('agency_admin'), listAgencyIncidents);

module.exports = router;
