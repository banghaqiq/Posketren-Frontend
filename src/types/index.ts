export type Role = 'admin' | 'petugaspos' | 'keamanan';

export type PackageStatus =
  | 'diterima_petugas'
  | 'diterima_pengurus'
  | 'telah_diantarkan'
  | 'telah_diterima'
  | 'disita'
  | 'dilepaskan'
  | 'kadaluarsa'
  | 'dikembalikan'
  | 'paket_anonim';

export type PackageType = 'regular' | 'jastip';
export type PackageKondisi = 'baik' | 'rusak';
export type Gender = 'Putra' | 'Putri';

export interface Operator {
  id: string;
  username: string;
  name: string;
  role: Role;
  wilayah?: string | null;
  photo?: string | null;
  login_attempts?: number;
  locked_until?: string | null;
  created_at?: string;
}

export interface Student {
  niup: string;
  nama_lengkap: string;
  jenis_kelamin: string;
  daerah: string;
  wilayah: string;
  created_at?: string;
  updated_at?: string;
}

export interface PackageItem {
  id: string;
  trackingNumber: string;
  courier: string;
  recipientId: string;
  recipientName: string;
  asrama?: Gender | null;
  wilayah: string;
  daerah: string;
  room?: string | null;
  type: PackageType;
  status: PackageStatus;
  dateReceived: string;
  kondisi: PackageKondisi;
  notes?: string | null;
  category?: string | null;
  arrivalTime?: string | null;
  confiscatedReason?: string | null;
  confiscatedBy?: string | null;
  confiscatedNotes?: string | null;
  confiscatedDate?: string | null;
  confiscatedEvidenceUrl?: string | null;
  returnCourier?: string | null;
  returnTrackingNumber?: string | null;
  returnProofUrl?: string | null;
  receiverName?: string | null;
  receiverTime?: string | null;
  rackLocation: string;
  manifestId?: string | null;
  circulationType?: string | null;
  isExternalRecipient: boolean;
  manualRecipientName?: string | null;
  proof_image?: string | null;
  proof_image_mimetype?: string | null;
  created_at: string;
  updated_at: string;
  manifest?: ManifestItem | null;
}

export interface ManifestItem {
  id: string;
  packageId?: string | null;
  status: string;
  rackLocation: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  packageRef?: PackageItem | null;
  packages?: PackageItem[];
}

export interface ActivityLogItem {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  operator: string;
  created_at: string;
}

export interface ApiConfigData {
  id: number;
  baseUrl: string;
  token: string;
  syncFrequency: 'hourly' | 'daily' | 'weekly' | 'manual';
  lastSyncTime: string;
  lastSyncStatus: 'success' | 'failed';
  updatedCount: number;
  mapping_json: Record<string, string>;
  updated_at: string;
}

export interface DashboardStats {
  kpi: {
    totalPackages: number;
    todayIncoming: number;
    activePackages: number;
    inPos: number;
    inAsrama: number;
    delivered: number;
    confiscated: number;
    expired: number;
    returnedRts: number;
    anonymous: number;
    regular: number;
    jastip: number;
    totalStudents: number;
    totalOperators: number;
  };
  statusDistribution: Record<string, number>;
  recentPackages: PackageItem[];
  recentLogs: ActivityLogItem[];
}
