import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Lock, Mail, ArrowRight } from 'lucide-react';
import api from '../api/axios';

export default function Login({ setUser }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const endpoint = isAdmin ? '/auth/login/admin' : '/auth/login/user';
      const response = await api.post(endpoint, { email, password });
      
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center px-6">
      <Link to="/" className="flex items-center space-x-2 mb-10 group">
        <Shield className="w-10 h-10 text-emergency group-hover:scale-110 transition" />
        <span className="text-3xl font-bold tracking-tight text-white">SafeHer</span>
      </Link>

      <div className="w-full max-w-md bg-surface p-10 rounded-3xl shadow-2xl border border-gray-800">
        <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
        <p className="text-gray-400 mb-8">Please enter your details to sign in.</p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl mb-6 text-sm">
            {error}
          </div>
        )}

        <div className="flex bg-background p-1 rounded-xl mb-8">
          <button
            onClick={() => setIsAdmin(false)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${!isAdmin ? 'bg-surface text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
          >
            User Login
          </button>
          <button
            onClick={() => setIsAdmin(true)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${isAdmin ? 'bg-surface text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Admin Login
          </button>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
            <input
              type="email"
              placeholder="Email Address"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-background border border-gray-800 rounded-xl py-4 pl-12 pr-4 text-white focus:border-emergency outline-none transition"
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
            <input
              type="password"
              placeholder="Password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-background border border-gray-800 rounded-xl py-4 pl-12 pr-4 text-white focus:border-emergency outline-none transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emergency hover:bg-red-600 text-white font-bold py-4 rounded-xl transition flex items-center justify-center space-x-2 shadow-lg shadow-emergency/20"
          >
            {loading ? 'Signing in...' : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-gray-500">
          Don't have an account? <Link to="/register" className="text-emergency hover:underline">Create one</Link>
        </p>
      </div>
    </div>
  );
}
