(function () {
  'use strict';

  /** @type {{ latitude: number, longitude: number, accuracyM: number | null, addressLabel: string } | null} */
  let lastKnownLocation = null;

  document.addEventListener('DOMContentLoaded', () => {
    let dashboardMap = null;
    let dashboardMarker = null;

    const DEFAULT_MAP_CENTER = [37.7749, -122.4194];
    const DEFAULT_MAP_ZOOM = 12;

    function createDashboardPinIcon() {
      const L = window.L;
      return L.divIcon({
        className: 'dashboard-pin-marker',
        html:
          '<div class="dashboard-pin-inner" aria-hidden="true"></div>' +
          '<span class="visually-hidden">Your approximate position</span>',
        iconSize: [26, 26],
        iconAnchor: [13, 13],
        popupAnchor: [0, -12],
      });
    }

    function initDashboardMapIfNeeded() {
      const mapEl = document.getElementById('dashboard-map');
      const L = window.L;
      if (!mapEl || !L || typeof L.map !== 'function') return false;
      if (dashboardMap) return true;

      dashboardMap = L.map(mapEl, {
        scrollWheelZoom: true,
        zoomControl: true,
      }).setView(DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(dashboardMap);

      const invalidate = () => {
        try {
          dashboardMap.invalidateSize();
        } catch (_) {
          /* ignore */
        }
      };
      requestAnimationFrame(invalidate);
      setTimeout(invalidate, 200);
      setTimeout(invalidate, 600);
      return true;
    }

    /**
     * @param {number} lat
     * @param {number} lng
     * @param {number | null} accuracyM
     */
    function updateDashboardMap(lat, lng, accuracyM) {
      if (!initDashboardMapIfNeeded()) return;
      const L = window.L;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      if (!dashboardMarker) {
        dashboardMarker = L.marker([lat, lng], {
          icon: createDashboardPinIcon(),
          title: 'Your approximate position',
        }).addTo(dashboardMap);
      } else {
        dashboardMarker.setLatLng([lat, lng]);
      }

      let zoom = 15;
      if (typeof accuracyM === 'number' && Number.isFinite(accuracyM)) {
        if (accuracyM > 250) zoom = 13;
        else if (accuracyM > 100) zoom = 14;
        else if (accuracyM > 35) zoom = 15;
        else zoom = 16;
      }

      const maxZ = dashboardMap.getMaxZoom ? dashboardMap.getMaxZoom() : 19;
      dashboardMap.setView([lat, lng], Math.min(zoom, maxZ), { animate: true });
      requestAnimationFrame(() => {
        try {
          dashboardMap.invalidateSize();
        } catch (_) {
          /* ignore */
        }
      });
    }

    function resetDashboardMapToDefault() {
      if (!initDashboardMapIfNeeded()) return;
      if (dashboardMarker && dashboardMap.hasLayer(dashboardMarker)) {
        dashboardMap.removeLayer(dashboardMarker);
        dashboardMarker = null;
      }
      dashboardMap.setView(DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM);
      requestAnimationFrame(() => {
        try {
          dashboardMap.invalidateSize();
        } catch (_) {
          /* ignore */
        }
      });
    }

    initDashboardMapIfNeeded();

    const A = window.RapidAidAuth;
    const loginBtn = document.getElementById('btn-dashboard-login');
    if (loginBtn && A) {
      const token = A.getToken();
      const user = A.getUser();
      if (token && user) {
        loginBtn.textContent = user.role === 'agency_admin' ? 'Agency console' : 'My dashboard';
      }
      loginBtn.addEventListener('click', async () => {
        const t = A.getToken();
        if (t) {
          const u = await A.refreshUserFromApi();
          if (u) {
            A.redirectAfterAuth(u);
            return;
          }
        }
        window.location.href = A.appHtmlPath('index.html');
      });
    } else if (loginBtn) {
      loginBtn.addEventListener('click', () => {
        window.location.href = '../index.html';
      });
    }

    (function setupHeaderNav() {
      const header = document.querySelector('.site-header');
      const toggle = document.getElementById('nav-menu-toggle');
      const nav = document.getElementById('site-nav');
      if (!header || !toggle || !nav) return;

      function setNavOpen(open) {
        header.classList.toggle('nav-open', open);
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      }

      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        setNavOpen(!header.classList.contains('nav-open'));
      });

      nav.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', () => setNavOpen(false));
      });

      document.addEventListener('click', (e) => {
        if (!header.classList.contains('nav-open')) return;
        if (e.target instanceof Node && header.contains(e.target)) return;
        setNavOpen(false);
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') setNavOpen(false);
      });

      const mql = window.matchMedia('(min-width: 768px)');
      function onNavBreakpoint() {
        if (mql.matches) setNavOpen(false);
      }
      if (typeof mql.addEventListener === 'function') {
        mql.addEventListener('change', onNavBreakpoint);
      } else {
        mql.addListener(onNavBreakpoint);
      }
    })();

    let mapResizeTimer = null;
    const MAP_RESIZE_DEBOUNCE_MS = 150;
    // Debounced invalidateSize keeps the map aligned after viewport or breakpoint changes.
    window.addEventListener('resize', () => {
      if (!dashboardMap) return;
      clearTimeout(mapResizeTimer);
      mapResizeTimer = setTimeout(() => {
        try {
          dashboardMap.invalidateSize();
        } catch (_) {
          /* ignore */
        }
      }, MAP_RESIZE_DEBOUNCE_MS);
    });

    const serviceButtons = document.querySelectorAll('.service-btn');
    serviceButtons.forEach((button) => {
      button.addEventListener('click', () => {
        serviceButtons.forEach((btn) => btn.classList.remove('active'));
        button.classList.add('active');
      });
    });

    const submitBtn = document.getElementById('btn-submit-incident');
    const textArea = document.getElementById('incident-description');
    const errEl = document.getElementById('incident-form-error');
    const okEl = document.getElementById('incident-form-success');

    function setFormError(msg) {
      if (!errEl) return;
      if (!msg) {
        errEl.hidden = true;
        errEl.textContent = '';
        return;
      }
      errEl.hidden = false;
      errEl.textContent = msg;
    }

    function setFormSuccess(msg) {
      if (!okEl) return;
      if (!msg) {
        okEl.hidden = true;
        okEl.textContent = '';
        return;
      }
      okEl.hidden = false;
      okEl.textContent = msg;
    }

    function incidentLocationPayload() {
      return lastKnownLocation
        ? {
            latitude: lastKnownLocation.latitude,
            longitude: lastKnownLocation.longitude,
            accuracyM: lastKnownLocation.accuracyM,
            addressLabel: lastKnownLocation.addressLabel,
          }
        : {};
    }

    async function submitIncident() {
      if (!A || !submitBtn) return;
      const activeService = document.querySelector('.service-btn.active');
      const description = textArea ? textArea.value.trim() : '';

      if (!activeService) {
        setFormError('Please select an emergency service (Ambulance, Fire, or Police) first.');
        setFormSuccess('');
        return;
      }

      const serviceType = activeService.getAttribute('data-service');
      setFormError('');
      setFormSuccess('');

      const body = {
        serviceType,
        description,
        location: incidentLocationPayload(),
      };

      submitBtn.disabled = true;
      const { ok, data, status } = await A.api('/incidents', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      submitBtn.disabled = false;

      if (!ok) {
        setFormError(data.message || 'Could not submit your report. Please try again.');
        return;
      }

      const ref = data.incident && data.incident.id ? ` Reference: ${data.incident.id}` : '';
      setFormSuccess(
        `Your report was received and sent to the agency command center.${ref} If you are able, stay safe and await instructions.`
      );
      if (textArea) textArea.value = '';
      activeService.classList.remove('active');
    }

    if (submitBtn) {
      submitBtn.addEventListener('click', () => {
        submitIncident();
      });
    }

    (function setupVoiceIncident() {
      const voiceBtn = document.getElementById('btn-voice-incident');
      const voiceStatusEl = document.getElementById('voice-status');
      if (!voiceBtn || !A) return;

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      let recognition = null;
      let listening = false;
      let collectedTranscript = '';
      let mediaStream = null;

      function setVoiceStatus(text) {
        if (voiceStatusEl) voiceStatusEl.textContent = text || '';
      }

      function releaseMic() {
        if (mediaStream) {
          mediaStream.getTracks().forEach((t) => t.stop());
          mediaStream = null;
        }
      }

      function setListeningUI(on) {
        listening = on;
        voiceBtn.classList.toggle('listening', on);
        voiceBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
      }

      async function sendVoiceToBackend(transcript) {
        setFormError('');
        setFormSuccess('');
        voiceBtn.disabled = true;
        if (submitBtn) submitBtn.disabled = true;
        setVoiceStatus('Sending to dispatch…');
        const body = {
          transcript,
          location: incidentLocationPayload(),
        };
        const { ok, data } = await A.api('/incidents/voice', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        voiceBtn.disabled = false;
        if (submitBtn) submitBtn.disabled = false;
        setVoiceStatus('');

        if (!ok) {
          setFormError(data.message || 'Voice report failed. Please try again.');
          return;
        }
        if (data.success) {
          const ref = data.incident && data.incident.id ? ` Reference: ${data.incident.id}` : '';
          setFormSuccess(`${data.message}${ref}`);
          if (textArea) textArea.value = transcript;
        } else {
          setFormError(
            data.message ||
              'Could not create an incident from what we heard. Try again or use the form.'
          );
        }
      }

      function stopRecognition() {
        if (recognition && listening) {
          try {
            recognition.stop();
          } catch (_) {
            /* ignore */
          }
        }
      }

      async function startVoiceFlow() {
        if (!SpeechRecognition) {
          setFormError(
            'Speech recognition is not supported in this browser. Try Chrome or Edge, or type your report.'
          );
          return;
        }

        if (listening) {
          stopRecognition();
          setVoiceStatus('Stopping…');
          return;
        }

        setFormError('');
        setFormSuccess('');

        try {
          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('Microphone access is not available in this context.');
          }
          mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (err) {
          console.warn('getUserMedia', err);
          setFormError(
            err.name === 'NotAllowedError'
              ? 'Microphone permission was denied. Allow access in your browser settings to use voice reporting.'
              : 'Could not access the microphone. Check permissions and try again.'
          );
          releaseMic();
          return;
        }

        collectedTranscript = '';
        recognition = new SpeechRecognition();
        recognition.lang = navigator.language || 'en-US';
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          setListeningUI(true);
          setVoiceStatus('Listening… speak clearly, then pause.');
        };

        recognition.onresult = (event) => {
          for (let i = event.resultIndex; i < event.results.length; i += 1) {
            if (event.results[i].isFinal) {
              collectedTranscript += event.results[i][0].transcript;
            }
          }
        };

        recognition.onerror = (event) => {
          console.warn('SpeechRecognition error', event.error);
          if (event.error === 'not-allowed') {
            setFormError('Speech recognition was blocked. Allow microphone access for this site.');
          } else if (event.error === 'no-speech') {
            setVoiceStatus('No speech detected. Tap the mic to try again.');
          } else if (event.error !== 'aborted') {
            setFormError(`Voice capture error: ${event.error}. Try again or use the form.`);
          }
        };

        recognition.onend = async () => {
          releaseMic();
          setListeningUI(false);
          const text = collectedTranscript.trim();
          collectedTranscript = '';
          if (!text) {
            return;
          }
          await sendVoiceToBackend(text);
        };

        try {
          recognition.start();
        } catch (e) {
          console.warn(e);
          releaseMic();
          setListeningUI(false);
          setFormError('Could not start voice recognition. Try again.');
        }
      }

      voiceBtn.addEventListener('click', () => {
        startVoiceFlow();
      });
    })();

    (function setupRealtimeLocation() {
      const locDetailsEl = document.querySelector('.location-card .loc-details p');
      const signalFillEl = document.querySelector('.location-card .signal-fill');
      const signalTextEl = document.querySelector('.location-card .signal-text');
      const locCoordsEl = document.querySelector('.location-card .loc-coords');

      if (!locDetailsEl || !signalFillEl || !signalTextEl) return;

      function updateSignal(accuracy) {
        const maxAcc = 1000;
        const pct = Math.max(5, Math.min(100, Math.round(100 - (accuracy / maxAcc) * 100)));
        signalFillEl.style.width = pct + '%';
        let desc = 'Very Weak (Low Precision)';
        if (accuracy <= 20) desc = 'Strong (High Precision)';
        else if (accuracy <= 100) desc = 'Good (Medium Precision)';
        else if (accuracy <= 300) desc = 'Weak (Low Precision)';
        signalTextEl.textContent = `Signal strength: ${desc} - +/-${Math.round(accuracy)}m`;
      }

      let lastReverse = { lat: null, lon: null, time: 0 };

      function shouldReverse(lat, lon) {
        if (!lastReverse.time) return true;
        const dt = Date.now() - lastReverse.time;
        if (dt > 30000) return true;
        if (lastReverse.lat === null) return true;
        const dlat = Math.abs(lat - lastReverse.lat);
        const dlon = Math.abs(lon - lastReverse.lon);
        return dlat > 0.0005 || dlon > 0.0005;
      }

      function reverseGeocode(lat, lon) {
        if (!shouldReverse(lat, lon)) return;
        lastReverse = { lat, lon, time: Date.now() };
        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`;
        fetch(url, { headers: { Accept: 'application/json' } })
          .then((r) => r.json())
          .then((data) => {
            const addr = data.address || {};
            const city = addr.city || addr.town || addr.village || addr.county || '';
            const state = addr.state || '';
            const postcode = addr.postcode || '';
            const parts = [];
            if (city) parts.push(city);
            if (state) parts.push(state);
            const human = parts.length ? `${parts.join(', ')}${postcode ? ` ${postcode}` : ''}` : '';
            const label = human || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
            locDetailsEl.textContent = label;
            if (lastKnownLocation) {
              lastKnownLocation.addressLabel = label;
            }
          })
          .catch((err) => {
            console.warn('Reverse geocode failed', err);
            const fallback = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
            locDetailsEl.textContent = fallback;
            if (lastKnownLocation) {
              lastKnownLocation.addressLabel = fallback;
            }
          });
      }

      function recordPosition(pos) {
        const { latitude, longitude, accuracy } = pos.coords;
        lastKnownLocation = {
          latitude,
          longitude,
          accuracyM: typeof accuracy === 'number' && Number.isFinite(accuracy) ? accuracy : null,
          addressLabel: lastKnownLocation && lastKnownLocation.addressLabel ? lastKnownLocation.addressLabel : '',
        };
        updateSignal(accuracy);
        if (locCoordsEl) {
          locCoordsEl.textContent = `Lat: ${latitude.toFixed(5)}, Lon: ${longitude.toFixed(5)} · Updated: ${new Date(pos.timestamp).toLocaleTimeString()}`;
        }
        reverseGeocode(latitude, longitude);
        const accM = typeof accuracy === 'number' && Number.isFinite(accuracy) ? accuracy : null;
        updateDashboardMap(latitude, longitude, accM);
      }

      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(recordPosition, (err) => {
          console.warn('Geolocation error', err);
          signalTextEl.textContent = 'Location unavailable';
          signalFillEl.style.width = '5%';
          locDetailsEl.textContent = 'Location unavailable';
          resetDashboardMapToDefault();
        }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 });

        navigator.geolocation.watchPosition(recordPosition, (err) => {
          console.warn('Geolocation watch error', err);
        }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 });
      } else {
        signalTextEl.textContent = 'Geolocation not supported';
        signalFillEl.style.width = '5%';
        locDetailsEl.textContent = 'Geolocation not supported';
        resetDashboardMapToDefault();
      }
    })();
  });
})();
