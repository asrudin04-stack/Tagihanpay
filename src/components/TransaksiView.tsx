/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from "react";
import { 
  PlusCircle, 
  History, 
  Clock, 
  CheckCircle, 
  Printer, 
  Search, 
  Filter, 
  CreditCard, 
  CheckCircle2, 
  Download,
  AlertTriangle,
  Receipt,
  User,
  Activity,
  ArrowRight,
  Sparkles,
  X
} from "lucide-react";
import { 
  Pelanggan, 
  Transaksi, 
  BiayaTarif, 
  formatRupiah, 
  BULAN_LIST, 
  TAHUN_LIST, 
  getMonthLabel 
} from "../types";

const formatPhoneForWhatsApp = (phone: string): string => {
  let cleaned = phone.replace(/[^0-9]/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = "62" + cleaned.slice(1);
  }
  return cleaned;
};

const formatWhatsAppMessage = (tx: Transaksi): string => {
  const bulan = tx.periode.split("-")[1];
  const tahun = tx.periode.split("-")[0];
  const bulanLabel = getMonthLabel(bulan);

  return `*BUKTI PEMBAYARAN RESMI* ✅

Yth. Bapak/Ibu *${tx.namaPelanggan}*,
Terima kasih! Pembayaran tagihan Anda telah resmi kami terima dan sukses diproses oleh sistem loket digital.

*Rincian Transaksi:*
• No Invoice: *${tx.id}*
• No Referensi: _${tx.noReff || "-"}_
• Jenis Layanan: *${tx.layanan}*
• Periode Tagihan: *${bulanLabel} ${tahun}*
• Metode Bayar: *${tx.metodePembayaran}*
• Tanggal Bayar: *${new Date(tx.tanggalBayar).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}*

*TOTAL BAYAR: ${formatRupiah(tx.jumlahBayar)}*

Status: *LUNAS / TERBAYAR* ⭐️

_Pesan ini dikirimkan otomatis sebagai bukti transaksi digital yang sah sebagai pengganti kwitansi fisik._
Salam Hangat,
*E-Payment Kasir*`;
};

interface TransaksiViewProps {
  pelangganList: Pelanggan[];
  transaksiList: Transaksi[];
  biayaList: BiayaTarif[];
  onAddTransaksi: (newTx: Transaksi | Transaksi[]) => void;
  // State for preselecting from other tabs
  initialSelectedCustomerId?: string;
  clearInitialSelectedCustomerId?: () => void;
}

export default function TransaksiView({
  pelangganList,
  transaksiList,
  biayaList,
  onAddTransaksi,
  initialSelectedCustomerId,
  clearInitialSelectedCustomerId
}: TransaksiViewProps) {
  
  // Navigation tabs for Transaksi sub-menu
  const [activeSubTab, setActiveSubTab] = useState<"input" | "riwayat" | "tunggakan" | "kolektif">("input");

  // Modern alert notice state for new payment
  const [showAutoReceipt, setShowAutoReceipt] = useState<Transaksi | null>(null);

  // --- TRANS FORM STATE ---
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [periodeBulan, setPeriodeBulan] = useState("06"); // Juni
  const [periodeTahun, setPeriodeTahun] = useState("2026");
  const [jumlahBayar, setJumlahBayar] = useState<number>(0);
  const [metodePembayaran, setMetodePembayaran] = useState<'Tunai' | 'Transfer'>("Tunai");
  const [keterangan, setKeterangan] = useState("");
  const [sendWaNotif, setSendWaNotif] = useState<boolean>(() => {
    return localStorage.getItem("tagihanpay_send_wa_auto") !== "false";
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    localStorage.setItem("tagihanpay_send_wa_auto", sendWaNotif ? "true" : "false");
  }, [sendWaNotif]);

  // --- ARREARS ALERTS PERIODS ---
  const activePeriods = ["2026-05", "2026-06"]; // Months simulated for unpaid check

  // --- HISTORY SEARCH STATE ---
  const [historySearch, setHistorySearch] = useState("");
  const [historyLayanan, setHistoryLayanan] = useState("SEMUA");

  // --- STATE FOR COLLECTIVE PAYMENT IMPORT ---
  const [dragActiveKolektif, setDragActiveKolektif] = useState(false);
  const [rawTextKolektif, setRawTextKolektif] = useState("");
  const [parsedDataKolektif, setParsedDataKolektif] = useState<any[]>([]);
  const [importStatusKolektif, setImportStatusKolektif] = useState<{ type: "idle" | "error" | "success"; message: string }>({ type: "idle", message: "" });

  const sanitizePeriod = (val: string): string => {
    let cleaned = val.replace(/["']/g, "").trim();
    if (/^\d{4}-\d{2}$/.test(cleaned)) {
      return cleaned;
    }
    if (/^\d{2}[-\/]\d{4}$/.test(cleaned)) {
      const parts = cleaned.split(/[-\/]/);
      return `${parts[1]}-${parts[0]}`;
    }
    return "2026-06";
  };

  const parseKolektifTextData = (text: string, format: "csv" | "json") => {
    try {
      if (format === "json") {
        const parsed = JSON.parse(text);
        const list = Array.isArray(parsed) ? parsed : [parsed];
        const processed = list.map((item: any) => {
          const idPel = String(item.idPelanggan || item.id_pelanggan || item.pelangganId || "").trim();
          const customer = pelangganList.find(p => p.id === idPel);
          const per = sanitizePeriod(String(item.periode || "2026-06"));
          
          let rate = 0;
          if (customer) {
            const standardRateObj = biayaList.find(b => b.layanan === customer.layanan);
            rate = standardRateObj ? standardRateObj.biayaPerBulan : 120000;
          }
          const jBayar = Number(item.jumlahBayar || item.jumlah_bayar || item.nominal || rate);
          const met = String(item.metodePembayaran || item.metode || "Tunai").trim().toLowerCase() === "transfer" ? "Transfer" : "Tunai" as 'Tunai' | 'Transfer';
          const tgl = String(item.tanggalBayar || item.tanggal_bayar || item.tanggal || new Date().toISOString().split("T")[0]).trim();
          const ket = String(item.keterangan || "").trim();

          return {
            idPelanggan: idPel,
            namaPelanggan: customer ? customer.nama : "Pelanggan Tidak Ditemukan",
            layanan: customer ? customer.layanan : "PLN",
            periode: per,
            jumlahBayar: jBayar,
            metodePembayaran: met,
            tanggalBayar: tgl,
            keterangan: ket,
            isValid: !!customer
          };
        });
        
        const validList = processed.filter(x => x.idPelanggan !== "");
        setParsedDataKolektif(validList);
        setImportStatusKolektif({ type: "idle", message: "" });
      } else {
        // CSV Parsing
        const lines = text.split(/\r?\n/);
        if (lines.length === 0) {
          setImportStatusKolektif({ type: "error", message: "File CSV kosong" });
          return;
        }

        const headers = lines[0].toLowerCase().split(/[;,]/).map(h => h.trim());
        const dataRows = lines.slice(1);
        
        const results: any[] = [];
        dataRows.forEach((row) => {
          if (!row.trim()) return;

          // Simple split, handling optional surrounding quotes
          const cols: string[] = [];
          let current = "";
          let inQuotes = false;
          
          for (let i = 0; i < row.length; i++) {
            const char = row[i];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if ((char === ',' || char === ';') && !inQuotes) {
              cols.push(current);
              current = "";
            } else {
              current += char;
            }
          }
          cols.push(current);
          
          const cleanedCols = cols.map(c => {
            let s = c.trim();
            if (s.startsWith('"') && s.endsWith('"')) {
              s = s.slice(1, -1);
            }
            return s;
          });

          const getColIndex = (name: string, fallbackIdx: number) => {
            const index = headers.findIndex(h => h.includes(name));
            return index !== -1 ? index : fallbackIdx;
          };

          const idPelIdx = getColIndex("idpelanggan", 0);
          const perIdx = getColIndex("periode", 1);
          const jBayarIdx = getColIndex("jumlah", 2);
          const metIdx = getColIndex("metode", 3);
          const tglIdx = getColIndex("tanggal", 4);
          const ketIdx = getColIndex("keterangan", 5);

          const idPel = cleanedCols[idPelIdx] || "";
          if (!idPel) return;

          const customer = pelangganList.find(p => p.id === idPel);
          const per = sanitizePeriod(cleanedCols[perIdx] || "2026-06");
          
          let rate = 0;
          if (customer) {
            const standardRateObj = biayaList.find(b => b.layanan === customer.layanan);
            rate = standardRateObj ? standardRateObj.biayaPerBulan : 120000;
          }

          const rawJumlah = cleanedCols[jBayarIdx] || "";
          const jBayar = rawJumlah ? Number(rawJumlah) : rate;
          
          const rawMethod = String(cleanedCols[metIdx] || "Tunai").toLowerCase();
          const met = rawMethod.includes("transfer") ? "Transfer" : "Tunai" as 'Tunai' | 'Transfer';

          const tgl = cleanedCols[tglIdx] || new Date().toISOString().split("T")[0];
          const ket = cleanedCols[ketIdx] || "";

          results.push({
            idPelanggan: idPel,
            namaPelanggan: customer ? customer.nama : "ID Pelanggan Tidak Terdaftar",
            layanan: customer ? customer.layanan : "PLN",
            periode: per,
            jumlahBayar: jBayar,
            metodePembayaran: met,
            tanggalBayar: tgl,
            keterangan: ket,
            isValid: !!customer
          });
        });

        if (results.length === 0) {
          setImportStatusKolektif({ type: "error", message: "Tidak ada data baris valid di dalam file CSV" });
          setParsedDataKolektif([]);
        } else {
          setParsedDataKolektif(results);
          setImportStatusKolektif({ type: "idle", message: "" });
        }
      }
    } catch (err: any) {
      setImportStatusKolektif({ type: "error", message: "Gagal mengolah file: " + err.message });
      setParsedDataKolektif([]);
    }
  };

  const handleDragKolektif = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActiveKolektif(true);
    } else if (e.type === "dragleave") {
      setDragActiveKolektif(false);
    }
  };

  const handleDropKolektif = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActiveKolektif(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = evt.target?.result as string;
        const isJson = file.name.endsWith(".json") || file.type === "application/json";
        parseKolektifTextData(text, isJson ? "json" : "csv");
      };
      reader.readAsText(file);
    }
  };

  const handleFileChangeKolektif = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = evt.target?.result as string;
        const isJson = file.name.endsWith(".json") || file.type === "application/json";
        parseKolektifTextData(text, isJson ? "json" : "csv");
      };
      reader.readAsText(file);
    }
  };

  const processKolektifImportExecute = () => {
    const validData = parsedDataKolektif.filter(x => x.isValid);
    if (validData.length === 0) {
      setImportStatusKolektif({ type: "error", message: "Tidak ada baris pembayaran yang valid untuk diproses." });
      return;
    }

    const newlyCreatedTransactions: Transaksi[] = [];

    validData.forEach((row, index) => {
      // Adding index or random variation to ensure high entropy transaction IDs and reference numbers
      const randSeed = Math.floor(1000 + Math.random() * 9000);
      const txId = `INV-${row.periode.replace("-", "")}-${randSeed}-${index}`;
      
      newlyCreatedTransactions.push({
        id: txId,
        idPelanggan: row.idPelanggan,
        namaPelanggan: row.namaPelanggan,
        layanan: row.layanan,
        periode: row.periode,
        jumlahBayar: row.jumlahBayar,
        metodePembayaran: row.metodePembayaran,
        tanggalBayar: row.tanggalBayar,
        keterangan: row.keterangan || `Pembayaran Tagihan ${row.layanan} Periode ${row.periode} (Kolektif Masa)`,
        noReff: `REF-${row.layanan}-${randSeed}-${index}`
      });
    });

    onAddTransaksi(newlyCreatedTransactions);

    setImportStatusKolektif({
      type: "success",
      message: `Berhasil mencatat ${validData.length} transaksi pembayaran lunas kolektif!`
    });
    setParsedDataKolektif([]);
    setRawTextKolektif("");

    setTimeout(() => {
      setActiveSubTab("riwayat");
      setImportStatusKolektif({ type: "idle", message: "" });
    }, 1800);
  };

  const downloadTemplateKolektifCSV = () => {
    const headers = "idPelanggan,periode,jumlahBayar,metodePembayaran,tanggalBayar,keterangan\n";
    const customer1 = pelangganList[0]?.id || "PLG-2026-0001";
    const customer2 = pelangganList[1]?.id || "PLG-2026-0002";
    const sample = `${customer1},2026-06,185000,Transfer,2026-06-20,Pembayaran Kolektif Lancar\n${customer2},2026-06,,Tunai,,Menggunakan Tarif Default Master\n`;
    const blob = new Blob([headers + sample], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "template_pembayaran_kolektif.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle external redirect triggers (e.g. from Dashboard quick-pay triggers)
  useEffect(() => {
    if (initialSelectedCustomerId) {
      setSelectedCustomerId(initialSelectedCustomerId);
      setActiveSubTab("input");
      if (clearInitialSelectedCustomerId) {
        clearInitialSelectedCustomerId();
      }
    }
  }, [initialSelectedCustomerId]);

  // Reactive lookup for customer details when customer id changes
  const selectedCustomerInfo = useMemo(() => {
    return pelangganList.find((p) => p.id === selectedCustomerId);
  }, [selectedCustomerId, pelangganList]);

  // Autofill standard cost of chosen client's package
  useEffect(() => {
    if (selectedCustomerInfo) {
      const standardRate = biayaList.find((b) => b.layanan === selectedCustomerInfo.layanan);
      if (standardRate) {
        setJumlahBayar(standardRate.biayaPerBulan);
      } else {
        setJumlahBayar(0);
      }
    } else {
      setJumlahBayar(0);
    }
  }, [selectedCustomerId, selectedCustomerInfo, biayaList]);

  // Validate form
  const validateForm = () => {
    const tempErrors: { [key: string]: string } = {};
    if (!selectedCustomerId) tempErrors.idPelanggan = "Pilih pelanggan terlebih dahulu";
    if (jumlahBayar <= 0) tempErrors.jumlahBayar = "Masukkan nominal jumlah bayar yang valid";
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  // Submit payment handler
  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (!selectedCustomerInfo) return;

    const txId = `INV-${periodeTahun}${periodeBulan}-${Math.floor(1000 + Math.random() * 9000)}`;
    const fullPeriod = `${periodeTahun}-${periodeBulan}`;

    const newTx: Transaksi = {
      id: txId,
      idPelanggan: selectedCustomerInfo.id,
      namaPelanggan: selectedCustomerInfo.nama,
      layanan: selectedCustomerInfo.layanan,
      periode: fullPeriod,
      jumlahBayar,
      metodePembayaran,
      tanggalBayar: new Date().toISOString().split("T")[0],
      keterangan: keterangan.trim() || `Pembayaran Tagihan ${selectedCustomerInfo.layanan} Periode ${getMonthLabel(periodeBulan)} ${periodeTahun}`,
      noReff: `REF-${selectedCustomerInfo.layanan}-${Math.floor(1000 + Math.random() * 9000)}`
    };

    const customerPhone = selectedCustomerInfo.noTelp;

    onAddTransaksi(newTx);
    
    // Clear inputs
    setSelectedCustomerId("");
    setKeterangan("");
    
    // Show beautiful automatic printed receipt popup
    setShowAutoReceipt(newTx);

    // Automatic WhatsApp Notification opening
    if (sendWaNotif && customerPhone) {
      const waPhone = formatPhoneForWhatsApp(customerPhone);
      const waMessage = formatWhatsAppMessage(newTx);
      const waUrl = `https://api.whatsapp.com/send?phone=${waPhone}&text=${encodeURIComponent(waMessage)}`;
      window.open(waUrl, "_blank");
    }
  };

  // Compute "Tagihan Belum Lunas" list dynamically
  const arrearsList = useMemo(() => {
    const list: { 
      idKey: string; 
      pelanggan: Pelanggan; 
      periode: string; 
      nominal: number; 
      jatuhTempo: string; 
    }[] = [];

    pelangganList.forEach((p) => {
      // Find matching standard tarif
      const rateObj = biayaList.find((b) => b.layanan === p.layanan);
      const nominal = rateObj ? rateObj.biayaPerBulan : 120000;

      activePeriods.forEach((period) => {
        // Check if customer paid this period for their service
        const isPaid = transaksiList.some(
          (tx) => tx.idPelanggan === p.id && tx.layanan === p.layanan && tx.periode === period
        );

        if (!isPaid) {
          const parts = period.split("-");
          const monthLabel = getMonthLabel(parts[1]);
          list.push({
            idKey: `${p.id}-${period}`,
            pelanggan: p,
            periode: `${monthLabel} ${parts[0]}`,
            nominal,
            jatuhTempo: `Tanggal 10 ${monthLabel} ${parts[0]}`
          });
        }
      });
    });

    return list;
  }, [pelangganList, transaksiList, biayaList]);

  // Handle direct rapid payment from arrears list
  const handleArrearsPayNow = (p: Pelanggan, periodLabel: string) => {
    setSelectedCustomerId(p.id);
    
    // Convert period label "Juni 2026" back to period code
    let monthCode = "06";
    let yearCode = "2026";
    if (periodLabel.toLowerCase().includes("mei")) {
      monthCode = "05";
    }
    setPeriodeBulan(monthCode);
    setPeriodeTahun(yearCode);
    
    setActiveSubTab("input");
  };

  // Filter history
  const filteredHistory = useMemo(() => {
    return transaksiList.filter((tx) => {
      const matchesSearch = 
        tx.namaPelanggan.toLowerCase().includes(historySearch.toLowerCase()) ||
        tx.idPelanggan.toLowerCase().includes(historySearch.toLowerCase()) ||
        tx.id.toLowerCase().includes(historySearch.toLowerCase());
      
      const matchesLayanan = historyLayanan === "SEMUA" || tx.layanan === historyLayanan;

      return matchesSearch && matchesLayanan;
    });
  }, [transaksiList, historySearch, historyLayanan]);

  // Handle print layout trigger
  const triggerBrowserPrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* Sub Menu Switchers Layout */}
      <div className="flex border-b border-slate-200 bg-white p-2 rounded-2xl border flex-wrap gap-1.5" id="transaksi-main-nav">
        <button
          onClick={() => setActiveSubTab("input")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
            activeSubTab === "input"
              ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
              : "text-slate-650 hover:bg-slate-50"
          }`}
        >
          <PlusCircle size={15} />
          Input Pembayaran Tagihan
        </button>
        <button
          onClick={() => setActiveSubTab("riwayat")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
            activeSubTab === "riwayat"
              ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
              : "text-slate-650 hover:bg-slate-50"
          }`}
        >
          <History size={15} />
          Riwayat Pembayaran ({transaksiList.length})
        </button>
        <button
          onClick={() => setActiveSubTab("tunggakan")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer relative ${
            activeSubTab === "tunggakan"
              ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
              : "text-slate-655 hover:bg-slate-50"
          }`}
        >
          <Clock size={15} />
          Tagihan Belum Lunas
          {arrearsList.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white font-mono font-bold text-[9px] h-5 min-w-[20px] px-1 rounded-full flex items-center justify-center animate-pulse border-2 border-white">
              {arrearsList.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveSubTab("kolektif")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer relative ${
            activeSubTab === "kolektif"
              ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
              : "text-slate-655 hover:bg-slate-50"
          }`}
          id="tab-pembayaran-kolektif"
        >
          <Sparkles size={14} className="text-amber-500" />
          Pembayaran Kolektif (Import)
        </button>
      </div>

      {/* --- SUB TAB 1: INPUT PEMBAYARAN FORM --- */}
      {activeSubTab === "input" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="input-payment-section">
          
          {/* Main Transaction Form */}
          <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <CreditCard size={18} />
              </div>
              <h4 className="text-sm font-bold text-slate-800">Form Pembayaran Loket Digital</h4>
            </div>

            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              
              {/* Customer Selector dropdown */}
              <div className="space-y-1">
                <label className="text-[11px] font-mono uppercase text-slate-500 font-semibold block">PILIH PELANGGAN</label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-250 rounded-lg focus:outline-hidden focus:border-indigo-650 text-slate-850 font-medium bg-white"
                >
                  <option value="">-- Cari / Pilih Pelanggan --</option>
                  {pelangganList.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.id}] {p.nama} - {p.layanan} ({p.noMeter})
                    </option>
                  ))}
                </select>
                {errors.idPelanggan && <p className="text-[10px] text-rose-500 mt-1">{errors.idPelanggan}</p>}
              </div>

              {/* Dynamic Info card once customer is chosen */}
              {selectedCustomerInfo && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      <User size={14} className="text-indigo-600" />
                      Detail Pelanggan Terpilih
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 font-mono text-[9px] font-bold">
                      {selectedCustomerInfo.layanan}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-y-1.5 text-slate-600">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-mono">No ID Meter / Rek</span>
                      <strong className="font-mono text-slate-850 font-bold">{selectedCustomerInfo.noMeter}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-mono">Kontak Pelanggan</span>
                      <span className="font-mono text-slate-800">{selectedCustomerInfo.noTelp}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[10px] text-slate-400 block uppercase font-mono">Alamat</span>
                      <p className="text-[11px] text-slate-700 font-medium leading-tight">{selectedCustomerInfo.alamat}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Period selection */}
              <div className="grid grid-cols-2 gap-4">
                
                {/* Bulan */}
                <div className="space-y-1">
                  <label className="text-[11px] font-mono uppercase text-slate-500 font-semibold block">Periode Bulan Tagihan</label>
                  <select
                    value={periodeBulan}
                    onChange={(e) => setPeriodeBulan(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-250 rounded-lg focus:outline-hidden focus:border-indigo-650 text-slate-800 bg-white"
                  >
                    {BULAN_LIST.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tahun */}
                <div className="space-y-1">
                  <label className="text-[11px] font-mono uppercase text-slate-500 font-semibold block">Tahun Tagihan / Ajaran</label>
                  <select
                    value={periodeTahun}
                    onChange={(e) => setPeriodeTahun(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-250 rounded-lg focus:outline-hidden focus:border-indigo-650 text-slate-800 bg-white font-mono"
                  >
                    {TAHUN_LIST.map((y) => (
                      <option key={y} value={y}>
                        Tahun {y}
                      </option>
                    ))}
                  </select>
                </div>

              </div>

              {/* Biaya input */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Jumlah Bayar - can type but autofilled */}
                <div className="space-y-1">
                  <span className="text-[11px] font-mono uppercase text-slate-500 font-semibold flex items-center justify-between">
                    <span>JUMLAH BAYAR</span>
                    {selectedCustomerInfo && (
                      <span className="text-[9px] text-indigo-600 font-normal normal-case">Harga Tarif Terpilih</span>
                    )}
                  </span>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-450 font-bold font-mono">Rp</span>
                    <input 
                      type="number"
                      placeholder="Masukkan nominal bayar..."
                      value={jumlahBayar === 0 ? "" : jumlahBayar}
                      onChange={(e) => setJumlahBayar(parseInt(e.target.value) || 0)}
                      className="w-full text-xs pl-8 pr-4 py-2 border border-slate-250 rounded-lg focus:outline-hidden focus:border-indigo-650 text-slate-850 font-bold font-mono bg-white"
                    />
                  </div>
                  {errors.jumlahBayar && <p className="text-[10px] text-rose-500 mt-1">{errors.jumlahBayar}</p>}
                </div>

                {/* Metode Pembayaran */}
                <div className="space-y-1">
                  <label className="text-[11px] font-mono uppercase text-slate-500 font-semibold block">METODE PEMBAYARAN</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["Tunai", "Transfer"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMetodePembayaran(m)}
                        className={`py-2 px-3 text-xs font-bold rounded-lg border text-center transition cursor-pointer ${
                          metodePembayaran === m 
                            ? "bg-slate-900 text-white border-slate-900" 
                            : "bg-white text-slate-650 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              {/* Keterangan Tambahan */}
              <div className="space-y-1">
                <label className="text-[11px] font-mono uppercase text-slate-500 font-semibold">KETERANGAN TAMBAHAN / CATATAN (OPTIONAL)</label>
                <input 
                  type="text"
                  placeholder="Contoh: Pembayaran melalui loket m-banking bank BCA"
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-250 rounded-lg focus:outline-hidden focus:border-indigo-650 text-slate-700 bg-white"
                />
              </div>

              {/* WhatsApp Notification Option Toggle */}
              <div className="flex items-center justify-between p-3.5 border border-emerald-100 bg-emerald-50/20 rounded-xl transition duration-300 hover:bg-emerald-50/40" id="wa-notif-option">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1 px-1.5 bg-emerald-100 text-emerald-700 rounded-md shrink-0">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.456 5.704 1.457h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                  </div>
                  <div className="text-left min-w-0">
                    <span className="text-xs font-bold text-slate-800 block">Kirim Bukti via WhatsApp Otomatis</span>
                    <span className="text-[10px] text-slate-400 font-medium block truncate">Buka otomatis jendela kirim rincian kwitansi</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSendWaNotif(!sendWaNotif)}
                  className={`w-9.5 h-5.5 rounded-full transition-colors duration-200 focus:outline-hidden relative shrink-0 ${
                    sendWaNotif ? "bg-emerald-500" : "bg-slate-200"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 bg-white w-4.5 h-4.5 rounded-full transition-transform duration-200 shadow-xs ${
                      sendWaNotif ? "transform translate-x-4" : ""
                    }`}
                  />
                </button>
              </div>

              {/* Submit trigger button */}
              <button 
                type="submit"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] transition text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 mt-4 shadow-lg shadow-emerald-600/10 cursor-pointer"
                id="submit-pembayaran-btn"
              >
                <CheckCircle size={16} /> Bayar Layanan & Cetak Kwitansi
              </button>

            </form>
          </div>

          {/* Quick references guidelines sidebar */}
          <div className="lg:col-span-5 bg-slate-900 text-white p-6 rounded-2xl flex flex-col justify-between relative overflow-hidden" id="cashier-helper">
            {/* Background design */}
            <div className="absolute right-0 bottom-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="space-y-5">
              <span className="px-2.5 py-0.5 text-[9px] font-mono uppercase font-bold tracking-widest bg-emerald-400/20 text-emerald-400 rounded-md w-fit">
                Loket Pembayaran On
              </span>
              
              <div className="space-y-1">
                <h4 className="text-base font-bold font-sans tracking-tight">E-Kwitansi Instan otomatis</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Setelah menekan tombol **Bayar Layanan**, sistem akan langsung menerbitkan kuintansi pembayaran yang sah dengan kode referensi unik yang didaftarkan ke data riwayat.
                </p>
              </div>

              <div className="space-y-3.5 pt-4">
                <h5 className="text-[11px] font-mono tracking-wider uppercase text-slate-400">Instruksi Kasir</h5>
                
                <div className="flex gap-2.5 items-start text-xs text-slate-300">
                  <span className="w-5 h-5 font-mono text-[10px] font-bold rounded-full bg-slate-800 text-slate-300 flex items-center justify-center shrink-0">1</span>
                  <p>Tanyakan nama lengkap pelanggan, nomor ID meteran, atau cari melalui menu dropdown cari.</p>
                </div>

                <div className="flex gap-2.5 items-start text-xs text-slate-300">
                  <span className="w-5 h-5 font-mono text-[10px] font-bold rounded-full bg-slate-800 text-slate-300 flex items-center justify-center shrink-0">2</span>
                  <p>Biaya standar tagihan otomatis terambil berdasarkan paket terdaftar pelanggan.</p>
                </div>

                <div className="flex gap-2.5 items-start text-xs text-slate-300">
                  <span className="w-5 h-5 font-mono text-[10px] font-bold rounded-full bg-slate-800 text-slate-300 flex items-center justify-center shrink-0">3</span>
                  <p>Pilih Periode Bulan & Tahun tagihan yang hendak dilunasi oleh pelanggan.</p>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-800 text-slate-450 text-[10px] space-y-1">
              <p>Operator Lokal IP: <span className="font-mono text-white">127.0.0.1</span></p>
              <p>Loket Terbuka: <span className="font-mono text-emerald-400 font-semibold">Ready</span></p>
            </div>
          </div>

        </div>
      )}

      {/* --- SUB TAB 2: RIWAYAT PEMBAYARAN TABLE --- */}
      {activeSubTab === "riwayat" && (
        <div className="space-y-4" id="riwayat-section">
          
          {/* Filtering row for transaction logs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
            <div className="relative md:col-span-2">
              <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
              <input 
                type="text"
                placeholder="Cari Riwayat berdasarkan Nama, ID Pelanggan, NoInvoice..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="pl-9 pr-4 py-1.5 w-full bg-slate-50 text-xs border border-slate-250 rounded-lg focus:outline-hidden focus:border-indigo-600 text-slate-705"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter size={14} className="text-slate-400" />
              <select
                value={historyLayanan}
                onChange={(e) => setHistoryLayanan(e.target.value)}
                className="py-1.5 w-full bg-slate-50 text-xs border border-slate-250 rounded-lg focus:outline-hidden focus:border-indigo-505 font-medium text-slate-750"
              >
                <option value="SEMUA">Semua Layanan</option>
                <option value="PLN">Khusus PLN (Listrik)</option>
                <option value="PDAM">Khusus PDAM (Air)</option>
                <option value="WIFI">Khusus WIFI (Internet)</option>
              </select>
            </div>
          </div>

          {/* Transactions List */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-slate-600">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold">
                    <th className="p-4 pl-6">NO INVOICE</th>
                    <th className="p-4">PELANGGAN</th>
                    <th className="p-4">LAYANAN</th>
                    <th className="p-4">PERIODE</th>
                    <th className="p-4">TANGGAL BAYAR</th>
                    <th className="p-4">NOMINAL</th>
                    <th className="p-4 pr-6 text-right">AKSI RECEIPT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredHistory.map((tx) => {
                    const monthPart = tx.periode.split("-")[1];
                    const yearPart = tx.periode.split("-")[0];
                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/50 transition">
                        
                        {/* Inv code */}
                        <td className="p-4 pl-6 font-mono font-bold text-slate-900 text-[11px]">
                          {tx.id}
                        </td>

                        {/* Customer */}
                        <td className="p-4">
                          <div>
                            <span className="font-bold text-slate-800 block">{tx.namaPelanggan}</span>
                            <span className="text-[10px] text-slate-400 font-mono font-medium">{tx.idPelanggan}</span>
                          </div>
                        </td>

                        {/* Service category */}
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold uppercase ${
                            tx.layanan === "PLN" ? "bg-amber-50 text-amber-600 border border-amber-100" :
                            tx.layanan === "PDAM" ? "bg-blue-50 text-blue-600 border border-blue-100" :
                            "bg-purple-50 text-purple-600 border border-purple-100"
                          }`}>
                            {tx.layanan}
                          </span>
                        </td>

                        {/* Period month/year */}
                        <td className="p-4 text-slate-700 font-semibold">
                          {getMonthLabel(monthPart)} {yearPart}
                        </td>

                        {/* Payment date */}
                        <td className="p-4 font-mono text-slate-500">
                          {new Date(tx.tanggalBayar).toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' })}
                        </td>

                        {/* Nominal amount paid */}
                        <td className="p-4 font-mono font-bold text-slate-800">
                          {formatRupiah(tx.jumlahBayar)}
                        </td>

                        {/* Reprint action */}
                        <td className="p-4 pr-6 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                const customer = pelangganList.find(p => p.id === tx.idPelanggan);
                                if (customer?.noTelp) {
                                  const phone = formatPhoneForWhatsApp(customer.noTelp);
                                  const msg = formatWhatsAppMessage(tx);
                                  window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`, "_blank");
                                } else {
                                  alert("Nomor telepon pelanggan tidak ditemukan.");
                                }
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 font-semibold text-[10px] text-white rounded-lg transition"
                              title="Kirim Struk via WhatsApp"
                            >
                              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.456 5.704 1.457h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                              </svg>
                              Kirim WA
                            </button>
                            <button
                              onClick={() => setShowAutoReceipt(tx)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 font-semibold text-[10px] text-white rounded-lg transition"
                            >
                              <Printer size={12} />
                              Kwitansi
                            </button>
                          </div>
                        </td>

                      </tr>
                    );
                  })}

                  {filteredHistory.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-slate-400 text-xs">
                        Riwayat pembayaran kosong atau tidak ditemukan dengan filter terpilih.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>the
        </div>
      )}

      {/* --- SUB TAB 3: TAGIHAN BELUM LUNAS (ARREARS) --- */}
      {activeSubTab === "tunggakan" && (
        <div className="space-y-4" id="tunggakan-section">
          
          <div className="bg-rose-50 border border-rose-200/50 p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex gap-3">
              <div className="p-3 bg-white text-rose-500 border border-rose-100 rounded-xl">
                <AlertTriangle size={24} />
              </div>
              <div className="space-y-0.5">
                <span className="text-base font-bold text-slate-800">Kumpulan Tagihan yang Belum Lunas</span>
                <p className="text-xs text-slate-500">Data pelanggan yang menunggak untuk periode aktif berjalan (Mei & Juni)</p>
              </div>
            </div>
            <div className="bg-rose-600 font-mono font-bold text-xs text-white px-3.5 py-1.5 rounded-lg">
              Total Tunggakan: {arrearsList.length} Item
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-slate-600">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold">
                    <th className="p-4 pl-6">NAMA PELANGGAN</th>
                    <th className="p-4">JENIS LAYANAN</th>
                    <th className="p-4">METER / CLIENT ID</th>
                    <th className="p-4">BULAN TUNGGAKAN</th>
                    <th className="p-4">JATUH TEMPO</th>
                    <th className="p-4">TOTAL BIAYA</th>
                    <th className="p-4 pr-6 text-right">AKSI CEPAT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs animate-fadeIn">
                  {arrearsList.map((item) => (
                    <tr key={item.idKey} className="hover:bg-rose-50/20 transition duration-300">
                      
                      {/* Customer Name */}
                      <td className="p-4 pl-6">
                        <div>
                          <strong className="text-slate-800 block font-bold">{item.pelanggan.nama}</strong>
                          <span className="font-mono text-[10px] text-slate-400">{item.pelanggan.id}</span>
                        </div>
                      </td>

                      {/* Layanan */}
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          item.pelanggan.layanan === "PLN" ? "bg-amber-50 text-amber-600" :
                          item.pelanggan.layanan === "PDAM" ? "bg-blue-50 text-blue-600" :
                          "bg-purple-50 text-purple-600"
                        }`}>
                          {item.pelanggan.layanan}
                        </span>
                      </td>

                      {/* No meter */}
                      <td className="p-4 font-mono text-slate-605">
                        {item.pelanggan.noMeter}
                      </td>

                      {/* Periode tunggakan */}
                      <td className="p-4">
                        <span className="px-2.5 py-1 bg-rose-50 text-rose-600 text-[10px] font-bold rounded-md">
                          {item.periode}
                        </span>
                      </td>

                      {/* Jatuh Tempo */}
                      <td className="p-4 text-slate-450 font-mono text-[10px]">
                        {item.jatuhTempo}
                      </td>

                      {/* Nominal of fee */}
                      <td className="p-4 font-mono font-bold text-rose-600">
                        {formatRupiah(item.nominal)}
                      </td>

                      {/* Rapid Pay action */}
                      <td className="p-4 pr-6 text-right">
                        <button
                          onClick={() => handleArrearsPayNow(item.pelanggan, item.periode)}
                          className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 font-bold text-[10px] text-white rounded-lg transition shadow-xs flex items-center justify-center gap-1 ml-auto"
                        >
                          Bayar Sekarang
                          <ArrowRight size={12} />
                        </button>
                      </td>

                    </tr>
                  ))}

                  {arrearsList.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-emerald-600 font-medium text-xs bg-emerald-50/10">
                        Luar biasa! Tidak ada tagihan menunggak untuk seluruh pelanggan di periode ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- SUB TAB 4: PEMBAYARAN KOLEKTIF (BULK IMPORT) --- */}
      {activeSubTab === "kolektif" && (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6" id="kolektif-payment-section">
          
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-slate-150">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                <Sparkles size={22} className="text-indigo-600" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">Import Pembayaran Kolektif</h4>
                <p className="text-xs text-slate-500">Catat pelunasan tagihan banyak pelanggan secara sekaligus menggunakan file CSV/JSON</p>
              </div>
            </div>
            
            <button 
              type="button"
              onClick={downloadTemplateKolektifCSV}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-xl flex items-center gap-2 transition"
            >
              <Download size={15} /> Unduh Template CSV Kolektif
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Left: File dropzone & copy-paste */}
            <div className="space-y-4">
              
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-205 text-xs text-slate-650 space-y-2">
                <h5 className="font-bold text-slate-800 flex items-center gap-1.5">
                  <AlertTriangle size={14} className="text-indigo-600" /> Aturan Format Pembayaran Kolektif
                </h5>
                <p>Kolom-kolom berkas wajib memiliki susunan header di baris pertama:</p>
                <div className="bg-slate-900 text-indigo-300 p-2 rounded-md font-mono text-[10px] select-all">
                  idPelanggan,periode,jumlahBayar,metodePembayaran,tanggalBayar,keterangan
                </div>
                <div className="text-[11px] space-y-1 pt-1 text-slate-600">
                  <p>• <strong className="text-slate-700">periode</strong>: format <code className="bg-slate-200 px-1 rounded text-red-600 font-mono">YYYY-MM</code> (Contoh: <code className="text-indigo-700">2026-06</code>)</p>
                  <p>• <strong className="text-slate-700">jumlahBayar</strong>: Nominal tagihan. Jika kosong, sistem otomatis memakai tarif dasar master pelanggan.</p>
                  <p>• <strong className="text-slate-700">metodePembayaran</strong>: Diisi <span className="font-mono text-indigo-700">Tunai</span> atau <span className="font-mono text-indigo-700">Transfer</span> (Default: Tunai)</p>
                </div>
              </div>

              {/* Drag and Drop zone */}
              <div 
                onDragEnter={handleDragKolektif}
                onDragOver={handleDragKolektif}
                onDragLeave={handleDragKolektif}
                onDrop={handleDropKolektif}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition cursor-pointer flex flex-col items-center justify-center ${
                  dragActiveKolektif ? "border-indigo-600 bg-indigo-50/20" : "border-slate-300 hover:border-indigo-505 bg-slate-50/50"
                }`}
                onClick={() => document.getElementById("kolektif-import-file")?.click()}
              >
                <input 
                  type="file" 
                  id="kolektif-import-file" 
                  accept=".csv,.json" 
                  onChange={handleFileChangeKolektif}
                  className="hidden" 
                />
                <div className="p-3 bg-white rounded-full shadow-xs text-slate-400 mb-2">
                  <Receipt size={24} className="text-indigo-600" />
                </div>
                <p className="text-xs font-bold text-slate-700">
                  Letakkan berkas CSV / JSON pembayaran di sini, atau <span className="text-indigo-600">Telusuri File komputer</span>
                </p>
                <p className="text-[10px] text-slate-400 mt-1">Maksimal resolusi CSV 500 baris per eksekusi</p>
              </div>

              {/* Textarea Paste */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-slate-450 font-semibold block">ATAU SALIN / TEMPEL TEXT CSV DI SINI</label>
                <textarea 
                  rows={4}
                  placeholder="idPelanggan,periode,jumlahBayar,metodePembayaran,tanggalBayar,keterangan&#13;&#10;PLG-2026-0001,2026-06,185000,Transfer,2026-06-18,Lunas Kolektif&#13;&#10;PLG-2026-0002,2026-06,,Tunai,,Tarif Default"
                  value={rawTextKolektif}
                  onChange={(e) => {
                    setRawTextKolektif(e.target.value);
                    if (e.target.value.trim()) {
                      parseKolektifTextData(e.target.value, "csv");
                    } else {
                      setParsedDataKolektif([]);
                    }
                  }}
                  className="w-full text-[11px] font-mono p-3 border border-slate-250 rounded-lg focus:outline-hidden focus:border-indigo-650 text-slate-700 bg-white"
                />
              </div>

            </div>

            {/* Right: Preview & Execution and logs */}
            <div className="space-y-4 flex flex-col justify-between">
              
              <div className="space-y-3 flex-1">
                <h5 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">Pratinjau Hasil Pembayaran Kolektif</h5>
                
                {parsedDataKolektif.length === 0 ? (
                  <div className="border border-slate-200 border-dashed rounded-xl p-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center h-full min-h-[300px]">
                    <div className="p-3 bg-slate-50 text-slate-350 rounded-full mb-2">
                      <Receipt size={24} />
                    </div>
                    Belum ada data pratinjau yang dimuat.<br/>
                    Gunakan file upload atau tempel teks di sebelah kiri untuk meload pratinjau pembayaran kolektif.
                  </div>
                ) : (
                  <div className="space-y-3 font-sans h-full flex flex-col">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-700 bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                      <span>Total Baris Terbaca: {parsedDataKolektif.length} baris</span>
                      <span className="text-emerald-700 uppercase font-mono text-[10px]">
                        Siap: {parsedDataKolektif.filter(x => x.isValid).length} baris | Error: {parsedDataKolektif.filter(x => !x.isValid).length} baris
                      </span>
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-hidden overflow-y-auto max-h-[320px] shadow-xs">
                      <table className="w-full text-left text-[11px] border-collapse bg-white">
                        <thead className="bg-slate-900 text-white font-mono text-[9px] uppercase tracking-wider sticky top-0">
                          <tr>
                            <th className="p-2.5 pl-4">ID Pelanggan</th>
                            <th className="p-2.5">Layanan</th>
                            <th className="p-2.5">Periode</th>
                            <th className="p-2.5">Nominal</th>
                            <th className="p-2.5 text-right pr-4">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-150 text-slate-655 font-semibold">
                          {parsedDataKolektif.map((row, index) => (
                            <tr key={index} className="hover:bg-slate-50 transition">
                              <td className="p-2.5 pl-4">
                                <div className="font-mono">
                                  <span className="font-bold text-slate-800">{row.idPelanggan}</span>
                                  <span className="block text-[9px] text-slate-400 truncate max-w-[120px]">{row.namaPelanggan}</span>
                                </div>
                              </td>
                              <td className="p-2.5 font-bold">{row.layanan}</td>
                              <td className="p-2.5 font-semibold text-indigo-755 font-mono">{row.periode}</td>
                              <td className="p-2.5 font-mono text-slate-800 font-semibold">{formatRupiah(row.jumlahBayar)}</td>
                              <td className="p-2.5 text-right pr-4 thin">
                                {row.isValid ? (
                                  <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                    SIAP / VALID
                                  </span>
                                ) : (
                                  <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-100 animate-pulse" title="Periksa ID Pelanggan">
                                    ERROR ID
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Status Action bar */}
              <div className="pt-4 border-t border-slate-100 space-y-4">
                
                {importStatusKolektif.type !== "idle" && (
                  <div className={`p-4 rounded-xl text-xs font-bold border ${
                    importStatusKolektif.type === "success" 
                      ? "bg-emerald-50 text-emerald-800 border-emerald-250" 
                      : "bg-rose-50 text-rose-800 border-rose-250"
                  }`}>
                    <p className="flex items-center gap-2">
                       {importStatusKolektif.type === "success" ? <CheckCircle className="text-emerald-500" size={16} /> : <AlertTriangle className="text-rose-500" size={16} />}
                       {importStatusKolektif.message}
                    </p>
                  </div>
                )}

                <div className="flex justify-end gap-3.5">
                   <button 
                     type="button"
                     onClick={() => { setParsedDataKolektif([]); setRawTextKolektif(""); setImportStatusKolektif({ type: "idle", message: "" }); }}
                     className="px-4 py-2.5 border border-slate-250 hover:bg-slate-100 text-xs text-slate-600 rounded-xl transition cursor-pointer font-bold"
                   >
                     Reset Form
                   </button>
                   <button 
                     type="button"
                     disabled={parsedDataKolektif.filter(x => x.isValid).length === 0}
                     onClick={processKolektifImportExecute}
                     className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:text-slate-400 disabled:cursor-not-allowed text-xs text-white rounded-xl transition cursor-pointer font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/10"
                   >
                     <CheckCircle size={15} /> Simpan {parsedDataKolektif.filter(x => x.isValid).length} Transaksi Kolektif
                   </button>
                </div>

              </div>

            </div>

          </div>

        </div>
      )}

      {/* --- RECEIPT DIALOG MODAL (CETAK KWITANSI) --- */}
      {showAutoReceipt && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-all animate-fadeIn" id="receipt-modal">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
            
            {/* Modal Actions Header */}
            <div className="px-5 py-3.5 border-b border-light-200 flex justify-between items-center bg-slate-900 text-white print:hidden">
              <h5 className="text-[10px] font-mono font-bold tracking-wider uppercase flex items-center gap-1.5">
                <Receipt className="text-emerald-400" size={15} />
                Pratinjau Kwitansi Pembayaran
              </h5>
              <button 
                onClick={() => setShowAutoReceipt(null)}
                className="text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Receipt Paper Area - Custom printed layout */}
            <div className="p-6 md:p-8 space-y-6 overflow-y-auto bg-white text-slate-800 relative select-none" id="receipt-print-area">
              
              {/* Receipt Watermark decorative */}
              <div className="absolute inset-x-0 top-1/3 flex items-center justify-center pointer-events-none opacity-5 select-none transform rotate-12">
                <Sparkles size={160} className="text-slate-900" />
              </div>

              {/* Header Invoice Header */}
              <div className="text-center space-y-1.5 border-b-2 border-dashed border-slate-200 pb-5">
                <h4 className="text-base font-bold font-sans tracking-tight uppercase">KWITANSI DIGITAL RESMI</h4>
                <p className="text-[10px] text-slate-500 font-mono tracking-wide">PORTAL PEMBAYARAN TAGIHAN ONLINE</p>
                <span className="inline-block px-3 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-md font-mono mt-2 uppercase border border-emerald-100">
                  Status: LUNAS / TERBAYAR
                </span>
              </div>

              {/* Invoice details */}
              <div className="space-y-4 text-xs font-mono">
                
                <div className="flex justify-between">
                  <span className="text-slate-500">NO INVOICE:</span>
                  <strong className="text-slate-900 font-bold">{showAutoReceipt.id}</strong>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">NO REFERENSI:</span>
                  <span className="text-slate-800">{showAutoReceipt.noReff || "-"}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">TANGGAL TRANSAKSI:</span>
                  <span className="text-slate-800">
                    {new Date(showAutoReceipt.tanggalBayar).toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">METODE PEMBAYARAN:</span>
                  <span className="text-slate-800">{showAutoReceipt.metodePembayaran}</span>
                </div>

                {/* Separator line */}
                <div className="border-b border-dashed border-slate-100 py-1"></div>

                {/* Customer lines */}
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">ID CLIENT / PELANGGAN:</span>
                    <span className="text-slate-800">{showAutoReceipt.idPelanggan}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">NAMA PELANGGAN:</span>
                    <strong className="text-slate-900">{showAutoReceipt.namaPelanggan}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">JENIS LAYANAN:</span>
                    <span className="text-slate-800 font-bold">{showAutoReceipt.layanan}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">PERIODE BULAN:</span>
                    <span className="text-slate-800 font-bold">
                      {getMonthLabel(showAutoReceipt.periode.split("-")[1])} {showAutoReceipt.periode.split("-")[0]}
                    </span>
                  </div>
                </div>

                {/* Separator line */}
                <div className="border-b border-dashed border-slate-200 py-1"></div>

                {/* Amount details */}
                <div className="p-3 bg-slate-50/50 rounded-lg flex justify-between items-center border border-slate-100">
                  <span className="font-bold text-slate-700">TOTAL BAYAR:</span>
                  <span className="text-base font-bold text-slate-900 font-mono">
                    {formatRupiah(showAutoReceipt.jumlahBayar)}
                  </span>
                </div>

                {/* Catatan / Description */}
                <div className="text-[10px] text-slate-450 leading-relaxed pt-1 select-text">
                  <strong>Catatan:</strong> {showAutoReceipt.keterangan || "Lunas bayar."}
                </div>

              </div>

              {/* Signatures zone */}
              <div className="grid grid-cols-2 pt-6 text-[10px] font-mono text-center gap-4 text-slate-500 border-t border-slate-100">
                <div>
                  <p className="pb-12">Pelanggan,</p>
                  <p className="font-bold text-slate-800 select-all underline text-[11px]">{showAutoReceipt.namaPelanggan}</p>
                </div>
                <div>
                  <p className="pb-12">Loket Pembayaran,</p>
                  <p className="font-bold text-slate-800 underline text-[11px]">E-Payment Kasir</p>
                </div>
              </div>

              {/* Print Footer Tagline */}
              <div className="text-center text-[9px] text-slate-400 pt-3 flex flex-col items-center gap-0.5 font-mono select-none">
                <span>Simpan lembaran struk kwitansi ini sebagai kuintansi lunas pembayaran sah.</span>
                <span>Terima Kasih Atas Kepercayaan Anda!</span>
              </div>

            </div>

            {/* Modal Actions Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row gap-2 print:hidden">
              <button
                onClick={() => setShowAutoReceipt(null)}
                className="flex-1 py-2.5 border border-slate-250 hover:bg-slate-100 font-semibold text-xs text-slate-650 rounded-xl transition cursor-pointer text-center"
              >
                Tutup Pratinjau
              </button>
              <button
                onClick={() => {
                  if (showAutoReceipt) {
                    const customer = pelangganList.find(p => p.id === showAutoReceipt.idPelanggan);
                    if (customer?.noTelp) {
                      const phone = formatPhoneForWhatsApp(customer.noTelp);
                      const msg = formatWhatsAppMessage(showAutoReceipt);
                      window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`, "_blank");
                    } else {
                      alert("Nomor telepon pelanggan tidak ditemukan.");
                    }
                  }
                }}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition flex justify-center items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-600/10"
              >
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.456 5.704 1.457h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Kirim via WA
              </button>
              <button
                onClick={triggerBrowserPrint}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition flex justify-center items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/10"
              >
                <Printer size={14} />
                Cetak Kwitansi (Sistem)
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
