import React, { useState, useEffect } from 'react';
import { 
  Users, Database, DollarSign, Activity, Settings, ShieldAlert,
  Search, ShieldCheck, CheckCircle2, Ban, RefreshCw, Mail, Calendar, Key, UserCheck, Shield, Edit, Trash2, Sparkles
} from 'lucide-react';
import type { User, PaymentRecord, AuditLog, UserRole } from '../types';

interface AdminConsoleProps {
  currentUser: User;
  onRefreshAllData: () => void;
}

interface AdminAnalytics {
  totalUsers: number;
  freeUsers: number;
  premiumUsers: number;
  adminsCount: number;
  totalMediaFiles: number;
  totalPhotos: number;
  totalVideos: number;
  totalSystemStorage: number;
  totalActiveSubscriptions: number;
  totalRevenue: number;
  userStorageStats: { email: string; name: string; used: number; limit: number }[];
}

// Security Helper to enforce role editing rules
const canModify = (currUser: User, targetUser: User | null): boolean => {
  if (!targetUser) return false;
  // 1. Current user must be ADMIN or SUPER_ADMIN to modify any account
  if (currUser.role !== 'SUPER_ADMIN' && currUser.role !== 'ADMIN') {
    return false;
  }
  // 2. Current user cannot modify themselves from the admin list
  if (currUser.id === targetUser.id || currUser.email.toLowerCase() === targetUser.email.toLowerCase()) {
    return false;
  }
  // 3. SuperAdmin cannot be changed/updated by anyone (including other SuperAdmins)
  if (targetUser.role === 'SUPER_ADMIN') {
    return false;
  }
  // 4. Same role cannot modify or change each other (ADMIN cannot change ADMIN)
  if (currUser.role === targetUser.role) {
    return false;
  }
  return true;
};

export default function AdminConsole({ currentUser, onRefreshAllData }: AdminConsoleProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  
  const [tab, setTab] = useState<'USERS' | 'LOGS' | 'ANALYTICS' | 'PRICING_OFFERS'>('USERS');
  const [userSearch, setUserSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Price Settings Management (SUPER_ADMIN only)
  const [basePrice, setBasePrice] = useState<number>(1500);
  const [hasActiveOffer, setHasActiveOffer] = useState<boolean>(false);
  const [offerPrice, setOfferPrice] = useState<number>(1200);
  const [customOfferText, setCustomOfferText] = useState<string>('');
  
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  const fetchPriceSettings = async () => {
    try {
      const res = await fetch('/api/payments/price-settings');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.priceSettings) {
          setBasePrice(data.priceSettings.basePrice);
          if (data.priceSettings.offerPrice !== null) {
            setHasActiveOffer(true);
            setOfferPrice(data.priceSettings.offerPrice);
          } else {
            setHasActiveOffer(false);
            setOfferPrice(Math.round(data.priceSettings.basePrice * 0.8)); // Default suggestion
          }
          setCustomOfferText(data.priceSettings.customOfferText || '');
        }
      }
    } catch (e) {
      console.error("Failed to load price settings in AdminConsole:", e);
    }
  };

  const handleSavePriceSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsSuccess(null);
    setSettingsError(null);

    try {
      const response = await fetch('/api/admin/price-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': currentUser.email,
        },
        body: JSON.stringify({
          basePrice: Number(basePrice),
          offerPrice: hasActiveOffer ? Number(offerPrice) : null,
          customOfferText: customOfferText,
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setSettingsSuccess("Subscription pricing and dynamic offer configurations published successfully!");
        fetchAdminData(); // Refresh logs
        onRefreshAllData(); // Full refresh
      } else {
        setSettingsError(data.message || "Failed to save subscription configurations.");
      }
    } catch (err: any) {
      setSettingsError(err.message || "Network error. Failed to reach pricing module.");
    } finally {
      setSavingSettings(false);
    }
  };

  const fetchAdminData = async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = { 'x-user-email': currentUser.email };
      
      const [uRes, logsRes, anaRes] = await Promise.all([
        fetch('/api/admin/users', { headers }),
        fetch('/api/admin/audit-logs', { headers }),
        fetch('/api/admin/analytics', { headers })
      ]);

      if (!uRes.ok) {
        throw new Error(`Failed to fetch wallets list (Status: ${uRes.status} ${uRes.statusText})`);
      }
      if (!logsRes.ok) {
        throw new Error(`Failed to fetch platform audit logs (Status: ${logsRes.status} ${logsRes.statusText})`);
      }
      if (!anaRes.ok) {
        throw new Error(`Failed to fetch system analytics (Status: ${anaRes.status} ${anaRes.statusText})`);
      }

      const uType = uRes.headers.get('content-type') || '';
      const logsType = logsRes.headers.get('content-type') || '';
      const anaType = anaRes.headers.get('content-type') || '';

      if (!uType.includes('application/json') || !logsType.includes('application/json') || !anaType.includes('application/json')) {
        throw new Error("One or more admin responses are not JSON. The request may have been intercepted by an authentication gate or middleware.");
      }

      const uData = await uRes.json();
      const logsData = await logsRes.json();
      const anaData = await anaRes.json();

      setUsers(uData.users || []);
      setAuditLogs(logsData.auditLogs || []);
      setAnalytics(anaData.analytics || null);
    } catch (e: any) {
      console.error("Error loading admin information", e);
      setError(e.message || "An unexpected connection error occurred while loading admin data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
    fetchPriceSettings();
  }, [currentUser]);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setLoadingActionId(userId);
    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': currentUser.email
        },
        body: JSON.stringify({ role: newRole })
      });
      if (response.ok) {
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          console.warn("Role update response is not JSON.");
          return;
        }
        await response.json();
        fetchAdminData();
        onRefreshAllData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingActionId(null);
    }
  };

  const handleStatusChange = async (userId: string, currentActive: boolean) => {
    setLoadingActionId(userId);
    try {
      const response = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': currentUser.email
        },
        body: JSON.stringify({ isActive: !currentActive })
      });
      if (response.ok) {
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          console.warn("Status update response is not JSON.");
          return;
        }
        await response.json();
        fetchAdminData();
        onRefreshAllData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingActionId(null);
    }
  };

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');
  const [savingDetails, setSavingDetails] = useState(false);

  const startEditing = (user: User) => {
    if (!canModify(currentUser, user)) return;
    setEditingUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditError('');
    setEditSuccess('');
  };

  const handleUpdateDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!editName.trim() || !editEmail.trim()) {
      setEditError('Name and Email are required');
      return;
    }
    setSavingDetails(true);
    setEditError('');
    setEditSuccess('');
    try {
      const response = await fetch(`/api/admin/users/${editingUser.id}/details`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': currentUser.email
        },
        body: JSON.stringify({ name: editName, email: editEmail })
      });
      const data = await response.json();
      if (response.ok) {
        setEditSuccess('User details updated successfully!');
        setTimeout(() => {
          setEditingUser(null);
          fetchAdminData();
          onRefreshAllData();
        }, 1000);
      } else {
        setEditError(data.message || 'Failed to update details');
      }
    } catch (e: any) {
      setEditError('Connection offline.');
    } finally {
      setSavingDetails(false);
    }
  };

  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deletingUserAccount, setDeletingUserAccount] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleteSuccess, setDeleteSuccess] = useState('');

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setDeletingUserAccount(true);
    setDeleteError('');
    setDeleteSuccess('');
    try {
      const response = await fetch(`/api/admin/users/${userToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'x-user-email': currentUser.email
        }
      });
      const data = await response.json();
      if (response.ok) {
        setDeleteSuccess(data.message || 'User deleted successfully.');
        setTimeout(() => {
          setUserToDelete(null);
          fetchAdminData();
          onRefreshAllData();
        }, 1200);
      } else {
        setDeleteError(data.message || 'Failed to delete user.');
      }
    } catch (err) {
      setDeleteError('Connection offline.');
    } finally {
      setDeletingUserAccount(false);
    }
  };

  const [bulkRole, setBulkRole] = useState<UserRole>('USER');
  const [bulkConfirmText, setBulkConfirmText] = useState('');
  const [bulkError, setBulkError] = useState('');
  const [bulkSuccess, setBulkSuccess] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);

  const handleBulkDeleteByRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bulkConfirmText.toUpperCase() !== 'PURGE') {
      setBulkError("Please write 'PURGE' to authorize this sweeping system action.");
      return;
    }
    
    setBulkLoading(true);
    setBulkError('');
    setBulkSuccess('');
    try {
      const response = await fetch('/api/admin/users/bulk-delete-by-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': currentUser.email
        },
        body: JSON.stringify({ roleToDelete: bulkRole })
      });
      const data = await response.json();
      if (response.ok) {
        setBulkSuccess(data.message || `Successfully purged all users with role ${bulkRole}.`);
        setBulkConfirmText('');
        setTimeout(() => {
          setBulkSuccess('');
          fetchAdminData();
          onRefreshAllData();
        }, 3000);
      } else {
        setBulkError(data.message || 'Bulk purge failed');
      }
    } catch (err) {
      setBulkError('Connection offline.');
    } finally {
      setBulkLoading(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(userSearch.toLowerCase()) || 
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div id="admin-container" className="space-y-8 max-w-7xl mx-auto py-4">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>ShamCloud Admin System</span>
            <span className="bg-red-500/10 text-red-400 text-[10px] tracking-widest px-2.5 py-1 rounded-full font-mono font-bold border border-red-500/15">
              PRIVILEGED_ROOT
            </span>
          </h1>
          <p className="text-slate-400 text-sm font-light mt-1">
            Real-time management index for disk nodes, cloud user subscription access controls, and audit verification lines.
          </p>
        </div>

        <button
          onClick={fetchAdminData}
          disabled={loading}
          className="self-start md:self-auto bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-slate-350 hover:text-white border border-slate-850 px-4 py-2 rounded-xl text-xs flex items-center gap-2 cursor-pointer transition-colors font-mono"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Force Synchronization
        </button>
      </div>

      {error && (
        <div id="admin-handshake-error" className="bg-red-500/10 border border-red-500/15 p-5 rounded-2xl text-red-400 text-xs font-mono flex items-start gap-3.5 shadow-lg shadow-red-500/5">
          <ShieldAlert className="w-5 h-5 shrink-0 text-red-500" />
          <div className="space-y-2">
            <span className="font-bold block uppercase tracking-widest text-[10px] text-red-500">Security Gate Handshake Fail</span>
            <p className="text-slate-300 font-sans text-sm leading-relaxed max-w-2xl">{error}</p>
            <div className="flex gap-2 pt-1">
              <button 
                onClick={() => { setError(null); fetchAdminData(); }} 
                className="bg-red-500/20 hover:bg-red-500/35 text-red-300 font-bold px-4 py-2 rounded-xl text-[10px] uppercase font-mono tracking-wider transition-colors cursor-pointer border border-red-500/20"
              >
                Retry Handshake Authentication
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && users.length === 0 && !error && (
        <div id="admin-scanning-status" className="flex flex-col items-center justify-center py-24 border border-slate-900 bg-slate-950/40 rounded-2xl space-y-4">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
          <div className="text-center space-y-1">
            <span className="text-xs font-mono text-slate-350 uppercase tracking-widest animate-pulse block">Polling clustered filesystem nodes...</span>
            <span className="text-[10px] font-mono text-slate-600 block">Encrypting secure payload transit tunnels...</span>
          </div>
        </div>
      )}

      {/* Metrics Banner Grid */}
      {analytics && !error && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/40 border border-slate-850 p-5 rounded-2xl flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/15 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 tracking-wider font-mono block">TOTAL_WALLETS</span>
              <span className="text-2xl font-bold text-white font-display mt-0.5 block">{analytics.totalUsers}</span>
              <span className="text-[10px] text-slate-400 font-mono">Premium: {analytics.premiumUsers}</span>
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-850 p-5 rounded-2xl flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center border border-violet-500/15 shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 tracking-wider font-mono block">NODE_STORAGE</span>
              <span className="text-2xl font-bold text-white font-display mt-0.5 block">{formatSize(analytics.totalSystemStorage)}</span>
              <span className="text-[10px] text-slate-400 font-mono">Files: {analytics.totalMediaFiles} archived</span>
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-850 p-5 rounded-2xl flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 text-green-400 flex items-center justify-center border border-green-500/15 shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 tracking-wider font-mono block">SYSTEM_REVENUE</span>
              <span className="text-2xl font-bold text-white font-display mt-0.5 block">${analytics.totalRevenue.toFixed(2)}</span>
              <span className="text-[10px] text-slate-400 font-mono">Subs: {analytics.totalActiveSubscriptions} active</span>
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-850 p-5 rounded-2xl flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center border border-orange-500/15 shrink-0">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 tracking-wider font-mono block">SYSTEM_HEALTH</span>
              <span className="text-2xl font-bold text-green-400 font-display mt-0.5 block">100% LIVE</span>
              <span className="text-[10px] text-slate-400 font-mono">All 4 servers active</span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      {(!loading || users.length > 0) && !error && (
        <>
          <div className="flex border-b border-slate-900">
            {(currentUser.role === 'SUPER_ADMIN' 
              ? ['USERS', 'LOGS', 'ANALYTICS', 'PRICING_OFFERS'] 
              : ['USERS', 'LOGS', 'ANALYTICS']
            ).map(t => (
              <button
                key={t}
                onClick={() => setTab(t as any)}
                className={`px-6 py-3.5 text-xs font-semibold uppercase tracking-wider relative transition-colors ${
                  tab === t ? 'text-blue-500 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                {t === 'PRICING_OFFERS' ? 'Pricing Setup' : t}
                {tab === t && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
                )}
              </button>
            ))}
          </div>

      {/* Tab Contents: Users List */}
      {tab === 'USERS' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 max-w-sm bg-slate-950 border border-slate-850 px-3.5 py-2.5 rounded-xl">
            <Search className="w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search wallets by name or email..."
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              className="bg-transparent text-xs text-white placeholder-slate-650 w-full focus:outline-none font-sans"
            />
          </div>

          <div className="bg-slate-900/30 border border-slate-850 rounded-2xl overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-850 text-slate-400 font-mono">
                  <th className="p-4">User Details</th>
                  <th className="p-4">Assigned Role</th>
                  <th className="p-4">Storage Usage</th>
                  <th className="p-4">Active Access</th>
                  <th className="p-4 text-right">Actions Action-Zone</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500 font-mono">
                      No ShamCloud accounts match your search filter.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(user => (
                    <tr key={user.id} className="hover:bg-slate-900/10">
                      {/* Name & Mail */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono font-bold ${
                            user.role === 'SUPER_ADMIN' ? 'bg-red-500/10 text-red-400' :
                            user.role === 'ADMIN' ? 'bg-purple-500/10 text-purple-400' :
                            user.role === 'PREMIUM_USER' ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {user.name.charAt(0)}
                          </div>
                          <div>
                            <span className="font-medium text-white block mb-0.5">{user.name}</span>
                            <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {user.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Privileges Dropdown */}
                      <td className="p-4">
                        <select
                          disabled={
                            user.id === currentUser.id || 
                            loadingActionId === user.id || 
                            !canModify(currentUser, user)
                          }
                          value={user.role}
                          onChange={e => handleRoleChange(user.id, e.target.value as UserRole)}
                          className="bg-slate-950 border border-slate-800 text-slate-200 text-[11px] rounded-lg px-2.5 py-1 focus:outline-none focus:border-blue-500 disabled:opacity-50 font-mono"
                        >
                          <option value="USER">FREE USER</option>
                          <option value="PREMIUM_USER">PREMIUM USER</option>
                          {(user.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN') && (
                            <option value="ADMIN">ADMINISTRATOR</option>
                          )}
                          {user.role === 'SUPER_ADMIN' && (
                            <option value="SUPER_ADMIN">SUPER ADMIN</option>
                          )}
                        </select>
                      </td>

                      {/* Storage scale */}
                      <td className="p-4 font-mono pr-8">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] text-slate-400">
                            <span>{formatSize(user.storageUsed)}</span>
                            <span>/ {formatSize(user.storageLimit)}</span>
                          </div>
                          <div className="h-1.5 w-32 bg-slate-800 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${user.storageUsed > user.storageLimit ? 'bg-red-500' : 'bg-blue-500'}`} 
                              style={{ width: `${Math.min(100, (user.storageUsed / user.storageLimit) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Status checkbox indicator */}
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          user.isActive 
                            ? 'bg-green-500/10 text-green-400' 
                            : 'bg-red-500/10 text-red-400'
                        }`}>
                          {user.isActive ? (
                            <>
                              <ShieldCheck className="w-3 h-3 text-green-400" />
                              ACTIVE
                            </>
                          ) : (
                            <>
                              <ShieldAlert className="w-3 h-3 text-red-400" />
                              SUSPENDED
                            </>
                          )}
                        </span>
                      </td>

                      {/* Danger Toggles */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {canModify(currentUser, user) && user.id !== 'user-4' ? (
                            <>
                              <button
                                disabled={loadingActionId === user.id}
                                onClick={() => handleStatusChange(user.id, user.isActive)}
                                className={`p-1.5 rounded-lg border text-xs font-mono font-medium inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors ${
                                  user.isActive 
                                    ? 'bg-orange-500/10 text-orange-400 border-orange-500/15 hover:bg-orange-500 hover:text-white' 
                                    : 'bg-green-500/10 text-green-400 border-green-500/15 hover:bg-green-500 hover:text-white'
                                }`}
                              >
                                {user.isActive ? (
                                  <>
                                    <Ban className="w-3.5 h-3.5 shrink-0" />
                                    Suspend
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="w-3.5 h-3.5 shrink-0" />
                                    Restore
                                  </>
                                )}
                              </button>
                              <button
                                disabled={loadingActionId === user.id}
                                onClick={() => setUserToDelete(user)}
                                className="p-1.5 rounded-lg border border-red-500/20 hover:border-red-500 bg-red-950/25 text-red-400 hover:text-white text-xs font-mono font-medium inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                                Delete
                              </button>
                            </>
                          ) : (
                            user.id === currentUser.id ? (
                              <span className="text-[10px] font-mono text-slate-500 italic select-none">Current Session</span>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono text-slate-500 italic select-none">
                                  {user.role === 'SUPER_ADMIN' ? "Super Admin (Protected)" :
                                   user.role === 'ADMIN' ? "Admin (Protected)" : "Protected"}
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Maintenance Segment - Bulk Purge by Role */}
          <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-6 mt-6">
            <div className="flex items-center gap-3.5 mb-4 border-b border-slate-850 pb-4">
              <div className="w-9 h-9 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-100 font-mono tracking-tight uppercase">Platform Purge & Role Maintenance</h4>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">Bulk delete system accounts safely by specifying target authorization roles.</p>
              </div>
            </div>

            <form onSubmit={handleBulkDeleteByRole} className="space-y-4 max-w-xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-mono text-slate-400 tracking-wider mb-2">Target Role to Purge</label>
                  <select
                    value={bulkRole}
                    onChange={e => setBulkRole(e.target.value as UserRole)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-4 py-2.5 focus:outline-none focus:border-red-500 font-mono"
                  >
                    <option value="USER">FREE USER (Regular accounts)</option>
                    <option value="PREMIUM_USER">PREMIUM USER (Upgraded accounts)</option>
                    <option value="ADMIN">ADMINISTRATOR (Only Super Admins can purge admins)</option>
                    {currentUser.role === 'SUPER_ADMIN' && (
                      <option value="SUPER_ADMIN">SUPER ADMIN (Deletes other Super Admins but protects you)</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-mono text-slate-400 tracking-wider mb-2">
                    Write <span className="font-bold text-red-400 font-mono bg-slate-950 px-1 py-0.5 rounded">PURGE</span> to authorize
                  </label>
                  <input
                    type="text"
                    value={bulkConfirmText}
                    onChange={e => setBulkConfirmText(e.target.value)}
                    placeholder="Enter PURGE to verify..."
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-4 py-2.5 focus:outline-none focus:border-red-500 font-mono placeholder:text-slate-600"
                    required
                  />
                </div>
              </div>

              {bulkError && (
                <div className="p-3.5 bg-red-500/10 border border-red-500/15 text-red-400 rounded-xl text-xs font-mono">
                  {bulkError}
                </div>
              )}

              {bulkSuccess && (
                <div className="p-3.5 bg-green-500/10 border border-green-500/15 text-green-400 rounded-xl text-xs font-mono font-medium">
                  {bulkSuccess}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={bulkLoading || bulkConfirmText.toUpperCase() !== 'PURGE'}
                  className="px-5 py-2.5 bg-red-650 hover:bg-red-600 text-white rounded-xl text-xs font-mono transition-colors font-bold shadow-lg shadow-red-600/5 flex items-center gap-2 cursor-pointer disabled:opacity-30"
                >
                  {bulkLoading ? 'Executing Sweep...' : `Purge All ${bulkRole} Accounts`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tab Contents: Logs Audit */}
      {tab === 'LOGS' && (
        <div className="bg-slate-900/30 border border-slate-850 rounded-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-mono">Platform Audit Trails Logs</h3>
            <span className="text-xs text-slate-500 font-mono">Count: {auditLogs.length} verified operations</span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            {auditLogs.length === 0 ? (
              <div className="text-center py-8 text-slate-500 font-mono">No active audit logs are recorded.</div>
            ) : (
              auditLogs.map(log => (
                <div key={log.id} className="border border-slate-850 bg-slate-950/45 p-4 rounded-xl flex flex-col md:flex-row justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.action.includes('SUSPENSION') || log.action.includes('DELETE') ? 'bg-red-500/10 text-red-400 border border-red-500/15' :
                        log.action.includes('UPGRADE') || log.action.includes('ROLE') ? 'bg-blue-500/10 text-blue-400 border border-blue-500/15' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {log.action}
                      </span>
                      <span className="text-slate-500">|</span>
                      <span className="text-slate-350">{log.userEmail} ({log.role})</span>
                    </div>
                    <p className="text-slate-250 font-sans text-xs leading-relaxed">{log.details}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-slate-500 text-[10px] block">{new Date(log.date).toLocaleDateString()}</span>
                    <span className="text-slate-500 text-[10px] block mt-0.5">{new Date(log.date).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab Contents: Storage Analytics */}
      {tab === 'ANALYTICS' && analytics && (
        <div id="analytics-grid" className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Subscriptions Card info */}
          <div className="bg-slate-900/30 border border-slate-850 p-6 rounded-2xl space-y-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">User Tier Distribution</h3>
            
            <div className="space-y-4 font-mono text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Administrators / Super Admins</span>
                <span className="text-white font-bold">{analytics.adminsCount} users</span>
              </div>
              <div className="h-1 text-slate-400 w-full bg-slate-900 rounded-full">
                <div className="h-full bg-purple-500 rounded-full" style={{ width: `${(analytics.adminsCount / analytics.totalUsers) * 100}%` }} />
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400">Premium Account subscriptions</span>
                <span className="text-blue-400 font-bold">{analytics.premiumUsers} users</span>
              </div>
              <div className="h-1 text-slate-400 w-full bg-slate-900 rounded-full">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(analytics.premiumUsers / analytics.totalUsers) * 100}%` }} />
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400">Free Account holders</span>
                <span className="text-slate-300 font-bold">{analytics.freeUsers} users</span>
              </div>
              <div className="h-1 text-slate-400 w-full bg-slate-900 rounded-full">
                <div className="h-full bg-slate-500" style={{ width: `${(analytics.freeUsers / analytics.totalUsers) * 100}%` }} />
              </div>
            </div>
          </div>

          {/* Media breakdown stats */}
          <div className="bg-slate-900/30 border border-slate-855 p-6 rounded-2xl space-y-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">File Categories Breakdown</h3>
            
            <div className="grid grid-cols-2 gap-4 font-mono text-xs text-center py-4">
              <div className="border border-slate-850 p-4 rounded-xl bg-slate-950/40">
                <span className="text-slate-500 block text-[10px] tracking-wider uppercase">Photo records</span>
                <span className="text-2xl font-bold font-sans text-blue-400 block mt-1">{analytics.totalPhotos}</span>
                <span className="text-xs text-slate-500">archived</span>
              </div>
              
              <div className="border border-slate-850 p-4 rounded-xl bg-slate-950/40">
                <span className="text-slate-500 block text-[10px] tracking-wider uppercase">Video clips</span>
                <span className="text-2xl font-bold font-sans text-indigo-400 block mt-1">{analytics.totalVideos}</span>
                <span className="text-xs text-slate-500">archived</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'PRICING_OFFERS' && (
        <div className="mt-4 space-y-6">
          <div className="bg-slate-900/30 border border-slate-850 p-6 rounded-2xl">
            <div className="mb-6">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span>Premium System Pricing & Campaign Manager</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Customize subscription base rates (increase/decrease) or declare promotional campaigns. Changes publish immediately.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* CONFIGURATION FORM */}
              <form onSubmit={handleSavePriceSettings} className="space-y-5">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-300">
                    Standard Base Price (৳ / month)
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setBasePrice(prev => Math.max(0, prev - 100))}
                      className="px-3 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-850 text-slate-300 rounded-lg text-sm font-bold cursor-pointer transition-colors"
                    >
                      -৳100
                    </button>
                    <input
                      type="number"
                      required
                      min="0"
                      value={basePrice}
                      onChange={e => setBasePrice(Math.max(0, parseInt(e.target.value) || 0))}
                      className="bg-slate-950 border border-slate-850 text-slate-200 text-sm rounded-lg px-3.5 py-2 w-full focus:outline-none focus:border-blue-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setBasePrice(prev => prev + 100)}
                      className="px-3 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-850 text-slate-300 rounded-lg text-sm font-bold cursor-pointer transition-colors"
                    >
                      +৳100
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono">Adjust standard billing tiers for standard accounts.</p>
                </div>

                <div className="bg-slate-950/45 border border-slate-900 rounded-xl p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="block text-xs font-semibold text-white">Toggle Campaign Special Offer</span>
                      <span className="block text-[10px] text-slate-500 font-mono mt-0.5">Activate temporary discount values.</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasActiveOffer}
                        onChange={e => setHasActiveOffer(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600 peer-checked:after:bg-white"></div>
                    </label>
                  </div>

                  {hasActiveOffer && (
                    <div className="space-y-4 pt-2 border-t border-slate-900">
                      <div className="space-y-2">
                        <label className="block text-xs font-semibold text-slate-300">
                          Active Campaign Price (৳ / month)
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setOfferPrice(prev => Math.max(0, prev - 50))}
                            className="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-850 text-slate-400 rounded-lg text-xs font-mono cursor-pointer transition-colors"
                          >
                            -৳50
                          </button>
                          <input
                            type="number"
                            required={hasActiveOffer}
                            min="0"
                            max={basePrice ? basePrice - 1 : undefined}
                            value={offerPrice}
                            onChange={e => setOfferPrice(Math.max(0, parseInt(e.target.value) || 0))}
                            className="bg-slate-950 border border-slate-850 text-slate-200 text-sm rounded-lg px-3 py-2 w-full focus:outline-none focus:border-blue-500 font-mono font-sans"
                          />
                          <button
                            type="button"
                            onClick={() => setOfferPrice(prev => prev + 50)}
                            className="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-850 text-slate-400 rounded-lg text-xs font-mono cursor-pointer transition-colors"
                          >
                            +৳50
                          </button>
                        </div>
                        {offerPrice >= basePrice && (
                          <p className="text-[10px] text-red-400 font-mono">Offer price must be strictly lower than base price of ৳{basePrice}.</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-semibold text-slate-300">
                          Campaign Tagline / Promo Label
                        </label>
                        <input
                          type="text"
                          value={customOfferText}
                          onChange={e => setCustomOfferText(e.target.value)}
                          placeholder="e.g. Eid Mubarak Special 20% Off!"
                          className="bg-slate-950 border border-slate-850 text-slate-200 text-xs rounded-lg px-3 py-2.5 w-full focus:outline-none focus:border-blue-500 font-sans"
                        />
                        <p className="text-[10px] text-slate-500 font-mono">Appears as an elegant highlighted capsule on billing tiles.</p>
                      </div>
                    </div>
                  )}
                </div>

                {settingsError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/15 text-red-400 text-xs font-mono rounded-lg">
                    {settingsError}
                  </div>
                )}

                {settingsSuccess && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/15 text-emerald-400 text-xs font-mono rounded-lg font-semibold">
                    {settingsSuccess}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={savingSettings || (hasActiveOffer && offerPrice >= basePrice)}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-850 disabled:text-slate-500 text-white font-semibold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed shadow-md shadow-blue-600/10"
                >
                  {savingSettings ? "Publishing Updates..." : "Publish Pricing Configurations"}
                </button>
              </form>

              {/* LIVE TIER PREVIEW SCREEN */}
              <div className="border border-slate-850 bg-slate-950/40 rounded-2xl p-6 flex flex-col justify-between space-y-6">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono tracking-wider text-slate-500 uppercase">Live Preview</span>
                    <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/15 px-2 py-0.5 rounded uppercase font-bold">Billing Sandbox</span>
                  </div>

                  <hr className="border-slate-900 my-4" />

                  {/* PREMIUM TIER SIMULATOR CARD */}
                  <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 relative overflow-hidden space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono tracking-widest text-blue-400 uppercase">ARCHIVE PRO</span>
                        <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                      </div>
                    </div>

                    <div>
                      <h4 className="text-base font-bold text-white">Premium Ultimate Plan</h4>
                      <p className="text-[11px] text-slate-400 mt-1">High-performance redundant cloud storage.</p>
                    </div>

                    <div className="pb-1">
                      {hasActiveOffer && offerPrice < basePrice ? (
                        <div className="space-y-1.5">
                          <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-white">৳{offerPrice.toLocaleString()}</span>
                            <span className="text-xs text-slate-500 line-through">৳{basePrice.toLocaleString()}</span>
                          </div>
                          <div className="text-[9px] font-bold text-[#e2126f] bg-[#e2126f]/10 border border-[#e2126f]/20 uppercase tracking-wider font-mono px-2 py-0.5 rounded inline-flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5 animate-bounce" />
                            <span>{customOfferText || "Special Offer!"}</span>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <span className="text-3xl font-bold text-white">৳{basePrice.toLocaleString()}</span>
                          <span className="text-xs text-slate-500 ml-1">/ month</span>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-slate-800/40 pt-3 space-y-2">
                      <div className="flex items-center gap-2 text-[10px] text-slate-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                        <span>1 TB (1,000 GB) Redundant Space</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                        <span>Multi-threaded Syncing Nodes</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/20 p-4 rounded-xl border border-slate-900 text-slate-400 text-xs space-y-1">
                  <strong className="text-white">Admin Directives:</strong>
                  <p className="text-[11px] leading-relaxed">
                    Once published, regular system users who navigate to the payment tier page will see these exact calculated plan costs.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
        </>
      )}

      {userToDelete && (
        <div id="delete-user-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-slate-900 border border-red-500/30 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl shadow-red-500/5 animate-scale-up">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-red-950/5">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-500 animate-pulse" />
                <h3 className="text-sm font-bold text-red-450 uppercase tracking-wider font-mono">Purge User Profile</h3>
              </div>
              <button 
                onClick={() => { setUserToDelete(null); setDeleteError(''); setDeleteSuccess(''); }}
                className="text-slate-400 hover:text-white transition-colors p-1"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-300 leading-relaxed font-sans">
                Are you absolutely sure you want to permanently delete the profile of <span className="font-bold text-white font-mono bg-slate-950 px-2 py-1 rounded inline-block border border-slate-800">{userToDelete.name}</span> (<span className="text-blue-400 font-mono text-xs">{userToDelete.email}</span>)?
              </p>
              
              <div className="bg-red-500/15 border border-red-500/20 p-4 rounded-xl space-y-2 text-xs font-mono text-red-300 leading-relaxed">
                <p className="font-bold uppercase tracking-wider text-[10px] text-red-400 flex items-center gap-1.5 mb-1.5">
                  ⚠️ System Purge Consequences
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-300 font-sans">
                  <li>Irreversible directory exclusion</li>
                  <li>Instant deletion of all associated digital images and videos</li>
                  <li>Purge of custom photo album collections</li>
                  <li>Erasure of previous checkout payment references</li>
                </ul>
              </div>

              {deleteError && (
                <div className="p-3 bg-red-500/10 border border-red-500/15 text-red-400 rounded-xl text-xs font-mono">
                  {deleteError}
                </div>
              )}

              {deleteSuccess && (
                <div className="p-3 bg-green-500/10 border border-green-500/15 text-green-400 rounded-xl text-xs font-mono font-medium">
                  {deleteSuccess}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={deletingUserAccount}
                  onClick={() => { setUserToDelete(null); setDeleteError(''); setDeleteSuccess(''); }}
                  className="px-4 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-850 text-slate-400 hover:text-white rounded-xl text-xs font-mono transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deletingUserAccount}
                  onClick={handleDeleteUser}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-mono transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 font-bold shadow-lg shadow-red-600/10"
                >
                  {deletingUserAccount ? 'Purging Account...' : 'Permanently Purge'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
