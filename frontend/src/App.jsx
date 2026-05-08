import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import UserDashboard from './pages/user/Dashboard';
import AdminDashboard from './pages/admin/Dashboard';
import SafeRoute from './pages/user/SafeRoute';
import SOSPage from './pages/user/SOSPage';
import Profile from './pages/user/Profile';
import UserLayout from './layouts/UserLayout';
import AdminLayout from './layouts/AdminLayout';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  if (loading) return <div className="flex items-center justify-center h-screen bg-background text-white">Loading...</div>;

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login setUser={setUser} />} />
        <Route path="/register" element={<Register />} />

        {/* User Routes */}
        <Route
          path="/dashboard"
          element={
            user && user.role === 'user' ? (
              <UserLayout user={user}>
                <UserDashboard />
              </UserLayout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/safe-route"
          element={
            user && user.role === 'user' ? (
              <UserLayout user={user}>
                <SafeRoute />
              </UserLayout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/sos"
          element={
            user && user.role === 'user' ? (
              <UserLayout user={user}>
                <SOSPage />
              </UserLayout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/profile"
          element={
            user && user.role === 'user' ? (
              <UserLayout user={user}>
                <Profile />
              </UserLayout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        {/* Admin Routes */}
        <Route
          path="/admin"
          element={
            user && user.role === 'admin' ? (
              <AdminLayout user={user}>
                <AdminDashboard />
              </AdminLayout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
