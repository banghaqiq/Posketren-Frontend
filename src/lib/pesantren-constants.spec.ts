import {
  DAFTAR_WILAYAH_PESANTREN,
  DAFTAR_NAMA_WILAYAH,
  getDaerahByWilayah,
} from './pesantren-constants';

describe('pesantren-constants', () => {
  it('should export DAFTAR_WILAYAH_PESANTREN with at least 8 wilayah', () => {
    expect(DAFTAR_WILAYAH_PESANTREN.length).toBeGreaterThanOrEqual(8);
  });

  it('should include Dalem Kasepuhan and Lembaga / Eksternal', () => {
    const values = DAFTAR_NAMA_WILAYAH;
    expect(values).toContain('Dalem Kasepuhan');
    expect(values).toContain('Lembaga / Eksternal');
  });

  it('should find daerah by wilayah value correctly', () => {
    const kasepuhanDaerah = getDaerahByWilayah('Dalem Kasepuhan');
    expect(kasepuhanDaerah).toContain('Dalem Barat');
    expect(kasepuhanDaerah).toContain('Dalem Timur');
  });

  it('should return empty array for unknown wilayah', () => {
    const unknown = getDaerahByWilayah('Wilayah Tidak Dikenal');
    expect(unknown).toEqual([]);
  });
});
