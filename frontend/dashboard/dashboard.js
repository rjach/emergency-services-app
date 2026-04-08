
document.addEventListener('DOMContentLoaded', () => {

  // 1. Service Selection Interaction
  const serviceButtons = document.querySelectorAll('.service-btn');

  serviceButtons.forEach(button => {
      button.addEventListener('click', () => {
          // Remove 'active' selection state from all buttons
          serviceButtons.forEach(btn => btn.classList.remove('active'));
          
          // Add 'active' class to the clicked button
          button.classList.add('active');
      });
  });

  // 2. Submit Emergency Interaction
  const submitBtn = document.querySelector('.btn-submit');
  const textArea = document.querySelector('textarea');

  submitBtn.addEventListener('click', () => {
      const activeService = document.querySelector('.service-btn.active');
      const description = textArea.value.trim();
      
      // Guard Clause: Warn user if no emergency type is selected
      if (!activeService) {
          alert("Please select an emergency service (Ambulance, Fire, or Police) first.");
          return;
      }
      
      const serviceType = activeService.getAttribute('data-service');
      
      // Logging for the console simulation
      console.log(`Submitting ${serviceType} request... Context: "${description}"`);
      
      // Final feedback
      alert(`Emergency dispatch triggered for: ${serviceType.toUpperCase()}`);
  });


  // 3. Real-time location tracking (watchPosition + reverse geocoding)
  (function setupRealtimeLocation() {
      const locDetailsEl = document.querySelector('.location-card .loc-details p');
      const signalFillEl = document.querySelector('.location-card .signal-fill');
      const signalTextEl = document.querySelector('.location-card .signal-text');
      const locCoordsEl = document.querySelector('.location-card .loc-coords');

      if (!locDetailsEl || !signalFillEl || !signalTextEl) return;

      function updateSignal(accuracy) {
          const maxAcc = 1000; // meters
          const pct = Math.max(5, Math.min(100, Math.round(100 - (accuracy / maxAcc) * 100)));
          signalFillEl.style.width = pct + '%';
          let desc = 'Very Weak (Low Precision)';
          if (accuracy <= 20) desc = 'Strong (High Precision)';
          else if (accuracy <= 100) desc = 'Good (Medium Precision)';
          else if (accuracy <= 300) desc = 'Weak (Low Precision)';
          signalTextEl.textContent = `Signal strength: ${desc} — ±${Math.round(accuracy)}m`;
      }

      let lastReverse = { lat: null, lon: null, time: 0 };

      function shouldReverse(lat, lon) {
          if (!lastReverse.time) return true;
          const dt = Date.now() - lastReverse.time;
          if (dt > 30000) return true; // at least every 30s
          if (lastReverse.lat === null) return true;
          const dlat = Math.abs(lat - lastReverse.lat);
          const dlon = Math.abs(lon - lastReverse.lon);
          return (dlat > 0.0005 || dlon > 0.0005);
      }

      function reverseGeocode(lat, lon) {
          if (!shouldReverse(lat, lon)) return;
          lastReverse = { lat, lon, time: Date.now() };
          const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`;
          fetch(url, { headers: { 'Accept': 'application/json' } })
            .then(r => r.json())
            .then(data => {
                const addr = data.address || {};
                const city = addr.city || addr.town || addr.village || addr.county || '';
                const state = addr.state || '';
                const postcode = addr.postcode || '';
                const parts = [];
                if (city) parts.push(city);
                if (state) parts.push(state);
                const human = parts.length ? `${parts.join(', ')}${postcode ? ' ' + postcode : ''}` : '';
                locDetailsEl.textContent = human || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
            })
            .catch(err => {
                console.warn('Reverse geocode failed', err);
                locDetailsEl.textContent = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
            });
      }

      if ('geolocation' in navigator) {
          // quick one-time read to populate immediately
          navigator.geolocation.getCurrentPosition((pos) => {
              const { latitude, longitude, accuracy } = pos.coords;
              updateSignal(accuracy);
              if (locCoordsEl) locCoordsEl.textContent = `Lat: ${latitude.toFixed(5)}, Lon: ${longitude.toFixed(5)} · Updated: ${new Date(pos.timestamp).toLocaleTimeString()}`;
              reverseGeocode(latitude, longitude);
          }, (err) => {
              console.warn('Geolocation error', err);
              signalTextEl.textContent = 'Location unavailable';
              signalFillEl.style.width = '5%';
              locDetailsEl.textContent = 'Location unavailable';
          }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 });

          // then watch for updates
          navigator.geolocation.watchPosition((pos) => {
              const { latitude, longitude, accuracy } = pos.coords;
              updateSignal(accuracy);
              if (locCoordsEl) locCoordsEl.textContent = `Lat: ${latitude.toFixed(5)}, Lon: ${longitude.toFixed(5)} · Updated: ${new Date(pos.timestamp).toLocaleTimeString()}`;
              reverseGeocode(latitude, longitude);
          }, (err) => {
              console.warn('Geolocation watch error', err);
          }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 });
      } else {
          signalTextEl.textContent = 'Geolocation not supported';
          signalFillEl.style.width = '5%';
          locDetailsEl.textContent = 'Geolocation not supported';
      }
  })();

});