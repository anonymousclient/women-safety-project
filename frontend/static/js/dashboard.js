document.addEventListener('DOMContentLoaded', async () => {
    // Auth Check
    api.checkAuth();
    
    const user = api.getUser();
    if (user.role === 'admin') window.location.href = 'admin.html';
    
    // UI Elements
    const userName = document.getElementById('user-name');
    const totalTravels = document.getElementById('total-travels');
    const activityList = document.getElementById('activity-list');
    const logoutBtn = document.getElementById('logout-btn');

    userName.textContent = user.name;
    logoutBtn.addEventListener('click', () => api.logout());

    // Fetch User Stats (Simulated or actual if API exists)
    try {
        const stats = await api.get('/user/stats'); // We might need to ensure this endpoint exists
        totalTravels.textContent = stats.total_sos || 0;
        
        if (stats.recent_activity && stats.recent_activity.length > 0) {
            activityList.innerHTML = stats.recent_activity.map(item => `
                <div class="feature-card" style="background: var(--bg); display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.5rem;">
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <div style="width: 2.5rem; height: 2.5rem; background: var(--surface); border-radius: 0.5rem; display: flex; align-items: center; justify-content: center; color: var(--primary);">
                            <i class="fas fa-route"></i>
                        </div>
                        <div>
                            <p style="font-weight: 600;">Safe Route Taken</p>
                            <p style="font-size: 0.75rem; color: var(--text-muted);">${new Date(item.timestamp).toLocaleString()}</p>
                        </div>
                    </div>
                    <span style="font-size: 0.875rem; color: #22c55e;">Completed</span>
                </div>
            `).join('');
        }
    } catch (err) {
        console.error('Failed to fetch stats:', err);
    }
});
