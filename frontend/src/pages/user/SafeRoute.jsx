import { useState } from 'react';
import { Map, Search, Navigation, AlertCircle, Shield } from 'lucide-react';

export default function SafeRoute() {
  const [destination, setDestination] = useState('');
  const [riskScore, setRiskScore] = useState(null);

  const calculateRoute = () => {
    // Mock risk scoring logic
    setRiskScore(Math.random() * 10);
  };

  return (
    <div className="h-[calc(100vh-160px)] flex flex-col md:flex-row gap-8">
      {/* Search Panel */}
      <div className="w-full md:w-96 space-y-6">
        <div className="bg-surface p-6 rounded-3xl border border-gray-800 shadow-xl">
          <h3 className="text-xl font-bold mb-6 flex items-center space-x-2">
            <Navigation className="text-emergency w-5 h-5" />
            <span>Find Safe Path</span>
          </h3>
          
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
              <input
                type="text"
                placeholder="Where to?"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full bg-background border border-gray-800 rounded-xl py-3 pl-12 pr-4 text-white focus:border-emergency outline-none transition"
              />
            </div>
            <button
              onClick={calculateRoute}
              className="w-full bg-emergency py-3 rounded-xl font-bold hover:bg-red-600 transition shadow-lg shadow-emergency/10"
            >
              Analyze Route
            </button>
          </div>
        </div>

        {riskScore !== null && (
          <div className="bg-surface p-6 rounded-3xl border border-gray-800 shadow-xl animate-in fade-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-bold">Route Safety Score</h4>
              <Shield className={riskScore < 4 ? 'text-safety' : riskScore < 7 ? 'text-yellow-500' : 'text-emergency'} />
            </div>
            
            <div className="flex items-end space-x-2 mb-4">
              <span className="text-4xl font-black">{(10 - riskScore).toFixed(1)}</span>
              <span className="text-gray-500 font-bold mb-1">/ 10</span>
            </div>

            <p className="text-sm text-gray-400">
              {riskScore < 4 
                ? "This route is highly rated for safety and is well-lit." 
                : riskScore < 7 
                ? "Moderate risk detected. Multiple incidents reported nearby." 
                : "High risk area. We recommend choosing an alternative path."}
            </p>
          </div>
        )}

        <div className="bg-background/50 border border-gray-800 p-6 rounded-3xl">
          <h4 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">Nearby Safe Zones</h4>
          <div className="space-y-3">
            <div className="flex items-center space-x-3 text-sm">
              <div className="w-2 h-2 bg-safety rounded-full"></div>
              <span>Police Station - 0.5km</span>
            </div>
            <div className="flex items-center space-x-3 text-sm">
              <div className="w-2 h-2 bg-safety rounded-full"></div>
              <span>Apollo Hospital - 1.2km</span>
            </div>
          </div>
        </div>
      </div>

      {/* Map Placeholder */}
      <div className="flex-1 bg-surface rounded-[3rem] border border-gray-800 overflow-hidden relative shadow-inner">
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600 bg-[#121212]">
          <Map className="w-20 h-20 mb-4 opacity-20" />
          <p className="text-lg font-bold opacity-30 uppercase tracking-[0.3em]">Interactive Map</p>
          <p className="text-xs opacity-30 mt-2">Connecting to Google Maps SDK...</p>
        </div>
        
        {/* Mock Unsafe Zone Overlays */}
        {riskScore > 5 && (
          <div className="absolute top-1/4 right-1/4 w-48 h-48 bg-emergency/10 border-2 border-emergency/30 rounded-full animate-pulse flex items-center justify-center">
            <span className="text-[10px] text-emergency font-bold uppercase">High Risk Area</span>
          </div>
        )}
      </div>
    </div>
  );
}
