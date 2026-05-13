const mongoose = require('mongoose');
const Incident = require('../models/Incident');
const User = require('../models/User');

const SERVICE_TYPES = new Set(['ambulance', 'fire', 'police']);

/** Agency signup uses medical|fire|police|rescue|disaster; incidents use ambulance|fire|police. */
function incidentServiceTypesForAgency(agencyServiceType) {
  if (!agencyServiceType || typeof agencyServiceType !== 'string') return [];
  const t = agencyServiceType.trim().toLowerCase();
  switch (t) {
    case 'medical':
      return ['ambulance'];
    case 'fire':
      return ['fire'];
    case 'police':
      return ['police'];
    case 'rescue':
      return ['ambulance', 'fire'];
    case 'disaster':
      return ['ambulance', 'fire', 'police'];
    default:
      return [];
  }
}

function acceptedBySummary(populatedUser) {
  if (!populatedUser) return null;
  const name = populatedUser.agency?.name?.trim();
  if (name) return name;
  const email = populatedUser.email || '';
  const local = email.split('@')[0] || 'Agency';
  return local;
}

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

async function resolveReporterFromReq(req) {
  let reporterUserId = null;
  let reporterEmail = '';
  if (req.user && req.user.role === 'user') {
    reporterUserId = req.user.id;
    const u = await User.findById(req.user.id).select('email').lean();
    if (u && u.email) reporterEmail = u.email;
  }
  return { reporterUserId, reporterEmail };
}

async function persistIncident({ serviceType, description, location, reporterUserId, reporterEmail }) {
  const desc =
    typeof description === 'string' ? description.trim().slice(0, 2000) : '';
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

  return incident;
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

    const { reporterUserId, reporterEmail } = await resolveReporterFromReq(req);
    const incident = await persistIncident({
      serviceType,
      description: desc,
      location,
      reporterUserId,
      reporterEmail,
    });

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

function acceptedUserIdString(raw) {
  if (raw == null) return null;
  if (typeof raw === 'object' && raw._id) return raw._id.toString();
  if (typeof raw === 'object' && typeof raw.toString === 'function') {
    const s = raw.toString();
    if (s && s !== '[object Object]') return s;
  }
  return null;
}

function incidentToAgencyPublic(doc, viewerUserId) {
  const base = incidentToPublic(doc);
  const acceptedId = acceptedUserIdString(doc.acceptedByAgencyUserId);
  const declined = Array.isArray(doc.declinedByAgencyUserIds)
    ? doc.declinedByAgencyUserIds.map((id) => id.toString())
    : [];
  const viewer = viewerUserId ? String(viewerUserId) : '';
  const viewerDeclined = viewer ? declined.includes(viewer) : false;
  const acceptedBy = doc.acceptedByAgencyUserId;
  let acceptedByLabel = null;
  if (acceptedBy && typeof acceptedBy === 'object' && acceptedBy.email != null) {
    acceptedByLabel = acceptedBySummary(acceptedBy);
  } else if (acceptedId) {
    acceptedByLabel = 'Another agency';
  }
  const isOpen = base.status === 'pending' && !acceptedId && !viewerDeclined;
  return {
    ...base,
    acceptedByAgencyUserId: acceptedId,
    acceptedByLabel,
    declinedByAgencyUserIds: declined,
    viewerDeclined,
    canRespond: isOpen,
  };
}

async function listAgencyIncidents(req, res) {
  try {
    const me = await User.findById(req.user.id).select('role agency.serviceType').lean();
    if (!me || me.role !== 'agency_admin') {
      return res.status(403).json({ success: false, message: 'Agency profile required' });
    }
    const typeFilter = incidentServiceTypesForAgency(me.agency?.serviceType);
    if (!typeFilter.length) {
      return res.status(400).json({
        success: false,
        message: 'Your agency has no dispatchable service type configured',
      });
    }

    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '50'), 10) || 50));
    const query = { serviceType: { $in: typeFilter } };
    const [total, docs] = await Promise.all([
      Incident.countDocuments(query),
      Incident.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('acceptedByAgencyUserId', 'email agency')
        .lean(),
    ]);

    const peerCount = await User.countDocuments({
      role: 'agency_admin',
      'agency.serviceType': me.agency?.serviceType || '',
    });

    return res.status(200).json({
      success: true,
      total,
      stats: { peerAgencyAdmins: peerCount },
      incidents: docs.map((d) => incidentToAgencyPublic(d, req.user.id)),
    });
  } catch (err) {
    console.error('listAgencyIncidents error:', err);
    return res.status(500).json({
      success: false,
      message: 'Could not load incidents',
    });
  }
}

async function acceptAgencyIncident(req, res) {
  try {
    const me = await User.findById(req.user.id).select('role agency.serviceType').lean();
    if (!me || me.role !== 'agency_admin') {
      return res.status(403).json({ success: false, message: 'Agency profile required' });
    }
    const allowedTypes = incidentServiceTypesForAgency(me.agency?.serviceType);
    if (!allowedTypes.length) {
      return res.status(400).json({
        success: false,
        message: 'Your agency has no dispatchable service type configured',
      });
    }

    const id = req.params.id;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid incident id' });
    }

    const viewerId = new mongoose.Types.ObjectId(req.user.id);

    const updated = await Incident.findOneAndUpdate(
      {
        _id: id,
        status: 'pending',
        acceptedByAgencyUserId: null,
        serviceType: { $in: allowedTypes },
      },
      {
        $set: {
          acceptedByAgencyUserId: viewerId,
          status: 'responding',
        },
      },
      { new: true }
    )
      .populate('acceptedByAgencyUserId', 'email agency')
      .lean();

    if (!updated) {
      const existing = await Incident.findById(id).select('status acceptedByAgencyUserId serviceType').lean();
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Incident not found' });
      }
      if (!allowedTypes.includes(existing.serviceType)) {
        return res.status(403).json({
          success: false,
          message: 'This incident is outside your agency service type',
        });
      }
      if (existing.status !== 'pending' || existing.acceptedByAgencyUserId) {
        return res.status(409).json({
          success: false,
          message: 'Another agency has already accepted this alert.',
        });
      }
      return res.status(409).json({
        success: false,
        message: 'Unable to accept this alert.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Alert accepted. Your agency is now responding.',
      incident: incidentToAgencyPublic(updated, req.user.id),
    });
  } catch (err) {
    console.error('acceptAgencyIncident error:', err);
    return res.status(500).json({ success: false, message: 'Could not accept alert' });
  }
}

async function denyAgencyIncident(req, res) {
  try {
    const me = await User.findById(req.user.id).select('role agency.serviceType').lean();
    if (!me || me.role !== 'agency_admin') {
      return res.status(403).json({ success: false, message: 'Agency profile required' });
    }
    const allowedTypes = incidentServiceTypesForAgency(me.agency?.serviceType);
    if (!allowedTypes.length) {
      return res.status(400).json({
        success: false,
        message: 'Your agency has no dispatchable service type configured',
      });
    }

    const id = req.params.id;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid incident id' });
    }

    const viewerId = new mongoose.Types.ObjectId(req.user.id);

    const existing = await Incident.findById(id)
      .select('status serviceType acceptedByAgencyUserId')
      .lean();
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Incident not found' });
    }
    if (existing.acceptedByAgencyUserId) {
      return res.status(409).json({
        success: false,
        message: 'This alert has already been accepted by an agency.',
      });
    }
    if (!allowedTypes.includes(existing.serviceType)) {
      return res.status(403).json({
        success: false,
        message: 'This incident is outside your agency service type',
      });
    }
    if (existing.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending alerts can be passed to other agencies.',
      });
    }

    const updated = await Incident.findOneAndUpdate(
      {
        _id: id,
        status: 'pending',
        acceptedByAgencyUserId: null,
        serviceType: { $in: allowedTypes },
      },
      { $addToSet: { declinedByAgencyUserIds: viewerId } },
      { new: true }
    )
      .populate('acceptedByAgencyUserId', 'email agency')
      .lean();

    if (!updated) {
      return res.status(409).json({
        success: false,
        message: 'Unable to update this alert.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Passed. Other agencies can still accept this alert.',
      incident: incidentToAgencyPublic(updated, req.user.id),
    });
  } catch (err) {
    console.error('denyAgencyIncident error:', err);
    return res.status(500).json({ success: false, message: 'Could not pass on alert' });
  }
}

module.exports = {
  createIncident,
  listAgencyIncidents,
  acceptAgencyIncident,
  denyAgencyIncident,
  serviceLabel,
  normalizeLocation,
  persistIncident,
  resolveReporterFromReq,
  incidentToPublic,
  incidentServiceTypesForAgency,
  SERVICE_TYPES,
};
