'use client';
import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  Camera,
  Upload,
  CheckCircle2,
  RotateCcw,
  UserCheck,
  AlertTriangle,
  Eye,
  Plus,
  Trash2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { packagesApi } from '../../lib/api';
import { PackageItem, Operator } from '../../types';
import { useToast } from '../Toast';
import { CameraScannerModal } from '../CameraScannerModal';
import { processAndCompressImage } from '../../lib/image-utils';

interface ConfiscatedViewProps {
  currentUser: Operator | null;
}

export const ConfiscatedView: React.FC<ConfiscatedViewProps> = ({ currentUser }) => {
  const [confiscatedList, setConfiscatedList] = useState<PackageItem[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<PackageItem | null>(null);
  const [reasonFilter, setReasonFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form states for new confiscation
  const [targetPackageId, setTargetPackageId] = useState('');
  const [targetPackage, setTargetPackage] = useState<PackageItem | null>(null);
  const [isSearchingPackage, setIsSearchingPackage] = useState(false);
  const [confiscatedReason, setConfiscatedReason] = useState('Elektronik Terlarang');
  const [confiscatedNotes, setConfiscatedNotes] = useState('');
  const [evidencePhoto, setEvidencePhoto] = useState<string | null>(null);

  // Release / RTS modal states
  const [releaseAction, setReleaseAction] = useState<'dilepaskan' | 'dikembalikan' | null>(null);
  const [releaseNotes, setReleaseNotes] = useState('');

  const { showToast } = useToast();

  const fetchConfiscated = async () => {
    setLoading(true);
    try {
      const data = await packagesApi.getAll({
        search: searchQuery,
        status: 'disita',
      });
      setConfiscatedList(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfiscated();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = '';

    try {
      const result = await processAndCompressImage(file, {
        maxWidth: 1280,
        maxHeight: 1280,
        quality: 0.8,
        maxInputSizeMB: 5,
      });
      setEvidencePhoto(result.dataUrl);
      showToast(`Foto bukti sitaan berhasil dikonversi ke WebP (${result.sizeKB} KB)`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Gagal memproses foto bukti', 'error');
    }
  };

  const handleFindTargetPackage = async (identifier: string) => {
    const searchValue = identifier.trim();

    if (!searchValue) {
      setTargetPackage(null);
      return;
    }

    setIsSearchingPackage(true);
    setTargetPackage(null);

    try {
      const pkg = await packagesApi.getOne(searchValue);

      if (pkg.status === 'disita') {
        showToast(
          'Paket ini sudah tercatat sebagai barang sitaan',
          'error',
        );
        setTargetPackageId(pkg.id);
        return;
      }

      setTargetPackage(pkg);
      setTargetPackageId(pkg.id);

      showToast('Data paket berhasil ditemukan', 'success');

    } catch (err: any) {
      setTargetPackage(null);

      showToast(
        err.response?.data?.message ||
          'Paket dengan ID atau nomor resi tersebut tidak ditemukan',
        'error',
      );
    } finally {
      setIsSearchingPackage(false);
    }
  };

  const handleScanInModal = async (scannedResi: string) => {
    setTargetPackageId(scannedResi);

    await handleFindTargetPackage(scannedResi);
  };

  const handleSaveConfiscation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetPackage) {
      showToast('Pilih atau ketik ID/Resi paket yang disita', 'error');
      return;
    }

    setLoading(true);
    try {
      const now = new Date().toISOString().slice(0, 10);
      const updated = await packagesApi.update(targetPackage.id, {
        status: 'disita',
        confiscatedReason,
        confiscatedNotes: confiscatedNotes.trim(),
        confiscatedBy: currentUser?.name || 'Biro Keamanan Pondok',
        confiscatedDate: now,
      });

      if (evidencePhoto) {
        await packagesApi.uploadProof(updated.id, evidencePhoto);
      }

      showToast(`Paket ${updated.id} berhasil dicatat sebagai sitaan Keamanan`, 'success');
      setIsModalOpen(false);
      setTargetPackageId('');
      setConfiscatedNotes('');
      setEvidencePhoto(null);
      fetchConfiscated();
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.message || 'Gagal mencatat penyitaan', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReleaseOrRts = async () => {
    if (!selectedPackage || !releaseAction) return;

    try {
      await packagesApi.update(selectedPackage.id, {
        status: releaseAction,
        notes: releaseNotes.trim() || undefined,
      });

      showToast(
        releaseAction === 'dilepaskan'
          ? `Barang sitaan berhasil dilepaskan ke wali santri!`
          : `Barang sitaan dialihkan ke protokol pengembalian (RTS)!`,
        'success'
      );

      setReleaseAction(null);
      setSelectedPackage(null);
      setReleaseNotes('');
      fetchConfiscated();
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.message || 'Gagal memperbarui status sitaan', 'error');
    }
  };

  const filteredItems = confiscatedList.filter((item) => {
    if (reasonFilter !== 'all' && item.confiscatedReason !== reasonFilter) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-800 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/60 px-2.5 py-0.5 rounded-full border border-rose-300 dark:border-rose-800 mb-1.5">
            <ShieldAlert className="w-3.5 h-3.5" />
            Tahap 4b Khusus Biro Keamanan Pondok
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Log Penyitaan Barang Terlarang
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Pencatatan barang sitaan (gadget, MP3, media tidak syar'i, sajam) lengkap dengan klasifikasi alasan dan bukti foto.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto min-h-[44px] flex items-center justify-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition shadow-md shadow-rose-600/20 cursor-pointer active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Catat Penyitaan Baru</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            placeholder="Cari berdasarkan resi, ID, nama santri, atau deskripsi barang..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchConfiscated()}
            className="w-full pl-10 pr-3.5 py-2.5 text-xs border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
        </div>

        <select
          value={reasonFilter}
          onChange={(e) => setReasonFilter(e.target.value)}
          className="w-full sm:w-64 px-3.5 py-2.5 text-xs border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
        >
          <option value="all">Semua Alasan Sitaan</option>
          <option value="Elektronik Terlarang">🔌 Elektronik Terlarang</option>
          <option value="Media Tidak Syar'i">📚 Media Tidak Syar'i</option>
          <option value="Senjata / Alat Tajam">🔪 Senjata / Alat Tajam</option>
          <option value="Makanan Luar Tanpa Izin">🍕 Makanan Luar Tanpa Izin</option>
          <option value="Pelanggaran Aturan Lainnya">📋 Pelanggaran Lainnya</option>
        </select>
      </div>

      {/* Confiscated Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 dark:text-white text-xs uppercase tracking-wider">
            Daftar Barang Sitaan Aktif ({filteredItems.length})
          </h3>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">
            Tersimpan di Gudang Keamanan
          </span>
        </div>

        {/* Mobile View: Clean Confiscated Cards (sm:hidden) */}
        <div className="block sm:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs">
              Tidak ada data barang yang sedang disita
            </div>
          ) : (
            filteredItems.map((pkg) => (
              <div key={pkg.id} className="p-3.5 space-y-2 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-mono font-bold text-slate-900 dark:text-white text-xs truncate">
                      {pkg.trackingNumber}
                    </div>
                    <div className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
                      {pkg.id}
                    </div>
                  </div>
                  <span className="shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                    {pkg.confiscatedReason || 'Barang Terlarang'}
                  </span>
                </div>

                <div className="text-xs">
                  <div className="font-bold text-slate-800 dark:text-slate-200">
                    {pkg.recipientName}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    {pkg.asrama && !pkg.recipientName.includes('Keluarga Pengasuh') && pkg.recipientId !== 'ANONIM' ? `${pkg.asrama} • ` : ''}{pkg.wilayah}
                  </div>
                </div>

                {pkg.confiscatedNotes && (
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl">
                    "{pkg.confiscatedNotes}"
                  </p>
                )}

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col xs:flex-row xs:items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                    Oleh: {pkg.confiscatedBy || 'Biro Keamanan'} • {pkg.confiscatedDate || pkg.dateReceived}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedPackage(pkg);
                        setReleaseAction('dilepaskan');
                      }}
                      className="flex-1 xs:flex-initial min-h-[36px] px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 rounded-xl transition cursor-pointer active:scale-95 text-center"
                    >
                      Lepas ke Wali
                    </button>
                    <button
                      onClick={() => {
                        setSelectedPackage(pkg);
                        setReleaseAction('dikembalikan');
                      }}
                      className="flex-1 xs:flex-initial min-h-[36px] px-3 py-1.5 text-xs font-bold text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-950/60 hover:bg-orange-100 dark:hover:bg-orange-900/60 border border-orange-200 dark:border-orange-800 rounded-xl transition cursor-pointer active:scale-95 text-center"
                    >
                      Return (RTS)
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table (hidden sm:block) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase font-semibold text-[10px]">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">ID & Resi</th>
                <th className="px-4 py-3 whitespace-nowrap">Pemilik / Santri</th>
                <th className="px-4 py-3 whitespace-nowrap min-w-[150px]">Klasifikasi Alasan</th>
                <th className="px-4 py-3 whitespace-nowrap min-w-[180px]">Keterangan Sitaan</th>
                <th className="px-4 py-3 whitespace-nowrap min-w-[130px]">Petugas & Tanggal</th>
                <th className="px-4 py-3 text-right whitespace-nowrap min-w-[200px]">Aksi Keputusan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 dark:text-slate-500">
                    Tidak ada data barang yang sedang disita
                  </td>
                </tr>
              ) : (
                filteredItems.map((pkg) => (
                  <tr key={pkg.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                    <td className="px-4 py-3">
                      <div className="font-mono font-bold text-slate-900 dark:text-white truncate max-w-[140px]">
                        {pkg.trackingNumber}
                      </div>
                      <div className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
                        {pkg.id}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-800 dark:text-slate-200">
                        {pkg.recipientName}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        {pkg.asrama && !pkg.recipientName.includes('Keluarga Pengasuh') && pkg.recipientId !== 'ANONIM' ? `${pkg.asrama} • ` : ''}{pkg.wilayah}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="whitespace-nowrap inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                        {pkg.confiscatedReason || 'Barang Terlarang'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 max-w-xs truncate text-[11px]">
                      {pkg.confiscatedNotes || pkg.notes || '-'}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-600 dark:text-slate-400">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {pkg.confiscatedBy || 'Biro Keamanan'}
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500">
                        {pkg.confiscatedDate || pkg.dateReceived}
                      </div>
                    </td>
                    {/* Action Column with clear spacing between 'Lepas ke Wali' and 'Return (RTS)' */}
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-2.5">
                        <button
                          onClick={() => {
                            setSelectedPackage(pkg);
                            setReleaseAction('dilepaskan');
                          }}
                          className="px-3 py-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 rounded-xl transition cursor-pointer active:scale-95"
                        >
                          Lepas ke Wali
                        </button>

                        <span className="text-slate-300 dark:text-slate-700 font-bold">|</span>

                        <button
                          onClick={() => {
                            setSelectedPackage(pkg);
                            setReleaseAction('dikembalikan');
                          }}
                          className="px-3 py-1.5 text-[11px] font-bold text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-950/60 hover:bg-orange-100 dark:hover:bg-orange-900/60 border border-orange-200 dark:border-orange-800 rounded-xl transition cursor-pointer active:scale-95"
                        >
                          Return (RTS)
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: New Confiscation with Barcode Scanner */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="px-6 py-4 bg-rose-50 dark:bg-rose-950/60 border-b border-rose-100 dark:border-rose-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                <h3 className="font-bold text-rose-950 dark:text-rose-200 text-sm">
                  Catat Penyitaan Barang Baru
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveConfiscation} className="p-6 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                    ID Paket / Nomor Resi Kurir
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsScannerOpen(true)}
                    className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Scan Barcode Resi
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Scan atau ketik ID paket / nomor resi..."
                    value={targetPackageId}
                    onChange={(e) => {
                      setTargetPackageId(e.target.value);
                      setTargetPackage(null);
                    }}
                    className="flex-1 min-w-0 px-3.5 py-2.5 text-xs border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />

                  <button
                    type="button"
                    disabled={isSearchingPackage || !targetPackageId.trim()}
                    onClick={() => handleFindTargetPackage(targetPackageId)}
                    className="px-3 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl disabled:opacity-50"
                  >
                    {isSearchingPackage ? 'Mencari...' : 'Cari'}
                  </button>
                </div>
              </div>

              {targetPackage && (
                <div className="mt-2 p-3 rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800">
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 text-xs font-bold mb-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Paket ditemukan dalam database
                  </div>

                  <div className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                    <p>
                      <strong>Nomor Resi:</strong> {targetPackage.trackingNumber || '-'}
                    </p>
                    <p>
                      <strong>ID Paket:</strong> {targetPackage.id}
                    </p>
                    <p>
                      <strong>Nama Penerima:</strong> {targetPackage.recipientName || '-'}
                    </p>
                    <p>
                      <strong>Wilayah:</strong> {targetPackage.wilayah || '-'}
                    </p>
                    <p>
                      <strong>Asrama:</strong> {targetPackage.asrama || '-'}
                    </p>
                    <p>
                      <strong>Status Saat Ini:</strong> {targetPackage.status}
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 text-[10px]">
                  Klasifikasi Alasan Penyitaan
                </label>
                <select
                  value={confiscatedReason}
                  onChange={(e) => setConfiscatedReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="Elektronik Terlarang">🔌 Elektronik Terlarang (HP, Gadget, MP3)</option>
                  <option value="Media Tidak Syar'i">📚 Media Tidak Syar'i (Buku, Majalah Terlarang)</option>
                  <option value="Senjata / Alat Tajam">🔪 Senjata / Alat Tajam</option>
                  <option value="Makanan Luar Tanpa Izin">🍕 Makanan Luar Tanpa Izin</option>
                  <option value="Pelanggaran Aturan Lainnya">📋 Pelanggaran Aturan Pondok Lainnya</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 text-[10px]">
                  Deskripsi & Merek Barang yang Disita
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Jelaskan jenis barang, merek, dan kronologi penyitaan..."
                  value={confiscatedNotes}
                  onChange={(e) => setConfiscatedNotes(e.target.value)}
                  className="w-full p-3 text-xs border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              {/* Upload Proof Image */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 text-[10px]">
                  Foto Bukti Sitaan (Maks 5MB)
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl cursor-pointer border border-slate-200 dark:border-slate-700 transition">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Foto Bukti</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  {evidencePhoto && (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Foto siap disimpan
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition shadow-md shadow-rose-600/30 cursor-pointer"
                >
                  {loading ? 'Menyimpan...' : 'Simpan Sitaan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Release or RTS Confirmation Dialog */}
      {releaseAction && selectedPackage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">
              {releaseAction === 'dilepaskan'
                ? 'Konfirmasi Pelepasan Barang ke Wali'
                : 'Konfirmasi Pengembalian Barang (RTS)'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Paket <span className="font-mono font-bold">{selectedPackage.trackingNumber}</span> ({selectedPackage.recipientName}) akan diproses status: <span className="font-bold text-slate-800 dark:text-slate-200">{releaseAction}</span>.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1 text-[10px]">
                Catatan Petugas Keamanan
              </label>
              <textarea
                rows={2}
                placeholder="Contoh: Telah diserahkan ke wali santri bapak Ahmad saat sambangan..."
                value={releaseNotes}
                onChange={(e) => setReleaseNotes(e.target.value)}
                className="w-full p-2.5 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setReleaseAction(null)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleReleaseOrRts}
                className={`px-5 py-2 text-white text-xs font-bold rounded-xl transition cursor-pointer ${
                  releaseAction === 'dilepaskan' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-orange-600 hover:bg-orange-700'
                }`}
              >
                Konfirmasi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barcode scanner for modal */}
      <CameraScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleScanInModal}
        title="Scan Barcode Resi Barang Sitaan"
      />
    </div>
  );
};
