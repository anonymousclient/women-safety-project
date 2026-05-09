import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Shield, Mail, Phone, ArrowRight, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import api from '../api/axios';
import { auth } from '../firebase';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';

export default function OTPVerification() {
  const [method, setMethod] = useState('email'); // 'email' or 'phone'
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [showSMSInput, setShowSMSInput] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;
  const phone = location.state?.phone;

  useEffect(() => {
    if (!email) {
      navigate('/login');
    }
    
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown(c => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [email, navigate, cooldown]);

  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
        'callback': (response) => {
          console.log("Recaptcha verified");
        }
      });
    }
  };

  const sendEmailOTP = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await api.post('/otp/send-email');
      setSuccess('OTP sent to your email.');
      setCooldown(60);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await api.post('/otp/verify-email', { otp });
      setSuccess('Email verified successfully!');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Verification failed. Invalid OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendSMS = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      setupRecaptcha();
      const appVerifier = window.recaptchaVerifier;
      
      // Phone must be in E.164 format (e.g., +911234567890)
      // Assuming Indian number if not specified, or user provides prefix
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
      
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(confirmation);
      setShowSMSInput(true);
      setSuccess('SMS code sent to your phone.');
      setCooldown(60);
    } catch (err) {
      console.error(err);
      setError('Failed to send SMS. Make sure your Phone Number is correct and Firebase is configured.');
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySMS = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await confirmationResult.confirm(otp);
      const idToken = await result.user.getIdToken();
      
      // Send Firebase token to backend to mark phone as verified
      await api.post('/otp/verify-phone', { firebase_token: idToken });
      
      setSuccess('Phone verified successfully!');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      console.error(err);
      setError('Invalid SMS code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!email) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center px-6 py-12">
      <Link to="/" className="flex items-center space-x-2 mb-8 group">
        <Shield className="w-10 h-10 text-primary group-hover:scale-110 transition" />
        <span className="text-3xl font-bold tracking-tight text-white">SafeHer</span>
      </Link>

      <div className="w-full max-w-md bg-surface p-10 rounded-3xl shadow-2xl border border-gray-800">
        <h2 className="text-3xl font-bold text-white mb-2">Verify Account</h2>
        <p className="text-gray-400 mb-6">Choose a method to verify your identity.</p>

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

        <div className="flex bg-background p-1 rounded-xl mb-8">
          <button
            onClick={() => { setMethod('email'); setShowSMSInput(false); setOtp(''); }}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition flex items-center justify-center space-x-2 ${method === 'email' ? 'bg-surface text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <Mail className="w-4 h-4" />
            <span>Email</span>
          </button>
          <button
            onClick={() => { setMethod('phone'); setOtp(''); }}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition flex items-center justify-center space-x-2 ${method === 'phone' ? 'bg-surface text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <Phone className="w-4 h-4" />
            <span>SMS</span>
          </button>
        </div>

        {method === 'email' ? (
          <form onSubmit={handleVerifyEmail} className="space-y-4">
            <div className="text-center mb-6">
              <p className="text-sm text-gray-400">We will send a code to:</p>
              <p className="font-semibold text-white">{email}</p>
            </div>
            
            <div className="relative">
              <input
                type="text"
                placeholder="Enter 6-digit code"
                required
                maxLength="6"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-background border border-gray-800 rounded-xl py-4 px-4 text-center text-2xl tracking-[0.5em] text-white focus:border-primary outline-none transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full bg-primary hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition flex items-center justify-center space-x-2 shadow-lg shadow-primary/20"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <><span>Verify Code</span><ArrowRight className="w-5 h-5" /></>
              )}
            </button>
            
            <button 
              type="button" 
              onClick={sendEmailOTP} 
              disabled={loading || cooldown > 0}
              className="w-full py-4 text-gray-400 hover:text-white disabled:opacity-50 transition text-sm font-semibold"
            >
              {cooldown > 0 ? `Resend Code in ${cooldown}s` : 'Send Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={showSMSInput ? handleVerifySMS : handleSendSMS} className="space-y-4">
            <div className="text-center mb-6">
              <p className="text-sm text-gray-400">{showSMSInput ? "Enter the code sent to:" : "We will send an SMS to:"}</p>
              <p className="font-semibold text-white">{phone}</p>
            </div>
            
            {showSMSInput ? (
              <div className="relative">
                <input
                  type="text"
                  placeholder="6-digit code"
                  required
                  maxLength="6"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-background border border-gray-800 rounded-xl py-4 px-4 text-center text-2xl tracking-[0.5em] text-white focus:border-primary outline-none transition"
                />
              </div>
            ) : (
              <div id="recaptcha-container"></div>
            )}
            
            <button
              type="submit"
              disabled={loading || (showSMSInput && otp.length !== 6)}
              className="w-full bg-primary hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition flex items-center justify-center space-x-2 shadow-lg shadow-primary/20"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  <span>{showSMSInput ? "Verify SMS" : "Send SMS Code"}</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

            {showSMSInput && (
              <button 
                type="button" 
                onClick={() => setShowSMSInput(false)}
                className="w-full py-2 text-gray-400 hover:text-white transition text-xs"
              >
                Change Method / Resend
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

