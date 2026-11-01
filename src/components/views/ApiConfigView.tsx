'use client';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  RefreshCw,
  Save,
  CheckCircle2,
  AlertTriangle,
  Server,
  Key,
  Calendar,
  Sparkles,
  Info,
} from 'lucide-react';
import { configApi } from '../../lib/api';
import { ApiConfigData } from '../../types';
import { useToast } from '../Toast';

export const ApiConfigView: React.FC = () => {
  const [config, setConfig] = useState<ApiConfigData | null>(null);
  const [baseUrl, setBaseUrl] = useState('');
  const [token, setToken] = useState('');
  const [syncFrequency, setSyncFrequency] = useState<'hourly' | 'daily' | 'weekly' | 'manual'>('daily');
  const [mappingJsonStr, setMappingJsonStr] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const { showToast } = useToast();

  const fetchConfig = async () => {
    try {
      const data = await configApi.get();
      setConfig(data);
      // Allow empty/placeholder values as per user requirement
      setBaseUrl(data.baseUrl || '');
      setToken(data.token || '');
      setSyncFrequency(data.syncFrequency || 'daily');
      setMappingJsonStr(JSON.stringify(data.mapping_json || {}, null, 2));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let parsedMapping = {};
      if (mappingJsonStr.trim()) {
        try {
          parsedMapping = JSON.parse(mappingJsonStr);
        } catch (jsonErr) {
          showToast('Format JSON Mapping tidak valid', 'error');
          setLoading(false);
          return;
        }
      }

      await configApi.update({
        baseUrl: baseUrl.trim(),
        token: token.trim(),
        syncFrequency,
        mapping_json: parsedMapping,
      });

      showToast('Konfigurasi API Sinkronisasi berhasil disimpan!', 'success');
      fetchConfig();
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.message || 'Gagal menyimpan konfigurasi', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerSync = async () => {
    setSyncing(true);
    try {
      const res = await configApi.triggerCron();
      showToast(`Sinkronisasi selesai! ${res.recordsUpdated} data santri diperbarui.`, 'success');
      fetchConfig();
    } catch (err: any) {
      console.error(err);
      showToast('Gagal memicu sinkronisasi', 'error');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="max-w-4xl mx-auto space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-800 mb-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            Integrasi Eksternal Pesantren
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Konfigurasi Sinkronisasi API Santri
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Koneksi data santri otomatis dengan SIM (Sistem Informasi Manajemen) Pondok Pesantren Nurul Jadid.
          </p>
        </div>

        <button
          onClick={handleTriggerSync}
          disabled={syncing}
          className="flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition shadow-sm cursor-pointer active:scale-[0.98]"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          <span>{syncing ? 'Menyinkronkan...' : 'Sinkronisasi Sekarang'}</span>
        </button>
      </div>

      {/* Sync Status Card */}
      {config && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4 transition-colors">
          <div className="p-3 bg-slate-50/60 dark:bg-slate-800/40 rounded-xl sm:p-0 sm:bg-transparent">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Status Terakhir
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 capitalize">
                {config.lastSyncStatus || 'Siap'}
              </span>
            </div>
          </div>
          <div className="p-3 bg-slate-50/60 dark:bg-slate-800/40 rounded-xl sm:p-0 sm:bg-transparent">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Waktu Terakhir Sinkron
            </span>
            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1">
              {config.lastSyncTime
                ? new Date(config.lastSyncTime).toLocaleString('id-ID')
                : 'Belum pernah'}
            </div>
          </div>
          <div className="p-3 bg-slate-50/60 dark:bg-slate-800/40 rounded-xl sm:p-0 sm:bg-transparent">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Total Data Diperbarui
            </span>
            <div className="text-xs font-bold text-blue-700 dark:text-blue-400 mt-1">
              {config.updatedCount || 0} Santri Terupdate
            </div>
          </div>
        </div>
      )}

      {/* Configuration Form */}
      <form
        onSubmit={handleSave}
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-4 sm:p-6 space-y-4 sm:space-y-5 transition-colors"
      >
        <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-start justify-between">
          <div>
            <h3 className="font-bold text-slate-800 dark:text-white text-sm">
              Parameter Endpoint SIM NJ
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Base URL dan Bearer token tidak wajib diisi (cukup gunakan placeholder).
            </p>
          </div>
          <span className="px-2.5 py-1 text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg">
            Opsional
          </span>
        </div>

        {/* Info notice */}
        <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl flex items-start gap-2.5 text-xs text-blue-800 dark:text-blue-300">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
          <p className="leading-relaxed text-[11px]">
            Sesuai panduan integrasi, kolom Base URL dan API Bearer dapat dibiarkan kosong. Sistem akan menggunakan nilai konfigurasi default server atau mengizinkan sinkronisasi mandiri lewat template excel.
          </p>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
            Base URL Server Pusat (Opsional)
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="https://sim.nuruljadid.net/api/v1"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 min-h-[44px] text-xs border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-mono dark:bg-slate-800 dark:text-white"
            />
            <Server className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
            API Bearer Token (Opsional)
          </label>
          <div className="relative">
            <input
              type="password"
              placeholder="Bearer nj_sim_live_secret_token_here..."
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 min-h-[44px] text-xs border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-mono dark:bg-slate-800 dark:text-white"
            />
            <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
            Jadwal Frekuensi Sinkronisasi Otomatis
          </label>
          <select
            value={syncFrequency}
            onChange={(e) => setSyncFrequency(e.target.value as any)}
            className="w-full px-3 py-2.5 min-h-[44px] text-xs border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-white cursor-pointer"
          >
            <option value="hourly">Setiap 1 Jam Sekali (Hourly)</option>
            <option value="daily">Setiap Hari Pukul 00:00 (Daily - Direkomendasikan)</option>
            <option value="weekly">Setiap Minggu Sekali (Weekly)</option>
            <option value="manual">Manual Saja (Hanya saat tombol ditekan)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
            Mapping JSON Format Fields
          </label>
          <textarea
            rows={5}
            value={mappingJsonStr}
            onChange={(e) => setMappingJsonStr(e.target.value)}
            className="w-full p-3 text-xs font-mono border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none bg-slate-50 dark:bg-slate-800/60 dark:text-slate-200"
          />
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-6 py-2.5 min-h-[44px] bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition shadow-md shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Pengaturan Sinkronisasi</span>
          </button>
        </div>
      </form>
    </motion.div>
  );
};
