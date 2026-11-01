'use client';
import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Search,
  Eye,
  Trash2,
  Printer,
  Filter,
  CheckCircle2,
  FileText,
  Calendar,
  X,
  Package,
  Layers,
  Camera,
  Crown,
} from 'lucide-react';
import { packagesApi } from '../../lib/api';
import { PackageItem, Operator } from '../../types';
import { useToast } from '../Toast';

interface ManifestViewProps {
  currentUser?: Operator | null;
  onOpenLabelPrint?: (pkg: PackageItem) => void;
}

// Helper to identify packages intended for pesantren caregiver family (Keluarga Pengasuh)
const isKeluargaPengasuh = (pkg: PackageItem | null): boolean => {
  if (!pkg) return false;
  const name = (pkg.recipientName || '').toLowerCase();
  const id = (pkg.recipientId || '').toUpperCase();
  const wilayah = (pkg.wilayah || '').toLowerCase();
  const daerah = (pkg.daerah || '').toLowerCase();
  return (
    id === 'PENGASUH' ||
    name.includes('pengasuh') ||
    name.includes('dzurriyah') ||
    name.includes('[keluarga pengasuh]') ||
    wilayah.includes('pengasuh') ||
    wilayah.includes('dzurriyah') ||
    daerah.includes('kasepuhan')
  );
};

export const ManifestView: React.FC<ManifestViewProps> = ({
  currentUser,
  onOpenLabelPrint,
}) => {
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [selectedDetailPackage, setSelectedDetailPackage] = useState<PackageItem | null>(null);
  const [previewFullImage, setPreviewFullImage] = useState<string | null>(null);

  // Export period state
  const [exportPeriod, setExportPeriod] = useState<'all' | 'daily' | 'weekly' | 'monthly' | 'yearly'>('all');
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  const { showToast } = useToast();

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const data = await packagesApi.getAll({
        search: searchQuery,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        type: typeFilter !== 'all' ? typeFilter : undefined,
      });
      setPackages(data);
    } catch (err) {
      console.error(err);
      showToast('Gagal memuat manifest paket', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, [statusFilter, typeFilter]);

  const handleDelete = async (pkg: PackageItem) => {
    if (!confirm(`Hapus permanen paket resi '${pkg.trackingNumber}' (${pkg.recipientName}) dari database?`)) {
      return;
    }

    try {
      await packagesApi.delete(pkg.id, currentUser?.name || 'Admin');
      showToast(`Paket ${pkg.id} berhasil dihapus dari sistem`, 'success');
      fetchPackages();
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.message || 'Gagal menghapus paket', 'error');
    }
  };

  // Filter packages based on chosen export period
  const getFilteredPackagesForExport = () => {
    if (exportPeriod === 'all') return packages;

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    return packages.filter((p) => {
      const pkgDate = new Date(p.created_at || p.dateReceived);
      if (isNaN(pkgDate.getTime())) return true;

      if (exportPeriod === 'daily') {
        const pDateStr = pkgDate.toISOString().slice(0, 10);
        return pDateStr === todayStr;
      }

      if (exportPeriod === 'weekly') {
        const diffMs = now.getTime() - pkgDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        return diffDays <= 7;
      }

      if (exportPeriod === 'monthly') {
        return (
          pkgDate.getMonth() === now.getMonth() &&
          pkgDate.getFullYear() === now.getFullYear()
        );
      }

      if (exportPeriod === 'yearly') {
        return pkgDate.getFullYear() === now.getFullYear();
      }

      return true;
    });
  };

  // 1. Export Excel (SheetJS / xlsx)
  const handleExportExcel = async () => {
    const list = getFilteredPackagesForExport();
    if (list.length === 0) {
      showToast('Tidak ada data paket untuk diexport pada periode ini', 'warning');
      return;
    }

    try {
      const XLSX = await import('xlsx');
      const rows = list.map((p, idx) => ({
        No: idx + 1,
        'ID Paket': p.id,
        'No. Resi Kurir': p.trackingNumber,
        'Ekspedisi / Kurir': p.courier,
        'Nama Penerima': p.recipientName,
        'NIUP Santri': p.recipientId,
        Asrama: p.asrama,
        Wilayah: p.wilayah,
        Daerah: p.daerah,
        'Tipe Layanan': p.type === 'jastip' ? 'Jastip (24 Jam)' : 'Reguler',
        Status: p.status,
        'Tanggal Diterima': p.dateReceived,
        'Penerima Akhir': p.receiverName || '-',
        'Waktu Serah Terima': p.receiverTime || '-',
        'Alasan Sitaan': p.confiscatedReason || '-',
        'Resi Return RTS': p.returnTrackingNumber || '-',
        Catatan: p.notes || '-',
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Manifest Paket');

      const fileName = `Manifest_POSKETREN_${exportPeriod}_${Date.now()}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      showToast(`Manifest Excel (${list.length} data) berhasil diunduh!`, 'success');
      setIsExportMenuOpen(false);
    } catch (err) {
      console.error(err);
      showToast('Gagal mengekspor file Excel', 'error');
    }
  };

  // 2. Export PDF (jsPDF + autotable)
  const handleExportPDF = async () => {
    const list = getFilteredPackagesForExport();
    if (list.length === 0) {
      showToast('Tidak ada data paket untuk diexport pada periode ini', 'warning');
      return;
    }

    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF('landscape');

      // Title & Header Info
      doc.setFontSize(14);
      doc.text('REKAPITULASI MANIFEST EKSPEDISI PAKET & JASTIP', 14, 15);
      doc.setFontSize(10);
      doc.text('Pondok Pesantren Nurul Jadid Paiton - POSKETREN NJ', 14, 21);
      doc.text(
        `Periode: ${exportPeriod.toUpperCase()} • Total Data: ${list.length} Paket • Dicetak: ${new Date().toLocaleString('id-ID')}`,
        14,
        27
      );

      const tableHeaders = [
        [
          'No',
          'ID Paket',
          'No. Resi',
          'Kurir',
          'Nama Penerima',
          'Asrama / Wilayah',
          'Tipe',
          'Status',
          'Tanggal Masuk',
          'Penerima Santri',
        ],
      ];

      const tableData = list.map((p, idx) => [
        idx + 1,
        p.id,
        p.trackingNumber,
        p.courier,
        p.recipientName,
        p.asrama && !p.recipientName.includes('Keluarga Pengasuh') && p.recipientId !== 'ANONIM' ? `${p.asrama} - ${p.wilayah}` : p.wilayah,
        p.type === 'jastip' ? 'Jastip' : 'Reguler',
        p.status.replace(/_/g, ' '),
        p.dateReceived,
        p.receiverName || '-',
      ]);

      autoTable(doc, {
        head: tableHeaders,
        body: tableData,
        startY: 32,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [30, 58, 138], textColor: 255 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
      });

      const fileName = `Manifest_POSKETREN_${exportPeriod}_${Date.now()}.pdf`;
      doc.save(fileName);
      showToast(`Manifest PDF (${list.length} data) berhasil diunduh!`, 'success');
      setIsExportMenuOpen(false);
    } catch (err) {
      console.error(err);
      showToast('Gagal mengekspor file PDF', 'error');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'diterima_petugas':
        return (
          <span className="whitespace-nowrap inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            Di Pos Paket
          </span>
        );
      case 'diterima_pengurus':
        return (
          <span className="whitespace-nowrap inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            Di Pengurus Asrama
          </span>
        );
      case 'telah_diantarkan':
      case 'telah_diterima':
        return (
          <span className="whitespace-nowrap inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            Telah Diterima
          </span>
        );
      case 'disita':
        return (
          <span className="whitespace-nowrap inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            Disita
          </span>
        );
      case 'kadaluarsa':
        return (
          <span className="whitespace-nowrap inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-full bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
            Kadaluarsa
          </span>
        );
      case 'dikembalikan':
        return (
          <span className="whitespace-nowrap inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            Dikembalikan (RTS)
          </span>
        );
      case 'paket_anonim':
      default:
        return (
          <span className="whitespace-nowrap inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            Paket Anonim
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header View */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/40 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-800 mb-1.5">
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Master Database Ekspedisi Terpadu
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Manifest Ekspedisi Paket & Jastip
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Pusat rekaman seluruh data paket (selesai, dalam proses, disita, dan dikembalikan) dalam bentuk tabel terpadu.
          </p>
        </div>

        {/* Export Dropdown Button */}
        <div className="relative self-start sm:self-auto">
          <button
            onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow-md shadow-emerald-600/20 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Manifest (Excel & PDF)</span>
          </button>

          {/* Export Menu Dropdown */}
          {isExportMenuOpen && (
            <div className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl p-4 z-30 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-xs font-bold text-slate-800 dark:text-white">Pilih Periode Export:</span>
                <button
                  onClick={() => setIsExportMenuOpen(false)}
                  className="min-w-[32px] min-h-[32px] flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  ✕
                </button>
              </div>

              <div>
                <select
                  value={exportPeriod}
                  onChange={(e) => setExportPeriod(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="all">Semua Waktu (Seluruh Data)</option>
                  <option value="daily">Harian (Hari Ini)</option>
                  <option value="weekly">Mingguan (7 Hari Terakhir)</option>
                  <option value="monthly">Bulanan (Bulan Ini)</option>
                  <option value="yearly">Tahunan (Tahun Ini)</option>
                </select>
                <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                  Filter periode: {getFilteredPackagesForExport().length} data siap diexport
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="px-3 py-2 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  Excel (.xlsx)
                </button>

                <button
                  type="button"
                  onClick={handleExportPDF}
                  className="px-3 py-2 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  PDF Dokumen
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            placeholder="Cari berdasarkan resi kurir, ID paket, nama santri, NIUP, wilayah..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchPackages()}
            className="w-full pl-10 pr-3.5 py-2.5 text-xs border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="w-full sm:w-44 px-3.5 py-2.5 text-xs border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
        >
          <option value="all">Semua Tipe Layanan</option>
          <option value="regular">Paket Reguler</option>
          <option value="jastip">Layanan Jastip</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-56 px-3.5 py-2.5 text-xs border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
        >
          <option value="all">Semua Status Sirkulasi</option>
          <option value="diterima_petugas">Di Pos Paket</option>
          <option value="diterima_pengurus">Di Pengurus Asrama</option>
          <option value="telah_diantarkan">Telah Diterima</option>
          <option value="disita">Disita Keamanan</option>
          <option value="kadaluarsa">Kadaluarsa</option>
          <option value="dikembalikan">Dikembalikan (RTS)</option>
          <option value="paket_anonim">Paket Anonim</option>
        </select>
      </div>

      {/* Master Data Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 dark:text-white text-xs uppercase tracking-wider">
            Rekap Seluruh Paket ({packages.length} Data)
          </h3>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">
            Tersimpan di database MySQL
          </span>
        </div>

        {/* Mobile View: Clean Responsive Cards (sm:hidden) */}
        <div className="block sm:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {packages.length === 0 ? (
            <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs">
              Tidak ada data paket yang cocok dengan filter
            </div>
          ) : (
            packages.map((pkg) => (
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
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      {pkg.asrama && !pkg.recipientName.includes('Keluarga Pengasuh') && pkg.recipientId !== 'ANONIM' ? `${pkg.asrama} • ` : ''}{pkg.wilayah}
                    </div>
                  </div>
                  <div className="shrink-0">{getStatusBadge(pkg.status)}</div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
                    {pkg.dateReceived}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setSelectedDetailPackage(pkg)}
                      className="min-h-[34px] px-2.5 py-1 text-[11px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-xl border border-blue-200 dark:border-blue-800 transition flex items-center gap-1 cursor-pointer active:scale-95"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Info</span>
                    </button>
                    <button
                      onClick={() => onOpenLabelPrint && onOpenLabelPrint(pkg)}
                      className="min-h-[34px] px-2.5 py-1 text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 rounded-xl border border-amber-200 dark:border-amber-800 transition flex items-center gap-1 cursor-pointer active:scale-95"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print</span>
                    </button>
                    <button
                      onClick={() => handleDelete(pkg)}
                      className="min-h-[34px] min-w-[34px] p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-xl border border-slate-200 dark:border-slate-700 transition flex items-center justify-center cursor-pointer active:scale-95"
                      title="Hapus"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop/Tablet Table (hidden sm:block) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[800px]">
            <thead className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase font-semibold text-[10px]">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">ID & Resi</th>
                <th className="px-4 py-3 whitespace-nowrap">Ekspedisi</th>
                <th className="px-4 py-3 whitespace-nowrap">Penerima & Asrama</th>
                <th className="px-4 py-3 whitespace-nowrap">Tipe</th>
                <th className="px-4 py-3 whitespace-nowrap min-w-[130px]">Status</th>
                <th className="px-4 py-3 whitespace-nowrap">Tanggal Masuk</th>
                <th className="px-4 py-3 text-right whitespace-nowrap min-w-[220px]">Aksi Manajemen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {packages.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 dark:text-slate-500">
                    Tidak ada data paket yang cocok dengan filter
                  </td>
                </tr>
              ) : (
                packages.map((pkg) => (
                  <tr
                    key={pkg.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition"
                  >
                    <td className="px-4 py-3">
                      <div className="font-mono font-bold text-slate-900 dark:text-white truncate max-w-[150px]">
                        {pkg.trackingNumber}
                      </div>
                      <div className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
                        {pkg.id}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">
                      {pkg.courier}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {pkg.recipientName}
                        </span>
                        {isKeluargaPengasuh(pkg) && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-700 px-1.5 py-0.5 rounded-md">
                            <Crown className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                            Pengasuh
                          </span>
                        )}
                        {pkg.proof_image && (
                          <span
                            onClick={() => setPreviewFullImage(pkg.proof_image!)}
                            className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100/90 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 px-1.5 py-0.5 rounded-md cursor-pointer hover:bg-emerald-200 dark:hover:bg-emerald-900 transition"
                            title="Klik untuk melihat foto bukti fisik"
                          >
                            <Camera className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                            Foto Bukti
                          </span>
                        )}
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
                    <td className="px-4 py-3">{getStatusBadge(pkg.status)}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                      {pkg.dateReceived}
                    </td>
                    {/* Action Column: Lihat Info, Print Resi, Hapus */}
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => setSelectedDetailPackage(pkg)}
                          className="px-2.5 py-1 text-[11px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-xl border border-blue-200 dark:border-blue-800 transition flex items-center gap-1 cursor-pointer active:scale-95"
                          title="Lihat Detail Barang"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Info</span>
                        </button>

                        <button
                          onClick={() => onOpenLabelPrint && onOpenLabelPrint(pkg)}
                          className="px-2.5 py-1 text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 rounded-xl border border-amber-200 dark:border-amber-800 transition flex items-center gap-1 cursor-pointer active:scale-95"
                          title="Cetak Label Resi Termal"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Print</span>
                        </button>

                        <button
                          onClick={() => handleDelete(pkg)}
                          className="p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-xl border border-transparent hover:border-rose-200 dark:hover:border-rose-800 transition cursor-pointer active:scale-95"
                          title="Hapus Data Paket"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Package Modal */}
      {selectedDetailPackage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 dark:border-slate-800 max-h-[92vh] flex flex-col">
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                  Informasi Lengkap Barang & Ekspedisi
                </h3>
              </div>
              <button
                onClick={() => setSelectedDetailPackage(null)}
                className="min-w-[40px] min-h-[40px] p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center justify-center active:scale-95 cursor-pointer"
                aria-label="Tutup Detail"
              >
                ✕
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-bold">
                    ID Paket
                  </span>
                  <div className="font-mono font-bold text-blue-700 dark:text-blue-400 mt-0.5">
                    {selectedDetailPackage.id}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-bold">
                    No. Resi Kurir
                  </span>
                  <div className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                    {selectedDetailPackage.trackingNumber}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-bold">
                    Kurir Ekspedisi
                  </span>
                  <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                    {selectedDetailPackage.courier}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-bold">
                    Status Sirkulasi
                  </span>
                  <div className="mt-1">{getStatusBadge(selectedDetailPackage.status)}</div>
                </div>
              </div>

              {/* Recipient Details */}
              <div className="space-y-1.5 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="font-bold text-slate-800 dark:text-white mb-1">Tujuan Santri:</div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Nama Penerima:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedDetailPackage.recipientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">NIUP:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">{selectedDetailPackage.recipientId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">
                    {selectedDetailPackage.asrama && !selectedDetailPackage.recipientName.includes('Keluarga Pengasuh') && selectedDetailPackage.recipientId !== 'ANONIM' ? 'Asrama & Wilayah:' : 'Wilayah / Lokasi:'}
                  </span>
                  <span className="text-slate-700 dark:text-slate-300">
                    {selectedDetailPackage.asrama && !selectedDetailPackage.recipientName.includes('Keluarga Pengasuh') && selectedDetailPackage.recipientId !== 'ANONIM' ? `${selectedDetailPackage.asrama} — ` : ''}
                    {selectedDetailPackage.wilayah}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Daerah / Kamar:</span>
                  <span className="text-slate-700 dark:text-slate-300">{selectedDetailPackage.daerah}</span>
                </div>
              </div>

              {/* Proof Image */}
              {selectedDetailPackage.proof_image && (
                <div className="space-y-2 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5 text-xs">
                      <Camera className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      Foto Bukti Serah Terima
                    </span>
                    <button
                      type="button"
                      onClick={() => setPreviewFullImage(selectedDetailPackage.proof_image!)}
                      className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3 h-3" />
                      Perbesar
                    </button>
                  </div>
                  <div
                    onClick={() => setPreviewFullImage(selectedDetailPackage.proof_image!)}
                    className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-black/5 dark:bg-black/30 flex items-center justify-center p-1.5 cursor-pointer hover:opacity-95 transition"
                    title="Klik untuk melihat foto ukuran penuh"
                  >
                    <img
                      src={selectedDetailPackage.proof_image}
                      alt="Foto Bukti Serah Terima"
                      className="max-h-56 w-auto max-w-full object-contain rounded-lg"
                    />
                  </div>
                </div>
              )}

              {/* Handover / Return notes */}
              {selectedDetailPackage.receiverName && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-900 dark:text-emerald-200">
                  <span className="font-bold">Serah Terima:</span> Telah diterima oleh {selectedDetailPackage.receiverName} ({selectedDetailPackage.receiverTime})
                </div>
              )}

              {selectedDetailPackage.confiscatedReason && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-900 dark:text-rose-200">
                  <span className="font-bold">Sitaan Keamanan:</span> {selectedDetailPackage.confiscatedReason} ({selectedDetailPackage.confiscatedNotes})
                </div>
              )}

              {selectedDetailPackage.notes && (
                <div className="text-slate-600 dark:text-slate-400 italic">
                  Catatan: "{selectedDetailPackage.notes}"
                </div>
              )}
            </div>

            <div className="p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex flex-col-reverse sm:flex-row justify-end gap-2 shrink-0">
              <button
                onClick={() => setSelectedDetailPackage(null)}
                className="w-full sm:w-auto min-h-[44px] sm:min-h-[38px] px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl cursor-pointer active:scale-95 flex items-center justify-center"
              >
                Tutup
              </button>
              <button
                onClick={() => {
                  if (onOpenLabelPrint) onOpenLabelPrint(selectedDetailPackage);
                }}
                className="w-full sm:w-auto min-h-[44px] sm:min-h-[38px] px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                Cetak Label
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal for Full Proof Photo Preview */}
      {previewFullImage && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                  Foto Bukti Serah Terima Fisik
                </h4>
              </div>
              <button
                onClick={() => setPreviewFullImage(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex items-center justify-center bg-black/5 dark:bg-black/30">
              <img
                src={previewFullImage}
                alt="Foto Bukti"
                className="max-h-[65vh] w-auto max-w-full object-contain rounded-xl shadow-md"
              />
            </div>
            <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setPreviewFullImage(null)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
