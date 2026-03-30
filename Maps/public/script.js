'use strict';

const DEFAULT_LAT = 27.7172;   
const DEFAULT_LNG = 85.3240;
const CASE_ID     = 'RA-00279';

const BACKEND_URL = (location.protocol === 'file:')
  ? 'http://localhost:3001'
  : location.origin;


function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

const DOM = {
  mapEl:       document.getElementById('map'),
  mapLoading:  document.getElementById('map-loading'),
  mapCoords:   document.getElementById('map-coords'),
  permBanner:  document.getElementById('perm-banner'),
  statusDot:   document.getElementById('status-dot'),
  statusText:  document.getElementById('status-text'),
  latVal:      document.getElementById('lat-val'),
  lngVal:      document.getElementById('lng-val'),
  accVal:      document.getElementById('acc-val'),
  timeVal:     document.getElementById('time-val'),
  accFill:     document.getElementById('acc-fill'),
  accBar:      document.getElementById('acc-bar'),
  signalLabel: document.getElementById('signal-label'),
  btnStart:    document.getElementById('btn-start'),
  btnStop:     document.getElementById('btn-stop'),
  manualWrap:  document.getElementById('manual-wrap'),
  manualAddr:  document.getElementById('manual-addr'),
  tlLiveDot:   document.getElementById('tl-live-dot'),
  tlLiveTime:  document.getElementById('tl-live-time'),
  tlLiveText:  document.getElementById('tl-live-text'),
  log:         document.getElementById('log'),
  updateInput: document.getElementById('update-input'),
  btnZoomIn:   document.getElementById('btn-zoom-in'),
  btnZoomOut:  document.getElementById('btn-zoom-out'),
};

let gmap            = null;
let userMarker      = null;
let accuracyCircle  = null;
let respMarkers     = [];

let openInfoWindows = [];

let mapsLoading     = false;
let watchId         = null;
let _lastUpdate     = 0;
let socket          = null;

let _authToken      = null;

let followMe = false;

let wakeLock = null;

async function requestWakeLock() {
  if (!('wakeLock' in navigator)) return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    addLog('sys', 'Screen Wake Lock acquired — display will stay on');
    wakeLock.addEventListener('release', () => {
      addLog('sys', 'Wake Lock released');
    });
    document.addEventListener('visibilitychange', reacquireWakeLock);
  } catch (e) {
    addLog('sys', 'Wake Lock not available: ' + escapeHtml(e.message));
  }
}

async function reacquireWakeLock() {
  if (wakeLock !== null && document.visibilityState === 'visible' && watchId !== null) {
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      addLog('sys', 'Screen Wake Lock re-acquired');
    } catch (e) { /* silent */ }
  }
}

function releaseWakeLock() {
  if (wakeLock) {
    wakeLock.release().catch(() => {});
    wakeLock = null;
  }
  document.removeEventListener('visibilitychange', reacquireWakeLock);
}

const MA_WINDOW = 5;
const _maBuffer = [];

function smoothCoords(lat, lng, acc) {
  _maBuffer.push({ lat, lng, acc });
  if (_maBuffer.length > MA_WINDOW) _maBuffer.shift();
  const n    = _maBuffer.length;
  const sLat = _maBuffer.reduce((s, p) => s + p.lat, 0) / n;
  const sLng = _maBuffer.reduce((s, p) => s + p.lng, 0) / n;
  const sAcc = _maBuffer.reduce((s, p) => s + p.acc, 0) / n;
  return { lat: sLat, lng: sLng, acc: sAcc };
}

async function loginAndStoreToken() {
  const cfg = window.RAPIDAID_CONFIG || {};
  if (!cfg.adminUser || !cfg.adminPass) {
    addLog('sys', 'No credentials configured — protected endpoints disabled');
    return;
  }
  try {
    const res = await fetch(BACKEND_URL + '/api/auth/login', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ username: cfg.adminUser, password: cfg.adminPass }),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    _authToken = data.token || null;
    if (_authToken) addLog('sys', 'Auth token acquired ✓');
  } catch (e) {
    addLog('err', 'Login failed: ' + escapeHtml(e.message));
  }
}

function loadGoogleMaps() {
  if (mapsLoading) return;
  mapsLoading = true;

  const key = (window.RAPIDAID_CONFIG || {}).mapsApiKey || '';
  if (!key) {
    if (DOM.mapLoading) DOM.mapLoading.textContent = '⚠ Google Maps API key not configured.';
    addLog('err', 'Google Maps API key missing — set window.RAPIDAID_CONFIG.mapsApiKey');
    return;
  }

  const s   = document.createElement('script');
  s.src     = 'https://maps.googleapis.com/maps/api/js'
             + '?key='      + encodeURIComponent(key)
             + '&callback=initGoogleMap'
             + '&v=weekly'
             + '&loading=async';
  s.async   = true;
  s.defer   = true;
  s.onerror = () => {
    mapsLoading = false;
    if (DOM.mapLoading) {
      DOM.mapLoading.textContent = '⚠ Map failed to load. Check API key.';
      DOM.mapLoading.classList.remove('hidden');
    }
    addLog('err', 'Google Maps script load failed — check API key');
  };
  document.head.appendChild(s);
}

window.initGoogleMap = function () {
  if (DOM.mapLoading) DOM.mapLoading.classList.add('hidden');

  gmap = new google.maps.Map(DOM.mapEl, {
    center:           { lat: DEFAULT_LAT, lng: DEFAULT_LNG },
    zoom:             14,
    disableDefaultUI: true,
    gestureHandling:  'greedy',
    mapTypeId:        google.maps.MapTypeId.ROADMAP,
    styles: [
      { elementType: 'geometry',                                           stylers: [{ color: '#1a2120' }] },
      { elementType: 'labels.text.fill',                                   stylers: [{ color: '#7a9490' }] },
      { elementType: 'labels.text.stroke',                                 stylers: [{ color: '#1a2120' }] },
      { featureType: 'road',           elementType: 'geometry',            stylers: [{ color: '#2a312f' }] },
      { featureType: 'road',           elementType: 'geometry.stroke',     stylers: [{ color: '#212a27' }] },
      { featureType: 'road',           elementType: 'labels.text.fill',    stylers: [{ color: '#d4dbd8' }] },
      { featureType: 'road.highway',   elementType: 'geometry',            stylers: [{ color: '#33403d' }] },
      { featureType: 'road.highway',   elementType: 'geometry.stroke',     stylers: [{ color: '#1f2a27' }] },
      { featureType: 'water',          elementType: 'geometry',            stylers: [{ color: '#0f1918' }] },
      { featureType: 'water',          elementType: 'labels.text.fill',    stylers: [{ color: '#4e9e7a' }] },
      { featureType: 'poi',            elementType: 'geometry',            stylers: [{ color: '#222927' }] },
      { featureType: 'poi.park',       elementType: 'geometry',            stylers: [{ color: '#1e2d28' }] },
      { featureType: 'administrative', elementType: 'geometry.stroke',     stylers: [{ color: '#33403d' }] },
      { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#6dbf9a' }] },
      { featureType: 'transit',        elementType: 'geometry',            stylers: [{ color: '#2f3d39' }] },
    ],
  });

  function updateZoomBadge() {
    const z = gmap.getZoom();
    DOM.btnZoomIn.disabled  = z >= 20;
    DOM.btnZoomOut.disabled = z <= 3;
    DOM.btnZoomIn.style.opacity  = z >= 20 ? '.3' : '1';
    DOM.btnZoomOut.style.opacity = z <= 3  ? '.3' : '1';
    const recenterBtn = document.getElementById('btn-recenter');
    if (recenterBtn) recenterBtn.title = 'Re-centre on my location (zoom ' + z + ')';
  }

  DOM.btnZoomIn.addEventListener('click', () => {
    const z = gmap.getZoom();
    if (z < 20) { gmap.setZoom(z + 1); updateZoomBadge(); }
  });
  DOM.btnZoomOut.addEventListener('click', () => {
    const z = gmap.getZoom();
    if (z > 3)  { gmap.setZoom(z - 1); updateZoomBadge(); }
  });

  gmap.addListener('zoom_changed', updateZoomBadge);
  updateZoomBadge();

  const mapControls = document.querySelector('.map-controls');
  if (mapControls) mapControls.classList.add('visible');

  document.addEventListener('keydown', (e) => {
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
    if (e.key === '+' || e.key === '=') { DOM.btnZoomIn.click();  e.preventDefault(); }
    if (e.key === '-' || e.key === '_') { DOM.btnZoomOut.click(); e.preventDefault(); }
  });

  addResponderMarker(27.7195, 85.3180, '#4e9e7a', 'A', '<b>Ambulance 104</b><br>ETA ~4 min');
  addResponderMarker(27.7145, 85.3290, '#5a8fd4', 'M', '<b>Medic Unit 02</b><br>ETA ~6 min');

  addLog('sys', 'Map ready · Google Maps JS API v3 · Dark theme · Kathmandu centre');
};

function addResponderMarker(lat, lng, color, letter, popupHtml) {
  const safeHtml = popupHtml.replace(/<(?!\/?(?:b|br)\b)[^>]*>/gi, '');

  const marker = new google.maps.Marker({
    position:  { lat, lng },
    map:       gmap,
    icon: {
      url:        makeSvgIcon(color, letter, 26),
      scaledSize: new google.maps.Size(26, 26),
      anchor:     new google.maps.Point(13, 13),
    },
    title: letter === 'A' ? 'Ambulance 104' : 'Medic Unit 02',
  });

  const iw = new google.maps.InfoWindow({
    content: '<div style="font-family:\'DM Sans\',sans-serif;font-size:12px;color:#d4dbd8">' + safeHtml + '</div>',
  });

  iw.addListener('closeclick', () => {
    const idx = openInfoWindows.indexOf(iw);
    if (idx !== -1) openInfoWindows.splice(idx, 1);
  });

  marker.addListener('click', () => {
    openInfoWindows.forEach(w => w.close());
    openInfoWindows = openInfoWindows.filter(w => w !== iw); // remove stale closed refs
    iw.open({ anchor: marker, map: gmap });
    openInfoWindows.push(iw);
  });

  respMarkers.push(marker);
}

function makeSvgIcon(color, letter, size) {
  const r = size / 2;
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '">'
    + '<circle cx="' + r + '" cy="' + r + '" r="' + (r - 1) + '" fill="' + color + '" stroke="rgba(255,255,255,0.4)" stroke-width="2"/>'
    + '<text x="' + r + '" y="' + (r + 4) + '" text-anchor="middle" font-family="DM Sans,sans-serif" font-size="11" font-weight="700" fill="#fff">' + escapeHtml(letter) + '</text>'
    + '</svg>'
  );
}

function makeUserSvgIcon() {
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20">'
    + '<circle cx="10" cy="10" r="10" fill="rgba(224,82,82,0.35)"/>'
    + '<circle cx="10" cy="10" r="7" fill="#e05252" stroke="#fff" stroke-width="3"/>'
    + '</svg>'
  );
}

function placeUserMarker(lat, lng, acc) {
  if (!gmap) return;
  const pos = { lat, lng };

  if (accuracyCircle) {
    accuracyCircle.setCenter(pos);
    accuracyCircle.setRadius(acc);
  } else {
    accuracyCircle = new google.maps.Circle({
      map:           gmap,
      center:        pos,
      radius:        acc,
      strokeColor:   '#4e9e7a',
      strokeOpacity: 0.5,
      strokeWeight:  1.5,
      fillColor:     '#4e9e7a',
      fillOpacity:   0.1,
    });
  }

  if (userMarker) {
    userMarker.setPosition(pos);
  } else {
    userMarker = new google.maps.Marker({
      position:  pos,
      map:       gmap,
      icon: {
        url:        makeUserSvgIcon(),
        scaledSize: new google.maps.Size(20, 20),
        anchor:     new google.maps.Point(10, 10),
      },
      title:     '📍 Sarah Jenkins — live location',
      zIndex:    999,
      optimized: false,
    });

    const iw = new google.maps.InfoWindow({
      content: '<div style="font-family:\'DM Sans\',sans-serif;font-size:12px;color:#d4dbd8">'
             + '<b>📍 Sarah Jenkins</b><br>Reporter — live location</div>',
    });

    iw.addListener('closeclick', () => {
      const idx = openInfoWindows.indexOf(iw);
      if (idx !== -1) openInfoWindows.splice(idx, 1);
    });

    userMarker.addListener('click', () => {
      openInfoWindows.forEach(w => w.close());
      openInfoWindows = openInfoWindows.filter(w => w !== iw);
      iw.open({ anchor: userMarker, map: gmap });
      openInfoWindows.push(iw);
    });
  }

  if (followMe) gmap.panTo(pos);
}

function recenter() {
  if (!gmap) return;
  if (userMarker) {
    gmap.panTo(userMarker.getPosition());
    gmap.setZoom(16);
  } else {
    gmap.panTo({ lat: DEFAULT_LAT, lng: DEFAULT_LNG });
    gmap.setZoom(14);
  }
}

function toggleFollowMe() {
  followMe = !followMe;
  const btn = document.getElementById('btn-follow');
  if (followMe) {
    btn.classList.add('on');
    btn.textContent = '⊙ Following';
    btn.setAttribute('aria-pressed', 'true');
    addLog('sys', 'Follow Me ON — map will stay centred on your position');
    if (userMarker && gmap) gmap.panTo(userMarker.getPosition());
  } else {
    btn.classList.remove('on');
    btn.textContent = '⊙ Follow';
    btn.setAttribute('aria-pressed', 'false');
    addLog('sys', 'Follow Me OFF — map panning paused');
  }
}

const GEO_OPTS = { enableHighAccuracy: true, maximumAge: 5000, timeout: 12000 };

function throttledOnSuccess(pos) {
  const now = Date.now();
  if (now - _lastUpdate < 1000) return;
  _lastUpdate = now;
  onSuccess(pos);
}

function startTracking() {
  if (!navigator.geolocation) {
    setStatus('error', 'Geolocation not supported in this browser.');
    addLog('err', 'Geolocation API unavailable');
    showManual();
    return;
  }

  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }

  setStatus('waiting', 'Requesting GPS permission…');
  addLog('sys', 'Requesting location permission…');
  DOM.btnStart.disabled = true;
  DOM.btnStop.disabled  = false;

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { lat, lng, acc } = smoothCoords(
        pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy
      );
      placeUserMarker(lat, lng, acc);
      if (gmap) { gmap.panTo({ lat, lng }); gmap.setZoom(16); }
      addLog('sys', 'Instant fix · ' + lat.toFixed(5) + ', ' + lng.toFixed(5));
    },
    () => { /* silent — watchPosition will handle errors */ },
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
  );

  watchId = navigator.geolocation.watchPosition(throttledOnSuccess, onError, GEO_OPTS);
  requestWakeLock();
}

function stopTracking() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
  releaseWakeLock();
  _maBuffer.length = 0;
  setStatus('idle', 'Tracking stopped.');
  addLog('sys', 'Live tracking stopped');
  DOM.btnStart.disabled = false;
  DOM.btnStop.disabled  = true;
}

function onSuccess(pos) {
  const raw_lat = pos.coords.latitude;
  const raw_lng = pos.coords.longitude;
  const raw_acc = pos.coords.accuracy;

  const { lat, lng, acc } = smoothCoords(raw_lat, raw_lng, raw_acc);
  const now = new Date();

  DOM.permBanner.classList.remove('show');
  setStatus('active', 'Live GPS tracking active');
  DOM.btnStop.disabled  = false;
  DOM.btnStart.disabled = true;

  DOM.latVal.textContent  = lat.toFixed(6) + '°';
  DOM.lngVal.textContent  = lng.toFixed(6) + '°';
  DOM.accVal.textContent  = Math.round(acc) + ' m';
  DOM.timeVal.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const pct = Math.max(5, Math.min(100, 100 - (acc / 200) * 100));
  DOM.accFill.style.width      = pct + '%';
  DOM.accFill.style.background = acc < 20 ? '#4e9e7a' : acc < 80 ? '#e0a652' : '#e05252';
  if (DOM.accBar) DOM.accBar.setAttribute('aria-valuenow', Math.round(pct));
  DOM.signalLabel.textContent = acc < 20 ? 'Excellent' : acc < 80 ? 'Good' : acc < 150 ? 'Fair' : 'Poor';

  DOM.mapCoords.textContent = '';
  ['Lat: ' + lat.toFixed(5) + '°N',
   'Lng: ' + lng.toFixed(5) + '°E',
   '±' + Math.round(acc) + ' m accuracy'].forEach((line, i) => {
    if (i > 0) DOM.mapCoords.appendChild(document.createElement('br'));
    DOM.mapCoords.appendChild(document.createTextNode(line));
  });

  placeUserMarker(lat, lng, acc);
  addLog('gps', lat.toFixed(5) + ', ' + lng.toFixed(5) + ' ·±' + Math.round(acc) + 'm');

  DOM.tlLiveDot.classList.add('done');
  DOM.tlLiveTime.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' · Live Update';
  DOM.tlLiveText.textContent = 'Position updated · Accuracy ' + Math.round(acc) + 'm';

  syncToBackend(lat, lng, acc);
}

function onError(err) {
  DOM.btnStart.disabled = false;
  DOM.btnStop.disabled  = true;

  switch (err.code) {
    case err.PERMISSION_DENIED:
      setStatus('error', 'Location access denied.');
      addLog('err', 'Permission denied — enable in browser settings');
      DOM.permBanner.classList.add('show');
      showManual();
      break;

    case err.POSITION_UNAVAILABLE:
      setStatus('error', 'Position unavailable — weak signal.');
      addLog('err', 'GPS signal lost · Move to open area');
      showManual();
      break;

    case err.TIMEOUT:
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
      setStatus('error', 'GPS timed out — retrying in 5s…');
      addLog('err', 'Timeout · Auto-retry in 5 seconds');
      setTimeout(startTracking, 5000);
      break;

    default:
      setStatus('error', 'GPS error: ' + escapeHtml(err.message));
      addLog('err', escapeHtml(err.message));
  }
}

function showManual() {
  DOM.manualWrap.classList.add('show');
}

async function geocodeManual() {
  const addr = DOM.manualAddr.value.trim();
  if (!addr) return;

  const key = (window.RAPIDAID_CONFIG || {}).mapsApiKey || '';
  if (!key) {
    addLog('err', 'Cannot geocode — Maps API key not configured');
    return;
  }

  addLog('sys', 'Geocoding: "' + escapeHtml(addr) + '"…');

  try {
    const url = 'https://maps.googleapis.com/maps/api/geocode/json'
              + '?address=' + encodeURIComponent(addr)
              + '&key='     + encodeURIComponent(key);

    const res  = await fetch(url);
    const data = await res.json();

    if (data.status !== 'OK' || !data.results || !data.results.length) {
      addLog('err', 'Geocoding failed: ' + escapeHtml(data.status || 'no results'));
      return;
    }

    const { lat, lng } = data.results[0].geometry.location;
    addLog('sys', 'Geocoded → ' + lat.toFixed(5) + ', ' + lng.toFixed(5));
    onSuccess({ coords: { latitude: lat, longitude: lng, accuracy: 100 } });
  } catch (e) {
    addLog('err', 'Geocoding error: ' + escapeHtml(e.message));
  }
}

function initSocket() {
  if (window.__socketUnavailable || typeof io === 'undefined') {
    addLog('sys', 'Socket.io unavailable — backend offline (local mode)');
    return;
  }
  try {
    socket = io(BACKEND_URL, {
      transports:           ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay:    2000,
    });

    socket.on('connect', () => {
      addLog('sys', 'Socket connected [' + socket.id + ']');
      socket.emit('join-incident', { caseId: CASE_ID });
    });

    socket.on('joined', (data) => {
      if (data && data.room) addLog('sys', 'Joined room: ' + escapeHtml(data.room));
    });

    socket.on('disconnect', (reason) => {
      addLog('sys', 'Socket disconnected · ' + escapeHtml(String(reason)));
    });

    socket.on('reconnect', (attempt) => {
      addLog('sys', 'Socket reconnected (attempt ' + attempt + ')');
      socket.emit('join-incident', { caseId: CASE_ID });
    });

    socket.on('reconnect_failed', () => {
      addLog('err', 'Socket reconnection failed — backend may be down');
    });

    socket.on('location-update', (data) => {
      if (!data) return;
      addLog('gps', 'Server echo: ' + escapeHtml(String(data.lat)) + ', ' + escapeHtml(String(data.lng)));
    });

    socket.on('responder-update', (data) => {
      if (!data) return;
      addLog('sys', 'Responder: ' + escapeHtml(String(data.unit || '?')) + ' · ETA ' + escapeHtml(String(data.eta || '?')));
    });

    socket.on('operator-update', (data) => {
      if (!data) return;
      addLog('sys', '← ' + escapeHtml(String(data.message || '')));
    });

    socket.on('incident-resolved', () => {
      addLog('sys', 'Incident #' + CASE_ID + ' resolved remotely');
    });

    socket.on('connect_error', (e) => {
      addLog('err', 'Socket error: ' + escapeHtml(e.message));
    });

  } catch (e) {
    addLog('err', 'Socket init failed: ' + escapeHtml(e.message));
  }
}

async function syncToBackend(lat, lng, acc) {
  try {
    const res = await fetch(BACKEND_URL + '/api/location', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ case_id: CASE_ID, lat, lng, acc }),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    addLog('sys', 'Synced to MongoDB ✓ (_id:' + escapeHtml(String(data._id || '?')) + ')');
  } catch (e) {
    addLog('err', 'Sync failed: ' + escapeHtml(e.message));
  }

  if (socket && socket.connected) {
    socket.emit('location-update', {
      case_id:   CASE_ID,
      lat, lng, acc,
      timestamp: new Date().toISOString(),
    });
  }
}

function sendUpdate() {
  const msg = DOM.updateInput.value.trim();
  if (!msg) return;
  addLog('sys', '→ ' + escapeHtml(msg));
  DOM.updateInput.value = '';
  if (socket && socket.connected) {
    socket.emit('operator-update', {
      case_id:   CASE_ID,
      message:   msg,
      timestamp: new Date().toISOString(),
    });
  }
}

function resolveIncident() {
  if (!window.confirm('Mark incident #' + CASE_ID + ' as RESOLVED? This cannot be undone.')) {
    return;
  }

  stopTracking();
  addLog('sys', 'Incident #' + CASE_ID + ' marked as RESOLVED');

  if (socket && socket.connected) {
    socket.emit('incident-resolved', { case_id: CASE_ID });
  }

  const headers = { 'Content-Type': 'application/json' };
  if (_authToken) headers['Authorization'] = 'Bearer ' + _authToken;

  fetch(BACKEND_URL + '/api/incidents/' + encodeURIComponent(CASE_ID) + '/resolve', {
    method:  'POST',
    headers,
  })
    .then(r => r.ok ? r.json() : Promise.reject('HTTP ' + r.status))
    .then(() => addLog('sys', 'Resolve confirmed by server ✓'))
    .catch(e => addLog('err', 'Resolve API: ' + escapeHtml(String(e))));
}

function setStatus(state, text) {
  DOM.statusText.textContent = text;
  DOM.statusDot.className    = 'status-dot';
  if (state === 'active') DOM.statusDot.classList.add('active');
  if (state === 'error')  DOM.statusDot.classList.add('error');
}

function addLog(type, msg) {
  const LABELS   = { gps: 'GPS', err: 'ERR', sys: 'SYS' };
  const safeType = LABELS[type] ? type : 'sys';

  const entry     = document.createElement('div');
  entry.className = 'log-entry';

  const tag       = document.createElement('span');
  tag.className   = 'log-tag ' + safeType;
  tag.textContent = LABELS[safeType];

  entry.appendChild(tag);
  entry.appendChild(document.createTextNode(msg));

  DOM.log.appendChild(entry);
  DOM.log.scrollTop = DOM.log.scrollHeight;

  while (DOM.log.children.length > 40) DOM.log.removeChild(DOM.log.firstChild);
}

addLog('sys', 'RapidAid GPS module loaded');
addLog('sys', 'Initialising Google Maps JS API v3…');
loginAndStoreToken();   
loadGoogleMaps();
initSocket();
