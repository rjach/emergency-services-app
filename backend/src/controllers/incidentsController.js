const Incident = require('../models/Incident');
const User = require('../models/User');

const SERVICE_TYPES = new Set(['ambulance', 'fire', 'police']);

function serviceLabel(serviceType) {
  switch (serviceType) {
    case 'ambulance':
      return 'Medical / Ambulance';
    case 'fire':
      return 'Fire Department';
    case 'police':
      return 'Police';
    default:
      return 'Emergency';
  }
}

function normalizeLocation(body) {
  if (!body || typeof body !== 'object') {
    return {
      latitude: null,
      longitude: null,
      accuracyM: null,
      addressLabel: '',
    };
  }
  const lat = body.latitude;
  const lon = body.longitude;
  const latitude =
    typeof lat === 'number' && Number.isFinite(lat) ? lat : lat != null ? Number(lat) : null;
  const longitude =
    typeof lon === 'number' && Number.isFinite(lon) ? lon : lon != null ? Number(lon) : null;
  const acc = body.accuracyM ?? body.accuracy;
  const accuracyM =
    typeof acc === 'number' && Number.isFinite(acc) ? acc : acc != null ? Number(acc) : null;
  const addressLabel =
    typeof body.addressLabel === 'string' ? body.addressLabel.trim().slice(0, 500) : '';
  return {
    latitude: latitude != null && Number.isFinite(latitude) ? latitude : null,
    longitude: longitude != null && Number.isFinite(longitude) ? longitude : null,
    accuracyM: accuracyM != null && Number.isFinite(accuracyM) ? accuracyM : null,
    addressLabel,
  };
}

function activitySummary(serviceType, description) {
  const label = serviceLabel(serviceType);
  const desc = (description || '').trim();
  if (!desc) return `${label} request submitted to dispatch.`;
  const short = desc.length > 160 ? `${desc.slice(0, 157)}…` : desc;
  return `${label}: ${short}`;
}

function incidentToPublic(doc) {
  return {
    id: doc._id.toString(),
    serviceType: doc.serviceType,
    description: doc.description || '',
    status: doc.status,
    location: {
      latitude: doc.location?.latitude ?? null,
      longitude: doc.location?.longitude ?? null,
      accuracyM: doc.location?.accuracyM ?? null,
      addressLabel: doc.location?.addressLabel || '',
    },
    reporterUserId: doc.reporterUserId ? doc.reporterUserId.toString() : null,
    reporterEmail: doc.reporterEmail || '',
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

async function createIncident(req, res) {
  try {
    const { serviceType, description } = req.body;
    const location = normalizeLocation(req.body.location);

    if (!serviceType || !SERVICE_TYPES.has(serviceType)) {
      return res.status(400).json({
        success: false,
        message: 'serviceType must be one of: ambulance, fire, police',
      });
    }

    let desc = '';
    if (description != null) {
      if (typeof description !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'description must be a string',
        });
      }
      desc = description.trim().slice(0, 2000);
    }

    let reporterUserId = null;
    let reporterEmail = '';

    if (req.user && req.user.role === 'user') {
      reporterUserId = req.user.id;
      const u = await User.findById(req.user.id).select('email').lean();
      if (u && u.email) reporterEmail = u.email;
    }

    const incident = await Incident.create({
      serviceType,
      description: desc,
      location,
      reporterUserId,
      reporterEmail,
      status: 'pending',
    });

    if (reporterUserId) {
      await User.findByIdAndUpdate(reporterUserId, {
        $push: {
          recentActivities: {
            $each: [
              {
                kind: 'incident_report',
                incidentId: incident._id,
                serviceType,
                summary: activitySummary(serviceType, desc),
                statusLabel: 'SUBMITTED',
                createdAt: new Date(),
              },
            ],
            $position: 0,
            $slice: 40,
          },
        },
      });
    }

    return res.status(201).json({
      success: true,
      incident: incidentToPublic(incident),
      message: 'Incident reported. Dispatch has been notified.',
    });
  } catch (err) {
    console.error('createIncident error:', err);
    return res.status(500).json({
      success: false,
      message: 'Could not submit incident report',
    });
  }
}

async function listAgencyIncidents(req, res) {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '50'), 10) || 50));
    const docs = await Incident.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return res.status(200).json({
      success: true,
      incidents: docs.map((d) => incidentToPublic(d)),
    });
  } catch (err) {
    console.error('listAgencyIncidents error:', err);
    return res.status(500).json({
      success: false,
      message: 'Could not load incidents',
    });
  }
}

module.exports = {
  createIncident,
  listAgencyIncidents,
  serviceLabel,
};
