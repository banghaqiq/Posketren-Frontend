'use client';
import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircle2,
  Camera,
  Search,
  Package,
  Building,
  User,
  ShieldCheck,
  AlertCircle,
  Clock,
  ArrowRight,
  Upload,
  Crown,
  Eye,
  Trash2,
  RefreshCw,
  X,
  ImageIcon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { packagesApi } from '../../lib/api';
import { PackageItem, Operator } from '../../types';
import { useToast } from '../Toast';
import { CameraScannerModal } from '../CameraScannerModal';
import { processAndCompressImage } from '../../lib/image-utils';

interface PackageValidationViewProps {
  currentUser: Operator | null;
}

// Helper to identify packages intended for pesantren caregiver family (Keluarga Pengasuh)
const isKeluargaPengasuh = (pkg: PackageItem | null): boolean => {
  if (!pkg) return false;
  const name = (pkg.recipientName || '').toLowerCase();
  const id = (pkg.recipientId || '').toUpperCase();
  const wilayah = (pkg.wilayah || '').toLowerCase();
  const daerah = (pkg.daerah || '').toLowerCase();
  return (
    id === 'PENGASUH' ||
    name.includes('pengasuh') ||
    name.includes('dzurriyah') ||
    name.includes('[keluarga pengasuh]') ||
    wilayah.includes('pengasuh') ||
    wilayah.includes('dzurriyah') ||
    daerah.includes('kasepuhan')
  );
};

export const PackageValidationView: React.FC<PackageValidationViewProps> = ({
  currentUser,
}) => {
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<PackageItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'pending' | 'diterima_petugas' | 'diterima_pengurus'>('pending');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form states for delivery / transfer
  const [actionType, setActionType] = useState<'to_asrama' | 'to_santri'>('to_asrama');
  const [kondisiFisik, setKondisiFisik] = useState<'baik' | 'rusak'>('baik');
  const [receiverName, setReceiverName] = useState('');
  const [notes, setNotes] = useState('');

  // Proof photo states
  const [proofPhoto, setProofPhoto] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);

  // Input refs for direct camera vs gallery upload
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lastScannedRef = useRef<string | null>(null);

  const { showToast } = useToast();

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const data = await packagesApi.getAll({
        search: searchQuery,
      });

      // Filter: ONLY items awaiting delivery/transfer!
      // Once confirmed ('telah_diantarkan' or 'telah_diterima'), they are automatically removed from this view.
      const pendingPackages = data.filter((p) => {
        if (p.status === 'telah_diantarkan' || p.status === 'telah_diterima' || p.status === 'disita' || p.status === 'dikembalikan') {
          return false;
        }
        if (statusFilter === 'diterima_petugas') {
          return p.status === 'diterima_petugas' || p.status === 'paket_anonim';
        }
        if (statusFilter === 'diterima_pengurus') {
          return p.status === 'diterima_pengurus';
        }
        // 'pending' shows all active un-delivered packages
        return true;
      });

      setPackages(pendingPackages);

      // If current selected package was confirmed or no longer in pending list, clear selection
      if (selectedPackage && !pendingPackages.some((p) => p.id === selectedPackage.id)) {
        setSelectedPackage(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, [statusFilter]);

  const handleSelectPackage = (pkg: PackageItem) => {
    setSelectedPackage(pkg);
    // Strip leading "[Keluarga Pengasuh] " if present to give a cleaner editable recipient name
    setReceiverName(pkg.recipientName.replace(/^\[Keluarga Pengasuh\]\s*/i, ''));
    setKondisiFisik(pkg.kondisi || 'baik');
    setProofPhoto(pkg.proof_image || null);

    if (pkg.status === 'diterima_petugas' || pkg.status === 'paket_anonim') {
      setActionType('to_asrama');
    } else {
      setActionType('to_santri');
    }

    // On mobile devices, smoothly scroll down to the validation form
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setTimeout(() => {
        const formEl = document.getElementById('validation-form-section');
        if (formEl) {
          formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  };

  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so same photo can be re-selected if needed
    e.target.value = '';

    try {
      setIsUploadingPhoto(true);
      const result = await processAndCompressImage(file, {
        maxWidth: 1280,
        maxHeight: 1280,
        quality: 0.8,
        maxInputSizeMB: 5,
      });
      setProofPhoto(result.dataUrl);
      showToast(`Foto bukti berhasil diproses ke WebP (${result.sizeKB} KB)`, 'success');
    } catch (err: any) {
      console.error('Error processing photo:', err);
      showToast(err.message || 'Gagal memproses gambar foto', 'error');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // const handleScanResi = (scannedResi: string) => {
  //   setSearchQuery(scannedResi);
  //   packagesApi.getAll({ search: scannedResi }).then((results) => {
  //     // Filter out already delivered
  //     const available = results.filter(
  //       (p) => p.status !== 'telah_diantarkan' && p.status !== 'telah_diterima' && p.status !== 'disita' && p.status !== 'dikembalikan'
  //     );
  //     setPackages(available);
  //     if (available.length > 0) {
  //       handleSelectPackage(available[0]);
  //       showToast(`Paket ditemukan: ${available[0].id} (Acuan: ${available[0].trackingNumber})`, 'success');
  //     } else {
  //       showToast(`Paket '${scannedResi}' tidak ditemukan dalam antrian serah terima`, 'warning');
  //     }
  //   });
  // };

  const handleScanResi = (scannedResi: string) => {
  if (!scannedResi) return;

  // Hindari pencarian berulang untuk resi yang sama
  if (lastScannedRef.current === scannedResi) return;

  lastScannedRef.current = scannedResi;
  setSearchQuery(scannedResi);

  packagesApi.getAll({ search: scannedResi })
    .then((results) => {
      const available = results.filter(
        (p) =>
          p.status !== 'telah_diantarkan' &&
          p.status !== 'telah_diterima' &&
          p.status !== 'disita' &&
          p.status !== 'dikembalikan'
      );

      setPackages(available);

      if (available.length > 0) {
        handleSelectPackage(available[0]);

        showToast(
          `Paket ditemukan: ${available[0].id} (Acuan: ${available[0].trackingNumber})`,
          'success'
        );
      } else {
        showToast(
          `Paket '${scannedResi}' tidak ditemukan dalam antrian serah terima`,
          'warning'
        );
      }
    })
    .catch((error) => {
      console.error('Gagal mencari paket hasil scan:', error);

      // Izinkan mencoba kembali jika request gagal
      lastScannedRef.current = null;

      showToast('Gagal mencari paket. Silakan coba kembali.', 'error');
    });
  };

  const handleProcessValidation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPackage) return;

    const isPengasuh = isKeluargaPengasuh(selectedPackage);

    // Mandatory photo check for Keluarga Pengasuh
    if (isPengasuh && !proofPhoto) {
      showToast('Wajib melampirkan foto bukti serah terima untuk paket Keluarga Pengasuh!', 'error');
      const photoEl = document.getElementById('photo-proof-section');
      if (photoEl) {
        photoEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    const now = new Date();
    const timeFormatted =
      now.toLocaleDateString('id-ID') +
      ' ' +
      now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) +
      ' WIB';

    try {
      if (actionType === 'to_asrama') {
        // Status: diterima_pengurus
        await packagesApi.update(selectedPackage.id, {
          status: 'diterima_pengurus',
          notes: notes.trim() || undefined,
        });
        showToast(`Paket ${selectedPackage.id} berhasil disalurkan ke Pengurus Asrama!`, 'success');
      } else {
        // Status: telah_diantarkan (selesai dan otomatis hilang dari antrian)
        await packagesApi.update(selectedPackage.id, {
          status: 'telah_diantarkan',
          kondisi: kondisiFisik,
          receiverName: receiverName.trim() || selectedPackage.recipientName,
          receiverTime: timeFormatted,
          notes: notes.trim() || undefined,
        });
        showToast(`Serah terima paket ${selectedPackage.id} ke santri selesai & otomatis dipindahkan dari antrian!`, 'success');
      }

      // Upload proof photo if attached and new/updated
      if (proofPhoto && proofPhoto !== selectedPackage.proof_image) {
        try {
          await packagesApi.uploadProof(selectedPackage.id, proofPhoto);
        } catch (errProof) {
          console.error('Gagal mengupload foto bukti:', errProof);
          showToast('Status diperbarui namun gagal mengunggah foto bukti', 'warning');
        }
      }

      // Re-fetch packages so confirmed item is automatically removed from the list
      setSelectedPackage(null);
      setNotes('');
      setProofPhoto(null);
      fetchPackages();
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.message || 'Gagal memproses validasi', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/40 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-800 mb-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Tahap 3 & 4a Validasi Sirkulasi
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Validasi & Penyerahan Paket
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Penyaluran dari Pos Paket ke Pengurus Asrama dan Serah Terima langsung ke santri penerima.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsScannerOpen(true)}
          className="w-full sm:w-auto min-h-[44px] flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition shadow-md shadow-blue-600/20 cursor-pointer active:scale-95"
        >
          <Camera className="w-4 h-4" />
          <span>Scan Resi / Barcode</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            placeholder="Cari resi, nama santri, asrama, atau wilayah..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchPackages()}
            className="w-full pl-10 pr-3.5 py-2.5 min-h-[44px] text-xs border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="w-full sm:w-64 px-3.5 py-2.5 min-h-[44px] text-xs border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
        >
          <option value="pending">Semua Menunggu Serah Terima</option>
          <option value="diterima_petugas">Di Pos Paket (Menunggu ke Asrama)</option>
          <option value="diterima_pengurus">Di Pengurus Asrama (Siap ke Santri)</option>
        </select>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Package Queue List (2 cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5 space-y-3 transition-colors">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <h3 className="font-bold text-slate-800 dark:text-white text-xs uppercase tracking-wider">
              Antrian Paket ({packages.length})
            </h3>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">
              Pilih paket untuk divalidasi
            </span>
          </div>

          <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
            {packages.length === 0 ? (
              <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-xs space-y-1">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1 opacity-80" />
                <p className="font-bold text-slate-600 dark:text-slate-400">Tidak Ada Antrian Paket</p>
                <p className="text-[11px]">Semua paket telah diserahterimakan atau tidak ada data yang cocok.</p>
              </div>
            ) : (
              packages.map((pkg) => {
                const isSelected = selectedPackage?.id === pkg.id;
                return (
                  <div
                    key={pkg.id}
                    onClick={() => handleSelectPackage(pkg)}
                    className={`p-3.5 rounded-2xl border text-left cursor-pointer transition active:scale-[0.99] ${
                      isSelected
                        ? 'bg-blue-50/90 dark:bg-blue-950/60 border-blue-500 shadow-xs'
                        : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-slate-900 dark:text-white truncate">
                        {pkg.trackingNumber}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                        {pkg.courier}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap mt-1">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {pkg.recipientName}
                      </span>
                      {isKeluargaPengasuh(pkg) && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-700 px-1.5 py-0.5 rounded-md">
                          <Crown className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                          Keluarga Pengasuh
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {pkg.asrama && !isKeluargaPengasuh(pkg) && pkg.recipientId !== 'ANONIM' ? `${pkg.asrama} • ` : ''}
                      {pkg.wilayah} ({pkg.daerah})
                    </div>

                    <div className="mt-2.5 flex items-center justify-between text-[10px]">
                      <span
                        className={`whitespace-nowrap px-2 py-0.5 rounded-full font-bold ${
                          pkg.status === 'diterima_petugas'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                        }`}
                      >
                        {pkg.status === 'diterima_petugas' ? 'Di Pos Paket' : 'Di Pengurus Asrama'}
                      </span>
                      <span className="font-mono text-slate-400 dark:text-slate-500">{pkg.id}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Action & Verification Form (3 cols) */}
        <div id="validation-form-section" className="lg:col-span-3">
          {selectedPackage ? (
            <form
              onSubmit={handleProcessValidation}
              className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-6 md:p-7 space-y-5 transition-colors"
            >
              {/* Alert banner for Keluarga Pengasuh */}
              {isKeluargaPengasuh(selectedPackage) && (
                <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border-2 border-amber-400 dark:border-amber-600/70 text-amber-950 dark:text-amber-100 flex items-start gap-3 shadow-xs">
                  <div className="p-2 bg-amber-200/70 dark:bg-amber-900/70 rounded-xl text-amber-900 dark:text-amber-300 shrink-0 mt-0.5">
                    <Crown className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5 text-xs">
                    <h5 className="font-extrabold text-amber-950 dark:text-amber-100 flex items-center gap-1.5">
                      <span>Paket Khusus Keluarga Pengasuh / Dzurriyah</span>
                      <span className="text-[10px] bg-amber-200/80 dark:bg-amber-900 px-2 py-0.5 rounded-full font-bold">
                        SOP Wajib Foto
                      </span>
                    </h5>
                    <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
                      Sesuai protokol pesantren, validasi paket Keluarga Pengasuh <strong>wajib menyertakan foto bukti fisik</strong> (bisa foto langsung dari HP atau upload dari galeri).
                    </p>
                  </div>
                </div>
              )}

              {/* Selected package summary */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-xs font-extrabold text-blue-700 dark:text-blue-300 bg-blue-100/70 dark:bg-blue-900/50 px-2 py-0.5 rounded-md">
                        {selectedPackage.id}
                      </span>
                      {isKeluargaPengasuh(selectedPackage) && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-800 dark:text-amber-300 bg-amber-100/90 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-700 px-2 py-0.5 rounded-md">
                          <Crown className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                          Keluarga Pengasuh
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base mt-1.5">
                      {selectedPackage.trackingNumber}
                    </h4>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-bold">
                      Ekspedisi:
                    </span>
                    <div className="font-bold text-slate-800 dark:text-slate-200">{selectedPackage.courier}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 dark:border-slate-700/60 text-[11px]">
                  <div>
                    <span className="text-slate-400 dark:text-slate-500">Penerima:</span>
                    <div className="font-bold text-slate-800 dark:text-slate-200">{selectedPackage.recipientName}</div>
                  </div>
                  <div>
                    <span className="text-slate-400 dark:text-slate-500">
                      {isKeluargaPengasuh(selectedPackage) || selectedPackage.recipientId === 'ANONIM' ? 'Tujuan Distribusi:' : 'Tujuan Asrama:'}
                    </span>
                    <div className="font-semibold text-slate-800 dark:text-slate-200">
                      {selectedPackage.asrama && !isKeluargaPengasuh(selectedPackage) && selectedPackage.recipientId !== 'ANONIM' ? `${selectedPackage.asrama} — ` : ''}
                      {selectedPackage.wilayah} ({selectedPackage.daerah})
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Mode Switcher Tabs */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 text-[10px]">
                  Pilih Tahapan Sirkulasi
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setActionType('to_asrama')}
                    className={`p-3.5 rounded-2xl border text-left transition cursor-pointer active:scale-98 ${
                      actionType === 'to_asrama'
                        ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-900 dark:text-blue-200 font-bold shadow-xs'
                        : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs mb-0.5">
                      <Building className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                      <span>Pos Paket → Pengurus Asrama</span>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                      Ubah status ke 'Di Pengurus Asrama'
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActionType('to_santri')}
                    className={`p-3.5 rounded-2xl border text-left transition cursor-pointer active:scale-98 ${
                      actionType === 'to_santri'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-bold shadow-xs'
                        : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs mb-0.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>Serah Terima ke Santri</span>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                      Konfirmasi selesai & dipindahkan dari antrian
                    </div>
                  </button>
                </div>
              </div>

              {/* Form fields based on selected action */}
              {actionType === 'to_asrama' ? (
                <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 text-[10px]">
                      Catatan Penyaluran ke Pengurus
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Diserahkan ke pengurus wilayah ust. Rozi..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              ) : (
                /* Handover to Student */
                <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                  {/* Step 1: Physical Condition */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 text-[10px]">
                      Verifikasi Kondisi Fisik Paket Saat Diterima
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setKondisiFisik('baik')}
                        className={`min-h-[42px] p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer active:scale-95 ${
                          kondisiFisik === 'baik'
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-800 dark:text-emerald-300'
                            : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>Kondisi Baik</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setKondisiFisik('rusak')}
                        className={`min-h-[42px] p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer active:scale-95 ${
                          kondisiFisik === 'rusak'
                            ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-800 dark:text-rose-300'
                            : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                        <span>Rusak / Cacat</span>
                      </button>
                    </div>
                  </div>

                  {/* Receiver Name & Officer */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 text-[10px]">
                        Nama Penerima Barang
                      </label>
                      <input
                        type="text"
                        required
                        value={receiverName}
                        onChange={(e) => setReceiverName(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 text-[10px]">
                        Petugas Penanggung Jawab
                      </label>
                      <input
                        type="text"
                        disabled
                        value={currentUser?.name || 'Petugas Pos'}
                        className="w-full px-3.5 py-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Proof Photo Section (Mandatory for Keluarga Pengasuh, optional for others) */}
              <div id="photo-proof-section" className="space-y-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Foto Bukti Fisik Serah Terima</span>
                    {isKeluargaPengasuh(selectedPackage) ? (
                      <span className="text-[10px] font-extrabold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800 animate-pulse">
                        * WAJIB
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                        (Opsional)
                      </span>
                    )}
                  </label>
                  {proofPhoto && (
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Foto Terlampir
                    </span>
                  )}
                </div>

                {/* Hidden file inputs: One for mobile camera shutter, one for file/gallery picker */}
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoFileChange}
                  className="hidden"
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoFileChange}
                  className="hidden"
                />

                {proofPhoto ? (
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="flex flex-col sm:flex-row items-center gap-3.5">
                      {/* Thumbnail Preview */}
                      <div
                        onClick={() => setIsPhotoModalOpen(true)}
                        className="relative group w-full sm:w-28 h-28 sm:h-24 bg-slate-200 dark:bg-slate-900 rounded-xl overflow-hidden cursor-pointer border border-slate-300 dark:border-slate-700 shrink-0"
                        title="Klik untuk memperbesar foto"
                      >
                        <img
                          src={proofPhoto}
                          alt="Foto Bukti"
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                          <Eye className="w-5 h-5" />
                        </div>
                      </div>

                      {/* Details & Actions */}
                      <div className="flex-1 w-full space-y-2">
                        <div className="text-xs text-slate-600 dark:text-slate-300">
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">✓ Foto bukti siap disimpan.</span> Klik foto untuk memperbesar atau gunakan tombol di bawah untuk mengganti.
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setIsPhotoModalOpen(true)}
                            className="px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 flex items-center gap-1.5 cursor-pointer active:scale-95"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Lihat Penuh</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => cameraInputRef.current?.click()}
                            className="px-3 py-1.5 text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-xl text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 flex items-center gap-1.5 cursor-pointer active:scale-95"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Foto Ulang</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setProofPhoto(null)}
                            className="px-3 py-1.5 text-xs font-semibold bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 flex items-center gap-1.5 cursor-pointer active:scale-95 ml-auto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Hapus</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`p-4 sm:p-5 rounded-2xl border-2 border-dashed transition text-center ${
                      isKeluargaPengasuh(selectedPackage)
                        ? 'border-amber-400 dark:border-amber-600/70 bg-amber-50/50 dark:bg-amber-950/20'
                        : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40'
                    }`}
                  >
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="flex justify-center">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            isKeluargaPengasuh(selectedPackage)
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300'
                              : 'bg-blue-100 text-blue-600 dark:bg-blue-900/60 dark:text-blue-300'
                          }`}
                        >
                          <Camera className="w-5 h-5" />
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {isKeluargaPengasuh(selectedPackage)
                            ? 'Wajib Melampirkan Bukti Foto Penyerahan'
                            : 'Lampirkan Foto Bukti Fisik'}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Ambil langsung dengan kamera HP di tempat atau pilih dari galeri berkas.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                        <button
                          type="button"
                          disabled={isUploadingPhoto}
                          onClick={() => cameraInputRef.current?.click()}
                          className="min-h-[44px] px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-sm shadow-blue-600/20 cursor-pointer active:scale-95 disabled:opacity-50"
                        >
                          <Camera className="w-4 h-4" />
                          <span>Ambil Foto (Kamera HP)</span>
                        </button>

                        <button
                          type="button"
                          disabled={isUploadingPhoto}
                          onClick={() => fileInputRef.current?.click()}
                          className="min-h-[44px] px-3.5 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                        >
                          <Upload className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                          <span>Pilih dari Galeri / File</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit button */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  type="submit"
                  className={`w-full sm:w-auto min-h-[46px] px-6 py-2.5 text-white text-xs font-bold rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95 ${
                    isKeluargaPengasuh(selectedPackage)
                      ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/30'
                      : actionType === 'to_asrama'
                      ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/30'
                      : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
                  }`}
                >
                  {isKeluargaPengasuh(selectedPackage) ? (
                    <Crown className="w-4 h-4" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>
                    {isKeluargaPengasuh(selectedPackage)
                      ? actionType === 'to_asrama'
                        ? 'Konfirmasi Penyaluran Dalem Pengasuh'
                        : 'Konfirmasi Serah Terima Keluarga Pengasuh'
                      : actionType === 'to_asrama'
                      ? 'Konfirmasi Penyaluran ke Asrama'
                      : 'Konfirmasi Serah Terima ke Santri'}
                  </span>
                </button>
              </div>
            </form>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-12 text-center text-slate-400 dark:text-slate-500 text-xs">
              Pilih salah satu paket dari antrian di sebelah kiri untuk memulai validasi & serah terima.
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Modal for Full Proof Photo Preview */}
      {isPhotoModalOpen && proofPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                  Preview Foto Bukti Serah Terima
                </h4>
              </div>
              <button
                onClick={() => setIsPhotoModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex items-center justify-center bg-black/5 dark:bg-black/30">
              <img
                src={proofPhoto}
                alt="Bukti Serah Terima"
                className="max-h-[65vh] w-auto max-w-full object-contain rounded-xl shadow-md"
              />
            </div>
            <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setIsPhotoModalOpen(false)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      <CameraScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleScanResi}
        title="Scan Barcode Resi untuk Validasi"
      />
    </div>
  );
};
