import React, { useState, useRef } from 'react';
import { 
  FolderPlus, Trash2, ArrowLeft, ArrowRight, AlertTriangle, Image as ImageIcon, Video, Folder, Plus, X, 
  FolderKanban, Upload, Smartphone, Laptop, Check, RefreshCw, Cloud, Sparkles, ArrowUpDown 
} from 'lucide-react';
import type { User, Album, Media } from '../types';

interface AlbumsViewProps {
  currentUser: User;
  albums: Album[];
  activeMedia: Media[];
  onRefreshData: () => void;
}

const mockGooglePhotosList = [
  { id: 'gphoto-a', name: 'Family Picnic Weekend.jpg', url: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?q=80&w=600&auto=format&fit=crop', size: 1980000 },
  { id: 'gphoto-b', name: 'Winter Mountain Cabin.jpg', url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?q=80&w=600&auto=format&fit=crop', size: 2840000 },
  { id: 'gphoto-c', name: 'Scenic Ocean Sunset Drive.jpg', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop', size: 3120000 },
  { id: 'gphoto-d', name: 'Tokyo Neon Streetscape.jpg', url: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?q=80&w=600&auto=format&fit=crop', size: 2200000 },
  { id: 'gphoto-e', name: 'Beautiful Autumn Walkway.jpg', url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=600&auto=format&fit=crop', size: 2450000 },
  { id: 'gphoto-f', name: 'Cozy Rain Coffee Morning.jpg', url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=600&auto=format&fit=crop', size: 1750000 },
];

export default function AlbumsView({ currentUser, albums, activeMedia, onRefreshData }: AlbumsViewProps) {
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [albumSortBy, setAlbumSortBy] = useState<'date' | 'name' | 'size'>('date');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [creating, setCreating] = useState(false);

  // For Adding media to album state
  const [showAddMediaModal, setShowAddMediaModal] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<'GALLERY' | 'DEVICE' | 'GOOGLE_PHOTOS'>('GALLERY');

  // Device file upload states
  const [deviceUploading, setDeviceUploading] = useState(false);
  const [deviceDragActive, setDeviceDragActive] = useState(false);
  const [deviceFeedback, setDeviceFeedback] = useState<{ type: 'SUCCESS' | 'ERROR'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Google Photos integration states
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [googleConnecting, setGoogleConnecting] = useState(false);
  const [googleImporting, setGoogleImporting] = useState(false);
  const [selectedGoogleIds, setSelectedGoogleIds] = useState<string[]>([]);

  // Lightbox & Custom Deletion Confirmation Popup states
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [confirmDeleteTarget, setConfirmDeleteTarget] = useState<{
    id: string;
    type: 'ALBUM' | 'ALBUM_CURRENT' | 'REMOVE_FROM_ALBUM';
    name?: string;
  } | null>(null);

  // Real Google Photos properties
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [googleMediaList, setGoogleMediaList] = useState<any[]>([]);
  const [hasEnvConfig, setHasEnvConfig] = useState(false);
  const [showManualConfig, setShowManualConfig] = useState(false);
  const [copiedRedirectUri, setCopiedRedirectUri] = useState<string | null>(null);
  const [clientIdInput, setClientIdInput] = useState('');
  const [clientSecretInput, setClientSecretInput] = useState('');
  const [googlePhotosError, setGooglePhotosError] = useState('');

  // Check config status on first load or when modal tab opens
  const fetchConfigStatus = async () => {
    try {
      const res = await fetch('/api/auth/google/config-status');
      if (res.ok) {
        const data = await res.json();
        setHasEnvConfig(data.hasEnvConfig);
        if (!data.hasEnvConfig) {
          setShowManualConfig(true);
        }
      }
    } catch (e) {
      console.error("Config status check failed", e);
    }
  };

  React.useEffect(() => {
    if (activeModalTab === 'GOOGLE_PHOTOS') {
      fetchConfigStatus();
    }
  }, [activeModalTab]);

  // Connect Google account flow
  const triggerGoogleConnection = async () => {
    setGoogleConnecting(true);
    setGooglePhotosError('');
    try {
      const redirectUri = `${window.location.origin}/auth/google/callback`;
      const qp = new URLSearchParams();
      if (clientIdInput.trim()) qp.append('client_id', clientIdInput.trim());
      if (clientSecretInput.trim()) qp.append('client_secret', clientSecretInput.trim());
      qp.append('redirect_uri', redirectUri);

      const response = await fetch(`/api/auth/google/url?${qp.toString()}`);
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Failed to initialize Google Authentication.');
      }

      const { url } = await response.json();
      const authWindow = window.open(url, 'google_oauth_popup', 'width=580,height=680');
      if (!authWindow) {
        alert('Prompt blocked! Please allow popups for ShamCloud to grant Google Photos access.');
        setGoogleConnecting(false);
      }
    } catch (err: any) {
      setGooglePhotosError(err.message);
      setGoogleConnecting(false);
    }
  };

  // Query actual photos from Google
  const fetchGooglePhotos = async (accessToken: string) => {
    setGoogleConnecting(true);
    setGooglePhotosError('');
    try {
      const response = await fetch('/api/google/photos', {
        headers: {
          'x-google-token': accessToken
        }
      });
      if (response.ok) {
        const data = await response.json();
        setGoogleMediaList(data.mediaItems || []);
      } else {
        const err = await response.json();
        setGooglePhotosError(err.message || 'Failed to list Google Photos. Verify API enablement in GCP.');
      }
    } catch (err: any) {
      setGooglePhotosError('Failed to communicate with Google Photos Proxy.');
    } finally {
      setGoogleConnecting(false);
    }
  };

  // PostMessage message handler
  React.useEffect(() => {
    const handleGoogleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
        return;
      }
      if (event.data?.type === 'GOOGLE_OAUTH_SUCCESS') {
        const { accessToken } = event.data;
        if (accessToken) {
          setGoogleToken(accessToken);
          setIsGoogleConnected(true);
          setGoogleConnecting(false);
          fetchGooglePhotos(accessToken);
        }
      }
    };
    window.addEventListener('message', handleGoogleMessage);
    return () => window.removeEventListener('message', handleGoogleMessage);
  }, []);

  const handleCreateAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!newAlbumName.trim()) return;

    setCreating(true);
    try {
      const response = await fetch('/api/albums', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': currentUser.email
        },
        body: JSON.stringify({ name: newAlbumName })
      });
      if (response.ok) {
        setNewAlbumName('');
        setShowCreateModal(false);
        onRefreshData();
      } else {
        const error = await response.json();
        setErrorMsg(error.message || 'Failed to create album folder');
      }
    } catch (err) {
      setErrorMsg('Network error. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteAlbum = async (albumId: string) => {
    try {
      const response = await fetch(`/api/albums/${albumId}`, {
        method: 'DELETE',
        headers: {
          'x-user-email': currentUser.email
        }
      });
      if (response.ok) {
        if (selectedAlbum && selectedAlbum.id === albumId) {
          setSelectedAlbum(null);
        }
        onRefreshData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddMediaToAlbum = async (mediaId: string) => {
    if (!selectedAlbum) return;
    try {
      const response = await fetch(`/api/albums/${selectedAlbum.id}/media`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': currentUser.email
        },
        body: JSON.stringify({ mediaId })
      });
      if (response.ok) {
        const data = await response.json();
        // Update local album display state
        setSelectedAlbum(data.album);
        onRefreshData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveMediaFromAlbum = async (mediaId: string) => {
    if (!selectedAlbum) return;
    try {
      const response = await fetch(`/api/albums/${selectedAlbum.id}/media/${mediaId}`, {
        method: 'DELETE',
        headers: {
          'x-user-email': currentUser.email
        }
      });
      if (response.ok) {
        const data = await response.json();
        setSelectedAlbum(data.album);
        onRefreshData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Device file upload drag and drop mechanics
  const handleDeviceDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDeviceDragActive(true);
    } else if (e.type === "dragleave") {
      setDeviceDragActive(false);
    }
  };

  const uploadDeviceFile = async (file: File) => {
    if (!selectedAlbum) return;
    setDeviceUploading(true);
    setDeviceFeedback(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      // 1. Upload to cloud media pool
      const response = await fetch("/api/media/upload", {
        method: "POST",
        headers: {
          "x-user-email": currentUser.email
        },
        body: formData
      });

      const data = await response.json();
      if (response.ok && data.media) {
        const newMediaItem: Media = data.media;

        // 2. Map this new media item directly to the active album folder
        const responseAlbum = await fetch(`/api/albums/${selectedAlbum.id}/media`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-email': currentUser.email
          },
          body: JSON.stringify({ mediaId: newMediaItem.id })
        });

        if (responseAlbum.ok) {
          const albumData = await responseAlbum.json();
          setSelectedAlbum(albumData.album);
          onRefreshData();
          setDeviceFeedback({
            type: 'SUCCESS',
            text: `Digitized & stored '${file.name}' direct inside '${selectedAlbum.name}'!`
          });
        } else {
          setDeviceFeedback({
            type: 'ERROR',
            text: "Failed to map uploaded file to album."
          });
        }
      } else {
        setDeviceFeedback({
          type: 'ERROR',
          text: data.message || "Upload failed. Storage threshold limit reached."
        });
      }
    } catch (err) {
      setDeviceFeedback({
        type: 'ERROR',
        text: "Network error occurred."
      });
    } finally {
      setDeviceUploading(false);
    }
  };

  const handleDeviceDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDeviceDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadDeviceFile(e.dataTransfer.files[0]);
    }
  };

  const handleDeviceFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadDeviceFile(e.target.files[0]);
    }
  };

  // Google Photo Sync Mechanics
  const toggleGooglePhotoSelection = (id: string) => {
    setSelectedGoogleIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleGooglePhotosImport = async () => {
    if (!selectedAlbum) return;
    const selectedPhotos = googleMediaList.filter(p => selectedGoogleIds.includes(p.id));
    if (selectedPhotos.length === 0) return;

    setGoogleImporting(true);
    try {
      const response = await fetch('/api/google/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': currentUser.email
        },
        body: JSON.stringify({
          photos: selectedPhotos.map(p => ({
            name: p.filename || `GPhoto_${p.id}.jpg`,
            url: p.baseUrl,
            type: p.mimeType?.startsWith('video/') ? 'VIDEO' : 'PHOTO',
            mimeType: p.mimeType || 'image/jpeg',
            size: 2500000 // default size 2.5 MB
          }))
        })
      });

      if (response.ok) {
        const data = await response.json();
        const importedItems = data.media || [];

        // Map imported media IDs to album
        let latestAlbumState = selectedAlbum;
        for (const item of importedItems) {
          const mapRes = await fetch(`/api/albums/${selectedAlbum.id}/media`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-user-email': currentUser.email
            },
            body: JSON.stringify({ mediaId: item.id })
          });
          if (mapRes.ok) {
            const mapData = await mapRes.json();
            latestAlbumState = mapData.album;
          }
        }

        setSelectedAlbum(latestAlbumState);
        onRefreshData();
        setSelectedGoogleIds([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGoogleImporting(false);
    }
  };

  // Filter media that belong to selected album and apply sorting
  const albumMedia = selectedAlbum 
    ? [...activeMedia.filter(m => selectedAlbum.mediaIds.includes(m.id) && !m.isDeleted)].sort((a, b) => {
        if (albumSortBy === 'name') {
          return a.name.localeCompare(b.name);
        }
        if (albumSortBy === 'size') {
          return b.size - a.size;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
    : [];

  // Filter available user media that are NOT currently in the selected album to add
  const addableMedia = selectedAlbum
    ? activeMedia.filter(m => !selectedAlbum.mediaIds.includes(m.id) && !m.isDeleted)
    : [];

  return (
    <div id="albums-container" className="space-y-8 max-w-7xl mx-auto py-4">
      {selectedAlbum ? (
        /* EXPANDED SINGLE ALBUM ENTRANCE VIEW */
        <div className="space-y-6">
          {/* Header row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <button
                onClick={() => setSelectedAlbum(null)}
                className="inline-flex items-center gap-2 text-xs font-mono font-medium text-slate-400 hover:text-white transition-colors uppercase cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Return to Album Folders
              </button>

              <h1 className="font-display text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                <Folder className="w-8 h-8 text-blue-500 shrink-0" />
                <span>{selectedAlbum.name}</span>
              </h1>
              
              <div className="text-slate-400 text-xs font-mono flex items-center gap-3">
                <span>Total Items: {albumMedia.length}</span>
                <span>•</span>
                <span>Created {new Date(selectedAlbum.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Sorting Selection Dropdown */}
              <div className="flex items-center gap-2 bg-slate-950 border border-slate-850 px-3.5 py-2.5 rounded-xl text-xs text-slate-400 focus-within:border-slate-750 transition-colors w-full sm:w-auto">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
                <select
                  id="album-sort-select"
                  value={albumSortBy}
                  onChange={e => setAlbumSortBy(e.target.value as 'date' | 'name' | 'size')}
                  className="bg-transparent text-white focus:outline-none cursor-pointer text-xs font-mono font-bold pr-1 appearance-none sm:pr-8"
                  style={{ backgroundPosition: 'right center', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundSize: '12px' }}
                >
                  <option value="date" className="bg-slate-950 text-white">Sort: Date Uploaded</option>
                  <option value="name" className="bg-slate-950 text-white">Sort: Name (A-Z)</option>
                  <option value="size" className="bg-slate-950 text-white">Sort: Size</option>
                </select>
              </div>

              <button
                onClick={() => setShowAddMediaModal(true)}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-xs font-medium transition-all shadow-md shadow-blue-600/10 flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-white" />
                Add Photos/Videos
              </button>

              <button
                onClick={() => setConfirmDeleteTarget({ id: selectedAlbum.id, type: 'ALBUM_CURRENT', name: selectedAlbum.name })}
                className="bg-red-500/10 hover:bg-red-500 border border-red-500/20 text-red-400 hover:text-white px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Folder
              </button>
            </div>
          </div>

          {/* Grid layout inside Album */}
          {albumMedia.length === 0 ? (
            <div className="bg-slate-900/10 border border-slate-850 rounded-2xl p-16 text-center space-y-4 max-w-xl mx-auto">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 mx-auto">
                <Folder className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-300">This album folder is empty</h3>
                <p className="text-slate-500 text-xs font-light mt-1">Organize your archived memories by mapping photos/videos to this album folder.</p>
              </div>
              <button
                onClick={() => setShowAddMediaModal(true)}
                className="bg-blue-600/15 border border-blue-500/20 hover:bg-blue-500 hover:border-blue-500 text-blue-400 hover:text-white px-4 py-2 rounded-xl text-xs font-medium transition-all"
              >
                Map Photos Now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {albumMedia.map(item => (
                <div key={item.id} className="bg-slate-900/40 border border-slate-850 rounded-xl overflow-hidden group hover:border-slate-800 transition-all flex flex-col justify-between relative shadow-inner">
                   {/* Remove hover button */}
                   <button
                     onClick={() => setConfirmDeleteTarget({ id: item.id, type: 'REMOVE_FROM_ALBUM', name: item.name })}
                     className="absolute top-2 right-2 bg-slate-950/80 hover:bg-red-600 text-slate-300 hover:text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer"
                     title="Remove from album"
                   >
                     <X className="w-3.5 h-3.5" />
                   </button>
 
                   <div 
                     onClick={() => setLightboxIndex(albumMedia.findIndex(m => m.id === item.id))}
                     className="aspect-[4/3] bg-slate-950 flex items-center justify-center overflow-hidden relative cursor-zoom-in"
                   >
                     {item.type === 'PHOTO' ? (
                       <img 
                         src={item.fileUrl} 
                         alt={item.name} 
                         className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                         referrerPolicy="no-referrer"
                       />
                     ) : (
                       <div className="relative w-full h-full">
                         <video 
                           src={item.fileUrl} 
                           className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                           preload="metadata"
                         />
                         <div className="absolute inset-0 bg-slate-950/45 flex items-center justify-center">
                           <Video className="w-8 h-8 text-white/50" />
                         </div>
                       </div>
                     )}
                   </div>
                  
                  <div className="p-3 bg-slate-950/40 border-t border-slate-900 flex justify-between items-center text-xs">
                    <span className="text-slate-300 font-medium truncate pr-4">{item.name}</span>
                    <span className="text-slate-500 font-mono text-[10px] uppercase shrink-0">
                      {item.type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}          {/* Add media model popup */}
          {showAddMediaModal && (
            <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-850 rounded-2xl w-full max-w-xl p-6 relative max-h-[85vh] flex flex-col justify-between">
                <button
                  onClick={() => setShowAddMediaModal(false)}
                  className="absolute top-4 right-4 text-slate-500 hover:text-white cursor-pointer z-10"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="mb-4">
                  <h3 className="text-lg font-bold text-white mb-1">Add to '{selectedAlbum.name}'</h3>
                  <p className="text-xs text-slate-500 font-light">Select how you want to add photos or videos to this organized album.</p>
                </div>

                {/* Aesthetic Tab Navigation */}
                <div className="flex border-b border-slate-850 mb-5 relative shrink-0">
                  <button
                    type="button"
                    onClick={() => { setActiveModalTab('GALLERY'); setDeviceFeedback(null); }}
                    className={`flex-1 pb-3 text-xs font-semibold tracking-wider uppercase border-b-2 transition-all cursor-pointer ${
                      activeModalTab === 'GALLERY' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-350'
                    }`}
                  >
                    Gallery Vault
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveModalTab('DEVICE'); setDeviceFeedback(null); }}
                    className={`flex-1 pb-3 text-xs font-semibold tracking-wider uppercase border-b-2 transition-all cursor-pointer ${
                      activeModalTab === 'DEVICE' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-355'
                    }`}
                  >
                    Device Upload
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveModalTab('GOOGLE_PHOTOS'); setDeviceFeedback(null); }}
                    className={`flex-1 pb-3 text-xs font-semibold tracking-wider uppercase border-b-2 transition-all cursor-pointer ${
                      activeModalTab === 'GOOGLE_PHOTOS' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-350'
                    }`}
                  >
                    Google Photos
                  </button>
                </div>

                {/* Tab content wrapper */}
                <div className="overflow-y-auto flex-1 pr-1 min-h-[300px]">
                  
                  {/* TAB 1: GALLERY CHOOSE AND MAP */}
                  {activeModalTab === 'GALLERY' && (
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">Map Existing Files</h4>
                        <p className="text-[11px] text-slate-550 mt-0.5">Map files belonging to your gallery vault to this folder.</p>
                      </div>

                      <div className="space-y-3 divide-y divide-slate-850">
                        {addableMedia.length === 0 ? (
                          <div className="text-center py-12 text-slate-500 text-xs font-mono">
                            No additional gallery vault files available to map.
                          </div>
                        ) : (
                          addableMedia.map(item => (
                            <div key={item.id} className="pt-3 flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-9 rounded bg-slate-950 overflow-hidden relative shrink-0">
                                  {item.type === 'PHOTO' ? (
                                    <img src={item.fileUrl} alt={item.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full bg-slate-950/60 flex items-center justify-center">
                                      <Video className="w-4 h-4 text-slate-400" />
                                    </div>
                                  )}
                                </div>
                                <span className="text-xs text-slate-200 font-medium truncate max-w-[280px]">{item.name}</span>
                              </div>
                              
                              <button
                                onClick={() => handleAddMediaToAlbum(item.id)}
                                className="bg-blue-600/15 hover:bg-blue-650 hover:text-white border border-blue-500/20 text-blue-400 px-3 py-1.5 rounded-lg text-[10px] font-semibold tracking-wider font-mono cursor-pointer transition-all"
                              >
                                MAP_FILE
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 2: DEVICE UPLOAD */}
                  {activeModalTab === 'DEVICE' && (
                    <div className="space-y-4 py-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">Upload from PC or Android/iPhone</h4>
                          <p className="text-[11px] text-slate-550 mt-0.5">Select a photo or video to automatically archive & assign inside this folder.</p>
                        </div>
                      </div>

                      {deviceFeedback && (
                        <div className={`p-3.5 rounded-xl text-xs font-mono border ${
                          deviceFeedback.type === 'SUCCESS' 
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                            : 'bg-red-500/10 border-red-500/20 text-red-500'
                        }`}>
                          {deviceFeedback.text}
                        </div>
                      )}

                      <div 
                        onDragEnter={handleDeviceDrag}
                        onDragOver={handleDeviceDrag}
                        onDragLeave={handleDeviceDrag}
                        onDrop={handleDeviceDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                          deviceDragActive 
                            ? 'border-blue-500 bg-blue-500/5' 
                            : 'border-slate-800 hover:border-slate-700 bg-slate-950/20 hover:bg-slate-950/45'
                        }`}
                      >
                        <input 
                          ref={fileInputRef}
                          type="file"
                          className="hidden"
                          accept="image/*,video/*"
                          onChange={handleDeviceFileInput}
                        />

                        {deviceUploading ? (
                          <div className="space-y-3">
                            <RefreshCw className="w-8 h-8 text-blue-500 mx-auto animate-spin" />
                            <div>
                              <p className="text-xs font-semibold text-white">Digitizing & Storing...</p>
                              <p className="text-[10px] text-slate-500 mt-1 uppercase font-mono tracking-wider">Syncing file into '{selectedAlbum.name}' folder</p>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="flex justify-center gap-2 text-slate-400 mb-1">
                              <Smartphone className="w-6 h-6 text-slate-500" />
                              <Laptop className="w-6 h-6 text-slate-500" />
                              <Upload className="w-6 h-6 text-blue-500" />
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-200">
                                Drag & drop files here, or <span className="text-blue-400 underline">browse device</span>
                              </p>
                              <p className="text-[10px] text-slate-550 mt-1 font-light">
                                Select files from camera rolls, downloads or system drives. Max size: 100MB.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 3: GOOGLE PHOTOS LINK & SYNC */}
                  {activeModalTab === 'GOOGLE_PHOTOS' && (
                    <div className="space-y-4 py-1">
                      <div>
                        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">Google Photos Sync Loop</h4>
                        <p className="text-[11px] text-slate-550 mt-0.5">Link Google Photos and copy memories directly into this folder.</p>
                      </div>

                      {googlePhotosError && (
                        <div className="p-3 bg-red-950/30 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                          <span>{googlePhotosError}</span>
                        </div>
                      )}

                      {!isGoogleConnected ? (
                        <div className="space-y-4 bg-slate-950/25 border border-slate-850 rounded-2xl p-5">
                          <div className="text-center space-y-2">
                            <div className="w-12 h-12 bg-gradient-to-tr from-blue-500/10 via-red-500/10 to-yellow-500/10 rounded-2xl flex items-center justify-center mx-auto border border-slate-800 shadow-md relative">
                              <Cloud className="w-6 h-6 text-blue-400" />
                              <Sparkles className="w-3 h-3 text-yellow-400 absolute top-1 right-1 animate-pulse" />
                            </div>
                            
                            <div className="max-w-xs mx-auto">
                              <h4 className="text-xs font-bold text-slate-200">Real Google Photos Connection</h4>
                              <p className="text-[10px] text-slate-500 font-light leading-relaxed">
                                Authorize this platform to read and import actual images from your Google account.
                              </p>
                            </div>
                          </div>

                          {showManualConfig && (
                            <div className="space-y-3 bg-slate-900/50 p-4 border border-slate-800 rounded-xl">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Visual API Keys Configuration</span>
                                <button
                                  type="button"
                                  onClick={() => setShowManualConfig(false)}
                                  className="text-[10px] text-slate-500 hover:text-slate-400 underline"
                                >
                                  Hide Config
                                </button>
                              </div>
                              <div className="space-y-2 text-[10px]">
                                <div>
                                  <label className="block text-slate-400 font-semibold mb-1 border-slate-800">Google Client ID</label>
                                  <input
                                    type="text"
                                    value={clientIdInput}
                                    onChange={(e) => setClientIdInput(e.target.value)}
                                    placeholder="Enter your Client ID here"
                                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 focus:border-blue-500 transition-colors text-slate-200 font-mono"
                                  />
                                </div>
                                <div>
                                  <label className="block text-slate-400 font-semibold mb-1">Google Client Secret</label>
                                  <input
                                    type="password"
                                    value={clientSecretInput}
                                    onChange={(e) => setClientSecretInput(e.target.value)}
                                    placeholder="Enter your Client Secret here"
                                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 focus:border-blue-500 transition-colors text-slate-200 font-mono"
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="space-y-2">
                            <button
                              type="button"
                              onClick={triggerGoogleConnection}
                              disabled={googleConnecting}
                              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-xl text-xs font-semibold tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-60"
                            >
                              {googleConnecting ? (
                                <>
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  Linking Account...
                                </>
                              ) : (
                                <>
                                  <Cloud className="w-3.5 h-3.5" />
                                  Connect Google Photos
                                  {showManualConfig ? " with credentials" : ""}
                                </>
                              )}
                            </button>

                            {!showManualConfig && (
                              <button
                                type="button"
                                onClick={() => setShowManualConfig(true)}
                                className="w-full text-center text-[10px] text-slate-400 hover:text-slate-300 underline py-1"
                              >
                                View / Edit Custom API Credentials
                              </button>
                            )}
                          </div>

                          {/* How-to guide accordion */}
                          <div className="border border-slate-800 rounded-xl bg-slate-950/40">
                            <details className="group">
                              <summary className="flex items-center justify-between p-3 cursor-pointer text-xs font-semibold text-slate-400 hover:text-slate-300">
                                <span>Setup Guide: Create OAuth Credentials</span>
                                <span className="transition-transform group-open:rotate-180">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                </span>
                              </summary>
                              <div className="p-3 pt-0 border-t border-slate-850 bg-slate-950/20 text-[10px] leading-relaxed text-slate-400 space-y-2">
                                <p>To enable real Google Photos imports, follow these steps:</p>
                                <ol className="list-decimal pl-4 space-y-1">
                                  <li>Go to the <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Google Cloud Console</a>.</li>
                                  <li>Create or select a GCP project. Register Google Photos API: Search in GCP search bar for "Google Photos Library API" and click Enable.</li>
                                  <li>Navigate to APIs & Services &gt; Credentials, and click "Create Credentials" &gt; "OAuth client ID".</li>
                                  <li>Set Application type to "Web application" and specify: (Click to copy)</li>
                                  <div className="space-y-1.5 my-1.5">
                                    <div 
                                      onClick={() => {
                                        const uri = `${window.location.origin}/auth/google/callback`;
                                        navigator.clipboard.writeText(uri);
                                        setCopiedRedirectUri(uri);
                                        setTimeout(() => setCopiedRedirectUri(null), 2000);
                                      }}
                                      className="bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded p-1.5 font-mono text-[9px] text-[#38bdf8] flex items-center justify-between cursor-pointer group"
                                      title="Click to copy Development callback"
                                    >
                                      <div>
                                        <span className="text-slate-500 block text-[7px] uppercase font-bold tracking-wider">Development Callback URL</span>
                                        <span className="break-all select-all">{window.location.origin}/auth/google/callback</span>
                                      </div>
                                      <span className="text-[9px] font-mono shrink-0 bg-slate-950/60 px-1.5 py-0.5 rounded text-slate-400 group-hover:text-white">
                                        {copiedRedirectUri === `${window.location.origin}/auth/google/callback` ? 'Copied!' : 'Copy'}
                                      </span>
                                    </div>
                                    <div 
                                      onClick={() => {
                                        const uri = `https://ais-pre-6xoofexfl5xbbfgosqrtm6-200841564060.asia-southeast1.run.app/auth/google/callback`;
                                        navigator.clipboard.writeText(uri);
                                        setCopiedRedirectUri(uri);
                                        setTimeout(() => setCopiedRedirectUri(null), 2000);
                                      }}
                                      className="bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded p-1.5 font-mono text-[9px] text-[#38bdf8] flex items-center justify-between cursor-pointer group"
                                      title="Click to copy Shared/Production callback"
                                    >
                                      <div>
                                        <span className="text-slate-500 block text-[7px] uppercase font-bold tracking-wider">Shared App Callback URL</span>
                                        <span className="break-all select-all">https://ais-pre-6xoofexfl5xbbfgosqrtm6-200841564060.asia-southeast1.run.app/auth/google/callback</span>
                                      </div>
                                      <span className="text-[9px] font-mono shrink-0 bg-slate-950/60 px-1.5 py-0.5 rounded text-slate-400 group-hover:text-white">
                                        {copiedRedirectUri === `https://ais-pre-6xoofexfl5xbbfgosqrtm6-200841564060.asia-southeast1.run.app/auth/google/callback` ? 'Copied!' : 'Copy'}
                                      </span>
                                    </div>
                                  </div>
                                  <li>Copy the Client ID and Client Secret, and paste them under "Custom API Credentials" above or store them in your environment settings as <code className="text-blue-300 font-mono">GOOGLE_CLIENT_ID</code> and <code className="text-blue-300 font-mono">GOOGLE_CLIENT_SECRET</code>.</li>
                                </ol>
                              </div>
                            </details>
                          </div>

                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between bg-slate-950/40 p-2.5 rounded-xl border border-slate-850">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                              <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold">Connected to Live Drive</span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {selectedGoogleIds.length} item{selectedGoogleIds.length === 1 ? '' : 's'} marked
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-3 max-h-[35vh] overflow-y-auto pr-1 animate-fadeIn">
                            {googleMediaList.map(p => {
                              const isSelected = selectedGoogleIds.includes(p.id);
                              const thumbUrl = `${p.baseUrl}=w400`;
                              return (
                                <div 
                                  key={p.id}
                                  onClick={() => toggleGooglePhotoSelection(p.id)}
                                  className={`relative aspect-square rounded-xl overflow-hidden border cursor-pointer group transition-all ${
                                    isSelected 
                                      ? 'border-blue-500 ring-2 ring-blue-500/30' 
                                      : 'border-slate-850 hover:border-slate-800'
                                  }`}
                                >
                                  <img 
                                    src={thumbUrl} 
                                    alt={p.filename} 
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                                    referrerPolicy="no-referrer"
                                  />
                                  <div className={`absolute inset-0 transition-opacity flex items-center justify-center ${
                                    isSelected ? 'bg-blue-950/40' : 'bg-transparent group-hover:bg-slate-950/25'
                                  }`}>
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                                      isSelected 
                                        ? 'bg-blue-500 text-white border-blue-400' 
                                        : 'bg-slate-950/70 text-transparent border-slate-500/40 group-hover:border-white/50'
                                    }`}>
                                      <Check className="w-3 h-3 text-white" />
                                    </div>
                                  </div>
                                  <div className="absolute bottom-1 right-1 bg-slate-950/80 px-1 py-0.5 rounded text-[8px] font-mono text-slate-400 max-w-[90%] truncate">
                                    {p.filename}
                                  </div>
                                </div>
                              );
                            })}
                            
                            {googleMediaList.length === 0 && (
                              <div className="col-span-3 text-center py-10 text-xs text-slate-500 font-mono">
                                No media files located in Google Photos.
                              </div>
                            )}
                          </div>

                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={handleGooglePhotosImport}
                              disabled={selectedGoogleIds.length === 0 || googleImporting}
                              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-xl text-xs font-semibold tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
                            >
                              {googleImporting ? (
                                <>
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  Importing & mapping files...
                                </>
                              ) : (
                                <>
                                  <Cloud className="w-3.5 h-3.5" />
                                  Import {selectedGoogleIds.length} item{selectedGoogleIds.length === 1 ? '' : 's'} to folder
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                </div>

                <div className="pt-4 border-t border-slate-850 text-right mt-4 shrink-0">
                  <button
                    onClick={() => setShowAddMediaModal(false)}
                    className="bg-slate-850 hover:bg-slate-800 text-slate-300 font-semibold px-4 py-2 rounded-xl text-xs cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* GENERAL PRIMARY ALBUM GRID VIEW */
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl font-bold text-white tracking-tight flex items-center gap-2">
                <FolderKanban className="w-8 h-8 text-blue-500" />
                <span>Organized Albums</span>
              </h1>
              <p className="text-slate-400 text-sm font-light mt-1">
                Preserve specific journeys or events as dedicated digital collection folders.
              </p>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-xs font-medium transition-all shadow-md shadow-blue-600/10 flex items-center gap-2 cursor-pointer"
            >
              <FolderPlus className="w-4 h-4 text-white" />
              Create Album Folder
            </button>
          </div>

          {albums.length === 0 ? (
            <div className="bg-slate-900/15 border border-slate-850 rounded-2xl p-16 text-center space-y-4 max-w-xl mx-auto">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 mx-auto animate-pulse">
                <FolderKanban className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-300">No albums have been organized yet</h3>
                <p className="text-slate-500 text-xs font-light mt-1 mb-4">Start creating custom albums like 'Travels', 'Birthdays', etc. to store photos beautifully.</p>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-xs font-medium transition-all shadow-md shadow-blue-500/15"
              >
                Create First Album Folder
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {albums.map(item => (
                <div
                  key={item.id}
                  onClick={() => setSelectedAlbum(item)}
                  className="bg-slate-900/40 border border-slate-850 hover:border-slate-850 rounded-2xl overflow-hidden group cursor-pointer transition-all hover:bg-slate-900/60 flex flex-col justify-between"
                >
                  <div className="aspect-[16/10] bg-slate-950 overflow-hidden relative">
                    {item.coverUrl ? (
                      <img 
                        src={item.coverUrl} 
                        alt={item.name} 
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" 
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-950/60 flex items-center justify-center">
                        <Folder className="w-12 h-12 text-slate-700" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60" />
                    
                    {/* Item count badge tag */}
                    <div className="absolute bottom-3 left-4 bg-slate-950/80 px-2.5 py-1 rounded-lg text-[10px] font-mono tracking-wider font-bold text-slate-300 border border-slate-850">
                      COUNT: {item.mediaIds.length} FILES
                    </div>
                  </div>

                  <div className="p-4 flex justify-between items-center my-1">
                    <div>
                      <h3 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors leading-normal">{item.name}</h3>
                      <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">FOLD_ID: {item.id}</span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDeleteTarget({ id: item.id, type: 'ALBUM', name: item.name });
                      }}
                      className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 cursor-pointer transition-colors"
                      title="Delete album folder"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Create album dialog overlay */}
          {showCreateModal && (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-850 rounded-2xl w-full max-w-sm p-6 relative">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="absolute top-4 right-4 text-slate-500 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                <form onSubmit={handleCreateAlbum} className="space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-white">Create Album Folder</h3>
                    <p className="text-xs text-slate-500 font-light mt-0.5">Organize multiple photos or videos under a single title.</p>
                  </div>

                  {errorMsg && (
                    <div className="text-red-400 text-xs font-mono bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">
                      {errorMsg}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-400">Album Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Summer Beach Trip 2024"
                      value={newAlbumName}
                      onChange={e => setNewAlbumName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-650 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="flex gap-3 justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="bg-slate-850 hover:bg-slate-800 text-slate-400 px-4 py-2 rounded-xl text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={creating}
                      className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-medium shadow-md shadow-blue-500/10 disabled:opacity-50"
                    >
                      {creating ? 'Creating...' : 'Create Folder'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
          {/* IMMERSIVE LIGHTBOX LIGHT OVERLAY */}
          {lightboxIndex !== null && albumMedia[lightboxIndex] && (() => {
            const currentItem = albumMedia[lightboxIndex];
            return (
              <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex flex-col justify-between p-4 md:p-6 animate-fadeIn">
                {/* Top toolbar header info */}
                <div className="flex items-center justify-between w-full text-slate-300 mb-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-blue-400 font-mono tracking-widest uppercase mb-0.5">{currentItem.type} SPECIFICATION</span>
                    <h3 className="text-sm font-bold text-white max-w-sm md:max-w-md truncate">{currentItem.name}</h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-slate-900 border border-slate-800 px-2 py-1 rounded text-slate-400 font-mono">
                      {(currentItem.size / (1024 * 1024)).toFixed(2)} MB
                    </span>
                    <button
                      onClick={() => setLightboxIndex(null)}
                      className="bg-slate-900/85 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white p-2 rounded-full cursor-pointer transition-all"
                      title="Exit playback"
                    >
                      <X className="w-5 h-5 animate-pulse" />
                    </button>
                  </div>
                </div>

                {/* Main visual theater with pagination side tabs */}
                <div className="flex-1 flex items-center justify-center relative my-2 px-10">
                  {/* Left toggle button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxIndex(prev => (prev !== null ? (prev - 1 + albumMedia.length) % albumMedia.length : null));
                    }}
                    className="absolute left-2 bg-slate-900/70 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white p-3 rounded-full cursor-pointer transition-all active:scale-95 animate-fadeIn"
                  >
                    <ArrowLeft className="w-6 h-6" />
                  </button>

                  <div className="max-w-full max-h-[75vh] flex items-center justify-center select-none">
                    {currentItem.type === 'PHOTO' ? (
                      <img
                        src={currentItem.fileUrl}
                        alt={currentItem.name}
                        className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-2xl animate-scaleUp"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <video
                        src={currentItem.fileUrl}
                        controls
                        autoPlay
                        className="max-w-full max-h-[75vh] rounded-xl shadow-2xl"
                      />
                    )}
                  </div>

                  {/* Right toggle button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxIndex(prev => (prev !== null ? (prev + 1) % albumMedia.length : null));
                    }}
                    className="absolute right-2 bg-slate-900/70 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white p-3 rounded-full cursor-pointer transition-all active:scale-95 animate-fadeIn"
                  >
                    <ArrowRight className="w-6 h-6" />
                  </button>
                </div>

                {/* Footer status tracker */}
                <div className="text-center text-[10px] font-mono text-slate-500 py-1">
                  PREVIEW {lightboxIndex + 1} OF {albumMedia.length} ITEMS • SHAMCLOUD ENCRYPTED RECORD
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* CUSTOM CONFIRMATION WARNING MODAL */}
      {confirmDeleteTarget && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-[#ef4444]/25 rounded-2xl w-full max-w-sm p-6 relative shadow-2xl animate-scaleUp">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 text-red-100 rounded-full flex items-center justify-center mx-auto animate-bounce">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-white">Confirm Removal</h3>
                <p className="text-xs text-slate-400 leading-normal font-light">
                  {confirmDeleteTarget.type === 'ALBUM' || confirmDeleteTarget.type === 'ALBUM_CURRENT' ? (
                    <>Are you sure you want to delete the album folder <strong className="text-red-400 font-semibold">{confirmDeleteTarget.name}</strong>? All digital collections inside will remain intact in your primary media vault feed.</>
                  ) : (
                    <>Are you sure you want to remove <strong className="text-red-400 font-semibold">{confirmDeleteTarget.name}</strong> from this album folder? The file will still persist in your primary media gallery vault.</>
                  )}
                </p>
              </div>

              <div className="flex gap-3 justify-center pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteTarget(null)}
                  className="bg-slate-850 hover:bg-slate-800 text-slate-400 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                >
                  Dismiss
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const { id, type } = confirmDeleteTarget;
                    setConfirmDeleteTarget(null);
                    
                    if (type === 'ALBUM' || type === 'ALBUM_CURRENT') {
                      await handleDeleteAlbum(id);
                    } else if (type === 'REMOVE_FROM_ALBUM') {
                      await handleRemoveMediaFromAlbum(id);
                    }
                  }}
                  className="bg-red-600 hover:bg-red-500 text-white px-5 py-2.5 rounded-xl text-xs font-semibold cursor-pointer shadow-lg shadow-red-600/10 transition-colors"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
