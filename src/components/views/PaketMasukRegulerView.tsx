'use client';
import React, { useState, useEffect } from 'react';
import {
  PackagePlus,
  Camera,
  Search,
  CheckCircle2,
  Printer,
  Sparkles,
  Layers,
  Trash2,
  Plus,
  FileText,
  UserCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { packagesApi, studentsApi } from '../../lib/api';
import { Student, PackageItem, Operator } from '../../types';
import { useToast } from '../Toast';
import { CameraScannerModal } from '../CameraScannerModal';

interface PaketMasukRegulerViewProps {
  currentUser?: Operator | null;
  onOpenLabelPrint: (pkg: PackageItem) => void;
}

export const PaketMasukRegulerView: React.FC<PaketMasukRegulerViewProps> = ({
  currentUser,
  onOpenLabelPrint,
}) => {
  const [activeMode] = useState<'single'>('single');

  // Single form states
  const [courier, setCourier] = useState('J&T Express');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [recipientQuery, setRecipientQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [asrama, setAsrama] = useState<'Putra' | 'Putri'>('Putra');
  const [wilayah, setWilayah] = useState('');
  const [daerah, setDaerah] = useState('');
  const [notes, setNotes] = useState('');
  const [recipientType, setRecipientType] = useState<'santri' | 'anonim' | 'pengasuh'>('santri');
  const [manualName, setManualName] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [createdPackage, setCreatedPackage] = useState<PackageItem | null>(null);

  const { showToast } = useToast();

  useEffect(() => {
    studentsApi.getAll().then(setStudents).catch(console.error);
  }, []);

  const handleSearchStudent = (text: string) => {
    setRecipientQuery(text);
    if (!text.trim()) {
      setFilteredStudents([]);
      return;
    }
    const query = text.toLowerCase();
    const matches = students.filter(
      (s) =>
        s.nama_lengkap.toLowerCase().includes(query) ||
        s.niup.toLowerCase().includes(query)
    );
    setFilteredStudents(matches.slice(0, 5));
  };

  const handleSelectStudent = (student: Student) => {
    setSelectedStudent(student);
    setRecipientQuery(student.nama_lengkap);
    setAsrama(student.jenis_kelamin.toLowerCase().includes('perempuan') ? 'Putri' : 'Putra');
    setWilayah(student.wilayah);
    setDaerah(student.daerah);
    setFilteredStudents([]);
  };

  const handleScanResi = (scannedResi: string) => {
    const upper = scannedResi.toUpperCase();
    let detectedCourier = courier;

    if (upper.startsWith('SPX') || upper.startsWith('ID')) {
      detectedCourier = 'Shopee Xpress';
    } else if (
      upper.startsWith('JT') ||
      upper.startsWith('JP') ||
      upper.startsWith('888')
    ) {
      detectedCourier = 'J&T Express';
    } else if (
      upper.startsWith('00') ||
      upper.startsWith('TKP') ||
      upper.startsWith('SIC')
    ) {
      detectedCourier = 'SiCepat Ekspres';
    } else if (
      upper.startsWith('SOC') ||
      upper.startsWith('JNE') ||
      upper.startsWith('CGK')
    ) {
      detectedCourier = 'JNE Reguler';
    } else if (upper.startsWith('POS') || upper.startsWith('10')) {
      detectedCourier = 'Pos Indonesia';
    } else if (upper.startsWith('NV') || upper.startsWith('NINJA')) {
      detectedCourier = 'Ninja Xpress';
    } else if (upper.startsWith('100') || upper.startsWith('ANT')) {
      detectedCourier = 'Anteraja';
    }

    setTrackingNumber(scannedResi);
    setCourier(detectedCourier);

    showToast(
      `Resi kurir terbaca: ${scannedResi} (${detectedCourier})`,
      'success'
    );
  };

  const handleSubmitSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingNumber.trim()) {
      showToast('Nomor resi kurir wajib diisi', 'error');
      return;
    }

    if (recipientType === 'santri' && !recipientQuery.trim()) {
      showToast('Nama santri penerima wajib diisi', 'error');
      return;
    }

    if ((recipientType === 'anonim' || recipientType === 'pengasuh') && !manualName.trim()) {
      showToast(`Nama penerima ${recipientType === 'anonim' ? 'anonim' : 'keluarga pengasuh'} wajib diisi`, 'error');
      return;
    }

    setLoading(true);
    try {
      let recipientId = 'MANUAL';
      let recipientName = recipientQuery.trim();
      let status = 'diterima_petugas';
      let packageWilayah = wilayah.trim() || 'Pos Paket Pusat';
      let packageDaerah = daerah.trim() || 'Pos Paket Pusat';

      if (recipientType === 'anonim') {
        recipientId = 'ANONIM';
        recipientName = manualName.trim();
        status = 'paket_anonim';
        packageWilayah = 'Pos Paket (Anonim)';
        packageDaerah = 'Pos Paket Pusat';
      } else if (recipientType === 'pengasuh') {
        recipientId = 'PENGASUH';
        recipientName = `[Keluarga Pengasuh] ${manualName.trim()}`;
        status = 'diterima_petugas';
        packageWilayah = 'Kediaman Pengasuh / Dzurriyah';
        packageDaerah = 'Dalem Kasepuhan';
      } else {
        recipientId = selectedStudent?.niup || 'MANUAL';
      }

      const payload: any = {
        trackingNumber: trackingNumber.trim(),
        courier,
        recipientId,
        recipientName,
        asrama: (recipientType === 'anonim' || recipientType === 'pengasuh') ? null : asrama,
        wilayah: packageWilayah,
        daerah: packageDaerah,
        type: 'regular',
        status,
        dateReceived: new Date().toISOString().slice(0, 10),
        kondisi: 'baik',
        notes: notes.trim() || undefined,
        operator: currentUser?.name || 'Petugas Pos',
      };

      const res = await packagesApi.create(payload);
      setCreatedPackage(res);
      showToast(`Paket reguler ${res.id} (${res.trackingNumber}) berhasil disimpan/diperbarui!`, 'success');

      // Reset
      setTrackingNumber('');
      setRecipientQuery('');
      setManualName('');
      setSelectedStudent(null);
      setWilayah('');
      setDaerah('');
      setNotes('');
      setRecipientType('santri');
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.message || 'Gagal menyimpan paket', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header View */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/40 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-800 mb-1.5">
            <PackagePlus className="w-3.5 h-3.5" />
            Tahap 1 & 2a Penerimaan Ekspedisi
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Penerimaan Paket Reguler Masuk
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Catat paket dari kurir ekspedisi (J&T, Shopee Xpress, JNE, SiCepat, Pos, dll) secara satuan.
          </p>
        </div>

        {/* Scan Barcode Button */}
        <button
          type="button"
          onClick={() => setIsScannerOpen(true)}
          className="w-full sm:w-auto min-h-[44px] flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition shadow-md shadow-blue-600/20 cursor-pointer self-stretch sm:self-auto active:scale-95"
        >
          <Camera className="w-4 h-4" />
          <span>Buka Scanner Kamera</span>
        </button>
      </div>

      {/* Success Banner Single */}
      {createdPackage && activeMode === 'single' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <div className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                Paket Berhasil Didaftarkan ({createdPackage.id})
              </div>
              <div className="text-[11px] text-emerald-800 dark:text-emerald-400 mt-0.5">
                Resi: <span className="font-mono font-bold">{createdPackage.trackingNumber}</span> • Penerima: {createdPackage.recipientName}
              </div>
            </div>
          </div>
          <button
            onClick={() => onOpenLabelPrint(createdPackage)}
            className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm shrink-0 cursor-pointer self-start sm:self-auto"
          >
            <Printer className="w-4 h-4" />
            Cetak Label Paket
          </button>
        </motion.div>
      )}

      {/* 1. SINGLE INPUT MODE */}
      {activeMode === 'single' && (
        <form
          onSubmit={handleSubmitSingle}
          className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-6 md:p-8 space-y-6 transition-colors"
        >
          {/* Ekspedisi & Barcode Scan Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 text-[10px]">
                Kurir Ekspedisi Pengantar
              </label>
              <select
                value={courier}
                onChange={(e) => setCourier(e.target.value)}
                className="w-full px-3.5 py-2.5 min-h-[44px] text-xs border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="J&T Express">J&T Express</option>
                <option value="Shopee Xpress">Shopee Xpress (SPX)</option>
                <option value="JNE Reguler">JNE Express</option>
                <option value="SiCepat Ekspres">SiCepat Ekspres</option>
                <option value="Pos Indonesia">Pos Indonesia</option>
                <option value="Ninja Xpress">Ninja Xpress</option>
                <option value="Wahana Express">Wahana Express</option>
                <option value="Lainnya">Kurir / Ekspedisi Lainnya</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                  Nomor Resi Paket (Tracking Number)
                </label>
                <button
                  type="button"
                  onClick={() => setIsScannerOpen(true)}
                  className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1 cursor-pointer py-1 px-1.5 rounded-lg active:scale-95"
                >
                  <Camera className="w-3 h-3" />
                  Scan Kamera
                </button>
              </div>
              <input
                type="text"
                required
                placeholder="Scan barcode atau ketik nomor resi..."
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 min-h-[44px] text-xs font-mono border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Category Checkboxes: Santri vs Anonim vs Keluarga Pengasuh */}
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
              Kategori Penerima Paket
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Option 1: Santri Terdaftar */}
              <label
                className={`p-3.5 rounded-2xl border flex items-start gap-3 cursor-pointer transition ${
                  recipientType === 'santri'
                    ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-500 text-blue-900 dark:text-blue-200 shadow-xs'
                    : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="recipientType"
                  checked={recipientType === 'santri'}
                  onChange={() => setRecipientType('santri')}
                  className="mt-0.5 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="text-xs font-bold">Santri Terdaftar</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Integrasi database santri NJ (NIUP, asrama, wilayah)
                  </div>
                </div>
              </label>

              {/* Option 2: Paket Anonim */}
              <label
                className={`p-3.5 rounded-2xl border flex items-start gap-3 cursor-pointer transition ${
                  recipientType === 'anonim'
                    ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-500 text-amber-900 dark:text-amber-200 shadow-xs'
                    : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="recipientType"
                  checked={recipientType === 'anonim'}
                  onChange={() => setRecipientType('anonim')}
                  className="mt-0.5 text-amber-600 focus:ring-amber-500"
                />
                <div>
                  <div className="text-xs font-bold">Paket Anonim</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Input nama saja (tanpa integrasi ke data santri)
                  </div>
                </div>
              </label>

              {/* Option 3: Keluarga Pengasuh / Dzurriyah */}
              <label
                className={`p-3.5 rounded-2xl border flex items-start gap-3 cursor-pointer transition ${
                  recipientType === 'pengasuh'
                    ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-500 text-indigo-900 dark:text-indigo-200 shadow-xs'
                    : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="recipientType"
                  checked={recipientType === 'pengasuh'}
                  onChange={() => setRecipientType('pengasuh')}
                  className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <div className="text-xs font-bold">Keluarga Pengasuh</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Paket Dzurriyah / Pengasuh (input nama saja)
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Conditional Recipient Form Fields */}
          {recipientType === 'santri' ? (
            <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="relative">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 text-[10px]">
                  Cari Santri Penerima (Autocomplete NIUP / Nama)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Ketik NIUP atau nama santri (contoh: Muhammad / 02397227)..."
                    value={recipientQuery}
                    onChange={(e) => handleSearchStudent(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 min-h-[44px] text-xs border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
                </div>

                {/* Suggestions Dropdown */}
                {filteredStudents.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-700">
                    {filteredStudents.map((s) => (
                      <div
                        key={s.niup}
                        onClick={() => handleSelectStudent(s)}
                        className="p-3 hover:bg-blue-50 dark:hover:bg-slate-700/60 cursor-pointer flex items-center justify-between text-xs transition"
                      >
                        <div>
                          <div className="font-bold text-slate-800 dark:text-white">{s.nama_lengkap}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            NIUP: {s.niup} • {s.wilayah} ({s.daerah})
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 px-2 py-0.5 bg-blue-50 dark:bg-blue-900/40 rounded-lg">
                          Pilih
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Asrama, Wilayah, Daerah Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 text-[10px]">
                    Kategori Asrama
                  </label>
                  <select
                    value={asrama}
                    onChange={(e) => setAsrama(e.target.value as any)}
                    className="w-full px-3 py-2.5 min-h-[44px] text-xs border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="Putra">Asrama Putra</option>
                    <option value="Putri">Asrama Putri</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 text-[10px]">
                    Wilayah Asrama
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Syekh Jumadil Qubro"
                    value={wilayah}
                    onChange={(e) => setWilayah(e.target.value)}
                    className="w-full px-3 py-2.5 min-h-[44px] text-xs border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 text-[10px]">
                    Daerah / Kamar
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: KH Hasyim Asyari / Blok A"
                    value={daerah}
                    onChange={(e) => setDaerah(e.target.value)}
                    className="w-full px-3 py-2.5 min-h-[44px] text-xs border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* Manual Name Input for Anonim or Keluarga Pengasuh */
            <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 text-[10px]">
                  {recipientType === 'pengasuh'
                    ? 'Nama Keluarga Pengasuh / Dzurriyah'
                    : 'Nama Penerima (Tercantum pada Paket Anonim)'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    recipientType === 'pengasuh'
                      ? 'Contoh: Ning Hj. Khodijah / Gus Haris...'
                      : 'Contoh: Nama tidak jelas / Pak Slamet...'
                  }
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  className="w-full px-3.5 py-2.5 min-h-[44px] text-xs border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                />
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                  * Kategori ini hanya memerlukan pengisian nama saja tanpa perlu integrasi ke master data santri pondok.
                </p>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 text-[10px]">
              Catatan Fisik Luar / Keterangan Tambahan
            </label>
            <input
              type="text"
              placeholder="Contoh: Kardus cokelat tersegel rapat, isi buku / pakaian..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 min-h-[44px] text-xs border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition shadow-md shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              {loading ? (
                <span>Menyimpan ke Sistem...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simpan Paket Reguler</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Camera Scanner Modal Component */}
      <CameraScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleScanResi}
        title="Scan Barcode / Resi Paket Reguler"
      />
    </div>
  );
};
