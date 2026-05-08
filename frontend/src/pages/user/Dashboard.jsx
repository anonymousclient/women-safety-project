import { useState, useEffect } from 'react';
import { Bell, Map, Users, AlertTriangle, ShieldCheck, ArrowUpRight } from 'lucide-react';
import api from '../../api/axios';

export default function UserDashboard() {
  const [stats, setStats] = useState({ sos_count: 0, incident_count: 0, emergency_contacts_count: 0 });
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const statsRes = await api.get('/user/dashboard-stats');
        const historyRes = await api.get('/user/sos-history');
        setStats(statsRes.data);
        setRecentAlerts(historyRes.data);
      } catch (err) {
        console.error('Failed to fetch dashboard data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div className="text-gray-500 animate-pulse">Initializing dashboard...</div>;

  return (
    <div className="space-y-8">
      {/* Welcome Card */}
      <div className="relative overflow-hidden bg-gradient-to-r from-emergency to-red-600 rounded-3xl p-8 text-white shadow-2xl shadow-emergency/20">
        <div className="relative z-10">
          <h2 className="text-3xl font-bold mb-2">Welcome to SafeHer</h2>
          <p className="text-red-100 max-w-md opacity-90">Your safety is our priority. Use the buttons below for immediate assistance or to plan a safe route.</p>
          <div className="flex mt-6 space-x-4">
            <button className="bg-white text-emergency px-6 py-2 rounded-xl font-bold hover:bg-gray-100 transition shadow-lg">
              Trigger SOS Now
            </button>
            <button className="bg-red-800/20 border border-white/20 text-white px-6 py-2 rounded-xl font-bold hover:bg-red-800/40 transition">
              Share Live Location
            </button>
          </div>
        </div>
        <AlertTriangle className="absolute -right-10 -bottom-10 w-64 h-64 text-white/10 rotate-12" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface p-6 rounded-2xl border border-gray-800">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-red-500/10 rounded-xl">
              <Bell className="text-emergency w-6 h-6" />
            </div>
            <ArrowUpRight className="text-gray-600 w-5 h-5" />
          </div>
          <p className="text-gray-500 text-sm font-medium">SOS Triggered</p>
          <h4 className="text-3xl font-bold mt-1">{stats.sos_count}</h4>
        </div>
        <div className="bg-surface p-6 rounded-2xl border border-gray-800">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-blue-500/10 rounded-xl">
              <ShieldCheck className="text-blue-500 w-6 h-6" />
            </div>
            <ArrowUpRight className="text-gray-600 w-5 h-5" />
          </div>
          <p className="text-gray-500 text-sm font-medium">Emergency Contacts</p>
          <h4 className="text-3xl font-bold mt-1">{stats.emergency_contacts_count}</h4>
        </div>
        <div className="bg-surface p-6 rounded-2xl border border-gray-800">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-safety/10 rounded-xl">
              <Map className="text-safety w-6 h-6" />
            </div>
            <ArrowUpRight className="text-gray-600 w-5 h-5" />
          </div>
          <p className="text-gray-500 text-sm font-medium">Incidents Reported</p>
          <h4 className="text-3xl font-bold mt-1">{stats.incident_count}</h4>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-surface rounded-3xl border border-gray-800 overflow-hidden">
        <div className="p-6 border-b border-gray-800 flex justify-between items-center">
          <h3 className="text-xl font-bold">Recent SOS History</h3>
          <button className="text-emergency text-sm font-bold hover:underline">View All</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-gray-500 text-sm border-b border-gray-800">
                <th className="px-6 py-4 font-semibold uppercase">Triggered At</th>
                <th className="px-6 py-4 font-semibold uppercase">Location</th>
                <th className="px-6 py-4 font-semibold uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {recentAlerts.map((alert) => (
                <tr key={alert.id} className="hover:bg-background transition">
                  <td className="px-6 py-4 text-sm">{new Date(alert.triggered_at).toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm">{alert.address}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      alert.status === 'resolved' ? 'bg-safety/10 text-safety' : 'bg-emergency/10 text-emergency animate-pulse'
                    }`}>
                      {alert.status}
                    </span>
                  </td>
                </tr>
              ))}
              {recentAlerts.length === 0 && (
                <tr>
                  <td colSpan="3" className="px-6 py-12 text-center text-gray-500">No recent emergency alerts found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
