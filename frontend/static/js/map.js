let map;
let marker;
let directionsService;
let directionsRenderer;

function initMap() {
    // Default center (e.g., Delhi)
    const defaultCenter = { lat: 28.6139, lng: 77.2090 };
    
    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 14,
        center: defaultCenter,
        styles: [
            { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
            { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
            { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
            {
                featureType: "administrative.locality",
                elementType: "labels.text.fill",
                stylers: [{ color: "#d59563" }],
            },
            {
                featureType: "poi",
                elementType: "labels.text.fill",
                stylers: [{ color: "#d59563" }],
            },
            {
                featureType: "road",
                elementType: "geometry",
                stylers: [{ color: "#38414e" }],
            },
            {
                featureType: "road",
                elementType: "geometry.stroke",
                stylers: [{ color: "#212a37" }],
            },
            {
                featureType: "road",
                elementType: "labels.text.fill",
                stylers: [{ color: "#9ca5b3" }],
            },
            {
                featureType: "water",
                elementType: "geometry",
                stylers: [{ color: "#17263c" }],
            },
        ],
    });

    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer();
    directionsRenderer.setMap(map);

    // Get current location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            const pos = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
            };
            map.setCenter(pos);
            marker = new google.maps.Marker({
                position: pos,
                map: map,
                title: "Your Location",
                icon: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png"
            });
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    api.checkAuth();
    initMap();
    
    const logoutBtn = document.getElementById('logout-btn');
    const findRouteBtn = document.getElementById('find-route');
    const destinationInput = document.getElementById('destination');
    const routeInfo = document.getElementById('route-info');

    logoutBtn.addEventListener('click', () => api.logout());

    findRouteBtn.addEventListener('click', () => {
        const dest = destinationInput.value;
        if (!dest) return;

        navigator.geolocation.getCurrentPosition((position) => {
            const start = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
            };

            const request = {
                origin: start,
                destination: dest,
                travelMode: 'WALKING'
            };

            directionsService.route(request, (result, status) => {
                if (status === 'OK') {
                    directionsRenderer.setDirections(result);
                    routeInfo.classList.remove('hidden');
                } else {
                    alert("Directions request failed due to " + status);
                }
            });
        });
    });
});
