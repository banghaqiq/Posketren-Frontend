'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  History,
  ChevronLeft,
  ChevronRight,
  Filter,
  Clock,
  User,
  Trash2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  ShieldAlert,
  Shield,
  X,
} from 'lucide-react';
import { logsApi } from '../../lib/api';
import { ActivityLogItem, Operator } from '../../types';
import { useToast } from '../Toast';

interface ActivityLogsViewProps {
  currentUser?: Operator | null;
}

export const ActivityLogsView: React.FC<ActivityLogsViewProps> = ({
  currentUser,
}) => {
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [typeFilter, setTypeFilter] = useState('all');
  const [loading, setLoading] = useState(false);

  // Cleanup Modal State
  const [isCleanupOpen, setIsCleanupOpen] = useState(false);
  const [cleanupPeriod, setCleanupPeriod] = useState<'1' | '7' | '30' | 'all'>('7');
  const [cleanupLoading, setCleanupLoading] = useState(false);

  const { showToast } = useToast();

  const fetchLogs = async (currentPage = 1, currentType = 'all') => {
    setLoading(true);
    try {
      const res = await logsApi.getAll(
        currentPage,
        15,
        currentType !== 'all' ? currentType : undefined
      );
      setLogs(res.data);
      setTotalPages(res.meta.totalPages || 1);
      setPage(res.meta.page || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(page, typeFilter);
  }, [page, typeFilter]);

  const handleExecuteCleanup = async () => {
    setCleanupLoading(true);
    try {
      let res;
      if (cleanupPeriod === 'all') {
        res = await logsApi.cleanup(undefined, true);
      } else {
        res = await logsApi.cleanup(parseInt(cleanupPeriod, 10), false);
      }

      showToast(
        res?.message || 'Pembersihan log aktivitas berhasil dilakukan!',
        'success'
      );
      setIsCleanupOpen(false);
      setPage(1);
      fetchLogs(1, typeFilter);
    } catch (err: any) {
      console.error(err);
      showToast(
        err.response?.data?.message || 'Gagal membersihkan log aktivitas',
        'error'
      );
    } finally {
      setCleanupLoading(false);
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'package_in':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
            Paket Reguler
          </span>
        );
      case 'jastip_in':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
            Jastip
          </span>
        );
      case 'delivery':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
            Serah Terima
          </span>
        );
      case 'confiscation':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300">
            Penyitaan
          </span>
        );
      case 'rts':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300">
            Return RTS
          </span>
        );
      case 'login':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            Login
          </span>
        );
      case 'sync':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300">
            Sync SIM
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {type}
          </span>
        );
    }
  };

  // Extract operator name & role tag
  const renderOperatorInfo = (operatorString?: string) => {
    if (!operatorString) {
      return (
        <span className="text-slate-400 dark:text-slate-500 italic text-[11px]">
          Sistem Otomatis
        </span>
      );
    }

    const opLower = operatorString.toLowerCase();
    let roleBadge = (
      <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
        Petugas Pos
      </span>
    );

    if (opLower.includes('admin')) {
      roleBadge = (
        <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
          Admin
        </span>
      );
    } else if (opLower.includes('keamanan')) {
      roleBadge = (
        <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
          Keamanan
        </span>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-[10px] text-slate-700 dark:text-slate-300 shrink-0">
          <User className="w-3 h-3 text-slate-500 dark:text-slate-400" />
        </div>
        <div>
          <div className="font-semibold text-slate-900 dark:text-white text-xs leading-tight">
            {operatorString}
          </div>
          <div className="mt-0.5">{roleBadge}</div>
        </div>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-800 mb-1.5">
            <History className="w-3.5 h-3.5" />
            Audit Trail & Transparansi Operasional
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Catatan Aktivitas Sistem (Activity Logs)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Log lengkap setiap tindakan petugas pos paket, biro keamanan, serah terima santri, dan pembersihan terjadwal.
          </p>
        </div>

        {/* Right Action buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Filter by Type */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="w-full sm:w-auto px-3 py-2 min-h-[42px] text-xs font-medium border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
            >
              <option value="all">Semua Tipe Aktivitas</option>
              <option value="package_in">Penerimaan Reguler</option>
              <option value="jastip_in">Penerimaan Jastip</option>
              <option value="delivery">Serah Terima Santri</option>
              <option value="confiscation">Penyitaan Keamanan</option>
              <option value="rts">Pengembalian (RTS)</option>
              <option value="sync">Sinkronisasi Data</option>
              <option value="login">Otentikasi Login</option>
            </select>
          </div>

          {/* Cleanup Button (Admin only or all operators) */}
          <button
            onClick={() => setIsCleanupOpen(true)}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[42px] text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-xl border border-rose-200 dark:border-rose-800 transition cursor-pointer shadow-2xs active:scale-[0.98]"
            title="Pembersihan riwayat log mingguan / harian"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            <span>Pembersihan Log</span>
          </button>
        </div>
      </div>

      {/* Logs Presentation: Mobile Card Feed (sm:hidden) + Desktop Table (hidden sm:block) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
        {/* Mobile View */}
        <div className="block sm:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {logs.length === 0 ? (
            <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs">
              Belum ada riwayat aktivitas yang tercatat
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>
                      {new Date(log.created_at || log.timestamp).toLocaleString('id-ID', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </span>
                  </div>
                  <div>{getTypeBadge(log.type)}</div>
                </div>

                <div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-snug">
                    {log.title}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                    {log.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                  {renderOperatorInfo(log.operator)}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase font-semibold text-[10px]">
              <tr>
                <th className="px-4 py-3">Waktu & Tanggal</th>
                <th className="px-4 py-3">Tipe Event</th>
                <th className="px-4 py-3">Aktivitas</th>
                <th className="px-4 py-3">Rincian / Deskripsi</th>
                <th className="px-4 py-3">Petugas Penanggungjawab</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="p-8 text-center text-slate-400 dark:text-slate-500"
                  >
                    Belum ada riwayat aktivitas yang tercatat
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                  >
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 font-mono text-[11px] whitespace-nowrap">
                      {new Date(log.created_at || log.timestamp).toLocaleString('id-ID', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td className="px-4 py-3">{getTypeBadge(log.type)}</td>
                    <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200">
                      {log.title}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 max-w-md leading-relaxed">
                      {log.description}
                    </td>
                    <td className="px-4 py-3">
                      {renderOperatorInfo(log.operator)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="px-4 sm:px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400 text-[11px] sm:text-xs">
            Halaman <span className="font-bold text-slate-800 dark:text-slate-200">{page}</span>{' '}
            dari <span className="font-bold text-slate-800 dark:text-slate-200">{totalPages}</span>
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="p-2 sm:p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 transition cursor-pointer active:scale-95"
            >
              <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="p-2 sm:p-1.5 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 transition cursor-pointer active:scale-95"
            >
              <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            </button>
          </div>
        </div>
      </div>

      {/* CLEANUP MODAL */}
      <AnimatePresence>
        {isCleanupOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200 dark:border-slate-800"
            >
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                    <Trash2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-white text-sm">
                      Pembersihan Log Aktivitas
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Hapus riwayat log lama untuk efisiensi penyimpanan database
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCleanupOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold p-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed text-[11px]">
                    Log yang dihapus tidak dapat dipulihkan. Pastikan Anda sudah mengekspor rekapitulasi data manifest bila diperlukan sebelum membersihkan log.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Pilihan Retensi Pembersihan
                  </label>
                  <div className="space-y-2">
                    <label
                      onClick={() => setCleanupPeriod('1')}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                        cleanupPeriod === '1'
                          ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 dark:border-blue-500'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                          Pembersihan Harian (Simpan 1 Hari Terakhir)
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Hapus seluruh log yang berusia lebih dari 24 jam
                        </div>
                      </div>
                      <input
                        type="radio"
                        name="period"
                        checked={cleanupPeriod === '1'}
                        onChange={() => setCleanupPeriod('1')}
                        className="text-blue-600"
                      />
                    </label>

                    <label
                      onClick={() => setCleanupPeriod('7')}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                        cleanupPeriod === '7'
                          ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 dark:border-blue-500'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                          Pembersihan Mingguan (Simpan 7 Hari Terakhir)
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Rekomendasi sistem: Menghapus log lebih lama dari 7 hari
                        </div>
                      </div>
                      <input
                        type="radio"
                        name="period"
                        checked={cleanupPeriod === '7'}
                        onChange={() => setCleanupPeriod('7')}
                        className="text-blue-600"
                      />
                    </label>

                    <label
                      onClick={() => setCleanupPeriod('30')}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                        cleanupPeriod === '30'
                          ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 dark:border-blue-500'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                          Pembersihan Bulanan (Simpan 30 Hari Terakhir)
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Menghapus log yang lebih lama dari 30 hari
                        </div>
                      </div>
                      <input
                        type="radio"
                        name="period"
                        checked={cleanupPeriod === '30'}
                        onChange={() => setCleanupPeriod('30')}
                        className="text-blue-600"
                      />
                    </label>

                    <label
                      onClick={() => setCleanupPeriod('all')}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                        cleanupPeriod === 'all'
                          ? 'border-rose-600 bg-rose-50/60 dark:bg-rose-950/40 dark:border-rose-500'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold text-rose-700 dark:text-rose-400">
                          Bersihkan Seluruh Riwayat Log
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Mengosongkan seluruh tabel audit trail
                        </div>
                      </div>
                      <input
                        type="radio"
                        name="period"
                        checked={cleanupPeriod === 'all'}
                        onChange={() => setCleanupPeriod('all')}
                        className="text-rose-600"
                      />
                    </label>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCleanupOpen(false)}
                    className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteCleanup}
                    disabled={cleanupLoading}
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer"
                  >
                    {cleanupLoading ? 'Membersihkan...' : 'Lakukan Pembersihan'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
