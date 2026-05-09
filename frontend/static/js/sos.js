/**
 * SafeHer — SOS Emergency Lifecycle Manager
 *
 * Flow:
 *  Idle → [SOS button] → Active (15s cancel window) → [timer expires] → Locked Active
 *  Active → [Cancel button] → Cancelled (UI resets)
 *  Active → [Admin resolves] → Resolved (UI resets, user notified)
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
    api.checkAuth();

    // ─── DOM refs ────────────────────────────────────────────────────────────
    const triggerBtn     = document.getElementById('sos-trigger');
    const cancelBtn      = document.getElementById('sos-cancel');
    const idleView       = document.getElementById('sos-idle-view');
    const activeView     = document.getElementById('sos-active-view');
    const statusText     = document.getElementById('sos-status');
    const coordsText     = document.getElementById('sos-coords');
    const mainContainer  = document.getElementById('main-container');
    const siren          = document.getElementById('siren-audio');
    const timerBox       = document.getElementById('cancel-timer-box');
    const timerText      = document.getElementById('cancel-timer');

    // ─── State ───────────────────────────────────────────────────────────────
    let sosId             = null;
    let locationInterval  = null;
    let countdownInterval = null;
    let pollInterval      = null;
    let cancelAllowed     = false;  // only true during 15s window

    // ─── On load: restore active SOS if any ──────────────────────────────────
    checkExistingSOS();

    // ─── Trigger SOS ─────────────────────────────────────────────────────────
    triggerBtn.addEventListener('click', async () => {
        enterEmergencyState();
        startCountdown();

        if (!navigator.geolocation) {
            showStatus('⚠️ GPS not supported. SOS triggered without location.');
            await triggerBackend(null, null);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async pos => {
                const { latitude, longitude } = pos.coords;
                coordsText.textContent = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
                await triggerBackend(latitude, longitude);
            },
            async err => {
                console.warn('GPS denied:', err.message);
                coordsText.textContent = 'GPS unavailable';
                await triggerBackend(null, null);
            },
            { enableHighAccuracy: true, timeout: 8000 }
        );
    });

    async function triggerBackend(lat, lng) {
        try {
            const payload = lat !== null
                ? { latitude: lat, longitude: lng }
                : { latitude: 0, longitude: 0 };   // fallback so backend doesn't reject

            const res = await api.fetch('/sos/trigger', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            if (res.alert_id) {
                sosId = res.alert_id;
                if (lat) startLiveTracking(sosId, lat, lng);
                startStatusPolling();
                showStatus('🚨 Help is on the way! Emergency responders notified.');
            }
        } catch (e) {
            console.error('SOS trigger error:', e);
            showStatus('⚠️ Backend connection failed. Try again.');
        }
    }

    // ─── Cancel SOS ──────────────────────────────────────────────────────────
    cancelBtn.addEventListener('click', async () => {
        if (!cancelAllowed) return;   // button disabled after 15s

        cancelBtn.disabled = true;
        cancelBtn.textContent = 'Cancelling...';

        try {
            await api.fetch('/sos/cancel', { method: 'POST' });
        } catch (e) {
            console.warn('Cancel API error (still resetting UI):', e.message);
        }

        resetSOS();
        showToast('✅ SOS Cancelled — You are marked safe.', '#22c55e');
    });

    // ─── Check existing SOS on page load ─────────────────────────────────────
    async function checkExistingSOS() {
        try {
            const data = await api.fetch('/sos/status');
            if (data && data.is_active) {
                sosId = data.alert_id;
                enterEmergencyState();
                // Timer already expired — hide cancel
                timerBox.classList.add('hidden');
                cancelBtn.disabled = true;
                cancelAllowed = false;
                showStatus('🚨 Help is on the way! Emergency responders notified.');
                startStatusPolling();
            }
        } catch (e) {
            // No active SOS — normal state
        }
    }

    // ─── 15-second Cancel Countdown ──────────────────────────────────────────
    function startCountdown() {
        let timeLeft = 15;
        cancelAllowed = true;
        cancelBtn.disabled = false;
        timerBox.classList.remove('hidden');
        timerText.textContent = '15s';
        timerText.style.color = '#ffffff';

        if (countdownInterval) clearInterval(countdownInterval);

        countdownInterval = setInterval(() => {
            timeLeft--;
            timerText.textContent = `${timeLeft}s`;

            // Color shift: white → yellow → red
            if (timeLeft <= 5)  timerText.style.color = '#ef4444';
            else if (timeLeft <= 10) timerText.style.color = '#f59e0b';

            if (timeLeft <= 0) {
                clearInterval(countdownInterval);
                cancelAllowed = false;
                cancelBtn.disabled = true;
                cancelBtn.style.opacity = '0.35';
                cancelBtn.innerHTML = '<i class="fas fa-lock"></i> Window Closed';
                timerBox.classList.add('hidden');
                showStatus('🚨 Help is on the way! Responders are tracking your location.');
            }
        }, 1000);
    }

    // ─── Poll backend to detect admin resolution ──────────────────────────────
    function startStatusPolling() {
        if (pollInterval) clearInterval(pollInterval);

        pollInterval = setInterval(async () => {
            try {
                const data = await api.fetch('/sos/status');
                if (!data.is_active) {
                    clearInterval(pollInterval);
                    resetSOS();
                    showToast('✅ Emergency Resolved — Admin confirmed you are safe.', '#22c55e');
                }
            } catch (e) {
                // Keep polling on transient errors
            }
        }, 4000);
    }

    // ─── Live GPS Tracking ────────────────────────────────────────────────────
    function startLiveTracking(alertId, initialLat, initialLng) {
        if (locationInterval) clearInterval(locationInterval);

        locationInterval = setInterval(() => {
            navigator.geolocation.getCurrentPosition(async pos => {
                const { latitude, longitude } = pos.coords;
                coordsText.textContent = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

                try {
                    await api.fetch('/location/update-location', {
                        method: 'POST',
                        body: JSON.stringify({ latitude, longitude, sos_alert_id: alertId })
                    });
                } catch (_) {}
            });
        }, 5000);
    }

    // ─── UI Helpers ───────────────────────────────────────────────────────────
    function enterEmergencyState() {
        idleView.classList.add('hidden');
        activeView.classList.remove('hidden');
        mainContainer.classList.add('emergency-flashing');
        cancelBtn.disabled = false;
        cancelBtn.style.opacity = '1';
        cancelBtn.innerHTML = '<i class="fas fa-times-circle"></i> Cancel SOS';
        timerBox.classList.remove('hidden');
        try { siren.play(); } catch (_) {}
    }

    function resetSOS() {
        sosId = null;
        cancelAllowed = false;

        if (locationInterval)  clearInterval(locationInterval);
        if (countdownInterval) clearInterval(countdownInterval);
        if (pollInterval)      clearInterval(pollInterval);

        activeView.classList.add('hidden');
        idleView.classList.remove('hidden');
        mainContainer.classList.remove('emergency-flashing');

        siren.pause();
        siren.currentTime = 0;

        // Reset cancel button state for next trigger
        cancelBtn.disabled = false;
        cancelBtn.style.opacity = '1';
        cancelBtn.innerHTML = '<i class="fas fa-times-circle"></i> Cancel SOS';
        statusText.textContent = 'Broadcasting your location to emergency responders...';
        timerText.textContent = '15s';
        timerText.style.color = '#ffffff';
    }

    function showStatus(msg) {
        statusText.textContent = msg;
    }

    function showToast(msg, color = '#7c3aed') {
        const t = document.createElement('div');
        t.style.cssText = `
            position:fixed;top:1.5rem;right:1.5rem;
            background:rgba(15,12,41,0.97);color:white;
            padding:1rem 1.5rem;border-radius:1rem;
            border-left:4px solid ${color};
            font-size:0.9rem;font-weight:600;max-width:320px;
            z-index:9999;animation:slideIn 0.3s ease;
        `;
        t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 5000);
    }
});
