'use client';
import React from 'react';
import {
  LayoutDashboard,
  PackagePlus,
  UtensilsCrossed,
  CheckCircle2,
  ShieldAlert,
  RotateCcw,
  FileSpreadsheet,
  Users,
  UserCheck,
  RefreshCw,
  History,
  X,
} from 'lucide-react';
import { Role } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole?: Role;
  packageCounts?: {
    active?: number;
    jastip?: number;
    confiscated?: number;
    expired?: number;
  };
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: any;
  roles: Role[];
  badge?: number;
  badgeColor?: string;
  category?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  userRole = 'petugaspos',
  packageCounts = {},
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const menuItems: MenuItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard KPI',
      icon: LayoutDashboard,
      roles: ['admin', 'petugaspos', 'keamanan'],
      category: 'Utama',
    },
    {
      id: 'input_reguler',
      label: 'Paket Reguler Masuk',
      icon: PackagePlus,
      roles: ['admin', 'petugaspos'],
      category: 'Penerimaan',
    },
    {
      id: 'input_jastip',
      label: 'Layanan Jastip (24 Jam)',
      icon: UtensilsCrossed,
      roles: ['admin', 'petugaspos'],
      badge: packageCounts.jastip,
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
      category: 'Penerimaan',
    },
    {
      id: 'validation',
      label: 'Validasi & Penyerahan',
      icon: CheckCircle2,
      roles: ['admin', 'petugaspos', 'keamanan'],
      badge: packageCounts.active,
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
      category: 'Sirkulasi',
    },
    {
      id: 'confiscated',
      label: 'Log Penyitaan Keamanan',
      icon: ShieldAlert,
      roles: ['admin', 'keamanan'],
      badge: packageCounts.confiscated,
      badgeColor: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800',
      category: 'Sirkulasi',
    },
    {
      id: 'rts',
      label: 'Protokol RTS (Return)',
      icon: RotateCcw,
      roles: ['admin', 'petugaspos'],
      badge: packageCounts.expired,
      badgeColor: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800',
      category: 'Sirkulasi',
    },
    {
      id: 'manifest',
      label: 'Manifest Ekspedisi',
      icon: FileSpreadsheet,
      roles: ['admin', 'petugaspos', 'keamanan'],
      category: 'Database & Master',
    },
    {
      id: 'students',
      label: 'Basis Data Santri',
      icon: Users,
      roles: ['admin'],
      category: 'Database & Master',
    },
    {
      id: 'operators',
      label: 'Manajemen Petugas',
      icon: UserCheck,
      roles: ['admin'],
      category: 'Database & Master',
    },
    {
      id: 'sync',
      label: 'Sinkronisasi Data API',
      icon: RefreshCw,
      roles: ['admin'],
      category: 'Sistem',
    },
    {
      id: 'logs',
      label: 'Catatan Aktivitas',
      icon: History,
      roles: ['admin', 'petugaspos', 'keamanan'],
      category: 'Sistem',
    },
  ];

  const filteredItems = menuItems.filter((item) => item.roles.includes(userRole));
  const categories = Array.from(new Set(filteredItems.map((item) => item.category || 'Lainnya')));

  const handleSelectTab = (tabId: string) => {
    setActiveTab(tabId);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const sidebarContent = (
    <div className="flex flex-col justify-between h-full p-4 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] pt-[calc(env(safe-area-inset-top,0px)+1rem)] md:pt-4 overflow-y-auto">
      <div className="space-y-5">
        {/* Mobile Header with Close Button */}
        <div className="flex md:hidden items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
              NJ
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Menu Navigasi
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Pilih modul kerja</p>
            </div>
          </div>
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="min-w-[42px] min-h-[42px] rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer transition active:scale-95"
              aria-label="Tutup Menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {categories.map((cat) => (
          <div key={cat}>
            <div className="px-3.5 mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {cat}
            </div>
            <nav className="space-y-1">
              {filteredItems
                .filter((item) => (item.category || 'Lainnya') === cat)
                .map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelectTab(item.id)}
                      className={`w-full min-h-[44px] flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition duration-150 cursor-pointer active:scale-[0.99] ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                          : 'text-slate-600 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-3 truncate">
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {typeof item.badge === 'number' && item.badge > 0 && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                            isActive
                              ? 'bg-white/20 text-white border-white/30'
                              : item.badgeColor || 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
            </nav>
          </div>
        ))}
      </div>

      {/* Pesantren Info Card */}
      <div className="mt-6 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 transition-colors">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs shrink-0">
            NJ
          </div>
          <div className="truncate">
            <h4 className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">PP. Nurul Jadid</h4>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Paiton, Probolinggo</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden md:block w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 h-full shrink-0 transition-colors">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop & Overlay */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={onCloseMobile}
          />
          <div className="relative z-50 w-80 max-w-[85vw] bg-white dark:bg-slate-900 h-full shadow-2xl transition-transform animate-in slide-in-from-left duration-250">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
