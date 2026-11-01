'use client';
import React, { useState, useEffect } from 'react';
import {
  RotateCcw,
  Search,
  Package,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Printer,
  Truck,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { packagesApi } from '../../lib/api';
import { PackageItem, Operator } from '../../types';
import { useToast } from '../Toast';

interface RtsViewProps {
  currentUser: Operator | null;
}

export const RtsView: React.FC<RtsViewProps> = ({ currentUser }) => {
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<PackageItem | null>(null);
  const [returnCourier, setReturnCourier] = useState('J&T Express');
  const [returnTrackingNumber, setReturnTrackingNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [proofPhoto, setProofPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { showToast } = useToast();

  const fetchRtsPackages = async () => {
    try {
      const all = await packagesApi.getAll({ search: searchQuery });
      // Packages eligible for RTS: ONLY those pending return!
      // Once confirmed as 'dikembalikan', they are automatically removed from this RTS queue.
      const pendingRts = all.filter(
        (p) => p.status === 'kadaluarsa' || p.status === 'paket_anonim'
      );
      setPackages(pendingRts);

      if (selectedPackage && !pendingRts.some((p) => p.id === selectedPackage.id)) {
        setSelectedPackage(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchRtsPackages();
  }, []);

  const handleSelectPackage = (pkg: PackageItem) => {
    setSelectedPackage(pkg);
    setReturnCourier(pkg.courier || 'J&T Express');

    // Automatically fill new RTS tracking number per user requirement
    const autoRtsResi = `RTS-${pkg.trackingNumber}-${Math.floor(100 + Math.random() * 900)}`;
    setReturnTrackingNumber(autoRtsResi);

    // On mobile devices, smoothly scroll down to the RTS form
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setTimeout(() => {
        const formEl = document.getElementById('rts-form-section');
        if (formEl) {
          formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('Ukuran foto maksimal 5MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setProofPhoto(reader.result as string);
      showToast('Foto bukti serah terima RTS berhasil diunggah', 'success');
    };
    reader.readAsDataURL(file);
  };

  const handleProcessRts = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPackage) return;
    if (!returnTrackingNumber.trim()) {
      showToast('Nomor resi RTS pengembalian wajib diisi', 'error');
      return;
    }

    setLoading(true);
    try {
      await packagesApi.update(selectedPackage.id, {
        status: 'dikembalikan',
        returnCourier,
        returnTrackingNumber: returnTrackingNumber.trim(),
        notes: notes.trim() || 'Paket dikembalikan ke kurir ekspedisi asal (RTS)',
      });

      if (proofPhoto) {
        await packagesApi.uploadProof(selectedPackage.id, proofPhoto);
      }

      showToast(`Paket ${selectedPackage.id} berhasil diproses RTS & otomatis dipindahkan dari antrian!`, 'success');

      // Clear selection and re-fetch to automatically remove confirmed item
      setSelectedPackage(null);
      setReturnTrackingNumber('');
      setNotes('');
      setProofPhoto(null);
      fetchRtsPackages();
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.message || 'Gagal memproses RTS', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-800 dark:text-orange-300 bg-orange-100 dark:bg-orange-950/60 px-2.5 py-0.5 rounded-full border border-orange-300 dark:border-orange-800 mb-1.5">
          <RotateCcw className="w-3.5 h-3.5" />
          Tahap 5 Protokol RTS (Return to Sender)
        </div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Protokol Pengembalian Paket (RTS)
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Proses pengembalian paket kadaluarsa atau barang anonim tidak bertuan ke kurir ekspedisi asal.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Packages List (2 cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-3 transition-colors">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <h3 className="font-bold text-slate-800 dark:text-white text-xs uppercase tracking-wider">
              Antrian Paket RTS ({packages.length})
            </h3>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">Pilih untuk diproses</span>
          </div>

          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
            {packages.length === 0 ? (
              <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-xs space-y-1">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1 opacity-80" />
                <p className="font-bold text-slate-600 dark:text-slate-400">Tidak Ada Paket RTS</p>
                <p className="text-[11px]">Tidak ada paket kadaluarsa yang menunggu pengembalian kurir.</p>
              </div>
            ) : (
              packages.map((pkg) => {
                const isSelected = selectedPackage?.id === pkg.id;
                return (
                  <div
                    key={pkg.id}
                    onClick={() => handleSelectPackage(pkg)}
                    className={`p-3.5 rounded-2xl border text-left cursor-pointer transition ${
                      isSelected
                        ? 'bg-orange-50/90 dark:bg-orange-950/60 border-orange-500 shadow-xs'
                        : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-orange-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                        {pkg.trackingNumber}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300">
                        {pkg.status === 'kadaluarsa' ? 'Kadaluarsa' : 'Anonim'}
                      </span>
                    </div>

                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">
                      {pkg.recipientName}
                    </div>

                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Ekspedisi: {pkg.courier} • Masuk: {pkg.dateReceived}
                    </div>

                    <div className="mt-2 text-[10px] font-mono text-slate-400 dark:text-slate-500">
                      {pkg.id}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Process RTS Form (3 cols) */}
        <div id="rts-form-section" className="lg:col-span-3">
          {selectedPackage ? (
            <form
              onSubmit={handleProcessRts}
              className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-6 md:p-7 space-y-5 transition-colors"
            >
              {/* Target Package Details */}
              <div className="p-4 bg-orange-50/70 dark:bg-orange-950/40 rounded-2xl border border-orange-200 dark:border-orange-900 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-orange-900 dark:text-orange-300">
                    ID: {selectedPackage.id}
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-orange-200 dark:bg-orange-900 text-orange-900 dark:text-orange-200 rounded-md">
                    Siap Dikembalikan
                  </span>
                </div>
                <div className="font-bold text-slate-900 dark:text-white text-sm">
                  Resi Asal: <span className="font-mono">{selectedPackage.trackingNumber}</span>
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400">
                  Penerima: {selectedPackage.recipientName} ({selectedPackage.asrama && !selectedPackage.recipientName.includes('Keluarga Pengasuh') && selectedPackage.recipientId !== 'ANONIM' ? `${selectedPackage.asrama} • ` : ''}{selectedPackage.wilayah})
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 text-[10px]">
                    Kurir Ekspedisi Pengembalian
                  </label>
                  <select
                    value={returnCourier}
                    onChange={(e) => setReturnCourier(e.target.value)}
                    className="w-full px-3.5 py-2.5 min-h-[44px] text-xs border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="J&T Express">J&T Express</option>
                    <option value="Shopee Xpress">Shopee Xpress (SPX)</option>
                    <option value="JNE Reguler">JNE Express</option>
                    <option value="SiCepat Ekspres">SiCepat Ekspres</option>
                    <option value="Pos Indonesia">Pos Indonesia</option>
                    <option value="Ninja Xpress">Ninja Xpress</option>
                    <option value="Wahana Express">Wahana Express</option>
                  </select>
                </div>

                {/* Nomor Resi Baru RTS Terisi Otomatis */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                      Nomor Resi Baru RTS (Otomatis)
                    </label>
                    <span className="text-[9px] font-bold text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-950 px-1.5 py-0.2 rounded">
                      Auto-generated
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Resi RTS terisi otomatis..."
                    value={returnTrackingNumber}
                    onChange={(e) => setReturnTrackingNumber(e.target.value)}
                    className="w-full px-3.5 py-2.5 min-h-[44px] text-xs font-mono border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  />
                </div>
              </div>

              {/* Upload Bukti RTS */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 text-[10px]">
                  Foto Bukti Serah Terima ke Driver Kurir (Opsional)
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 px-3.5 py-2.5 min-h-[42px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl cursor-pointer border border-slate-200 dark:border-slate-700 transition active:scale-95">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Foto Serah Terima</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  {proofPhoto && (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Foto RTS siap disimpan
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 text-[10px]">
                  Catatan Pengembalian
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Diserahkan ke kurir J&T atas nama mas Dimas..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 min-h-[44px] text-xs border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto min-h-[46px] px-6 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition shadow-md shadow-orange-600/30 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>{loading ? 'Memproses Pengembalian...' : 'Konfirmasi Pengembalian (RTS)'}</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-12 text-center text-slate-400 dark:text-slate-500 text-xs">
              Pilih paket yang kadaluarsa atau anonim dari antrian di sebelah kiri untuk memproses pengembalian RTS.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
