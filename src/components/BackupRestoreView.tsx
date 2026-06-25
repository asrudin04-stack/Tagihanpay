import React, { useState, useRef, useEffect } from "react";
import { 
  Database, 
  Download, 
  Upload, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw, 
  Info,
  Trash2,
  FileCheck,
  Cloud,
  CloudUpload,
  CloudDownload,
  Loader2,
  Lock,
  ExternalLink,
  Check
} from "lucide-react";
import { Pelanggan, Transaksi, TanggalPembayaran, BiayaTarif } from "../types";
import { 
  initAuth, 
  googleSignIn, 
  getAccessToken,
  backupDataToDrive,
  listDriveBackups,
  downloadDriveBackup,
  deleteDriveBackup
} from "../lib/googleSheets";

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
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cloud Backups integration states
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isProcessingCloud, setIsProcessingCloud] = useState(false);
  const [driveBackups, setDriveBackups] = useState<any[]>([]);

  // Monitor Auth State for Cloud integration
  useEffect(() => {
    const unsub = initAuth(
      (user, retrievedToken) => {
        setIsAuthenticated(true);
        setUserEmail(user.email);
        setDisplayName(user.displayName);
        setToken(retrievedToken);
        setIsLoadingAuth(false);
      },
      () => {
        setIsAuthenticated(false);
        setUserEmail(null);
        setDisplayName(null);
        setToken(null);
        setIsLoadingAuth(false);
      }
    );
    return () => unsub();
  }, []);

  // Fetch backups from Google Drive once authenticated
  useEffect(() => {
    if (isAuthenticated && token) {
      loadCloudBackups(token);
    } else {
      setDriveBackups([]);
    }
  }, [isAuthenticated, token]);

  const loadCloudBackups = async (activeToken: string) => {
    try {
      setIsProcessingCloud(true);
      const backups = await listDriveBackups(activeToken);
      setDriveBackups(backups);
    } catch (err: any) {
      console.error("Gagal memuat list backup dari cloud: ", err);
    } finally {
      setIsProcessingCloud(false);
    }
  };

  const handleLoginGoogle = async () => {
    setIsProcessingCloud(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setIsAuthenticated(true);
        setUserEmail(res.user.email);
        setDisplayName(res.user.displayName);
        setToken(res.accessToken);
        showStatus("success", "Berhasil terhubung dengan Google Drive!");
        loadCloudBackups(res.accessToken);
      }
    } catch (err: any) {
      showStatus("error", "Gagal otorisasi Google: " + err.message);
    } finally {
      setIsProcessingCloud(false);
    }
  };

  const handleCloudBackup = async () => {
    const activeToken = token || getAccessToken();
    if (!activeToken) {
      showStatus("error", "Silakan login Google Drive terlebih dahulu.");
      return;
    }

    setIsProcessingCloud(true);
    try {
      const backupData = {
        appName: "TagihanPay",
        version: "2.0",
        backupDate: new Date().toISOString(),
        metadata: {
          generatedBy: "System Cloud Backup Manager",
          environment: "Cloud Google Drive Integration"
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

      const dateStr = new Date().toISOString().split("T")[0];
      const timeStr = new Date().toLocaleTimeString("id", { hour: "2-digit", minute: "2-digit" }).replace(/:/g, "-");
      const cloudFileName = `TagihanPay_CloudBackup_${dateStr}_${timeStr}.json`;

      await backupDataToDrive(activeToken, backupData, cloudFileName);
      showStatus("success", "Backup database berhasil diunggah ke Google Drive!");
      await loadCloudBackups(activeToken);
    } catch (err: any) {
      showStatus("error", "Gagal mencadangkan data ke cloud: " + err.message);
    } finally {
      setIsProcessingCloud(false);
    }
  };

  const handleCloudRestore = async (fileId: string, fileName: string) => {
    const activeToken = token || getAccessToken();
    if (!activeToken) {
      showStatus("error", "Silakan login Google Drive terlebih dahulu.");
      return;
    }

    const confirmRestore = window.confirm(
      `⚠️ KONFIRMASI RESTORE CLOUD\n\nApakah Anda yakin ingin memulihkan cadangan dari berkas "${fileName}"?\n\n` +
      `🚨 PERINGATAN: Semua data aktif saat ini di browser akan DIHAPUS & DIGANTI dengan data cadangan cloud ini. Perubahan tidak dapat dibatalkan!`
    );
    if (!confirmRestore) return;

    setIsProcessingCloud(true);
    try {
      const backupData = await downloadDriveBackup(activeToken, fileId);
      
      // Parse & validate backup
      let restoredPelanggan = backupData.payload?.pelanggan || backupData.pelanggan;
      let restoredTransaksi = backupData.payload?.transaksi || backupData.transaksi;
      let restoredTanggal = backupData.payload?.tanggal || backupData.tanggal;
      let restoredBiaya = backupData.payload?.biaya || backupData.biaya;

      if (!restoredPelanggan && !restoredTransaksi && !restoredTanggal && !restoredBiaya) {
        throw new Error("Format cadangan awan tidak valid atau kosong.");
      }

      restoredPelanggan = Array.isArray(restoredPelanggan) ? restoredPelanggan : [];
      restoredTransaksi = Array.isArray(restoredTransaksi) ? restoredTransaksi : [];
      restoredTanggal = Array.isArray(restoredTanggal) ? restoredTanggal : [];
      restoredBiaya = Array.isArray(restoredBiaya) ? restoredBiaya : [];

      onRestoreAllData({
        pelanggan: restoredPelanggan,
        transaksi: restoredTransaksi,
        tanggal: restoredTanggal,
        biaya: restoredBiaya
      });

      showStatus("success", `Restorasi cloud sukses! Memulihkan ${restoredPelanggan.length} pelanggan & ${restoredTransaksi.length} transaksi.`);
    } catch (err: any) {
      showStatus("error", "Gagal mengunduh/memulihkan cadangan dari cloud: " + err.message);
    } finally {
      setIsProcessingCloud(false);
    }
  };

  const handleCloudDelete = async (fileId: string, fileName: string) => {
    const activeToken = token || getAccessToken();
    if (!activeToken) return;

    const confirmDelete = window.confirm(`Apakah Anda yakin ingin menghapus file cadangan "${fileName}" dari Google Drive Anda?`);
    if (!confirmDelete) return;

    setIsProcessingCloud(true);
    try {
      await deleteDriveBackup(activeToken, fileId);
      showStatus("success", "File cadangan di Google Drive berhasil dihapus!");
      await loadCloudBackups(activeToken);
    } catch (err: any) {
      showStatus("error", "Gagal menghapus berkas di cloud: " + err.message);
    } finally {
      setIsProcessingCloud(false);
    }
  };

  const showStatus = (type: "success" | "error" | "info", text: string) => {
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
            : statusMsg.type === "error"
              ? "bg-rose-50 border-rose-100 text-rose-900"
              : "bg-blue-50 border-blue-100 text-blue-900"
        }`}>
          {statusMsg.type === "success" ? (
            <CheckCircle size={18} className="text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle size={18} className="text-rose-600 shrink-0 mt-0.5" />
          )}
          <div>
            <p className="font-bold underline">
              {statusMsg.type === "success" ? "Berhasil" : statusMsg.type === "error" ? "Error Terjadi" : "Informasi"}
            </p>
            <p className="mt-0.5">{statusMsg.text}</p>
          </div>
        </div>
      )}

      {/* SECTION: CLOUD BACKUP & RESTORE */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden flex flex-col" id="cloud-backup-restore-panel">
        {/* Header Block */}
        <div className="p-5 border-b border-slate-100 bg-emerald-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-emerald-800 rounded-lg text-emerald-300">
              <Cloud size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold font-sans text-left">Penyimpanan & Pencadangan Cloud (Google Drive)</h3>
              <p className="text-[10px] text-emerald-200 mt-0.5 text-left">Amankan data secara online, sinkronkan ke akun Google Anda</p>
            </div>
          </div>
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono bg-emerald-700 text-white px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 shrink-0">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span>
                {userEmail || displayName || "Terhubung"}
              </span>
            </div>
          ) : (
            <span className="text-[9px] font-mono bg-emerald-900 text-emerald-350 px-2 py-0.5 rounded font-semibold uppercase self-start sm:self-auto">Belum Otorisasi</span>
          )}
        </div>

        {/* Content area */}
        <div className="p-6 space-y-6 text-left">
          {!isAuthenticated ? (
            <div className="text-center py-6 max-w-lg mx-auto space-y-4">
              <div className="inline-flex p-3 bg-emerald-50 text-emerald-600 rounded-full">
                <Cloud size={24} className="animate-pulse" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800">Hubungkan dengan Google Drive</h4>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Dengan mengotorisasi akses cloud Google Drive, Anda dapat menyimpan file cadangan secara online dan mengimpornya kembali kapan saja dengan aman.
                </p>
              </div>
              <button 
                type="button"
                onClick={handleLoginGoogle}
                disabled={isLoadingAuth || isProcessingCloud}
                className="gsi-material-button text-slate-700 relative flex items-center justify-center gap-3 px-5 py-2.5 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-xs font-bold transition shadow-xs hover:shadow-md cursor-pointer mx-auto disabled:opacity-50"
              >
                {isLoadingAuth || isProcessingCloud ? (
                  <Loader2 size={16} className="animate-spin text-indigo-600" />
                ) : (
                  <>
                    <div className="gsi-material-button-icon shrink-0">
                      <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-[16px] h-[16px] block">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                      </svg>
                    </div>
                    <span>Hubungkan Akun Google</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Actions Area */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Cadangkan Data Saat Ini ke Google Drive</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Sistem akan menyusun berkas backup berformat JSON dan menyimpannya secara instan di Drive Anda.</p>
                </div>
                <button
                  type="button"
                  onClick={handleCloudBackup}
                  disabled={isProcessingCloud}
                  className="px-4 py-2.5 bg-emerald-650 hover:bg-emerald-750 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer shrink-0 disabled:opacity-50"
                >
                  {isProcessingCloud ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <CloudUpload size={14} />
                  )}
                  Buat Cloud Backup Baru
                </button>
              </div>

              {/* Backups List Area */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 font-mono flex items-center gap-1.5">
                    <Database size={14} className="text-slate-400" />
                    Daftar File Cadangan di Google Drive ({driveBackups.length})
                  </h4>
                  <button
                    type="button"
                    onClick={() => token && loadCloudBackups(token)}
                    disabled={isProcessingCloud}
                    className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg border border-slate-200 hover:border-slate-350 cursor-pointer transition"
                    title="Refresh List"
                  >
                    <RefreshCw size={13} className={isProcessingCloud ? "animate-spin" : ""} />
                  </button>
                </div>

                {isProcessingCloud && driveBackups.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500">
                    <Loader2 size={20} className="animate-spin text-indigo-600 mb-2" />
                    <span className="text-[10.5px] font-mono">Menghubungkan & mengunduh metadata dari Google Drive...</span>
                  </div>
                ) : driveBackups.length === 0 ? (
                  <div className="text-center p-8 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-[11px] leading-relaxed">
                    Belum ditemukan file cadangan awan (`TagihanPay_CloudBackup`) di Google Drive Anda.<br />
                    Mulai dengan mengklik **"Buat Cloud Backup Baru"** untuk mengamankan data pertama Anda.
                  </div>
                ) : (
                  <div className="border border-slate-150 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-[250px] overflow-y-auto">
                    {driveBackups.map((file) => (
                      <div key={file.id} className="p-3.5 bg-white hover:bg-slate-50 flex items-center justify-between gap-3 text-xs transition">
                        <div className="space-y-1 min-w-0 flex-1 text-left">
                          <p className="font-semibold text-slate-800 truncate" title={file.name}>
                            {file.name}
                          </p>
                          <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono">
                            <span>Waktu: {new Date(file.createdTime).toLocaleString("id-ID")}</span>
                            <span>•</span>
                            <span>Ukuran: {(Number(file.size || 0) / 1024).toFixed(1)} KB</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleCloudRestore(file.id, file.name)}
                            disabled={isProcessingCloud}
                            className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 text-[11px] font-bold rounded-lg transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            title="Pulihkan data ini"
                          >
                            <CloudDownload size={13} />
                            Pulihkan (Restore)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCloudDelete(file.id, file.name)}
                            disabled={isProcessingCloud}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer disabled:opacity-50 animate-fadeIn"
                            title="Hapus cadangan"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

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
