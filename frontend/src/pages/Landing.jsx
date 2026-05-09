import { Link } from 'react-router-dom';
import { Shield, MapPin, Bell, UserCheck } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-white">
      {/* Navbar */}
      <nav className="flex items-center justify-between p-6 max-w-7xl mx-auto">
        <div className="flex items-center space-x-2">
          <Shield className="w-8 h-8 text-emergency" />
          <span className="text-2xl font-bold tracking-tight">SafeHer</span>
        </div>
        <div className="space-x-8 hidden md:flex">
          <a href="#features" className="hover:text-emergency transition">Features</a>
          <a href="#about" className="hover:text-emergency transition">About</a>
          <a href="#contact" className="hover:text-emergency transition">Contact</a>
        </div>
        <div className="space-x-4">
          <Link to="/login" className="px-4 py-2 rounded-lg hover:bg-surface transition">Login</Link>
          <Link to="/register" className="px-6 py-2 bg-gradient-to-r from-primary to-secondary rounded-lg font-semibold hover:opacity-90 transition shadow-lg shadow-primary/20">Get Started</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 pt-20 pb-32 flex flex-col items-center text-center">
        <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight">
          Your Safety, <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Our Priority.</span>
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mb-10">
          AI-powered navigation and real-time emergency response system designed to empower women and ensure safe travels everywhere.
        </p>
        <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-6">
          <Link to="/register" className="px-10 py-4 bg-gradient-to-r from-primary to-secondary rounded-xl text-xl font-bold hover:opacity-90 transition shadow-xl shadow-primary/30">
            Join SafeHer Today
          </Link>
          <button className="px-10 py-4 border border-surface rounded-xl text-xl font-bold hover:bg-surface transition">
            How it Works
          </button>
        </div>
      </main>

      {/* Features */}
      <section id="features" className="bg-surface py-24">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="p-8 bg-background rounded-2xl border border-gray-800 hover:border-emergency transition group">
            <div className="w-14 h-14 bg-emergency/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-emergency/20 transition">
              <Bell className="text-emergency w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold mb-4">Instant SOS</h3>
            <p className="text-gray-400">Trigger immediate alerts to emergency contacts and authorities with your precise location.</p>
          </div>
          <div className="p-8 bg-background rounded-2xl border border-gray-800 hover:border-emergency transition group">
            <div className="w-14 h-14 bg-safety/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-safety/20 transition">
              <MapPin className="text-safety w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold mb-4">Safe Navigation</h3>
            <p className="text-gray-400">AI-driven routes that avoid high-risk areas based on real-time crime data and user reports.</p>
          </div>
          <div className="p-8 bg-background rounded-2xl border border-gray-800 hover:border-emergency transition group">
            <div className="w-14 h-14 bg-blue-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-500/20 transition">
              <UserCheck className="text-blue-500 w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold mb-4">Verified Community</h3>
            <p className="text-gray-400">Join a network of verified users helping each other stay safe through crowdsourced insights.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-gray-800 text-center text-gray-500">
        <p>© 2024 SafeHer Project. Built for Safety, Empowered by AI.</p>
      </footer>
    </div>
  );
}
