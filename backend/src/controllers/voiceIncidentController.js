const { normalizeLocation } = require('./incidentsController');
const { runVoiceIncidentOrchestration } = require('../services/voiceIncidentOrchestrator');

async function createIncidentFromVoice(req, res) {
  try {
    const transcript = req.body && req.body.transcript;
    if (transcript == null || typeof transcript !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'transcript is required and must be a string',
      });
    }

    const location = normalizeLocation(req.body.location);

    const result = await runVoiceIncidentOrchestration(transcript, location, req);

    if (result.success) {
      return res.status(201).json({
        success: true,
        message: result.message,
        incident: result.incident,
      });
    }

    return res.status(200).json({
      success: false,
      message: result.message,
    });
  } catch (err) {
    console.error('createIncidentFromVoice error:', err);
    const msg =
      err && err.message && String(err.message).includes('API key')
        ? 'Voice assistant configuration error.'
        : 'Voice report failed. Please try again or use the form.';
    return res.status(500).json({
      success: false,
      message: msg,
    });
  }
}

module.exports = {
  createIncidentFromVoice,
};
