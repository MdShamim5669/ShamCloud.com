import React, { useState, useEffect, useRef } from 'react';
import { User as UserIcon, HardDrive, Key, LogOut, CheckCircle2, RefreshCw, Database, Cloud, Clipboard, Check, AlertCircle, ExternalLink, Upload, Image as ImageIcon, Globe } from 'lucide-react';
import type { User } from '../types';

const SUPABASE_DDL = `-- DDL for ShamCloud Supabase Tables
-- Run this in your Supabase SQL Editor and restart the app server!

-- 1. Create table for Users
CREATE TABLE IF NOT EXISTS shamcloud_users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'USER',
  "storageUsed" BIGINT NOT NULL DEFAULT 0,
  "storageLimit" BIGINT NOT NULL,
  "isVerified" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create table for Media
CREATE TABLE IF NOT EXISTS shamcloud_media (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  size BIGINT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "userId" TEXT NOT NULL REFERENCES shamcloud_users(id) ON DELETE CASCADE,
  "isDeleted" BOOLEAN NOT NULL DEFAULT false,
  "isFavorite" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create table for Albums
CREATE TABLE IF NOT EXISTS shamcloud_albums (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  "userId" TEXT NOT NULL REFERENCES shamcloud_users(id) ON DELETE CASCADE,
  "coverUrl" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  "mediaIds" JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- 4. Create table for Payments
CREATE TABLE IF NOT EXISTS shamcloud_payments (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES shamcloud_users(id) ON DELETE CASCADE,
  "userEmail" TEXT NOT NULL,
  "planName" TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL,
  date TEXT NOT NULL
);

-- 5. Create table for Audit Logs
CREATE TABLE IF NOT EXISTS shamcloud_audit_logs (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  "userEmail" TEXT NOT NULL,
  role TEXT NOT NULL,
  details TEXT NOT NULL,
  date TEXT NOT NULL
);`;

const PRESET_AVATARS = [
  { name: 'Surovi Pick (Tech)', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=250&auto=format&fit=crop' },
  { name: 'Warm Warmth', url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=250&auto=format&fit=crop' },
  { name: 'Active Vibe', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=250&auto=format&fit=crop' },
  { name: 'Minimal Woman', url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=250&auto=format&fit=crop' },
  { name: 'Professional Male', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=250&auto=format&fit=crop' },
  { name: 'Classic Suit', url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=250&auto=format&fit=crop' },
  { name: 'Energetic Look', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=250&auto=format&fit=crop' },
  { name: 'Classic Spec', url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=250&auto=format&fit=crop' }
];

interface ProfileViewProps {
  currentUser: User;
  onUpdateProfile: (name: string, avatarUrl?: string) => Promise<void>;
  onDeleteProfile: () => Promise<void>;
  onLogout: () => void;
}

export default function ProfileView({ currentUser, onUpdateProfile, onDeleteProfile, onLogout }: ProfileViewProps) {
  const [name, setName] = useState(currentUser.name);
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl || '');
  const [updating, setUpdating] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Sync state if currentUser prop is updated by the parent
  useEffect(() => {
    setName(currentUser.name);
    setAvatarUrl(currentUser.avatarUrl || '');
  }, [currentUser]);

  // Avatar uploading status
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const avatarFileInputRef = useRef<HTMLInputElement>(null);

  const [integrationStatus, setIntegrationStatus] = useState<{
    supabase: { configured: boolean; active: boolean; message: string };
    cloudinary: { configured: boolean; active: boolean; message: string };
  } | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  const fetchStatus = async () => {
    setLoadingStatus(true);
    try {
      const res = await fetch("/api/integrations/status");
      if (res.ok) {
        const data = await res.json();
        setIntegrationStatus(data);
      }
    } catch (e) {
      console.error("Failed to fetch integration status", e);
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleCopySQL = () => {
    navigator.clipboard.writeText(SUPABASE_DDL);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleAvatarFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Please specify a valid image file catalog (PNG, JPG, etc).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Image dimension limit exceeds 10MB.');
      return;
    }

    setUploadingAvatar(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/media/upload', {
        method: 'POST',
        headers: {
          'x-user-email': currentUser.email
        },
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.media && data.media.fileUrl) {
          setAvatarUrl(data.media.fileUrl);
          await onUpdateProfile(name, data.media.fileUrl);
          setSuccessMsg('Your custom profile photo was loaded and applied successfully!');
        } else {
          setUploadError(data.message || 'Custom upload failed.');
        }
      } else {
        setUploadError(`Server returned status code ${res.status}`);
      }
    } catch (err: any) {
      setUploadError(`Connection failed: ${err.message}`);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    if (!name.trim()) return;
    setUpdating(true);
    try {
      await onUpdateProfile(name, avatarUrl);
      setSuccessMsg('Your ShamCloud account settings were updated successfully!');
    } finally {
      setUpdating(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const storagePercentage = Math.min(100, (currentUser.storageUsed / currentUser.storageLimit) * 100);

  return (
    <div id="profile-container" className="max-w-3xl mx-auto space-y-10 py-4">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-bold text-white tracking-tight flex items-center gap-2">
          <span>Account Profile</span>
          <span className="bg-slate-800 text-slate-400 text-[10px] font-mono tracking-widest px-2.5 py-1 rounded-full font-bold">
            USER_ID: {currentUser.id}
          </span>
        </h1>
        <p className="text-slate-400 text-sm font-light mt-1">
          Manage your personal details, inspect memory node bandwidth, and secure your authentication.
        </p>
      </div>

      {successMsg && (
        <div id="profile-success-alert" className="border border-green-500/25 bg-green-500/10 text-green-400 px-4 py-3.5 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Info panel */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-slate-900/40 border border-slate-850 p-6 rounded-2xl text-center space-y-4">
            <div className="relative group mx-auto w-24 h-24">
              <div className="w-24 h-24 rounded-full bg-blue-600/10 border-2 border-slate-750 mx-auto overflow-hidden flex items-center justify-center text-blue-400 shadow-xl transition-all duration-300 group-hover:border-blue-500">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={name} className="w-full h-full object-cover animate-fade-in" referrerpolicy="no-referrer" />
                ) : (
                  <UserIcon className="w-10 h-10" />
                )}
              </div>
              
              <button 
                onClick={() => avatarFileInputRef.current?.click()}
                className="absolute bottom-0 right-0 p-1.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-md cursor-pointer transition-all hover:scale-110 active:scale-95"
                title="Upload Profile Photo"
              >
                <Upload className="w-3.5 h-3.5" />
              </button>
            </div>
            
            <input 
              type="file" 
              ref={avatarFileInputRef} 
              onChange={handleAvatarFileUpload}
              className="hidden" 
              accept="image/*"
            />

            {uploadingAvatar && (
              <p className="text-[10px] text-blue-400 font-mono leading-none animate-pulse">Uploading file to cloud...</p>
            )}

            {uploadError && (
              <p className="text-[10px] text-red-400 font-mono leading-tight">{uploadError}</p>
            )}

            <div>
              <p className="font-bold text-white text-base leading-tight">{currentUser.name}</p>
              <p className="text-xs text-slate-500 font-mono mt-0.5">{currentUser.email}</p>
            </div>
            <div>
              <span className="inline-block bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/15 text-[10px] uppercase font-bold tracking-wider px-3 py-1 rounded-full cursor-default">
                Role: {currentUser.role.replace('_', ' ')}
              </span>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-slate-900/40 border border-slate-850 p-6 rounded-2xl space-y-4">
            <div className="flex items-center gap-2 text-slate-350">
              <HardDrive className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Disk allocation</span>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-baseline text-xs font-mono">
                <span className="text-slate-300 font-bold">{formatSize(currentUser.storageUsed)}</span>
                <span className="text-slate-500">of {formatSize(currentUser.storageLimit)}</span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    storagePercentage > 85 ? 'bg-red-500' : storagePercentage > 60 ? 'bg-yellow-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${storagePercentage}%` }}
                />
              </div>
              <div className="text-[10px] text-slate-500 font-mono text-right">
                {storagePercentage.toFixed(1)}% space consumed
              </div>
            </div>
          </div>
        </div>

        {/* Inputs panel */}
        <div className="md:col-span-2 space-y-8">
          <div className="bg-slate-900/30 border border-slate-850 p-6 rounded-2xl">
            <form onSubmit={handleSubmit} className="space-y-6">
              <h3 className="text-sm font-bold uppercase tracking-wider font-display text-slate-300">Personal Details</h3>
              
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium">Display Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-sans"
                  placeholder="Your Full Name"
                  required
                />
              </div>

              {/* Profile Image input & selector */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-400 font-medium block">Profile Picture (Avatar)</label>
                  <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">Upload a custom image, paste any web link, or select a pre-made artistic avatar below.</span>
                </div>

                {/* Upload Button + URL Input group */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => avatarFileInputRef.current?.click()}
                    className="bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors sm:w-auto shrink-0 select-none"
                  >
                    <Upload className="w-4 h-4 text-blue-400" />
                    <span>Upload Picture File</span>
                  </button>
                  
                  <div className="flex-1 relative">
                    <input 
                      type="text" 
                      value={avatarUrl}
                      onChange={e => setAvatarUrl(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-700 focus:outline-none focus:border-blue-500 font-sans"
                      placeholder="Or paste any custom image URL (https://...)"
                    />
                    <ImageIcon className="w-4 h-4 text-slate-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                {/* Presets Grid */}
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-500 font-mono block uppercase">Quick Pre-made Artistic Avatars</span>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                    {PRESET_AVATARS.map((preset, idx) => {
                      const isSelected = avatarUrl === preset.url;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setAvatarUrl(preset.url);
                            setSuccessMsg('');
                          }}
                          className={`aspect-square w-full rounded-full overflow-hidden border-2 transition-all cursor-pointer relative p-0.5 ${
                            isSelected ? 'border-blue-500 scale-105 shadow-md shadow-blue-500/15' : 'border-slate-850 hover:border-slate-750'
                          }`}
                          title={`Select ${preset.name}`}
                        >
                          <img src={preset.url} alt={preset.name} className="w-full h-full object-cover rounded-full" referrerpolicy="no-referrer" />
                          {isSelected && (
                            <div className="absolute inset-0 bg-blue-600/35 flex items-center justify-center rounded-full">
                              <Check className="w-4 h-4 text-white drop-shadow-md" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-medium select-all">Secure Email Address</label>
                <input 
                  type="email" 
                  value={currentUser.email}
                  disabled
                  className="w-full bg-slate-900/60 border border-slate-850/60 rounded-xl px-4 py-2.5 text-xs text-slate-500 cursor-not-allowed font-mono"
                />
                <span className="text-[10px] text-slate-500 font-mono block leading-relaxed">
                  Email verification active. Please file a platform request to modify registered email.
                </span>
              </div>

              <button
                type="submit"
                disabled={updating}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-2"
              >
                {updating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    Saving Profiles...
                  </>
                ) : (
                  'Update ShamCloud Profile'
                )}
              </button>
            </form>
          </div>

          {/* Cloud Integrations (Supabase & Cloudinary) */}
          <div className="bg-slate-900/30 border border-slate-850 p-6 rounded-2xl space-y-6">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider font-display text-slate-300 flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-400" />
                <span>Cloud Integrations</span>
              </h3>
              <p className="text-xs text-slate-400 font-light mt-1.5 leading-relaxed">
                Connect external cloud layers for industrial-strength persistence. By adding environment credentials, the server automatically routes and syncs all indexes and media files.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Supabase Status */}
              <div className="bg-slate-950/80 border border-slate-850/60 p-4 rounded-xl space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-[#3ECF8E]" />
                    <span className="text-xs font-bold text-slate-200">Supabase DB</span>
                  </div>
                  {integrationStatus ? (
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                      integrationStatus.supabase.active 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        integrationStatus.supabase.active ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                      }`} />
                      {integrationStatus.supabase.active ? 'Active' : 'Offline'}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500">Checking...</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Durable PostgreSQL container used for storing registered users, file locations, audit logs, and albums.
                </p>
                {integrationStatus && (
                  <div className="bg-slate-900 border border-slate-850/50 p-2 rounded-lg text-[9px] font-mono text-slate-400 select-all truncate" title={integrationStatus.supabase.message}>
                    {integrationStatus.supabase.message}
                  </div>
                )}
              </div>

              {/* Cloudinary Status */}
              <div className="bg-slate-950/80 border border-slate-850/60 p-4 rounded-xl space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <Cloud className="w-4 h-4 text-[#F5A623]" />
                    <span className="text-xs font-bold text-slate-200">Cloudinary Media</span>
                  </div>
                  {integrationStatus ? (
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                      integrationStatus.cloudinary.active 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        integrationStatus.cloudinary.active ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                      }`} />
                      {integrationStatus.cloudinary.active ? 'Active' : 'Offline'}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500">Checking...</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Secure media repository for files. Stream types, video clips, and full-resolution graphics live on Cloudinary.
                </p>
                {integrationStatus && (
                  <div className="bg-slate-900 border border-slate-850/50 p-2 rounded-lg text-[9px] font-mono text-slate-400 select-all truncate" title={integrationStatus.cloudinary.message}>
                    {integrationStatus.cloudinary.message}
                  </div>
                )}
              </div>
            </div>

            {/* Instruction DDL Script */}
            <div className="border border-slate-850 bg-slate-950/40 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-slate-850 flex justify-between items-center bg-slate-950/60 font-sans">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-400 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-white">Manual Database Provision DDL</h4>
                    <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">Executes on Supabase to setup structures.</span>
                  </div>
                </div>
                <button
                  onClick={handleCopySQL}
                  className="bg-slate-950 border border-slate-800 hover:border-blue-500/40 text-slate-300 hover:text-white px-3 py-1 rounded-lg text-[10px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedText ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Clipboard className="w-3.5 h-3.5" />
                      <span>Copy SQL Schema</span>
                    </>
                  )}
                </button>
              </div>
              <div className="p-4 bg-slate-950">
                <pre className="text-[10px] font-mono text-slate-400 overflow-x-auto max-h-[160px] leading-relaxed custom-scrollbar block select-all whitespace-pre">
                  {SUPABASE_DDL}
                </pre>
              </div>
            </div>

            <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>
                To configure integrations permanently, add the appropriate environment variables to your Workspace Settings Secrets or `.env` configuration file, then restart dev server.
              </span>
            </div>
          </div>

          {/* Action Center */}
          <div className="bg-slate-950 border border-red-500/15 p-6 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-red-400 uppercase tracking-wider font-display">Danger Zone</h3>
            
            <p className="text-xs text-slate-400 font-light leading-relaxed">
              Deleting your account permanently erases your memory vault collections, including all photos, videos, isDeleted histories, and configured albums. This operation cannot be reversed.
            </p>

            {!confirmDelete ? (
              <button 
                onClick={() => setConfirmDelete(true)}
                className="bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 px-4 py-2 rounded-xl text-xs font-semibold transition-all"
              >
                Permanently Destroy My Vault
              </button>
            ) : (
              <div className="border border-red-500/30 bg-red-500/5 p-4 rounded-xl space-y-4">
                <p className="text-[11px] font-mono text-red-400 font-semibold">
                  WARNING: Are you absolutely certain you want to destroy John Doe's vault?
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={onDeleteProfile}
                    className="bg-red-600 hover:bg-red-500 text-white px-3.5 py-1.5 rounded-lg text-[11px] font-bold font-mono tracking-tight"
                  >
                    YES, DELETE ACCOUNT
                  </button>
                  <button 
                    onClick={() => setConfirmDelete(false)}
                    className="bg-slate-900 border border-slate-800 text-slate-300 hover:text-white px-3.5 py-1.5 rounded-lg text-[11px] font-medium"
                  >
                    Cancel Action
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
