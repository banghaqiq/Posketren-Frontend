'use client';
import React, { useState, useEffect } from 'react';
import { Printer, X, Scissors, Layers, CheckCircle2, RefreshCw } from 'lucide-react';
import { PackageItem } from '../types';
import { printerApi } from '../lib/api';
import QRCode from 'qrcode';

interface LabelPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  pkg: PackageItem | null;
}

export type PaperPreset = 'td110d' | 'a6';

/**
 * Generates pure self-contained HTML for Blueprint TD110D (100mm x 150mm) & A6 (105mm x 148mm).
 * Contains both Resi Atas and Resi Bawah with middle cutting line.
 * Guaranteed zero overflow and strictly 1 page on Blueprint TD110D thermal heads.
 */
export const generateA6PrintHtml = (
  pkg: PackageItem,
  qrDataUrl: string,
  paperPreset: PaperPreset = 'td110d'
): string => {
  const isTD110D = paperPreset === 'td110d';
  const pageWidth = isTD110D ? '100mm' : '105mm';
  const pageHeight = isTD110D ? '150mm' : '148mm';
  const labelHeight = isTD110D ? '64.5mm' : '64mm';
  const titleDoc = isTD110D ? `TD110D_RESI_${pkg.id || 'PKG'}` : `A6_RESI_${pkg.id || 'PKG'}`;

  const recipientName = (pkg.recipientName || 'Santri').toUpperCase();
  const isPengasuhOrAnonim =
    (pkg.recipientName || '').includes('Keluarga Pengasuh') || pkg.recipientId === 'ANONIM';
  const asrama = isPengasuhOrAnonim ? '-' : (pkg.asrama || '-');
  const wilayah = isPengasuhOrAnonim ? 'Keluarga Pengasuh' : (pkg.wilayah || 'Pos Paket');
  const dateStr = pkg.dateReceived || new Date().toISOString().slice(0, 10);
  const timeStr = pkg.arrivalTime ? `${pkg.arrivalTime}` : '';
  const posId = pkg.id || 'PKG-NJ';

  const renderSingleLabelHtml = (
    copyType: 'PENERIMA / PAKET' | 'ARSIP POS / SERAH TERIMA'
  ) => `
    <div class="label-box">
      <!-- 1. Header (Full text on white background) -->
      <div class="header">
        <div class="header-brand">
          <div class="brand-title">POSKETREN NURUL JADID</div>
          <div class="brand-sub">Paiton Probolinggo Jawa Timur</div>
        </div>

        <div class="header-right">
          <span class="copy-badge">${copyType}</span>
        </div>
      </div>

      <!-- 2. Body Details (Only: nama, asrama, wilayah, jam & tgl masuk, resi barang) -->
      <div class="body">
        <div class="info-col">
          <div class="info-row name-row">
            <span class="row-label">Nama:</span>
            <span class="row-val-name">${recipientName}</span>
          </div>

          <div class="info-row">
            <span class="row-label">Asrama:</span>
            <span class="row-val">${asrama}</span>
          </div>

          <div class="info-row">
            <span class="row-label">Wilayah:</span>
            <span class="row-val">${wilayah}</span>
          </div>

          <div class="info-row">
            <span class="row-label">Masuk:</span>
            <span class="row-val">${dateStr}${timeStr ? ' • Jam ' + timeStr : ''}</span>
          </div>

          <div class="info-row resi-row">
            <span class="row-label">Resi Barang:</span>
            <span class="row-val-resi">${posId}</span>
          </div>
        </div>

        <!-- QR Column (Pure text & QR only, no dark blocks) -->
        <div class="qr-col">
          ${
            qrDataUrl
              ? `<img src="${qrDataUrl}" alt="QR" class="qr-image" />`
              : `<div class="qr-placeholder">QR CODE</div>`
          }
          <div class="qr-pos-id">${posId}</div>
        </div>
      </div>

      <!-- 3. Footer (Regular weight: 400) -->
      <div class="footer">
        ${
          copyType === 'PENERIMA / PAKET'
            ? `<span>Wajib diambil di Pos Paket • Simpan resi ini dengan baik</span>
               <span class="footer-pos">POSKETREN NJ</span>`
            : `<span>Tanda Tangan Santri: ________________</span>
               <span>Paraf Petugas: ____________</span>`
        }
      </div>
    </div>
  `;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${titleDoc}</title>
  <style>
    @page {
      size: ${pageWidth} ${pageHeight} portrait;
      margin: 0mm !important;
    }
    @media print {
      @page {
        size: ${pageWidth} ${pageHeight} portrait;
        margin: 0mm !important;
      }
      html, body {
        width: 100% !important;
        height: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
        background: #ffffff !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .sheet-container {
        width: ${pageWidth} !important;
        height: ${pageHeight} !important;
        max-height: ${pageHeight} !important;
        page-break-after: avoid !important;
        break-after: avoid !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        margin: 0 auto !important;
      }
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #ffffff !important;
      color: #000000 !important;
      font-family: Arial, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-weight: 400;
    }
    .sheet-container {
      width: ${pageWidth};
      height: ${pageHeight};
      max-height: ${pageHeight};
      padding: 2mm 2.5mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-sizing: border-box;
      overflow: hidden;
      page-break-after: avoid;
      break-after: avoid;
      margin: 0 auto;
      background: #ffffff;
    }
    .label-box {
      width: 100%;
      height: ${labelHeight};
      max-height: ${labelHeight};
      border: 1px solid #000000;
      padding: 2.2mm 2.8mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-sizing: border-box;
      overflow: hidden;
      background: #ffffff !important;
      color: #000000 !important;
      font-weight: 400;
    }
    .header {
      border-bottom: 1px solid #000000;
      padding-bottom: 1.5mm;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      line-height: 1.2;
    }
    .header-brand {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }
    .brand-title {
      font-size: 10.5px;
      font-weight: 400;
      letter-spacing: 0.3px;
      text-transform: uppercase;
      line-height: 1.1;
      color: #000000;
    }
    .brand-sub {
      font-size: 7px;
      font-weight: 400;
      text-transform: uppercase;
      line-height: 1.1;
      color: #000000;
    }
    .header-right {
      text-align: right;
      flex-shrink: 0;
    }
    .copy-badge {
      font-size: 7.5px;
      font-weight: 400;
      text-transform: uppercase;
      border: 1px solid #000000;
      padding: 1px 4px;
      display: inline-block;
      line-height: 1.1;
      background: #ffffff !important;
      color: #000000 !important;
    }
    .body {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 6px;
      flex: 1;
      margin: 1.5mm 0;
      overflow: hidden;
    }
    .info-col {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
      justify-content: center;
    }
    .info-row {
      display: flex;
      align-items: baseline;
      gap: 4px;
      font-size: 8.5px;
      line-height: 1.35;
      font-weight: 400;
      color: #000000;
    }
    .name-row {
      margin-bottom: 1px;
    }
    .row-label {
      font-size: 8px;
      font-weight: 400;
      width: 58px;
      flex-shrink: 0;
      color: #000000;
    }
    .row-val {
      font-size: 8.5px;
      font-weight: 400;
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: #000000;
    }
    .row-val-name {
      font-size: 11.5px;
      font-weight: 600; /* SATU-SATUNYA semi-bold */
      text-transform: uppercase;
      line-height: 1.2;
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: #000000;
    }
    .resi-row {
      border-top: 1px dashed #000000;
      padding-top: 1.5px;
      margin-top: 1px;
    }
    .row-val-resi {
      font-family: monospace;
      font-size: 9px;
      font-weight: 400;
      color: #000000;
    }
    .qr-col {
      width: 28mm;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
    }
    .qr-image {
      width: 24mm;
      height: 24mm;
      border: 1px solid #000000;
      image-rendering: -webkit-optimize-contrast;
      image-rendering: pixelated;
      image-rendering: crisp-edges;
      display: block;
      background: #ffffff;
    }
    .qr-placeholder {
      width: 24mm;
      height: 24mm;
      border: 1px solid #000000;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 7.5px;
      font-weight: 400;
      background: #ffffff;
      color: #000000;
    }
    .qr-pos-id {
      font-family: monospace;
      font-size: 8px;
      font-weight: 400;
      text-align: center;
      width: 100%;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-top: 1.5px;
      line-height: 1.1;
      color: #000000;
    }
    .footer {
      border-top: 1px solid #000000;
      padding-top: 1.2mm;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 7px;
      font-weight: 400;
      line-height: 1.2;
      color: #000000;
    }
    .footer-pos {
      font-family: monospace;
      font-size: 7px;
      font-weight: 400;
    }
    .cutting-line {
      height: 3.5mm;
      border-top: 1px dashed #000000;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-family: monospace;
      font-size: 7px;
      font-weight: 400;
      text-transform: uppercase;
      padding: 0 4px;
      box-sizing: border-box;
      margin: 0.5mm 0;
      color: #000000;
    }
    .truncate {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  </style>
</head>
<body>
  <div class="sheet-container">
    <!-- Top Receipt: Lembar Penerima / Paket -->
    ${renderSingleLabelHtml('PENERIMA / PAKET')}

    <!-- Middle Cutting Line -->
    <div class="cutting-line">
      <span>✂ POTONG DI SINI</span>
      <span>- - - - - - - - - - - - - - - - - - - - - - - - - - -</span>
      <span>✂ POTONG DI SINI</span>
    </div>

    <!-- Bottom Receipt: Lembar Arsip Pos & Serah Terima -->
    ${renderSingleLabelHtml('ARSIP POS / SERAH TERIMA')}
  </div>
</body>
</html>`;
};

/**
 * Direct thermal printer helper for Blueprint TD110D (100mm x 150mm) and A6 (105mm x 148mm).
 * Can be called programmatically immediately after package registration.
 */
export const printA6ThermalLabel = async (
  pkg: PackageItem,
  paperPreset: PaperPreset = 'td110d'
): Promise<boolean> => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;

  return new Promise((resolve) => {
    try {
      const qrText = pkg.id || pkg.trackingNumber;
      QRCode.toDataURL(qrText, {
        width: 320,
        margin: 1,
        errorCorrectionLevel: 'M',
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      })
        .then((qrDataUrl) => {
          // Remove any existing print frame
          const existingFrame = document.getElementById('posketren-thermal-print-frame');
          if (existingFrame && document.body.contains(existingFrame)) {
            document.body.removeChild(existingFrame);
          }

          // Create isolated invisible iframe
          const iframe = document.createElement('iframe');
          iframe.id = 'posketren-thermal-print-frame';
          iframe.style.position = 'fixed';
          iframe.style.right = '0';
          iframe.style.bottom = '0';
          iframe.style.width = '0';
          iframe.style.height = '0';
          iframe.style.border = '0';
          iframe.style.visibility = 'hidden';
          document.body.appendChild(iframe);

          const doc = iframe.contentWindow?.document;
          if (!doc) {
            window.print();
            resolve(true);
            return;
          }

          doc.open();
          doc.write(generateA6PrintHtml(pkg, qrDataUrl, paperPreset));
          doc.close();

          setTimeout(() => {
            try {
              iframe.contentWindow?.focus();
              iframe.contentWindow?.print();
              resolve(true);
            } catch (err) {
              console.error('Print iframe error:', err);
              window.print();
              resolve(false);
            } finally {
              setTimeout(() => {
                if (document.body.contains(iframe)) {
                  document.body.removeChild(iframe);
                }
              }, 2500);
            }
          }, 350);
        })
        .catch((err) => {
          console.error('Failed to generate thermal QR code:', err);
          resolve(false);
        });
    } catch (err) {
      console.error('printA6ThermalLabel error:', err);
      resolve(false);
    }
  });
};

export const LabelPrintModal: React.FC<LabelPrintModalProps> = ({ isOpen, onClose, pkg }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isPrinting, setIsPrinting] = useState(false);
  const [paperPreset, setPaperPreset] = useState<PaperPreset>('td110d');
  const [printerStatus, setPrinterStatus] = useState<{
    connected: boolean;
    name: string;
    port: string;
    isDefault: boolean;
    driverName?: string;
    message?: string;
  } | null>(null);
  const [isTestingPrint, setIsTestingPrint] = useState(false);

  const fetchPrinterStatus = () => {
    printerApi.getStatus().then(setPrinterStatus).catch(console.error);
  };

  useEffect(() => {
    if (isOpen) {
      fetchPrinterStatus();
    }
  }, [isOpen]);

  const handleDirectTestPrint = async () => {
    setIsTestingPrint(true);
    try {
      const res = await printerApi.testPrint();
      alert(res.message);
    } catch (err: any) {
      alert('Gagal mengirim perintah cetak: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsTestingPrint(false);
    }
  };

  useEffect(() => {
    if (pkg) {
      // Encode Posketren internal ID as primary ("resi dari saya"), with courier tracking number as reference
      const qrText = pkg.id || pkg.trackingNumber;
      QRCode.toDataURL(qrText, {
        width: 320,
        margin: 1,
        errorCorrectionLevel: 'M',
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => {
          console.error('Failed to generate thermal QR code', err);
        });
    }
  }, [pkg]);

  if (!isOpen || !pkg) return null;

  /**
   * Dedicated isolated iframe printer.
   * Guarantees 100% strict 1-page output for Blueprint TD110D with zero Next.js document bloat.
   */
  const handlePrint = () => {
    setIsPrinting(true);
    printA6ThermalLabel(pkg, paperPreset).finally(() => {
      setIsPrinting(false);
    });
  };

  const isJastip = pkg.type === 'jastip';
  const isTD110D = paperPreset === 'td110d';

  // Sub-component for individual on-screen preview label (Pure text, no solid black badges, regular font, recipient name semi-bold)
  const PreviewSingleLabel = ({
    copyType,
  }: {
    copyType: 'PENERIMA / PAKET' | 'ARSIP POS / SERAH TERIMA';
  }) => {
    const isPengasuhOrAnonim =
      (pkg.recipientName || '').includes('Keluarga Pengasuh') || pkg.recipientId === 'ANONIM';
    const asrama = isPengasuhOrAnonim ? '-' : (pkg.asrama || '-');
    const wilayah = isPengasuhOrAnonim ? 'Keluarga Pengasuh' : (pkg.wilayah || 'Pos Paket');
    const dateStr = pkg.dateReceived || '-';
    const timeStr = pkg.arrivalTime ? ` Jam ${pkg.arrivalTime}` : '';
    const posId = pkg.id || 'PKG-NJ';

    return (
      <div
        className="bg-white text-black border border-black rounded-none px-3 py-2 flex flex-col justify-between box-border overflow-hidden select-none font-normal"
        style={{
          width: '100%',
          height: isTD110D ? '64.5mm' : '64mm',
          maxHeight: isTD110D ? '64.5mm' : '64mm',
          boxSizing: 'border-box',
          color: '#000000',
          backgroundColor: '#ffffff',
          fontWeight: 400,
        }}
      >
        {/* 1. Header (Full text on white background) */}
        <div className="border-b border-black pb-1 flex items-start justify-between leading-tight">
          <div>
            <h2 className="text-[10.5px] font-normal tracking-wide uppercase leading-none text-black">
              POSKETREN NURUL JADID
            </h2>
            <p className="text-[7px] font-normal text-black tracking-tight leading-tight mt-0.5 uppercase">
              Paiton Probolinggo Jawa Timur
            </p>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[7.5px] font-normal uppercase px-1.5 py-0.5 border border-black bg-white text-black inline-block leading-none">
              {copyType}
            </span>
          </div>
        </div>

        {/* 2. Body Details (Only: nama, asrama, wilayah, jam & tgl masuk, resi barang) */}
        <div className="flex items-center justify-between gap-2 my-1 flex-1">
          <div className="flex-1 min-w-0 space-y-1 text-black font-normal">
            <div className="flex items-baseline gap-1.5 leading-tight">
              <span className="text-[8px] font-normal text-black w-14 shrink-0">
                Nama:
              </span>
              <div className="text-[11.5px] font-semibold text-black leading-tight uppercase truncate flex-1">
                {pkg.recipientName}
              </div>
            </div>

            <div className="flex items-baseline gap-1.5 leading-tight text-[8.5px]">
              <span className="text-[8px] font-normal text-black w-14 shrink-0">
                Asrama:
              </span>
              <span className="text-black font-normal truncate flex-1">
                {asrama}
              </span>
            </div>

            <div className="flex items-baseline gap-1.5 leading-tight text-[8.5px]">
              <span className="text-[8px] font-normal text-black w-14 shrink-0">
                Wilayah:
              </span>
              <span className="text-black font-normal truncate flex-1">
                {wilayah}
              </span>
            </div>

            <div className="flex items-baseline gap-1.5 leading-tight text-[8.5px]">
              <span className="text-[8px] font-normal text-black w-14 shrink-0">
                Masuk:
              </span>
              <span className="text-black font-normal truncate flex-1">
                {dateStr}{timeStr ? ` • ${timeStr}` : ''}
              </span>
            </div>

            <div className="flex items-baseline gap-1.5 leading-tight text-[8.5px] pt-1 border-t border-dashed border-black">
              <span className="text-[8px] font-normal text-black w-14 shrink-0">
                Resi Barang:
              </span>
              <span className="font-mono text-[9px] font-normal text-black truncate flex-1">
                {posId}
              </span>
            </div>
          </div>

          {/* QR Column (No black badges, posId only) */}
          <div className="flex flex-col items-center justify-center shrink-0 w-[28mm] box-border">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="QR Code Resi"
                className="w-[24mm] h-[24mm] object-contain block border border-black bg-white"
                style={{
                  imageRendering: 'pixelated',
                  display: 'block',
                }}
              />
            ) : (
              <div className="w-[24mm] h-[24mm] bg-white text-black flex items-center justify-center text-[7.5px] font-normal border border-black">
                QR CODE
              </div>
            )}
            <div className="w-full text-center mt-1">
              <div className="font-mono text-[8px] font-normal tracking-tight text-black leading-none truncate max-w-full">
                {posId}
              </div>
            </div>
          </div>
        </div>

        {/* 3. Footer (Regular weight: 400) */}
        <div className="border-t border-black pt-1 flex items-center justify-between text-[7px] font-normal text-black leading-none">
          {copyType === 'PENERIMA / PAKET' ? (
            <>
              <span className="truncate">Wajib diambil di Pos Paket • Simpan resi ini dengan baik</span>
              <span className="font-mono shrink-0 pl-1 font-normal">POSKETREN NJ</span>
            </>
          ) : (
            <>
              <span>Tanda Tangan Santri: ________________</span>
              <span>Paraf Petugas: ____________</span>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 dark:border-slate-800 max-h-[95vh] sm:max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-3.5 sm:px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 gap-2">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-xl shrink-0">
              <Printer className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-slate-800 dark:text-white text-xs sm:text-sm truncate">
                Cetak Resi Thermal (Blueprint TD110D / A6)
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                {isTD110D ? 'Blueprint TD110D (100 × 150 mm)' : 'Kertas A6 (105 × 148 mm)'} • 1 Lembar Isi 2 Resi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={handlePrint}
              disabled={isPrinting}
              className="hidden sm:inline-flex px-3.5 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition items-center gap-1.5 shadow-sm cursor-pointer min-h-[40px] active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>{isPrinting ? 'Menyiapkan...' : isTD110D ? 'Cetak ke Blueprint TD110D' : 'Cetak 1 Lembar A6'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-w-[40px] min-h-[40px] p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer flex items-center justify-center active:scale-95"
              aria-label="Tutup Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Hardware Connection Banner */}
        <div className="px-3.5 sm:px-5 py-2.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-2 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <span
              className={`w-3 h-3 rounded-full shrink-0 ${
                printerStatus?.connected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <div>
              <div className="text-xs font-black flex items-center gap-1.5 flex-wrap">
                <span>Hardware Printer:</span>
                <span className="text-emerald-400">{printerStatus?.name || 'Blueprint BP-TD110D'}</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 text-slate-300 font-mono rounded">
                  Port: {printerStatus?.port || 'USB001'}
                </span>
                {printerStatus?.isDefault && (
                  <span className="text-[9px] bg-emerald-950 text-emerald-300 border border-emerald-700 px-1.5 py-0.2 rounded font-black">
                    DEFAULT PRINTER WINDOWS
                  </span>
                )}
              </div>
              <div className="text-[10px] text-slate-400">
                Status: <span className="text-white font-bold">{printerStatus?.connected ? 'Terhubung & Aktif Normal' : 'Memeriksa status...'}</span> • Resolusi: 203 DPI
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDirectTestPrint}
            disabled={isTestingPrint}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95 shrink-0"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{isTestingPrint ? 'Menguji Cetak...' : 'Uji Cetak Mesin Sekarang'}</span>
          </button>
        </div>

        {/* Paper Preset Switcher */}
        <div className="px-3.5 sm:px-5 py-2 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Format Kertas:</span>
            <div className="inline-flex rounded-xl bg-white dark:bg-slate-900 p-0.5 border border-slate-200 dark:border-slate-700 shadow-xs">
              <button
                type="button"
                onClick={() => setPaperPreset('td110d')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                  paperPreset === 'td110d'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Blueprint TD110D (100×150 mm)
              </button>
              <button
                type="button"
                onClick={() => setPaperPreset('a6')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                  paperPreset === 'a6'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Kertas A6 (105×148 mm)
              </button>
            </div>
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
            Direct Thermal • 203 DPI
          </span>
        </div>

        {/* Info Banner with TD110D Tips */}
        <div className="px-3.5 sm:px-5 py-2.5 bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-800/60 flex items-start sm:items-center gap-2.5 text-xs text-emerald-900 dark:text-emerald-300">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5 sm:mt-0" />
          <div className="text-[11px] leading-tight">
            <div className="font-extrabold flex items-center gap-1.5">
              <span>Support Penuh Blueprint TD110D (Preset Aktif: {isTD110D ? '100 × 150 mm Stiker Resi' : '105 × 148 mm A6'})</span>
            </div>
            <div className="text-emerald-700 dark:text-emerald-400 text-[10px] mt-0.5">
              Tips Cetak Chrome/Windows: Pilih printer <strong>Blueprint TD110D</strong> • Margin: <strong>None (Tidak ada)</strong> • Skala: <strong>100%</strong>. Format 1 lembar isi 2 resi otomatis tanpa keluar lembar kosong.
            </div>
          </div>
        </div>

        {/* Modal Body: Exact Blueprint TD110D Visual Preview with Scroll & Scale safety */}
        <div className="p-2 sm:p-4 md:p-6 overflow-y-auto flex-1 flex flex-col items-center justify-start bg-slate-200/60 dark:bg-slate-950">
          <p className="text-[10px] sm:text-[11px] text-slate-600 dark:text-slate-400 mb-2 text-center font-medium">
            Pratinjau {isTD110D ? 'Stiker Blueprint TD110D (100 × 150 mm)' : 'Kertas A6 (105 × 148 mm)'}: 1 Lembar Berisi 2 Resi (Atas & Bawah)
          </p>

          {/* Horizontal scroll container for narrow devices */}
          <div className="w-full max-w-full overflow-x-auto flex justify-center py-1">
            <div
              className="bg-white text-black border border-black shadow-xl rounded-none flex flex-col justify-between shrink-0"
              style={{
                width: isTD110D ? '100mm' : '105mm',
                height: isTD110D ? '150mm' : '148mm',
                maxHeight: isTD110D ? '150mm' : '148mm',
                padding: '2mm 2.5mm',
                boxSizing: 'border-box',
                color: '#000000',
                backgroundColor: '#ffffff',
              }}
            >
              {/* Top Receipt: Penerima / Paket (64.5mm) */}
              <PreviewSingleLabel copyType="PENERIMA / PAKET" />

              {/* Middle Perforated Line (3.5mm) */}
              <div
                className="w-full flex items-center justify-between border-t border-dashed border-black px-1 text-[7px] font-mono font-normal text-black uppercase select-none my-0.5"
                style={{
                  height: '3.5mm',
                  boxSizing: 'border-box',
                }}
              >
                <span className="flex items-center gap-0.5 font-normal">
                  <Scissors className="w-2 h-2 inline" /> POTONG DI SINI
                </span>
                <span>- - - - - - - - - - - - - - - - - - - - - - - - - - -</span>
                <span className="flex items-center gap-0.5 font-normal">
                  <Scissors className="w-2 h-2 inline" /> POTONG DI SINI
                </span>
              </div>

              {/* Bottom Receipt: Arsip Pos & Serah Terima (64.5mm) */}
              <PreviewSingleLabel copyType="ARSIP POS / SERAH TERIMA" />
            </div>
          </div>
        </div>

        {/* Mobile-Only Bottom Sticky Action Bar */}
        <div className="sm:hidden p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            disabled={isPrinting}
            className="flex-1 min-h-[44px] py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-98"
          >
            <Printer className="w-4 h-4" />
            <span>{isPrinting ? 'Menyiapkan Cetak...' : isTD110D ? 'Cetak ke Blueprint TD110D' : 'Cetak 1 Lembar A6'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
