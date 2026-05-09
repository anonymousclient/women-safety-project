import { useState, useEffect } from 'react';
import { Users, AlertCircle, MapPin, TrendingUp, Activity, BellRing } from 'lucide-react';
import api from '../../api/axios';

export default function AdminDashboard() {
  const [stats, setStats] = useState({});
  const [activeSOS, setActiveSOS] = useState([]);
  const [recentIncidents, setRecentIncidents] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [statsRes, sosRes, incRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/sos/active'),
        api.get('/admin/incidents')
      ]);
      setStats(statsRes.data);
      setActiveSOS(sosRes.data);
      setRecentIncidents(incRes.data.slice(0, 5));
    } catch (err) {
      console.error('Failed to fetch admin data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Auto-refresh every 10s
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="text-gray-500 animate-pulse">Loading system metrics...</div>;

  const statCards = [
    { name: 'Total Users', value: stats.total_users, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { name: 'Active SOS', value: stats.active_sos, icon: BellRing, color: 'text-emergency', bg: 'bg-emergency/10' },
    { name: 'Incidents', value: stats.total_incidents, icon: AlertCircle, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    { name: 'Unsafe Zones', value: stats.unsafe_zones, icon: MapPin, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">Dashboard</h2>
        <p className="text-gray-400 text-sm mt-1">Real-time overview of the Women Safety system</p>
      </div>

      {/* ── Stat Cards Row ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { name: 'Active SOS', value: stats.active_sos || 0, icon: BellRing, color: 'text-emergency', bg: 'bg-emergency/15' },
          { name: 'Total Users', value: stats.total_users || 0, icon: Users, color: 'text-primary', bg: 'bg-primary/15' },
          { name: 'Total Incidents', value: stats.total_incidents || 0, icon: AlertCircle, color: 'text-warning', bg: 'bg-warning/15' },
          { name: 'This Week', value: stats.recent_incidents || 0, icon: Activity, color: 'text-success', bg: 'bg-success/15' },
          { name: 'Total SOS', value: stats.total_sos || 0, icon: Shield, color: 'text-secondary', bg: 'bg-secondary/15' },
          { name: 'Unsafe Zones', value: stats.unsafe_zones || 0, icon: MapPin, color: 'text-emergency', bg: 'bg-emergency/15' },
        ].map((stat) => (
          <div key={stat.name} className="bg-surface p-5 rounded-2xl border border-gray-800 hover:-translate-y-1 transition duration-200">
            <div className={`w-11 h-11 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center mb-4`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <h3 className="text-2xl font-bold text-white">{stat.value}</h3>
            <p className="text-[13px] font-medium text-gray-500 mt-1">{stat.name}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
        {/* Active SOS Alerts (Live) */}
        <div className="lg:col-span-5 bg-surface rounded-2xl border border-gray-800 overflow-hidden h-fit">
          <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
            <h3 className="font-semibold flex items-center">
              <span className="w-2 h-2 bg-emergency rounded-full mr-3 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]"></span>
              Active SOS Alerts
            </h3>
            <span className="px-2 py-0.5 bg-emergency/15 text-emergency text-[11px] font-bold rounded uppercase tracking-wider">
              {stats.active_sos || 0} active
            </span>
          </div>
          <div className="p-5 space-y-3 max-h-[450px] overflow-y-auto">
            {activeSOS.length > 0 ? (
              activeSOS.map((alert) => (
                <div key={alert.id} className="bg-surface-light border border-emergency/20 p-4 rounded-xl space-y-3 hover:border-emergency transition group">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-[15px]">{alert.user_name}</p>
                      <p className="text-xs text-gray-400 mt-1 flex items-center">
                        <MapPin className="w-3 h-3 mr-1" /> {alert.address}
                      </p>
                      <div className="flex items-center space-x-3 mt-2 text-[11px] text-gray-500">
                        <span className="flex items-center"><Activity className="w-3 h-3 mr-1" /> {alert.triggered_at}</span>
                        <span className="flex items-center"><Users className="w-3 h-3 mr-1" /> {alert.user_phone}</span>
                      </div>
                    </div>
                    <button className="px-3 py-1.5 border border-gray-700 rounded-lg text-xs hover:bg-white hover:text-black transition">
                      Resolve
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-gray-500 italic">
                <Shield className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p>No active SOS alerts</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Incidents */}
        <div className="lg:col-span-7 bg-surface rounded-2xl border border-gray-800 overflow-hidden h-fit">
          <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
            <h3 className="font-semibold flex items-center">
              <AlertCircle className="w-5 h-5 mr-2 text-warning" />
              Recent Incidents
            </h3>
            <button className="px-3 py-1.5 border border-gray-700 rounded-lg text-xs hover:bg-surface-light transition">
              View All
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-gray-500 border-b border-gray-800 text-[12px] uppercase tracking-wider font-semibold">
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Severity</th>
                  <th className="px-6 py-4">Reporter</th>
                  <th className="px-6 py-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {recentIncidents.length > 0 ? (
                  recentIncidents.map((inc) => (
                    <tr key={inc.id} className="hover:bg-surface-light/50 transition">
                      <td className="px-6 py-4 flex items-center capitalize">
                        <AlertCircle className="w-4 h-4 mr-2 text-gray-600" />
                        {inc.type.replace('_', ' ')}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                          inc.severity === 'high' ? 'bg-emergency/10 text-emergency' :
                          inc.severity === 'medium' ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'
                        }`}>
                          {inc.severity}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-300">{inc.reporter_name}</td>
                      <td className="px-6 py-4 text-gray-500">{inc.reported_at}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="text-center py-8 text-gray-500">No incidents reported yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
