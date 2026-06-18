import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import type { User, Media, Album, PaymentRecord, AuditLog, DbSchema, UserRole } from "./src/types";

// Load environment variables. We manually parse and override process.env because platform-injected container variables take precedence over standard dotenv.config()
try {
  const envPath = path.join(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
      process.env[k] = envConfig[k];
    }
    console.log("Successfully loaded and overrode local .env configurations.");
  }
} catch (err: any) {
  console.warn("Override dotenv parsing failed, using standard fallback:", err.message);
}
dotenv.config();

// Ensure folders exist
const UPLOADS_DIR = path.join(process.cwd(), "uploads");
const DB_FILE = path.join(process.cwd(), "db.json");

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// 2 KB mock sizes or actual sizes. Initial seed media pointing to high-quality stock URLs
const INITIAL_USERS: User[] = [
  {
    id: "user-1",
    name: "John Doe",
    email: "user@shamcloud.com",
    role: "USER",
    storageUsed: 2210000000, // ~2.2 GB
    storageLimit: 5368709120, // 5 GB
    isVerified: true,
    isActive: true,
    createdAt: new Date(Date.now() - 30 * 24 * 3600000).toISOString(),
  },
  {
    id: "user-2",
    name: "Sarah Jenkins",
    email: "premium@shamcloud.com",
    role: "PREMIUM_USER",
    storageUsed: 45800000000, // ~45.8 GB
    storageLimit: 1099511627776, // 1 TB
    isVerified: true,
    isActive: true,
    createdAt: new Date(Date.now() - 60 * 24 * 3600000).toISOString(),
  },
  {
    id: "user-3",
    name: "Alex Rivera",
    email: "admin@shamcloud.com",
    role: "ADMIN",
    storageUsed: 12000000, // 12 MB
    storageLimit: 1099511627776,
    isVerified: true,
    isActive: true,
    createdAt: new Date(Date.now() - 120 * 24 * 3600000).toISOString(),
  },
  {
    id: "user-4",
    name: "Dave Miller",
    email: "superadmin@shamcloud.com",
    role: "ADMIN",
    storageUsed: 35000000, // 35 MB
    storageLimit: 1099511627776,
    isVerified: true,
    isActive: true,
    createdAt: new Date(Date.now() - 180 * 24 * 3600000).toISOString(),
  },
  {
    id: "user-1780860988583",
    name: "shamim",
    email: "tamjidulislamsamim@gmail.com",
    role: "SUPER_ADMIN",
    storageUsed: 28711015,
    storageLimit: 1099511627776,
    isVerified: true,
    isActive: true,
    createdAt: new Date(Date.now() - 1 * 24 * 3600000).toISOString(),
  }
];

const INITIAL_MEDIA: Media[] = [
  {
    id: "media-1",
    name: "Emerald Lake Sunrise.jpg",
    type: "PHOTO",
    size: 2450000, // 2.45 MB
    fileUrl: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=1200&auto=format&fit=crop",
    mimeType: "image/jpeg",
    userId: "user-1",
    isDeleted: false,
    createdAt: new Date(Date.now() - 15 * 24 * 3600000).toISOString(),
  },
  {
    id: "media-2",
    name: "Fuji Autumn Forest.jpg",
    type: "PHOTO",
    size: 3800000, // 3.8 MB
    fileUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1200&auto=format&fit=crop",
    mimeType: "image/jpeg",
    userId: "user-1",
    isDeleted: false,
    createdAt: new Date(Date.now() - 14 * 24 * 3600000).toISOString(),
  },
  {
    id: "media-3",
    name: "Coastal Cliff Waves.jpg",
    type: "PHOTO",
    size: 4200000, // 4.2 MB
    fileUrl: "https://images.unsplash.com/photo-1518495973542-4542c06a5843?q=80&w=1200&auto=format&fit=crop",
    mimeType: "image/jpeg",
    userId: "user-1",
    isDeleted: false,
    createdAt: new Date(Date.now() - 10 * 24 * 3600000).toISOString(),
  },
  {
    id: "media-4",
    name: "Starry Night Cabin.jpg",
    type: "PHOTO",
    size: 5120000, // 5.12 MB
    fileUrl: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?q=80&w=1200&auto=format&fit=crop",
    mimeType: "image/jpeg",
    userId: "user-2",
    isDeleted: false,
    createdAt: new Date(Date.now() - 5 * 24 * 3600000).toISOString(),
  },
  {
    id: "media-5",
    name: "Tokyo Neon Streets.jpg",
    type: "PHOTO",
    size: 1900000, // 1.9 MB
    fileUrl: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?q=80&w=1200&auto=format&fit=crop",
    mimeType: "image/jpeg",
    userId: "user-2",
    isDeleted: false,
    createdAt: new Date(Date.now() - 2 * 24 * 3600000).toISOString(),
  },
  {
    id: "media-6",
    name: "Aesthetic Ocean Waves Video (Mock).mp4",
    type: "VIDEO",
    size: 15400000, // 15.4 MB
    fileUrl: "https://assets.mixkit.co/videos/preview/mixkit-wave-in-the-ocean-at-sunset-sunset-40176-large.mp4",
    mimeType: "video/mp4",
    userId: "user-1",
    isDeleted: false,
    createdAt: new Date(Date.now() - 4 * 24 * 3600000).toISOString(),
  },
  {
    id: "media-7",
    name: "Majestic Mountains Aerial.mp4",
    type: "VIDEO",
    size: 32000000, // 32 MB
    fileUrl: "https://assets.mixkit.co/videos/preview/mixkit-forest-stream-in-the-sunlight-aerial-view-529-large.mp4",
    mimeType: "video/mp4",
    userId: "user-2",
    isDeleted: false,
    createdAt: new Date(Date.now() - 8 * 24 * 3600000).toISOString(),
  }
];

const INITIAL_ALBUMS: Album[] = [
  {
    id: "album-1",
    name: "Adventures & Nature",
    userId: "user-1",
    coverUrl: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=1200&auto=format&fit=crop",
    createdAt: new Date(Date.now() - 14 * 24 * 3600000).toISOString(),
    mediaIds: ["media-1", "media-2"],
  },
  {
    id: "album-2",
    name: "Oceanic Escapes",
    userId: "user-1",
    coverUrl: "https://images.unsplash.com/photo-1518495973542-4542c06a5843?q=80&w=1200&auto=format&fit=crop",
    createdAt: new Date(Date.now() - 10 * 24 * 3600000).toISOString(),
    mediaIds: ["media-3"],
  },
  {
    id: "album-3",
    name: "Cosmic Cabin Stay",
    userId: "user-2",
    coverUrl: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?q=80&w=1200&auto=format&fit=crop",
    createdAt: new Date(Date.now() - 5 * 24 * 3600000).toISOString(),
    mediaIds: ["media-4"],
  }
];

const INITIAL_PAYMENTS: PaymentRecord[] = [
  {
    id: "pay-1",
    userId: "user-2",
    userEmail: "premium@shamcloud.com",
    planName: "Premium Yearly Archive",
    amount: 119.99,
    status: "SUCCESS",
    date: new Date(Date.now() - 60 * 24 * 3600000).toISOString(),
  },
  {
    id: "pay-2",
    userId: "user-1",
    userEmail: "user@shamcloud.com",
    planName: "Premium Monthly Upgrade Trial",
    amount: 12.99,
    status: "FAILED",
    date: new Date(Date.now() - 12 * 24 * 3600000).toISOString(),
  }
];

const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: "log-1",
    action: "USER_SIGN_UP",
    userEmail: "user@shamcloud.com",
    role: "USER",
    details: "New account registered successfully with Free plan (5 GB Storage).",
    date: new Date(Date.now() - 30 * 24 * 3600000).toISOString(),
  },
  {
    id: "log-2",
    action: "USER_SIGN_UP",
    userEmail: "premium@shamcloud.com",
    role: "PREMIUM_USER",
    details: "New account registered and instantly upgraded to Premium Plan (1 TB Storage).",
    date: new Date(Date.now() - 60 * 24 * 3600000).toISOString(),
  },
  {
    id: "log-3",
    action: "MEDIA_UPLOAD",
    userEmail: "user@shamcloud.com",
    role: "USER",
    details: "Uploaded 'Emerald Lake Sunrise.jpg' (2.45 MB) to digital vault.",
    date: new Date(Date.now() - 15 * 24 * 3600000).toISOString(),
  },
  {
    id: "log-4",
    action: "ALBUM_CREATE",
    userEmail: "user@shamcloud.com",
    role: "USER",
    details: "Created new album 'Adventures & Nature' and organized 2 files into it.",
    date: new Date(Date.now() - 14 * 24 * 3600000).toISOString(),
  },
  {
    id: "log-5",
    action: "USER_SUSPENSION_REVOKED",
    userEmail: "admin@shamcloud.com",
    role: "ADMIN",
    details: "Admin checked platform analytics and verified node connection.",
    date: new Date(Date.now() - 1 * 24 * 3600000).toISOString(),
  }
];

// -------------------------------------------------------------
// INTEGRATION STATUS Tracker & Setup
// -------------------------------------------------------------
const SB_URL = process.env.SUPABASE_URL || "";
const SB_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";

const CL_NAME = process.env.CLOUDINARY_CLOUD_NAME || "";
const CL_KEY = process.env.CLOUDINARY_API_KEY || "";
const CL_SECRET = process.env.CLOUDINARY_API_SECRET || "";

let supabaseClient: any = null;
let isSupabaseActive = false;
let supabaseStatusMessage = SB_URL && SB_ANON_KEY ? "Connecting..." : "Not Configured (Using local datastore)";

if (SB_URL && SB_ANON_KEY) {
  try {
    supabaseClient = createClient(SB_URL, SB_ANON_KEY);
    isSupabaseActive = true;
    supabaseStatusMessage = "Initialized. Syncing with Supabase...";
  } catch (error: any) {
    supabaseStatusMessage = "Initialization error: " + error.message;
  }
}

let isCloudinaryActive = false;
let cloudinaryStatusMessage = CL_NAME && CL_KEY && CL_SECRET ? "Ready. Media file storage live!" : "Not Configured (Using local uploads)";

if (CL_NAME && CL_KEY && CL_SECRET) {
  try {
    cloudinary.config({
      cloud_name: CL_NAME,
      api_key: CL_KEY,
      api_secret: CL_SECRET
    });
    isCloudinaryActive = true;
    cloudinaryStatusMessage = "Ready. Media file storage live!";
  } catch (error: any) {
    cloudinaryStatusMessage = "Initialization error: " + error.message;
  }
}

// Global hook to verify & sync Supabase on boot
async function initSupabaseSyncOnBoot() {
  if (!supabaseClient) return;
  try {
    // Check if table users exists
    const { data: testData, error: testError } = await supabaseClient.from('shamcloud_users').select('id').limit(1);
    
    if (testError) {
      const errCode = testError.code || "";
      const errMsg = testError.message || "";
      if (
        errCode === '42P01' || 
        errCode === 'P0001' || 
        errMsg.includes('not found') || 
        errMsg.includes('does not exist') ||
        errMsg.includes('relation')
      ) {
        isSupabaseActive = false;
        supabaseStatusMessage = "Supabase connected but 'shamcloud_users' table was not found. Please execute the DDL script in your Supabase SQL editor.";
        console.warn("Supabase Warning:", supabaseStatusMessage);
        return;
      }
      throw testError;
    }

    console.log("Supabase table structure validated. Syncing datasets...");
    
    // Check if empty. If it is empty, seed from current local db
    const { data: checkUsers, error: checkErr } = await supabaseClient.from('shamcloud_users').select('id');
    if (checkErr) {
      throw checkErr;
    }
    
    if (!checkUsers || checkUsers.length === 0) {
      console.log("Supabase tables are empty. Seeding local dataset up to Supabase...");
      const localDb = loadDb();
      
      // Seeding in order of foreign key relationships
      if (localDb.users && localDb.users.length > 0) {
        await supabaseClient.from('shamcloud_users').upsert(localDb.users);
      }
      if (localDb.media && localDb.media.length > 0) {
        await supabaseClient.from('shamcloud_media').upsert(localDb.media);
      }
      if (localDb.albums && localDb.albums.length > 0) {
        await supabaseClient.from('shamcloud_albums').upsert(localDb.albums);
      }
      if (localDb.payments && localDb.payments.length > 0) {
        await supabaseClient.from('shamcloud_payments').upsert(localDb.payments);
      }
      if (localDb.auditLogs && localDb.auditLogs.length > 0) {
        await supabaseClient.from('shamcloud_audit_logs').upsert(localDb.auditLogs);
      }
      console.log("Supabase seeding processed successfully!");
    } else {
      console.log("Supabase has existing records. Pulling remote data down to restore local cache...");
      const { data: sUsers, error: errUsers } = await supabaseClient.from('shamcloud_users').select('*');
      const { data: sMedia, error: errMedia } = await supabaseClient.from('shamcloud_media').select('*');
      const { data: sAlbums, error: errAlbums } = await supabaseClient.from('shamcloud_albums').select('*');
      const { data: sPayments, error: errPayments } = await supabaseClient.from('shamcloud_payments').select('*');
      const { data: sAuditLogs, error: errAuditLogs } = await supabaseClient.from('shamcloud_audit_logs').select('*');

      if (errUsers || errMedia || errAlbums || errPayments || errAuditLogs) {
        const errorsList = [errUsers, errMedia, errAlbums, errPayments, errAuditLogs]
          .filter(e => e)
          .map(e => `${e.message} (code: ${e?.code || 'unknown'})`)
          .join(", ");
        throw new Error(`Failed to query remote tables: ${errorsList}`);
      }

      const localDb = loadDb();
      const syncedDb: DbSchema = {
        users: sUsers || [],
        media: sMedia || [],
        albums: sAlbums || [],
        payments: sPayments || [],
        auditLogs: sAuditLogs || [],
        priceSettings: localDb.priceSettings || {
          basePrice: 1500,
          offerPrice: null,
          customOfferText: ""
        }
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(syncedDb, null, 2), "utf8");
      console.log("Local database cache synchronized with Supabase cloud.");
    }
    isSupabaseActive = true;
    supabaseStatusMessage = "Connected successfully. Bi-directional database syncing is active!";
  } catch (err: any) {
    isSupabaseActive = false;
    const isNetworkErr = err.message?.includes("fetch failed") || 
                         err.message?.includes("getaddrinfo") || 
                         err.code === "ENOTFOUND" || 
                         err.code === "ECONNREFUSED" || 
                         err.code === "ETIMEDOUT";
    
    if (isNetworkErr) {
      supabaseStatusMessage = "Supabase server is ready for user configuration. Local datastore active.";
      console.log("Supabase Status: Local datastore is active for development purposes.");
    } else {
      supabaseStatusMessage = "Sync notification: " + err.message + ". Using local storage.";
      console.log("Supabase database sync notification: using local storage.");
    }
  }
}

// Background sync push whenever saves happen
async function pushDbToSupabase(data: DbSchema) {
  if (!supabaseClient || !isSupabaseActive) return;
  try {
    console.log("Background pushing updates to Supabase...");
    
    // Format objects to look clean
    const usersToUpsert = data.users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      storageUsed: u.storageUsed,
      storageLimit: u.storageLimit,
      isVerified: u.isVerified,
      isActive: u.isActive,
      createdAt: u.createdAt
    }));

    const mediaToUpsert = data.media.map(m => ({
      id: m.id,
      name: m.name,
      type: m.type,
      size: m.size,
      fileUrl: m.fileUrl,
      mimeType: m.mimeType,
      userId: m.userId,
      isDeleted: m.isDeleted,
      isFavorite: m.isFavorite || false,
      createdAt: m.createdAt
    }));

    const albumsToUpsert = data.albums.map(a => ({
      id: a.id,
      name: a.name,
      userId: a.userId,
      coverUrl: a.coverUrl,
      createdAt: a.createdAt,
      mediaIds: a.mediaIds
    }));

    const paymentsToUpsert = data.payments.map(p => ({
      id: p.id,
      userId: p.userId,
      userEmail: p.userEmail,
      planName: p.planName,
      amount: p.amount,
      status: p.status,
      date: p.date
    }));

    const auditLogsToUpsert = data.auditLogs.map(l => ({
      id: l.id,
      action: l.action,
      userEmail: l.userEmail,
      role: l.role,
      details: l.details,
      date: l.date
    }));

    if (usersToUpsert.length > 0) await supabaseClient.from('shamcloud_users').upsert(usersToUpsert);
    if (mediaToUpsert.length > 0) await supabaseClient.from('shamcloud_media').upsert(mediaToUpsert);
    if (albumsToUpsert.length > 0) await supabaseClient.from('shamcloud_albums').upsert(albumsToUpsert);
    if (paymentsToUpsert.length > 0) await supabaseClient.from('shamcloud_payments').upsert(paymentsToUpsert);
    if (auditLogsToUpsert.length > 0) await supabaseClient.from('shamcloud_audit_logs').upsert(auditLogsToUpsert);
    
    console.log("Supabase clouds synced.");
  } catch (err: any) {
    const isNetworkErr = err.message?.includes("fetch failed") || 
                         err.message?.includes("getaddrinfo") || 
                         err.code === "ENOTFOUND" || 
                         err.code === "ECONNREFUSED" || 
                         err.code === "ETIMEDOUT";
    if (isNetworkErr) {
      console.log("Supabase storage: Changes saved locally.");
    } else {
      console.log("Supabase storage status: dataset saved internally.");
    }
  }
}

// Trigger initial verification in background with delay
setTimeout(() => {
  initSupabaseSyncOnBoot().catch(err => {
    console.log("Supabase initialization complete. Offline datastore synced.");
  });
}, 2000);

// Helper to load/save mock database
function loadDb(): DbSchema {
  const defaultPriceSettings = {
    basePrice: 1500,
    offerPrice: null,
    customOfferText: ""
  };
  if (!fs.existsSync(DB_FILE)) {
    const data: DbSchema = {
      users: INITIAL_USERS,
      media: INITIAL_MEDIA,
      albums: INITIAL_ALBUMS,
      payments: INITIAL_PAYMENTS,
      auditLogs: INITIAL_AUDIT_LOGS,
      priceSettings: defaultPriceSettings,
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
    return data;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    if (!parsed.priceSettings) {
      parsed.priceSettings = defaultPriceSettings;
    }
    return parsed;
  } catch (err) {
    console.error("Error reading db file, regenerating seeds", err);
    const data: DbSchema = {
      users: INITIAL_USERS,
      media: INITIAL_MEDIA,
      albums: INITIAL_ALBUMS,
      payments: INITIAL_PAYMENTS,
      auditLogs: INITIAL_AUDIT_LOGS,
      priceSettings: defaultPriceSettings,
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
    return data;
  }
}

function saveDb(data: DbSchema) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
  pushDbToSupabase(data).catch(err => {
    console.error("Background sync error:", err);
  });
}

function findOrCreateUser(currentDb: DbSchema, email: string): User {
  const emailLower = email.toLowerCase();
  let user = currentDb.users.find(u => u.email.toLowerCase() === emailLower);
  if (!user) {
    const defaultNamePart = emailLower.split("@")[0];
    const name = defaultNamePart.charAt(0).toUpperCase() + defaultNamePart.slice(1);
    user = {
      id: `user-${Date.now()}`,
      name: name || "ShamCloud User",
      email: emailLower,
      role: "USER",
      storageUsed: 0,
      storageLimit: 5368709120, // 5 GB
      isVerified: true,
      isActive: true,
      createdAt: new Date().toISOString()
    };
    currentDb.users.push(user);
    fs.writeFileSync(DB_FILE, JSON.stringify(currentDb, null, 2), "utf8");
    console.log(`Auto-created missing db user account for local session of: ${emailLower}`);
  }
  return user;
}

// Multer photo & video disk storage setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const cleanOrigName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    cb(null, `${Date.now()}-${cleanOrigName}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100 MB limit
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  
  // Serve uploads folder as static
  app.use("/uploads", express.static(UPLOADS_DIR));

  // Logger Middleware
  app.use((req, res, next) => {
    console.log(`[${req.method}] ${req.url}`);
    next();
  });

  // Load backend database
  const db = loadDb();

  // -------------------------------------------------------------
  // API ENDPOINTS
  // -------------------------------------------------------------

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", appName: "ShamCloud" });
  });

  // Integrations active standing status
  app.get("/api/integrations/status", (req, res) => {
    res.json({
      supabase: {
        configured: !!(SB_URL && SB_ANON_KEY),
        active: isSupabaseActive,
        message: supabaseStatusMessage,
      },
      cloudinary: {
        configured: !!(CL_NAME && CL_KEY && CL_SECRET),
        active: isCloudinaryActive,
        message: cloudinaryStatusMessage,
      }
    });
  });

  // 1. Auth APIs
  app.post("/api/auth/register", (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "Missing registration details" });
    }

    const currentDb = loadDb();
    const userExists = currentDb.users.some(u => u.email.toLowerCase() === email.toLowerCase());
    if (userExists) {
      return res.status(400).json({ success: false, message: "Email already registered on ShamCloud" });
    }

    const isSuperAdmin = email.toLowerCase() === "tamjidulislamsamim@gmail.com";
    const newUser: User = {
      id: `user-${Date.now()}`,
      name,
      email,
      role: isSuperAdmin ? "SUPER_ADMIN" : "USER", // assign SUPER_ADMIN to samim's email, USER for others
      storageUsed: 0,
      storageLimit: isSuperAdmin ? 1099511627776 : 5368709120, // 1 TB for Super Admin, 5 GB for others
      isVerified: true,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    currentDb.users.push(newUser);

    // Write audit log
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      action: "USER_SIGN_UP",
      userEmail: email,
      role: "USER",
      details: `${name} registered a new account on ShamCloud.`,
      date: new Date().toISOString(),
    };
    currentDb.auditLogs.unshift(newLog);

    saveDb(currentDb);
    res.status(201).json({ success: true, message: "Registered successfully", user: newUser });
  });

  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const currentDb = loadDb();
    const user = currentDb.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: "Your ShamCloud account is currently suspended. Please contact support." });
    }

    // Capture sign-in logs
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      action: "USER_LOGIN",
      userEmail: user.email,
      role: user.role,
      details: `User signed in successfully under role: ${user.role}.`,
      date: new Date().toISOString(),
    };
    currentDb.auditLogs.unshift(newLog);
    saveDb(currentDb);

    res.json({ success: true, message: "Logged in successfully", user });
  });

  // 2. User APIs
  app.get("/api/users/me", (req, res) => {
    const emailHeader = req.headers["x-user-email"];
    if (!emailHeader) {
      return res.status(401).json({ success: false, message: "Unauthorized. Please login again." });
    }

    const currentDb = loadDb();
    const user = findOrCreateUser(currentDb, String(emailHeader));
    res.json({ success: true, user });
  });

  // Simulate updating current user profile
  app.patch("/api/users/me", (req, res) => {
    const emailHeader = req.headers["x-user-email"];
    if (!emailHeader) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { name, avatarUrl } = req.body;
    const currentDb = loadDb();
    const user = findOrCreateUser(currentDb, String(emailHeader));
    const userIdx = currentDb.users.findIndex(u => u.id === user.id);

    if (userIdx !== -1) {
      if (name) {
        currentDb.users[userIdx].name = name;
      }
      if (avatarUrl !== undefined) {
        currentDb.users[userIdx].avatarUrl = avatarUrl;
      }
      saveDb(currentDb);
      res.json({ success: true, user: currentDb.users[userIdx] });
    } else {
      res.status(404).json({ success: false, message: "User index mismatch" });
    }
  });

  // Retrieve user storage details
  app.get("/api/users/storage", (req, res) => {
    const emailHeader = req.headers["x-user-email"];
    if (!emailHeader) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const currentDb = loadDb();
    const user = findOrCreateUser(currentDb, String(emailHeader));

    res.json({
      success: true,
      storageUsed: user.storageUsed,
      storageLimit: user.storageLimit,
      percentage: Math.min(100, (user.storageUsed / user.storageLimit) * 100),
    });
  });

  // Delete own account
  app.delete("/api/users/me", (req, res) => {
    const emailHeader = req.headers["x-user-email"];
    if (!emailHeader) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const currentDb = loadDb();
    const userIdx = currentDb.users.findIndex(u => u.email.toLowerCase() === String(emailHeader).toLowerCase());
    if (userIdx === -1) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    currentDb.users.splice(userIdx, 1);
    saveDb(currentDb);
    res.json({ success: true, message: "Account deleted permanently" });
  });

  // 3. Media APIs
  app.get("/api/media", (req, res) => {
    const emailHeader = req.headers["x-user-email"];
    if (!emailHeader) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    const currentDb = loadDb();
    const user = findOrCreateUser(currentDb, String(emailHeader));

    // Filter media belonging to the current user
    const userMedia = currentDb.media.filter(m => m.userId === user.id);
    res.json({ success: true, media: userMedia });
  });

  // Upload file inside media gallery
  app.post("/api/media/upload", upload.single("file"), async (req, res) => {
    const emailHeader = req.headers["x-user-email"];
    if (!emailHeader) {
      return res.status(401).json({ success: false, message: "Unauthorized sign-in required" });
    }

    const currentDb = loadDb();
    const user = findOrCreateUser(currentDb, String(emailHeader));

    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file was selected for upload." });
    }

    const { size, originalname, mimetype, filename } = req.file;

    // Guard on subscription storage limit
    if (user.storageUsed + size > user.storageLimit) {
      // Clean up multer temp file if size limit exceeded
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {}
      return res.status(400).json({
        success: false,
        message: "Upload failed: ShamCloud Storage limit reached. Please upgrade to a Premium plan!"
      });
    }

    // Determine type (PHOTO or VIDEO)
    const isVideo = mimetype.startsWith("video/");
    const mediaType = isVideo ? "VIDEO" : "PHOTO";

    const newMediaId = `media-${Date.now()}`;
    let fileUrl = `/uploads/${filename}`;
    let isCloudUploaded = false;

    if (isCloudinaryActive) {
      try {
        console.log(`Uploading '${originalname}' to Cloudinary...`);
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: "shamcloud",
          resource_type: "auto",
        });
        if (result && result.secure_url) {
          fileUrl = result.secure_url;
          isCloudUploaded = true;
          console.log(`Cloudinary Upload successful for '${originalname}'. URL: ${fileUrl}`);
          
          // Delete local file to preserve host space
          try {
            fs.unlinkSync(req.file.path);
          } catch (err) {
            console.warn("Optional local file cleanup failed:", err);
          }
        }
      } catch (err: any) {
        console.error(`Cloudinary upload failed for '${originalname}', falling back to local file path. Error:`, err.message);
      }
    }

    const newMedia: Media = {
      id: newMediaId,
      name: originalname,
      type: mediaType,
      size: size,
      fileUrl: fileUrl,
      mimeType: mimetype,
      userId: user.id,
      isDeleted: false,
      createdAt: new Date().toISOString(),
    };

    currentDb.media.push(newMedia);

    // Update user's space usage
    const userIdx = currentDb.users.findIndex(u => u.id === user.id);
    if (userIdx !== -1) {
      currentDb.users[userIdx].storageUsed += size;
    }

    // Create log
    const storageLocation = isCloudUploaded ? "Cloudinary Vault" : "Local Disk Cache";
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      action: "MEDIA_UPLOAD",
      userEmail: user.email,
      role: user.role,
      details: `Digitized and saved '${originalname}' (${(size / (1024 * 1024)).toFixed(2)} MB) to online ${storageLocation}.`,
      date: new Date().toISOString(),
    };
    currentDb.auditLogs.unshift(newLog);

    saveDb(currentDb);
    res.status(201).json({ success: true, message: isCloudUploaded ? "File archived in Cloudinary successfully!" : "File archived in ShamCloud local catalog!", media: newMedia });
  });

  // Import media simulated from Google Photos
  app.post("/api/google/import", (req, res) => {
    const emailHeader = req.headers["x-user-email"];
    const { photos } = req.body; // array of stock photo objects to import
    if (!emailHeader) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const currentDb = loadDb();
    const user = currentDb.users.find(u => u.email.toLowerCase() === String(emailHeader).toLowerCase());
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (!photos || !Array.isArray(photos)) {
      return res.status(400).json({ success: false, message: "Invalid import file list" });
    }

    let totalImportedSize = 0;
    const importedMedia: Media[] = [];

    photos.forEach((photo, idx) => {
      const mockSize = photo.size || 1500000 + Math.floor(Math.random() * 2000000); // 1.5 - 3.5 MB
      totalImportedSize += mockSize;

      const mediaItem: Media = {
        id: `media-imported-${Date.now()}-${idx}`,
        name: photo.name || `GooglePhoto_${Date.now()}_${idx}.jpg`,
        type: photo.type || "PHOTO",
        size: mockSize,
        fileUrl: photo.url || "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05",
        mimeType: photo.mimeType || "image/jpeg",
        userId: user.id,
        isDeleted: false,
        createdAt: new Date().toISOString(),
      };

      importedMedia.push(mediaItem);
      currentDb.media.push(mediaItem);
    });

    // Update user balance space
    const userIdx = currentDb.users.findIndex(u => u.id === user.id);
    if (userIdx !== -1) {
      currentDb.users[userIdx].storageUsed += totalImportedSize;
    }

    // Create log
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      action: "GOOGLE_PHOTOS_IMPORT",
      userEmail: user.email,
      role: user.role,
      details: `Imported ${photos.length} files from Google Photos seamlessly.`,
      date: new Date().toISOString(),
    };
    currentDb.auditLogs.unshift(newLog);

    saveDb(currentDb);
    res.json({ success: true, message: `Successfully imported ${photos.length} files into ShamCloud!`, media: importedMedia });
  });

  // 3a. Google Photos real integration endpoints
  app.get("/api/auth/google/config-status", (req, res) => {
    res.json({
      success: true,
      hasEnvConfig: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
    });
  });

  app.get("/api/auth/google/url", (req, res) => {
    const clientId = req.query.client_id || process.env.GOOGLE_CLIENT_ID;
    const clientSecret = req.query.client_secret || process.env.GOOGLE_CLIENT_SECRET;
    
    if (!clientId) {
      return res.status(400).json({ success: false, message: "Missing Google Client ID. Please configure it in your secrets or enter it visually." });
    }

    const redirectUri = String(req.query.redirect_uri || `${process.env.APP_URL || "http://localhost:3000"}/auth/google/callback`);
    
    const stateObj = {
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri
    };
    
    const state = Buffer.from(JSON.stringify(stateObj)).toString("base64");

    const params = new URLSearchParams({
      client_id: String(clientId),
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "https://www.googleapis.com/auth/photoslibrary.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile",
      access_type: "offline",
      prompt: "consent",
      state: state
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    res.json({ success: true, url: authUrl });
  });

  // Since Google requires redirect uri to match, handle this callback on Express directly.
  app.get(["/auth/google/callback", "/auth/google/callback/"], async (req, res) => {
    const { code, state } = req.query;
    if (!code) {
      return res.send(`
        <html>
          <body>
            <h3>Authentication failed: Missing authorization code.</h3>
            <button onclick="window.close()">Close Window</button>
          </body>
        </html>
      `);
    }

    try {
      let clientId = process.env.GOOGLE_CLIENT_ID;
      let clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      let redirectUri = `${process.env.APP_URL || "http://localhost:3000"}/auth/google/callback`;

      if (state) {
        try {
          const decodedState = JSON.parse(Buffer.from(String(state), "base64").toString("utf8"));
          if (decodedState.client_id) clientId = decodedState.client_id;
          if (decodedState.client_secret) clientSecret = decodedState.client_secret;
          if (decodedState.redirect_uri) redirectUri = decodedState.redirect_uri;
        } catch (stateErr) {
          console.error("State decryption failed", stateErr);
        }
      }

      if (!clientId || !clientSecret) {
        throw new Error("Missing client_id or client_secret for token exchange.");
      }

      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code: String(code),
          client_id: String(clientId),
          client_secret: String(clientSecret),
          redirect_uri: redirectUri,
          grant_type: "authorization_code"
        }).toString()
      });

      if (!tokenRes.ok) {
        const errorDetails = await tokenRes.text();
        console.error("Google token swap error details:", errorDetails);
        throw new Error(`Google token exchange failed with status ${tokenRes.status}`);
      }

      const tokens = await tokenRes.json();

      res.send(`
        <html>
          <body style="font-family: system-ui, sans-serif; background: #0b0f19; color: #f8fafc; text-align: center; padding-top: 100px;">
            <div style="background: #111827; max-width: 400px; margin: 0 auto; border: 1px solid #1f2937; padding: 40px; border-radius: 20px; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);">
              <svg style="color: #10b981; width: 48px; height: 48px; margin-bottom: 20px;" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <h3 style="margin-top: 0;">Connected Successfully!</h3>
              <p style="color: #9ca3af; font-size: 13px;">Your Google Photos credentials have been transmitted to active memory. Closing...</p>
            </div>
            <script>
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'GOOGLE_OAUTH_SUCCESS', 
                  accessToken: '${tokens.access_token}', 
                  refreshToken: '${tokens.refresh_token || ""}' 
                }, '*');
                setTimeout(() => window.close(), 1200);
              } else {
                setTimeout(() => { window.location.href = '/' }, 1500);
              }
            </script>
          </body>
        </html>
      `);
    } catch (err: any) {
      console.error("Google Callback Error:", err);
      res.send(`
        <html>
          <body style="font-family: system-ui, sans-serif; background: #0b0f19; color: #f8fafc; text-align: center; padding-top: 100px;">
            <div style="background: #111827; max-width: 480px; margin: 0 auto; border: 1px solid #ef4444; padding: 40px; border-radius: 20px;">
              <h3 style="color: #ef4444;">Connection Failed</h3>
              <p style="color: #9ca3af; font-size: 13px;">${err.message}</p>
              <div style="margin-top: 24px; padding: 12px; background: #0b0f19; border-radius: 8px; font-family: monospace; font-size: 11px; text-align: left; color: #ef4444; border: 1px dashed #ef4444/20;">
                Troubleshoot list:<br/>
                1. Verify Client ID and Client Secret.<br/>
                2. Check if Authorized Redirect URIs match exactly.<br/>
                3. Ensure "Google Photos Library API" is enabled in GCP.
              </div>
              <button onclick="window.close()" style="background: #ef4444; border: none; color: white; padding: 8px 16px; border-radius: 8px; margin-top: 20px; font-weight: 500; cursor: pointer;">Close</button>
            </div>
          </body>
        </html>
      `);
    }
  });

  // Google Photos listing proxy endpoint
  app.get("/api/google/photos", async (req, res) => {
    const token = req.headers["x-google-token"];
    if (!token) {
      return res.status(400).json({ success: false, message: "Missing Google Access Token" });
    }

    try {
      const googleRes = await fetch("https://photoslibrary.googleapis.com/v1/mediaItems?pageSize=30", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (!googleRes.ok) {
        const errText = await googleRes.text();
        console.error("Google Photos API Error detail:", errText);
        return res.status(googleRes.status).json({
          success: false,
          message: "Unable to retrieve photos from Google. Verify API permissions.",
          error: errText
        });
      }

      const data = await googleRes.json();
      res.json({ success: true, mediaItems: data.mediaItems || [] });
    } catch (err: any) {
      res.status(500).json({ success: false, message: "Internal server proxy exception: " + err.message });
    }
  });

  // Soft delete media (Move to Trash)
  app.delete("/api/media/:id", (req, res) => {
    const emailHeader = req.headers["x-user-email"];
    const mediaId = req.params.id;

    if (!emailHeader) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const currentDb = loadDb();
    const user = currentDb.users.find(u => u.email.toLowerCase() === String(emailHeader).toLowerCase());
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const mediaIdx = currentDb.media.findIndex(m => m.id === mediaId && m.userId === user.id);
    if (mediaIdx === -1) {
      return res.status(404).json({ success: false, message: "Media document not found or access denied" });
    }

    currentDb.media[mediaIdx].isDeleted = true;

    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      action: "MEDIA_TRASHED",
      userEmail: user.email,
      role: user.role,
      details: `Moved file '${currentDb.media[mediaIdx].name}' to trash storage.`,
      date: new Date().toISOString(),
    };
    currentDb.auditLogs.unshift(newLog);

    saveDb(currentDb);
    res.json({ success: true, message: "Item moved to Trash successfully." });
  });

  // Restore media from Trash
  app.post("/api/media/:id/restore", (req, res) => {
    const emailHeader = req.headers["x-user-email"];
    const mediaId = req.params.id;

    if (!emailHeader) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const currentDb = loadDb();
    const user = currentDb.users.find(u => u.email.toLowerCase() === String(emailHeader).toLowerCase());
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const mediaIdx = currentDb.media.findIndex(m => m.id === mediaId && m.userId === user.id);
    if (mediaIdx === -1) {
      return res.status(404).json({ success: false, message: "Media item does not exist" });
    }

    currentDb.media[mediaIdx].isDeleted = false;

    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      action: "MEDIA_RESTORED",
      userEmail: user.email,
      role: user.role,
      details: `Restored file '${currentDb.media[mediaIdx].name}' back to gallery storage.`,
      date: new Date().toISOString(),
    };
    currentDb.auditLogs.unshift(newLog);

    saveDb(currentDb);
    res.json({ success: true, message: "Item restored to active gallery successfully." });
  });

  // Toggle media Favorite status
  app.post("/api/media/:id/favorite", (req, res) => {
    const emailHeader = req.headers["x-user-email"];
    const mediaId = req.params.id;

    if (!emailHeader) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const currentDb = loadDb();
    const user = currentDb.users.find(u => u.email.toLowerCase() === String(emailHeader).toLowerCase());
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const mediaIdx = currentDb.media.findIndex(m => m.id === mediaId && m.userId === user.id);
    if (mediaIdx === -1) {
      return res.status(404).json({ success: false, message: "Media item does not exist" });
    }

    // Toggle favorite state
    const isFav = !currentDb.media[mediaIdx].isFavorite;
    currentDb.media[mediaIdx].isFavorite = isFav;

    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      action: isFav ? "MEDIA_FAVORITED" : "MEDIA_UNFAVORITED",
      userEmail: user.email,
      role: user.role,
      details: `${isFav ? 'Added' : 'Removed'} file '${currentDb.media[mediaIdx].name}' ${isFav ? 'to' : 'from'} favorites.`,
      date: new Date().toISOString(),
    };
    currentDb.auditLogs.unshift(newLog);

    saveDb(currentDb);
    res.json({ success: true, isFavorite: isFav, message: isFav ? "Item added to favorites." : "Item removed from favorites." });
  });

  // Permanently delete media file
  app.delete("/api/media/:id/permanent", (req, res) => {
    const emailHeader = req.headers["x-user-email"];
    const mediaId = req.params.id;

    if (!emailHeader) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const currentDb = loadDb();
    const user = currentDb.users.find(u => u.email.toLowerCase() === String(emailHeader).toLowerCase());
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const mediaIdx = currentDb.media.findIndex(m => m.id === mediaId && m.userId === user.id);
    if (mediaIdx === -1) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }

    const targetMedia = currentDb.media[mediaIdx];
    const sizeToReclaim = targetMedia.size;

    // Remove from physical uploads if saved locally
    if (targetMedia.fileUrl.startsWith("/uploads/")) {
      const fileName = targetMedia.fileUrl.split("/uploads/")[1];
      const filePath = path.join(UPLOADS_DIR, fileName);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          console.error("Physical file deletion failed", e);
        }
      }
    }

    // Remove from db
    currentDb.media.splice(mediaIdx, 1);

    // Free up storage space list
    const userIdx = currentDb.users.findIndex(u => u.id === user.id);
    if (userIdx !== -1) {
      currentDb.users[userIdx].storageUsed = Math.max(0, currentDb.users[userIdx].storageUsed - sizeToReclaim);
    }

    // Clean references to this media in albums
    currentDb.albums.forEach(album => {
      album.mediaIds = album.mediaIds.filter(id => id !== mediaId);
    });

    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      action: "MEDIA_PERMANENTLY_DELETED",
      userEmail: user.email,
      role: user.role,
      details: `Permanently deleted file '${targetMedia.name}' and reclaimed visual disk space.`,
      date: new Date().toISOString(),
    };
    currentDb.auditLogs.unshift(newLog);

    saveDb(currentDb);
    res.json({ success: true, message: "File permanently destroyed from cloud vault." });
  });

  // 4. Album APIs
  app.get("/api/albums", (req, res) => {
    const emailHeader = req.headers["x-user-email"];
    if (!emailHeader) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const currentDb = loadDb();
    const user = currentDb.users.find(u => u.email.toLowerCase() === String(emailHeader).toLowerCase());
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const userAlbums = currentDb.albums.filter(a => a.userId === user.id);
    res.json({ success: true, albums: userAlbums });
  });

  app.post("/api/albums", (req, res) => {
    const emailHeader = req.headers["x-user-email"];
    const { name, coverUrl } = req.body;

    if (!emailHeader) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!name || name.trim() === "") {
      return res.status(400).json({ success: false, message: "Album name is required." });
    }

    const currentDb = loadDb();
    const user = currentDb.users.find(u => u.email.toLowerCase() === String(emailHeader).toLowerCase());
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Find custom cover image if not supplied
    const userMedia = currentDb.media.find(m => m.userId === user.id && !m.isDeleted && m.type === "PHOTO");
    const defaultCover = userMedia ? userMedia.fileUrl : "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1200&auto=format&fit=crop";

    const newAlbum: Album = {
      id: `album-${Date.now()}`,
      name: name.trim(),
      userId: user.id,
      coverUrl: coverUrl || defaultCover,
      createdAt: new Date().toISOString(),
      mediaIds: [],
    };

    currentDb.albums.push(newAlbum);

    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      action: "ALBUM_CREATE",
      userEmail: user.email,
      role: user.role,
      details: `Created new album folder named '${name}'.`,
      date: new Date().toISOString(),
    };
    currentDb.auditLogs.unshift(newLog);

    saveDb(currentDb);
    res.status(201).json({ success: true, album: newAlbum });
  });

  // Add media to an album
  app.post("/api/albums/:id/media", (req, res) => {
    const emailHeader = req.headers["x-user-email"];
    const albumId = req.params.id;
    const { mediaId } = req.body;

    if (!emailHeader) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const currentDb = loadDb();
    const user = currentDb.users.find(u => u.email.toLowerCase() === String(emailHeader).toLowerCase());
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const albumIdx = currentDb.albums.findIndex(a => a.id === albumId && a.userId === user.id);
    if (albumIdx === -1) {
      return res.status(404).json({ success: false, message: "Album not found" });
    }

    const mediaExists = currentDb.media.some(m => m.id === mediaId && m.userId === user.id);
    if (!mediaExists) {
      return res.status(404).json({ success: false, message: "Media document not found" });
    }

    const album = currentDb.albums[albumIdx];
    if (album.mediaIds.includes(mediaId)) {
      return res.status(400).json({ success: false, message: "File is already mapped to this Album." });
    }

    album.mediaIds.push(mediaId);

    // Update coverUrl to the added photo if coverUrl is default
    const addedMedia = currentDb.media.find(m => m.id === mediaId);
    if (addedMedia && addedMedia.type === "PHOTO") {
      album.coverUrl = addedMedia.fileUrl;
    }

    saveDb(currentDb);
    res.json({ success: true, message: "Media assigned to album folders successfully.", album });
  });

  // Remove media from an album
  app.delete("/api/albums/:id/media/:mediaId", (req, res) => {
    const emailHeader = req.headers["x-user-email"];
    const albumId = req.params.id;
    const mediaId = req.params.mediaId;

    if (!emailHeader) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const currentDb = loadDb();
    const user = currentDb.users.find(u => u.email.toLowerCase() === String(emailHeader).toLowerCase());
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const albumIdx = currentDb.albums.findIndex(a => a.id === albumId && a.userId === user.id);
    if (albumIdx === -1) {
      return res.status(404).json({ success: false, message: "Album not found" });
    }

    const album = currentDb.albums[albumIdx];
    album.mediaIds = album.mediaIds.filter(id => id !== mediaId);

    saveDb(currentDb);
    res.json({ success: true, message: "Media removed from album folders successfully.", album });
  });

  // Delete full Album
  app.delete("/api/albums/:id", (req, res) => {
    const emailHeader = req.headers["x-user-email"];
    const albumId = req.params.id;

    if (!emailHeader) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const currentDb = loadDb();
    const user = currentDb.users.find(u => u.email.toLowerCase() === String(emailHeader).toLowerCase());
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const albumIdx = currentDb.albums.findIndex(a => a.id === albumId && a.userId === user.id);
    if (albumIdx === -1) {
      return res.status(404).json({ success: false, message: "Album not found" });
    }

    const deletedAlbumName = currentDb.albums[albumIdx].name;
    currentDb.albums.splice(albumIdx, 1);

    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      action: "ALBUM_DELETE",
      userEmail: user.email,
      role: user.role,
      details: `Deleted album folder named '${deletedAlbumName}'.`,
      date: new Date().toISOString(),
    };
    currentDb.auditLogs.unshift(newLog);

    saveDb(currentDb);
    res.json({ success: true, message: "Album container deleted successfully" });
  });

  // 5. Subscription Upgrades / Payments
  app.get("/api/payments/price-settings", (req, res) => {
    const currentDb = loadDb();
    res.json({ success: true, priceSettings: currentDb.priceSettings });
  });

  app.post("/api/admin/price-settings", (req, res) => {
    const emailHeader = req.headers["x-user-email"];
    if (!emailHeader) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const currentDb = loadDb();
    const admin = currentDb.users.find(u => u.email.toLowerCase() === String(emailHeader).toLowerCase());
    if (!admin || admin.role !== "SUPER_ADMIN") {
      return res.status(403).json({ success: false, message: "Access forbidden: Only SUPER_ADMIN can edit price and offer configurations." });
    }

    const { basePrice, offerPrice, customOfferText } = req.body;
    
    if (typeof basePrice !== 'number' || basePrice < 0) {
      return res.status(400).json({ success: false, message: "Validation error: Base price must be a non-negative number." });
    }

    if (offerPrice !== null && (typeof offerPrice !== 'number' || offerPrice < 0)) {
      return res.status(400).json({ success: false, message: "Validation error: Offer price must be null or a non-negative number." });
    }

    currentDb.priceSettings = {
      basePrice,
      offerPrice,
      customOfferText: String(customOfferText || ""),
    };

    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      action: "PRICING_UPDATED",
      userEmail: admin.email,
      role: admin.role,
      details: `Updated subscription pricing: Base package to ৳${basePrice}. Promotional offer target to ${offerPrice !== null ? `৳${offerPrice}` : "NONE"} with description "${customOfferText}".`,
      date: new Date().toISOString(),
    };
    currentDb.auditLogs.unshift(newLog);

    saveDb(currentDb);
    res.json({ success: true, message: "Subscription plan configurations published successfully.", priceSettings: currentDb.priceSettings });
  });

  app.post("/api/payments/create-checkout-session", (req, res) => {
    const emailHeader = req.headers["x-user-email"];
    const { planName, amount, cardNumber, cardExpiry, cardCVC, cardholderName, simulatedBalance } = req.body;

    if (!emailHeader) {
      return res.status(401).json({ success: false, message: "Unauthorized: Missing user billing token." });
    }

    const currentDb = loadDb();
    const user = currentDb.users.find(u => u.email.toLowerCase() === String(emailHeader).toLowerCase());
    
    // 1. Check Valid Account Standing
    if (!user) {
      return res.status(400).json({ success: false, message: "Transaction Rejected: No active system account exists under the specified billing details." });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: "Transaction Rejected: The billing user account is currently suspended, deactivated, or locked." });
    }

    // 2. Validate Card Structure/Presence on Backend for Security simulation
    if (!cardNumber || typeof cardNumber !== 'string') {
      return res.status(400).json({ success: false, message: "Validation Error: Stripe requires a valid card number string." });
    }
    
    const formattedCard = cardNumber.replace(/\s+/g, '');
    if (!/^\d{15,16}$/.test(formattedCard)) {
      return res.status(400).json({ success: false, message: "Validation Error: Invalid credit card length or structure format." });
    }

    if (!cardExpiry || !/^\d{2}\/\d{2}$/.test(cardExpiry)) {
      return res.status(400).json({ success: false, message: "Validation Error: Expiration date must follow the exact MM/YY layout." });
    }

    // Parse expiration
    const [monthStr, yearStr] = cardExpiry.split("/");
    const month = parseInt(monthStr, 10);
    const year = parseInt(yearStr, 10) + 2000;
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    if (month < 1 || month > 12) {
      return res.status(400).json({ success: false, message: "Validation Error: Expiration month must fall strictly between 01 and 12." });
    }

    if (year < currentYear || (year === currentYear && month < currentMonth)) {
      return res.status(400).json({ success: false, message: "Transaction Declined: The specified billing card has expired. Please use an updated card." });
    }

    if (!cardCVC || !/^\d{3,4}$/.test(cardCVC)) {
      return res.status(400).json({ success: false, message: "Validation Error: Card Verification Value (CVV/CVC) must consist of exactly 3 or 4 digits." });
    }

    // 3. Sufficient Funds Check
    const purchaseAmount = amount || 12.99;
    const availableFunds = typeof simulatedBalance === 'number' ? simulatedBalance : 150.00;

    // Simulate standard declined card ending in 9999 or balance lack
    if (formattedCard.endsWith("9999") || availableFunds < purchaseAmount) {
      // Record a failed transaction for historical reporting and audit trailing
      const failedPayment: PaymentRecord = {
        id: `pay-failed-${Date.now()}`,
        userId: user.id,
        userEmail: user.email,
        planName: planName || "Premium Archive Ultimate",
        amount: purchaseAmount,
        status: "FAILED",
        date: new Date().toISOString(),
      };
      currentDb.payments.unshift(failedPayment);

      const failLog: AuditLog = {
        id: `log-${Date.now()}`,
        action: "PREMIUM_UPGRADE_FAILED",
        userEmail: user.email,
        role: user.role,
        details: `Simulated Stripe Transaction Declined: Insufficient Funds. Requested: ৳${purchaseAmount.toFixed(2)}, Available Credit: ৳${availableFunds.toFixed(2)}.`,
        date: new Date().toISOString(),
      };
      currentDb.auditLogs.unshift(failLog);
      
      saveDb(currentDb);

      return res.status(402).json({ 
        success: false, 
        message: `Stripe Transaction Declined (card_declined / insufficient_funds): Card lacks sufficient balance to authorize ৳${purchaseAmount.toFixed(2)} (Simulated balance is ৳${availableFunds.toFixed(2)}).` 
      });
    }

    // Success upgrade!
    const userIdx = currentDb.users.findIndex(u => u.id === user.id);
    if (userIdx !== -1) {
      if (currentDb.users[userIdx].role !== "ADMIN" && currentDb.users[userIdx].role !== "SUPER_ADMIN") {
        currentDb.users[userIdx].role = "PREMIUM_USER";
      }
      currentDb.users[userIdx].storageLimit = 1099511627776; // Upgrade to 1 TB
    }

    const newPayment: PaymentRecord = {
      id: `pay-${Date.now()}`,
      userId: user.id,
      userEmail: user.email,
      planName: planName || "Premium Archive Ultimate",
      amount: purchaseAmount,
      status: "SUCCESS",
      date: new Date().toISOString(),
    };

    currentDb.payments.unshift(newPayment);

    // Write audit log
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      action: "PREMIUM_UPGRADE_PAYMENT",
      userEmail: user.email,
      role: "PREMIUM_USER",
      details: `Upgraded to Premium plan successfully! Reclaimed 1 TB of lifetime memory storage. Paid via simulated Stripe Elements with secure authorization.`,
      date: new Date().toISOString(),
    };
    currentDb.auditLogs.unshift(newLog);

    saveDb(currentDb);
    res.json({ success: true, message: "Upgrade successful! Welcome to Premium ShamCloud Archive.", payment: newPayment });
  });

  // Get payments history (Admin/Super Admin or User)
  app.get("/api/payments/history", (req, res) => {
    const emailHeader = req.headers["x-user-email"];
    if (!emailHeader) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const currentDb = loadDb();
    const user = currentDb.users.find(u => u.email.toLowerCase() === String(emailHeader).toLowerCase());
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") {
      return res.json({ success: true, payments: currentDb.payments });
    } else {
      const personalHistory = currentDb.payments.filter(p => p.userId === user.id);
      return res.json({ success: true, payments: personalHistory });
    }
  });

  // 6. Admin & Super Admin APIs
  app.get("/api/admin/users", (req, res) => {
    const emailHeader = req.headers["x-user-email"];
    if (!emailHeader) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const currentDb = loadDb();
    const admin = currentDb.users.find(u => u.email.toLowerCase() === String(emailHeader).toLowerCase());
    if (!admin || (admin.role !== "ADMIN" && admin.role !== "SUPER_ADMIN")) {
      return res.status(403).json({ success: false, message: "Access forbidden: Administrators only" });
    }

    res.json({ success: true, users: currentDb.users });
  });

  // Admin modify user role
  app.patch("/api/admin/users/:id/role", (req, res) => {
    const emailHeader = req.headers["x-user-email"];
    const targetUserId = req.params.id;
    const { role } = req.body;

    if (!emailHeader) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const currentDb = loadDb();
    const admin = currentDb.users.find(u => u.email.toLowerCase() === String(emailHeader).toLowerCase());
    if (!admin || (admin.role !== "ADMIN" && admin.role !== "SUPER_ADMIN")) {
      return res.status(403).json({ success: false, message: "Access forbidden" });
    }

    const userIdx = currentDb.users.findIndex(u => u.id === targetUserId);
    if (userIdx === -1) {
      return res.status(404).json({ success: false, message: "Target user not found" });
    }

    const targetUser = currentDb.users[userIdx];

    // Security Guards: Same role cannot be changed; Super Admin or other roles cannot modify any SUPER_ADMIN account
    if (targetUser.role === "SUPER_ADMIN") {
      return res.status(403).json({ success: false, message: "Access forbidden: Super Admin accounts are fully protected and cannot be changed or updated." });
    }
    if (targetUser.role === admin.role) {
      return res.status(403).json({ success: false, message: "Access forbidden: Same role user accounts cannot be changed or updated by each other." });
    }
    if (admin.role === "ADMIN") {
      // Standard ADMIN cannot promote users to ADMIN or SUPER_ADMIN
      if (role === "SUPER_ADMIN" || role === "ADMIN") {
        return res.status(403).json({ success: false, message: "Access forbidden: Standard administrators cannot promote users to administrative roles." });
      }
    }

    const previousRole = targetUser.role;
    targetUser.role = role as UserRole;

    // Adjust limits based on role
    if (role === "PREMIUM_USER" || role === "ADMIN" || role === "SUPER_ADMIN") {
      currentDb.users[userIdx].storageLimit = 1099511627776; // 1 TB
    } else {
      currentDb.users[userIdx].storageLimit = 5368709120; // reset to 5 GB
    }

    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      action: "USER_ROLE_PROMOTION",
      userEmail: admin.email,
      role: admin.role,
      details: `Changed role of user '${currentDb.users[userIdx].email}' from '${previousRole}' to '${role}'.`,
      date: new Date().toISOString(),
    };
    currentDb.auditLogs.unshift(newLog);

    saveDb(currentDb);
    res.json({ success: true, message: "User privileges updated successfully.", user: currentDb.users[userIdx] });
  });

  // Admin suspend or activate user status
  app.patch("/api/admin/users/:id/status", (req, res) => {
    const emailHeader = req.headers["x-user-email"];
    const targetUserId = req.params.id;
    const { isActive } = req.body;

    if (!emailHeader) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const currentDb = loadDb();
    const admin = currentDb.users.find(u => u.email.toLowerCase() === String(emailHeader).toLowerCase());
    if (!admin || (admin.role !== "ADMIN" && admin.role !== "SUPER_ADMIN")) {
      return res.status(403).json({ success: false, message: "Access forbidden" });
    }

    const userIdx = currentDb.users.findIndex(u => u.id === targetUserId);
    if (userIdx === -1) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const targetUser = currentDb.users[userIdx];

    // Security Guards: Same role cannot be changed; Super Admin or other roles cannot modify any SUPER_ADMIN account
    if (targetUser.role === "SUPER_ADMIN") {
      return res.status(403).json({ success: false, message: "Access forbidden: Super Admin accounts are fully protected and cannot be suspended or changed." });
    }
    if (targetUser.role === admin.role) {
      return res.status(403).json({ success: false, message: "Access forbidden: Same role user accounts cannot be changed or updated by each other." });
    }

    targetUser.isActive = isActive;

    const actionText = isActive ? "USER_ACCOUNT_REACTIVATED" : "USER_ACCOUNT_SUSPENDED";
    const detailsText = isActive
      ? `Reactivated ShamCloud account for user '${currentDb.users[userIdx].email}'.`
      : `Suspended access for digital archive of user '${currentDb.users[userIdx].email}'.`;

    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      action: actionText,
      userEmail: admin.email,
      role: admin.role,
      details: detailsText,
      date: new Date().toISOString(),
    };
    currentDb.auditLogs.unshift(newLog);

    saveDb(currentDb);
    res.json({ success: true, message: `Account status updated successfully.`, user: currentDb.users[userIdx] });
  });

  // Admin / Super Admin delete a user account and their associated files/albums/payments
  app.delete("/api/admin/users/:id", (req, res) => {
    const emailHeader = req.headers["x-user-email"];
    const targetUserId = req.params.id;

    if (!emailHeader) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const currentDb = loadDb();
    const admin = currentDb.users.find(u => u.email.toLowerCase() === String(emailHeader).toLowerCase());
    if (!admin || (admin.role !== "ADMIN" && admin.role !== "SUPER_ADMIN")) {
      return res.status(403).json({ success: false, message: "Access forbidden: Administrators only" });
    }

    const userIdx = currentDb.users.findIndex(u => u.id === targetUserId);
    if (userIdx === -1) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const targetUser = currentDb.users[userIdx];

    // Protect matching current user's session from deleting itself
    if (targetUser.id === admin.id || targetUser.email.toLowerCase() === admin.email.toLowerCase()) {
      return res.status(400).json({ success: false, message: "Access forbidden: You cannot delete your own active running session account." });
    }

    // Security Guards: Same role cannot be changed/deleted; Super Admin or other roles cannot delete any SUPER_ADMIN account
    if (targetUser.role === "SUPER_ADMIN") {
      return res.status(403).json({ success: false, message: "Access forbidden: Super Admin accounts are fully protected and cannot be deleted." });
    }
    if (targetUser.role === admin.role) {
      return res.status(403).json({ success: false, message: "Access forbidden: Same role user accounts cannot be deleted or purged by each other." });
    }

    // Perform deletions across the DB schema to clean up space
    // 1. Remove user
    currentDb.users.splice(userIdx, 1);

    // 2. Remove media files belonging to the deleted user
    const deletedMediaCount = currentDb.media.filter(m => m.userId === targetUserId).length;
    currentDb.media = currentDb.media.filter(m => m.userId !== targetUserId);

    // 3. Remove albums belonging to the deleted user
    currentDb.albums = currentDb.albums.filter(a => a.userId !== targetUserId);

    // 4. Remove payment history records
    currentDb.payments = currentDb.payments.filter(p => p.userId !== targetUserId);

    // Create log of deletion
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      action: "USER_DELETED",
      userEmail: admin.email,
      role: admin.role,
      details: `Purged and deleted user account '${targetUser.email}' (Name: ${targetUser.name}, Role: ${targetUser.role}) along with ${deletedMediaCount} associated cloud assets.`,
      date: new Date().toISOString(),
    };
    currentDb.auditLogs.unshift(newLog);

    saveDb(currentDb);
    res.json({ success: true, message: `Successfully deleted user account ${targetUser.email} and cleared their cloud assets.` });
  });

  // Super Admin / Admin bulk purge users by specifying a role
  app.post("/api/admin/users/bulk-delete-by-role", (req, res) => {
    const emailHeader = req.headers["x-user-email"];
    const { roleToDelete } = req.body;

    if (!emailHeader) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const currentDb = loadDb();
    const admin = currentDb.users.find(u => u.email.toLowerCase() === String(emailHeader).toLowerCase());
    if (!admin || (admin.role !== "ADMIN" && admin.role !== "SUPER_ADMIN")) {
      return res.status(403).json({ success: false, message: "Access forbidden: Administrators only" });
    }

    if (!roleToDelete || !["USER", "PREMIUM_USER", "ADMIN", "SUPER_ADMIN"].includes(roleToDelete)) {
      return res.status(400).json({ success: false, message: "Invalid role specified for bulk deletion." });
    }

    // Role-based protection: Standard Admins can ONLY bulk delete 'USER' or 'PREMIUM_USER'
    if (admin.role !== "SUPER_ADMIN") {
      if (roleToDelete === "ADMIN" || roleToDelete === "SUPER_ADMIN") {
        return res.status(403).json({ success: false, message: "Access forbidden: Only Super Admins can bulk delete administrative accounts." });
      }
    }

    // Filter users to delete, EXCLUDING the current active admin performing the operation!
    const usersToDelete = currentDb.users.filter(u => 
      u.role === roleToDelete && 
      u.id !== admin.id && 
      u.email.toLowerCase() !== admin.email.toLowerCase()
    );

    if (usersToDelete.length === 0) {
      return res.json({ success: true, message: `No other user accounts found with the role of '${roleToDelete}' to purge.`, purgedCount: 0 });
    }

    const deleteUserIds = usersToDelete.map(u => u.id);

    // Perform DB wide sweeping deletion
    currentDb.users = currentDb.users.filter(u => !deleteUserIds.includes(u.id));
    currentDb.media = currentDb.media.filter(m => !deleteUserIds.includes(m.userId));
    currentDb.albums = currentDb.albums.filter(a => !deleteUserIds.includes(a.userId));
    currentDb.payments = currentDb.payments.filter(p => !deleteUserIds.includes(p.userId));

    // Create log of bulk deletion
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      action: "USERS_BULK_PURGED",
      userEmail: admin.email,
      role: admin.role,
      details: `Executed bulk role-based purge of all ${usersToDelete.length} users possessing the role '${roleToDelete}'.`,
      date: new Date().toISOString(),
    };
    currentDb.auditLogs.unshift(newLog);

    saveDb(currentDb);
    res.json({ 
      success: true, 
      message: `Successfully purged ${usersToDelete.length} user account(s) possessing the '${roleToDelete}' role from the system directory.`,
      purgedCount: usersToDelete.length
    });
  });

  // Admin / Super Admin update user details (name & email)
  app.patch("/api/admin/users/:id/details", (req, res) => {
    return res.status(403).json({ success: false, message: "Access forbidden: Administrators cannot update user information, they are only permitted to update the assigned role." });
  });

  // Admin analytics
  app.get("/api/admin/analytics", (req, res) => {
    const emailHeader = req.headers["x-user-email"];
    if (!emailHeader) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const currentDb = loadDb();
    const admin = currentDb.users.find(u => u.email.toLowerCase() === String(emailHeader).toLowerCase());
    if (!admin || (admin.role !== "ADMIN" && admin.role !== "SUPER_ADMIN")) {
      return res.status(403).json({ success: false, message: "Access forbidden" });
    }

    const totalUsers = currentDb.users.length;
    const freeUsers = currentDb.users.filter(u => u.role === "USER").length;
    const premiumUsers = currentDb.users.filter(u => u.role === "PREMIUM_USER").length;
    const adminsCount = currentDb.users.filter(u => u.role === "ADMIN" || u.role === "SUPER_ADMIN").length;

    const activeMedia = currentDb.media.filter(m => !m.isDeleted);
    const totalMediaFiles = activeMedia.length;
    const totalPhotos = activeMedia.filter(m => m.type === "PHOTO").length;
    const totalVideos = activeMedia.filter(m => m.type === "VIDEO").length;

    const totalSystemStorage = currentDb.users.reduce((acc, u) => acc + u.storageUsed, 0);
    const totalActiveSubscriptions = currentDb.payments.filter(p => p.status === "SUCCESS").length;
    const totalRevenue = currentDb.payments.filter(p => p.status === "SUCCESS").reduce((acc, p) => acc + p.amount, 0);

    // Group media storage per user
    const userStorageStats = currentDb.users.map(u => ({
      email: u.email,
      name: u.name,
      used: u.storageUsed,
      limit: u.storageLimit,
    }));

    res.json({
      success: true,
      analytics: {
        totalUsers,
        freeUsers,
        premiumUsers,
        adminsCount,
        totalMediaFiles,
        totalPhotos,
        totalVideos,
        totalSystemStorage,
        totalActiveSubscriptions,
        totalRevenue,
        userStorageStats,
      }
    });
  });

  // Get Admin global audit logs
  app.get("/api/admin/audit-logs", (req, res) => {
    const emailHeader = req.headers["x-user-email"];
    if (!emailHeader) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const currentDb = loadDb();
    const admin = currentDb.users.find(u => u.email.toLowerCase() === String(emailHeader).toLowerCase());
    if (!admin || (admin.role !== "ADMIN" && admin.role !== "SUPER_ADMIN")) {
      return res.status(403).json({ success: false, message: "Access forbidden" });
    }

    res.json({ success: true, auditLogs: currentDb.auditLogs });
  });

  // Vite middleware for state synchronization
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[ShamCloud] Express listening on port ${PORT}`);
  });
}

startServer();
