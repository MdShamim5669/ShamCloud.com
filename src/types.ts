export type UserRole = 'USER' | 'PREMIUM_USER' | 'ADMIN' | 'SUPER_ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  storageUsed: number; // in bytes
  storageLimit: number; // in bytes
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
  avatarUrl?: string;
}

export interface Media {
  id: string;
  name: string;
  type: 'PHOTO' | 'VIDEO';
  size: number; // bytes
  fileUrl: string;
  mimeType: string;
  userId: string;
  isDeleted: boolean; // true if in Trash
  isFavorite?: boolean;
  createdAt: string;
}

export interface Album {
  id: string;
  name: string;
  userId: string;
  coverUrl: string | null;
  createdAt: string;
  mediaIds: string[]; // references Media.id
}

export interface PaymentRecord {
  id: string;
  userId: string;
  userEmail: string;
  planName: string;
  amount: number;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  date: string;
}

export interface AuditLog {
  id: string;
  action: string;
  userEmail: string;
  role: UserRole;
  details: string;
  date: string;
}

export interface PriceSettings {
  basePrice: number;
  offerPrice: number | null;
  customOfferText: string;
}

export interface DbSchema {
  users: User[];
  media: Media[];
  albums: Album[];
  payments: PaymentRecord[];
  auditLogs: AuditLog[];
  priceSettings?: PriceSettings;
}
