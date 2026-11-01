'use client';
import React, { useState, useEffect } from 'react';
import {
  UtensilsCrossed,
  Clock,
  AlertTriangle,
  Printer,
  CheckCircle2,
  Search,
  Sparkles,
  Timer,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { packagesApi, studentsApi } from '../../lib/api';
import { Student, PackageItem, Operator } from '../../types';
import { useToast } from '../Toast';
import { printA6ThermalLabel } from '../LabelPrintModal';

interface PaketMasukJastipViewProps {
  currentUser?: Operator | null;
  onOpenLabelPrint: (pkg: PackageItem) => void;
}

export const PaketMasukJastipView: React.FC<PaketMasukJastipViewProps> = ({
  currentUser,
  onOpenLabelPrint,
}) => {
  const [courier, setCourier] = useState('GoFood / ShopeeFood');
  const [category, setCategory] = useState('Makanan Cepat Saji (Hangat)');
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const [recipientQuery, setRecipientQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [asrama, setAsrama] = useState<'Putra' | 'Putri'>('Putra');
  const [wilayah, setWilayah] = useState('');
  const [daerah, setDaerah] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeJastipList, setActiveJastipList] = useState<PackageItem[]>([]);
  const [createdJastip, setCreatedJastip] = useState<PackageItem | null>(null);

  const { showToast } = useToast();

  const fetchActiveJastip = async () => {
    try {
      const data = await packagesApi.getAll({ type: 'jastip' });
      // Only packages that are not yet delivered
      const pending = data.filter(
        (p) => p.status === 'diterima_petugas' || p.status === 'diterima_pengurus'
      );
      setActiveJastipList(pending);
    } catch (err) {
      console.error(err);
    }
  };

  // Live running clock that cannot be altered manually
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(
        now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }) + ' WIB'
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    studentsApi.getAll().then(setStudents).catch(console.error);
    fetchActiveJastip();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientQuery.trim()) {
      showToast('Nama santri penerima wajib diisi', 'error');
      return;
    }

    setLoading(true);
    try {
      const autoTracking = `JSTP-${Date.now().toString().slice(-6)}`;
      const payload: any = {
        trackingNumber: autoTracking,
        courier,
        category,
        arrivalTime: currentTimeStr, // Automatically locked to current live time
        recipientId: selectedStudent?.niup || 'MANUAL',
        recipientName: recipientQuery.trim(),
        asrama,
        wilayah: wilayah.trim() || 'Pos Paket Pusat',
        daerah: daerah.trim() || 'Pos Paket Pusat',
        type: 'jastip',
        status: 'diterima_petugas',
        dateReceived: new Date().toISOString().slice(0, 10),
        kondisi: 'baik',
        notes: notes.trim() || 'Titipan jastip makanan santri (Proteksi 24 Jam)',
        operator: currentUser?.name || 'Petugas Pos',
      };

      const res = await packagesApi.create(payload);
      setCreatedJastip(res);
      showToast(`Titipan jastip ${res.id} (${res.trackingNumber}) berhasil disimpan! Membuka cetak printer thermal Blueprint TD110D...`, 'success');

      // Refresh list
      fetchActiveJastip();

      // Reset
      setRecipientQuery('');
      setSelectedStudent(null);
      setWilayah('');
      setDaerah('');
      setNotes('');

      // Langsung menuju print thermal Blueprint TD110D (100x150 mm / A6)
      printA6ThermalLabel(res, 'td110d');
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.message || 'Gagal menyimpan paket jastip', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Calculate elapsed hours for 24h protection
  const getJastipAgeBadge = (createdAt: string) => {
    const createdTime = new Date(createdAt).getTime();
    const now = Date.now();
    const diffHours = Math.max(0, Math.floor((now - createdTime) / (1000 * 60 * 60)));

    if (diffHours >= 24) {
      return (
        <span className="whitespace-nowrap px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
          KADALUARSA ({diffHours} Jam)
        </span>
      );
    } else if (diffHours >= 18) {
      return (
        <span className="whitespace-nowrap px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
          <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
          Mendesak ({24 - diffHours} Jam Sisa)
        </span>
      );
    } else {
      return (
        <span className="whitespace-nowrap px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
          <Timer className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
          Aman ({24 - diffHours} Jam Sisa)
        </span>
      );
    }
  };

  // Limit active monitor list to recent 5 items per user request
  const displayedActiveJastip = activeJastipList.slice(0, 5);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-2.5 py-0.5 rounded-full border border-amber-300 dark:border-amber-800 mb-1.5">
            <UtensilsCrossed className="w-3.5 h-3.5" />
            Tahap 2b Proteksi 24 Jam Makanan
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Layanan Jastip & Makanan Santri
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Pencatatan titipan makanan/minuman santri dengan jam tiba otomatis dan batas waktu distribusi 24 jam demi higienitas santri.
          </p>
        </div>
      </div>

      {/* Success Banner */}
      {createdJastip && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4"
        >
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <div className="text-xs font-bold text-amber-950 dark:text-amber-200">
                Jastip Terdaftar ({createdJastip.id})
              </div>
              <div className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                Penerima: <span className="font-bold">{createdJastip.recipientName}</span> • {createdJastip.category} ({createdJastip.arrivalTime})
              </div>
            </div>
          </div>
          <button
            onClick={() => onOpenLabelPrint(createdJastip)}
            className="w-full sm:w-auto min-h-[42px] px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm shrink-0 cursor-pointer active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Label Jastip</span>
          </button>
        </motion.div>
      )}

      {/* Main Grid: Form (Left) & Active Monitor (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Registration Form (3 cols) */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-6 md:p-7 space-y-4 transition-colors"
        >
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 dark:text-white text-sm">
              Registrasi Titipan Jastip Baru
            </h3>
            <span className="text-[10px] font-mono font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
              Auto Resi JSTP
            </span>
          </div>

          {/* Printer Connection Indicator */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
              <span className="font-bold text-slate-800 dark:text-slate-200">Printer Thermal: Blueprint BP-TD110D (USB001)</span>
            </div>
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
              Siap Cetak Otomatis
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 text-[10px]">
                Penyedia / Kurir Pengantar
              </label>
              <select
                value={courier}
                onChange={(e) => setCourier(e.target.value)}
                className="w-full px-3.5 py-2.5 min-h-[44px] text-xs border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="GoFood / ShopeeFood">GoFood / ShopeeFood / GrabFood</option>
                <option value="Maxim / Ojek Lokal">Maxim / Driver Ojek Lokal Paiton</option>
                <option value="Keluarga / Wali Santri">Titipan Langsung Keluarga / Wali</option>
                <option value="Toko Sekitar Pondok">Toko / Warung Sekitar Pondok</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 text-[10px]">
                Kategori Makanan / Barang
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 min-h-[44px] text-xs border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="Makanan Cepat Saji (Hangat)">Makanan Cepat Saji (Hangat)</option>
                <option value="Minuman Dingin / Es">Minuman Dingin / Es</option>
                <option value="Kue / Roti / Basah">Kue / Roti / Makanan Basah</option>
                <option value="Makanan Kering / Snack">Makanan Kering / Snack Kemasan</option>
                <option value="Buah Segar">Buah Segar</option>
                <option value="Obat / Vitamin / Herbal">Obat / Vitamin / Herbal Khusus</option>
                <option value="Barang Keperluan Santri">Barang Keperluan Non-Makanan</option>
              </select>
            </div>
          </div>

          {/* Jam Tiba di Pos (Otomatis & Terus Berjalan, Tanpa Bisa Dirubah) */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Jam Tiba di Pos (Otomatis & Terkunci)
              </label>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Waktu kedatangan dihitung realtime saat proses input ini
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-xl font-mono text-xs font-bold shadow-xs self-start sm:self-auto">
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 animate-pulse" />
              <span>{currentTimeStr || 'Memuat waktu...'}</span>
            </div>
          </div>

          {/* Student Autocomplete */}
          <div className="relative pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 text-[10px]">
              Santri Penerima (Ketik NIUP atau Nama)
            </label>
            <div className="relative">
              <input
                type="text"
                required
                placeholder="Cari santri penerima jastip..."
                value={recipientQuery}
                onChange={(e) => handleSearchStudent(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 min-h-[44px] text-xs border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
            </div>

            {/* Suggestions */}
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

          {/* Asrama, Wilayah, Daerah */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1 text-[10px]">
                Asrama
              </label>
              <select
                value={asrama}
                onChange={(e) => setAsrama(e.target.value as any)}
                className="w-full px-3.5 py-2.5 min-h-[44px] text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="Putra">Putra</option>
                <option value="Putri">Putri</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1 text-[10px]">
                Wilayah
              </label>
              <input
                type="text"
                placeholder="Wilayah asrama..."
                value={wilayah}
                onChange={(e) => setWilayah(e.target.value)}
                className="w-full px-3.5 py-2.5 min-h-[44px] text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1 text-[10px]">
                Daerah / Kamar
              </label>
              <input
                type="text"
                placeholder="Kamar santri..."
                value={daerah}
                onChange={(e) => setDaerah(e.target.value)}
                className="w-full px-3.5 py-2.5 min-h-[44px] text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1 text-[10px]">
              Catatan Khusus Makanan
            </label>
            <input
              type="text"
              placeholder="Contoh: Titipan es teh & martabak, simpan di tempat sejuk..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 min-h-[44px] text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl transition shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            >
              {loading ? (
                <span>Menyimpan Jastip...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simpan Titipan Jastip</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Active Jastip Monitor (Right 2 cols - Limited to top 5 recent items) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5 md:p-6 space-y-4 transition-colors">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white text-xs uppercase tracking-wider">
                Monitor Jastip Aktif
              </h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                Menampilkan 5 titipan terbaru ({activeJastipList.length} total aktif)
              </p>
            </div>
            <span className="p-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 text-xs font-bold">
              <Clock className="w-4 h-4" />
            </span>
          </div>

          <div className="space-y-3">
            {displayedActiveJastip.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-10">
                Tidak ada titipan jastip yang sedang aktif
              </p>
            ) : (
              displayedActiveJastip.map((j) => (
                <div
                  key={j.id}
                  className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs space-y-2 hover:border-amber-300 transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-bold text-slate-900 dark:text-white truncate">
                      {j.trackingNumber}
                    </span>
                    {getJastipAgeBadge(j.created_at)}
                  </div>

                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {j.recipientName}
                  </div>

                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                    <span>{j.category}</span>
                    <span className="font-mono text-[10px]">{j.arrivalTime}</span>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex justify-between items-center text-[10px]">
                    <span className="text-slate-400">
                      {j.asrama && !j.recipientName?.includes('Keluarga Pengasuh') && j.recipientId !== 'ANONIM' ? `${j.asrama} • ` : ''}
                      {j.wilayah}
                    </span>
                    <button
                      onClick={() => onOpenLabelPrint(j)}
                      className="px-2 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold hover:bg-amber-200 cursor-pointer"
                    >
                      Cetak Label
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
