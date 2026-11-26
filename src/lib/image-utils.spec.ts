import { processAndCompressImage } from './image-utils';

describe('image-utils - processAndCompressImage', () => {
  it('should reject if file is null or undefined', async () => {
    // @ts-ignore
    await expect(processAndCompressImage(null)).rejects.toThrow('File tidak ditemukan');
  });

  it('should reject invalid file format', async () => {
    const invalidFile = new File(['dummy content'], 'test.txt', { type: 'text/plain' });
    await expect(processAndCompressImage(invalidFile)).rejects.toThrow('Format file tidak didukung');
  });

  it('should reject oversized input file', async () => {
    const oversizedBlob = new Uint8Array(6 * 1024 * 1024); // 6MB
    const oversizedFile = new File([oversizedBlob], 'huge.png', { type: 'image/png' });
    await expect(processAndCompressImage(oversizedFile, { maxInputSizeMB: 5 })).rejects.toThrow(
      'melebihi batas maksimal 5 MB'
    );
  });
});
