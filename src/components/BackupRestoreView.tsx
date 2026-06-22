import React, { useState, useRef } from "react";
import { 
  Database, 
  Download, 
  Upload, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw, 
  Info,
  Trash2,
  FileCheck
} from "lucide-react";
import { Pelanggan, Transaksi, TanggalPembayaran, BiayaTarif } from "../types";

interface BackupRestoreViewProps {
  pelangganList: Pelanggan[];
  transaksiList: Transaksi[];
  tanggalList: TanggalPembayaran[];
  biayaList: BiayaTarif[];
  onRestoreAllData: (backupData: {
    pelanggan: Pelanggan[];
    tanggal: TanggalPembayaran[];
    biaya: BiayaTarif[];
    transaksi: Transaksi[];
  }) => void;
  onClearAllData?: () => void;
  onResetToDefault?: () => void;
}

export default function BackupRestoreView({
  pelangganList,
  transaksiList,
  tanggalList,
  biayaList,
  onRestoreAllData,
  onClearAllData,
  onResetToDefault
}: BackupRestoreViewProps) {
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showStatus = (type: "success" | "error", text: string) => {
    setStatusMsg({ type, text });
    setTimeout(() => {
      setStatusMsg(null);
    }, 6000);
  };

  const handleExportBackup = () => {
    try {
      const backupData = {
        appName: "TagihanPay",
        version: "2.0",
        backupDate: new Date().toISOString(),
        metadata: {
          generatedBy: "System Backup Manager",
          environment: "Local Browser Storage (LocalStorage)"
        },
        counts: {
          pelanggan: pelangganList.length,
          transaksi: transaksiList.length,
          tanggal: tanggalList.length,
          biaya: biayaList.length
        },
        payload: {
          pelanggan: pelangganList,
          transaksi: transaksiList,
          tanggal: tanggalList,
          biaya: biayaList
        }
      };

      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      const dateStr = new Date().toISOString().split("T")[0];
      const timeStr = new Date().toLocaleTimeString("id", { hour: "2-digit", minute: "2-digit" }).replace(":", "-");
      
      link.href = url;
      link.download = `TagihanPay_MasterBackup_${dateStr}_${timeStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showStatus("success", `Backup berhasil diunduh! Menyimpan ${pelangganList.length} pelanggan & ${transaksiList.length} transaksi.`);
    } catch (err: any) {
      showStatus("error", `Gagal mengekstrak cadangan data: ${err.message}`);
    }
  };

  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const backupData = JSON.parse(text);

        // Robust parsing supporting legacy structure as well
        let restoredPelanggan = backupData.payload?.pelanggan || backupData.pelanggan;
        let restoredTransaksi = backupData.payload?.transaksi || backupData.transaksi;
        let restoredTanggal = backupData.payload?.tanggal || backupData.tanggal;
        let restoredBiaya = backupData.payload?.biaya || backupData.biaya;

        if (!restoredPelanggan && !restoredTransaksi && !restoredTanggal && !restoredBiaya) {
          throw new Error("File backup tidak valid. Data payload kosong atau format tidak sesuai standard.");
        }

        // Standardize safety arrays
        restoredPelanggan = Array.isArray(restoredPelanggan) ? restoredPelanggan : [];
        restoredTransaksi = Array.isArray(restoredTransaksi) ? restoredTransaksi : [];
        restoredTanggal = Array.isArray(restoredTanggal) ? restoredTanggal : [];
        restoredBiaya = Array.isArray(restoredBiaya) ? restoredBiaya : [];

        const msg = `⚠️ KONFIRMASI RESTORE DATA\n\nApakah Anda yakin ingin mengganti/menimpa database lokal dengan cadangan baru?\n\n` +
                    `Data baru yang akan diimpor:\n` +
                    `- ${restoredPelanggan.length} Pelanggan\n` +
                    `- ${restoredTransaksi.length} Transaksi Pembayaran\n` +
                    `- ${restoredTanggal.length} Jadwal Jatuh Tempo\n` +
                    `- ${restoredBiaya.length} Paket Tarif Biaya\n\n` +
                    `🚨 PERINGATAN: Semua data saat ini di browser Anda akan DIHAPUS & DIGANTI. Tindakan ini tidak dapat dibatalkan!`;

        if (window.confirm(msg)) {
          onRestoreAllData({
            pelanggan: restoredPelanggan,
            transaksi: restoredTransaksi,
            tanggal: restoredTanggal,
            biaya: restoredBiaya
          });

          showStatus("success", `Data berhasil dipulihkan secara instan! Mengimpor ${restoredPelanggan.length} pelanggan dan ${restoredTransaksi.length} transaksi.`);
          
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        } else {
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        }
      } catch (err: any) {
        showStatus("error", `Format file JSON tidak dapat diproses: ${err.message}`);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 text-slate-800 font-sans" id="backup-restore-app-view">
      
      {/* Title Header Section with Stats Card */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs" id="backup-hero-banner">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1 px-2 text-[10px] bg-indigo-50 text-indigo-700 font-mono font-bold uppercase rounded">Offline-First Engine</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] text-slate-400 font-mono font-medium">Database Aktif</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight font-sans">
            Pusat Backup & Pemulihan Manajemen Data
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed font-sans max-w-2xl">
            Semua data transaksi mesin kasir TagihanPay disimpan secara lokal pada hardisk browser Google Chrome/Edge Anda. Lakukan pencadangan secara berkala agar tidak kehilangan data jika Anda membersihkan cookie atau riwayat browser secara tidak sengaja.
          </p>
        </div>
        
        <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center gap-3 shrink-0 self-stretch sm:self-auto">
          <div className="p-2 bg-indigo-600 text-white rounded-xl shrink-0">
            <Database size={20} />
          </div>
          <div>
            <p className="text-[10px] text-indigo-805 font-bold uppercase tracking-wider font-mono">Status Storage</p>
            <p className="text-xs font-bold text-slate-805">Browser LocalStorage</p>
            <p className="text-[9px] text-indigo-600 font-mono">100% Menggunakan Memori Browser</p>
          </div>
        </div>
      </div>

      {statusMsg && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 text-xs animate-slideDown ${
          statusMsg.type === "success" 
            ? "bg-emerald-50 border-emerald-100 text-emerald-900" 
            : "bg-rose-50 border-rose-100 text-rose-900"
        }`}>
          {statusMsg.type === "success" ? (
            <CheckCircle size={18} className="text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle size={18} className="text-rose-600 shrink-0 mt-0.5" />
          )}
          <div>
            <p className="font-bold underline">{statusMsg.type === "success" ? "Berhasil" : "Error Terjadi"}</p>
            <p className="mt-0.5">{statusMsg.text}</p>
          </div>
        </div>
      )}

      {/* Main Core 2 Column grid for doing the actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="backup-actions-grid">
        
        {/* Card 1: EXPORT BACKUP */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <span className="p-1 px-2.5 rounded bg-indigo-50 text-indigo-700 text-[10px] font-mono font-bold uppercase tracking-wider">
                Bagian 1: Ekspor File
              </span>
              <span className="text-[10.5px] text-slate-400 font-mono">JSON Database Format</span>
            </div>
            
            <div className="space-y-1.5 text-left">
              <h3 className="text-sm font-black text-slate-800">Unduh Salinan Cadangan (.json)</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-sans">
                Tindakan ini akan mengumpulkan seluruh baris database Anda menjadi satu file `.json` yang terenkripsi dan dapat dibaca oleh sistem. File ini gratis digunakan kapan saja untuk pemindahan unit laptop atau recovery.
              </p>
            </div>

            {/* Live Database stats count */}
            <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl space-y-3">
              <p className="text-[10.5px] font-mono uppercase font-black text-slate-500 tracking-wider flex items-center gap-1.5">
                <FileCheck size={12} className="text-slate-400" /> Rincian Rekor Data Terkonten Saat Ini:
              </p>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                  <p className="text-[9px] text-slate-400 uppercase font-mono">Pelanggan</p>
                  <p className="text-sm font-black text-slate-800 font-mono">{pelangganList.length}</p>
                  <p className="text-[8px] text-slate-400 mt-0.5 font-mono">Baris data</p>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                  <p className="text-[9px] text-slate-400 uppercase font-mono">Transaksi</p>
                  <p className="text-sm font-black text-slate-800 font-mono">{transaksiList.length}</p>
                  <p className="text-[8px] text-slate-400 mt-0.5 font-mono">Arsip kwitansi</p>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                  <p className="text-[9px] text-slate-400 uppercase font-mono">Tempo</p>
                  <p className="text-sm font-black text-slate-800 font-mono">{tanggalList.length}</p>
                  <p className="text-[8px] text-slate-400 mt-0.5 font-mono">Batas bayar</p>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                  <p className="text-[9px] text-slate-400 uppercase font-mono">Biaya/Tarif</p>
                  <p className="text-sm font-black text-slate-800 font-mono">{biayaList.length}</p>
                  <p className="text-[8px] text-slate-400 mt-0.5 font-mono">Paket layanan</p>
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleExportBackup}
            className="w-full py-3 bg-indigo-600 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-650/10 flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Download size={14} /> Ekspor & Unduh Seluruh Data (.JSON)
          </button>
        </div>

        {/* Card 2: IMPORT & RESTORE BACKUP */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <span className="p-1 px-2.5 rounded bg-rose-50 text-rose-700 text-[10px] font-mono font-bold uppercase tracking-wider">
                Bagian 2: Impor & Pulihkan
              </span>
              <span className="text-[10px] text-rose-500 font-bold font-mono uppercase">Hapus & Timpa</span>
            </div>

            <div className="space-y-1.5 text-left">
              <h3 className="text-sm font-black text-slate-800">Unggah File Backup & Overwrite</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-sans">
                Kembalikan data dari berkas `.json` salinan cadangan TagihanPay yang Anda miliki. Mengunggah file ini akan langsung membersihkan seluruh database aktif dan menyuntikkan data baru berdasarkan file cadangan tersebut.
              </p>
            </div>

            {/* Drag n drop styled selector */}
            <div className="relative border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-2xl bg-slate-50/50 hover:bg-indigo-50/5 p-6 py-8 transition text-center cursor-pointer flex flex-col items-center justify-center min-h-[140px]">
              <input
                type="file"
                accept=".json"
                ref={fileInputRef}
                onChange={handleRestoreBackup}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                title="Pilih file backup json"
              />
              <div className="p-3 bg-slate-100 text-slate-500 rounded-full shrink-0 mb-3">
                <Upload size={18} className="text-indigo-600 animate-bounce" />
              </div>
              <p className="text-xs font-bold text-indigo-700 font-sans">Klik disini untuk memuat file backup JSON</p>
              <p className="text-[10px] text-slate-400 font-mono mt-1">Hanya mendukung tipe format database .json TagihanPay resmi</p>
            </div>
          </div>

          <div className="text-[10px] text-slate-450 italic leading-normal text-center">
            Proses verifikasi struktur rekor data dijalankan otomatis sesaat setelah Anda memilih file cadangan Anda.
          </div>
        </div>

      </div>

      {/* Safety Instructions Warnings cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="backup-instructions-panels">
        
        <div className="bg-amber-50 border border-amber-100 p-4.5 rounded-2xl text-xs text-amber-900 flex items-start gap-3">
          <Info size={16} className="text-amber-600 shrink-0 mt-0.5 animate-pulse" />
          <div className="space-y-1">
            <h4 className="font-bold font-sans">Kapan Harus Melakukan Backup?</h4>
            <ul className="list-disc pl-4 text-[11px] text-amber-850 space-y-1">
              <li>Sebelum melakukan pembersihan history / cookies browser Google Chrome Anda.</li>
              <li>Saat ingin memindahkan operasional kasir dari Komputer A ke Komputer B secara portabel.</li>
              <li>Ketika Anda ingin melakukan simulasi data transaksi tanpa takut kehilangan rekor lama.</li>
            </ul>
          </div>
        </div>

        <div className="bg-indigo-50 border border-indigo-100 p-4.5 rounded-2xl text-xs text-indigo-900 flex items-start gap-3">
          <Info size={16} className="text-indigo-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold font-sans">Format dan Keamanan Dokumen</h4>
            <p className="text-[11px] text-indigo-850 leading-relaxed font-sans">
              Berkas cadangan disimpan dalam bentuk text JSON standard tanpa kata sandi eksternal. Kami merekomendasikan menyimpan file backup di folder yang aman di Google Drive Anda atau Flaskdisk kasir yang tidak diakses oleh publik demi privasi data pelanggan Anda.
            </p>
          </div>
        </div>

      </div>

      {/* System Quick Reset links direct (Under safety guidelines only for administrators) */}
      {(onClearAllData || onResetToDefault) && (
        <div className="bg-rose-50 border border-rose-100 p-5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs text-rose-950 font-sans mt-2" id="quick-backup-danger-zone">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-rose-800">
              <AlertTriangle size={14} className="text-rose-600" />
              <span>Opsi Tambahan: Penyetelan Ulang Database</span>
            </div>
            <p className="text-[11.5px] text-rose-700 leading-relaxed max-w-xl">
              Butuh membersihkan semua data transaksi loket untuk tahun buku baru? Anda dapat meriset seluruh rekor transaksi saat ini atau memuat sampel simulasi awal kembali.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2 w-full md:w-auto shrink-0">
            {onResetToDefault && (
              <button
                type="button"
                onClick={onResetToDefault}
                className="px-4 py-2 text-[11px] font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer shadow-xs flex items-center gap-1"
              >
                <RefreshCw size={12} /> Muat Ulang Data Sampel
              </button>
            )}
            {onClearAllData && (
              <button
                type="button"
                onClick={onClearAllData}
                className="px-4 py-2 text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition cursor-pointer shadow-md shadow-rose-600/10 flex items-center gap-1"
              >
                <Trash2 size={12} /> Bersihkan Semua Data
              </button>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
