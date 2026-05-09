/**
 * SOS Emergency Feature Logic (Advanced Lifecycle Management)
 * Handles triggering, countdown cancellation, real-time sync, and siren effects.
 */

document.addEventListener('DOMContentLoaded', () => {
    api.checkAuth();

    const triggerBtn = document.getElementById('sos-trigger');
    const cancelBtn = document.getElementById('sos-cancel');
    const idleView = document.getElementById('sos-idle-view');
    const activeView = document.getElementById('sos-active-view');
    const statusText = document.getElementById('sos-status');
    const coordsText = document.getElementById('sos-coords');
    const mainContainer = document.getElementById('main-container');
    const siren = document.getElementById('siren-audio');
    
    // Countdown UI
    const timerBox = document.getElementById('cancel-timer-box');
    const timerText = document.getElementById('cancel-timer');

    let sosId = null;
    let locationInterval = null;
    let countdownInterval = null;
    let statusPollInterval = null;
    let timeLeft = 15;

    // Check if there's an existing active SOS when page loads
    checkExistingSOS();

    triggerBtn.addEventListener('click', async () => {
        // Immediate UI transition
        enterEmergencyState();
        
        // Start Countdown for accidental trigger
        startCancelCountdown();

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(async (position) => {
                const { latitude, longitude } = position.coords;
                coordsText.textContent = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

                try {
                    const response = await api.fetch('/sos/trigger', {
                        method: 'POST',
                        body: JSON.stringify({ latitude, longitude })
                    });

                    if (response.alert_id) {
                        sosId = response.alert_id;
                        startLiveTracking(sosId);
                        startStatusPolling();
                    }
                } catch (e) {
                    console.error("SOS Trigger failed:", e);
                }
            }, (err) => {
                alert("GPS access required for SOS alerts.");
                resetSOS();
            });
        }
    });

    cancelBtn.addEventListener('click', async () => {
        if (!confirm('Confirm cancellation? This will notify responders you are safe.')) return;
        
        try {
            await api.fetch('/sos/cancel', { method: 'POST' });
            alert("SOS Alert Cancelled.");
        } catch (e) {
            console.error("Cancel failed:", e);
        }
        resetSOS();
    });

    async function checkExistingSOS() {
        try {
            const data = await api.fetch('/sos/status');
            if (data.is_active) {
                sosId = data.alert_id;
                enterEmergencyState();
                timerBox.classList.add('hidden'); // Hide timer if SOS was already active
                startLiveTracking(sosId);
                startStatusPolling();
            }
        } catch (e) {
            console.log("No existing SOS active.");
        }
    }

    function startCancelCountdown() {
        timeLeft = 15;
        timerBox.classList.remove('hidden');
        timerText.textContent = `${timeLeft}s`;

        if (countdownInterval) clearInterval(countdownInterval);
        
        countdownInterval = setInterval(() => {
            timeLeft--;
            timerText.textContent = `${timeLeft}s`;
            
            if (timeLeft <= 0) {
                clearInterval(countdownInterval);
                timerBox.classList.add('hidden');
                statusText.textContent = 'Help is on the way! Responders are tracking your location.';
            }
        }, 1000);
    }

    function startStatusPolling() {
        if (statusPollInterval) clearInterval(statusPollInterval);
        
        statusPollInterval = setInterval(async () => {
            try {
                const data = await api.fetch('/sos/status');
                if (!data.is_active) {
                    console.log("SOS Resolved by Admin.");
                    alert("Emergency Resolved: Admin has marked you as safe.");
                    resetSOS();
                }
            } catch (e) {
                console.error("Status poll failed:", e);
            }
        }, 3000);
    }

    function startLiveTracking(alertId) {
        if (locationInterval) clearInterval(locationInterval);
        
        locationInterval = setInterval(() => {
            navigator.geolocation.getCurrentPosition(async (position) => {
                const { latitude, longitude } = position.coords;
                coordsText.textContent = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

                await api.fetch('/location/update-location', {
                    method: 'POST',
                    body: JSON.stringify({
                        latitude, longitude, sos_alert_id: alertId
                    })
                }).catch(e => console.warn("Location update failed"));
            });
        }, 5000);
    }

    function enterEmergencyState() {
        idleView.classList.add('hidden');
        activeView.classList.remove('hidden');
        mainContainer.classList.add('emergency-flashing');
        try { siren.play(); } catch (e) {}
    }

    function resetSOS() {
        sosId = null;
        if (locationInterval) clearInterval(locationInterval);
        if (countdownInterval) clearInterval(countdownInterval);
        if (statusPollInterval) clearInterval(statusPollInterval);
        
        idleView.classList.remove('hidden');
        activeView.classList.add('hidden');
        mainContainer.classList.remove('emergency-flashing');
        siren.pause();
        siren.currentTime = 0;
        statusText.textContent = 'Broadcasting your location to emergency responders...';
    }
});
