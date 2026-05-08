import { useState, useEffect } from 'react';
import { Users, AlertCircle, MapPin, TrendingUp, Activity, BellRing } from 'lucide-react';
import api from '../../api/axios';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    total_users: 0,
    active_sos: 0,
    total_incidents: 0,
    unsafe_zones: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/admin/api/stats');
        setStats(res.data);
      } catch (err) {
        console.error('Failed to fetch admin stats', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div className="text-gray-500 animate-pulse">Loading system metrics...</div>;

  const statCards = [
    { name: 'Total Users', value: stats.total_users, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { name: 'Active SOS', value: stats.active_sos, icon: BellRing, color: 'text-emergency', bg: 'bg-emergency/10' },
    { name: 'Incidents', value: stats.total_incidents, icon: AlertCircle, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    { name: 'Unsafe Zones', value: stats.unsafe_zones, icon: MapPin, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  ];

  return (
    <div className="space-y-8">
      {/* Real-time Monitor Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {statCards.map((stat) => (
              <div key={stat.name} className="bg-surface p-6 rounded-3xl border border-gray-800 flex items-center space-x-6 hover:border-gray-700 transition">
                <div className={`p-4 ${stat.bg} rounded-2xl`}>
                  <stat.icon className={`${stat.color} w-8 h-8`} />
                </div>
                <div>
                  <p className="text-gray-500 text-sm font-bold uppercase tracking-wider">{stat.name}</p>
                  <h3 className="text-3xl font-black mt-1">{stat.value}</h3>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-surface p-8 rounded-3xl border border-gray-800">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-bold flex items-center space-x-2">
                <Activity className="text-emergency w-5 h-5" />
                <span>System Health & Traffic</span>
              </h3>
              <div className="flex space-x-2">
                <div className="w-3 h-3 bg-safety rounded-full"></div>
                <div className="w-3 h-3 bg-gray-700 rounded-full"></div>
                <div className="w-3 h-3 bg-gray-700 rounded-full"></div>
              </div>
            </div>
            <div className="h-64 flex items-center justify-center border-t border-gray-800">
              <p className="text-gray-600 font-medium uppercase tracking-[0.2em] text-xs italic">Analytics Graph Placeholder</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-[#1a1a1a] p-6 rounded-3xl border border-emergency/20 shadow-xl shadow-emergency/5 relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-lg font-bold text-emergency mb-4 flex items-center space-x-2">
                <BellRing className="w-5 h-5 animate-bounce" />
                <span>Critical Alerts</span>
              </h3>
              <div className="space-y-4">
                {stats.active_sos > 0 ? (
                  <div className="p-4 bg-emergency/10 border border-emergency/20 rounded-2xl">
                    <p className="text-sm font-bold text-white">Emergency in Sector 15</p>
                    <p className="text-xs text-gray-400 mt-1">2 minutes ago • User: Priya S.</p>
                  </div>
                ) : (
                  <p className="text-gray-600 text-sm italic py-8 text-center">No active emergencies currently.</p>
                )}
              </div>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-emergency/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
          </div>

          <div className="bg-surface p-6 rounded-3xl border border-gray-800">
            <h3 className="text-lg font-bold mb-4 flex items-center space-x-2">
              <TrendingUp className="text-blue-500 w-5 h-5" />
              <span>Safety Trends</span>
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Response Time</span>
                <span className="font-bold text-safety">4.2m</span>
              </div>
              <div className="w-full bg-background h-2 rounded-full overflow-hidden">
                <div className="bg-safety w-[85%] h-full"></div>
              </div>
              <div className="flex justify-between items-center text-sm pt-2">
                <span className="text-gray-400">Prevention Rate</span>
                <span className="font-bold text-blue-500">+12%</span>
              </div>
              <div className="w-full bg-background h-2 rounded-full overflow-hidden">
                <div className="bg-blue-500 w-[65%] h-full"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
