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
        });
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
        const response = await api.fetch(`/navigation/nearby-safe-places?lat=${lat}&lng=${lng}`);
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
    const routeInfo = document.getElementById('route-info');
    
    if (!destInput) return alert("Please enter a destination.");

    try {
        // Step 1: Geocode Destination
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destInput)}`);
        const geoData = await geoRes.json();
        if (geoData.length === 0) return alert("Destination not found.");

        const destLat = parseFloat(geoData[0].lat);
        const destLng = parseFloat(geoData[0].lon);

        navigator.geolocation.getCurrentPosition(async (position) => {
            const startLat = position.coords.latitude;
            const startLng = position.coords.longitude;

            // Step 2: Get Route Points from OSRM
            const osrmUrl = `https://router.project-osrm.org/route/v1/walking/${startLng},${startLat};${destLng},${destLat}?overview=full&geometries=geojson`;
            const osrmRes = await fetch(osrmUrl);
            const osrmData = await osrmRes.json();
            
            if (osrmData.routes.length === 0) return alert("No route found.");
            
            const routePoints = osrmData.routes[0].geometry.coordinates; // [[lng, lat], ...]

            // Step 3: Get Safety Score from Backend
            const safetyRes = await api.fetch('/navigation/get-safe-route', {
                method: 'POST',
                body: JSON.stringify({
                    origin_lat: startLat, origin_lng: startLng,
                    dest_lat: destLat, dest_lng: destLng,
                    // Send OSRM points for scoring
                    points: routePoints 
                })
            });

            if (safetyRes.routes && safetyRes.routes.length > 0) {
                const bestRoute = safetyRes.routes[0];
                renderRoute(bestRoute);
                updateSafetyUI(bestRoute);
            }
        });
    } catch (err) {
        console.error("Route Error:", err);
    }
}

function renderRoute(route) {
    if (routingControl) map.removeControl(routingControl);

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
    
    // UI Colors
    const color = route.risk_score < 0.4 ? '#22c55e' : (route.risk_score < 0.7 ? '#f59e0b' : '#ef4444');
    riskBadge.style.backgroundColor = `${color}22`;
    riskBadge.style.color = color;
    routeInfo.style.borderLeftColor = color;

    // Breakdown Bars
    incidentBar.style.width = `${route.risk_breakdown.incident_density * 100}%`;
    incidentBar.style.backgroundColor = color;
    timeBar.style.width = `${route.risk_breakdown.time_factor * 100}%`;
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
