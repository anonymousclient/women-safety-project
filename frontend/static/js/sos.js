document.addEventListener('DOMContentLoaded', () => {
    api.checkAuth();
    
    const triggerBtn = document.getElementById('sos-trigger');
    const cancelBtn = document.getElementById('sos-cancel');
    const idleView = document.getElementById('sos-idle-view');
    const activeView = document.getElementById('sos-active-view');
    const statusText = document.getElementById('sos-status');
    const coordsText = document.getElementById('sos-coords');
    const logoutBtn = document.getElementById('logout-btn');

    logoutBtn.addEventListener('click', () => api.logout());

    let watchId = null;
    let currentAlertId = null;

    const startTracking = () => {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser");
            return;
        }

        watchId = navigator.geolocation.watchPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                coordsText.textContent = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
                
                // Update live location in backend
                try {
                    await api.post('/location/update', { latitude, longitude });
                } catch (err) {
                    console.error("Failed to update live location:", err);
                }
            },
            (error) => {
                console.error("Geolocation error:", error);
                coordsText.textContent = "Location access denied";
            },
            { enableHighAccuracy: true }
        );
    };

    triggerBtn.addEventListener('click', async () => {
        triggerBtn.disabled = true;
        triggerBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i>';
        
        try {
            // Get current position first for the initial alert
            navigator.geolocation.getCurrentPosition(async (position) => {
                const { latitude, longitude } = position.coords;
                
                const res = await api.post('/sos/trigger', { latitude, longitude });
                currentAlertId = res.alert_id;
                
                // Switch Views
                idleView.classList.add('hidden');
                activeView.classList.remove('hidden');
                
                startTracking();
            }, (err) => {
                alert("Please enable location access to trigger SOS.");
                triggerBtn.disabled = false;
                triggerBtn.textContent = 'SOS';
            });
        } catch (err) {
            alert("Failed to trigger SOS. Please try again.");
            triggerBtn.disabled = false;
            triggerBtn.textContent = 'SOS';
        }
    });

    cancelBtn.addEventListener('click', async () => {
        if (!confirm("Are you sure you want to cancel the emergency alert?")) return;
        
        try {
            await api.post('/sos/cancel', { alert_id: currentAlertId });
            
            if (watchId) navigator.geolocation.clearWatch(watchId);
            
            activeView.classList.add('hidden');
            idleView.classList.remove('hidden');
            triggerBtn.disabled = false;
            triggerBtn.textContent = 'SOS';
        } catch (err) {
            alert("Failed to cancel alert. Please refresh.");
        }
    });
});
