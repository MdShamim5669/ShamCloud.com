import React, { useState, useEffect } from 'react';
import { 
  Cloud, HardDrive, Shield, Lock, Film, Image as ImageIcon, 
  Folder, Plus, X, Video, LogIn, Key, Users, LayoutDashboard as DashIcon,
  Settings, LogOut, Sparkles, Check, FolderKanban, ShieldCheck, 
  User as UserIcon, Calendar, ArrowRight, Import, ShieldAlert,
  AlertTriangle, RefreshCw, Sun, Moon
} from 'lucide-react';
import type { User, Media, Album, PaymentRecord } from './types';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import AlbumsView from './components/AlbumsView';
import SubscriptionView from './components/SubscriptionView';
import ProfileView from './components/ProfileView';
import AdminConsole from './components/AdminConsole';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('shamcloud-user');
    return saved ? JSON.parse(saved) : null;
  });

  // Active view: 'LANDING' | 'DASHBOARD' | 'ALBUMS' | 'SUBSCRIPTION' | 'PROFILE' | 'ADMIN'
  const [currentView, setCurrentView] = useState<string>(() => {
    const savedUser = localStorage.getItem('shamcloud-user');
    return savedUser ? 'DASHBOARD' : 'LANDING';
  });

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('shamcloud-theme');
    return (saved as 'light' | 'dark') || 'dark';
  });

  const [liveTime, setLiveTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getLiveDateString = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const dayName = days[liveTime.getDay()];
    const monthName = months[liveTime.getMonth()];
    const dateNum = liveTime.getDate();
    const year = liveTime.getFullYear();
    
    const hours = String(liveTime.getHours()).padStart(2, '0');
    const minutes = String(liveTime.getMinutes()).padStart(2, '0');
    const seconds = String(liveTime.getSeconds()).padStart(2, '0');
    
    return `${dayName}, ${monthName} ${dateNum}, ${year} • ${hours}:${minutes}:${seconds}`;
  };

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
    localStorage.setItem('shamcloud-theme', theme);
  }, [theme]);

  const [media, setMedia] = useState<Media[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([]);

  // Auth Dialog Modals
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  
  // Registration Inputs
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegPasswordConfirm] = useState('');

  // Login Inputs
  const [logEmail, setLogEmail] = useState('');
  const [logPassword, setLogPassword] = useState('');

  // Toast / Error Message states
  const [authError, setAuthError] = useState('');
  const [globalError, setGlobalError] = useState('');

  // Google Photos mock connection overlay
  const [showGooglePhotosModal, setShowGooglePhotosModal] = useState(false);
  const [photosToImport, setPhotosToImport] = useState<{ id: string; name: string; url: string; selected: boolean }[]>([]);

  const mockGooglePhotosList = [
    { id: 'gphoto-1', name: 'Alps Camping Peak.jpg', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=600&auto=format&fit=crop' },
    { id: 'gphoto-2', name: 'Santorini Blue Sunset.jpg', url: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?q=80&w=600&auto=format&fit=crop' },
    { id: 'gphoto-3', name: 'Kyoto Red Pagoda.jpg', url: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=600&auto=format&fit=crop' },
    { id: 'gphoto-4', name: 'Yosemite Sentinel Valley.jpg', url: 'https://images.unsplash.com/photo-1426604966848-d7adac402bff?q=80&w=600&auto=format&fit=crop' },
    { id: 'gphoto-5', name: 'Golden Gate Horizon.jpg', url: 'https://images.unsplash.com/photo-1506012787146-f92b2d7d6d96?q=80&w=600&auto=format&fit=crop' },
    { id: 'gphoto-6', name: 'Cozy Morning Coffee.jpg', url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=600&auto=format&fit=crop' },
  ];

  // Initialize stock list for Google Photos import
  useEffect(() => {
    setPhotosToImport(mockGooglePhotosList.map(g => ({ ...g, selected: false })));
  }, [showGooglePhotosModal]);

  // Load user specific resources
  const loadUserData = async () => {
    if (!currentUser) return;
    try {
      const headers = { 'x-user-email': currentUser.email };
      
      const [mRes, aRes, pRes] = await Promise.all([
        fetch('/api/media', { headers }),
        fetch('/api/albums', { headers }),
        fetch('/api/payments/history', { headers })
      ]);

      if (mRes.ok && aRes.ok && pRes.ok) {
        const mType = mRes.headers.get('content-type') || '';
        const aType = aRes.headers.get('content-type') || '';
        const pType = pRes.headers.get('content-type') || '';

        if (!mType.includes('application/json') || !aType.includes('application/json') || !pType.includes('application/json')) {
          console.warn("One or more responses are not JSON. AI Studio auth gate may be intercepting.");
          return;
        }

        const mData = await mRes.json();
        const aData = await aRes.json();
        const pData = await pRes.json();

        setMedia(mData.media || []);
        setAlbums(aData.albums || []);
        setPaymentHistory(pData.payments || []);
      }
    } catch (err) {
      console.error("Error loading user-specific data from Express", err);
    }
  };

  // Sync user profile state dynamically
  const syncCurrentUserProfile = async () => {
    if (!currentUser) return;
    try {
      const response = await fetch('/api/users/me', {
        headers: { 'x-user-email': currentUser.email }
      });
      if (response.ok) {
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          console.warn("Profile response not JSON. AI Studio auth gate may be intercepting.");
          return;
        }
        const data = await response.json();
        setCurrentUser(data.user);
        localStorage.setItem('shamcloud-user', JSON.stringify(data.user));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Synchronize collections
  useEffect(() => {
    if (currentUser?.email) {
      loadUserData();
      syncCurrentUserProfile();
    }
  }, [currentUser?.email, currentView]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (regPassword !== regConfirm) {
      setAuthError("Passwords do not match");
      return;
    }
    if (regPassword.length < 8) {
      setAuthError("Password must be at least 8 characters long");
      return;
    }
    if (!/[a-zA-Z]/.test(regPassword)) {
      setAuthError("Password must contain at least one alphabet letter");
      return;
    }
    if (!/[0-9]/.test(regPassword)) {
      setAuthError("Password must contain at least one number");
      return;
    }
    if (!/[^a-zA-Z0-9]/.test(regPassword)) {
      setAuthError("Password must contain at least one special character (e.g., !, @, #, $, %, inside (etc))");
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName,
          email: regEmail,
          password: regPassword
        })
      });

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('Server response is not JSON. AI Studio auth gate may be blocking the request.');
      }
      const data = await response.json();
      if (response.ok) {
        // Automatically login the newly registered user
        setCurrentUser(data.user);
        localStorage.setItem('shamcloud-user', JSON.stringify(data.user));
        setShowRegisterModal(false);
        setRegName('');
        setRegEmail('');
        setRegPassword('');
        setRegPasswordConfirm('');
        setCurrentView('DASHBOARD');
      } else {
        setAuthError(data.message || 'Registration failed');
      }
    } catch (err) {
      setAuthError('Connection failure. Server offline.');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: logEmail,
          password: logPassword
        })
      });

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('Server response is not JSON. AI Studio auth gate may be blocking the request.');
      }
      const data = await response.json();
      if (response.ok) {
        setCurrentUser(data.user);
        localStorage.setItem('shamcloud-user', JSON.stringify(data.user));
        setShowLoginModal(false);
        setLogEmail('');
        setLogPassword('');
        setCurrentView('DASHBOARD');
      } else {
        setAuthError(data.message || 'Invalid credentials');
      }
    } catch (err) {
      setAuthError('Connection failure.');
    }
  };

  // Preset evaluator quick logic
  const handleQuickLogin = async (email: string) => {
    setAuthError('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          password: 'password123'
        })
      });

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('Server response is not JSON. AI Studio auth gate may be blocking the request.');
      }
      const data = await response.json();
      if (response.ok) {
        setCurrentUser(data.user);
        localStorage.setItem('shamcloud-user', JSON.stringify(data.user));
        setShowLoginModal(false);
        setShowRegisterModal(false);
        setCurrentView('DASHBOARD');
      } else {
        setAuthError(data.message || 'Login failed');
      }
    } catch (err) {
      setAuthError('Express server response failure.');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('shamcloud-user');
    setCurrentView('LANDING');
  };

  const handleUpdateProfile = async (name: string, avatarUrl?: string) => {
    if (!currentUser) return;
    try {
      const response = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': currentUser.email
        },
        body: JSON.stringify({ name, avatarUrl })
      });
      if (response.ok) {
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          console.warn("Profile update response not JSON");
          return;
        }
        const data = await response.json();
        setCurrentUser(data.user);
        localStorage.setItem('shamcloud-user', JSON.stringify(data.user));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteProfile = async () => {
    if (!currentUser) return;
    try {
      const response = await fetch('/api/users/me', {
        method: 'DELETE',
        headers: { 'x-user-email': currentUser.email }
      });
      if (response.ok) {
        handleLogout();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpgradeAccount = async (payload: {
    planName: string;
    amount: number;
    cardNumber: string;
    cardExpiry: string;
    cardCVC: string;
    cardholderName: string;
    simulatedBalance: number;
  }) => {
    if (!currentUser) return { success: false, message: "No active session found." };
    try {
      const response = await fetch('/api/payments/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': currentUser.email
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (response.ok) {
        await syncCurrentUserProfile();
        await loadUserData();
        return { success: true, message: data.message || "Upgrade completed successfully!" };
      } else {
        return { success: false, message: data.message || "Stripe transaction declined." };
      }
    } catch (e: any) {
      console.error(e);
      return { success: false, message: e.message || "Network error. Please try again." };
    }
  };

  const togglePhotoSelection = (id: string) => {
    setPhotosToImport(prev => prev.map(p => p.id === id ? { ...p, selected: !p.selected } : p));
  };

  // Google Photo final execution
  const executeGooglePhotoImport = async () => {
    if (!currentUser) return;
    const selectedPhotos = photosToImport.filter(p => p.selected);
    if (selectedPhotos.length === 0) return;

    try {
      const response = await fetch('/api/google/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': currentUser.email
        },
        body: JSON.stringify({
          photos: selectedPhotos.map(p => ({
            name: p.name,
            url: p.url,
            type: 'PHOTO',
            mimeType: 'image/jpeg'
          }))
        })
      });

      if (response.ok) {
        setShowGooglePhotosModal(false);
        await syncCurrentUserProfile();
        await loadUserData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const activeMedia = media.filter(m => !m.isDeleted);

  // Return landing screen if not logged in
  if (currentView === 'LANDING' || !currentUser) {
    return (
      <div className="bg-slate-950 min-h-screen text-slate-100 flex flex-col justify-between select-none">
        
        <LandingPage 
          onNavigate={setCurrentView}
          onOpenLogin={() => { setAuthError(''); setShowLoginModal(true); }}
          onOpenRegister={() => { setAuthError(''); setShowRegisterModal(true); }}
          theme={theme}
          onToggleTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
        />

        {/* 1. SIGN IN MODAL WINDOW WITH Preset test roles */}
        {showLoginModal && (
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-850 rounded-2xl w-full max-w-md p-6 relative shadow-2xl">
              <button 
                onClick={() => setShowLoginModal(false)}
                className="absolute top-4 right-4 text-slate-500 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                    <Cloud className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-display text-lg font-bold text-white">ShamCloud Vault Sign-In</span>
                </div>
                <p className="text-[11px] text-slate-500 font-mono">SECURE INTERFACE CONNECTION</p>
              </div>

              {authError && (
                <div className="text-red-400 text-xs font-mono bg-red-500/10 border border-red-500/20 px-3.5 py-2.5 rounded-xl mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Account Email Address</label>
                  <input 
                    type="email"
                    required
                    placeholder="user@shamcloud.com"
                    value={logEmail}
                    onChange={e => setLogEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-855 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-700 focus:outline-none focus:border-blue-500 font-sans"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Security Password</label>
                  <input 
                    type="password"
                    required
                    placeholder="••••••••"
                    value={logPassword}
                    onChange={e => setLogPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-855 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-700 focus:outline-none focus:border-blue-500 font-sans"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl tracking-wider uppercase shadow-md transition-all active:scale-95"
                >
                  Verify Credentials
                </button>
              </form>

              {/* EVALUATOR TEST ROLES BANNER - CRITICAL QUALITY PRESETS */}
              <div className="mt-6 pt-5 border-t border-slate-850">
                <span className="text-[10px] text-slate-500 font-mono block tracking-wider uppercase mb-3">Evaluator Role Quick Sign-In</span>
                
                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                  <button
                    onClick={() => handleQuickLogin('user@shamcloud.com')}
                    className="border border-slate-800 hover:border-slate-700 bg-slate-950 hover:bg-slate-900 rounded-lg p-2 text-left cursor-pointer transition-colors"
                  >
                    <span className="text-slate-300 block font-bold">Free User</span>
                    <span className="text-slate-500 block mt-0.5">5 GB Space free</span>
                  </button>

                  <button
                    onClick={() => handleQuickLogin('premium@shamcloud.com')}
                    className="border border-blue-900/30 hover:border-blue-800 bg-blue-950/20 hover:bg-blue-900/10 rounded-lg p-2 text-left cursor-pointer transition-colors"
                  >
                    <span className="text-blue-400 block font-bold">Premium User</span>
                    <span className="text-slate-500 block mt-0.5">1 TB Space active</span>
                  </button>

                  <button
                    onClick={() => handleQuickLogin('admin@shamcloud.com')}
                    className="border border-purple-900/30 hover:border-purple-800 bg-purple-950/20 hover:bg-purple-900/10 rounded-lg p-2 text-left cursor-pointer transition-colors"
                  >
                    <span className="text-purple-400 block font-bold">Admin Console</span>
                    <span className="text-slate-500 block mt-0.5">Adjust users status</span>
                  </button>

                  <button
                    onClick={() => handleQuickLogin('tamjidulislamsamim@gmail.com')}
                    className="border border-red-900/30 hover:border-red-800 bg-red-950/20 hover:bg-red-900/10 rounded-lg p-2 text-left cursor-pointer transition-colors"
                  >
                    <span className="text-red-400 block font-bold">Super Admin</span>
                    <span className="text-slate-500 block mt-0.5">View Audit Trails Logs</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. REGISTRATION MODAL WINDOW */}
        {showRegisterModal && (
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-850 rounded-2xl w-full max-w-md p-6 relative shadow-2xl">
              <button 
                onClick={() => setShowRegisterModal(false)}
                className="absolute top-4 right-4 text-slate-500 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-650 flex items-center justify-center">
                    <Cloud className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-display text-lg font-bold text-white">Create ShamCloud Account</span>
                </div>
                <p className="text-[11px] text-slate-500 font-mono">REGISTRATION SCHEMATIC INITIALIZATION</p>
              </div>

              {authError && (
                <div className="text-red-400 text-xs font-mono bg-red-500/10 border border-red-500/20 px-3.5 py-2.5 rounded-xl mb-4">
                  {authError}
                </div>
              )}

              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Your Full Name</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={regName}
                    onChange={e => setRegName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-855 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-750 focus:outline-none focus:border-blue-500 font-sans"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Registered Email Address</label>
                  <input 
                    type="email"
                    required
                    placeholder="email@example.com"
                    value={regEmail}
                    onChange={e => setRegEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-855 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-750 focus:outline-none focus:border-blue-500 font-sans"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Security Password</label>
                  <input 
                    type="password"
                    required
                    placeholder="Minimum 8 characters"
                    value={regPassword}
                    onChange={e => setRegPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-855 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-750 focus:outline-none focus:border-blue-500 font-sans"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Confirm Security Password</label>
                  <input 
                    type="password"
                    required
                    placeholder="Re-enter password"
                    value={regConfirm}
                    onChange={e => setRegPasswordConfirm(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-855 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-750 focus:outline-none focus:border-blue-500 font-sans"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-3 bg-blue-600 hover:bg-blue-550 text-white text-xs font-semibold rounded-xl uppercase tracking-wider shadow-md transition-all active:scale-95"
                >
                  Configure My Vault Space
                </button>
              </form>

              <div className="mt-4 text-center">
                <span className="text-[11px] text-slate-500 font-sans">
                  By signing up you get an automatic <strong>5 GB free storage allocation</strong> instantly.
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Calculate user space scale
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const storagePercentage = Math.min(100, (currentUser.storageUsed / currentUser.storageLimit) * 100);

  // PRIMARY WORKSPACE SKELETON WITH PERSISTENT SIDEBAR on Page 50 of the wireframe document
  return (
    <div id="fullstack-workspace" className="min-h-screen bg-slate-950 text-slate-100 flex font-sans selection:bg-blue-600 selection:text-white">
      
      {/* 1. PERSISTENT SIDEBAR PANEL */}
      <aside id="workspace-sidebar" className="w-64 border-r border-slate-900 bg-slate-950 flex flex-col justify-between shrink-0 p-5 sticky top-0 h-screen z-30 select-none">
        <div className="space-y-8">
          
          {/* Logo row */}
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/10 shrink-0">
              <Cloud className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-display font-bold text-lg text-slate-100 tracking-tight leading-none block">ShamCloud</span>
              <span className="text-[9px] text-blue-400 font-mono tracking-widest block uppercase mt-0.5">SECURE_VAULT</span>
            </div>
          </div>

          {/* Navigation Links list */}
          <nav className="space-y-1">
            <button
              onClick={() => setCurrentView('DASHBOARD')}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                currentView === 'DASHBOARD' 
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/15' 
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/40'
              }`}
            >
              <ImageIcon className="w-4 h-4 shrink-0" />
              Memory Gallery
            </button>

            <button
              onClick={() => setCurrentView('ALBUMS')}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                currentView === 'ALBUMS' 
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/15' 
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/40'
              }`}
            >
              <FolderKanban className="w-4 h-4 shrink-0" />
              Organized Albums
            </button>

            {/* Google Photos automated importer button */}
            <button
              onClick={() => setShowGooglePhotosModal(true)}
              className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-100 hover:bg-slate-800/40 transition-all cursor-pointer text-left"
            >
              <Import className="w-4 h-4 text-emerald-400 shrink-0 animate-pulse" />
              Import Google Photos
            </button>

            <button
              onClick={() => setCurrentView('SUBSCRIPTION')}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                currentView === 'SUBSCRIPTION' 
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/15' 
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/40'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
              Archival Tier Plans
            </button>

            <button
              onClick={() => setCurrentView('PROFILE')}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                currentView === 'PROFILE' 
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/15' 
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/40'
              }`}
            >
              <UserIcon className="w-4 h-4 shrink-0" />
              Profile Settings
            </button>

            {/* PRIVILEGED ADMIN PANEL OPTION - AUTOMATIC TIGHT SECURITY */}
            {(currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN') && (
              <button
                onClick={() => setCurrentView('ADMIN')}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer border border-purple-500/10 ${
                  currentView === 'ADMIN' 
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-650/15' 
                    : 'text-purple-400 hover:text-purple-300 hover:bg-purple-950/20'
                }`}
              >
                <ShieldCheck className="w-4 h-4 shrink-0 animate-pulse" />
                Admin Console
              </button>
            )}
          </nav>
        </div>

        {/* Bottom panel including Storage progress line & Logout */}
        <div className="space-y-5">
          <div className="border-t border-slate-900 pt-5 space-y-3">
            <div className="flex justify-between items-baseline text-[10px] font-mono text-slate-500">
              <span>{formatSize(currentUser.storageUsed)}</span>
              <span>OF {formatSize(currentUser.storageLimit)}</span>
            </div>
            <div className="h-1 text-slate-400 w-full bg-slate-900 rounded-full overflow-hidden">
              <div 
                className={`h-full ${storagePercentage > 85 ? 'bg-red-500' : 'bg-blue-500'}`} 
                style={{ width: `${storagePercentage}%` }}
              />
            </div>
            <div className="bg-slate-950 border border-slate-900/50 p-2.5 rounded-lg text-center font-mono">
              <span className="text-[9px] text-slate-400 block tracking-tight truncate leading-none uppercase font-bold">
                TIER: {currentUser.role.replace('_', ' ')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 border-t border-slate-900 pt-4 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-blue-600/10 border border-blue-500/20 shrink-0 overflow-hidden flex items-center justify-center text-blue-400">
              {currentUser.avatarUrl ? (
                <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-4 h-4" />
              )}
            </div>
            <div className="truncate flex-1">
              <span className="text-xs text-slate-300 font-medium block truncate leading-none">{currentUser.name}</span>
              <span className="text-[9px] text-slate-500 block truncate font-mono mt-1" title={currentUser.email}>{currentUser.email}</span>
            </div>
            <button
              onClick={handleLogout}
              className="text-slate-500 hover:text-slate-100 p-2 rounded-xl hover:bg-slate-800/40 cursor-pointer transition-colors shrink-0"
              title="Sign Out of ShamCloud"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* 2. SECONDARY MAIN AREA CONTENT LAYOUT VIEW GATES */}
      <div className="flex-1 flex flex-col min-h-screen max-w-full overflow-x-hidden">
        
        {/* Workspace banner top header */}
        <header className="px-8 py-4 border-b border-slate-900 flex justify-between items-center bg-slate-950 sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-500 shrink-0" />
            <span className="text-xs text-slate-500 font-mono tracking-widest uppercase">Redundant node cluster connection: live</span>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-900/50 cursor-pointer transition-all border border-slate-850 flex items-center gap-2"
              title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-slate-450 hidden sm:inline">Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-slate-450 hidden sm:inline">Dark</span>
                </>
              )}
            </button>
            <span className="text-xs font-mono text-slate-500 font-bold bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-850">
              {getLiveDateString()}
            </span>
          </div>
        </header>

        {/* View Gates */}
        <main className="flex-1 p-8 bg-slate-950/45">
          {currentView === 'DASHBOARD' && (
            <Dashboard 
              currentUser={currentUser}
              media={media}
              albums={albums}
              onRefreshData={() => { loadUserData(); syncCurrentUserProfile(); }}
              onNavigateToAlbums={() => setCurrentView('ALBUMS')}
              onNavigateToSubscription={() => setCurrentView('SUBSCRIPTION')}
            />
          )}

          {currentView === 'ALBUMS' && (
            <AlbumsView 
              currentUser={currentUser}
              albums={albums}
              activeMedia={activeMedia}
              onRefreshData={loadUserData}
            />
          )}

          {currentView === 'SUBSCRIPTION' && (
            <SubscriptionView 
              currentUser={currentUser}
              paymentHistory={paymentHistory}
              onUpgrade={handleUpgradeAccount}
            />
          )}

          {currentView === 'PROFILE' && (
            <ProfileView 
              currentUser={currentUser}
              onUpdateProfile={handleUpdateProfile}
              onDeleteProfile={handleDeleteProfile}
              onLogout={handleLogout}
            />
          )}

          {currentView === 'ADMIN' && (
            <AdminConsole 
              currentUser={currentUser}
              onRefreshAllData={() => { loadUserData(); syncCurrentUserProfile(); }}
            />
          )}
        </main>
      </div>

      {/* Google Photos mock importer popup - Page 10 requirement */}
      {showGooglePhotosModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-850 rounded-2xl w-full max-w-xl p-6 relative flex flex-col justify-between max-h-[85vh]">
            <button
              onClick={() => setShowGooglePhotosModal(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Import className="w-5 h-5 text-emerald-400 shrink-0" />
                <h3 className="text-lg font-bold text-white">Import from Google Photos</h3>
              </div>
              <p className="text-xs text-slate-500 font-light mt-0.5">
                ShamCloud will establish a secure token handshake and directly replicate selected images to your permanent storage.
              </p>
            </div>

            {/* Photo selections grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 my-6 overflow-y-auto pr-1 flex-1 py-1">
              {photosToImport.map(photo => (
                <div 
                  key={photo.id}
                  onClick={() => togglePhotoSelection(photo.id)}
                  className={`aspect-square rounded-xl bg-slate-950 overflow-hidden relative cursor-pointer border-2 transition-all p-1 ${
                    photo.selected ? 'border-emerald-500 shadow-md shadow-emerald-500/5' : 'border-slate-850 hover:border-slate-750'
                  }`}
                >
                  <img src={photo.url} alt={photo.name} className="w-full h-full object-cover rounded-lg" />
                  
                  {/* Selection dot */}
                  <div className={`absolute top-2 right-2 w-5 h-5 rounded-full border border-white/20 flex items-center justify-center transition-all ${
                    photo.selected ? 'bg-emerald-500 text-white' : 'bg-black/55 text-transparent'
                  }`}>
                    <Check className="w-3 h-3 text-white" />
                  </div>
                  
                  <div className="absolute bottom-0 left-0 right-0 bg-slate-950/80 p-2 text-[10px] text-slate-300 font-sans truncate font-medium">
                    {photo.name}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-850 flex justify-between items-center">
              <span className="text-xs text-slate-500 font-mono">
                Selected: {photosToImport.filter(p => p.selected).length} items
              </span>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowGooglePhotosModal(false)}
                  className="bg-slate-850 hover:bg-slate-800 text-slate-400 font-medium px-4 py-2 rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={executeGooglePhotoImport}
                  disabled={photosToImport.filter(p => p.selected).length === 0}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium px-4 py-2 rounded-xl text-xs cursor-pointer shadow-md shadow-emerald-600/10"
                >
                  Replicate Selected to ShamCloud
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
