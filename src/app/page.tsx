'use client';
import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { ToastProvider } from '../components/Toast';
import { ThemeProvider } from '../components/ThemeContext';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { LabelPrintModal } from '../components/LabelPrintModal';
import {
  LayoutDashboard,
  PackagePlus,
  UtensilsCrossed,
  CheckCircle2,
  Menu,
  ShieldAlert,
} from 'lucide-react';

const ViewLoading = () => (
  <div className="flex items-center justify-center p-12">
    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      <span>Memuat data...</span>
    </div>
  </div>
);

// Access Denied Fallback for Role Enforcement
const AccessDeniedView: React.FC<{ tabName: string }> = ({ tabName }) => (
  <div className="bg-white dark:bg-slate-900 rounded-3xl border border-rose-200 dark:border-rose-900 p-8 sm:p-12 text-center max-w-lg mx-auto mt-8 shadow-sm">
    <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center mb-4">
      <ShieldAlert className="w-8 h-8" />
    </div>
    <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white">
      Akses Ditolak (403 Forbidden)
    </h3>
    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
      Wewenang akun Anda tidak diizinkan mengakses modul <strong>{tabName}</strong>. Seluruh aktivitas akses diawasi dan dicatat dalam audit trail.
    </p>
  </div>
);

// RBAC Allowed Tabs Allowlist
const ROLE_ALLOWED_TABS: Record<string, string[]> = {
  admin: [
    'dashboard',
    'input_reguler',
    'input_jastip',
    'validation',
    'confiscated',
    'rts',
    'manifest',
    'students',
    'operators',
    'sync',
    'logs',
  ],
  petugaspos: [
    'dashboard',
    'input_reguler',
    'input_jastip',
    'validation',
    'manifest',
  ],
  keamanan: [
    'dashboard',
    'validation',
    'confiscated',
    'rts',
    'manifest',
  ],
};

const PublicTrackingView = dynamic(
  () => import('../components/views/PublicTrackingView').then((m) => m.PublicTrackingView),
  { ssr: false, loading: () => <ViewLoading /> }
);
const LoginView = dynamic(
  () => import('../components/views/LoginView').then((m) => m.LoginView),
  { ssr: false, loading: () => <ViewLoading /> }
);
const DashboardView = dynamic(
  () => import('../components/views/DashboardView').then((m) => m.DashboardView),
  { ssr: false, loading: () => <ViewLoading /> }
);
const PaketMasukRegulerView = dynamic(
  () => import('../components/views/PaketMasukRegulerView').then((m) => m.PaketMasukRegulerView),
  { ssr: false, loading: () => <ViewLoading /> }
);
const PaketMasukJastipView = dynamic(
  () => import('../components/views/PaketMasukJastipView').then((m) => m.PaketMasukJastipView),
  { ssr: false, loading: () => <ViewLoading /> }
);
const PackageValidationView = dynamic(
  () => import('../components/views/PackageValidationView').then((m) => m.PackageValidationView),
  { ssr: false, loading: () => <ViewLoading /> }
);
const ConfiscatedView = dynamic(
  () => import('../components/views/ConfiscatedView').then((m) => m.ConfiscatedView),
  { ssr: false, loading: () => <ViewLoading /> }
);
const RtsView = dynamic(
  () => import('../components/views/RtsView').then((m) => m.RtsView),
  { ssr: false, loading: () => <ViewLoading /> }
);
const ManifestView = dynamic(
  () => import('../components/views/ManifestView').then((m) => m.ManifestView),
  { ssr: false, loading: () => <ViewLoading /> }
);
const StudentsView = dynamic(
  () => import('../components/views/StudentsView').then((m) => m.StudentsView),
  { ssr: false, loading: () => <ViewLoading /> }
);
const OperatorsView = dynamic(
  () => import('../components/views/OperatorsView').then((m) => m.OperatorsView),
  { ssr: false, loading: () => <ViewLoading /> }
);
const ApiConfigView = dynamic(
  () => import('../components/views/ApiConfigView').then((m) => m.ApiConfigView),
  { ssr: false, loading: () => <ViewLoading /> }
);
const ActivityLogsView = dynamic(
  () => import('../components/views/ActivityLogsView').then((m) => m.ActivityLogsView),
  { ssr: false, loading: () => <ViewLoading /> }
);
import { authApi, analyticsApi } from '../lib/api';
import { Operator, PackageItem } from '../types';

function MainApp() {
  const [currentUser, setCurrentUser] = useState<Operator | null>(null);
  const [viewMode, setViewMode] = useState<'tracking' | 'login' | 'app'>('tracking');
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [printablePackage, setPrintablePackage] = useState<PackageItem | null>(null);
  const [packageCounts, setPackageCounts] = useState<{
    active?: number;
    jastip?: number;
    confiscated?: number;
    expired?: number;
  }>({});
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Multi-tab synchronization using BroadcastChannel and storage events
  useEffect(() => {
    let authChannel: BroadcastChannel | null = null;
    try {
      authChannel = new BroadcastChannel('posketren_auth_sync');
      authChannel.onmessage = (event) => {
        if (event.data?.action === 'logout') {
          setCurrentUser(null);
          setViewMode('login');
        } else if (event.data?.action === 'login' && event.data?.user) {
          setCurrentUser(event.data.user);
          setViewMode('app');
        }
      };
    } catch (e) {
      // Fallback for older environments without BroadcastChannel
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'posketren_auth_event' && e.newValue) {
        try {
          const payload = JSON.parse(e.newValue);
          if (payload.action === 'logout') {
            setCurrentUser(null);
            setViewMode('login');
          } else if (payload.action === 'login' && payload.user) {
            setCurrentUser(payload.user);
            setViewMode('app');
          }
        } catch (err) {}
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      if (authChannel) authChannel.close();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Read URL query params on mount with strict validation & allowlist
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const v = params.get('view');
      // Only allow 'login' or 'tracking' from URL directly.
      // 'app' requires active verified user session from checkAuth.
      if (v === 'login') setViewMode('login');
      else if (v === 'tracking') setViewMode('tracking');
      // If v === 'app' is requested, do not elevate without authenticated session
    }
  }, []);

  // Check auth on mount and enforce role-based tab access
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await authApi.me();
        if (res.user) {
          setCurrentUser(res.user);
          setViewMode('app');

          // Validate initial active tab from URL against user role permissions
          if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const requestedTab = params.get('tab');
            const allowedTabs = ROLE_ALLOWED_TABS[res.user.role] || ['dashboard'];
            if (requestedTab && allowedTabs.includes(requestedTab)) {
              setActiveTab(requestedTab);
            } else {
              setActiveTab('dashboard');
            }
          }
        } else {
          // If unauthenticated, ensure user cannot remain in 'app' view
          setCurrentUser(null);
          if (viewMode === 'app') setViewMode('login');
        }
      } catch (err) {
        // Not logged in or session expired
        setCurrentUser(null);
        if (viewMode === 'app') setViewMode('login');
      } finally {
        setLoadingInitial(false);
      }
    };
    checkAuth();
  }, []);

  // Fetch counts for badges
  const refreshCounts = async () => {
    try {
      const stats = await analyticsApi.getStats();
      setPackageCounts({
        active: stats.kpi.activePackages,
        jastip: stats.kpi.jastip,
        confiscated: stats.kpi.confiscated,
        expired: stats.kpi.expired,
      });
    } catch (e) {}
  };

  useEffect(() => {
    if (currentUser) {
      refreshCounts();
    }
  }, [currentUser, activeTab]);

  const handleLoginSuccess = (user: Operator) => {
    setCurrentUser(user);
    setViewMode('app');
    setActiveTab('dashboard');

    // Broadcast login to other tabs
    try {
      const channel = new BroadcastChannel('posketren_auth_sync');
      channel.postMessage({ action: 'login', user });
      channel.close();
    } catch (e) {}
    localStorage.setItem(
      'posketren_auth_event',
      JSON.stringify({ action: 'login', user, timestamp: Date.now() })
    );

    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '?view=app');
    }
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (e) {}

    setCurrentUser(null);
    setViewMode('login');

    // Broadcast logout to all other open tabs in this browser
    try {
      const channel = new BroadcastChannel('posketren_auth_sync');
      channel.postMessage({ action: 'logout' });
      channel.close();
    } catch (e) {}
    localStorage.setItem(
      'posketren_auth_event',
      JSON.stringify({ action: 'logout', timestamp: Date.now() })
    );

    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '?view=login');
    }
  };

  const goToLogin = () => {
    setViewMode('login');
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '?view=login');
    }
  };

  const goToTracking = () => {
    setViewMode('tracking');
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '?view=tracking');
    }
  };

  if (loadingInitial) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 transition-colors">
        <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg animate-pulse mb-3 shadow-lg shadow-blue-500/20">
          NJ
        </div>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Memuat Sistem POSKETREN NJ...
        </p>
      </div>
    );
  }

  // 1. Public Tracking View
  if (viewMode === 'tracking') {
    return <PublicTrackingView onGoToLogin={goToLogin} />;
  }

  // 2. Login View
  if (viewMode === 'login' || !currentUser) {
    return (
      <LoginView
        onLoginSuccess={handleLoginSuccess}
        onGoToPublicTracking={goToTracking}
      />
    );
  }

  // 3. Authenticated Dashboard & Admin Panel
  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans overflow-hidden transition-colors">
      <Navbar
        currentUser={currentUser}
        onLogout={handleLogout}
        activeTab={activeTab}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
      />

      {/* Main decoupled layout: sidebar scrolls independently from page content */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          userRole={currentUser.role}
          packageCounts={packageCounts}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        <main className="flex-1 p-3 sm:p-5 md:p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-y-auto pb-[calc(env(safe-area-inset-bottom,0px)+5rem)] md:pb-8">
          {activeTab === 'dashboard' && (
            <DashboardView
              setActiveTab={setActiveTab}
              onOpenLabelPrint={(pkg) => setPrintablePackage(pkg)}
            />
          )}

          {activeTab === 'input_reguler' &&
            (['admin', 'petugaspos'].includes(currentUser.role) ? (
              <PaketMasukRegulerView
                currentUser={currentUser}
                onOpenLabelPrint={(pkg) => setPrintablePackage(pkg)}
              />
            ) : (
              <AccessDeniedView tabName="Input Paket Reguler" />
            ))}

          {activeTab === 'input_jastip' &&
            (['admin', 'petugaspos'].includes(currentUser.role) ? (
              <PaketMasukJastipView
                currentUser={currentUser}
                onOpenLabelPrint={(pkg) => setPrintablePackage(pkg)}
              />
            ) : (
              <AccessDeniedView tabName="Input Paket Jastip" />
            ))}

          {activeTab === 'validation' &&
            (['admin', 'petugaspos', 'keamanan'].includes(currentUser.role) ? (
              <PackageValidationView currentUser={currentUser} />
            ) : (
              <AccessDeniedView tabName="Validasi & Penyerahan Paket" />
            ))}

          {activeTab === 'confiscated' &&
            (['admin', 'keamanan'].includes(currentUser.role) ? (
              <ConfiscatedView currentUser={currentUser} />
            ) : (
              <AccessDeniedView tabName="Penyitaan Keamanan" />
            ))}

          {activeTab === 'rts' &&
            (['admin', 'keamanan'].includes(currentUser.role) ? (
              <RtsView currentUser={currentUser} />
            ) : (
              <AccessDeniedView tabName="Retur Paket (RTS)" />
            ))}

          {activeTab === 'manifest' && (
            <ManifestView
              currentUser={currentUser}
              onOpenLabelPrint={(pkg) => setPrintablePackage(pkg)}
            />
          )}

          {activeTab === 'students' &&
            (currentUser.role === 'admin' ? (
              <StudentsView />
            ) : (
              <AccessDeniedView tabName="Database Santri" />
            ))}

          {activeTab === 'operators' &&
            (currentUser.role === 'admin' ? (
              <OperatorsView
                currentUser={currentUser}
                onUserUpdated={(u) => setCurrentUser(u)}
              />
            ) : (
              <AccessDeniedView tabName="Manajemen Petugas" />
            ))}

          {activeTab === 'sync' &&
            (currentUser.role === 'admin' ? (
              <ApiConfigView />
            ) : (
              <AccessDeniedView tabName="Integrasi & Sinkronisasi" />
            ))}

          {activeTab === 'logs' &&
            (currentUser.role === 'admin' ? (
              <ActivityLogsView currentUser={currentUser} />
            ) : (
              <AccessDeniedView tabName="Audit Log Sistem" />
            ))}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (md:hidden) */}
      <nav
        aria-label="Navigasi Bawah Mobile"
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-1.5 pt-1.5 pb-[calc(env(safe-area-inset-bottom,0px)+0.35rem)] flex items-center justify-around shadow-xl transition-colors"
      >
        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className={`flex-1 min-h-[48px] py-1 flex flex-col items-center justify-center gap-1 rounded-xl transition cursor-pointer active:scale-95 ${
            activeTab === 'dashboard'
              ? 'text-blue-600 dark:text-blue-400 font-extrabold bg-blue-50/80 dark:bg-blue-950/50'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="w-5 h-5 shrink-0" />
          <span className="text-[10px] leading-tight font-medium">Dashboard</span>
        </button>

        {['admin', 'petugaspos'].includes(currentUser.role) && (
          <button
            type="button"
            onClick={() => setActiveTab('input_reguler')}
            className={`flex-1 min-h-[48px] py-1 flex flex-col items-center justify-center gap-1 rounded-xl transition cursor-pointer active:scale-95 ${
              activeTab === 'input_reguler'
                ? 'text-blue-600 dark:text-blue-400 font-extrabold bg-blue-50/80 dark:bg-blue-950/50'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <PackagePlus className="w-5 h-5 shrink-0" />
            <span className="text-[10px] leading-tight font-medium">Reguler</span>
          </button>
        )}

        {['admin', 'petugaspos'].includes(currentUser.role) && (
          <button
            type="button"
            onClick={() => setActiveTab('input_jastip')}
            className={`flex-1 min-h-[48px] py-1 flex flex-col items-center justify-center gap-1 rounded-xl transition relative cursor-pointer active:scale-95 ${
              activeTab === 'input_jastip'
                ? 'text-blue-600 dark:text-blue-400 font-extrabold bg-blue-50/80 dark:bg-blue-950/50'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <UtensilsCrossed className="w-5 h-5 shrink-0" />
              {typeof packageCounts.jastip === 'number' && packageCounts.jastip > 0 && (
                <span className="absolute -top-1 -right-2 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full ring-2 ring-white dark:ring-slate-900">
                  {packageCounts.jastip}
                </span>
              )}
            </div>
            <span className="text-[10px] leading-tight font-medium">Jastip</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab('validation')}
          className={`flex-1 min-h-[48px] py-1 flex flex-col items-center justify-center gap-1 rounded-xl transition relative cursor-pointer active:scale-95 ${
            activeTab === 'validation'
              ? 'text-blue-600 dark:text-blue-400 font-extrabold bg-blue-50/80 dark:bg-blue-950/50'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            {typeof packageCounts.active === 'number' && packageCounts.active > 0 && (
              <span className="absolute -top-1 -right-2 bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full ring-2 ring-white dark:ring-slate-900">
                {packageCounts.active}
              </span>
            )}
          </div>
          <span className="text-[10px] leading-tight font-medium">Validasi</span>
        </button>

        <button
          type="button"
          onClick={() => setIsMobileSidebarOpen(true)}
          className="flex-1 min-h-[48px] py-1 flex flex-col items-center justify-center gap-1 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition cursor-pointer active:scale-95"
          aria-label="Buka Semua Menu"
        >
          <Menu className="w-5 h-5 shrink-0" />
          <span className="text-[10px] leading-tight font-medium">Menu</span>
        </button>
      </nav>

      {/* Global Thermal Label Print Modal */}
      <LabelPrintModal
        isOpen={!!printablePackage}
        onClose={() => setPrintablePackage(null)}
        pkg={printablePackage}
      />
    </div>
  );
}

export default function Page() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <MainApp />
      </ToastProvider>
    </ThemeProvider>
  );
}
