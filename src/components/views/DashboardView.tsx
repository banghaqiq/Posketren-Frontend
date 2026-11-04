'use client';
import React, { useState, useEffect } from 'react';
import {
  Package,
  Clock,
  TrendingUp,
  ArrowUpRight,
  ShieldAlert,
  RotateCcw,
  CheckCircle2,
  Printer,
  Sparkles,
  Layers,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { analyticsApi } from '../../lib/api';
import { DashboardStats, PackageItem } from '../../types';

interface DashboardViewProps {
  setActiveTab: (tab: string) => void;
  onOpenLabelPrint: (pkg: PackageItem) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  setActiveTab,
  onOpenLabelPrint,
}) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const data = await analyticsApi.getStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load dashboard stats', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'diterima_petugas':
        return (
          <span className="whitespace-nowrap inline-flex items-center px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            Di Pos Paket
          </span>
        );
      case 'diterima_pengurus':
        return (
          <span className="whitespace-nowrap inline-flex items-center px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            Di Pengurus Asrama
          </span>
        );
      case 'telah_diantarkan':
      case 'telah_diterima':
        return (
          <span className="whitespace-nowrap inline-flex items-center px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            Telah Diterima
          </span>
        );
      case 'disita':
        return (
          <span className="whitespace-nowrap inline-flex items-center px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            Disita Keamanan
          </span>
        );
      case 'kadaluarsa':
        return (
          <span className="whitespace-nowrap inline-flex items-center px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
            Kadaluarsa
          </span>
        );
      case 'dikembalikan':
        return (
          <span className="whitespace-nowrap inline-flex items-center px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            Dikembalikan (RTS)
          </span>
        );
      case 'paket_anonim':
      default:
        return (
          <span className="whitespace-nowrap inline-flex items-center px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            Paket Anonim
          </span>
        );
    }
  };

  if (loading || !stats) {
    return (
      <div className="p-12 text-center text-slate-400 dark:text-slate-500 text-sm animate-pulse space-y-3">
        <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center mx-auto">
          <Layers className="w-5 h-5 animate-spin" />
        </div>
        <p>Memuat data analitik & metrik operasional Posketren...</p>
      </div>
    );
  }

  const kpi = stats.kpi;

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome (Buttons removed per user request) */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 rounded-3xl p-6 sm:p-7 text-white shadow-lg relative overflow-hidden"
      >
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-[11px] font-semibold text-blue-200 mb-2.5 backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Pusat Monitoring Sirkulasi Ekspedisi Santri
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight leading-tight">
            Dashboard Operasional POSKETREN NJ
          </h2>
          <p className="text-xs sm:text-sm text-blue-100/90 mt-1.5 leading-relaxed">
            Data terpadu arus paket masuk, status distribusi asrama, penyitaan keamanan, dan pemantauan layanan jastip santri Nurul Jadid.
          </p>
        </div>
      </motion.div>

      {/* KPI Cards Row (Spacious & Responsive) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-4">
        {/* Total Incoming */}
        <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 lg:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-blue-400 transition flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
              Total Masuk
            </span>
            <div className="p-1 sm:p-1.5 rounded-xl bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 shrink-0">
              <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white leading-tight">
              {kpi.totalPackages}
            </div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 truncate">
              <span className="text-blue-600 dark:text-blue-400 font-bold">{kpi.regular} Reguler</span> • {kpi.jastip} Jastip
            </div>
          </div>
        </div>

        {/* Di Pos Paket */}
        <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 lg:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-blue-400 transition flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
              Di Pos Paket
            </span>
            <div className="p-1 sm:p-1.5 rounded-xl bg-sky-50 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400 shrink-0">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white leading-tight">
              {kpi.inPos}
            </div>
            <div className="text-[10px] text-sky-600 dark:text-sky-400 font-bold mt-1 truncate">
              Siap disalurkan
            </div>
          </div>
        </div>

        {/* Di Asrama */}
        <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 lg:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-blue-400 transition flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
              Di Asrama
            </span>
            <div className="p-1 sm:p-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 shrink-0">
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white leading-tight">
              {kpi.inAsrama}
            </div>
            <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold mt-1 truncate">
              Di pengurus
            </div>
          </div>
        </div>

        {/* Telah Diterima */}
        <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 lg:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-blue-400 transition flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
              Telah Diterima
            </span>
            <div className="p-1 sm:p-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 leading-tight">
              {kpi.delivered}
            </div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-1 truncate">
              Selesai ke santri
            </div>
          </div>
        </div>

        {/* Disita */}
        <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 lg:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-blue-400 transition flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
              Disita
            </span>
            <div className="p-1 sm:p-1.5 rounded-xl bg-rose-50 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 shrink-0">
              <ShieldAlert className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-rose-600 dark:text-rose-400 leading-tight">
              {kpi.confiscated}
            </div>
            <div className="text-[10px] text-rose-600 dark:text-rose-400 font-bold mt-1 truncate">
              Biro Keamanan
            </div>
          </div>
        </div>

        {/* Return / RTS */}
        <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 lg:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-blue-400 transition flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
              Return / RTS
            </span>
            <div className="p-1 sm:p-1.5 rounded-xl bg-orange-50 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 shrink-0">
              <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-orange-600 dark:text-orange-400 leading-tight">
              {kpi.returnedRts + kpi.expired}
            </div>
            <div className="text-[10px] text-orange-600 dark:text-orange-400 font-bold mt-1 truncate">
              Dikembalikan kurir
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Recent Packages Table & Activity Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Packages Table (2 cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Package className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <h3 className="font-bold text-slate-800 dark:text-white text-xs sm:text-sm truncate">
                Paket Terbaru Masuk Sistem
              </h3>
            </div>
            <button
              onClick={() => setActiveTab('manifest')}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1 cursor-pointer shrink-0 min-h-[36px]"
            >
              <span>Manifest</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mobile Card List (sm:hidden) */}
          <div className="block sm:hidden divide-y divide-slate-100 dark:divide-slate-800">
            {stats.recentPackages.length === 0 ? (
              <div className="p-6 text-center text-slate-400 dark:text-slate-500 text-xs">
                Belum ada data paket yang tercatat
              </div>
            ) : (
              stats.recentPackages.map((pkg) => (
                <div key={pkg.id} className="p-3.5 space-y-2 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-mono font-bold text-slate-900 dark:text-white text-xs truncate">
                        {pkg.trackingNumber}
                      </div>
                      <div className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
                        {pkg.id} • {pkg.courier}
                      </div>
                    </div>
                    <span
                      className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        pkg.type === 'jastip'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {pkg.type === 'jastip' ? 'Jastip 24h' : 'Reguler'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div className="min-w-0 pr-2">
                      <div className="font-bold text-slate-800 dark:text-slate-200 truncate">
                        {pkg.recipientName}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        {pkg.asrama &&
                        !pkg.recipientName.includes('Keluarga Pengasuh') &&
                        pkg.recipientId !== 'ANONIM'
                          ? `${pkg.asrama} • `
                          : ''}
                        {pkg.wilayah}
                        {pkg.daerah ? ` • ${pkg.daerah}` : ''}
                      </div>
                    </div>
                    <div className="shrink-0">{getStatusBadge(pkg.status)}</div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => onOpenLabelPrint(pkg)}
                      className="min-h-[38px] px-3 py-1.5 text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-xl border border-blue-200 dark:border-blue-800 transition cursor-pointer flex items-center gap-1.5 active:scale-95"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Cetak Label</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop/Tablet Table (hidden sm:block) */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase font-semibold text-[10px]">
                <tr>
                  <th className="px-4 py-3 whitespace-nowrap">ID & Resi</th>
                  <th className="px-4 py-3 whitespace-nowrap">Penerima & Asrama</th>
                  <th className="px-4 py-3 whitespace-nowrap">Tipe</th>
                  <th className="px-4 py-3 whitespace-nowrap min-w-[140px]">Status</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {stats.recentPackages.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400 dark:text-slate-500">
                      Belum ada data paket yang tercatat
                    </td>
                  </tr>
                ) : (
                  stats.recentPackages.map((pkg) => (
                    <tr
                      key={pkg.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition"
                    >
                      <td className="px-4 py-3">
                        <div className="font-mono font-bold text-slate-900 dark:text-white truncate max-w-[150px]">
                          {pkg.trackingNumber}
                        </div>
                        <div className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
                          {pkg.id} • {pkg.courier}
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
                        <span
                          className={`whitespace-nowrap px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            pkg.type === 'jastip'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {pkg.type === 'jastip' ? 'Jastip 24h' : 'Reguler'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(pkg.status)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => onOpenLabelPrint(pkg)}
                          className="min-h-[34px] px-2.5 py-1 text-[11px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-xl border border-blue-200 dark:border-blue-800 transition cursor-pointer active:scale-95"
                        >
                          Cetak Label
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Operational Activity Stream (1 col) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <h3 className="font-bold text-slate-800 dark:text-white text-xs sm:text-sm">
                Aktivitas Operasional
              </h3>
            </div>
            <button
              onClick={() => setActiveTab('logs')}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 cursor-pointer min-h-[36px] flex items-center"
            >
              Semua Log
            </button>
          </div>

          <div className="space-y-2.5 sm:space-y-3">
            {stats.recentLogs.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-6">
                Belum ada catatan aktivitas terbaru
              </p>
            ) : (
              stats.recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs space-y-1 hover:border-slate-300 dark:hover:border-slate-700 transition"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-[11px] truncate">
                      {log.title}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono shrink-0">
                      {new Date(log.created_at || log.timestamp).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed line-clamp-2">
                    {log.description}
                  </p>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 pt-0.5">
                    Oleh: <span className="font-semibold text-slate-700 dark:text-slate-300">{log.operator}</span>
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
