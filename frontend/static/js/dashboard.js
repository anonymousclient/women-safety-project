/**
 * Advanced Dashboard Logic for SafeHer
 * Handles real-time safety metrics, activity feed, and recent travels
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initial Checks
    api.checkAuth();
    const user = api.getUser();
    if (user) {
        document.getElementById('user-name').textContent = user.name.split(' ')[0];
    }

    // 2. Fetch Data with Geolocation
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const { latitude, longitude } = position.coords;
            fetchSafetyRating(latitude, longitude);
            fetchNearbyAlerts(latitude, longitude);
        });
    }

    // 3. Constant Refresh Data
    fetchRecentTravels();
    fetchActivityFeed();
    fetchBaseStats();

    /**
     * Fetches dynamic safety rating based on location
     */
    async function fetchSafetyRating(lat, lng) {
        try {
            const data = await api.fetch(`/safety-rating?lat=${lat}&lng=${lng}`);
            const circle = document.getElementById('safety-circle');
            const statusText = document.getElementById('safety-status');

            const score = data.score || 0;
            circle.textContent = `${score}%`;
            statusText.textContent = data.status || "Safe Area";

            // Dynamic Styling
            let color = '#22c55e'; // Green
            if (score < 40) color = '#ef4444'; // Red
            else if (score < 75) color = '#f59e0b'; // Yellow

            circle.style.borderColor = color;
            circle.style.color = color;
            circle.style.boxShadow = `0 0 15px ${color}33`;
            statusText.style.color = color;
        } catch (e) {
            console.error("Safety Rating Error:", e);
        }
    }

    /**
     * Fetches nearby active SOS alerts
     */
    async function fetchNearbyAlerts(lat, lng) {
        try {
            const alerts = await api.fetch(`/sos/nearby-alerts?lat=${lat}&lng=${lng}`);
            const container = document.getElementById('active-alerts-container');
            const pulse = document.getElementById('alert-pulse');
            const details = document.getElementById('alert-details');

            const count = alerts.length || 0;
            container.innerHTML = `
                <h2 style="font-size: 2.5rem; font-weight: 800; color: ${count > 0 ? '#ef4444' : 'inherit'};">${count}</h2>
                <p style="color: var(--text-muted); font-size: 0.75rem;">Nearby emergencies reported</p>
            `;

            if (count > 0) {
                pulse.classList.remove('hidden');
                details.classList.remove('hidden');
                details.innerHTML = `<i class="fas fa-exclamation-circle"></i> Emergency ${alerts[0].address || 'nearby'}`;
            }
        } catch (e) {
            console.error("Nearby Alerts Error:", e);
        }
    }

    /**
     * Fetches recently traveled routes
     */
    async function fetchRecentTravels() {
        const list = document.getElementById('recent-travels-list');
        try {
            const travels = await api.fetch('/user/recent-travels');
            const totalTravelsText = document.getElementById('total-travels');
            totalTravelsText.textContent = travels.length;

            list.innerHTML = travels.map(t => {
                const color = t.safety_score > 80 ? '#22c55e' : (t.safety_score > 50 ? '#f59e0b' : '#ef4444');
                return `
                <div class="feature-card" style="background: rgba(255,255,255,0.02); border-left: 4px solid ${color}; display: flex; justify-content: space-between; align-items: center; padding: 1.25rem;">
                    <div>
                        <h5 style="font-weight: 700; font-size: 1rem; margin-bottom: 0.25rem;">${t.destination}</h5>
                        <p style="font-size: 0.75rem; color: var(--text-muted);"><i class="far fa-calendar-alt"></i> ${t.date} | <i class="fas fa-road"></i> ${t.distance}</p>
                    </div>
                    <div style="text-align: right;">
                        <p style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.25rem;">Safety Score</p>
                        <span style="font-weight: 800; color: ${color}; font-size: 1.1rem;">${t.safety_score}%</span>
                    </div>
                </div>
                `;
            }).join('');
        } catch (e) {
            console.error("Travels Error:", e);
        }
    }

    /**
     * Fetches user activity feed
     */
    async function fetchActivityFeed() {
        const list = document.getElementById('activity-list');
        try {
            const activities = await api.fetch('/user/activities');
            list.innerHTML = activities.map(a => `
                <div style="display: flex; gap: 1rem; padding: 0.75rem; background: rgba(255,255,255,0.01); border-radius: 0.75rem;">
                    <div style="width: 2.5rem; height: 2.5rem; border-radius: 50%; background: ${a.color}22; color: ${a.color}; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                        <i class="${a.icon}"></i>
                    </div>
                    <div>
                        <p style="font-size: 0.875rem; font-weight: 500;">${a.message}</p>
                        <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">${formatTime(a.time)}</p>
                    </div>
                </div>
            `).join('');
        } catch (e) {
            console.error("Activity Error:", e);
        }
    }

    async function fetchBaseStats() {
        try {
            const stats = await api.fetch('/user/dashboard-stats');
            // Can be used to update other UI elements if needed
        } catch (e) {}
    }

    function formatTime(isoString) {
        const date = new Date(isoString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffMins < 1440) return `${Math.floor(diffMins/60)}h ago`;
        return date.toLocaleDateString();
    }

    // 4. Logout Logic
    document.getElementById('logout-btn').addEventListener('click', () => api.logout());

    // 5. Fake Call Menu Toggle
    const fcToggle = document.getElementById('fake-call-toggle');
    const fcMenu = document.getElementById('fake-call-menu');
    if (fcToggle && fcMenu) {
        fcToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            fcMenu.style.display = fcMenu.style.display === 'none' ? 'block' : 'none';
        });
        document.addEventListener('click', () => fcMenu.style.display = 'none');
    }
});
