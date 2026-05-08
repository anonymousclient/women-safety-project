import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Shield, LayoutDashboard, Users, AlertTriangle, Map, BarChart3, LogOut } from 'lucide-react';

export default function AdminLayout({ children, user }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const navItems = [
    { name: 'Analytics', path: '/admin', icon: LayoutDashboard },
    { name: 'User Management', path: '/admin/users', icon: Users },
    { name: 'SOS Alerts', path: '/admin/sos', icon: AlertTriangle },
    { name: 'Unsafe Zones', path: '/admin/zones', icon: Map },
    { name: 'Reports', path: '/admin/reports', icon: BarChart3 },
  ];

  return (
    <div className="flex h-screen bg-background text-white overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-[#121212] border-r border-gray-800 flex flex-col">
        <div className="p-6 flex items-center space-x-2">
          <Shield className="w-8 h-8 text-emergency" />
          <div className="flex flex-col">
            <span className="text-xl font-bold leading-none">SafeHer</span>
            <span className="text-[10px] text-emergency font-bold tracking-widest uppercase mt-1">Admin Panel</span>
          </div>
        </div>

        <nav className="flex-1 px-4 mt-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-3 p-4 rounded-xl transition ${
                location.pathname === item.path
                  ? 'bg-emergency/10 text-emergency border border-emergency/20 shadow-lg shadow-emergency/5'
                  : 'text-gray-500 hover:bg-surface hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-semibold">{item.name}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 p-4 text-gray-500 hover:text-emergency transition"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Admin Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        <header className="h-20 border-b border-gray-800 flex items-center justify-between px-8 bg-background sticky top-0 z-10">
          <h2 className="text-xl font-bold">
            {navItems.find(n => n.path === location.pathname)?.name || 'Control Center'}
          </h2>
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2 bg-emergency/10 border border-emergency/20 px-3 py-1 rounded-full">
              <span className="w-2 h-2 bg-emergency rounded-full animate-pulse"></span>
              <span className="text-[10px] text-emergency font-bold uppercase">System Live</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <p className="text-sm font-bold">Administrator</p>
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter">Master Access</p>
              </div>
              <div className="w-10 h-10 bg-surface border border-gray-700 rounded-xl flex items-center justify-center font-bold">
                AD
              </div>
            </div>
          </div>
        </header>

        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
