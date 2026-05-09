import { useState, useEffect } from 'react';
import { Bell, MapPin, Shield, AlertTriangle, Loader2 } from 'lucide-react';
import api from '../../api/axios';

export default function SOSPage() {
  const [activeSOS, setActiveSOS] = useState(null);
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState('Fetching current location...');

  const triggerSOS = async () => {
    setLoading(true);
    
    // Use HTML5 Geolocation API
    if (!navigator.geolocation) {
      handleLocationError("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        await sendSOSToBackend(latitude, longitude);
      },
      (error) => {
        console.warn("Location error, using fallback:", error.message);
        // Fallback mock location if permission is denied for testing purposes
        handleLocationError("Permission denied. Using fallback location.");
        sendSOSToBackend(28.6139, 77.2090);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const sendSOSToBackend = async (latitude, longitude) => {
    try {
      const res = await api.post('/sos/trigger', { latitude, longitude });
      setActiveSOS(res.data);
      // In a real app, we would reverse-geocode the lat/lng here
      setAddress(`Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`);
    } catch (err) {
      alert("Failed to trigger SOS. Please try calling emergency services directly.");
    } finally {
      setLoading(false);
    }
  };

  const handleLocationError = (msg) => {
    setAddress(msg);
  };

  const cancelSOS = async () => {
    if (!activeSOS) return;
    try {
      await api.put(`/admin/api/sos/${activeSOS.alert_id}/resolve`, { notes: "Cancelled by user" });
      setActiveSOS(null);
    } catch (err) {
      alert("Failed to cancel. Please contact support.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-12 max-w-2xl mx-auto">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-black tracking-tight">Emergency <span className="text-emergency">SOS</span></h2>
        <p className="text-gray-400">Triggering this will alert your emergency contacts and local authorities with your live location.</p>
      </div>

      {!activeSOS ? (
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 bg-emergency/20 rounded-full animate-ping"></div>
          <div className="absolute inset-0 bg-emergency/10 rounded-full animate-pulse scale-150"></div>
          <button
            onClick={triggerSOS}
            disabled={loading}
            className="relative z-10 w-64 h-64 bg-emergency hover:bg-red-600 rounded-full flex flex-col items-center justify-center shadow-2xl shadow-emergency/40 group transition active:scale-95"
          >
            {loading ? (
              <Loader2 className="w-16 h-16 text-white animate-spin" />
            ) : (
              <>
                <Bell className="w-20 h-20 text-white mb-2 group-hover:rotate-12 transition" />
                <span className="text-2xl font-black text-white uppercase tracking-widest">SOS</span>
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="w-full bg-surface p-10 rounded-[3rem] border border-emergency/30 shadow-2xl shadow-emergency/10 space-y-8">
          <div className="flex items-center space-x-4 bg-emergency/10 p-4 rounded-2xl border border-emergency/20">
            <div className="w-3 h-3 bg-emergency rounded-full animate-pulse"></div>
            <p className="text-emergency font-bold uppercase tracking-widest text-sm">Alert Active</p>
          </div>

          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <MapPin className="text-gray-500 w-6 h-6 mt-1" />
              <div>
                <p className="text-sm text-gray-500 font-medium">Broadcast Location</p>
                <p className="text-lg font-bold">{address}</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <Shield className="text-gray-500 w-6 h-6 mt-1" />
              <div>
                <p className="text-sm text-gray-500 font-medium">Monitoring Status</p>
                <p className="text-lg font-bold">Authorities Notified • Response in progress</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col space-y-4 pt-4">
            <button 
              onClick={cancelSOS}
              className="w-full bg-emergency py-4 rounded-2xl font-bold hover:bg-red-600 transition shadow-lg shadow-emergency/20"
            >
              I am Safe Now
            </button>
            <button
              onClick={cancelSOS}
              className="w-full bg-background border border-gray-800 py-4 rounded-2xl font-bold hover:bg-surface transition"
            >
              Cancel Alert (Mistake)
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center space-x-2 text-gray-500 text-sm italic">
        <AlertTriangle className="w-4 h-4" />
        <p>Your browser may prompt you for location access when triggering SOS.</p>
      </div>
    </div>
  );
}
