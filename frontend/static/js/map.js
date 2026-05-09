/**
 * Advanced Leaflet.js Implementation with AI Safety Scoring
 * Connects to SafeHer Backend for real-time risk assessment
 */

let map;
let userMarker;
let routingControl;
let zoneLayers = [];
let placeMarkers = [];

async function initMap() {
    console.log("📍 Initializing Advanced Safe Route Map...");

    // 1. Create Map Instance
    map = L.map('map', {
        zoomControl: false
    }).setView([28.6139, 77.2090], 13);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // 2. Add Dark Theme Layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
    }).addTo(map);

    // 3. Fetch Real Unsafe Zones from Backend
    fetchUnsafeZones();

    // 4. Handle Geolocation & User Marker
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const { latitude, longitude } = position.coords;
            const userPos = [latitude, longitude];
            map.setView(userPos, 15);
            
            userMarker = L.marker(userPos).addTo(map)
                .bindPopup('<b>Your Location</b>').openPopup();

            // 5. Fetch Real Nearby Safe Places
            fetchNearbySafePlaces(latitude, longitude);
        }, err => {
            console.error("Geolocation Error:", err);
            alert("Location access is required to find safe routes from your current position.");
        });
    } else {
        alert("Geolocation is not supported by your browser.");
    }
}

async function fetchUnsafeZones() {
    try {
        const response = await api.fetch('/zones/all');
        if (response.zones) {
            response.zones.forEach(zone => {
                const color = zone.risk_level > 0.7 ? '#ef4444' : (zone.risk_level > 0.4 ? '#f59e0b' : '#22c55e');
                const circle = L.circle([zone.location.coordinates[1], zone.location.coordinates[0]], {
                    color: color,
                    fillColor: color,
                    fillOpacity: 0.2,
                    radius: zone.radius_meters || 500
                }).addTo(map).bindPopup(`<b>Zone:</b> ${zone.name}<br><b>Risk:</b> ${(zone.risk_level * 100).toFixed(0)}%`);
                zoneLayers.push(circle);
            });
        }
    } catch (e) {
        console.error("Failed to fetch zones:", e);
    }
}

async function fetchNearbySafePlaces(lat, lng) {
    try {
        const response = await api.fetch(`/nearby-safe-places?lat=${lat}&lng=${lng}`);
        if (response.places) {
            const policeIcon = L.divIcon({
                html: '<i class="fas fa-shield-alt" style="color: #4fc3f7; font-size: 1.5rem;"></i>',
                className: 'custom-icon', iconSize: [30, 30]
            });
            const hospitalIcon = L.divIcon({
                html: '<i class="fas fa-hospital" style="color: #ef4444; font-size: 1.5rem;"></i>',
                className: 'custom-icon', iconSize: [30, 30]
            });

            response.places.forEach(place => {
                const icon = place.type === 'police_station' ? policeIcon : hospitalIcon;
                const marker = L.marker([place.latitude, place.longitude], { icon: icon })
                    .addTo(map)
                    .bindPopup(`<b>${place.name}</b><br>${place.address}`);
                placeMarkers.push(marker);
            });
        }
    } catch (e) {
        console.error("Failed to fetch safe places:", e);
    }
}

async function findSafeRoute() {
    const destInput = document.getElementById('destination').value;
    const findBtn = document.getElementById('find-route');
    const routeInfo = document.getElementById('route-info');
    
    if (!destInput) return alert("Please enter a destination.");

    // Loading State
    findBtn.disabled = true;
    findBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
    routeInfo.classList.add('hidden');

    try {
        console.log("🔍 Geocoding destination:", destInput);
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destInput)}`);
        const geoData = await geoRes.json();
        if (geoData.length === 0) throw new Error("Destination not found.");

        const destLat = parseFloat(geoData[0].lat);
        const destLng = parseFloat(geoData[0].lon);

        navigator.geolocation.getCurrentPosition(async (position) => {
            try {
                const startLat = position.coords.latitude;
                const startLng = position.coords.longitude;

                console.log("🛤️ Fetching OSRM route...");
                const osrmUrl = `https://router.project-osrm.org/route/v1/walking/${startLng},${startLat};${destLng},${destLat}?overview=full&geometries=geojson`;
                const osrmRes = await fetch(osrmUrl);
                const osrmData = await osrmRes.json();
                
                if (!osrmData.routes || osrmData.routes.length === 0) throw new Error("No walking route found.");
                
                const routePoints = osrmData.routes[0].geometry.coordinates;

                console.log("🛡️ Requesting AI safety score...");
                const safetyRes = await api.fetch('/get-safe-route', {
                    method: 'POST',
                    body: JSON.stringify({
                        origin_lat: startLat, origin_lng: startLng,
                        dest_lat: destLat, dest_lng: destLng,
                        points: routePoints 
                    })
                });

                console.log("Safety Response:", safetyRes);

                if (safetyRes.routes && safetyRes.routes.length > 0) {
                    const bestRoute = safetyRes.routes[0];
                    renderRoute(bestRoute);
                    updateSafetyUI(bestRoute);
                } else {
                    throw new Error("Unable to calculate safety score for this route.");
                }
            } catch (innerErr) {
                console.error("Inner Route Error:", innerErr);
                alert(innerErr.message);
            } finally {
                findBtn.disabled = false;
                findBtn.innerHTML = '<i class="fas fa-directions"></i> Find Safe Route';
            }
        }, err => {
            console.error("Geolocation Callback Error:", err);
            alert("Location access is required.");
            findBtn.disabled = false;
            findBtn.innerHTML = '<i class="fas fa-directions"></i> Find Safe Route';
        });
    } catch (err) {
        console.error("Geocoding Error:", err);
        alert(err.message);
        findBtn.disabled = false;
        findBtn.innerHTML = '<i class="fas fa-directions"></i> Find Safe Route';
    }
}

function renderRoute(route) {
    if (routingControl) map.removeLayer(routingControl);

    // Convert [lng, lat] to [lat, lng] for Leaflet
    const latLngs = route.points.map(p => [p[1], p[0]]);
    const color = route.risk_score < 0.4 ? '#22c55e' : (route.risk_score < 0.7 ? '#f59e0b' : '#ef4444');
    
    routingControl = L.polyline(latLngs, {
        color: color,
        weight: 8,
        opacity: 0.8,
        lineJoin: 'round'
    }).addTo(map);

    map.fitBounds(routingControl.getBounds(), { padding: [50, 50] });
}

function updateSafetyUI(route) {
    const routeInfo = document.getElementById('route-info');
    const scoreText = document.getElementById('safety-score-text');
    const riskBadge = document.getElementById('risk-badge');
    const incidentBar = document.getElementById('incident-bar');
    const timeBar = document.getElementById('time-bar');

    routeInfo.classList.remove('hidden');
    
    const score = ((1 - route.risk_score) * 100).toFixed(0);
    scoreText.textContent = `Route Safety Score: ${score}%`;
    riskBadge.textContent = route.risk_label.toUpperCase();
    
    const color = route.risk_score < 0.4 ? '#22c55e' : (route.risk_score < 0.7 ? '#f59e0b' : '#ef4444');
    riskBadge.style.backgroundColor = `${color}22`;
    riskBadge.style.color = color;
    routeInfo.style.borderLeftColor = color;

    // Fixed breakdown logic
    const incidents = route.risk_breakdown.incident_density || 0;
    const time = route.risk_breakdown.time_factor || 0;

    incidentBar.style.width = `${(incidents * 100).toFixed(0)}%`;
    incidentBar.style.backgroundColor = color;
    timeBar.style.width = `${(time * 100).toFixed(0)}%`;
    timeBar.style.backgroundColor = color;
    
    routeInfo.scrollIntoView({ behavior: 'smooth' });
}

document.addEventListener('DOMContentLoaded', () => {
    api.checkAuth();
    initMap();
    document.getElementById('find-route').addEventListener('click', findSafeRoute);
    document.getElementById('destination').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') findSafeRoute();
    });
    document.getElementById('logout-btn').addEventListener('click', () => api.logout());
});
