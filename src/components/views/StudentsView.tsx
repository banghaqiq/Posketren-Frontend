'use client';
import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  FileSpreadsheet,
  Download,
  Upload,
  RefreshCw,
  X,
  FileText,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { studentsApi, configApi } from '../../lib/api';
import { Student } from '../../types';
import { useToast } from '../Toast';

export const StudentsView: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Method tab: 'manual' | 'excel' | 'api'
  const [addMethod, setAddMethod] = useState<'manual' | 'excel' | 'api'>('manual');

  // Manual form states
  const [niup, setNiup] = useState('');
  const [namaLengkap, setNamaLengkap] = useState('');
  const [jenisKelamin, setJenisKelamin] = useState('Laki-laki');
  const [wilayah, setWilayah] = useState('');
  const [daerah, setDaerah] = useState('');
  const [loading, setLoading] = useState(false);

  // Excel import states
  const [excelPreview, setExcelPreview] = useState<Partial<Student>[]>([]);
  const [excelFileName, setExcelFileName] = useState('');
  const [excelImportLoading, setExcelImportLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // API sync states
  const [apiSyncLoading, setApiSyncLoading] = useState(false);

  const { showToast } = useToast();

  const fetchStudents = async () => {
    try {
      const data = await studentsApi.getAll(searchQuery);
      setStudents(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleOpenCreate = () => {
    setEditingStudent(null);
    setAddMethod('manual');
    setNiup('');
    setNamaLengkap('');
    setJenisKelamin('Laki-laki');
    setWilayah('');
    setDaerah('');
    setExcelPreview([]);
    setExcelFileName('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (student: Student) => {
    setEditingStudent(student);
    setAddMethod('manual');
    setNiup(student.niup);
    setNamaLengkap(student.nama_lengkap);
    setJenisKelamin(student.jenis_kelamin);
    setWilayah(student.wilayah);
    setDaerah(student.daerah);
    setIsModalOpen(true);
  };

  const handleDelete = async (studentNiup: string) => {
    if (!confirm(`Hapus data santri dengan NIUP '${studentNiup}'?`)) return;
    try {
      await studentsApi.delete(studentNiup);
      showToast('Santri berhasil dihapus', 'success');
      fetchStudents();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Gagal menghapus santri', 'error');
    }
  };

  // 1. Manual Submit
  const handleSubmitManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingStudent) {
        await studentsApi.update(editingStudent.niup, {
          nama_lengkap: namaLengkap.trim(),
          jenis_kelamin: jenisKelamin,
          wilayah: wilayah.trim(),
          daerah: daerah.trim(),
        });
        showToast('Data santri berhasil diperbarui!', 'success');
      } else {
        await studentsApi.create({
          niup: niup.trim(),
          nama_lengkap: namaLengkap.trim(),
          jenis_kelamin: jenisKelamin,
          wilayah: wilayah.trim(),
          daerah: daerah.trim(),
        });
        showToast('Santri baru berhasil ditambahkan!', 'success');
      }

      setIsModalOpen(false);
      fetchStudents();
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.message || 'Gagal menyimpan data santri', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 2. Download Official Excel Template
  const handleDownloadTemplate = async () => {
    try {
      const XLSX = await import('xlsx');
      const templateData = [
        {
          niup: '02397228',
          nama_lengkap: 'Muhammad Fatih Robbani',
          jenis_kelamin: 'Laki-laki',
          wilayah: 'Syekh Jumadil Qubro',
          daerah: 'KH Hasyim Asyari / Blok B',
        },
        {
          niup: '11223355',
          nama_lengkap: 'Fatimah Az-Zahra',
          jenis_kelamin: 'Perempuan',
          wilayah: 'Wilayah Fatimatuz Zahro',
          daerah: 'Kamar 05 / Blok A',
        },
        {
          niup: '99887722',
          nama_lengkap: 'Ahmad Muzakki',
          jenis_kelamin: 'Laki-laki',
          wilayah: 'Wilayah Al-Azhar',
          daerah: 'Kamar 10 / Blok C',
        },
      ];

      const worksheet = XLSX.utils.json_to_sheet(templateData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Santri');

      XLSX.writeFile(workbook, 'Template_Import_Santri_POSKETREN.xlsx');
      showToast('Template Excel Santri berhasil diunduh!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Gagal mengunduh template Excel', 'error');
    }
  };

  // Handle Excel File Upload & Parse
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExcelFileName(file.name);
    try {
      const XLSX = await import('xlsx');
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const bstr = evt.target?.result;
          const workbook = XLSX.read(bstr, { type: 'binary' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet);

          // Normalize columns (supports niup, NIUP, nama_lengkap, Nama, etc)
          const normalized: Partial<Student>[] = rawJson.map((row) => ({
            niup: String(row.niup || row.NIUP || row['Nomor Induk'] || '').trim(),
            nama_lengkap: String(row.nama_lengkap || row.nama || row.Nama || row['Nama Lengkap'] || '').trim(),
            jenis_kelamin: String(row.jenis_kelamin || row.gender || row['Jenis Kelamin'] || 'Laki-laki').trim(),
            wilayah: String(row.wilayah || row.Wilayah || row.Asrama || 'Pusat').trim(),
            daerah: String(row.daerah || row.Daerah || row.Kamar || 'Pusat').trim(),
          })).filter((s) => s.niup && s.nama_lengkap);

          setExcelPreview(normalized);
          if (normalized.length === 0) {
            showToast('Tidak ditemukan baris data santri yang valid di file Excel', 'warning');
          } else {
            showToast(`Berhasil membaca ${normalized.length} data santri dari file Excel!`, 'success');
          }
        } catch (err) {
          console.error(err);
          showToast('Gagal membaca file Excel. Pastikan format file sesuai.', 'error');
        }
      };
      reader.readAsBinaryString(file);
    } catch (err) {
      console.error(err);
      showToast('Gagal memuat modul Excel', 'error');
    }
  };

  // Submit Bulk Excel to Database
  const handleSubmitExcel = async () => {
    if (excelPreview.length === 0) {
      showToast('Belum ada data dari Excel untuk diimport', 'warning');
      return;
    }

    setExcelImportLoading(true);
    try {
      const res = await studentsApi.bulkCreate(excelPreview);
      showToast(`Berhasil mengimpor & menyambungkan ${res.count} data santri ke database!`, 'success');
      setIsModalOpen(false);
      setExcelPreview([]);
      setExcelFileName('');
      fetchStudents();
    } catch (err: any) {
      console.error(err);
      showToast('Gagal menyimpan data santri dari Excel ke database', 'error');
    } finally {
      setExcelImportLoading(false);
    }
  };

  // 3. Sync from Pondok API
  const handleSyncFromApi = async () => {
    setApiSyncLoading(true);
    try {
      const res = await configApi.triggerCron();
      showToast(`Sinkronisasi API Pondok selesai! ${res.recordsUpdated} data santri berhasil disinkronkan.`, 'success');
      setIsModalOpen(false);
      fetchStudents();
    } catch (err) {
      console.error(err);
      showToast('Gagal menyinkronkan data santri dari API Pondok', 'error');
    } finally {
      setApiSyncLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/40 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-800 mb-1.5">
            <Users className="w-3.5 h-3.5" />
            Master Data Pesantren
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Basis Data Santri Nurul Jadid
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Database acuan penerima paket santri dengan Nomor Induk Unik Pesantren (NIUP), wilayah, dan asrama.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="w-full sm:w-auto min-h-[44px] flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition shadow-md shadow-blue-600/20 cursor-pointer active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Santri (3 Pilihan)</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            placeholder="Cari berdasarkan nama santri, NIUP, wilayah, atau daerah kamar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchStudents()}
            className="w-full pl-10 pr-3.5 py-2.5 text-xs border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
        </div>
        <button
          onClick={fetchStudents}
          className="w-full sm:w-auto min-h-[42px] px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 transition cursor-pointer flex items-center justify-center active:scale-95"
        >
          Cari Data
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 dark:text-white text-xs uppercase tracking-wider">
            Daftar Santri Terdaftar ({students.length} Orang)
          </h3>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">
            Terhubung ke validasi paket
          </span>
        </div>

        {/* Mobile View: Clean Santri Cards (sm:hidden) */}
        <div className="block sm:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {students.length === 0 ? (
            <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs">
              Tidak ada data santri
            </div>
          ) : (
            students.map((s) => (
              <div key={s.niup} className="p-3.5 space-y-2 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-mono font-bold text-blue-700 dark:text-blue-400 text-xs">
                      {s.niup}
                    </span>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs mt-0.5 truncate">
                      {s.nama_lengkap}
                    </h4>
                  </div>
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      s.jenis_kelamin.toLowerCase().includes('perempuan')
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                    }`}
                  >
                    {s.jenis_kelamin}
                  </span>
                </div>

                <div className="text-[11px] text-slate-600 dark:text-slate-400">
                  <span>{s.wilayah}</span> • <span className="font-medium text-slate-700 dark:text-slate-300">{s.daerah}</span>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-1.5">
                  <button
                    onClick={() => handleOpenEdit(s)}
                    className="min-h-[34px] px-3 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-xl border border-blue-200 dark:border-blue-800 transition flex items-center gap-1 cursor-pointer active:scale-95"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(s.niup)}
                    className="min-h-[34px] px-3 py-1 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-xl border border-rose-200 dark:border-rose-800 transition flex items-center gap-1 cursor-pointer active:scale-95"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table (hidden sm:block) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[650px]">
            <thead className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase font-semibold text-[10px]">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">NIUP</th>
                <th className="px-4 py-3 whitespace-nowrap">Nama Lengkap</th>
                <th className="px-4 py-3 whitespace-nowrap">Jenis Kelamin</th>
                <th className="px-4 py-3 whitespace-nowrap">Wilayah Asrama</th>
                <th className="px-4 py-3 whitespace-nowrap">Daerah / Kamar</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 dark:text-slate-500">
                    Tidak ada data santri
                  </td>
                </tr>
              ) : (
                students.map((s) => (
                  <tr key={s.niup} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                    <td className="px-4 py-3 font-mono font-bold text-blue-700 dark:text-blue-400">
                      {s.niup}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200">
                      {s.nama_lengkap}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`whitespace-nowrap px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          s.jenis_kelamin.toLowerCase().includes('perempuan')
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        }`}
                      >
                        {s.jenis_kelamin}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{s.wilayah}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{s.daerah}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(s)}
                          className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-xl transition cursor-pointer active:scale-95"
                          title="Edit Santri"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(s.niup)}
                          className="p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-xl transition cursor-pointer active:scale-95"
                          title="Hapus Santri"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Modal: Tambah / Edit Santri dengan 3 Pilihan */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 dark:border-slate-800 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                  {editingStudent ? 'Edit Data Santri' : 'Tambah Santri ke Database'}
                </h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Data master santri PP. Nurul Jadid Paiton
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="min-w-[40px] min-h-[40px] p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center justify-center active:scale-95 cursor-pointer"
                aria-label="Tutup Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 3 Methods Selector (Only when creating new) */}
            {!editingStudent && (
              <div className="px-4 sm:px-6 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setAddMethod('manual')}
                    className={`min-h-[40px] py-1.5 px-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1 truncate ${
                      addMethod === 'manual'
                        ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span>1. Manual</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddMethod('excel')}
                    className={`min-h-[40px] py-1.5 px-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1 truncate ${
                      addMethod === 'excel'
                        ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">2. Excel</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddMethod('api')}
                    className={`min-h-[40px] py-1.5 px-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1 truncate ${
                      addMethod === 'api'
                        ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">3. API SIM</span>
                  </button>
                </div>
              </div>
            )}

            {/* METHOD 1: MANUAL FORM */}
            {(addMethod === 'manual' || editingStudent) && (
              <form onSubmit={handleSubmitManual} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 text-[10px]">
                      NIUP Santri (Nomor Induk Unik)
                    </label>
                    <input
                      type="text"
                      required
                      disabled={!!editingStudent}
                      placeholder="Contoh: 02397227"
                      value={niup}
                      onChange={(e) => setNiup(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs font-mono border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 text-[10px]">
                      Jenis Kelamin
                    </label>
                    <select
                      value={jenisKelamin}
                      onChange={(e) => setJenisKelamin(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    >
                      <option value="Laki-laki">Laki-laki (Putra)</option>
                      <option value="Perempuan">Perempuan (Putri)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 text-[10px]">
                    Nama Lengkap Santri
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Muhammad Nurul Huda"
                    value={namaLengkap}
                    onChange={(e) => setNamaLengkap(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 text-[10px]">
                      Wilayah Asrama
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Syekh Jumadil Qubro"
                      value={wilayah}
                      onChange={(e) => setWilayah(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 text-[10px]">
                      Daerah / Blok / Kamar
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: KH Hasyim Asyari / Kamar 04"
                      value={daerah}
                      onChange={(e) => setDaerah(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col-reverse sm:flex-row justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="min-h-[44px] sm:min-h-[38px] px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl cursor-pointer active:scale-95 flex items-center justify-center"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="min-h-[44px] sm:min-h-[38px] px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition shadow-md shadow-blue-600/30 cursor-pointer active:scale-95 flex items-center justify-center"
                  >
                    {loading ? 'Menyimpan...' : editingStudent ? 'Perbarui Data' : 'Simpan Santri'}
                  </button>
                </div>
              </form>
            )}

            {/* METHOD 2: EXCEL IMPORT (SHEETJS / EXCELJS) */}
            {addMethod === 'excel' && !editingStudent && (
              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
                {/* Step 1: Download Template */}
                <div className="p-3.5 sm:p-4 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-blue-900 dark:text-blue-200">
                      Langkah 1: Unduh Format Template Resmi
                    </div>
                    <div className="text-[11px] text-blue-700 dark:text-blue-400 mt-0.5">
                      Gunakan template kolom yang sudah disesuaikan dengan database POSKETREN (niup, nama_lengkap, jenis_kelamin, wilayah, daerah).
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="min-h-[40px] px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh Template (.xlsx)</span>
                  </button>
                </div>

                {/* Step 2: Upload Excel File */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-800 dark:text-white">
                    Langkah 2: Pilih File Excel Santri Anda
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".xlsx, .xls"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="p-5 sm:p-6 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 rounded-2xl text-center cursor-pointer transition bg-slate-50 dark:bg-slate-800/40"
                  >
                    <FileSpreadsheet className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {excelFileName ? excelFileName : 'Klik untuk Memilih File Excel (.xlsx / .xls)'}
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                      Data akan otomatis diparse dan dihubungkan ke database POSKETREN
                    </p>
                  </div>
                </div>

                {/* Step 3: Preview Data */}
                {excelPreview.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 dark:text-white">
                        Pratinjau Data ({excelPreview.length} Santri):
                      </span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                        ✓ Siap Disambungkan ke Database
                      </span>
                    </div>
                    <div className="max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
                      {excelPreview.slice(0, 10).map((p, idx) => (
                        <div key={idx} className="p-2 flex items-center justify-between">
                          <div>
                            <span className="font-mono font-bold text-blue-600 dark:text-blue-400 mr-2">
                              {p.niup}
                            </span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {p.nama_lengkap}
                            </span>
                          </div>
                          <span className="text-slate-500 text-[10px]">
                            {p.wilayah} ({p.daerah})
                          </span>
                        </div>
                      ))}
                      {excelPreview.length > 10 && (
                        <div className="p-2 text-center text-slate-400 text-[10px]">
                          ...dan {excelPreview.length - 10} data lainnya
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col-reverse sm:flex-row justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="min-h-[44px] sm:min-h-[38px] px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl cursor-pointer active:scale-95 flex items-center justify-center"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitExcel}
                    disabled={excelImportLoading || excelPreview.length === 0}
                    className="min-h-[44px] sm:min-h-[38px] px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition shadow-md shadow-emerald-600/30 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{excelImportLoading ? 'Mengimpor ke Database...' : `Simpan ${excelPreview.length} Santri`}</span>
                  </button>
                </div>
              </div>
            )}

            {/* METHOD 3: API PONDOK INTEGRATION */}
            {addMethod === 'api' && !editingStudent && (
              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
                <div className="p-3.5 sm:p-4 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-900 dark:text-indigo-200 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <RefreshCw className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    Sinkronisasi Langsung dari SIM Pondok Pesantren
                  </div>
                  <p className="text-[11px] text-indigo-800 dark:text-indigo-300">
                    Sistem akan mengambil master data santri terupdate langsung melalui endpoint SIM NJ yang telah terkonfigurasi.
                  </p>
                </div>

                <div className="p-3.5 sm:p-4 border border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Endpoint Sumber:</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">API SIM Nurul Jadid</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Tipe Sinkronisasi:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">Upsert Otomatis (Update & Insert)</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col-reverse sm:flex-row justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="min-h-[44px] sm:min-h-[38px] px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl cursor-pointer active:scale-95 flex items-center justify-center"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleSyncFromApi}
                    disabled={apiSyncLoading}
                    className="min-h-[44px] sm:min-h-[38px] px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition shadow-md shadow-indigo-600/30 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <RefreshCw className={`w-4 h-4 ${apiSyncLoading ? 'animate-spin' : ''}`} />
                    <span>{apiSyncLoading ? 'Menyinkronkan...' : 'Jalankan Sinkronisasi API'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
