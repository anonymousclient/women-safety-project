import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, User, Mail, Lock, Phone, ArrowRight, AlertCircle } from 'lucide-react';
import api from '../api/axios';

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const navigate = useNavigate();

  const validateField = (name, value) => {
    let error = '';
    switch (name) {
      case 'name':
        if (!/^[A-Za-z\s]{3,}$/.test(value)) error = 'Name must be 3+ characters (letters only)';
        break;
      case 'email':
        if (!/^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/.test(value)) error = 'Invalid email format';
        break;
      case 'phone':
        if (!/^\d{10}$/.test(value)) error = 'Phone must be exactly 10 digits';
        break;
      case 'password':
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}/.test(value)) {
          error = 'Password requires 8+ chars, upper, lower, number, & special char';
        }
        break;
      case 'confirmPassword':
        if (value !== formData.password) error = 'Passwords do not match';
        break;
      default:
        break;
    }
    return error;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    const fieldError = validateField(name, value);
    setErrors({ ...errors, [name]: fieldError });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setGlobalError('');
    
    // Final validation check before submit
    const newErrors = {};
    Object.keys(formData).forEach(key => {
      const err = validateField(key, formData[key]);
      if (err) newErrors[key] = err;
    });
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setLoading(false);
      return;
    }

    try {
      // Don't send confirmPassword to backend
      const { confirmPassword, ...submitData } = formData;
      const res = await api.post('/auth/register', submitData);
      
      // On success, redirect to OTP page. We'll pass the email in state so the OTP page knows who to verify.
      navigate('/verify-otp', { state: { email: formData.email, phone: formData.phone } });
    } catch (err) {
      setGlobalError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center px-6 py-12">
      <Link to="/" className="flex items-center space-x-2 mb-8 group">
        <Shield className="w-10 h-10 text-emergency group-hover:scale-110 transition" />
        <span className="text-3xl font-bold tracking-tight text-white">SafeHer</span>
      </Link>

      <div className="w-full max-w-md bg-surface p-10 rounded-3xl shadow-2xl border border-gray-800">
        <h2 className="text-3xl font-bold text-white mb-2">Create Account</h2>
        <p className="text-gray-400 mb-8">Join the community and stay safe.</p>

        {globalError && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl mb-6 text-sm flex items-start">
            <AlertCircle className="w-5 h-5 mr-2 shrink-0" />
            <span>{globalError}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <div className="relative">
              <User className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${errors.name ? 'text-red-500' : 'text-gray-500'}`} />
              <input type="text" name="name" placeholder="Full Name" required value={formData.name} onChange={handleChange}
                className={`w-full bg-background border ${errors.name ? 'border-red-500 focus:border-red-500' : 'border-gray-800 focus:border-emergency'} rounded-xl py-4 pl-12 pr-4 text-white outline-none transition`} />
            </div>
            {errors.name && <p className="text-red-500 text-xs mt-1 ml-2">{errors.name}</p>}
          </div>

          <div>
            <div className="relative">
              <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${errors.email ? 'text-red-500' : 'text-gray-500'}`} />
              <input type="email" name="email" placeholder="Email Address" required value={formData.email} onChange={handleChange}
                className={`w-full bg-background border ${errors.email ? 'border-red-500 focus:border-red-500' : 'border-gray-800 focus:border-emergency'} rounded-xl py-4 pl-12 pr-4 text-white outline-none transition`} />
            </div>
            {errors.email && <p className="text-red-500 text-xs mt-1 ml-2">{errors.email}</p>}
          </div>

          <div>
            <div className="relative">
              <Phone className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${errors.phone ? 'text-red-500' : 'text-gray-500'}`} />
              <input type="tel" name="phone" placeholder="Phone Number (10 digits)" required value={formData.phone} onChange={handleChange}
                className={`w-full bg-background border ${errors.phone ? 'border-red-500 focus:border-red-500' : 'border-gray-800 focus:border-emergency'} rounded-xl py-4 pl-12 pr-4 text-white outline-none transition`} />
            </div>
            {errors.phone && <p className="text-red-500 text-xs mt-1 ml-2">{errors.phone}</p>}
          </div>

          <div>
            <div className="relative">
              <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${errors.password ? 'text-red-500' : 'text-gray-500'}`} />
              <input type="password" name="password" placeholder="Create Password" required value={formData.password} onChange={handleChange}
                className={`w-full bg-background border ${errors.password ? 'border-red-500 focus:border-red-500' : 'border-gray-800 focus:border-emergency'} rounded-xl py-4 pl-12 pr-4 text-white outline-none transition`} />
            </div>
            {errors.password && <p className="text-red-500 text-xs mt-1 ml-2">{errors.password}</p>}
          </div>

          <div>
            <div className="relative">
              <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${errors.confirmPassword ? 'text-red-500' : 'text-gray-500'}`} />
              <input type="password" name="confirmPassword" placeholder="Confirm Password" required value={formData.confirmPassword} onChange={handleChange}
                className={`w-full bg-background border ${errors.confirmPassword ? 'border-red-500 focus:border-red-500' : 'border-gray-800 focus:border-emergency'} rounded-xl py-4 pl-12 pr-4 text-white outline-none transition`} />
            </div>
            {errors.confirmPassword && <p className="text-red-500 text-xs mt-1 ml-2">{errors.confirmPassword}</p>}
          </div>

          <button type="submit" disabled={loading || Object.keys(errors).some(k => errors[k])}
            className="w-full bg-emergency hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition flex items-center justify-center space-x-2 mt-4 shadow-lg shadow-emergency/20">
            {loading ? 'Creating account...' : (
              <>
                <span>Sign Up & Verify</span>
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
