import React from 'react';
import { Cloud, HardDrive, Shield, Lock, Film, Image as ImageIcon, Sparkles, Check, ChevronRight, Sun, Moon } from 'lucide-react';

interface LandingPageProps {
  onNavigate: (view: string) => void;
  onOpenLogin: () => void;
  onOpenRegister: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export default function LandingPage({ onNavigate, onOpenLogin, onOpenRegister, theme, onToggleTheme }: LandingPageProps) {
  return (
    <div id="landing-page" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Header */}
      <header id="landing-header" className="max-w-7xl mx-auto w-full px-6 py-5 flex justify-between items-center border-b border-slate-900 sticky top-0 bg-slate-950/80 backdrop-blur-md z-40">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Cloud className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-display font-bold text-xl tracking-tight text-white">ShamCloud</span>
            <span className="text-[10px] text-blue-400 font-mono block leading-none">MEM_VAULT v1.0</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={onToggleTheme}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-900/50 cursor-pointer transition-colors border border-slate-850"
            title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
          </button>
          <button 
            id="btn-nav-login"
            onClick={onOpenLogin}
            className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
          >
            Sign In
          </button>
          <button 
            id="btn-nav-register"
            onClick={onOpenRegister}
            className="text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl transition-all shadow-md shadow-blue-600/10 hover:shadow-blue-600/20 active:scale-95"
          >
            Get Started
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section id="hero-section" className="relative max-w-7xl mx-auto px-6 pt-20 pb-16 text-center">
          {/* Subtle background glow */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

          <div id="badge-pill" className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-slate-800 bg-slate-900/60 text-xs font-medium text-slate-300 mb-6 font-mono">
            <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
            SECURE MEMORY PRESERVATION PLATFORM
          </div>

          <h1 id="hero-display-title" className="font-display text-5xl md:text-7xl font-bold tracking-tight text-white max-w-4xl mx-auto leading-[1.08] mb-6">
            Preserve Your Memories <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-sky-300 bg-clip-text text-transparent">Forever.</span>
          </h1>

          <p id="hero-subtitle" className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto font-light leading-relaxed mb-10">
            A permanent cloud archive for your precious photos and videos. Even if files are deleted from your local device or original Google Photos source, they remain forever safe in ShamCloud storage.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              id="hero-get-started"
              onClick={onOpenRegister}
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 flex items-center justify-center gap-2 group active:scale-98"
            >
              Start Free Vault
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <a
              id="hero-learn-more"
              href="#features-section"
              className="w-full sm:w-auto px-8 py-4 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-white font-medium rounded-xl transition-colors flex items-center justify-center"
            >
              Learn More
            </a>
          </div>

          {/* Device Mockup */}
          <div id="landing-mockup" className="mt-16 border border-slate-850 bg-slate-900/40 p-4 rounded-2xl max-w-5xl mx-auto backdrop-blur-sm relative shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-90 rounded-2xl pointer-events-none z-10" />
            <div className="rounded-xl overflow-hidden border border-slate-800 aspect-[16/9] shadow-inner bg-slate-950 flex flex-col p-4 text-left pointer-events-none">
              <div className="flex justify-between items-center border-b border-slate-900 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                  <span className="text-[11px] text-slate-500 font-mono ml-2">vault.shamcloud.app/dashboard</span>
                </div>
                <div className="h-6 w-32 bg-slate-900 rounded-lg" />
              </div>
              <div className="grid grid-cols-4 gap-4 flex-1">
                <div className="col-span-1 border-r border-slate-900 pr-2 flex flex-col gap-2">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className={`h-8 rounded-lg ${i === 1 ? 'bg-blue-600/10 border border-blue-500/25' : 'bg-slate-900/40'}`} />
                  ))}
                  <div className="mt-auto h-12 bg-slate-900 rounded-lg p-2 flex flex-col justify-center">
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full w-[44%]" />
                    </div>
                    <div className="h-2 w-10 bg-slate-850 mt-1.5 rounded" />
                  </div>
                </div>
                <div className="col-span-3 flex flex-col gap-4">
                  <div className="grid grid-cols-3 gap-2.5">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="bg-slate-900/60 border border-slate-850 h-16 rounded-xl" />
                    ))}
                  </div>
                  <div className="flex-1 bg-slate-900/30 border border-slate-850 rounded-xl p-3 grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                      <div key={i} className="aspect-square bg-slate-850 rounded-lg overflow-hidden relative">
                        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('https://images.unsplash.com/photo-${i === 1 ? '1470071459604-3b5ec3a7fe05' : i === 2 ? '1506744038136-46273834b3fb' : '1518495973542-4542c06a5843'}?q=80&w=150&auto=format&fit=crop')` }} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features-section" className="max-w-7xl mx-auto px-6 py-24 border-t border-slate-900">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-4">
              Engineered for Complete Longevity
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto font-light">
              Every detail is meticulously crafted to ensure your digital asset history is never lost or compromised.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-6 hover:border-slate-800 transition-all hover:bg-slate-900/60">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-5">
                <ImageIcon className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Original Quality Photo Storage</h3>
              <p className="text-slate-400 text-sm font-light leading-relaxed">
                Bit-preset replicas of your raw digital photographs are kept in dedicated redundant disk clusters without any loss of color spaces or resolution.
              </p>
            </div>

            <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-6 hover:border-slate-800 transition-all hover:bg-slate-900/60">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-5">
                <Film className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Immersive Video Archival</h3>
              <p className="text-slate-400 text-sm font-light leading-relaxed">
                Streamlessly upload and play large 4K resolution master files directly state-buffered within any browser tab or mobile interface.
              </p>
            </div>

            <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-6 hover:border-slate-800 transition-all hover:bg-slate-900/60">
              <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-5">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Redundant Protection</h3>
              <p className="text-slate-400 text-sm font-light leading-relaxed">
                Files are stored independently from source libraries like Google Photos. Deleting files from external sources keeps them safe inside your ShamCloud vault.
              </p>
            </div>
          </div>
        </section>

        {/* Pricing Plan Grid */}
        <section id="pricing-section" className="max-w-7xl mx-auto px-6 py-20 border-t border-slate-900 bg-slate-950 relative">
          <div className="absolute inset-0 bg-blue-600/[0.02] rounded-3xl blur-[80px] pointer-events-none" />
          
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-4">
              Select Your Memory Tier
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto font-light">
              Get started with our free tier or upgrade seamlessly to expand up to massive terabytes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Tier */}
            <div className="bg-slate-900/30 border border-slate-850 rounded-3xl p-8 flex flex-col relative justify-between">
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Free Memory Vault</h3>
                <p className="text-slate-400 text-sm font-light mb-6">Fully integrated basic digital protection.</p>
                <div className="text-3xl font-bold text-white mb-6">
                  $0 <span className="text-sm font-normal text-slate-500">/ forever</span>
                </div>

                <hr className="border-slate-850 mb-6" />

                <ul className="flex flex-col gap-3.5 mb-8">
                  <li className="flex items-center gap-3 text-sm text-slate-300">
                    <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                      <Check className="w-3 h-3" />
                    </div>
                    5 GB High-Redundancy Storage Limit
                  </li>
                  <li className="flex items-center gap-3 text-sm text-slate-300">
                    <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                      <Check className="w-3 h-3" />
                    </div>
                    Unlimited Photo & Video Uploads
                  </li>
                  <li className="flex items-center gap-3 text-sm text-slate-300">
                    <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                      <Check className="w-3 h-3" />
                    </div>
                    Album Organization Folders
                  </li>
                </ul>
              </div>

              <button
                onClick={onOpenRegister}
                className="w-full py-3 bg-slate-800 hover:bg-slate-750 text-white font-medium rounded-xl transition-all"
              >
                Sign Up For Free
              </button>
            </div>

            {/* Premium Archive */}
            <div className="bg-slate-900/60 border-2 border-blue-500/40 rounded-3xl p-8 flex flex-col relative justify-between shadow-xl shadow-blue-500/5">
              <div className="absolute -top-3.5 right-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-mono tracking-widest px-3 py-1.5 rounded-full font-bold">
                MOST POPULAR
              </div>
              
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Premium Archive Ultimate</h3>
                <p className="text-slate-400 text-sm font-light mb-6">Redundant memory protection for creators & families.</p>
                <div className="text-3xl font-bold text-white mb-6">
                  $12.99 <span className="text-sm font-normal text-slate-500">/ month</span>
                </div>

                <hr className="border-slate-850 mb-6" />

                <ul className="flex flex-col gap-3.5 mb-8">
                  <li className="flex items-center gap-3 text-sm text-slate-200">
                    <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
                      <Check className="w-3 h-3" />
                    </div>
                    1 TB Secure Cloud storage (Reclaimable)
                  </li>
                  <li className="flex items-center gap-3 text-sm text-slate-200">
                    <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
                      <Check className="w-3 h-3" />
                    </div>
                    Ultra-fast server video transcode & buffering
                  </li>
                  <li className="flex items-center gap-3 text-sm text-slate-200">
                    <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
                      <Check className="w-3 h-3" />
                    </div>
                    Google Photos automated background importer
                  </li>
                  <li className="flex items-center gap-3 text-sm text-slate-200">
                    <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
                      <Check className="w-3 h-3" />
                    </div>
                    Priority administrative VIP customer support
                  </li>
                </ul>
              </div>

              <button
                onClick={onOpenRegister}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium rounded-xl transition-all shadow-md shadow-blue-600/10 active:scale-98"
              >
                Get Premium Vault
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer id="landing-footer" className="bg-slate-950 py-10 px-6 border-t border-slate-900 max-w-7xl mx-auto w-full flex flex-col md:flex-row justify-between items-center gap-6">
        <p className="text-slate-500 text-xs font-mono">&copy; 2026 ShamCloud Inc. All rights reserved.</p>
        <div className="flex gap-6 text-xs text-slate-500 font-mono">
          <a href="#" className="hover:text-slate-300">Security Audit</a>
          <a href="#" className="hover:text-slate-300">PostgreSQL Status</a>
          <a href="#" className="hover:text-slate-300">Term of Service</a>
        </div>
      </footer>
    </div>
  );
}
