import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Shield, Home, Map, Bell, User, LogOut } from 'lucide-react';

export default function UserLayout({ children, user }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: Home },
    { name: 'Safe Route', path: '/safe-route', icon: Map },
    { name: 'SOS Emergency', path: '/sos', icon: Bell },
    { name: 'Profile', path: '/profile', icon: User },
  ];

  return (
    <div className="flex h-screen bg-background text-white overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-surface border-r border-gray-800 flex flex-col">
        <div className="p-6 flex items-center space-x-2">
          <Shield className="w-8 h-8 text-primary" />
          <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">SafeHer</span>
        </div>

        <nav className="flex-1 px-4 mt-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-3 p-4 rounded-xl transition ${
                location.pathname === item.path
                  ? 'bg-primary text-white shadow-lg shadow-primary/20'
                  : 'text-gray-400 hover:bg-surface-light hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.name}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 p-4 text-gray-400 hover:text-emergency transition"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        <header className="h-20 border-b border-gray-800 flex items-center justify-between px-8 bg-surface/50 backdrop-blur-md sticky top-0 z-10">
          <h2 className="text-xl font-semibold">
            {navItems.find(n => n.path === location.pathname)?.name || 'SafeHer'}
          </h2>
          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold">{user.name}</p>
              <p className="text-xs text-gray-500">Member since {new Date(user.created_at).getFullYear() || '2024'}</p>
            </div>
            <div className="w-10 h-10 bg-emergency rounded-full flex items-center justify-center font-bold shadow-lg shadow-emergency/20">
              {user.name.charAt(0)}
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
