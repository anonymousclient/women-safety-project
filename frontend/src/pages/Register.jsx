import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, User, Mail, Lock, Phone, ArrowRight } from 'lucide-react';
import api from '../api/axios';

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await api.post('/auth/register', formData);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center px-6 py-12">
      <Link to="/" className="flex items-center space-x-2 mb-10 group">
        <Shield className="w-10 h-10 text-emergency group-hover:scale-110 transition" />
        <span className="text-3xl font-bold tracking-tight text-white">SafeHer</span>
      </Link>

      <div className="w-full max-w-md bg-surface p-10 rounded-3xl shadow-2xl border border-gray-800">
        <h2 className="text-3xl font-bold text-white mb-2">Create Account</h2>
        <p className="text-gray-400 mb-8">Join the community and stay safe.</p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
            <input
              type="text"
              name="name"
              placeholder="Full Name"
              required
              value={formData.name}
              onChange={handleChange}
              className="w-full bg-background border border-gray-800 rounded-xl py-4 pl-12 pr-4 text-white focus:border-emergency outline-none transition"
            />
          </div>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
            <input
              type="email"
              name="email"
              placeholder="Email Address"
              required
              value={formData.email}
              onChange={handleChange}
              className="w-full bg-background border border-gray-800 rounded-xl py-4 pl-12 pr-4 text-white focus:border-emergency outline-none transition"
            />
          </div>
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
            <input
              type="tel"
              name="phone"
              placeholder="Phone Number"
              required
              value={formData.phone}
              onChange={handleChange}
              className="w-full bg-background border border-gray-800 rounded-xl py-4 pl-12 pr-4 text-white focus:border-emergency outline-none transition"
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
            <input
              type="password"
              name="password"
              placeholder="Create Password"
              required
              value={formData.password}
              onChange={handleChange}
              className="w-full bg-background border border-gray-800 rounded-xl py-4 pl-12 pr-4 text-white focus:border-emergency outline-none transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emergency hover:bg-red-600 text-white font-bold py-4 rounded-xl transition flex items-center justify-center space-x-2 mt-4 shadow-lg shadow-emergency/20"
          >
            {loading ? 'Creating account...' : (
              <>
                <span>Sign Up</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-gray-500">
          Already have an account? <Link to="/login" className="text-emergency hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
