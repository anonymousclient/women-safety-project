document.addEventListener('DOMContentLoaded', () => {
    api.checkAuth();
    const user = api.getUser();
    if (user.role !== 'admin') window.location.href = 'dashboard.html';

    const alertsGrid = document.getElementById('alerts-grid');
    const statUsers = document.getElementById('stat-users');
    const statSos = document.getElementById('stat-sos');
    const statRoutes = document.getElementById('stat-routes');
    const logoutBtn = document.getElementById('logout-btn');

    logoutBtn.addEventListener('click', () => api.logout());

    const fetchAdminData = async () => {
        try {
            const data = await api.get('/admin/stats');
            statUsers.textContent = data.total_users || 0;
            statSos.textContent = data.total_sos_resolved || 0;
            statRoutes.textContent = data.total_routes || 0;

            const alerts = await api.get('/admin/active-alerts');
            if (alerts && alerts.length > 0) {
                alertsGrid.innerHTML = alerts.map(alert => `
                    <div class="feature-card" style="border-left: 4px solid var(--emergency); background: var(--surface);">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 1rem;">
                            <span style="font-weight: 700; color: white;">${alert.user_name}</span>
                            <span style="font-size: 0.75rem; color: var(--text-muted);">${new Date(alert.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 1rem;">
                            <i class="fas fa-map-marker-alt" style="color: var(--emergency);"></i> ${alert.address || 'Location detected'}
                        </p>
                        <div style="display: flex; gap: 0.5rem;">
                            <button onclick="resolveAlert('${alert.id}')" class="btn btn-primary" style="flex: 1; font-size: 0.75rem; background: #22c55e;">Resolve</button>
                            <a href="https://www.google.com/maps?q=${alert.latitude},${alert.longitude}" target="_blank" class="btn btn-outline" style="flex: 1; font-size: 0.75rem; text-align: center;">View Map</a>
                        </div>
                    </div>
                `).join('');
            } else {
                alertsGrid.innerHTML = `
                    <div class="feature-card" style="text-align: center; color: var(--text-muted); grid-column: 1/-1;">
                        <i class="fas fa-check-circle" style="font-size: 2rem; margin-bottom: 1rem; color: #22c55e;"></i>
                        <p>All clear. No active SOS alerts at the moment.</p>
                    </div>
                `;
            }
        } catch (err) {
            console.error("Failed to fetch admin data:", err);
        }
    };

    window.resolveAlert = async (id) => {
        try {
            await api.post(`/admin/resolve-alert/${id}`);
            fetchAdminData();
        } catch (err) {
            alert("Failed to resolve alert.");
        }
    };

    // Initial fetch and poll every 5 seconds
    fetchAdminData();
    setInterval(fetchAdminData, 5000);
});
