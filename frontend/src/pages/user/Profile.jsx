import { useState, useEffect } from 'react';
import { User, Mail, Phone, Shield, Plus, Trash2, Save } from 'lucide-react';
import api from '../../api/axios';

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/auth/profile');
        setProfile(res.data);
      } catch (err) {
        console.error('Failed to fetch profile', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  if (loading) return <div className="text-gray-500 animate-pulse">Loading profile...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="bg-surface p-8 rounded-3xl border border-gray-800 shadow-xl">
        <div className="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-10">
          <div className="w-32 h-32 bg-emergency rounded-3xl flex items-center justify-center text-4xl font-bold shadow-2xl shadow-emergency/30">
            {profile.name.charAt(0)}
          </div>
          <div className="flex-1 space-y-4">
            <h2 className="text-3xl font-bold">{profile.name}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3 text-gray-400">
                <Mail className="w-5 h-5 text-emergency" />
                <span>{profile.email}</span>
              </div>
              <div className="flex items-center space-x-3 text-gray-400">
                <Phone className="w-5 h-5 text-emergency" />
                <span>{profile.phone}</span>
              </div>
              <div className="flex items-center space-x-3 text-gray-400">
                <Shield className="w-5 h-5 text-emergency" />
                <span className="capitalize">{profile.role} Account</span>
              </div>
            </div>
          </div>
          <button className="bg-background border border-gray-700 px-6 py-2 rounded-xl hover:bg-gray-800 transition">
            Edit Profile
          </button>
        </div>
      </div>

      <div className="bg-surface p-8 rounded-3xl border border-gray-800 shadow-xl">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-xl font-bold">Emergency Contacts</h3>
          <button className="flex items-center space-x-2 text-emergency font-bold hover:underline">
            <Plus className="w-5 h-5" />
            <span>Add Contact</span>
          </button>
        </div>
        
        <div className="space-y-4">
          {profile.emergency_contacts && profile.emergency_contacts.length > 0 ? (
            profile.emergency_contacts.map((contact, i) => (
              <div key={i} className="bg-background p-4 rounded-2xl flex items-center justify-between border border-gray-800 hover:border-gray-700 transition">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center text-sm font-bold">
                    {contact.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold">{contact.name}</p>
                    <p className="text-xs text-gray-500">{contact.phone} • {contact.relation}</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button className="p-2 text-gray-500 hover:text-white transition">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center py-10 text-gray-500 italic bg-background rounded-2xl border border-dashed border-gray-800">
              No emergency contacts added yet. Please add at least one for your safety.
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-end space-x-4">
        <button className="px-8 py-3 bg-emergency rounded-xl font-bold shadow-lg shadow-emergency/20 hover:bg-red-600 transition flex items-center space-x-2">
          <Save className="w-5 h-5" />
          <span>Save All Changes</span>
        </button>
      </div>
    </div>
  );
}
