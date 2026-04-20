(function() {
  'use strict';
  // CONFIGURATION
  const CONFIG = {
    defaultCenter: { lat: 27.7172, lng: 85.3240 }, // Kathmandu (fallback)
    homeSanctuary: { lat: 27.7172, lng: 85.3240, name: 'Home Sanctuary' },
    defaultZoom: 14,
    libraries: ['places'], // Required for Places Autocomplete
    gestureHandling: 'cooperative'
  };
  // CUSTOM MAP STYLES (Muted Green/Teal Theme)
  const mapStyles = [
    { elementType: "geometry", stylers: [{ color: "#e8f0e8" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
    { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#a3c9a3" }] },
    { featureType: "poi.park", elementType: "geometry.fill", stylers: [{ color: "#c8dcc8" }] },
    { featureType: "water", elementType: "geometry.fill", stylers: [{ color: "#c2d9ca" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#4a6b4a" }] },
    { featureType: "poi.place_of_worship", elementType: "labels.text.fill", stylers: [{ color: "#6a4a8a" }] },
    { featureType: "poi.medical", elementType: "labels.text.fill", stylers: [{ color: "#8b4a4a" }] },
    { featureType: "poi.government", elementType: "labels.text.fill", stylers: [{ color: "#4a5a7a" }] },
    { featureType: "poi.school", elementType: "labels.text.fill", stylers: [{ color: "#5a7a4a" }] },
    { featureType: "poi.business", elementType: "labels.text.fill", stylers: [{ color: "#4a5a6a" }] }
  ];
  // STATE VARIABLES
  let map = null;                          // Google Maps instance
  let autocomplete = null;                 // Places Autocomplete instance
  let markers = [];                        // Array of search result markers
  let markerListeners = new Map();         // Track listeners for cleanup
  let homeSanctuaryMarker = null;          // Home location marker
  let homeSanctuaryListener = null;        // Home marker click listener
  let infoWindow = null;                   // Shared info window instance
  let liveLocationWatchId = null;          // Geolocation watch ID
  let liveLocationMarker = null;           // User location marker
  let liveLocationListener = null;         // Location marker click listener
  let isLiveTracking = false;              // Tracking state flag
 
  // INITIALIZATION

async function init() {   //Initialize the map module Fetches API key and loads Google Maps script
    try {
      showLoading();
      const apiKey = await fetchApiKey();
      await loadGoogleMapsScript(apiKey);
    } catch (error) {
      console.error('Failed to initialize map:', error);
      showError('Map service unavailable');
    }
  }

  // UI HELPERS
  
  function showLoading() {   //Show loading spinner while map initializes
    const container = document.getElementById('map');
    if (container) {
      container.innerHTML = `
        <div class="map-loading">
          <div class="map-loading-spinner"></div>
          <div class="map-loading-text">Loading map...</div>
        </div>
      `;
    }
  }

  /**
   * Show error message if map fails to load
   * @param {string} message - Error message to display
   */
  function showError(message) {
    const container = document.getElementById('map');
    if (container) {
      container.innerHTML = `
        <div class="ud-map-error">
          <div class="ud-map-error-icon">🗺️</div>
          <div class="ud-map-error-title">Map service unavailable</div>
          <div class="ud-map-error-message">${message}</div>
        </div>
      `;
    }
  }

  // ============================================
  // API KEY LOADING (Dual-mode: Live Server or Node.js)
  // ============================================
  
  /**
   * Fetch Google Maps API key
   * Supports two modes:
   * 1. Live Server: API key from HTML window variable
   * 2. Node.js Server: API key from /api/maps-config endpoint
   * @returns {Promise<string>} Google Maps API key
   */
  async function fetchApiKey() {
    // Mode 1: Use API key from HTML (for Live Server)
    if (window.USE_API_ENDPOINT === false && window.GOOGLE_MAPS_API_KEY && 
        window.GOOGLE_MAPS_API_KEY !== 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
      return window.GOOGLE_MAPS_API_KEY;
    }
    
    // Mode 2: Fetch from server endpoint (for Node.js)
    try {
      const response = await fetch('/api/maps-config');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      if (data.error || !data.apiKey) {
        throw new Error(data.error || 'API key not available');
      }
      return data.apiKey;
    } catch (error) {
      if (error.name === 'TypeError') {
        throw new Error('Network error - unable to reach server. For Live Server, set window.GOOGLE_MAPS_API_KEY in HTML.');
      }
      throw error;
    }
  }

  // ============================================
  // GOOGLE MAPS SCRIPT LOADING
  // ============================================
  
  /**
   * Dynamically load Google Maps JavaScript API
   * @param {string} apiKey - Google Maps API key
   * @returns {Promise<void>}
   */
  function loadGoogleMapsScript(apiKey) {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (window.google && window.google.maps) {
        onMapsLoaded();
        resolve();
        return;
      }

      // Create script element
      const script = document.createElement('script');
      const libraries = CONFIG.libraries.join(',');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=${libraries}&loading=async&callback=onGoogleMapsLoaded`;
      script.async = true;
      script.defer = true;
      
      // Global callback when Maps API is ready
      window.onGoogleMapsLoaded = function() {
        onMapsLoaded();
        try {
          delete window.onGoogleMapsLoaded;
        } catch (_) {
          window.onGoogleMapsLoaded = undefined;
        }
        resolve();
      };

      script.onerror = () => {
        reject(new Error('Failed to load Google Maps script'));
      };

      document.head.appendChild(script);
    });
  }

  // ============================================
  // MAP INITIALIZATION
  // ============================================
  
  /**
   * Called when Google Maps API is fully loaded
   * Initializes map, search, controls, and markers
   */
  function onMapsLoaded() {
    initMap();
    // Wait for map to be idle before dependent operations
    google.maps.event.addListenerOnce(map, 'idle', () => {
      initSearch();
      initMapControls();
      addHomeSanctuaryMarker();
    });
  }

  /**
   * Initialize the Google Map instance
   * Uses custom styles and disables default UI controls
   */
  function initMap() {
    const mapContainer = document.getElementById('map');
    
    if (!mapContainer) {
      console.error('Map container not found');
      return;
    }

    // Clear loading state
    mapContainer.innerHTML = '';

    // Create map centered on Home Sanctuary
    map = new google.maps.Map(mapContainer, {
      center: CONFIG.homeSanctuary,
      zoom: CONFIG.defaultZoom,
      styles: mapStyles,
      mapTypeId: 'roadmap',
      gestureHandling: CONFIG.gestureHandling,
      disableDefaultUI: true,  // Disable all default controls
      zoomControl: false,
      fullscreenControl: false,
      streetViewControl: false,
      mapTypeControl: false
    });

    // Initialize shared info window
    infoWindow = new google.maps.InfoWindow({
      maxWidth: 280
    });
  }

  // ============================================
  // HOME SANCTUARY MARKER
  // ============================================
  
  /**
   * Add the Home Sanctuary marker to the map
   * Shows last safe check-in time in info window
   */
  function addHomeSanctuaryMarker() {
    homeSanctuaryMarker = new google.maps.Marker({
      position: CONFIG.homeSanctuary,
      map: map,
      title: 'Home Sanctuary',
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: '#5a7a5a',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 3,
        scale: 10
      }
    });

    const content = `
      <div class="info-window-title">Home Sanctuary</div>
      <div class="info-window-address">Last Safe Check-in • 12 mins ago</div>
    `;

    // Show info window on marker click
    homeSanctuaryListener = homeSanctuaryMarker.addListener('click', () => {
      infoWindow.setContent(content);
      infoWindow.open(map, homeSanctuaryMarker);
    });
  }

  // ============================================
  // MAP CONTROLS (Zoom + My Location)
  // ============================================
  
  /**
   * Initialize custom map controls
   * - Zoom In/Out buttons
   * - My Location button (one-time geolocation)
   */
  function initMapControls() {
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    const locationBtn = document.getElementById('live-location-btn');
    const locationStatus = document.getElementById('location-status');

    // Zoom In button
    if (zoomInBtn) {
      zoomInBtn.addEventListener('click', () => {
        const currentZoom = map.getZoom();
        map.setZoom(currentZoom + 1);
      });
    }

    // Zoom Out button
    if (zoomOutBtn) {
      zoomOutBtn.addEventListener('click', () => {
        const currentZoom = map.getZoom();
        map.setZoom(currentZoom - 1);
      });
    }

    // My Location button - one-time geolocation
    if (locationBtn) {
      locationBtn.addEventListener('click', () => {
        requestUserLocation();
      });
    }

    /**
     * Request user's current location using Geolocation API
     * One-time request (not continuous tracking)
     */
    function requestUserLocation() {
      if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser');
        return;
      }

      // Show loading state on button
      locationBtn.classList.add('active');
      if (locationStatus) {
        locationStatus.textContent = 'Getting location...';
        locationStatus.classList.add('visible');
      }

      // Get current position once (not continuous tracking)
      navigator.geolocation.getCurrentPosition(
        (position) => onLocationSuccess(position),
        (error) => onLocationError(error),
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    }

    /**
     * Handle successful geolocation
     * Centers map and adds blue dot marker
     * @param {GeolocationPosition} position - User's position
     */
    function onLocationSuccess(position) {
      const userLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      // Center map on user location
      map.panTo(userLocation);
      map.setZoom(15);

      // Remove old marker if exists (cleanup)
      if (liveLocationMarker) {
        if (liveLocationListener) {
          google.maps.event.removeListener(liveLocationListener);
          liveLocationListener = null;
        }
        liveLocationMarker.setMap(null);
      }

      // Create new blue dot marker at user location
      liveLocationMarker = new google.maps.Marker({
        position: userLocation,
        map: map,
        title: 'Your Location',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: '#4a90d9',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
          scale: 10
        },
        zIndex: 1000
      });

      // Show info window on marker click
      liveLocationListener = liveLocationMarker.addListener('click', () => {
        infoWindow.setContent('<div class="info-window-title">Your Location</div>');
        infoWindow.open(map, liveLocationMarker);
      });

      // Reset button state after short delay
      setTimeout(() => {
        locationBtn.classList.remove('active');
        if (locationStatus) {
          locationStatus.classList.remove('visible');
        }
      }, 2000);
    }

    /**
     * Handle geolocation errors with specific messages
     * @param {GeolocationPositionError} error - Error object
     */
    function onLocationError(error) {
      console.error('Location error:', error);
      
      let message = 'Unable to retrieve your location';
      
      // Specific error messages based on error code
      switch(error.code) {
        case error.PERMISSION_DENIED:
          message = 'Location permission denied. Please enable location access.';
          break;
        case error.POSITION_UNAVAILABLE:
          message = 'Location information unavailable. Please try again.';
          break;
        case error.TIMEOUT:
          message = 'Location request timed out. Please check your connection.';
          break;
      }

      alert(message);

      // Reset button state
      locationBtn.classList.remove('active');
      if (locationStatus) {
        locationStatus.classList.remove('visible');
      }
    }
  }

  // ============================================
  // PLACES AUTOCOMPLETE SEARCH
  // ============================================
  
  /**
   * Initialize Google Places Autocomplete for location search
   * Binds to map bounds and handles place selection
   */
  function initSearch() {
    const searchInput = document.getElementById('map-search');
    
    if (!searchInput || !map) return;

    // Create autocomplete instance
    autocomplete = new google.maps.places.Autocomplete(searchInput, {
      types: ['geocode', 'establishment'],
      fields: ['place_id', 'geometry', 'name', 'formatted_address']
    });

    // Bind to map bounds (results biased to current view)
    autocomplete.bindTo('bounds', map);

    // Listen for place selection
    autocomplete.addListener('place_changed', onPlaceChanged);

    // Prevent form submission on Enter key
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
      }
    });
  }

  /**
   * Handle place selection from autocomplete
   * Clears old markers, pans to new location, adds marker
   */
  function onPlaceChanged() {
    const place = autocomplete.getPlace();

    if (!place.geometry || !place.geometry.location) {
      console.warn('No geometry available for this place');
      return;
    }

    // Clear existing search markers
    clearMarkers();

    // Pan to selected location
    map.panTo(place.geometry.location);
    map.setZoom(16);

    // Add marker at selected location
    addMarker(place.geometry.location, place.name, place.formatted_address);
  }

  /**
   * Add a custom marker to the map
   * @param {google.maps.LatLng} position - Marker position
   * @param {string} title - Marker title
   * @param {string} address - Address for info window
   */
  function addMarker(position, title, address) {
    const marker = new google.maps.Marker({
      position: position,
      map: map,
      title: title,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: '#5a7a5a',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 3,
        scale: 8
      }
    });

    markers.push(marker);

    // Create info window content (XSS-safe)
    const content = `
      <div class="info-window-title">${escapeHtml(title)}</div>
      ${address ? `<div class="info-window-address">${escapeHtml(address)}</div>` : ''}
    `;

    // Show info window on marker click
    const clickListener = marker.addListener('click', () => {
      infoWindow.setContent(content);
      infoWindow.open(map, marker);
    });

    // Store listener for cleanup (memory management)
    markerListeners.set(marker, [clickListener]);

    // Open info window by default
    infoWindow.setContent(content);
    infoWindow.open(map, marker);
  }

  /**
   * Clear all search markers from map
   * Removes listeners to prevent memory leaks
   */
  function clearMarkers() {
    markers.forEach(marker => {
      const listeners = markerListeners.get(marker);
      if (listeners) {
        listeners.forEach(listener => google.maps.event.removeListener(listener));
      }
      marker.setMap(null);
    });
    markers = [];
    markerListeners.clear();

    if (infoWindow) {
      infoWindow.close();
    }
  }

  /**
   * Escape HTML to prevent XSS attacks
   * @param {string} text - Raw text
   * @returns {string} Escaped HTML
   */
  function escapeHtml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ============================================
  // INITIALIZATION & CLEANUP
  // ============================================
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Cleanup geolocation on page unload to prevent memory leaks
  window.addEventListener('beforeunload', () => {
    if (liveLocationWatchId !== null) {
      navigator.geolocation.clearWatch(liveLocationWatchId);
    }
  });

  // ============================================
  // PUBLIC API (for external access)
  // ============================================
  window.RapidAidMap = {
    init,           // Re-initialize map
    map: () => map, // Get map instance
    addMarker,      // Add custom marker
    clearMarkers    // Clear all search markers
  };

})();
