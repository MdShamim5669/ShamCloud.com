import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, Filter, Trash2, ArrowUpCircle, Folder, Plus, X, Video, Image as ImageIcon,
  HardDrive, RefreshCw, FileText, CheckCircle2, AlertTriangle, RotateCcw, ShieldAlert, Sparkles, FolderPlus, Info,
  ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Maximize2, ArrowUpDown, Heart
} from 'lucide-react';
import type { User, Media, Album } from '../types';
import StorageTrendChart from './StorageTrendChart';

interface DashboardProps {
  currentUser: User;
  media: Media[];
  albums: Album[];
  onRefreshData: () => void;
  onNavigateToAlbums: () => void;
  onNavigateToSubscription: () => void;
}

export default function Dashboard({ 
  currentUser, media, albums, onRefreshData, onNavigateToAlbums, onNavigateToSubscription 
}: DashboardProps) {
  const [activeTab, setActiveTab] = useState<'GALLERY' | 'FAVORITES' | 'TRASH'>('GALLERY');
  const [filterType, setFilterType] = useState<'ALL' | 'PHOTO' | 'VIDEO'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size'>('date');

  // Filter available files belonging to current tab Mode and apply sorting
  const tabMedia = media.filter(m => {
    const matchesTab = activeTab === 'GALLERY' 
      ? !m.isDeleted 
      : activeTab === 'FAVORITES' 
        ? (!m.isDeleted && m.isFavorite) 
        : m.isDeleted;
    const matchesQuery = (() => {
      const query = searchQuery.trim().toLowerCase();
      if (!query) return true;
      
      const nameMatch = m.name.toLowerCase().includes(query);
      const isoMatch = m.createdAt.toLowerCase().includes(query);
      
      // Compute formatted date strings
      const dateObj = new Date(m.createdAt);
      const localDate = dateObj.toLocaleDateString().toLowerCase();
      
      const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
      const longDate = dateObj.toLocaleDateString(undefined, options).toLowerCase();
      
      return nameMatch || isoMatch || localDate.includes(query) || longDate.includes(query);
    })();
    
    let matchesType = true;
    if (filterType === 'PHOTO') matchesType = m.type === 'PHOTO';
    if (filterType === 'VIDEO') matchesType = m.type === 'VIDEO';

    return matchesTab && matchesQuery && matchesType;
  }).sort((a, b) => {
    if (sortBy === 'name') {
      return a.name.localeCompare(b.name);
    }
    if (sortBy === 'size') {
      return b.size - a.size;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  
  // Drag and drop / upload files state
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [feedback, setSuccessFeedback] = useState<{ type: 'SUCCESS' | 'ERROR'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Expanded file preview overlay state
  const [previewItem, setPreviewItem] = useState<Media | null>(null);

  // Deletion Confirmation Warning Modal State
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteTargetType, setDeleteTargetType] = useState<'TRASH' | 'PERMANENT' | null>(null);

  // Immersive Lightbox View State
  const [activeLightboxIndex, setActiveLightboxIndex] = useState<number | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const handleResetZoom = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(5, prev + 0.5));
  };

  const handleZoomOut = () => {
    setScale(prev => {
      const next = Math.max(1, prev - 0.5);
      if (next === 1) {
        setOffset({ x: 0, y: 0 });
      }
      return next;
    });
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (scale > 1) {
      handleResetZoom();
    } else {
      setScale(2.5);
      setOffset({ x: 0, y: 0 });
    }
  };

  // Panning functionality for Mouse controls
  const handleMouseDown = (e: React.MouseEvent<HTMLImageElement>) => {
    if (scale <= 1) return;
    e.preventDefault();
    setIsPanning(true);
    setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!isPanning || scale <= 1) return;
    e.preventDefault();
    setOffset({
      x: e.clientX - panStart.x,
      y: e.clientY - panStart.y
    });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Touch device support for zoom and pan
  const handleTouchStart = (e: React.TouchEvent<HTMLImageElement>) => {
    if (scale <= 1 || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setIsPanning(true);
    setPanStart({ x: touch.clientX - offset.x, y: touch.clientY - offset.y });
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLImageElement>) => {
    if (!isPanning || scale <= 1 || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setOffset({
      x: touch.clientX - panStart.x,
      y: touch.clientY - panStart.y
    });
  };

  const handleTouchEnd = () => {
    setIsPanning(false);
  };

  const handlePrev = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    handleResetZoom();
    setActiveLightboxIndex(prev => {
      if (prev === null) return null;
      return (prev - 1 + tabMedia.length) % tabMedia.length;
    });
  };

  const handleNext = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    handleResetZoom();
    setActiveLightboxIndex(prev => {
      if (prev === null) return null;
      return (prev + 1) % tabMedia.length;
    });
  };

  // Keyboard navigation binding (ArrowLeft, ArrowRight, Escape)
  useEffect(() => {
    if (activeLightboxIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveLightboxIndex(null);
        handleResetZoom();
      } else if (e.key === 'ArrowRight') {
        handleResetZoom();
        setActiveLightboxIndex(prev => {
          if (prev === null) return null;
          return (prev + 1) % tabMedia.length;
        });
      } else if (e.key === 'ArrowLeft') {
        handleResetZoom();
        setActiveLightboxIndex(prev => {
          if (prev === null) return null;
          return (prev - 1 + tabMedia.length) % tabMedia.length;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeLightboxIndex, tabMedia.length]);

  const photoCount = media.filter(m => m.type === 'PHOTO' && !m.isDeleted).length;
  const videoCount = media.filter(m => m.type === 'VIDEO' && !m.isDeleted).length;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    setSuccessFeedback(null);
    setUploadProgress(20);

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploadProgress(50);
      const response = await fetch("/api/media/upload", {
        method: "POST",
        headers: {
          "x-user-email": currentUser.email
        },
        body: formData
      });

      setUploadProgress(90);
      const data = await response.json();
      if (response.ok) {
        setSuccessFeedback({
          type: 'SUCCESS',
          text: `File '${file.name}' digitized and archived successfully!`
        });
        onRefreshData();
      } else {
        setSuccessFeedback({
          type: 'ERROR',
          text: data.message || "Upload failed. Please try again."
        });
      }
    } catch (err) {
      setSuccessFeedback({
        type: 'ERROR',
        text: "Network error occurred."
      });
    } finally {
      setUploading(false);
      setUploadProgress(null);
      setTimeout(() => setSuccessFeedback(null), 5000);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadFile(e.target.files[0]);
    }
  };

  const triggerDeleteConfirmation = (mediaId: string, type: 'TRASH' | 'PERMANENT', e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setDeleteTargetId(mediaId);
    setDeleteTargetType(type);
  };

  const handleToggleFavorite = async (mediaId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    try {
      const response = await fetch(`/api/media/${mediaId}/favorite`, {
        method: "POST",
        headers: {
          "x-user-email": currentUser.email
        }
      });
      if (response.ok) {
        onRefreshData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMoveToTrash = async (mediaId: string) => {
    try {
      const response = await fetch(`/api/media/${mediaId}`, {
        method: "DELETE",
        headers: {
          "x-user-email": currentUser.email
        }
      });
      if (response.ok) {
        onRefreshData();
        if (previewItem && previewItem.id === mediaId) {
          setPreviewItem(null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRestoreFromTrash = async (mediaId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await fetch(`/api/media/${mediaId}/restore`, {
        method: "POST",
        headers: {
          "x-user-email": currentUser.email
        }
      });
      if (response.ok) {
        onRefreshData();
        if (previewItem && previewItem.id === mediaId) {
          setPreviewItem(null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePermanentDestroy = async (mediaId: string) => {
    try {
      const response = await fetch(`/api/media/${mediaId}/permanent`, {
        method: "DELETE",
        headers: {
          "x-user-email": currentUser.email
        }
      });
      if (response.ok) {
        onRefreshData();
        if (previewItem && previewItem.id === mediaId) {
          setPreviewItem(null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const confirmDeleteAction = async () => {
    if (!deleteTargetId || !deleteTargetType) return;
    if (deleteTargetType === 'TRASH') {
      await handleMoveToTrash(deleteTargetId);
    } else {
      await handlePermanentDestroy(deleteTargetId);
    }
    setDeleteTargetId(null);
    setDeleteTargetType(null);
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
    <div id="dashboard-container" className="space-y-8 max-w-7xl mx-auto py-4 font-sans text-slate-100">
      
      {/* 1. Dashboard Overview Metrics Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Metric Card: Photos */}
        <div className="bg-slate-900/40 border border-slate-850 p-6 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 font-mono tracking-wider uppercase">Secure Photos</span>
            <span className="text-3xl font-display font-bold text-slate-100 block mt-1">{photoCount}</span>
            <span className="text-[10px] text-slate-400 block font-light">Original resolution photos saved</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/15 shrink-0">
            <ImageIcon className="w-6 h-6" />
          </div>
        </div>

        {/* Metric Card: Videos */}
        <div className="bg-slate-900/40 border border-slate-850 p-6 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 font-mono tracking-wider uppercase">Active Videos</span>
            <span className="text-3xl font-display font-bold text-slate-100 block mt-1">{videoCount}</span>
            <span className="text-[10px] text-slate-400 block font-light">Playable video streams stored</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/15 shrink-0">
            <Video className="w-6 h-6" />
          </div>
        </div>

        {/* Metric Card: System Storage Allocation */}
        <div className="bg-slate-900/40 border border-slate-850 p-6 rounded-2xl flex flex-col justify-center gap-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-slate-350">
              <HardDrive className="w-4 h-4 text-slate-400" />
              <span className="font-semibold uppercase tracking-wider text-slate-400 text-[10px]">Cloud Space</span>
            </div>
            
            {currentUser.role === 'USER' && (
              <button 
                onClick={onNavigateToSubscription}
                className="text-[10px] font-bold text-blue-400 hover:text-blue-300 font-mono flex items-center gap-1"
              >
                UPGRADE LIMIT
              </button>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-baseline text-xs font-mono">
              <span className="text-slate-100 font-bold">{formatSize(currentUser.storageUsed)}</span>
              <span className="text-slate-500">of {formatSize(currentUser.storageLimit)}</span>
            </div>
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${
                  storagePercentage > 85 ? 'bg-red-500' : 'bg-blue-500'
                }`}
                style={{ width: `${storagePercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Storage growth tracking with a custom D3 graph */}
      <StorageTrendChart currentUser={currentUser} media={media} />

      {/* 2. Drag & Drop File Upload Center */}
      <div 
        id="uploader-drop-zone"
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-3xl p-10 text-center relative transition-all duration-200 overflow-hidden ${
          dragActive 
            ? 'border-blue-500 bg-blue-500/5' 
            : 'border-slate-850 bg-slate-900/15 hover:border-slate-750 hover:bg-slate-900/20'
        }`}
      >
        <input 
          ref={fileInputRef}
          type="file" 
          id="file-element-uploader" 
          className="hidden" 
          onChange={handleFileInput}
          accept="image/*,video/*"
        />

        {uploading ? (
          <div className="space-y-4 max-w-sm mx-auto">
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
            <div>
              <p className="text-xs text-slate-300 font-medium">Uploading and digitizing file securely...</p>
              <div className="h-1.5 w-full bg-slate-800/80 rounded-full mt-3 overflow-hidden">
                <div 
                  className="h-full bg-blue-500 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress || 10}%` }}
                />
              </div>
            </div>
          </div>
        ) : (
          <label htmlFor="file-element-uploader" className="cursor-pointer space-y-4 block">
            <div className="w-12 h-12 rounded-2xl bg-slate-850/80 mx-auto flex items-center justify-center text-slate-400 group-hover:text-slate-50 transition-colors">
              <ArrowUpCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-100 font-sans tracking-wide">Drag & drop files here to upload or <span className="text-blue-400 hover:text-blue-300 underline font-medium">Browse Files</span></p>
              <p className="text-[11px] text-slate-400 font-mono mt-1 font-light">Supports high-res JPG, PNG, WEBP, and MP4 files up to 100 MB.</p>
            </div>
          </label>
        )}

        {feedback && (
          <div className={`mt-4 max-w-md mx-auto p-3 rounded-xl border text-xs flex items-center justify-center gap-2 ${
            feedback.type === 'SUCCESS' 
              ? 'bg-green-500/10 text-green-400 border-green-500/20' 
              : 'bg-red-500/10 text-red-00 border-red-500/20'
          }`}>
            {feedback.type === 'SUCCESS' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>{feedback.text}</span>
          </div>
        )}
      </div>

      {/* 3. Media Grid Filtering & Navigation Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-900 pb-5">
        
        {/* Gallery / Trash tabs */}
        <div className="flex gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-900 shrink-0">
          <button
            onClick={() => { setActiveTab('GALLERY'); setFilterType('ALL'); }}
            className={`px-4 py-2 text-xs font-semibold rounded-lg font-mono flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'GALLERY' ? 'bg-slate-900 text-slate-100 border border-slate-800' : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            Active Archival
          </button>

          <button
            onClick={() => { setActiveTab('FAVORITES'); setFilterType('ALL'); }}
            className={`px-4 py-2 text-xs font-semibold rounded-lg font-mono flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'FAVORITES' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/25' : 'text-slate-400 hover:text-rose-500'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 transition-all ${activeTab === 'FAVORITES' ? 'fill-rose-500 text-rose-500' : 'text-slate-405 group-hover:text-rose-500'}`} />
            Favorites {media.filter(m => !m.isDeleted && m.isFavorite).length > 0 && `(${media.filter(m => !m.isDeleted && m.isFavorite).length})`}
          </button>
          
          <button
            onClick={() => { setActiveTab('TRASH'); setFilterType('ALL'); }}
            className={`px-4 py-2 text-xs font-semibold rounded-lg font-mono flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'TRASH' ? 'bg-red-500/10 text-red-500 border border-red-500/25' : 'text-slate-400 hover:text-red-500'
            }`}
          >
            Trash Bin {media.filter(m => m.isDeleted).length > 0 && <span className="w-2 h-2 rounded-full bg-red-500 inline-block animate-ping bg-red-500" />}
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          
          {/* Text search */}
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-850 px-3.5 py-2.5 rounded-xl text-xs w-full sm:w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search name or date..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-transparent text-slate-100 placeholder-slate-500 w-full focus:outline-none"
            />
          </div>

          {/* Sorting Selection Dropdown */}
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-850 px-3.5 py-2.5 rounded-xl text-xs text-slate-400 focus-within:border-slate-750 transition-colors w-full sm:w-auto">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
            <select
              id="dashboard-sort-select"
              value={sortBy}
              onChange={e => setSortBy(e.target.value as 'date' | 'name' | 'size')}
              className="bg-transparent text-slate-100 focus:outline-none cursor-pointer text-xs font-mono font-bold pr-1 appearance-none sm:pr-8"
              style={{ backgroundPosition: 'right center', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundSize: '12px' }}
            >
              <option value="date" className="bg-slate-900 text-slate-100">Sort: Date Uploaded</option>
              <option value="name" className="bg-slate-900 text-slate-100">Sort: Name (A-Z)</option>
              <option value="size" className="bg-slate-900 text-slate-100">Sort: Size</option>
            </select>
          </div>

          {/* Filtering types */}
          <div className="flex rounded-xl bg-slate-950 border border-slate-900 p-1 text-xs">
            {(['ALL', 'PHOTO', 'VIDEO'] as const).map(t => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-3.5 py-1.5 rounded-lg font-mono text-[10px] font-bold cursor-pointer transition-colors ${
                  filterType === t ? 'bg-slate-900 border border-slate-850 text-slate-100' : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Active files Grid */}
      <div>
        {tabMedia.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/10 border border-slate-850 rounded-2xl max-w-xl mx-auto space-y-4">
            <div className="w-12 h-12 rounded-full bg-slate-800/40 flex items-center justify-center text-slate-500 mx-auto">
              {activeTab === 'FAVORITES' ? (
                <Heart className="w-6 h-6 text-rose-500 fill-rose-500" />
              ) : (
                <ImageIcon className="w-6 h-6" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-350">
                {activeTab === 'GALLERY' 
                  ? "No files categorized yet" 
                  : activeTab === 'FAVORITES'
                    ? "No favorites marked yet"
                    : "No deleted files in trash"}
              </h3>
              <p className="text-slate-500 text-xs font-light mt-1">
                {activeTab === 'GALLERY' 
                  ? "Upload photos or video files using the drag-uploader to begin your safe preservation." 
                  : activeTab === 'FAVORITES'
                    ? "Click the heart icon on any photo or video in your gallery to keep your most treasured memories handy."
                    : "All deleted photos or videos residing in trash are permanently purged after 30 days."}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {tabMedia.map(item => (
              <div 
                key={item.id}
                className={`bg-slate-900/40 border rounded-2xl overflow-hidden group transition-all hover:bg-slate-905 flex flex-col justify-between relative ${
                  (activeTab === 'GALLERY' || activeTab === 'FAVORITES') ? 'border-slate-850 hover:border-slate-800' : 'border-red-500/20 hover:border-red-500/40 bg-red-950/[0.02]'
                }`}
              >
                <div 
                  onClick={() => {
                    const itemIndex = tabMedia.findIndex(m => m.id === item.id);
                    setActiveLightboxIndex(itemIndex !== -1 ? itemIndex : 0);
                  }}
                  className="aspect-[4/3] bg-slate-1050 flex items-center justify-center relative overflow-hidden cursor-zoom-in"
                >
                  {item.type === 'PHOTO' ? (
                    <>
                      <img 
                        src={item.fileUrl} 
                        alt={item.name} 
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500" 
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-slate-950/35 transition-colors duration-300 flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-90 group-hover:scale-100 bg-slate-900/95 border border-slate-850 text-white p-2.5 rounded-full shadow-lg">
                          <ZoomIn className="w-4 h-4 text-blue-400" />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="relative w-full h-full">
                      <video 
                        src={item.fileUrl} 
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500" 
                        preload="metadata"
                      />
                      <div className="absolute inset-0 bg-slate-950/40 group-hover:bg-slate-950/20 transition-colors duration-300 flex items-center justify-center">
                        <Video className="w-8 h-8 text-white/50 group-hover:scale-110 transition-transform duration-300" />
                      </div>
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-slate-950/35 transition-colors duration-300 flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-90 group-hover:scale-100 bg-slate-900/95 border border-slate-850 text-white p-2.5 rounded-full shadow-lg">
                          <Maximize2 className="w-4 h-4 text-indigo-400" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Actions overlay panel */}
                  <div className="absolute top-2 right-2 flex gap-1 z-20" onClick={e => e.stopPropagation()}>
                    {(activeTab === 'GALLERY' || activeTab === 'FAVORITES') ? (
                      <>
                        <button
                          onClick={(e) => handleToggleFavorite(item.id, e)}
                          className="bg-slate-950/80 hover:bg-rose-500/20 border border-slate-850 rounded-lg p-1.5 transition-colors cursor-pointer flex items-center justify-center"
                          title={item.isFavorite ? "Remove from Favorites" : "Add to Favorites"}
                        >
                          <Heart className={`w-3.5 h-3.5 ${item.isFavorite ? "fill-rose-500 text-rose-500" : "text-slate-400 hover:text-rose-450 text-slate-400"}`} />
                        </button>
                        <button
                          onClick={(e) => triggerDeleteConfirmation(item.id, 'TRASH', e)}
                          className="bg-slate-950/80 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-850 rounded-lg p-1.5 transition-colors cursor-pointer flex items-center justify-center"
                          title="Move to Trash"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={(e) => handleRestoreFromTrash(item.id, e)}
                          className="bg-slate-950/80 hover:bg-green-500/20 text-slate-400 hover:text-green-400 border border-slate-850 rounded-lg p-1.5 transition-colors cursor-pointer"
                          title="Restore back to gallery"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Restore
                        </button>
                        <button
                          onClick={(e) => triggerDeleteConfirmation(item.id, 'PERMANENT', e)}
                          className="bg-slate-950/80 hover:bg-red-600 text-slate-400 hover:text-white border border-slate-850 rounded-lg p-1.5 transition-colors cursor-pointer"
                          title="Erase permanently"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div 
                  onClick={() => setPreviewItem(item)}
                  className="p-3.5 bg-slate-950/35 border-t border-slate-900 flex justify-between items-baseline gap-2 cursor-pointer hover:bg-slate-900/50 transition-colors"
                >
                  <span className="text-xs font-semibold text-slate-200 truncate leading-normal" title={item.name}>
                    {item.name}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono shrink-0 select-none uppercase">
                    {item.type}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. Expanded Media Viewer Modal detail pane */}
      {previewItem && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-850 rounded-3xl w-full max-w-4xl p-6 relative flex flex-col md:flex-row gap-6 max-h-[90vh] overflow-y-auto">
            {/* Close button */}
            <button 
              onClick={() => setPreviewItem(null)}
              className="absolute top-4 right-4 bg-slate-950/60 text-slate-400 hover:text-white p-2 rounded-full cursor-pointer z-20 border border-slate-850"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Visual Box */}
            <div 
              onClick={() => {
                const itemIndex = tabMedia.findIndex(m => m.id === previewItem.id);
                setActiveLightboxIndex(itemIndex !== -1 ? itemIndex : 0);
              }}
              className="flex-1 bg-slate-950 rounded-2xl flex items-center justify-center p-2 border border-slate-900 min-h-[250px] max-h-[500px] overflow-hidden cursor-zoom-in relative group"
            >
              {previewItem.type === 'PHOTO' ? (
                <>
                  <img 
                    src={previewItem.fileUrl} 
                    alt={previewItem.name} 
                    className="max-w-full max-h-[480px] object-contain rounded-xl select-none"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-slate-950/25 transition-all duration-300 flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 bg-slate-900/95 border border-slate-800 px-3.5 py-2 rounded-xl text-xs font-mono font-bold text-blue-400 shadow-xl flex items-center gap-2">
                      <ZoomIn className="w-4 h-4 text-blue-400" />
                      EXPAND AND INSPECT WITH ZOOM
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <video 
                    src={previewItem.fileUrl} 
                    className="max-w-full max-h-[480px] rounded-xl" 
                  />
                  <div className="absolute inset-0 bg-black/20 hover:bg-slate-950/30 transition-all duration-300 flex items-center justify-center">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        const itemIndex = tabMedia.findIndex(m => m.id === previewItem.id);
                        setActiveLightboxIndex(itemIndex !== -1 ? itemIndex : 0);
                      }}
                      className="bg-slate-900/95 border border-slate-800 text-indigo-400 text-xs font-mono font-bold px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-slate-800 transition-colors shadow-xl cursor-pointer"
                    >
                      <Maximize2 className="w-4 h-4 text-indigo-450 animate-pulse" />
                      IMMERSIVE PLAYBACK THEATER
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Details Panel Sidebar */}
            <div className="w-full md:w-[280px] flex flex-col justify-between shrink-0 space-y-6">
              <div className="space-y-4">
                <div className="space-y-1">
                  <span className="bg-slate-850 px-2 py-0.5 rounded text-[10px] font-mono tracking-widest font-bold text-blue-400 border border-slate-800 inline-block uppercase select-none">
                    {previewItem.type}
                  </span>
                  <h3 className="text-base font-bold text-white leading-snug break-all">{previewItem.name}</h3>
                </div>

                <hr className="border-slate-850" />

                <div className="space-y-3 font-mono text-[11px] text-slate-400">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Node File size:</span>
                    <span className="text-slate-300 font-semibold">{formatSize(previewItem.size)}</span>
                  </div>

                  <div className="flex justify-between items-center pt-1">
                    <span className="text-slate-500">Mime-type:</span>
                    <span className="text-slate-350 truncate max-w-[150px]">{previewItem.mimeType}</span>
                  </div>

                  <div className="flex justify-between items-center pt-1">
                    <span className="text-slate-500">Archived on:</span>
                    <span className="text-slate-300">{new Date(previewItem.createdAt).toLocaleDateString()}</span>
                  </div>

                  <div className="flex justify-between items-center pt-1">
                    <span className="text-slate-500">Doc ID:</span>
                    <span className="text-slate-500 select-all">{previewItem.id}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons inside overlay */}
              <div className="space-y-2">
                {(activeTab === 'GALLERY' || activeTab === 'FAVORITES') && (
                  <button
                    onClick={(e) => {
                      handleToggleFavorite(previewItem.id, e);
                      setPreviewItem(prev => prev ? { ...prev, isFavorite: !prev.isFavorite } : null);
                    }}
                    className={`w-full py-2.5 border text-xs font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                      previewItem.isFavorite 
                        ? 'bg-rose-500/10 hover:bg-rose-500 border-rose-500/25 text-rose-100 hover:text-white' 
                        : 'bg-slate-950/60 hover:bg-slate-850 border-slate-850 text-slate-300 hover:text-white'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${previewItem.isFavorite ? "fill-rose-500 text-rose-500" : ""}`} />
                    {previewItem.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                  </button>
                )}
                
                {(activeTab === 'GALLERY' || activeTab === 'FAVORITES') ? (
                  <button
                    onClick={(e) => triggerDeleteConfirmation(previewItem.id, 'TRASH', e)}
                    className="w-full py-2.5 bg-red-500/10 hover:bg-red-500 border border-red-500/25 text-red-100 hover:text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Move Folder to Trash
                  </button>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={(e) => handleRestoreFromTrash(previewItem.id, e)}
                      className="py-2.5 bg-green-500/10 hover:bg-green-500 text-green-400 hover:text-white border border-green-500/20 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Restore
                    </button>
                    <button
                      onClick={(e) => triggerDeleteConfirmation(previewItem.id, 'PERMANENT', e)}
                      className="py-2.5 bg-slate-850 hover:bg-red-600 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Destroy
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. IMMERSIVE FULL-SCREEN MEDIA LIGHTBOX WITH SMOOTH DRAG & ZOOM */}
      {activeLightboxIndex !== null && tabMedia[activeLightboxIndex] && (() => {
        const item = tabMedia[activeLightboxIndex];
        return (
          <div 
            id="immersive-media-lightbox" 
            className="fixed inset-0 bg-black/98 z-[60] flex flex-col justify-between select-none backdrop-blur-md animate-fade-in"
            onClick={() => {
              setActiveLightboxIndex(null);
              handleResetZoom();
            }}
          >
            {/* Header: Metadata & close button */}
            <header 
              className="flex items-center justify-between px-6 py-4 bg-gradient-to-b from-black/90 to-transparent absolute top-0 left-0 right-0 z-50"
              onClick={e => e.stopPropagation()}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="bg-slate-900 h-5 px-1.5 rounded border border-slate-800 text-[9px] font-mono tracking-widest font-bold text-blue-400 uppercase flex items-center">
                    {item.type}
                  </span>
                  <span className="text-white text-xs font-semibold max-w-[200px] sm:max-w-md truncate block" title={item.name}>
                    {item.name}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 font-mono tracking-wide">
                  INDEX: {activeLightboxIndex + 1} OF {tabMedia.length} &bull; SIZE: {formatSize(item.size)}
                </p>
              </div>

              <div className="flex items-center gap-3">
                {(activeTab === 'GALLERY' || activeTab === 'FAVORITES') && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFavorite(item.id);
                    }}
                    className={`p-2 rounded-xl transition-all border cursor-pointer hover:bg-slate-800 ${
                      item.isFavorite 
                        ? 'bg-rose-950/50 border-rose-800 text-rose-400' 
                        : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                    title={item.isFavorite ? "Remove from Favorites" : "Add to Favorites"}
                  >
                    <Heart className={`w-4 h-4 ${item.isFavorite ? "fill-rose-500 text-rose-500" : ""}`} />
                  </button>
                )}

                <button
                  onClick={() => {
                    setActiveLightboxIndex(null);
                    handleResetZoom();
                  }}
                  className="bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white p-2 rounded-xl transition-all border border-slate-800 cursor-pointer"
                  title="Close Lightbox (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </header>

            {/* Left controller arrow */}
            {tabMedia.length > 1 && (
              <button
                onClick={handlePrev}
                className="absolute left-6 top-1/2 -translate-y-1/2 bg-slate-900/60 hover:bg-slate-800/80 text-white/70 hover:text-white p-3.5 rounded-full transition-all border border-slate-800/50 cursor-pointer z-50 flex items-center justify-center shadow-xl hover:scale-105 active:scale-95"
                title="Previous Memory (Left Arrow)"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            {/* Main view container where dragging and zoom happen */}
            <div 
              className="flex-1 flex items-center justify-center p-4 overflow-hidden w-full h-full relative"
              style={{ cursor: scale > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default' }}
            >
              {item.type === 'PHOTO' ? (
                <div 
                  className="relative select-none max-w-full max-h-[85vh] flex items-center justify-center"
                  onClick={e => e.stopPropagation()} // stop close modal trigger
                >
                  <img
                    src={item.fileUrl}
                    alt={item.name}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onDoubleClick={handleDoubleClick}
                    className="max-w-full max-h-[85vh] object-contain rounded-xl select-none pointer-events-auto"
                    style={{
                      transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                      transition: isPanning ? 'none' : 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                      transformOrigin: 'center center',
                    }}
                    referrerPolicy="no-referrer"
                    draggable={false}
                  />
                </div>
              ) : (
                <div 
                  className="relative max-w-4xl max-h-[80vh] w-full flex items-center justify-center p-2 bg-black rounded-2xl border border-slate-900"
                  onClick={e => e.stopPropagation()}
                >
                  <video
                    src={item.fileUrl}
                    controls
                    autoPlay
                    className="max-w-full max-h-[75vh] rounded-xl shadow-2xl"
                  />
                </div>
              )}
            </div>

            {/* Right controller arrow */}
            {tabMedia.length > 1 && (
              <button
                onClick={handleNext}
                className="absolute right-6 top-1/2 -translate-y-1/2 bg-slate-900/60 hover:bg-slate-800/80 text-white/70 hover:text-white p-3.5 rounded-full transition-all border border-slate-800/50 cursor-pointer z-50 flex items-center justify-center shadow-xl hover:scale-105 active:scale-95"
                title="Next Memory (Right Arrow)"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}

            {/* Footer with zoom action elements */}
            {item.type === 'PHOTO' && (
              <footer 
                className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 border border-slate-800/85 backdrop-blur-md px-6 py-3 rounded-full flex items-center gap-6 shadow-2xl transition-all max-w-[90vw]"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleZoomOut}
                    disabled={scale <= 1}
                    className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>

                  <span className="text-[11px] font-mono font-bold text-slate-300 min-w-[50px] text-center select-none bg-slate-950 border border-slate-850 px-2.5 py-1 rounded-md">
                    {Math.round(scale * 100)}%
                  </span>

                  <button
                    onClick={handleZoomIn}
                    disabled={scale >= 5}
                    className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>

                <div className="w-px h-5 bg-slate-800" />

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleResetZoom}
                    disabled={scale === 1 && offset.x === 0 && offset.y === 0}
                    className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    title="Reset Fit (Double Click Image)"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  <a
                    href={item.fileUrl}
                    download={item.name}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer flex items-center justify-center"
                    title="Download original file"
                  >
                    <FileText className="w-4 h-4" />
                  </a>
                </div>
              </footer>
            )}

            {/* Double click instruction watermark helper label */}
            {item.type === 'PHOTO' && scale === 1 && (
              <div 
                className="absolute bottom-6 left-6 text-[10px] text-slate-500 font-mono tracking-wider hidden md:block select-none pointer-events-none"
                onClick={e => e.stopPropagation()}
              >
                PRO TIP: DOUBLE-CLICK TO QUICK-ZOOM / DRAG TO PAN
              </div>
            )}
          </div>
        );
      })()}

      {/* 7. SECURE DELETION SAFETY CONFIRMATION WARNING POPUP MODAL */}
      {deleteTargetId !== null && (() => {
        const targetMedia = media.find(m => m.id === deleteTargetId);
        if (!targetMedia) return null;
        return (
          <div 
            id="confirm-delete-modal"
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-fade-in animate-duration-150"
            onClick={() => {
              setDeleteTargetId(null);
              setDeleteTargetType(null);
            }}
          >
            <div 
              className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 relative shadow-2xl space-y-5 animate-scale-up"
              onClick={e => e.stopPropagation()}
            >
              {/* Header Icon & Title */}
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-2xl bg-red-500/10 text-red-400 border border-red-500/15 shrink-0">
                  <ShieldAlert className="w-6 h-6 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white tracking-tight">
                    {deleteTargetType === 'TRASH' ? 'Move File to Trash?' : 'Permanently Destroy File?'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {deleteTargetType === 'TRASH' 
                      ? 'Are you sure you want to move this file to the trash bin? It can be restored later.' 
                      : 'This action is completely IRREVERSIBLE. It will be permanently removed from physical storage.'}
                  </p>
                </div>
              </div>

              {/* Target File Card Preview Info */}
              <div className="bg-slate-1050 rounded-2xl p-3 border border-slate-850 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-900 overflow-hidden flex items-center justify-center border border-slate-800 shrink-0">
                  {targetMedia.type === 'PHOTO' ? (
                    <img 
                      src={targetMedia.fileUrl} 
                      alt="" 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <Video className="w-5 h-5 text-indigo-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-100 truncate" title={targetMedia.name}>
                    {targetMedia.name}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono uppercase mt-0.5">
                    {targetMedia.type} &bull; {formatSize(targetMedia.size)}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setDeleteTargetId(null);
                    setDeleteTargetType(null);
                  }}
                  className="flex-1 py-2.5 bg-slate-950 hover:bg-slate-850 border border-slate-850 text-slate-300 hover:text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  No, Cancel
                </button>
                <button
                  onClick={confirmDeleteAction}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-colors shadow-lg shadow-red-600/10 cursor-pointer"
                >
                  Yes, Confirm Delete
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
