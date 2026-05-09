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
    const statUsers       = document.getElementById('stat-users');
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
            if (statUsers)        statUsers.textContent        = data.total_users    || 0;
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
                    <div class="feature-card" style="text-align:center;color:var(--text-muted);grid-column:1/-1; padding: 3rem;">
                        <i class="fas fa-check-circle" style="font-size:3rem;margin-bottom:1rem;color:#22c55e;"></i>
                        <p style="font-size:1.25rem;font-weight:700; color:white;">System All Clear</p>
                        <p style="font-size:0.875rem;">No active SOS alerts at this time.</p>
                    </div>`;
                return;
            }

            alertsGrid.innerHTML = alerts.map(alert => {
                const time = new Date(alert.triggered_at).toLocaleTimeString();
                const mapUrl = `https://www.google.com/maps?q=${alert.latitude},${alert.longitude}`;
                
                const contactsHtml = alert.emergency_contacts && alert.emergency_contacts.length > 0 
                    ? alert.emergency_contacts.map(c => `
                        <div style="font-size:0.75rem; background:rgba(255,255,255,0.05); padding:0.6rem; border-radius:0.5rem; border:1px solid rgba(255,255,255,0.05);">
                            <p style="font-weight:700; color:white;">${escHtml(c.name)} <span style="font-weight:400; color:var(--accent-pink); font-size:0.65rem;">${escHtml(c.relation)}</span></p>
                            <p style="color:var(--text-muted);"><i class="fas fa-phone"></i> ${escHtml(c.phone)}</p>
                        </div>
                    `).join('')
                    : '<p style="font-size:0.7rem; color:var(--text-muted); font-style:italic;">No emergency contacts found.</p>';

                return `
                <div class="feature-card" style="
                    border-left:4px solid #ef4444;
                    animation:slideInRight 0.35s ease-out;
                    position:relative;
                    background: rgba(239, 68, 68, 0.03);">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1rem;">
                        <h4 style="font-weight:800;color:#ef4444;display:flex;align-items:center;gap:0.5rem; font-size:0.9rem;">
                            <span style="animation:pulse 1.2s infinite;display:inline-block;">🚨</span>
                            SOS ACTIVE
                        </h4>
                        <span style="font-size:0.7rem;color:var(--text-muted);white-space:nowrap;background:rgba(0,0,0,0.4);padding:0.25rem 0.6rem;border-radius:0.5rem; border:1px solid var(--border);">${time}</span>
                    </div>

                    <div style="margin-bottom:1rem; border-bottom:1px solid var(--border); padding-bottom:1rem;">
                        <p style="font-size:0.65rem; color:var(--accent-pink); text-transform:uppercase; font-weight:800; letter-spacing:1.5px; margin-bottom:0.75rem;">User Information</p>
                        <p style="font-size:1.15rem;font-weight:800;margin-bottom:0.4rem; color:white;">${escHtml(alert.user_name)}</p>
                        <div style="display:grid; gap:0.4rem;">
                            <p style="font-size:0.8rem;color:var(--text-muted); display:flex; align-items:center; gap:0.5rem;">
                                <i class="fas fa-envelope" style="width:14px; color:var(--primary);"></i> ${escHtml(alert.user_email)}
                            </p>
                            <p style="font-size:0.8rem;color:var(--text-muted); display:flex; align-items:center; gap:0.5rem;">
                                <i class="fas fa-phone" style="width:14px; color:var(--primary);"></i> ${escHtml(alert.user_phone)}
                            </p>
                            <p style="font-size:0.8rem;color:var(--text-muted); display:flex; align-items:center; gap:0.5rem;">
                                <i class="fas fa-home" style="width:14px; color:var(--primary);"></i> ${escHtml(alert.user_address || 'Address not set')}
                            </p>
                        </div>
                    </div>

                    <div style="margin-bottom:1rem;">
                        <p style="font-size:0.65rem; color:var(--primary); text-transform:uppercase; font-weight:800; letter-spacing:1.5px; margin-bottom:0.75rem;">Emergency Contacts</p>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem;">
                            ${contactsHtml}
                        </div>
                    </div>

                    <div style="margin-bottom:1.25rem; background:rgba(0,0,0,0.3); padding:1rem; border-radius:0.75rem; border:1px solid var(--border);">
                        <p style="font-size:0.65rem; color:var(--text-muted); text-transform:uppercase; font-weight:800; letter-spacing:1.5px; margin-bottom:0.75rem;">Trigger Location</p>
                        <p style="font-size:0.85rem; font-weight:600; color:white; margin-bottom:0.4rem; line-height:1.4;">
                            <i class="fas fa-map-marker-alt" style="color:#ef4444; margin-right:4px;"></i> ${escHtml(alert.address || 'Locating...')}
                        </p>
                        <p style="font-size:0.7rem;color:var(--text-muted); opacity:0.7;">
                            GPS: ${alert.latitude.toFixed(6)}, ${alert.longitude.toFixed(6)}
                        </p>
                    </div>

                    <div style="display:flex;gap:0.75rem;">
                        <a href="${mapUrl}" target="_blank" class="btn btn-primary"
                            style="flex:1.2;font-size:0.75rem;padding:0.8rem;text-align:center;display:flex;align-items:center;justify-content:center;gap:0.5rem; font-weight:700;">
                            <i class="fas fa-location-arrow"></i> LIVE MAP
                        </a>
                        <button
                            onclick="resolveSOS('${alert.id}')"
                            id="resolve-btn-${alert.id}"
                            class="btn btn-outline"
                            style="flex:1;font-size:0.75rem;padding:0.8rem;color:#22c55e;border-color:rgba(34,197,94,0.4);display:flex;align-items:center;justify-content:center;gap:0.5rem; font-weight:700;">
                            <i class="fas fa-check-double"></i> RESOLVE
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
