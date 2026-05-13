const User = require('../models/User');
const Notification = require('../models/Notification');

/**
 * Agency `serviceType` values that should receive dispatch for a given incident service.
 * @param {'ambulance'|'fire'|'police'} incidentServiceType
 * @returns {string[]}
 */
function agencyServiceTypesForIncident(incidentServiceType) {
  switch (incidentServiceType) {
    case 'ambulance':
      return ['medical', 'rescue', 'disaster'];
    case 'fire':
      return ['fire', 'rescue', 'disaster'];
    case 'police':
      return ['police', 'disaster'];
    default:
      return [];
  }
}

function serviceLabel(serviceType) {
  switch (serviceType) {
    case 'ambulance':
      return 'Medical / Ambulance';
    case 'fire':
      return 'Fire';
    case 'police':
      return 'Police';
    default:
      return 'Emergency';
  }
}

function incidentHeadline(serviceType, description) {
  const desc = (description || '').trim();
  if (desc) {
    const line = desc.split(/\r?\n/)[0].trim();
    return line.length > 120 ? `${line.slice(0, 117)}…` : line;
  }
  return serviceLabel(serviceType);
}

/**
 * After an incident is persisted: notify matching agency admins and the reporter (if any).
 * @param {import('mongoose').Document} incidentDoc
 */
async function dispatchNotificationsForNewIncident(incidentDoc) {
  const id = incidentDoc._id;
  const serviceType = incidentDoc.serviceType;
  const description = incidentDoc.description || '';
  const reporterUserId = incidentDoc.reporterUserId;

  const agencyTypes = agencyServiceTypesForIncident(serviceType);
  const headline = incidentHeadline(serviceType, description);

  const docs = [];

  if (reporterUserId) {
    docs.push({
      user: reporterUserId,
      type: 'reporter_report_received',
      title: 'Report sent to dispatch',
      body: `Your ${serviceLabel(serviceType)} report was received and shared with responding agencies.`,
      incidentId: id,
      read: false,
    });
  }

  if (agencyTypes.length) {
    const agencies = await User.find({
      role: 'agency_admin',
      'agency.serviceType': { $in: agencyTypes },
    })
      .select('_id')
      .lean();

    for (const row of agencies) {
      docs.push({
        user: row._id,
        type: 'dispatch_new_incident',
        title: `New ${serviceLabel(serviceType)} alert`,
        body: headline,
        incidentId: id,
        read: false,
      });
    }
  }

  if (!docs.length) return;

  await Notification.insertMany(docs);
}

/**
 * @param {object} incidentLean — must include reporterUserId, _id
 * @param {string} responderLabel
 */
async function dispatchResponderAssignedToReporter(incidentLean, responderLabel) {
  const reporterUserId = incidentLean.reporterUserId;
  if (!reporterUserId) return;

  const label = (responderLabel || 'A responding agency').trim() || 'A responding agency';

  await Notification.create({
    user: reporterUserId,
    type: 'reporter_responder_assigned',
    title: 'Responder assigned',
    body: `${label} is now responding to your report.`,
    incidentId: incidentLean._id,
    read: false,
  });
}

function queueDispatchForNewIncident(incidentDoc) {
  queueMicrotask(() => {
    dispatchNotificationsForNewIncident(incidentDoc).catch((err) => {
      console.error('dispatchNotificationsForNewIncident:', err.message);
    });
  });
}

module.exports = {
  agencyServiceTypesForIncident,
  dispatchNotificationsForNewIncident,
  dispatchResponderAssignedToReporter,
  queueDispatchForNewIncident,
};
