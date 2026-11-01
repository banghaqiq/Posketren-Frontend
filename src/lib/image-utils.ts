/**
 * Image processing and compression utility for POSKETREN NJ
 * Converts images to WebP format, resizes dimensions, and enforces size constraints.
 */

export interface ImageProcessOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0 (default: 0.8)
  maxInputSizeMB?: number; // Maximum allowed raw input size in MB (default: 5)
  squareCrop?: boolean; // For profile photos
}

export interface ProcessedImageResult {
  dataUrl: string;
  mimeType: 'image/webp' | 'image/jpeg';
  sizeBytes: number;
  sizeKB: number;
  width: number;
  height: number;
}

const ALLOWED_INPUT_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/bmp',
];

/**
 * Validates, resizes, compresses, and converts an image file to WebP format.
 */
export const processAndCompressImage = (
  file: File,
  options: ImageProcessOptions = {}
): Promise<ProcessedImageResult> => {
  return new Promise((resolve, reject) => {
    const {
      maxWidth = 1280,
      maxHeight = 1280,
      quality = 0.8,
      maxInputSizeMB = 5,
      squareCrop = false,
    } = options;

    // 1. Validate File Existence
    if (!file) {
      return reject(new Error('File tidak ditemukan'));
    }

    // 2. Validate Input Size Limit
    const maxSizeBytes = maxInputSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return reject(
        new Error(
          `Ukuran file (${(file.size / (1024 * 1024)).toFixed(1)} MB) melebihi batas maksimal ${maxInputSizeMB} MB`
        )
      );
    }

    // 3. Validate MIME Type
    const fileMime = (file.type || '').toLowerCase();
    const isValidType =
      ALLOWED_INPUT_MIME_TYPES.includes(fileMime) ||
      file.name.match(/\.(jpe?g|png|webp|bmp)$/i);

    if (!isValidType) {
      return reject(
        new Error(
          'Format file tidak didukung. Harap pilih gambar dengan format JPG, PNG, atau WebP'
        )
      );
    }

    // 4. Read File via FileReader
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file gambar'));
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error('File yang dipilih bukan file gambar yang valid'));
      img.onload = () => {
        let srcX = 0;
        let srcY = 0;
        let srcWidth = img.width;
        let srcHeight = img.height;

        let targetWidth = img.width;
        let targetHeight = img.height;

        if (squareCrop) {
          // Crop center square (ideal for profile avatars)
          const minDim = Math.min(srcWidth, srcHeight);
          srcX = (srcWidth - minDim) / 2;
          srcY = (srcHeight - minDim) / 2;
          srcWidth = minDim;
          srcHeight = minDim;

          targetWidth = Math.min(minDim, maxWidth);
          targetHeight = targetWidth;
        } else {
          // Scale keeping aspect ratio
          if (targetWidth > targetHeight) {
            if (targetWidth > maxWidth) {
              targetHeight = Math.round((targetHeight * maxWidth) / targetWidth);
              targetWidth = maxWidth;
            }
          } else {
            if (targetHeight > maxHeight) {
              targetWidth = Math.round((targetWidth * maxHeight) / targetHeight);
              targetHeight = maxHeight;
            }
          }
        }

        // Enforce minimum dimension
        targetWidth = Math.max(1, targetWidth);
        targetHeight = Math.max(1, targetHeight);

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          return reject(new Error('Gagal menginisialisasi canvas pemrosesan gambar'));
        }

        // High quality rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Fill white background in case of transparent PNG converted to JPEG fallback
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, targetWidth, targetHeight);

        // Draw image
        ctx.drawImage(
          img,
          srcX,
          srcY,
          srcWidth,
          srcHeight,
          0,
          0,
          targetWidth,
          targetHeight
        );

        // Convert to WebP format
        let mimeType: 'image/webp' | 'image/jpeg' = 'image/webp';
        let dataUrl = canvas.toDataURL('image/webp', quality);

        // Fallback to JPEG if browser canvas does not support WebP encoding
        if (!dataUrl.startsWith('data:image/webp')) {
          mimeType = 'image/jpeg';
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        // Approximate size calculation
        const base64Data = dataUrl.split(',')[1] || '';
        const sizeBytes = Math.round((base64Data.length * 3) / 4);
        const sizeKB = Math.round(sizeBytes / 1024);

        resolve({
          dataUrl,
          mimeType,
          sizeBytes,
          sizeKB,
          width: targetWidth,
          height: targetHeight,
        });
      };

      img.src = event.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
};

