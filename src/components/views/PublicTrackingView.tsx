'use client';
import React, { useState } from 'react';
import {
  Search,
  Package,
  Clock,
  Building,
  User,
  LogIn,
  ShieldAlert,
  Sparkles,
  UtensilsCrossed,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  FileText,
  HelpCircle,
  PhoneCall,
  Sun,
  Moon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { packagesApi } from '../../lib/api';
import { PackageItem, PackageStatus } from '../../types';
import { useTheme } from '../ThemeContext';

interface PublicTrackingViewProps {
  onGoToLogin: () => void;
}

export const PublicTrackingView: React.FC<PublicTrackingViewProps> = ({ onGoToLogin }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<PackageItem[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<PackageItem | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchTerm.trim()) return;

    setLoading(true);
    setHasSearched(true);
    try {
      const results = await packagesApi.getAll({ search: searchTerm.trim() });
      setSearchResults(results);
      if (results.length > 0) {
        setSelectedPackage(results[0]);
      } else {
        setSelectedPackage(null);
      }
    } catch (err) {
      console.error(err);
      setSearchResults([]);
      setSelectedPackage(null);
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status: PackageStatus) => {
    switch (status) {
      case 'diterima_petugas':
        return {
          label: 'Tiba di Pos Paket Pusat',
          color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 border-blue-200 dark:border-blue-800',
          step: 1,
        };
      case 'diterima_pengurus':
        return {
          label: 'Sudah di Pengurus Asrama',
          color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200 border-indigo-200 dark:border-indigo-800',
          step: 2,
        };
      case 'telah_diantarkan':
      case 'telah_diterima':
        return {
          label: 'Telah Diterima Santri',
          color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800',
          step: 3,
        };
      case 'disita':
        return {
          label: 'Disita Biro Keamanan',
          color: 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200 border-rose-200 dark:border-rose-800',
          step: 2,
        };
      case 'kadaluarsa':
        return {
          label: 'Kadaluarsa / Melebihi Batas Waktu',
          color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/60 dark:text-orange-200 border-orange-200 dark:border-orange-800',
          step: 2,
        };
      case 'dikembalikan':
        return {
          label: 'Dikembalikan ke Kurir Asal (RTS)',
          color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700',
          step: 3,
        };
      case 'paket_anonim':
      default:
        return {
          label: 'Paket Anonim / Belum Teridentifikasi',
          color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 border-amber-200 dark:border-amber-800',
          step: 1,
        };
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans transition-colors">
      {/* Top Bar */}
      <header className="bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 py-3.5 px-4 sm:px-6 sticky top-0 z-30 transition-colors">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-700 to-blue-500 text-white flex items-center justify-center font-extrabold shadow-md shadow-blue-500/20">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">
                POSKETREN NJ
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Pondok Pesantren Nurul Jadid Paiton
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2.5 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition cursor-pointer active:scale-95"
              title="Ganti Tema"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            <button
              id="btn-login-petugas"
              onClick={onGoToLogin}
              className="flex items-center justify-center gap-2 px-3.5 py-2 min-h-[40px] bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-md shadow-blue-600/20 cursor-pointer active:scale-95"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Login Petugas</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Tracking Search Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-950 via-blue-900 to-blue-950 text-white py-10 sm:py-14 px-4 shadow-xl">
        {/* Subtle decorative background blur orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="relative max-w-3xl mx-auto text-center space-y-4"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-semibold backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Layanan Ekspedisi Paket & Jastip Santri Terpadu
          </div>

          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            Lacak Posisi Paket & Titipan Santri
          </h2>

          <p className="text-xs sm:text-sm text-blue-100 max-w-xl mx-auto leading-relaxed">
            Pantau barang kiriman dari kurir ekspedisi (J&T, SPX, JNE, Pos, SiCepat), pos paket pusat pesantren, pengurus asrama, hingga serah terima langsung ke tangan santri.
          </p>

          {/* Search Input Form */}
          <form onSubmit={handleSearch} className="pt-3 max-w-xl mx-auto">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-1.5 sm:p-2 border border-white/20 dark:border-slate-700/60 gap-1.5 sm:gap-0">
              <div className="flex items-center flex-1 min-w-0">
                <div className="pl-3 text-slate-400 dark:text-slate-500 shrink-0">
                  <Search className="w-5 h-5" />
                </div>
                <input
                  id="input-tracking-search"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Nomor Resi / ID Paket / NIUP / Santri..."
                  className="w-full px-3 py-2.5 min-h-[44px] text-xs sm:text-sm text-slate-900 dark:text-white bg-transparent focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium"
                />
              </div>
              <button
                id="btn-do-search"
                type="submit"
                disabled={loading || !searchTerm.trim()}
                className="w-full sm:w-auto px-5 py-2.5 min-h-[44px] bg-blue-600 hover:bg-blue-700 disabled:opacity-80 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/30 shrink-0 cursor-pointer active:scale-95"
              >
                {loading ? 'Mencari...' : 'Lacak Paket'}
              </button>
            </div>
          </form>
        </motion.div>
      </section>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Results Area if User Searched */}
        <AnimatePresence mode="wait">
          {hasSearched && (
            <motion.div
              key="search-results-section"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35 }}
              className="space-y-4"
            >
              {searchResults.length === 0 && !loading && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-12 text-center border border-slate-200 dark:border-slate-800 shadow-sm max-w-lg mx-auto">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mx-auto mb-3">
                    <Package className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                    Paket Tidak Ditemukan
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
                    Tidak ditemukan data barang untuk kata kunci <span className="font-semibold text-slate-700 dark:text-slate-300">"{searchTerm}"</span>. Pastikan nomor resi kurir, ID paket, atau NIUP santri sudah sesuai.
                  </p>
                </div>
              )}

              {searchResults.length > 0 && selectedPackage && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 sm:p-8 space-y-6">
                  {/* Results Selector if multiple */}
                  {searchResults.length > 1 && (
                    <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                        Ditemukan {searchResults.length} Paket yang Cocok:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {searchResults.map((pkg) => (
                          <button
                            key={pkg.id}
                            onClick={() => setSelectedPackage(pkg)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${selectedPackage.id === pkg.id
                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                              }`}
                          >
                            <span className="font-mono font-bold">{pkg.trackingNumber}</span> ({pkg.recipientName})
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Header info */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/40 px-2 py-0.5 rounded-lg border border-blue-200 dark:border-blue-800">
                          {selectedPackage.id}
                        </span>
                        <span
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${selectedPackage.type === 'jastip'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            }`}
                        >
                          {selectedPackage.type === 'jastip' ? 'Layanan Jastip 24h' : 'Paket Reguler'}
                        </span>
                      </div>
                      <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-2">
                        {selectedPackage.trackingNumber}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Kurir Pengantar: <span className="font-bold text-slate-800 dark:text-slate-200">{selectedPackage.courier}</span>
                      </p>
                    </div>

                    <div className="text-left sm:text-right">
                      <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${getStatusInfo(selectedPackage.status).color}`}>
                        {getStatusInfo(selectedPackage.status).label}
                      </div>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">
                        Tiba di Pos: {selectedPackage.dateReceived} {selectedPackage.arrivalTime ? `(${selectedPackage.arrivalTime})` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Visual Stepper Timeline */}
                  <div className="py-2">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-4">
                      Tahapan Sirkulasi Paket:
                    </h4>
                    <div className="relative flex flex-col md:flex-row justify-between items-start gap-6 md:gap-0">
                      {/* Connecting Line Desktop */}
                      <div className="hidden md:block absolute top-4 left-10 right-10 h-0.5 bg-slate-200 dark:bg-slate-700 z-0" />
                      {/* Connecting Line Mobile */}
                      <div className="md:hidden absolute top-4 bottom-6 left-4 w-0.5 bg-slate-200 dark:bg-slate-700 -translate-x-1/2 z-0" />

                      {/* Step 1 */}
                      <div className="relative z-10 flex md:flex-col items-center gap-3.5 md:text-center w-full md:w-1/3">
                        <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm shadow-blue-500/30 ring-4 ring-white dark:ring-slate-900">
                          1
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Pos Paket Pusat</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">Dicatat Petugas Pos</p>
                          <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">✓ Selesai</span>
                        </div>
                      </div>

                      {/* Step 2 */}
                      <div className="relative z-10 flex md:flex-col items-center gap-3.5 md:text-center w-full md:w-1/3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ring-4 ring-white dark:ring-slate-900 ${selectedPackage.status === 'diterima_petugas'
                              ? 'bg-amber-500 text-white animate-pulse'
                              : selectedPackage.status === 'disita'
                                ? 'bg-rose-600 text-white'
                                : 'bg-blue-600 text-white'
                            }`}
                        >
                          2
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {selectedPackage.status === 'disita'
                              ? 'Gudang Keamanan'
                              : selectedPackage.recipientName.includes('Keluarga Pengasuh')
                              ? 'Kediaman Pengasuh'
                              : selectedPackage.recipientId === 'ANONIM'
                              ? 'Pos Paket Pusat'
                              : 'Pengurus Asrama'}
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">
                            {selectedPackage.asrama && !selectedPackage.recipientName.includes('Keluarga Pengasuh') && selectedPackage.recipientId !== 'ANONIM' ? `${selectedPackage.asrama} — ` : ''}
                            {selectedPackage.wilayah}
                          </p>
                          {selectedPackage.status === 'diterima_petugas' && (
                            <span className="text-[9px] text-amber-600 dark:text-amber-400 font-semibold">Menunggu Penyaluran</span>
                          )}
                          {selectedPackage.status === 'diterima_pengurus' && (
                            <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold">✓ Tiba di Asrama</span>
                          )}
                          {selectedPackage.status === 'disita' && (
                            <span className="text-[9px] text-rose-600 dark:text-rose-400 font-semibold">🚨 Barang Disita</span>
                          )}
                        </div>
                      </div>

                      {/* Step 3 */}
                      <div className="relative z-10 flex md:flex-col items-center gap-3.5 md:text-center w-full md:w-1/3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ring-4 ring-white dark:ring-slate-900 ${selectedPackage.status === 'telah_diantarkan' || selectedPackage.status === 'telah_diterima'
                              ? 'bg-emerald-600 text-white'
                              : selectedPackage.status === 'dikembalikan'
                                ? 'bg-slate-700 text-white'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                            }`}
                        >
                          3
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {selectedPackage.status === 'dikembalikan' ? 'RTS (Dikembalikan)' : 'Serah Terima Santri'}
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">
                            {selectedPackage.receiverName ? selectedPackage.receiverName : 'Menunggu Pengambilan'}
                          </p>
                          {(selectedPackage.status === 'telah_diantarkan' || selectedPackage.status === 'telah_diterima') && (
                            <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold">✓ Telah Diterima</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recipient Details & Placement (NO RACK LOCATION AS REQUESTED) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl space-y-2 border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200 text-xs mb-1">
                        <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        Identitas Santri Penerima
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Nama Penerima:</span>
                        <span className="font-bold text-slate-900 dark:text-white">{selectedPackage.recipientName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">NIUP:</span>
                        <span className="font-mono font-medium text-slate-800 dark:text-slate-200">{selectedPackage.recipientId}</span>
                      </div>
                      {selectedPackage.asrama && !selectedPackage.recipientName.includes('Keluarga Pengasuh') && selectedPackage.recipientId !== 'ANONIM' && (
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">Kategori Asrama:</span>
                          <span className="font-medium text-slate-800 dark:text-slate-200">{selectedPackage.asrama}</span>
                        </div>
                      )}
                    </div>

                    <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl space-y-2 border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200 text-xs mb-1">
                        <Building className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        Lokasi Penempatan
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Wilayah:</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">{selectedPackage.wilayah}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Daerah / Kamar:</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">{selectedPackage.daerah}</span>
                      </div>
                      {selectedPackage.notes && (
                        <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-700/60">
                          <span className="text-slate-500 dark:text-slate-400">Catatan Paket:</span>
                          <span className="text-slate-700 dark:text-slate-300 font-medium italic">{selectedPackage.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Confiscation Alert if any */}
                  {selectedPackage.status === 'disita' && (
                    <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-rose-800 dark:text-rose-300">
                        <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                        Informasi Penyitaan Biro Keamanan: {selectedPackage.confiscatedReason}
                      </div>
                      <p>{selectedPackage.confiscatedNotes}</p>
                      <p className="text-[10px] text-rose-700 dark:text-rose-400 pt-1">
                        Penyita: {selectedPackage.confiscatedBy} • Tanggal: {selectedPackage.confiscatedDate}
                      </p>
                    </div>
                  )}

                  {/* Delivery Info if delivered */}
                  {selectedPackage.receiverName && (
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-2xl text-emerald-900 dark:text-emerald-200 text-xs flex justify-between items-center">
                      <div>
                        <span className="font-bold">Diterima oleh:</span> {selectedPackage.receiverName}
                        <div className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                          Waktu Serah Terima: {selectedPackage.receiverTime || selectedPackage.updated_at}
                        </div>
                      </div>
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Comprehensive Service Information Cards */}
        <section className="space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-1.5">
            <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Informasi Layanan Ekspedisi & Ketentuan Barang
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pelajari panduan alur distribusi, batas waktu penyimpanan jastip, serta tata tertib penerimaan barang kiriman di Pondok Pesantren Nurul Jadid.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Card 1: Paket Reguler */}
            <motion.div
              whileHover={{ y: -3 }}
              transition={{ duration: 0.2 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
            >
              <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold">
                <Package className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                1. Layanan Paket Reguler
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Menerima paket dari kurir resmi (J&T, Shopee Xpress, JNE, SiCepat, Pos Indonesia, Ninja Xpress). Paket yang tiba di Pos Paket Pusat akan disortir dan disalurkan ke pengurus asrama masing-masing santri.
              </p>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Penyaluran asrama: Setiap Pukul 15.00 WIB
              </div>
            </motion.div>

            {/* Card 2: Layanan Jastip */}
            <motion.div
              whileHover={{ y: -3 }}
              transition={{ duration: 0.2 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
            >
              <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-900/50 text-amber-600 dark:text-amber-300 flex items-center justify-center font-bold">
                <UtensilsCrossed className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                2. Titipan Jastip & Makanan (24 Jam)
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Layanan khusus makanan cepat saji, minuman, atau buah titipan via GoFood, Maxim, atau keluarga. Wajib diambil dalam waktu maksimal 24 jam demi menjaga higienitas dan kesegaran makanan.
              </p>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Proteksi ketat: Melebihi 24 jam diproses kadaluarsa
              </div>
            </motion.div>

            {/* Card 3: Ketentuan Larangan */}
            <motion.div
              whileHover={{ y: -3 }}
              transition={{ duration: 0.2 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
            >
              <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-900/50 text-rose-600 dark:text-rose-300 flex items-center justify-center font-bold">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                3. Larangan Barang & Sitaan
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Barang terlarang seperti smartphone/gadget tanpa izin, pemutar musik/MP3, media tidak syar'i, atau senjata tajam akan disita oleh Biro Keamanan dan hanya dapat dilepas saat kunjungan wali santri.
              </p>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                Sesuai Buku Pedoman Tata Tertib Santri NJ
              </div>
            </motion.div>
          </div>

          {/* Operational Hours & Contact Banner */}
          <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-3xl p-6 sm:p-8 text-white shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <span className="px-3 py-1 bg-white/10 rounded-full text-[11px] font-semibold text-blue-200 border border-white/10">
                Jam Operasional Pos Paket Pusat
              </span>
              <h4 className="text-lg font-bold">Buka Setiap Hari: 08.00 - 17.00 WIB</h4>
              <p className="text-xs text-blue-200 max-w-xl">
                Pengambilan langsung paket di Pos Paket Pusat dilayani pada jam istirahat santri dengan menunjukkan identitas santri (kartu santri / NIUP).
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="p-3 bg-white/10 rounded-2xl border border-white/10 text-white text-center">
                <div className="text-[10px] text-blue-200 font-semibold">Bantuan Layanan</div>
                <div className="text-xs font-bold font-mono mt-0.5">(0335) 771-XXX</div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-4 px-6 text-center text-xs text-slate-500 dark:text-slate-400 transition-colors">
        Pondok Pesantren Nurul Jadid © 2026 — Sistem Ekspedisi Paket & Jastip POSKETREN NJ
      </footer>
    </div>
  );
};
