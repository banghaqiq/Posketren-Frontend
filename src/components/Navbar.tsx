'use client';
import React, { useState, useEffect } from 'react';
import {
  Package,
  LogOut,
  Clock,
  Sun,
  Moon,
  Menu,
} from 'lucide-react';
import { Operator } from '../types';
import { useTheme } from './ThemeContext';

interface NavbarProps {
  currentUser: Operator | null;
  onLogout: () => void;
  activeTab: string;
  onToggleMobileSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onLogout,
  onToggleMobileSidebar,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
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

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'admin':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 rounded-full border border-blue-200 dark:border-blue-800">
            Administrator
          </span>
        );
      case 'keamanan':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200 rounded-full border border-rose-200 dark:border-rose-800">
            Biro Keamanan
          </span>
        );
      case 'petugaspos':
      default:
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 rounded-full border border-emerald-200 dark:border-emerald-800">
            Petugas Pos
          </span>
        );
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 px-3 sm:px-6 py-2 sm:py-2.5 pt-[calc(env(safe-area-inset-top,0px)+0.5rem)] transition-colors">
      <div className="flex items-center justify-between gap-2 sm:gap-3 max-w-7xl mx-auto w-full">
        {/* Left: Mobile hamburger & Brand */}
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          {onToggleMobileSidebar && (
            <button
              type="button"
              onClick={onToggleMobileSidebar}
              className="md:hidden min-w-[42px] min-h-[42px] p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition flex items-center justify-center cursor-pointer active:scale-95 shrink-0"
              aria-label="Buka Menu Navigasi"
              title="Menu Navigasi"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-blue-700 to-blue-500 text-white shadow-md shadow-blue-500/20 shrink-0">
              <Package className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1 sm:gap-1.5">
                <h1 className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-base tracking-tight leading-none truncate">
                  POSKETREN NJ
                </h1>
                <span className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] font-bold bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded">
                  v1.0
                </span>
              </div>
              <p className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 hidden xs:block truncate mt-0.5">
                PP. Nurul Jadid Paiton
              </p>
            </div>
          </div>
        </div>

        {/* Center Live Clock */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs font-medium text-slate-600 dark:text-slate-300">
          <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span className="font-mono text-xs">{timeStr}</span>
        </div>

        {/* Right Actions & User Profile */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            className="min-w-[38px] min-h-[38px] sm:min-w-[42px] sm:min-h-[42px] p-2 rounded-xl text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition flex items-center justify-center cursor-pointer active:scale-95 shrink-0"
            title={`Ganti ke mode ${theme === 'light' ? 'Gelap (Dark)' : 'Terang (Light)'}`}
            aria-label="Ganti Tema Tampilan"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>

          {/* User Profile & Logout */}
          {currentUser ? (
            <div className="flex items-center gap-1 sm:gap-2 pl-1 sm:pl-2 border-l border-slate-200 dark:border-slate-700">
              <div className="hidden md:flex flex-col text-right">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight truncate max-w-[140px]">
                  {currentUser.name}
                </span>
                <div className="mt-0.5">{getRoleBadge(currentUser.role)}</div>
              </div>

              {/* Avatar Photo or Initials */}
              {currentUser.photo ? (
                <img
                  src={currentUser.photo}
                  alt={currentUser.name}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shadow-xs shrink-0"
                />
              ) : (
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-50 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs uppercase shadow-xs shrink-0">
                  {currentUser.name ? currentUser.name.slice(0, 2) : 'US'}
                </div>
              )}

              <button
                type="button"
                onClick={onLogout}
                title="Keluar dari sistem"
                aria-label="Logout"
                className="min-w-[38px] min-h-[38px] sm:min-w-[42px] sm:min-h-[42px] p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition flex items-center justify-center cursor-pointer active:scale-95 shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="text-xs font-medium text-slate-500">Mode Publik</div>
          )}
        </div>
      </div>
    </header>
  );
};
