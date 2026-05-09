import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Mail, Lock, ArrowRight, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import api from '../api/axios';

export default function ForgotPassword() {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP & New Password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const navigate = useNavigate();

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await api.post('/auth/forgot-password', { email });
      setSuccess('OTP sent to your email (if registered).');
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to request password reset.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await api.post('/auth/reset-password', { email, otp, new_password: newPassword });
      setSuccess('Password reset successfully! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password. Check your OTP and new password requirements.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center px-6 py-12">
      <Link to="/" className="flex items-center space-x-2 mb-8 group">
        <Shield className="w-10 h-10 text-primary group-hover:scale-110 transition" />
        <span className="text-3xl font-bold tracking-tight text-white">SafeHer</span>
      </Link>

      <div className="w-full max-w-md bg-surface p-10 rounded-3xl shadow-2xl border border-gray-800">
        <h2 className="text-3xl font-bold text-white mb-2">Reset Password</h2>
        <p className="text-gray-400 mb-6">
          {step === 1 ? "Enter your email to receive a reset code." : "Enter the code and your new password."}
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl mb-6 text-sm flex items-start">
            <AlertCircle className="w-5 h-5 mr-2 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-green-500/10 border border-green-500/50 text-green-500 p-4 rounded-xl mb-6 text-sm flex items-start">
            <CheckCircle className="w-5 h-5 mr-2 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleSendOTP} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
              <input
                type="email"
                placeholder="Email Address"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-background border border-gray-800 rounded-xl py-4 pl-12 pr-4 text-white focus:border-primary outline-none transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-purple-600 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition flex items-center justify-center space-x-2 shadow-lg shadow-primary/20"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <><span>Send Reset Code</span><ArrowRight className="w-5 h-5" /></>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="relative">
              <input
                type="text"
                placeholder="6-Digit OTP"
                required
                maxLength="6"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-background border border-gray-800 rounded-xl py-4 px-4 text-center tracking-[0.5em] text-white focus:border-primary outline-none transition"
              />
            </div>
            
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
              <input
                type="password"
                placeholder="New Password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-background border border-gray-800 rounded-xl py-4 pl-12 pr-4 text-white focus:border-primary outline-none transition"
              />
            </div>
            <p className="text-xs text-gray-500">Must be 8+ chars, with upper, lower, number, and special char.</p>

            <button
              type="submit"
              disabled={loading || otp.length !== 6 || newPassword.length < 8}
              className="w-full bg-primary hover:bg-purple-600 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition flex items-center justify-center space-x-2 shadow-lg shadow-primary/20"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <><span>Reset Password</span><ArrowRight className="w-5 h-5" /></>
              )}
            </button>
          </form>
        )}

        <p className="mt-8 text-center text-gray-500">
          Remembered your password? <Link to="/login" className="text-primary hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
