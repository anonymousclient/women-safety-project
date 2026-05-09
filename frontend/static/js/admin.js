/**
 * Admin Dashboard Logic
 * Real-time SOS monitoring and system analytics
 */

document.addEventListener('DOMContentLoaded', () => {
    api.checkAuth();

    const alertsGrid = document.getElementById('alerts-grid');
    const statUsers = document.getElementById('stat-users');
    const statSos = document.getElementById('stat-sos');
    const statRoutes = document.getElementById('stat-routes');

    let activeAlertsCount = 0;
    const alertSound = new Audio('https://www.soundjay.com/buttons/beep-07.mp3');

    async function fetchStats() {
        try {
            const response = await api.fetch('/admin/stats');
            if (response) {
                statUsers.textContent = response.total_users || 0;
                statSos.textContent = response.total_sos || 0;
                statRoutes.textContent = response.unsafe_zones || 0;
            }
        } catch (e) {
            console.error("Failed to fetch admin stats:", e);
        }
    }

    async function fetchActiveSOS() {
        try {
            // Using the admin-specific active SOS route
            const response = await api.fetch('/admin/sos/active');
            const alerts = response || [];

            if (alerts.length > 0) {
                if (alerts.length > activeAlertsCount) {
                    alertSound.play().catch(e => console.log("Sound blocked"));
                }
                activeAlertsCount = alerts.length;

                alertsGrid.innerHTML = alerts.map(alert => `
                    <div class="feature-card" style="border-left: 4px solid #ef4444; position: relative; animation: slideIn 0.3s ease-out;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 1rem;">
                            <h4 style="font-weight: 700; color: #ef4444;">🚨 SOS ACTIVE</h4>
                            <span style="font-size: 0.75rem; color: var(--text-muted);">${alert.triggered_at}</span>
                        </div>
                        <p style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.5rem;">${alert.user_name}</p>
                        <p style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 1rem;">
                            <i class="fas fa-phone"></i> ${alert.user_phone} | <i class="fas fa-map-marker-alt"></i> ${alert.address}
                        </p>
                        <div style="display: flex; gap: 0.5rem;">
                            <a href="https://www.google.com/maps?q=${alert.latitude},${alert.longitude}" target="_blank" class="btn btn-primary" style="flex: 1; font-size: 0.75rem; padding: 0.5rem; text-align: center;">
                                <i class="fas fa-external-link-alt"></i> View Live
                            </a>
                            <button onclick="resolveSOS('${alert.id}')" class="btn btn-outline" style="flex: 1; font-size: 0.75rem; padding: 0.5rem;">
                                <i class="fas fa-check"></i> Resolve
                            </button>
                        </div>
                    </div>
                `).join('');
            } else {
                activeAlertsCount = 0;
                alertsGrid.innerHTML = `
                    <div class="feature-card" style="text-align: center; color: var(--text-muted); grid-column: 1/-1;">
                        <i class="fas fa-check-circle" style="font-size: 2.5rem; margin-bottom: 1rem; color: #22c55e;"></i>
                        <p style="font-size: 1.1rem; font-weight: 600;">System All Clear</p>
                        <p style="font-size: 0.875rem;">No active SOS alerts currently reported.</p>
                    </div>
                `;
            }
        } catch (e) {
            console.error("Failed to fetch active SOS:", e);
        }
    }

    window.resolveSOS = async (alertId) => {
        if (!confirm('Are you sure you want to resolve this SOS alert?')) return;
        try {
            await api.fetch(`/admin/sos/${alertId}/resolve`, {
                method: 'PUT',
                body: JSON.stringify({ notes: "Resolved by admin from console" })
            });
            fetchActiveSOS();
            fetchStats();
        } catch (e) {
            alert("Error resolving SOS.");
        }
    };

    // Auto-update
    fetchStats();
    fetchActiveSOS();
    setInterval(fetchActiveSOS, 5000); // 5s for SOS
    setInterval(fetchStats, 30000);   // 30s for stats

    document.getElementById('logout-btn').addEventListener('click', () => api.logout());
});
