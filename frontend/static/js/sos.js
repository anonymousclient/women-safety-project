/**
 * SOS Emergency Feature Logic
 * Handles triggering, background flashing, siren audio, and location updates
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

    let sosId = null;
    let locationInterval = null;

    triggerBtn.addEventListener('click', async () => {
        if (!confirm('Are you sure you want to trigger an SOS alert? This will notify all emergency contacts.')) return;

        // 1. Enter SOS State
        idleView.classList.add('hidden');
        activeView.classList.remove('hidden');
        mainContainer.classList.add('emergency-flashing');
        
        try {
            siren.play();
        } catch (e) {
            console.warn("Audio autoplay blocked");
        }

        // 2. Get Initial Location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(async (position) => {
                const { latitude, longitude } = position.coords;
                coordsText.textContent = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

                // 3. Trigger Backend SOS
                const response = await api.fetch('/sos/trigger', {
                    method: 'POST',
                    body: JSON.stringify({ latitude, longitude })
                });

                if (response.alert_id) {
                    sosId = response.alert_id;
                    statusText.textContent = 'Help is on the way! Your location is being tracked.';
                    
                    // 4. Start Real-time Location Updates
                    startLiveTracking(sosId);
                }
            }, (err) => {
                alert("Please enable GPS for SOS to work properly.");
                resetSOS();
            });
        }
    });

    cancelBtn.addEventListener('click', async () => {
        if (sosId) {
            await api.fetch(`/sos/${sosId}/resolve`, {
                method: 'PUT',
                body: JSON.stringify({ notes: "User cancelled alert from frontend." })
            });
        }
        resetSOS();
    });

    function startLiveTracking(alertId) {
        // Update location every 5 seconds
        locationInterval = setInterval(() => {
            navigator.geolocation.getCurrentPosition(async (position) => {
                const { latitude, longitude } = position.coords;
                coordsText.textContent = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

                await api.fetch('/location/update-location', {
                    method: 'POST',
                    body: JSON.stringify({
                        latitude,
                        longitude,
                        sos_alert_id: alertId
                    })
                });
            });
        }, 5000);
    }

    function resetSOS() {
        sosId = null;
        if (locationInterval) clearInterval(locationInterval);
        idleView.classList.remove('hidden');
        activeView.classList.add('hidden');
        mainContainer.classList.remove('emergency-flashing');
        siren.pause();
        siren.currentTime = 0;
        statusText.textContent = 'Broadcasting your location to emergency responders...';
    }
});
