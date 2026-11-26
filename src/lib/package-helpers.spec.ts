import { isKeluargaPengasuh } from './package-helpers';
import { PackageItem } from '../types';

describe('package-helpers - isKeluargaPengasuh', () => {
  it('should return false for null', () => {
    expect(isKeluargaPengasuh(null)).toBe(false);
  });

  it('should detect recipientId PENGASUH', () => {
    const pkg = { recipientId: 'PENGASUH', recipientName: 'Santri Biasa' } as PackageItem;
    expect(isKeluargaPengasuh(pkg)).toBe(true);
  });

  it('should detect name containing pengasuh or dzurriyah', () => {
    const pkg1 = { recipientName: 'Gus Ahmad (Pengasuh)' } as PackageItem;
    const pkg2 = { recipientName: 'Ning Aisyah [Dzurriyah]' } as PackageItem;
    expect(isKeluargaPengasuh(pkg1)).toBe(true);
    expect(isKeluargaPengasuh(pkg2)).toBe(true);
  });

  it('should detect daerah containing kasepuhan', () => {
    const pkg = { daerah: 'Dalem Kasepuhan' } as PackageItem;
    expect(isKeluargaPengasuh(pkg)).toBe(true);
  });

  it('should return false for regular santri', () => {
    const pkg = {
      recipientId: '02397227',
      recipientName: 'Muhammad Nurul Huda',
      wilayah: 'Wilayah Syekh Jumadil Kubro (01)',
      daerah: 'Sunan Gunung Jati (A)',
    } as PackageItem;
    expect(isKeluargaPengasuh(pkg)).toBe(false);
  });
});
