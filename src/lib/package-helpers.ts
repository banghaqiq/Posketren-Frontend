import { PackageItem } from '../types';

/**
 * Helper to identify packages intended for pesantren caregiver family (Keluarga Pengasuh).
 * Centralized utility to ensure consistent rules across ManifestView, PackageValidationView, etc.
 */
export const isKeluargaPengasuh = (pkg: PackageItem | null): boolean => {
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
