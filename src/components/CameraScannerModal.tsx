'use client';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Camera,
  X,
  Check,
  Image as ImageIcon,
  AlertCircle,
  Scan,
  Volume2,
  Flashlight,
  SwitchCamera,
  RefreshCw,
} from 'lucide-react';

interface CameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (scannedText: string) => void;
  title?: string;
}

interface CameraDevice {
  id: string;
  label: string;
}

// Helper to play an audible beep on scan success
const playScanBeep = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime); // 880Hz (A5)
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.12);
  } catch (e) {
    // Audio context may be restricted by autoplay policy
  }
};

/**
 * Robust extraction of clean courier tracking number from raw barcode / QR data:
 * - JSON payloads (Tokopedia / TikTok Shop / Shopee seller)
 * - URLs (Shopee Xpress, J&T, SiCepat, JNE, Anteraja)
 * - Multi-line physical parcel address labels
 * - Delimited texts with pipe (|), semicolon (;), hash (#)
 * - Prefix removals ("Resi:", "No. Resi:", "AWB:", etc.)
 * - Internal POSKETREN IDs (PKG-YYYYMMDD-XXXX or JSTP-XXXXXX)
 */
export const extractCleanTrackingNumber = (rawText: string): string => {
  if (!rawText) return '';
  let text = rawText.trim();

  // 1. JSON Format (common in e-commerce marketplace QR codes)
  if (text.startsWith('{') && text.endsWith('}')) {
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed === 'object' && parsed !== null) {
        const keys = [
          'tracking_number',
          'tracking_no',
          'trackingNumber',
          'awb',
          'no_resi',
          'resi',
          'waybill',
          'billCode',
          'connote',
          'code',
          'id',
        ];
        for (const k of keys) {
          if (parsed[k] && typeof parsed[k] === 'string' && parsed[k].trim().length >= 4) {
            return extractCleanTrackingNumber(parsed[k]);
          }
        }
      }
    } catch (e) {
      // Continue to next extraction rules
    }
  }

  // 2. URL Format (Shopee Xpress, J&T, SiCepat, Anteraja, JNE, TikTok, etc.)
  if (text.startsWith('http://') || text.startsWith('https://')) {
    try {
      const url = new URL(text);
      // Query parameters
      const searchKeys = [
        'awb',
        'no',
        'resi',
        'tracking',
        'code',
        'id',
        'trackingNumber',
        'tracking_number',
        'tracking_no',
        'billCode',
        'waybill',
        'connote',
      ];
      for (const k of searchKeys) {
        const val = url.searchParams.get(k);
        if (val && val.trim().length >= 4) {
          return extractCleanTrackingNumber(val);
        }
      }
      // Path segments (e.g. /m/SPXID048192837 or /checkAwb/004283928192)
      const pathSegments = url.pathname
        .split('/')
        .map((s) => s.trim())
        .filter(Boolean);
      if (pathSegments.length > 0) {
        const last = pathSegments[pathSegments.length - 1];
        if (last && last.length >= 5) {
          return extractCleanTrackingNumber(last);
        }
      }
    } catch (e) {
      // Continue
    }
  }

  // 3. Multi-line Text (Courier receipt with address block)
  if (text.includes('\n')) {
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    // Check if any line has an explicit label like "No. Resi: ..." or "AWB: ..."
    for (const line of lines) {
      const labeledMatch = line.match(
        /(?:resi|awb|no\.?\s*resi|tracking|waybill|connote)\s*[:=]\s*([A-Za-z0-9_-]+)/i
      );
      if (labeledMatch && labeledMatch[1] && labeledMatch[1].length >= 5) {
        return labeledMatch[1].trim();
      }
    }

    // Check each line against known Indonesian courier tracking patterns
    const courierPatterns = [
      /\b(SPX[A-Za-z0-9]+)\b/i,
      /\b((?:JP|JX|JZ|JS|888)[0-9A-Za-z]{7,18})\b/i,
      /\b(00[0-9]{10,14})\b/,
      /\b((?:TKP|SIC)[A-Za-z0-9]+)\b/i,
      /\b((?:SOC|CGK|SUB|BDG|JNE)[0-9A-Za-z]{8,18})\b/i,
      /\b(100[0-9]{9,13})\b/,
      /\b((?:NV|NLID|NINJA)[0-9A-Za-z]+)\b/i,
      /\b(PKG-[0-9]{8}-[0-9A-Za-z]+)\b/i,
      /\b(JSTP-[0-9A-Za-z]+)\b/i,
    ];
    for (const line of lines) {
      for (const pattern of courierPatterns) {
        const m = line.match(pattern);
        if (m && m[1]) return m[1].trim();
      }
    }

    // Fallback to first line if alphanumeric and length >= 6
    if (lines[0] && /^[A-Za-z0-9_-]{6,35}$/.test(lines[0])) {
      return lines[0];
    }
  }

  // 4. Prefixed text (e.g. "Resi: SPXID0483928192" or "No. Resi: ...")
  text = text.replace(
    /^(?:RESI|AWB|NO\.?\s*RESI|NOMOR\s*RESI|TRACKING(?:\s*NO\.?)?|WAYBILL|CONNOTE)\s*[:=\-]\s*/i,
    ''
  );

  // 5. Delimited text (e.g. "SPXID0483928192|ID|CGK01" or "JP1234567890#01" or "JP1234567890;SOC")
  if (text.includes('|') || text.includes(';') || text.includes('#')) {
    const parts = text.split(/[|;#]/).map((p) => p.trim()).filter(Boolean);
    const match = parts.find((p) => /^[A-Za-z0-9_-]{6,32}$/.test(p));
    if (match) return match;
    return parts[0];
  }

  // 6. Clean any remaining special symbols and spaces
  text = text.replace(/[\r\n\t]/g, '').trim();

  // Strip non-alphanumeric punctuation at edges
  return text.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, '');
};

export const CameraScannerModal: React.FC<CameraScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  title = 'Scan Barcode 1D / QR Resi Paket',
}) => {
  const [manualInput, setManualInput] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [isTorchSupported, setIsTorchSupported] = useState(false);

  const scannerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stop camera helper
  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
      } catch (e) {
        // Ignored
      }
      scannerRef.current = null;
    }
  }, []);

  // Initialize and start camera
  const startCamera = useCallback(
    async (cameraId?: string) => {
      await stopScanner();
      setCameraError(null);
      setIsScanning(true);
      setScannedResult(null);

      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');

        // Enumerate cameras if not already done
        try {
          const devices = await Html5Qrcode.getCameras();
          if (devices && devices.length > 0) {
            setCameras(devices.map((d) => ({ id: d.id, label: d.label || `Kamera ${d.id}` })));
            if (!cameraId && !selectedCameraId) {
              // Prefer back camera if found in labels
              const backCam = devices.find(
                (d) =>
                  d.label.toLowerCase().includes('back') ||
                  d.label.toLowerCase().includes('belakang') ||
                  d.label.toLowerCase().includes('environment')
              );
              if (backCam) {
                setSelectedCameraId(backCam.id);
                cameraId = backCam.id;
              } else {
                setSelectedCameraId(devices[0].id);
                cameraId = devices[0].id;
              }
            }
          }
        } catch (e) {
          // Camera enumeration may be restricted on some devices
        }

        const qrCodeRegionId = 'reader-container';
        const element = document.getElementById(qrCodeRegionId);
        if (!element) return;

        // Comprehensive barcode formats: Both 1D Long Barcodes and 2D Square QR Codes
        const formatsToSupport = [
          Html5QrcodeSupportedFormats.QR_CODE, // QR Kotak (2D)
          Html5QrcodeSupportedFormats.DATA_MATRIX, // Kotak (2D)
          Html5QrcodeSupportedFormats.AZTEC, // Kotak (2D)
          Html5QrcodeSupportedFormats.PDF_417, // Barcode Dokumen (2D)
          Html5QrcodeSupportedFormats.CODE_128, // Barcode Panjang (1D - Shopee, J&T, JNE, SiCepat)
          Html5QrcodeSupportedFormats.CODE_39, // Barcode Panjang (1D)
          Html5QrcodeSupportedFormats.CODE_93, // Barcode Panjang (1D)
          Html5QrcodeSupportedFormats.EAN_13, // Barcode Panjang (1D)
          Html5QrcodeSupportedFormats.EAN_8, // Barcode Panjang (1D)
          Html5QrcodeSupportedFormats.UPC_A, // Barcode Panjang (1D)
          Html5QrcodeSupportedFormats.UPC_E, // Barcode Panjang (1D)
          Html5QrcodeSupportedFormats.CODABAR, // Barcode Panjang (1D)
          Html5QrcodeSupportedFormats.ITF, // Barcode Panjang (1D)
        ];

        const html5QrCode = new Html5Qrcode(qrCodeRegionId, {
          formatsToSupport,
          verbose: false,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true,
          },
        });
        scannerRef.current = html5QrCode;

        // Wide-box configuration to reliably capture BOTH long 1D barcodes and square 2D QR codes
        // Strictly guarantees dimensions are >= 50px as required by html5-qrcode Constants.MIN_QR_BOX_SIZE
        const config = {
          fps: 20,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const minSize = 50;
            const validVw = Math.max(minSize, viewfinderWidth || 280);
            const validVh = Math.max(minSize, viewfinderHeight || 200);

            const width = Math.max(minSize, Math.floor(Math.min(validVw * 0.9, 440)));
            const height = Math.max(minSize, Math.floor(Math.min(validVh * 0.65, 260)));
            return { width, height };
          },
        };

        const onScanSuccess = (decodedText: string) => {
          playScanBeep();
          const cleanResi = extractCleanTrackingNumber(decodedText);
          setScannedResult(cleanResi);

          // Stop scanner and notify parent
          stopScanner().finally(() => {
            setTimeout(() => {
              onScan(cleanResi);
              onClose();
            }, 300);
          });
        };

        // Camera constraints: High-definition for sharp barcode bars
        const cameraConfig = cameraId
          ? { deviceId: { exact: cameraId } }
          : {
              facingMode: 'environment',
              width: { min: 640, ideal: 1280, max: 1920 },
              height: { min: 480, ideal: 720, max: 1080 },
            };

        await html5QrCode.start(cameraConfig, config, onScanSuccess, () => {});

        // Check torch support
        try {
          const track = html5QrCode.getRunningTrackCapabilities?.() || {};
          if (track && (track as any).torch) {
            setIsTorchSupported(true);
          }
        } catch (e) {
          // Torch check not supported
        }
      } catch (err: any) {
        console.warn('Camera stream error:', err);
        setCameraError(
          'Kamera tidak dapat diakses atau izin belum diberikan. Anda dapat mengganti pilihan kamera, mengunggah foto resi paket, atau mengetikkan nomor resi kurir di bawah.'
        );
      }
    },
    [onScan, onClose, stopScanner, selectedCameraId]
  );

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    if (isOpen) {
      // Delay ensures the modal DOM is rendered and measured before starting camera
      timeoutId = setTimeout(() => {
        startCamera(selectedCameraId || undefined);
      }, 150);
    } else {
      stopScanner();
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      stopScanner();
    };
  }, [isOpen, selectedCameraId]);

  // Toggle Torch / Flashlight
  const handleToggleTorch = async () => {
    if (!scannerRef.current) return;
    try {
      const nextTorch = !isTorchOn;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: nextTorch }],
      });
      setIsTorchOn(nextTorch);
    } catch (e) {
      console.warn('Torch toggle failed', e);
    }
  };

  // Switch camera
  const handleSwitchCamera = (cameraId: string) => {
    setSelectedCameraId(cameraId);
    startCamera(cameraId);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');
      const tempScanner = new Html5Qrcode('temp-file-reader', {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.DATA_MATRIX,
          Html5QrcodeSupportedFormats.AZTEC,
          Html5QrcodeSupportedFormats.PDF_417,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODABAR,
          Html5QrcodeSupportedFormats.ITF,
        ],
        verbose: false,
      });

      const result = await tempScanner.scanFileV2(file, true);
      if (result && result.decodedText) {
        playScanBeep();
        const cleanResi = extractCleanTrackingNumber(result.decodedText);
        setScannedResult(cleanResi);
        setTimeout(() => {
          onScan(cleanResi);
          onClose();
        }, 300);
      }
    } catch (err) {
      setCameraError(
        'Barcode / QR tidak terbaca pada foto. Pastikan foto resi jelas, tajam, dan pencahayaan terang.'
      );
    }
  };

  if (!isOpen) return null;

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      const cleanResi = extractCleanTrackingNumber(manualInput);
      onScan(cleanResi);
      setManualInput('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 dark:border-slate-800 transition-colors max-h-[95vh] sm:max-h-[90vh] flex flex-col">
        {/* Hidden element for file scanning */}
        <div id="temp-file-reader" className="hidden" />

        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 gap-2 shrink-0">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-xl shrink-0">
              <Camera className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-xs sm:text-sm truncate">{title}</h3>
              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate">
                Support Barcode Panjang (1D) & QR Kotak (2D)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="min-w-[40px] min-h-[40px] p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer flex items-center justify-center active:scale-95 shrink-0"
            aria-label="Tutup Scanner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Controls Bar (Switch Camera & Flashlight) */}
        {cameras.length > 1 && (
          <div className="px-4 sm:px-5 py-2 bg-slate-100/70 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-xs shrink-0">
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 min-w-0 truncate">
              <SwitchCamera className="w-3.5 h-3.5 shrink-0" />
              <span className="text-[11px] font-semibold truncate">Ganti Kamera:</span>
            </div>
            <select
              value={selectedCameraId}
              onChange={(e) => handleSwitchCamera(e.target.value)}
              className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[180px] truncate"
            >
              {cameras.map((cam, idx) => (
                <option key={cam.id} value={cam.id}>
                  {cam.label || `Lensa ${idx + 1}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Camera Viewport & Controls */}
        <div className="p-3.5 sm:p-5 space-y-3.5 sm:space-y-4 overflow-y-auto flex-1">
          <div className="relative w-full h-56 sm:h-64 bg-slate-950 rounded-2xl overflow-hidden flex flex-col items-center justify-center text-white shadow-inner">
            <div id="reader-container" className="w-full h-full min-h-[224px]" />

            {/* Target overlay guide (Wide rectangular aperture for 1D + 2D) */}
            <div className="absolute inset-x-4 inset-y-8 border-2 border-dashed border-emerald-400/90 rounded-2xl pointer-events-none flex flex-col items-center justify-between p-2">
              <div className="w-full flex items-center justify-between text-[9px] font-mono font-bold text-emerald-300 bg-black/60 px-2 py-0.5 rounded">
                <span>BARCODE 1D (PANJANG)</span>
                <span>QR 2D (KOTAK)</span>
              </div>

              {/* Pulsing Scan Line */}
              <div className="w-full h-0.5 bg-emerald-400 animate-pulse shadow-md shadow-emerald-400" />

              <span className="text-[9.5px] font-mono font-bold bg-black/70 px-2.5 py-0.5 rounded text-emerald-200 text-center">
                Arahkan resi paket ke dalam kotak ini
              </span>
            </div>

            {/* Flashlight button if supported */}
            {isTorchSupported && (
              <button
                type="button"
                onClick={handleToggleTorch}
                className={`absolute top-3 right-3 p-2 rounded-xl backdrop-blur-md transition shadow-md z-20 ${
                  isTorchOn
                    ? 'bg-amber-400 text-black'
                    : 'bg-black/60 text-white hover:bg-black/80'
                }`}
                title="Nyalakan / Matikan Lampu Flash"
              >
                <Flashlight className="w-4 h-4" />
              </button>
            )}

            {/* Scanned Success Preview Overlay */}
            {scannedResult && (
              <div className="absolute inset-0 bg-emerald-950/90 flex flex-col items-center justify-center p-6 text-center text-white z-30 animate-in fade-in zoom-in-95">
                <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center mb-2 shadow-lg">
                  <Check className="w-7 h-7 text-white stroke-[3]" />
                </div>
                <p className="font-extrabold text-sm text-emerald-200">Resi Kurir Terdeteksi!</p>
                <p className="font-mono font-black text-base text-white tracking-wider mt-1 bg-black/40 px-3 py-1 rounded-lg">
                  {scannedResult}
                </p>
              </div>
            )}

            {/* Camera Error Display */}
            {cameraError && (
              <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center text-xs text-slate-300 space-y-2 z-10">
                <AlertCircle className="w-8 h-8 text-amber-400" />
                <p className="font-bold text-amber-200">Akses Kamera Terkendala</p>
                <p className="text-slate-400 max-w-xs text-[11px] leading-relaxed">
                  {cameraError}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => startCamera(selectedCameraId || undefined)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold cursor-pointer border border-slate-700"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Coba Lagi
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    Unggah Foto Resi
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Upload Photo Option */}
          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-slate-500 dark:text-slate-400">Atau pilih gambar foto resi:</span>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[38px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-semibold text-xs border border-slate-200 dark:border-slate-700 transition cursor-pointer active:scale-95"
            >
              <ImageIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              Pilih Foto Resi
            </button>
          </div>

          {/* Manual Input Fallback */}
          <form
            onSubmit={handleManualSubmit}
            className="pt-3 border-t border-slate-100 dark:border-slate-800"
          >
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider text-[10px]">
              Atau Input Nomor Resi Kurir Manual (Sebagai Acuan)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Contoh: SPXID048192837 atau JP9812739121"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                className="flex-1 px-3.5 py-2.5 min-h-[42px] text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-mono"
              />
              <button
                type="submit"
                disabled={!manualInput.trim()}
                className="px-4 py-2.5 min-h-[42px] bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer active:scale-95"
              >
                <Check className="w-3.5 h-3.5" />
                Gunakan
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
