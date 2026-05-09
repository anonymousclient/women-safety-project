/**
 * SafeHer — Safe Route Navigation
 * Leaflet.js + OpenStreetMap + OSRM + Backend AI Scoring
 *
 * Architecture:
 * 1. Geocode destination via Nominatim
 * 2. Get walking path via OSRM (free, no API key)
 * 3. Send path points to backend for AI safety scoring
 * 4. Render color-coded route + safety panel
 * 5. Fallback: render OSRM route in blue if backend is unavailable
 */

'use strict';

// ─── State ────────────────────────────────────────────────────────────────────
let map = null;
let userMarker = null;
let destMarker = null;
let routePolyline = null;
let zoneLayers = [];
let placeMarkers = [];
let userLat = null;
let userLng = null;

// ─── Map Init ─────────────────────────────────────────────────────────────────
function initMap() {
    console.log('📍 SafeHer Map initializing...');

    map = L.map('map', { zoomControl: false }).setView([23.2599, 77.4126], 13);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    // Locate user
    if (!navigator.geolocation) {
        showMapError('Geolocation is not supported by your browser.');
        return;
    }

    navigator.geolocation.getCurrentPosition(
        pos => {
            userLat = pos.coords.latitude;
            userLng = pos.coords.longitude;
            map.setView([userLat, userLng], 15);

            const youIcon = L.divIcon({
                html: `<div style="
                    width:18px;height:18px;border-radius:50%;
                    background:#7c3aed;border:3px solid white;
                    box-shadow:0 0 0 4px rgba(124,58,237,0.3);">
                </div>`,
                className: '',
                iconSize: [18, 18],
                iconAnchor: [9, 9]
            });

            userMarker = L.marker([userLat, userLng], { icon: youIcon })
                .addTo(map)
                .bindPopup('<b>📍 You are here</b>');

            fetchNearbySafePlaces(userLat, userLng);
        },
        err => {
            console.warn('Geolocation denied:', err.message);
            showMapError('⚠️ Location access denied. Grant permission and reload to use navigation.');
        },
        { enableHighAccuracy: true, timeout: 10000 }
    );

    fetchUnsafeZones();
}

// ─── Unsafe Zones ─────────────────────────────────────────────────────────────
async function fetchUnsafeZones() {
    try {
        const res = await api.fetch('/zones/all');
        const zones = res.zones || res;
        if (!Array.isArray(zones)) return;

        zones.forEach(zone => {
            const risk = zone.risk_level || 0;
            const color = risk > 0.7 ? '#ef4444' : risk > 0.4 ? '#f59e0b' : '#22c55e';
            const coords = zone.location && zone.location.coordinates;
            if (!coords) return;

            const circle = L.circle([coords[1], coords[0]], {
                color, fillColor: color, fillOpacity: 0.15,
                radius: zone.radius_meters || 500, weight: 1
            }).addTo(map)
              .bindPopup(`<b>${zone.name || 'Unsafe Zone'}</b><br>Risk: ${(risk * 100).toFixed(0)}%`);

            zoneLayers.push(circle);
        });
    } catch (e) {
        console.log('Zones not loaded (non-critical):', e.message);
    }
}

// ─── Nearby Safe Places ───────────────────────────────────────────────────────
async function fetchNearbySafePlaces(lat, lng) {
    try {
        const res = await api.fetch(`/nearby-safe-places?lat=${lat}&lng=${lng}`);
        const places = res.places || [];

        places.forEach(place => {
            const isPolice = place.type === 'police_station';
            const icon = L.divIcon({
                html: `<i class="fas ${isPolice ? 'fa-shield-alt' : 'fa-hospital'}"
                    style="color:${isPolice ? '#4fc3f7' : '#f87171'};font-size:1.25rem;
                    text-shadow:0 0 6px ${isPolice ? '#4fc3f7' : '#f87171'};"></i>`,
                className: '',
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            });

            const m = L.marker([place.latitude, place.longitude], { icon })
                .addTo(map)
                .bindPopup(`<b>${place.name}</b><br><small>${place.address || ''}</small>`);
            placeMarkers.push(m);
        });
    } catch (e) {
        console.log('Safe places not loaded (non-critical):', e.message);
    }
}

// ─── Main Route Finder ────────────────────────────────────────────────────────
async function findSafeRoute() {
    const destInput = document.getElementById('destination').value.trim();
    const findBtn = document.getElementById('find-route');

    if (!destInput) {
        showUserMessage('Please enter a destination.', 'warn');
        return;
    }

    if (!userLat || !userLng) {
        showUserMessage('📍 Waiting for your location... Please allow location access and try again.', 'warn');
        return;
    }

    // UI loading state
    findBtn.disabled = true;
    findBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing Route...';
    hideRoutePanel();

    try {
        // ── Step 1: Geocode destination ──────────────────────────────────────
        showStatusBar('🔍 Finding destination...');
        const geoRes = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(destInput)}`,
            { headers: { 'Accept-Language': 'en' } }
        );
        const geoData = await geoRes.json();

        if (!geoData || geoData.length === 0) {
            throw new Error(`❌ Destination "${destInput}" not found. Try a more specific name.`);
        }

        const destLat = parseFloat(geoData[0].lat);
        const destLng = parseFloat(geoData[0].lon);
        const destName = geoData[0].display_name.split(',')[0];

        // Place destination marker
        if (destMarker) map.removeLayer(destMarker);
        const destIcon = L.divIcon({
            html: `<div style="
                width:16px;height:16px;border-radius:50%;
                background:#ef4444;border:3px solid white;
                box-shadow:0 0 0 4px rgba(239,68,68,0.3);">
            </div>`,
            className: '',
            iconSize: [16, 16],
            iconAnchor: [8, 8]
        });
        destMarker = L.marker([destLat, destLng], { icon: destIcon })
            .addTo(map)
            .bindPopup(`<b>🎯 ${destName}</b>`);

        // ── Step 2: Get walking route from OSRM ──────────────────────────────
        showStatusBar('🛤️ Calculating walking route...');
        const osrmUrl = `https://router.project-osrm.org/route/v1/walking/${userLng},${userLat};${destLng},${destLat}?overview=full&geometries=geojson&steps=false`;

        let osrmData;
        try {
            const osrmRes = await fetch(osrmUrl);
            osrmData = await osrmRes.json();
        } catch (osrmErr) {
            throw new Error('🌐 Network error reaching routing service. Check your internet connection.');
        }

        if (!osrmData.routes || osrmData.routes.length === 0) {
            throw new Error('No walking route found between these two points.');
        }

        const osrmRoute = osrmData.routes[0];
        const routePoints = osrmRoute.geometry.coordinates; // [[lng,lat], ...]
        const distanceKm = (osrmRoute.distance / 1000).toFixed(1);
        const durationMin = Math.ceil(osrmRoute.duration / 60);

        // ── Step 3: Get AI Safety Score from backend ──────────────────────────
        showStatusBar('🛡️ Analyzing route safety...');
        let safetyRoute = null;

        try {
            const safetyRes = await api.fetch('/get-safe-route', {
                method: 'POST',
                body: JSON.stringify({
                    origin_lat: userLat,
                    origin_lng: userLng,
                    dest_lat: destLat,
                    dest_lng: destLng,
                    points: routePoints
                })
            });

            if (safetyRes && safetyRes.routes && safetyRes.routes.length > 0) {
                safetyRoute = safetyRes.routes[0];
                console.log('✅ AI Safety Score received:', safetyRoute.risk_score);
            }
        } catch (safetyErr) {
            console.warn('⚠️ Backend safety scoring unavailable, using OSRM route directly:', safetyErr.message);
        }

        // ── Step 4: Render route ──────────────────────────────────────────────
        clearRoute();

        const riskScore = safetyRoute ? safetyRoute.risk_score : 0.3;
        const riskLabel = safetyRoute ? safetyRoute.risk_label : 'safe';
        const color = riskScore < 0.4 ? '#22c55e' : riskScore < 0.7 ? '#f59e0b' : '#ef4444';

        // Use safetyRoute.points if available, otherwise use OSRM points
        const points = (safetyRoute && safetyRoute.points) ? safetyRoute.points : routePoints;
        const latLngs = points.map(p => [p[1], p[0]]);

        // Draw subtle shadow polyline for depth
        L.polyline(latLngs, {
            color: '#000', weight: 12, opacity: 0.3, lineJoin: 'round', lineCap: 'round'
        }).addTo(map);

        routePolyline = L.polyline(latLngs, {
            color: color,
            weight: 6,
            opacity: 0.9,
            lineJoin: 'round',
            lineCap: 'round'
        }).addTo(map);

        map.fitBounds(routePolyline.getBounds(), { padding: [60, 60] });

        // ── Step 5: Update safety panel ───────────────────────────────────────
        updateRoutePanel({
            riskScore,
            riskLabel,
            color,
            distanceKm,
            durationMin,
            destName,
            breakdown: safetyRoute ? safetyRoute.risk_breakdown : { incident_density: 0.2, time_factor: 0.3 }
        });

        hideStatusBar();

    } catch (err) {
        console.error('Route Error:', err);
        showUserMessage(err.message, 'error');
        hideStatusBar();
    } finally {
        findBtn.disabled = false;
        findBtn.innerHTML = '<i class="fas fa-directions"></i> Find Safe Route';
    }
}

// ─── Clear existing route layers ──────────────────────────────────────────────
function clearRoute() {
    if (routePolyline) {
        // Also remove shadow layer (added just before routePolyline)
        try { map.eachLayer(l => { if (l._path && l !== routePolyline) { /* skip non-polylines */ } }); } catch (_) {}
        map.removeLayer(routePolyline);
        routePolyline = null;
    }
    // Remove all polylines to clear shadows too
    map.eachLayer(layer => {
        if (layer instanceof L.Polyline) map.removeLayer(layer);
    });
}

// ─── UI Helpers ──────────────────────────────────────────────────────────────
function updateRoutePanel({ riskScore, riskLabel, color, distanceKm, durationMin, destName, breakdown }) {
    const panel = document.getElementById('route-info');
    const scoreText = document.getElementById('safety-score-text');
    const riskBadge = document.getElementById('risk-badge');
    const incidentBar = document.getElementById('incident-bar');
    const timeBar = document.getElementById('time-bar');
    const distanceEl = document.getElementById('route-distance');
    const durationEl = document.getElementById('route-duration');

    panel.classList.remove('hidden');
    panel.style.borderLeftColor = color;

    const safetyPct = ((1 - riskScore) * 100).toFixed(0);
    scoreText.textContent = `Safety Score: ${safetyPct}% — ${distanceKm} km · ${durationMin} min walk`;

    riskBadge.textContent = riskLabel.toUpperCase();
    riskBadge.style.background = `${color}25`;
    riskBadge.style.color = color;
    riskBadge.style.border = `1px solid ${color}`;

    if (distanceEl) distanceEl.textContent = `${distanceKm} km`;
    if (durationEl) durationEl.textContent = `~${durationMin} min`;

    const incidentPct = Math.min(100, ((breakdown.incident_density || 0) * 100)).toFixed(0);
    const timePct = Math.min(100, ((breakdown.time_factor || 0) * 100)).toFixed(0);

    incidentBar.style.width = `${incidentPct}%`;
    incidentBar.style.background = color;
    timeBar.style.width = `${timePct}%`;
    timeBar.style.background = color;

    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideRoutePanel() {
    document.getElementById('route-info').classList.add('hidden');
}

let statusBarEl = null;
function showStatusBar(msg) {
    if (!statusBarEl) {
        statusBarEl = document.createElement('div');
        statusBarEl.style.cssText = `
            position:fixed;bottom:2rem;left:50%;transform:translateX(-50%);
            background:rgba(15,15,25,0.95);color:white;padding:0.75rem 1.5rem;
            border-radius:2rem;font-size:0.875rem;font-weight:600;
            border:1px solid rgba(124,58,237,0.4);backdrop-filter:blur(10px);
            z-index:9999;transition:opacity 0.3s;
        `;
        document.body.appendChild(statusBarEl);
    }
    statusBarEl.textContent = msg;
    statusBarEl.style.opacity = '1';
}

function hideStatusBar() {
    if (statusBarEl) statusBarEl.style.opacity = '0';
}

function showUserMessage(msg, type = 'info') {
    const color = type === 'error' ? '#ef4444' : type === 'warn' ? '#f59e0b' : '#7c3aed';
    const toast = document.createElement('div');
    toast.style.cssText = `
        position:fixed;top:1.5rem;right:1.5rem;
        background:rgba(15,15,25,0.97);color:white;
        padding:1rem 1.5rem;border-radius:1rem;
        border-left:4px solid ${color};
        font-size:0.875rem;max-width:350px;
        z-index:9999;animation:slideIn 0.3s ease;
    `;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
}

function showMapError(msg) {
    const mapEl = document.getElementById('map');
    mapEl.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
            height:100%;color:var(--text-muted);text-align:center;padding:2rem;">
            <i class="fas fa-exclamation-triangle" style="font-size:3rem;color:#f59e0b;margin-bottom:1rem;"></i>
            <p style="font-weight:600;margin-bottom:0.5rem;">Map Unavailable</p>
            <p style="font-size:0.875rem;">${msg}</p>
        </div>`;
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    api.checkAuth();
    initMap();

    document.getElementById('find-route').addEventListener('click', findSafeRoute);
    document.getElementById('destination').addEventListener('keypress', e => {
        if (e.key === 'Enter') findSafeRoute();
    });

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', () => api.logout());
});
