'use client';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserCheck,
  Plus,
  Shield,
  Key,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  Upload,
  Image as ImageIcon,
  User,
  Search,
  X,
} from 'lucide-react';
import { operatorsApi, studentsApi } from '../../lib/api';
import { Operator, Role, Student } from '../../types';
import { useToast } from '../Toast';
import { processAndCompressImage } from '../../lib/image-utils';

const DAFTAR_WILAYAH = [
  'Wilayah Syekh Jumadil Kubro (01)',
  'Wilayah Jalaluddin Ar-Rumi (06)',
  'Wilayah Al-Amiri (08)',
  'Wilayah Zaid bin Tsabit Putra (10)',
  'Wilayah Az-Zainiyah (02)',
  'Wilayah Al-Hasyimiyah (03)',
  "Wilayah Fatimatuzzahro' (05)",
  'Wilayah Al-Mawaddah (07)',
  'Wilayah Al-Lathifiyah (09)',
  'Wilayah Zaid bin Tsabit Putri (11)',
  'Wilayah Nasyiatul Hamidiyah (04)',
];

interface OperatorsViewProps {
  currentUser?: Operator | null;
  onUserUpdated?: (updated: Operator) => void;
}

export const OperatorsView: React.FC<OperatorsViewProps> = ({
  currentUser,
  onUserUpdated,
}) => {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createUsername, setCreateUsername] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createName, setCreateName] = useState('');
  const [createRole, setRole] = useState<Role>('petugaspos');
  const [createWilayah, setCreateWilayah] = useState('');
  const [createPhoto, setCreatePhoto] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingOp, setEditingOp] = useState<Operator | null>(null);
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<Role>('petugaspos');
  const [editWilayah, setEditWilayah] = useState('');
  const [editPhoto, setEditPhoto] = useState<string>('');

  // Delete Modal State
  const [deleteTarget, setDeleteTarget] = useState<Operator | null>(null);

  const fileInputRefCreate = useRef<HTMLInputElement>(null);
  const fileInputRefEdit = useRef<HTMLInputElement>(null);

  const { showToast } = useToast();

  const fetchOperators = async () => {
    try {
      const data = await operatorsApi.getAll();
      setOperators(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStudents = async () => {
    try {
      const data = await studentsApi.getAll();
      setStudents(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchOperators();
    fetchStudents();
  }, []);

  // Filter students for registration search
  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return students.slice(0, 10);
    const q = studentSearch.toLowerCase();
    return students
      .filter(
        (s) =>
          s.nama_lengkap.toLowerCase().includes(q) ||
          s.niup.toLowerCase().includes(q)
      )
      .slice(0, 15);
  }, [students, studentSearch]);

  // Handle Photo upload with WebP compression and size limit
  const handlePhotoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'create' | 'edit'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so user can re-select if desired
    e.target.value = '';

    try {
      const result = await processAndCompressImage(file, {
        maxWidth: 512,
        maxHeight: 512,
        quality: 0.85,
        maxInputSizeMB: 5,
        squareCrop: true,
      });

      if (type === 'create') {
        setCreatePhoto(result.dataUrl);
      } else {
        setEditPhoto(result.dataUrl);
      }

      showToast(`Foto profil berhasil dikonversi ke WebP (${result.sizeKB} KB)`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Gagal memproses foto profil', 'error');
    }
  };

  // Check if name matches any registered student
  const isNameVerifiedStudent = useMemo(() => {
    if (selectedStudent) return true;
    if (!createName.trim()) return false;
    return students.some(
      (s) => s.nama_lengkap.toLowerCase() === createName.trim().toLowerCase()
    );
  }, [students, createName, selectedStudent]);

  // Handle Create Operator
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!createName.trim() || !createUsername.trim() || !createPassword.trim()) {
      showToast('Lengkapi nama, username, dan kata sandi', 'warning');
      return;
    }

    if (createRole === 'keamanan' && !createWilayah) {
      showToast('Wilayah wajib dipilih untuk akun keamanan', 'warning');
      return;
    }

    // Validation: Operator must be a registered student
    if (!isNameVerifiedStudent) {
      showToast(
        'Calon petugas wajib sudah terdaftar dalam Basis Data Santri Pondok!',
        'error'
      );
      return;
    }

    setLoading(true);
    try {
      await operatorsApi.create({
        username: createUsername.trim().toLowerCase(),
        password: createPassword.trim(),
        name: createName.trim(),
        role: createRole,
        wilayah: createRole === 'keamanan' ? createWilayah : undefined,
        photo: createPhoto || undefined,
      });

      showToast('Petugas baru berhasil didaftarkan!', 'success');
      setIsCreateOpen(false);
      setCreateUsername('');
      setCreatePassword('');
      setCreateName('');
      setCreatePhoto('');
      setSelectedStudent(null);
      setStudentSearch('');
      setRole('petugaspos');
      setCreateWilayah('');
      fetchOperators();
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.message || 'Gagal menambahkan operator', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (op: Operator) => {
    setEditingOp(op);
    setEditName(op.name);
    setEditUsername(op.username);
    setEditRole(op.role);
    setEditWilayah(op.wilayah || '');
    setEditPhoto(op.photo || '');
    setEditPassword(''); // empty means keep unchanged
    setIsEditOpen(true);
  };

  // Handle Save Edit Operator
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOp) return;

    if (!editName.trim() || !editUsername.trim()) {
      showToast('Nama dan username tidak boleh kosong', 'warning');
      return;
    }

    if (editRole === 'keamanan' && !editWilayah) {
      showToast('Wilayah wajib dipilih untuk akun keamanan', 'warning');
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        name: editName.trim(),
        username: editUsername.trim().toLowerCase(),
        role: editRole,
        wilayah: editRole === 'keamanan' ? editWilayah : '',
        photo: editPhoto || null,
      };

      if (editPassword.trim()) {
        payload.password = editPassword.trim();
      }

      const updated = await operatorsApi.update(editingOp.id, payload);
      showToast(`Data petugas '${updated.name}' berhasil diperbarui!`, 'success');

      // If current user updated their own info, notify parent
      if (currentUser && currentUser.id === editingOp.id && onUserUpdated) {
        onUserUpdated(updated);
        try {
          localStorage.setItem('posketren_user', JSON.stringify(updated));
        } catch (e) { }
      }

      setIsEditOpen(false);
      setEditingOp(null);
      fetchOperators();
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.message || 'Gagal memperbarui data petugas', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle Delete Operator
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    if (deleteTarget.username === 'admin') {
      showToast('Akun Administrator utama tidak boleh dihapus!', 'error');
      setDeleteTarget(null);
      return;
    }

    if (currentUser && currentUser.id === deleteTarget.id) {
      showToast('Anda tidak dapat menghapus akun Anda sendiri saat sedang login!', 'error');
      setDeleteTarget(null);
      return;
    }

    setLoading(true);
    try {
      await operatorsApi.delete(deleteTarget.id);
      showToast(`Petugas '${deleteTarget.name}' berhasil dihapus!`, 'success');
      setDeleteTarget(null);
      fetchOperators();
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.message || 'Gagal menghapus petugas', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle Unlock Operator
  const handleUnlock = async (id: string, operatorName: string) => {
    try {
      await operatorsApi.unlock(id);
      showToast(`Akun ${operatorName} berhasil dibuka kuncinya!`, 'success');
      fetchOperators();
    } catch (err: any) {
      showToast('Gagal membuka kunci akun', 'error');
    }
  };

  const getRoleBadge = (role: Role) => {
    switch (role) {
      case 'admin':
        return (
          <span className="px-2.5 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 rounded-full border border-blue-200 dark:border-blue-800">
            Administrator Sistem
          </span>
        );
      case 'keamanan':
        return (
          <span className="px-2.5 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300 rounded-full border border-rose-200 dark:border-rose-800">
            Biro Keamanan Pondok
          </span>
        );
      case 'petugaspos':
      default:
        return (
          <span className="px-2.5 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 rounded-full border border-emerald-200 dark:border-emerald-800">
            Petugas Pos Paket
          </span>
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-800 mb-1.5">
            <UserCheck className="w-3.5 h-3.5" />
            Akses Administrator (RBAC)
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Manajemen Petugas & Pengguna
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Kelola akun petugas pos, biro keamanan, dan administrator dengan hak akses terpisah.
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedStudent(null);
            setStudentSearch('');
            setCreateName('');
            setCreateUsername('');
            setCreatePassword('');
            setCreatePhoto('');
            setIsCreateOpen(true);
          }}
          className="w-full sm:w-auto min-h-[44px] flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl transition shadow-sm cursor-pointer active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Petugas Baru</span>
        </button>
      </div>

      {/* Operators List Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
        <div className="px-4 sm:px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider">
            Daftar Petugas Terdaftar ({operators.length})
          </h3>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">
            Hak akses RBAC
          </span>
        </div>

        {/* Mobile View: Clean Operator Cards (sm:hidden) */}
        <div className="block sm:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {operators.map((op) => {
            const isLocked = op.locked_until && new Date(op.locked_until) > new Date();

            return (
              <div key={op.id} className="p-3.5 space-y-2.5 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {op.photo ? (
                      <img
                        src={op.photo}
                        alt={op.name}
                        className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center text-xs shrink-0 border border-blue-200 dark:border-blue-800">
                        {op.name ? op.name.slice(0, 2).toUpperCase() : 'OP'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 dark:text-white text-xs truncate">
                        {op.name}
                      </div>
                      <div className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                        @{op.username}
                      </div>
                      <div className="flex flex-col items-start gap-1">
                        {getRoleBadge(op.role)}

                        {op.role === 'keamanan' && op.wilayah && (
                          <span className="text-[10px] text-rose-600 dark:text-rose-400">
                            {op.wilayah}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <div className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[10px] text-slate-700 dark:text-slate-300">
                    <Shield className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                    <span>Terenkripsi Bcrypt</span>
                  </div>

                  <div>
                    {isLocked ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-rose-600" />
                        Terkunci
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        Aktif
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-1.5">
                  {isLocked && (
                    <button
                      onClick={() => handleUnlock(op.id, op.name)}
                      className="min-h-[34px] px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/40 dark:text-blue-300 rounded-lg border border-blue-200 dark:border-blue-800 transition inline-flex items-center gap-1 cursor-pointer active:scale-95"
                    >
                      <Unlock className="w-3 h-3" />
                      <span>Buka</span>
                    </button>
                  )}
                  <button
                    onClick={() => openEditModal(op)}
                    className="min-h-[34px] px-3 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-lg border border-slate-200 dark:border-slate-700 transition flex items-center gap-1 cursor-pointer active:scale-95"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => setDeleteTarget(op)}
                    disabled={op.username === 'admin'}
                    className="min-h-[34px] px-3 py-1 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg border border-slate-200 dark:border-slate-700 transition flex items-center gap-1 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop Table (hidden sm:block) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase font-semibold text-[10px]">
              <tr>
                <th className="px-4 py-3">Petugas</th>
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">Keamanan Sandi</th>
                <th className="px-4 py-3">Role / Wewenang</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {operators.map((op) => {
                const isLocked = op.locked_until && new Date(op.locked_until) > new Date();

                return (
                  <tr
                    key={op.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                  >
                    {/* Photo + Name */}
                    <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200">
                      <div className="flex items-center gap-2.5">
                        {op.photo ? (
                          <img
                            src={op.photo}
                            alt={op.name}
                            className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center text-xs shrink-0 border border-blue-200 dark:border-blue-800">
                            {op.name ? op.name.slice(0, 2).toUpperCase() : 'OP'}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {op.name}
                          </div>
                          {currentUser?.id === op.id && (
                            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-normal">
                              (Akun Anda Saat Ini)
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Username */}
                    <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">
                      @{op.username}
                    </td>

                    {/* Password Security Status */}
                    <td className="px-4 py-3">
                      <div className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] text-slate-700 dark:text-slate-300">
                        <Shield className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span>Terenkripsi Bcrypt</span>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-start gap-1">
                        {getRoleBadge(op.role)}

                        {op.role === 'keamanan' && op.wilayah && (
                          <span className="text-[10px] text-rose-600 dark:text-rose-400">
                            {op.wilayah}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      {isLocked ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-1 w-fit">
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          Terkunci
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          Aktif
                        </span>
                      )}
                    </td>

                    {/* Actions: Edit & Delete */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {isLocked && (
                          <button
                            onClick={() => handleUnlock(op.id, op.name)}
                            className="px-2 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/40 dark:text-blue-300 rounded-lg border border-blue-200 dark:border-blue-800 transition inline-flex items-center gap-1 cursor-pointer"
                            title="Buka Kunci Akun"
                          >
                            <Unlock className="w-3 h-3" />
                            <span>Buka</span>
                          </button>
                        )}

                        <button
                          onClick={() => openEditModal(op)}
                          className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-lg border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                          title="Edit Petugas"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setDeleteTarget(op)}
                          disabled={op.username === 'admin'}
                          className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg border border-slate-200 dark:border-slate-700 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          title={op.username === 'admin' ? 'Admin utama tidak bisa dihapus' : 'Hapus Petugas'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE OPERATOR MODAL */}
      <AnimatePresence>
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-200 dark:border-slate-800 max-h-[92vh] flex flex-col"
            >
              <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-white text-xs sm:text-sm">
                    Tambah Petugas Baru
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
                    Petugas wajib terdaftar dalam Basis Data Santri Nurul Jadid
                  </p>
                </div>
                <button
                  onClick={() => setIsCreateOpen(false)}
                  className="min-w-[40px] min-h-[40px] p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center justify-center active:scale-95 cursor-pointer"
                  aria-label="Tutup Modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
                {/* 1. Student Verification Search / Select */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Verifikasi Santri Terdaftar <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Ketik nama santri atau NIUP untuk mencari..."
                      value={studentSearch}
                      onChange={(e) => {
                        setStudentSearch(e.target.value);
                        setShowStudentDropdown(true);
                      }}
                      onFocus={() => setShowStudentDropdown(true)}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:bg-slate-800 dark:text-white"
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />

                    {/* Dropdown search suggestions */}
                    {showStudentDropdown && filteredStudents.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 max-h-48 overflow-y-auto z-20">
                        {filteredStudents.map((s) => (
                          <div
                            key={s.niup}
                            onClick={() => {
                              setSelectedStudent(s);
                              setCreateName(s.nama_lengkap);
                              setStudentSearch(s.nama_lengkap);
                              setShowStudentDropdown(false);
                            }}
                            className="px-3 py-2 hover:bg-blue-50 dark:hover:bg-slate-700/60 cursor-pointer border-b border-slate-100 dark:border-slate-700 last:border-0 text-xs transition"
                          >
                            <div className="font-bold text-slate-800 dark:text-white">
                              {s.nama_lengkap}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                              <span>NIUP: {s.niup}</span>
                              <span>•</span>
                              <span>{s.wilayah} ({s.daerah})</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Status Banner */}
                  {selectedStudent ? (
                    <div className="mt-2 p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <span>Terverifikasi: </span>
                        <strong>{selectedStudent.nama_lengkap}</strong> (NIUP: {selectedStudent.niup})
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-[11px] text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>Pilih santri dari daftar di atas agar nama otomatis terverifikasi.</span>
                    </div>
                  )}
                </div>

                {/* 2. Full Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Nama Lengkap Petugas
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nama lengkap santri..."
                    value={createName}
                    onChange={(e) => {
                      setCreateName(e.target.value);
                      setSelectedStudent(null);
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none dark:bg-slate-800 dark:text-white"
                  />
                </div>

                {/* 3. Username & Password */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Username
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Username"
                      value={createUsername}
                      onChange={(e) =>
                        setCreateUsername(e.target.value.replace(/\s/g, ''))
                      }
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none font-mono dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Kata Sandi Awal
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Password"
                      value={createPassword}
                      onChange={(e) => setCreatePassword(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none font-mono dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                {/* 4. Role Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Peran / Wewenang (Role)
                  </label>
                  <select
                    value={createRole}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                  >
                    <option value="petugaspos">Petugas Pos Paket (Penerimaan, Validasi, RTS, Manifest)</option>
                    <option value="keamanan">Biro Keamanan (Penyitaan & Validasi)</option>
                    <option value="admin">Administrator Penuh (Semua Hak Akses)</option>
                  </select>
                </div>

                {/* 4.1 Wilayah Khusus Akun Keamanan */}
                {createRole === 'keamanan' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Wilayah Penugasan <span className="text-rose-500">*</span>
                    </label>

                    <select
                      required
                      value={createWilayah}
                      onChange={(e) => setCreateWilayah(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                    >
                      <option value="">Pilih Wilayah Keamanan</option>

                      {DAFTAR_WILAYAH.map((wilayah) => (
                        <option key={wilayah} value={wilayah}>
                          {wilayah}
                        </option>
                      ))}
                    </select>

                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                      Akun keamanan hanya dapat mengakses paket dari wilayah yang ditentukan.
                    </p>
                  </div>
                )}  

                {/* 5. Profile Photo (Optional) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Foto Profil (Opsional)
                  </label>
                  <div className="flex items-center gap-3">
                    {createPhoto ? (
                      <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 shrink-0">
                        <img
                          src={createPhoto}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setCreatePhoto('')}
                          className="absolute inset-0 bg-black/50 text-white flex items-center justify-center text-[10px] font-bold opacity-0 hover:opacity-100 transition"
                        >
                          Hapus
                        </button>
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                    )}

                    <div className="flex-1">
                      <input
                        type="file"
                        ref={fileInputRefCreate}
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handlePhotoUpload(e, 'create')}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRefCreate.current?.click()}
                        className="px-3 py-1.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl border border-slate-300 dark:border-slate-700 transition inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{createPhoto ? 'Ganti Foto' : 'Unggah Foto Profil'}</span>
                      </button>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                        Format JPG, PNG atau WebP (Maksimal 2 MB).
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col-reverse sm:flex-row justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="min-h-[44px] sm:min-h-[38px] px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer active:scale-95 flex items-center justify-center"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !isNameVerifiedStudent}
                    className="min-h-[44px] sm:min-h-[38px] px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer active:scale-95 flex items-center justify-center"
                  >
                    {loading ? 'Menyimpan...' : 'Daftarkan Petugas'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT OPERATOR MODAL */}
      <AnimatePresence>
        {isEditOpen && editingOp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-200 dark:border-slate-800 max-h-[92vh] flex flex-col"
            >
              <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-white text-xs sm:text-sm">
                    Edit Petugas: {editingOp.name}
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
                    Perbarui nama, wewenang, username, kata sandi, atau foto
                  </p>
                </div>
                <button
                  onClick={() => setIsEditOpen(false)}
                  className="min-w-[40px] min-h-[40px] p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center justify-center active:scale-95 cursor-pointer"
                  aria-label="Tutup Modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
                {/* 1. Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none dark:bg-slate-800 dark:text-white"
                  />
                </div>

                {/* 2. Username & Role */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Username
                    </label>
                    <input
                      type="text"
                      required
                      value={editUsername}
                      onChange={(e) =>
                        setEditUsername(e.target.value.replace(/\s/g, ''))
                      }
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none font-mono dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Peran / Wewenang
                    </label>
                    <select
                      value={editRole}
                      onChange={(e) => {
                        const role = e.target.value as Role;
                        setEditRole(role);

                        if (role !== 'keamanan') {
                          setEditWilayah('');
                        }
                      }}
                      className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                    >
                      <option value="petugaspos">Petugas Pos Paket</option>
                      <option value="keamanan">Biro Keamanan</option>
                      <option value="admin">Administrator Penuh</option>
                    </select>
                  </div>

                  {/* 2.1 Wilayah Khusus Akun Keamanan */}
                  {editRole === 'keamanan' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                        Wilayah Penugasan <span className="text-rose-500">*</span>
                      </label>

                      <select
                        required
                        value={editWilayah}
                        onChange={(e) => setEditWilayah(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                      >
                        <option value="">Pilih Wilayah Keamanan</option>

                        {DAFTAR_WILAYAH.map((wilayah) => (
                          <option key={wilayah} value={wilayah}>
                            {wilayah}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* 3. New Password (optional) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Ubah Kata Sandi (Kosongkan jika tidak ingin mengubah)
                  </label>
                  <input
                    type="text"
                    placeholder="Ketik kata sandi baru untuk mereset..."
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none font-mono dark:bg-slate-800 dark:text-white"
                  />
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                    Kata sandi terenkripsi aman (bcrypt). Masukkan kata sandi baru jika ingin mereset sandi operator ini.
                  </p>
                </div>

                {/* 4. Profile Photo */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Foto Profil (Opsional)
                  </label>
                  <div className="flex items-center gap-3">
                    {editPhoto ? (
                      <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 shrink-0">
                        <img
                          src={editPhoto}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setEditPhoto('')}
                          className="absolute inset-0 bg-black/50 text-white flex items-center justify-center text-[10px] font-bold opacity-0 hover:opacity-100 transition"
                        >
                          Hapus
                        </button>
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                    )}

                    <div className="flex-1">
                      <input
                        type="file"
                        ref={fileInputRefEdit}
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handlePhotoUpload(e, 'edit')}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRefEdit.current?.click()}
                        className="px-3 py-1.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl border border-slate-300 dark:border-slate-700 transition inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{editPhoto ? 'Ganti Foto' : 'Unggah Foto'}</span>
                      </button>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                        Foto akan ditampilkan pada Navbar profil pengguna.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col-reverse sm:flex-row justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditOpen(false)}
                    className="min-h-[44px] sm:min-h-[38px] px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer active:scale-95 flex items-center justify-center"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="min-h-[44px] sm:min-h-[38px] px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer active:scale-95 flex items-center justify-center"
                  >
                    {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-xl max-w-sm w-full p-5 sm:p-6 border border-slate-200 dark:border-slate-800 text-center"
            >
              <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1">
                Hapus Akun Petugas?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                Apakah Anda yakin ingin menghapus petugas{' '}
                <strong className="text-slate-800 dark:text-slate-200">{deleteTarget.name}</strong> (@{deleteTarget.username})? Tindakan ini tidak dapat dibatalkan.
              </p>

              <div className="flex flex-col-reverse sm:flex-row items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="w-full sm:w-auto min-h-[44px] sm:min-h-[38px] px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer active:scale-95 flex items-center justify-center"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={loading}
                  className="w-full sm:w-auto min-h-[44px] sm:min-h-[38px] px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer active:scale-95 flex items-center justify-center"
                >
                  {loading ? 'Menghapus...' : 'Ya, Hapus'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
