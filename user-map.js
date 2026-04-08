let map;
let marker;
let accuracyCircle;
let userLocation = null;

const FALLBACK_CENTER = { lat: 27.7172, lng: 85.3240 };
const DEFAULT_ZOOM = 15;
const DEFAULT_ACCURACY_RADIUS = 120;

function showToast(message) {
  const toast = document.createElement('div');
  toast.textContent = message;
  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '24px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#1a1f1c',
    color: '#fff',
    padding: '10px 22px',
    borderRadius: '10px',
    fontSize: '14px',
    fontFamily: "'DM Sans', sans-serif",
    zIndex: '9999',
    boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
    opacity: '0',
    transition: 'opacity 0.3s',
  });
  document.body.appendChild(toast);
  requestAnimationFrame(() => (toast.style.opacity = '1'));
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}


//Create (or update) the marker and accuracy circle at the given position.
 
function setPositionOnMap(latLng, accuracyMeters) {
  userLocation = latLng;

  map.setCenter(latLng);

  // Update or create marker
  if (marker) {
    marker.setPosition(latLng);
  } else {
    marker = new google.maps.Marker({
      position: latLng,
      map: map,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#4285f4',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 3,
      },
      title: 'Current Location',
    });
  }

  // Update or create accuracy circle
  const radius = accuracyMeters || DEFAULT_ACCURACY_RADIUS;
  if (accuracyCircle) {
    accuracyCircle.setCenter(latLng);
    accuracyCircle.setRadius(radius);
  } else {
    accuracyCircle = new google.maps.Circle({
      map: map,
      center: latLng,
      radius: radius,
      fillColor: '#4285f4',
      fillOpacity: 0.12,
      strokeColor: '#4285f4',
      strokeOpacity: 0.25,
      strokeWeight: 1,
    });
  }
}


//Request the user's live position via the Geolocation API.
 
function requestGeolocation() {
  if (!navigator.geolocation) {
    console.warn('Geolocation is not supported by this browser.');
    showToast('Geolocation is not supported by your browser.');
    setPositionOnMap(FALLBACK_CENTER, DEFAULT_ACCURACY_RADIUS);
    return;
  }

  navigator.geolocation.getCurrentPosition(
    function onSuccess(position) {
      const latLng = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      setPositionOnMap(latLng, position.coords.accuracy);
    },
    function onError(error) {
      console.warn('Geolocation error:', error.message);
      showToast('Location access denied — showing default location.');
      setPositionOnMap(FALLBACK_CENTER, DEFAULT_ACCURACY_RADIUS);
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
}

/**
 * Google Maps callback — initialises the map then requests geolocation.
 */
function initMap() {
  map = new google.maps.Map(document.getElementById('google-map'), {
    center: FALLBACK_CENTER,
    zoom: DEFAULT_ZOOM,
    disableDefaultUI: true,
    zoomControl: false,
    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: false,
    gestureHandling: 'greedy',
    styles: [
      { featureType: 'poi', stylers: [{ visibility: 'simplified' }] },
      { featureType: 'transit', stylers: [{ visibility: 'off' }] },
    ],
  });

  requestGeolocation();

  document.getElementById('zoomIn').addEventListener('click', function () {
    map.setZoom(map.getZoom() + 1);
  });

  document.getElementById('zoomOut').addEventListener('click', function () {
    map.setZoom(map.getZoom() - 1);
  });

  document.getElementById('recenter').addEventListener('click', function () {
    if (userLocation) {
      map.panTo(userLocation);
      map.setZoom(DEFAULT_ZOOM);
    }

    requestGeolocation();
  });
}

window.initMap = initMap;

fetch("http://localhost:3000/maps")
  .then(res => res.json())
  .then(data => {
    const script = document.createElement("script");
    script.src = data.scriptUrl;
    document.head.appendChild(script);
  });
