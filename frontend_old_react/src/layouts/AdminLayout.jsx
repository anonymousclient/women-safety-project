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
      <aside className="w-[250px] bg-surface border-r border-gray-800 flex flex-col shrink-0">
        <div className="p-6 pb-4 border-b border-gray-800 mb-2">
          <div className="flex items-center space-x-2">
            <Shield className="w-6 h-6 text-primary" />
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">SafeHer</span>
          </div>
          <p className="text-[10px] text-gray-500 font-bold tracking-widest uppercase mt-2">Admin Dashboard</p>
        </div>

        <nav className="flex-1 px-0 mt-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-3 px-6 py-3 transition-all duration-200 text-sm font-medium ${
                location.pathname === item.path
                  ? 'bg-surface-light text-primary border-l-4 border-primary'
                  : 'text-gray-400 hover:bg-surface-light hover:text-gray-200'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.name}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-2 text-gray-500 hover:text-emergency transition text-sm"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-y-auto bg-background">
        <div className="p-8 max-w-[1400px]">
          {children}
        </div>
      </main>
    </div>
  );
}
