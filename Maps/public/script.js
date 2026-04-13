let map = null;
let ambulanceMarker = null;
let medicMarker = null;
let incidentMarker = null;
let userLocationOverlay = null;
let socket = null;
let pollingInterval = null;

let reporterInput = null;
let btnSend = null;
let btnResolve = null;
let confirmModal = null;
let modalCancel = null;
let modalConfirm = null;
let statusBadge = null;

const INCIDENT_POS = { lat: 27.7172, lng: 85.3240 };
const AMBULANCE_START = { lat: 27.7250, lng: 85.3150 };
const MEDIC_START = { lat: 27.7100, lng: 85.3350 };

const KATHMANDU_LANDMARKS = [
  {
    name: 'Swayambhunath',
    position: { lat: 27.7149, lng: 85.2904 },
    type: 'temple',
    description: 'Monkey Temple - UNESCO World Heritage Site'
  },
  {
    name: 'Boudhanath',
    position: { lat: 27.7215, lng: 85.3620 },
    type: 'temple',
    description: 'Great Stupa - UNESCO World Heritage Site'
  },
  {
    name: 'Pashupatinath',
    position: { lat: 27.7104, lng: 85.3488 },
    type: 'temple',
    description: 'Sacred Hindu Temple - UNESCO World Heritage Site'
  },
  {
    name: 'Durbar Square',
    position: { lat: 27.7042, lng: 85.3067 },
    type: 'landmark',
    description: 'Kathmandu Durbar Square - UNESCO World Heritage Site'
  },
  {
    name: 'Thamel',
    position: { lat: 27.7154, lng: 85.3108 },
    type: 'area',
    description: 'Tourist Hub - Shops, Restaurants, Hotels'
  }
];

const mapStyles = [
  {
    "elementType": "geometry",
    "stylers": [{ "color": "#e8f0e8" }]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#4a6b4a" }]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [{ "color": "#f0f5f0" }]
  },
  {
    "featureType": "administrative",
    "elementType": "geometry.stroke",
    "stylers": [{ "color": "#c5d8c5" }]
  },
  {
    "featureType": "administrative.land_parcel",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#5a7a5a" }]
  },
  {
    "featureType": "landscape.natural",
    "elementType": "geometry",
    "stylers": [{ "color": "#dce9dc" }]
  },
  {
    "featureType": "poi",
    "elementType": "geometry",
    "stylers": [{ "color": "#d4e5d4" }]
  },
  {
    "featureType": "poi",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#4a6b4a" }]
  },
  {
    "featureType": "poi",
    "elementType": "labels.text.stroke",
    "stylers": [{ "color": "#f0f5f0" }]
  },
  {
    "featureType": "poi.park",
    "elementType": "geometry.fill",
    "stylers": [{ "color": "#c8dcc8" }]
  },
  {
    "featureType": "poi.park",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#3d6b3d" }]
  },
  {
    "featureType": "poi.business",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#4a5a6a" }]
  },
  {
    "featureType": "poi.medical",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#8b4a4a" }]
  },
  {
    "featureType": "poi.government",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#4a5a7a" }]
  },
  {
    "featureType": "poi.place_of_worship",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#6a4a8a" }]
  },
  {
    "featureType": "poi.school",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#5a7a4a" }]
  },
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [{ "color": "#ffffff" }]
  },
  {
    "featureType": "road",
    "elementType": "geometry.stroke",
    "stylers": [{ "color": "#c5d8c5" }]
  },
  {
    "featureType": "road",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#4a6b4a" }]
  },
  {
    "featureType": "road.arterial",
    "elementType": "geometry",
    "stylers": [{ "color": "#f5faf5" }]
  },
  {
    "featureType": "road.arterial",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#3d5a3d" }]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry",
    "stylers": [{ "color": "#e8f5e8" }]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry.stroke",
    "stylers": [{ "color": "#b5d8b5" }]
  },
  {
    "featureType": "road.highway",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#3d5a3d" }]
  },
  {
    "featureType": "road.local",
    "elementType": "geometry",
    "stylers": [{ "color": "#ffffff" }]
  },
  {
    "featureType": "road.local",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#5a7a5a" }]
  },
  {
    "featureType": "transit",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#5a6a7a" }]
  },
  {
    "featureType": "water",
    "elementType": "geometry.fill",
    "stylers": [{ "color": "#c2d9ca" }]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#5a8a7a" }]
  }
];

function initMap() {
  if (typeof google === 'undefined' || !google.maps) {
    console.error('Google Maps API failed to load');
    showMapError('Failed to load map. Please check your internet connection.');
    return;
  }

  defineHTMLMarkerOverlay();

  const mapEl = document.getElementById('map');
  const loadingEl = document.getElementById('mapLoading');

  if (!mapEl) {
    console.error('Map container not found');
    return;
  }

  try {
    map = new google.maps.Map(mapEl, {
      center: INCIDENT_POS,
      zoom: 13,
      styles: mapStyles,
      disableDefaultUI: true,
      zoomControl: false,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      gestureHandling: 'greedy',
      mapTypeId: 'roadmap'
    });

    createMarkers();
    createLandmarkMarkers();

    google.maps.event.addListenerOnce(map, 'tilesloaded', function() {
      if (loadingEl) {
        loadingEl.classList.add('hidden');
        setTimeout(() => { loadingEl.style.display = 'none'; }, 500);
      }
    });

    bindMapControls();

  } catch (error) {
    console.error('Error initializing map:', error);
    showMapError('Error initializing map. Please refresh the page.');
  }
}

function showMapError(message) {
  const loadingEl = document.getElementById('mapLoading');
  if (loadingEl) {
    loadingEl.innerHTML = `
      <div style="text-align: center; color: #8b4a4a;">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#8b4a4a" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p style="margin-top: 16px; font-weight: 500;">${message}</p>
      </div>
    `;
  }
}

function defineHTMLMarkerOverlay() {
  if (window.HTMLMarkerOverlay) return;

  window.HTMLMarkerOverlay = class extends google.maps.OverlayView {
    constructor(position, html, mapInstance, options = {}) {
      super();
      this.position = position;
      this.html = html;
      this.div = null;
      this.options = options;
      this.setMap(mapInstance);
    }

    onAdd() {
      this.div = document.createElement('div');
      this.div.style.position = 'absolute';
      this.div.style.transform = 'translate(-50%, -50%)';
      this.div.innerHTML = this.html;
      
      if (this.options.onClick) {
        this.div.style.cursor = 'pointer';
        this.div.addEventListener('click', this.options.onClick);
      }
      
      const panes = this.getPanes();
      if (panes && panes.overlayMouseTarget) {
        panes.overlayMouseTarget.appendChild(this.div);
      }
    }

    draw() {
      if (!this.div) return;
      const projection = this.getProjection();
      if (!projection) return;
      
      const point = projection.fromLatLngToDivPixel(
        new google.maps.LatLng(this.position.lat, this.position.lng)
      );
      if (point) {
        this.div.style.left = point.x + 'px';
        this.div.style.top = point.y + 'px';
      }
    }

    onRemove() {
      if (this.div && this.div.parentNode) {
        this.div.parentNode.removeChild(this.div);
        this.div = null;
      }
    }

    setPosition(pos) {
      this.position = pos;
      this.draw();
    }

    getPosition() {
      return this.position;
    }
  };
}

function createMarkers() {
  const ambulanceHTML = `
    <div class="marker-label-wrap">
      <div class="marker-icon-circle" style="background: #E53E3E;">A</div>
      <div class="marker-text-label">Ambulance 104</div>
    </div>`;
  ambulanceMarker = new HTMLMarkerOverlay(AMBULANCE_START, ambulanceHTML, map);

  const medicHTML = `
    <div class="marker-label-wrap">
      <div class="marker-icon-circle" style="background: #3182CE;">M</div>
      <div class="marker-text-label">Medic Unit 02</div>
    </div>`;
  medicMarker = new HTMLMarkerOverlay(MEDIC_START, medicHTML, map);

  const starSVG = `<svg class="marker-star" width="28" height="28" viewBox="0 0 24 24" fill="#C47A2A" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2l2.4 7.2H22l-6 4.8 2.4 7.2L12 16.4 5.6 21.2 8 14 2 9.2h7.6L12 2z"/>
  </svg>`;
  incidentMarker = new HTMLMarkerOverlay(INCIDENT_POS, starSVG, map);
}

function createLandmarkMarkers() {
  KATHMANDU_LANDMARKS.forEach(landmark => {
    const color = landmark.type === 'temple' ? '#6a4a8a' : 
                  landmark.type === 'landmark' ? '#C47A2A' : '#3D7A5A';
    
    const landmarkHTML = `
      <div class="marker-label-wrap landmark-marker" title="${landmark.description}">
        <div class="marker-icon-circle" style="background: ${color}; width: 24px; height: 24px; font-size: 12px;">
          ${landmark.type === 'temple' ? '⛪' : landmark.type === 'landmark' ? '🏛️' : '📍'}
        </div>
        <div class="marker-text-label" style="font-size: 10px; max-width: 100px; text-align: center;">${landmark.name}</div>
      </div>
    `;
    
    new HTMLMarkerOverlay(landmark.position, landmarkHTML, map, {
      onClick: () => {
        showToast(`${landmark.name}: ${landmark.description}`, false);
      }
    });
  });
}

function bindMapControls() {
  const btnZoomIn = document.getElementById('btnZoomIn');
  const btnZoomOut = document.getElementById('btnZoomOut');
  const btnMyLocation = document.getElementById('btnMyLocation');

  if (btnZoomIn) {
    btnZoomIn.addEventListener('click', function() {
      if (map) map.setZoom(map.getZoom() + 1);
    });
  }

  if (btnZoomOut) {
    btnZoomOut.addEventListener('click', function() {
      if (map) map.setZoom(map.getZoom() - 1);
    });
  }

  if (btnMyLocation) {
    btnMyLocation.addEventListener('click', function() {
      requestUserLocation();
    });
  }
}

function requestUserLocation() {
  if (!navigator.geolocation) {
    showToast('Geolocation is not supported by your browser.', false);
    return;
  }

  showToast('Requesting your location...', false, true);

  navigator.geolocation.getCurrentPosition(
    onGeolocationSuccess,
    onGeolocationError,
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
}

function onGeolocationSuccess(position) {
  const pos = {
    lat: position.coords.latitude,
    lng: position.coords.longitude
  };

  if (userLocationOverlay) {
    userLocationOverlay.setMap(null);
  }

  const dotHTML = '<div class="user-location-dot"></div>';
  userLocationOverlay = new HTMLMarkerOverlay(pos, dotHTML, map);

  map.panTo(pos);
  map.setZoom(15);
  dismissAllToasts();
  showToast('Location found! Showing your position.', false);
}

function onGeolocationError(error) {
  dismissAllToasts();
  let message = '';
  switch (error.code) {
    case error.PERMISSION_DENIED:
      message = 'Location access denied. Enable location in browser settings to use this feature.';
      break;
    case error.POSITION_UNAVAILABLE:
      message = 'Unable to determine your location. Please try again.';
      break;
    case error.TIMEOUT:
      message = 'Location request timed out. Check your connection and retry.';
      break;
    default:
      message = 'An unknown error occurred while getting your location.';
  }
  showToast(message, true);
}

function showToast(message, showRetry, isLoading) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = 'toast';

  let inner = '';
  if (isLoading) {
    inner += '<div class="map-spinner" style="width:20px;height:20px;border-width:2px;flex-shrink:0;"></div>';
  }
  inner += '<span class="toast-message">' + escapeHTML(message) + '</span>';
  if (showRetry) {
    inner += '<button class="toast-retry" onclick="requestUserLocation()">Retry</button>';
  }
  inner += '<button class="toast-close" onclick="this.parentElement.remove()">✕</button>';

  toast.innerHTML = inner;
  container.appendChild(toast);

  if (!showRetry && !isLoading) {
    setTimeout(() => {
      if (toast.parentElement) {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
      }
    }, 5000);
  }
}

function dismissAllToasts() {
  const container = document.getElementById('toastContainer');
  if (container) {
    container.innerHTML = '';
  }
}

function animateMarkerMove(overlay, from, to, duration) {
  const startTime = performance.now();

  function step(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);

    const lat = from.lat + (to.lat - from.lat) * ease;
    const lng = from.lng + (to.lng - from.lng) * ease;

    overlay.setPosition({ lat, lng });

    if (progress < 1) {
      requestAnimationFrame(step);
    }
  }

  requestAnimationFrame(step);
}

function initSocket() {
  if (typeof io === 'undefined') {
    console.log('Socket.io not available, using polling fallback');
    startPolling();
    return;
  }

  try {
    socket = io();

    socket.on('connect', function() {
      console.log('Socket.io connected');
      if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
      }
    });

    socket.on('new-update', function(update) {
      addLogEntry(update.category, update.message);
    });

    socket.on('disconnect', function() {
      console.log('Socket.io disconnected');
      if (!pollingInterval) {
        startPolling();
      }
    });

    socket.on('connect_error', function(err) {
      console.log('Socket.io connection error, falling back to polling:', err.message);
      if (!pollingInterval) {
        startPolling();
      }
    });
  } catch (error) {
    console.error('Socket.io initialization error:', error);
    startPolling();
  }
}

let lastUpdateId = null;

function startPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
  }

  pollingInterval = setInterval(async () => {
    try {
      const response = await fetch('/api/updates');
      if (!response.ok) throw new Error('HTTP ' + response.status);
      
      const updates = await response.json();
      if (updates.length > 0) {
        const latest = updates[updates.length - 1];
        if (latest.id !== lastUpdateId) {
          lastUpdateId = latest.id;
          addLogEntry(latest.category, latest.message);
        }
      }
    } catch (err) {
      console.error('Polling error:', err);
    }
  }, 15000);
}

function addLogEntry(category, message) {
  const log = document.getElementById('liveUpdatesLog');
  if (!log) return;
  
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.innerHTML =
    '<span class="log-category">' + escapeHTML(category) + '</span>' +
    '<p class="log-message">' + escapeHTML(message) + '</p>';

  log.insertBefore(entry, log.firstChild);

  while (log.children.length > 20) {
    log.removeChild(log.lastChild);
  }
}

function escapeHTML(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function initReporterInput() {
  reporterInput = document.getElementById('reporterInput');
  btnSend = document.getElementById('btnSendUpdate');

  if (!reporterInput || !btnSend) {
    console.warn('Reporter input elements not found');
    return;
  }

  btnSend.addEventListener('click', sendReporterMessage);
  reporterInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendReporterMessage();
    }
  });
}

function sendReporterMessage() {
  if (!reporterInput) return;
  
  const msg = reporterInput.value.trim();
  if (!msg) return;

  addLogEntry('REPORTER', msg);

  if (socket && socket.connected) {
    socket.emit('reporter-message', msg);
  }

  reporterInput.value = '';
}

function initModalHandlers() {
  btnResolve = document.getElementById('btnResolve');
  confirmModal = document.getElementById('confirmModal');
  modalCancel = document.getElementById('modalCancel');
  modalConfirm = document.getElementById('modalConfirm');
  statusBadge = document.getElementById('statusBadge');

  if (!btnResolve || !confirmModal || !modalCancel || !modalConfirm) {
    console.warn('Modal elements not found');
    return;
  }

  btnResolve.addEventListener('click', function() {
    confirmModal.style.display = 'flex';
  });

  modalCancel.addEventListener('click', function() {
    confirmModal.style.display = 'none';
  });

  confirmModal.addEventListener('click', function(e) {
    if (e.target === confirmModal) {
      confirmModal.style.display = 'none';
    }
  });

  modalConfirm.addEventListener('click', function() {
    confirmModal.style.display = 'none';

    btnResolve.classList.add('resolve-animate');
    setTimeout(() => {
      btnResolve.classList.remove('resolve-animate');
      btnResolve.classList.add('resolved');
      const span = btnResolve.querySelector('span');
      if (span) span.textContent = 'Resolved';
    }, 600);

    if (statusBadge) {
      statusBadge.textContent = 'RESOLVED';
      statusBadge.classList.remove('badge-responding');
      statusBadge.classList.add('badge-resolved');
    }

    addLogEntry('SYSTEM', 'Incident marked as resolved by operator.');
  });
}

document.addEventListener('DOMContentLoaded', function() {
  initSocket();
  initReporterInput();
  initModalHandlers();
});

window.initMap = initMap;
