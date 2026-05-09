/**
 * SafeHer Admin Dashboard
 * Real-time SOS monitoring with full lifecycle management.
 *
 * Polling intervals:
 *   - Active SOS list: every 4 seconds
 *   - Stats counters:  every 8 seconds
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
    api.checkAuth();

    const alertsGrid      = document.getElementById('alerts-grid');
    const statSosActive   = document.getElementById('stat-sos-active');
    const statSosResolved = document.getElementById('stat-sos-resolved');
    const statSosCancelled= document.getElementById('stat-sos-cancelled');

    let prevActiveCount = 0;

    // Beep only when NEW alerts arrive — cached Audio instance
    const alertBeep = new Audio('https://www.soundjay.com/buttons/beep-07.mp3');

    // ─── Stats ───────────────────────────────────────────────────────────────
    async function fetchStats() {
        try {
            const data = await api.fetch('/admin/stats');
            if (!data) return;
            if (statSosActive)    statSosActive.textContent    = data.active_sos     || 0;
            if (statSosResolved)  statSosResolved.textContent  = data.resolved_sos   || 0;
            if (statSosCancelled) statSosCancelled.textContent = data.cancelled_sos  || 0;
        } catch (e) {
            console.warn('Stats fetch error:', e.message);
        }
    }

    // ─── Active SOS List ─────────────────────────────────────────────────────
    async function fetchActiveSOS() {
        try {
            // /api/admin/sos/active — returns flat array of active alerts
            const alerts = await api.fetch('/admin/sos/active');

            if (!Array.isArray(alerts)) {
                console.warn('Unexpected /admin/sos/active response shape:', alerts);
                return;
            }

            // Beep on new arrivals
            if (alerts.length > prevActiveCount) {
                alertBeep.play().catch(() => {});
            }
            prevActiveCount = alerts.length;

            if (alerts.length === 0) {
                alertsGrid.innerHTML = `
                    <div class="feature-card" style="text-align:center;color:var(--text-muted);grid-column:1/-1;">
                        <i class="fas fa-check-circle" style="font-size:2.5rem;margin-bottom:1rem;color:#22c55e;"></i>
                        <p style="font-size:1.1rem;font-weight:600;">System All Clear</p>
                        <p style="font-size:0.875rem;">No active SOS alerts at this time.</p>
                    </div>`;
                return;
            }

            alertsGrid.innerHTML = alerts.map(alert => {
                const time = new Date(alert.triggered_at).toLocaleTimeString();
                const mapUrl = `https://www.google.com/maps?q=${alert.latitude},${alert.longitude}`;
                return `
                <div class="feature-card" style="
                    border-left:4px solid #ef4444;
                    animation:slideIn 0.35s ease-out;
                    position:relative;">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:0.75rem;">
                        <h4 style="font-weight:800;color:#ef4444;display:flex;align-items:center;gap:0.5rem;">
                            <span style="animation:pulse 1s infinite;display:inline-block;">🚨</span>
                            SOS ACTIVE
                        </h4>
                        <span style="font-size:0.75rem;color:var(--text-muted);white-space:nowrap;">${time}</span>
                    </div>

                    <p style="font-size:1.05rem;font-weight:700;margin-bottom:0.25rem;">${escHtml(alert.user_name)}</p>
                    <p style="font-size:0.8rem;color:var(--text-muted);margin-bottom:0.75rem;">
                        <i class="fas fa-phone" style="margin-right:4px;"></i>${escHtml(alert.user_phone)}
                        &nbsp;|&nbsp;
                        <i class="fas fa-map-marker-alt" style="margin-right:4px;"></i>${escHtml(alert.address || 'Locating...')}
                    </p>
                    <p style="font-size:0.75rem;color:var(--text-muted);margin-bottom:1rem;">
                        📍 ${alert.latitude.toFixed(5)}, ${alert.longitude.toFixed(5)}
                    </p>

                    <div style="display:flex;gap:0.5rem;">
                        <a href="${mapUrl}" target="_blank" class="btn btn-primary"
                            style="flex:1;font-size:0.75rem;padding:0.5rem;text-align:center;">
                            <i class="fas fa-external-link-alt"></i> Live Map
                        </a>
                        <button
                            onclick="resolveSOS('${alert.id}')"
                            id="resolve-btn-${alert.id}"
                            class="btn btn-outline"
                            style="flex:1;font-size:0.75rem;padding:0.5rem;color:#22c55e;border-color:#22c55e;">
                            <i class="fas fa-check"></i> Resolve
                        </button>
                    </div>
                </div>`;
            }).join('');

        } catch (e) {
            console.error('Active SOS fetch error:', e.message);
        }
    }

    // ─── Resolve SOS ─────────────────────────────────────────────────────────
    window.resolveSOS = async (alertId) => {
        const btn = document.getElementById(`resolve-btn-${alertId}`);
        if (btn) { btn.disabled = true; btn.textContent = 'Resolving...'; }

        try {
            const res = await api.fetch(`/admin/sos/${alertId}/resolve`, {
                method: 'PUT',
                body: JSON.stringify({ notes: 'Resolved by admin via dashboard' })
            });

            if (res.message) {
                showToast('✅ SOS Resolved — User marked as safe.', '#22c55e');
                // Immediately re-fetch so the card disappears without waiting for next poll
                await fetchActiveSOS();
                await fetchStats();
            }
        } catch (e) {
            console.error('Resolve error:', e.message);
            showToast('❌ Failed to resolve: ' + e.message, '#ef4444');
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-check"></i> Resolve'; }
        }
    };

    // ─── Helpers ─────────────────────────────────────────────────────────────
    function escHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function showToast(msg, color = '#7c3aed') {
        const t = document.createElement('div');
        t.style.cssText = `
            position:fixed;top:1.5rem;right:1.5rem;
            background:rgba(15,12,41,0.97);color:white;
            padding:1rem 1.5rem;border-radius:1rem;
            border-left:4px solid ${color};
            font-size:0.875rem;font-weight:600;max-width:320px;
            z-index:9999;animation:slideIn 0.3s ease;
        `;
        t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 4000);
    }

    // ─── Boot ────────────────────────────────────────────────────────────────
    fetchStats();
    fetchActiveSOS();

    setInterval(fetchActiveSOS, 4000);  // poll every 4s
    setInterval(fetchStats, 8000);

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', () => api.logout());
});
