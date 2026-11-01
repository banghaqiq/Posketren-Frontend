'use client';
import React, { useState } from 'react';
import {
  Package,
  Lock,
  User,
  ArrowRight,
  ShieldAlert,
  Search,
  Eye,
  EyeOff,
  Sun,
  Moon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { authApi } from '../../lib/api';
import { useToast } from '../Toast';
import { useTheme } from '../ThemeContext';
import { Operator } from '../../types';

interface LoginViewProps {
  onLoginSuccess: (user: Operator) => void;
  onGoToPublicTracking: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
  onGoToPublicTracking,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { showToast } = useToast();
  const { theme, toggleTheme } = useTheme();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;

    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await authApi.login(username.trim().toLowerCase(), password);
      showToast(`Selamat datang kembali, ${response.user.name}!`, 'success');
      onLoginSuccess(response.user);
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        'Gagal masuk sistem. Periksa kembali username dan kata sandi Anda.';
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden transition-colors">
      {/* Decorative ambient background lights */}
      <div className="absolute top-1/4 left-1/3 w-80 h-80 bg-blue-500/10 dark:bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-indigo-500/10 dark:bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Theme toggle in corner */}
      <div className="absolute top-4 right-4">
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
          title="Ganti Tema"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden relative z-10"
      >
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 p-6 sm:p-8 text-white text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-blue-600/10 backdrop-blur-xs" />
          <div className="relative z-10">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.4 }}
              className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 mb-3 shadow-lg"
            >
              <Package className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
            </motion.div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">POSKETREN NJ</h2>
            <p className="text-xs text-blue-100 mt-0.5">Pondok Pesantren Nurul Jadid Paiton</p>
            <div className="mt-3 inline-block px-3 py-1 rounded-full bg-blue-950/40 border border-blue-400/30 text-[11px] font-semibold text-blue-200">
              Sistem Manajemen Ekspedisi & Jastip Santri
            </div>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-5 sm:p-8 space-y-5">
          <AnimatePresence mode="wait">
            {errorMessage && (
              <motion.div
                key="login-error"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-2xl text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2.5"
              >
                <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 text-[10px]">
                Username Petugas
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="input-username"
                  type="text"
                  required
                  placeholder="Masukkan username..."
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="w-full pl-10 pr-3.5 py-2.5 min-h-[44px] text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 text-[10px]">
                Kata Sandi
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="input-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Masukkan kata sandi..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 min-h-[44px] text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer min-h-[44px] min-w-[40px] justify-center"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.98 }}
              id="btn-submit-login"
              type="submit"
              disabled={loading}
              className="w-full py-3 min-h-[44px] bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs sm:text-sm font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 cursor-pointer active:scale-98"
            >
              {loading ? (
                <span>Memproses Masuk...</span>
              ) : (
                <>
                  <span>Masuk ke Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </form>

          {/* Back to Public Tracking */}
          <div className="text-center pt-2">
            <button
              id="btn-back-to-tracking"
              onClick={onGoToPublicTracking}
              className="inline-flex items-center justify-center gap-1.5 py-2 px-3 min-h-[40px] text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition cursor-pointer active:scale-95"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Kembali ke Halaman Lacak Paket Santri</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
