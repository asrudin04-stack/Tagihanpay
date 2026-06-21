/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from "react";
import { 
  Users, 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  UserPlus, 
  Check, 
  X, 
  Filter,
  Zap,
  Droplet,
  Wifi,
  MapPin,
  Phone,
  Download,
  AlertCircle,
  FileText,
  DollarSign,
  Tag
} from "lucide-react";
import { Pelanggan, BiayaTarif, TanggalPembayaran, formatRupiah } from "../types";

interface MasterPelangganProps {
  pelangganList: Pelanggan[];
  biayaList: BiayaTarif[];
  tanggalList: TanggalPembayaran[];
  onAddPelanggan: (pelanggan: Pelanggan | Pelanggan[]) => void;
  onUpdatePelanggan: (pelanggan: Pelanggan) => void;
  onDeletePelanggan: (id: string) => void;
  onAddBiaya: (biaya: BiayaTarif) => void;
  onUpdateBiaya: (biaya: BiayaTarif) => void;
  onDeleteBiaya: (id: string) => void;
}

export default function MasterPelanggan({
  pelangganList,
  biayaList,
  tanggalList,
  onAddPelanggan,
  onUpdatePelanggan,
  onDeletePelanggan,
  onAddBiaya,
  onUpdateBiaya,
  onDeleteBiaya
}: MasterPelangganProps) {
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [filterLayanan, setFilterLayanan] = useState<string>("SEMUA");

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPelanggan, setEditingPelanggan] = useState<Pelanggan | null>(null);

  // Input states
  const [nama, setNama] = useState("");
  const [noTelp, setNoTelp] = useState("");
  const [alamat, setAlamat] = useState("");
  const [layanan, setLayanan] = useState<'PLN' | 'PDAM' | 'WIFI'>("PLN");
  const [noMeter, setNoMeter] = useState("");
  const [idTarif, setIdTarif] = useState("");
  const [idTanggal, setIdTanggal] = useState("");
  const [nominalTarif, setNominalTarif] = useState<number | "">("");

  // Error validations
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Sub-tab state for merged Pelanggan and Biaya menu
  const [subTab, setSubTab] = useState<'pelanggan' | 'biaya'>('pelanggan');

  // Unified state for managing Biaya (Tariff)
  const [isBiayaFormOpen, setIsBiayaFormOpen] = useState(false);
  const [editingBiaya, setEditingBiaya] = useState<BiayaTarif | null>(null);
  const [biayaLayanan, setBiayaLayanan] = useState<'PLN' | 'PDAM' | 'WIFI'>("PLN");
  const [biayaNamaPaket, setBiayaNamaPaket] = useState("");
  const [biayaNominal, setBiayaNominal] = useState<number>(100000);
  const [biayaErrors, setBiayaErrors] = useState<{ [key: string]: string }>({});

  const handleOpenCreateBiaya = () => {
    setEditingBiaya(null);
    setBiayaLayanan("PLN");
    setBiayaNamaPaket("");
    setBiayaNominal(150000);
    setBiayaErrors({});
    setIsBiayaFormOpen(true);
  };

  const handleOpenEditBiaya = (b: BiayaTarif) => {
    setEditingBiaya(b);
    setBiayaLayanan(b.layanan);
    setBiayaNamaPaket(b.namaPaket);
    setBiayaNominal(b.biayaPerBulan);
    setBiayaErrors({});
    setIsBiayaFormOpen(true);
  };

  const validateBiayaForm = () => {
    const tempErrors: { [key: string]: string } = {};
    if (!biayaNamaPaket.trim()) tempErrors.namaPaket = "Nama paket/tarif bulanan wajib diisi";
    if (biayaNominal <= 0) tempErrors.biayaPerBulan = "Besaran biaya bulanan harus lebih besar dari Rp 0";
    setBiayaErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmitBiaya = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateBiayaForm()) return;

    const data: BiayaTarif = {
      id: editingBiaya ? editingBiaya.id : `TRF-${Math.floor(100 + Math.random() * 900)}`,
      layanan: biayaLayanan,
      namaPaket: biayaNamaPaket.trim(),
      biayaPerBulan: biayaNominal
    };

    if (editingBiaya) {
      onUpdateBiaya(data);
    } else {
      onAddBiaya(data);
    }

    setIsBiayaFormOpen(false);
  };

  // Auto-set matching tariff and due-date when service category changes
  useEffect(() => {
    // Check available tariffs for the chosen category
    const matchingTariffs = biayaList.filter(b => b.layanan === layanan);
    if (matchingTariffs.length > 0) {
      const curTariff = biayaList.find(b => b.id === idTarif);
      if (!curTariff || curTariff.layanan !== layanan) {
        setIdTarif(matchingTariffs[0].id);
        if (!editingPelanggan) {
          setNominalTarif(matchingTariffs[0].biayaPerBulan);
        }
      }
    } else {
      setIdTarif("");
      if (!editingPelanggan) {
        setNominalTarif("");
      }
    }

    // Check available due dates for the chosen category
    const matchingDates = tanggalList.filter(t => t.layanan === layanan);
    if (matchingDates.length > 0) {
      const curDate = tanggalList.find(t => t.id === idTanggal);
      if (!curDate || curDate.layanan !== layanan) {
        setIdTanggal(matchingDates[0].id);
      }
    } else {
      setIdTanggal("");
    }
  }, [layanan, biayaList, tanggalList, editingPelanggan]);

  // --- IMPORT STATE & HELPERS FOR EXCEL/CSV ---
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [rawText, setRawText] = useState("");
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [importStatus, setImportStatus] = useState<{ type: "idle" | "error" | "success"; message: string }>({ type: "idle", message: "" });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const parseTextData = (text: string, format: "csv" | "json") => {
    try {
      if (format === "json") {
        const parsed = JSON.parse(text);
        const list = Array.isArray(parsed) ? parsed : [parsed];
        const sanitized = list.map((item: any) => {
          const l = String(item.layanan || "PLN").toUpperCase().trim() as 'PLN' | 'PDAM' | 'WIFI';
          const rawNominal = item.nominalTarif ?? item.tarifBulanan ?? item.tarif_bulanan ?? item.nominal_tarif ?? item.tarif ?? item.biaya;
          const nominalTarifVal = rawNominal !== undefined && rawNominal !== null && rawNominal !== "" ? Number(rawNominal) : undefined;
          return {
            nama: String(item.nama || "").trim(),
            noTelp: String(item.noTelp || item.no_telp || item.telepon || "").trim(),
            alamat: String(item.alamat || "").trim(),
            layanan: ['PLN', 'PDAM', 'WIFI'].includes(l) ? l : 'PLN',
            noMeter: String(item.noMeter || item.no_meter || item.id_meter || item.meter || "").trim(),
            idTarif: String(item.idTarif || item.id_tarif || item.paket || "").trim() || undefined,
            idTanggal: String(item.idTanggal || item.id_tanggal || item.tanggal || item.jadwal || item.tempo || "").trim() || undefined,
            nominalTarif: (nominalTarifVal !== undefined && !isNaN(nominalTarifVal)) ? nominalTarifVal : undefined
          };
        });
        const validList = sanitized.filter(x => x.nama !== "");
        if (validList.length === 0) {
          setImportStatus({ type: "error", message: "Tidak ada data pelanggan valid yang ditemukan dalam file JSON" });
          setParsedData([]);
        } else {
          setParsedData(validList);
          setImportStatus({ type: "idle", message: "" });
        }
      } else {
        // CSV Parsing
        const lines = text.split(/\r?\n/);
        if (lines.length === 0) {
          setImportStatus({ type: "error", message: "Format file CSV kosong" });
          return;
        }
        
        // Find header row or assume: nama,noTelp,alamat,layanan,noMeter,idTarif,idTanggal
        const headers = lines[0].toLowerCase().split(/[;,]/).map(h => h.trim());
        const dataRows = lines.slice(1);
        
        const results: any[] = [];
        dataRows.forEach((row, idx) => {
          if (!row.trim()) return;
          
          // Basic split, handling optional surrounding quotes
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

          // Match columns by standard index or by header mapping
          let namaVal = "";
          let noTelpVal = "";
          let alamatVal = "";
          let layananVal: 'PLN' | 'PDAM' | 'WIFI' = 'PLN';
          let noMeterVal = "";
          let idTarifVal = "";
          let idTanggalVal = "";
          let nominalTarifVal: number | undefined = undefined;

          const getIndexByHeader = (names: string[], fallbackIdx: number) => {
            const index = headers.findIndex(h => names.some(name => h.includes(name)));
            return index !== -1 ? index : fallbackIdx;
          };

          const namaIdx = getIndexByHeader(["nama"], 0);
          const telpIdx = getIndexByHeader(["telp", "hp", "kontak", "phone", "no"], 1);
          const alamatIdx = getIndexByHeader(["alamat", "address"], 2);
          const layananIdx = getIndexByHeader(["layan"], 3);
          const meterIdx = getIndexByHeader(["meter", "id_meter", "account"], 4);
          const tarifIdx = getIndexByHeader(["tarif", "nominal", "biaya", "harga", "rate"], 5);
          const tanggalIdx = getIndexByHeader(["tanggal", "tempo", "due"], 6);

          namaVal = cleanedCols[namaIdx] || "";
          noTelpVal = cleanedCols[telpIdx] || cleanedCols[1] || "";
          alamatVal = cleanedCols[alamatIdx] || cleanedCols[2] || "";
          
          const rawLayanan = String(cleanedCols[layananIdx] || cleanedCols[3] || "PLN").toUpperCase().trim();
          layananVal = ['PLN', 'PDAM', 'WIFI'].includes(rawLayanan) ? (rawLayanan as 'PLN' | 'PDAM' | 'WIFI') : 'PLN';
          
          noMeterVal = cleanedCols[meterIdx] || cleanedCols[4] || "";
          idTanggalVal = cleanedCols[tanggalIdx] || cleanedCols[6] || "";

          const rawTarifStr = (cleanedCols[tarifIdx] || cleanedCols[5] || "").trim();
          if (rawTarifStr) {
            const digitsOnlyStr = rawTarifStr.replace(/[\s\.\,Rprp]/g, "");
            if (digitsOnlyStr && !isNaN(Number(digitsOnlyStr)) && /^\d+$/.test(digitsOnlyStr)) {
              nominalTarifVal = Number(digitsOnlyStr);
            } else {
              idTarifVal = rawTarifStr;
            }
          }

          if (namaVal) {
            results.push({
              nama: namaVal,
              noTelp: noTelpVal,
              alamat: alamatVal,
              layanan: layananVal,
              noMeter: noMeterVal,
              idTarif: idTarifVal || undefined,
              idTanggal: idTanggalVal || undefined,
              nominalTarif: nominalTarifVal,
            });
          }
        });

        if (results.length === 0) {
          setImportStatus({ type: "error", message: "Tidak ada data baris valid di dalam file CSV" });
          setParsedData([]);
        } else {
          setParsedData(results);
          setImportStatus({ type: "idle", message: "" });
        }
      }
    } catch (err: any) {
      setImportStatus({ type: "error", message: "Gagal memproses parsing data: " + err.message });
      setParsedData([]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = evt.target?.result as string;
        const isJson = file.name.endsWith(".json") || file.type === "application/json";
        parseTextData(text, isJson ? "json" : "csv");
      };
      reader.readAsText(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = evt.target?.result as string;
        const isJson = file.name.endsWith(".json") || file.type === "application/json";
        parseTextData(text, isJson ? "json" : "csv");
      };
      reader.readAsText(file);
    }
  };

  const processImportExecute = () => {
    if (parsedData.length === 0) return;
    
    // Pre-calculate the starting serial number based on max existing numeric ID suffix
    const currentYear = new Date().getFullYear();
    const prefix = `PLG-${currentYear}-`;
    
    let maxNum = 0;
    pelangganList.forEach(p => {
      if (p.id.startsWith(prefix)) {
        const numPart = parseInt(p.id.replace(prefix, ""), 10);
        if (!isNaN(numPart) && numPart > maxNum) {
          maxNum = numPart;
        }
      }
    });

    const newlyCreatedPelanggan: Pelanggan[] = [];

    parsedData.forEach((row, index) => {
      const nextNum = maxNum + 1 + index;
      const paddedNum = String(nextNum).padStart(4, "0");
      const generatedId = `${prefix}${paddedNum}`;

      newlyCreatedPelanggan.push({
        id: generatedId,
        nama: row.nama,
        noTelp: row.noTelp,
        alamat: row.alamat,
        layanan: row.layanan,
        noMeter: row.noMeter,
        idTarif: row.idTarif || undefined,
        idTanggal: row.idTanggal || undefined,
        nominalTarif: row.nominalTarif
      });
    });

    onAddPelanggan(newlyCreatedPelanggan);

    setImportStatus({
      type: "success",
      message: `Berhasil mengimport ${parsedData.length} data pelanggan baru!`
    });
    setParsedData([]);
    
    setTimeout(() => {
      setIsImportOpen(false);
      setImportStatus({ type: "idle", message: "" });
    }, 1800);
  };

  const downloadTemplateCustomerCSV = () => {
    const headers = "nama,noTelp,alamat,layanan,noMeter,tarifBulanan,idTanggal\n";
    const sample = "Joko Susilo,081299998888,Jl. Anggrek No. 10,PLN,53221199028,150000,TGL-001\nSusi Susanti,085522221111,Perum Permai Blok D-2,WIFI,WIFI-IND-9092,275000,TGL-003\nPak Amat,089911110000,Desa Makmur RT 01,PDAM,PAM-887711,95000,TGL-002\n";
    const blob = new Blob([headers + sample], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "template_pelanggan.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Generate automated unique custom ID
  const generateNewId = () => {
    const currentYear = new Date().getFullYear();
    const prefix = `PLG-${currentYear}-`;
    
    // Find highest index among current customers
    let maxNum = 0;
    pelangganList.forEach(p => {
      if (p.id.startsWith(prefix)) {
        const numPart = parseInt(p.id.replace(prefix, ""), 10);
        if (!isNaN(numPart) && numPart > maxNum) {
          maxNum = numPart;
        }
      }
    });

    const nextNum = maxNum + 1;
    const paddedNum = String(nextNum).padStart(4, "0");
    return `${prefix}${paddedNum}`;
  };

  const handleOpenCreateForm = () => {
    setEditingPelanggan(null);
    setNama("");
    setNoTelp("");
    setAlamat("");
    setLayanan("PLN");
    setNoMeter("");
    setIdTarif("");
    setIdTanggal("");
    setNominalTarif("");
    setErrors({});
    setIsFormOpen(true);
  };

  const handleOpenCreateFormForTariff = (b: BiayaTarif) => {
    setEditingPelanggan(null);
    setNama("");
    setNoTelp("");
    setAlamat("");
    setLayanan(b.layanan);
    setNoMeter("");
    setIdTarif(b.id);
    setNominalTarif(b.biayaPerBulan);
    const matchingDates = tanggalList.filter(t => t.layanan === b.layanan);
    setIdTanggal(matchingDates.length > 0 ? matchingDates[0].id : "");
    setErrors({});
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (p: Pelanggan) => {
    setEditingPelanggan(p);
    setNama(p.nama);
    setNoTelp(p.noTelp);
    setAlamat(p.alamat);
    setLayanan(p.layanan);
    setNoMeter(p.noMeter);
    setIdTarif(p.idTarif || "");
    setNominalTarif(p.nominalTarif !== undefined ? p.nominalTarif : "");
    setIdTanggal(p.idTanggal || "");
    setErrors({});
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingPelanggan(null);
  };

  const validateForm = () => {
    const tempErrors: { [key: string]: string } = {};
    if (!nama.trim()) tempErrors.nama = "Nama pelanggan wajib diisi";
    if (!noTelp.trim()) tempErrors.noTelp = "Nomor telepon wajib diisi";
    if (!alamat.trim()) tempErrors.alamat = "Alamat wajib diisi";
    if (!noMeter.trim()) {
      tempErrors.noMeter = layanan === "PLN" ? "Nomor meter listrik wajib diisi" :
                           layanan === "PDAM" ? "Nomor rekening air wajib diisi" :
                           "Nomor Pelanggan WIFI wajib diisi";
    }
    if (nominalTarif === "" || isNaN(Number(nominalTarif)) || Number(nominalTarif) < 0) {
      tempErrors.nominalTarif = "Nominal Tarif bulanan harus diisi dengan angka valid >= Rp 0";
    }
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (editingPelanggan) {
      // Update action
      onUpdatePelanggan({
        ...editingPelanggan,
        nama: nama.trim(),
        noTelp: noTelp.trim(),
        alamat: alamat.trim(),
        layanan,
        noMeter: noMeter.trim(),
        idTarif: idTarif || undefined,
        idTanggal: idTanggal || undefined,
        nominalTarif: nominalTarif !== "" ? Number(nominalTarif) : undefined
      });
    } else {
      // Create action
      const newId = generateNewId();
      onAddPelanggan({
        id: newId,
        nama: nama.trim(),
        noTelp: noTelp.trim(),
        alamat: alamat.trim(),
        layanan,
        noMeter: noMeter.trim(),
        idTarif: idTarif || undefined,
        idTanggal: idTanggal || undefined,
        nominalTarif: nominalTarif !== "" ? Number(nominalTarif) : undefined
      });
    }

    setIsFormOpen(false);
  };

  // Filter and search computation
  const filteredList = useMemo(() => {
    return pelangganList.filter(p => {
      const matchSearch = 
        p.nama.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.noMeter.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchLayanan = filterLayanan === "SEMUA" || p.layanan === filterLayanan;
      
      return matchSearch && matchLayanan;
    });
  }, [pelangganList, searchTerm, filterLayanan]);

  return (
    <div className="space-y-6">
      
      <>
          {/* Header and Add Action */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
            <Users size={24} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">Data Master Pelanggan</h3>
            <p className="text-xs text-slate-500">Kelola informasi pelanggan PLN, PDAM, dan WIFI secara lengkap</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button 
            onClick={() => setIsImportOpen(true)}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-xl flex items-center gap-2 transition"
            id="import-pelanggan-btn"
          >
            <Download size={16} className="rotate-180" /> Import CSV/Excel
          </button>
          <button 
            onClick={handleOpenCreateForm}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 font-medium text-xs text-white rounded-xl flex items-center gap-2 transition"
            id="add-pelanggan-btn"
          >
            <UserPlus size={16} /> Add Pelanggan baru
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
        {/* Search input */}
        <div className="relative md:col-span-8">
          <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
          <input 
            type="text"
            placeholder="Cari ID, Nama Pelanggan, atau No ID Meteran..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-4 py-1.5 w-full bg-slate-50 text-xs border border-slate-250 rounded-lg focus:outline-hidden focus:border-indigo-600 text-slate-700"
          />
        </div>

        {/* Filter select */}
        <div className="relative md:col-span-4 flex items-center gap-2">
          <Filter size={14} className="text-slate-400" />
          <select 
            value={filterLayanan}
            onChange={(e) => setFilterLayanan(e.target.value)}
            className="py-1.5 w-full bg-slate-50 text-xs border border-slate-250 rounded-lg focus:outline-hidden focus:border-indigo-505 font-medium text-slate-750"
          >
            <option value="SEMUA">Semua Jenis Layanan</option>
            <option value="PLN">Kategori PLN (Listrik)</option>
            <option value="PDAM">Kategori PDAM (Air)</option>
            <option value="WIFI">Kategori WIFI (Internet)</option>
          </select>
        </div>
      </div>

      {/* Customer Form Modal Overlay */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-all animate-fadeIn" id="pelanggan-modal">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-50 overflow-hidden transform scale-100 transition-all">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white">
              <h4 className="text-xs font-bold font-mono tracking-wider uppercase">
                {editingPelanggan ? "Edit Data Pelanggan" : "Tambah Pelanggan Baru"}
              </h4>
              <button onClick={handleCloseForm} className="text-slate-400 hover:text-white transition">
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              
              {/* Automated generated ID Indicator */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex justify-between items-center mb-2">
                <span className="text-[10px] uppercase font-mono text-slate-450 tracking-wider font-semibold">Generate ID Pelanggan</span>
                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-mono font-bold rounded-md border border-indigo-100">
                  {editingPelanggan ? editingPelanggan.id : generateNewId()}
                </span>
              </div>

              {/* Nama Input */}
              <div className="space-y-1">
                <label className="text-[11px] font-mono uppercase text-slate-500 font-semibold">Nama Lengkap Pelanggan</label>
                <input 
                  type="text"
                  placeholder="Contoh: Muhammad Ali"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-250 rounded-lg focus:outline-hidden focus:border-indigo-650 text-slate-700 bg-white"
                />
                {errors.nama && <p className="text-[10px] text-rose-500 mt-1">{errors.nama}</p>}
              </div>

              {/* No Telp Input */}
              <div className="space-y-1">
                <label className="text-[11px] font-mono uppercase text-slate-500 font-semibold">Nomor Telepon / WhatsApp</label>
                <input 
                  type="text"
                  placeholder="Contoh: 08123456789"
                  value={noTelp}
                  onChange={(e) => setNoTelp(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-250 rounded-lg focus:outline-hidden focus:border-indigo-650 text-slate-700 bg-white"
                />
                {errors.noTelp && <p className="text-[10px] text-rose-500 mt-1">{errors.noTelp}</p>}
              </div>

              {/* Alamat Input */}
              <div className="space-y-1">
                <label className="text-[11px] font-mono uppercase text-slate-500 font-semibold">Alamat Lengkap</label>
                <textarea 
                  rows={2}
                  placeholder="Contoh: Jalan Melati Raya No. 10B, RT 01/RW 03"
                  value={alamat}
                  onChange={(e) => setAlamat(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-250 rounded-lg focus:outline-hidden focus:border-indigo-650 text-slate-700 bg-white"
                />
                {errors.alamat && <p className="text-[10px] text-rose-500 mt-1">{errors.alamat}</p>}
              </div>

              {/* Layanan & No Meter */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Layanan Dropdown */}
                <div className="space-y-1">
                  <label className="text-[11px] font-mono uppercase text-slate-500 font-semibold">Layanan berlangganan</label>
                  <select 
                    value={layanan}
                    onChange={(e) => setLayanan(e.target.value as 'PLN' | 'PDAM' | 'WIFI')}
                    className="w-full text-xs p-2 border border-slate-250 rounded-lg focus:outline-hidden focus:border-indigo-650 text-slate-700 bg-white font-medium"
                  >
                    <option value="PLN">PLN (Listrik)</option>
                    <option value="PDAM">PDAM (Air Bersih)</option>
                    <option value="WIFI">WIFI (Internet Direct)</option>
                  </select>
                </div>

                {/* No Meter Account */}
                <div className="space-y-1">
                  <label className="text-[11px] font-mono uppercase text-slate-500 font-semibold">
                    {layanan === "PLN" ? "No ID Meter Litrik" : 
                     layanan === "PDAM" ? "No Rekening Air" : 
                     "ID Pelanggan WIFI"}
                  </label>
                  <input 
                    type="text"
                    placeholder="Contoh: 53229811090"
                    value={noMeter}
                    onChange={(e) => setNoMeter(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-250 rounded-lg focus:outline-hidden focus:border-indigo-650 text-slate-700 bg-white"
                  />
                  {errors.noMeter && <p className="text-[10px] text-rose-500 mt-1">{errors.noMeter}</p>}
                </div>

              </div>

              {/* Profil Tagihan (Tarif & Jatuh Tempo) Section */}
              <div className="pt-3.5 border-t border-slate-100 space-y-3" id="profil-tagihan-form-section">
                <div className="flex items-center gap-1.5 text-slate-800 font-bold text-xs">
                  <span className="p-1 px-1.5 bg-indigo-50 text-indigo-700 text-[10px] font-mono rounded-md shrink-0">PROFIL TAGIHAN</span>
                  <span className="text-[11px] text-slate-500 font-medium truncate">Atur kustom tarif & tanggal tagihan</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Nominal Tarif Custom */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-mono uppercase text-slate-500 font-semibold block">Nominal Tarif Bulanan (Rp)</label>
                    <input 
                      type="number"
                      min={0}
                      placeholder="Contoh: 150000"
                      value={nominalTarif}
                      onChange={(e) => setNominalTarif(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full text-xs px-3 py-2 border border-slate-250 rounded-lg focus:outline-hidden focus:border-indigo-650 text-slate-700 bg-white font-mono font-semibold"
                    />
                    {errors.nominalTarif && <p className="text-[10px] text-rose-500 mt-1">{errors.nominalTarif}</p>}
                  </div>

                  {/* Pilihan Tanggal Jatuh Tempo */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-mono uppercase text-slate-500 font-semibold block">Jadwal Jatuh Tempo</label>
                    <select
                      value={idTanggal}
                      onChange={(e) => setIdTanggal(e.target.value)}
                      className="w-full text-xs p-2 border border-slate-250 rounded-lg focus:outline-hidden focus:border-indigo-650 text-slate-750 bg-white font-medium"
                    >
                      <option value="">-- Gunakan Jatuh Tempo Standar --</option>
                      {tanggalList
                        .filter((t) => t.layanan === layanan)
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.namaJadwal} (Tgl {t.tanggalJatuhTempo})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={handleCloseForm}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/10"
                >
                  <Check size={14} /> Simpan Data
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Customer Import Modal Overlay */}
      {isImportOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-all animate-fadeIn font-sans" id="import-pelanggan-modal">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-100 overflow-hidden transform scale-100 transition-all flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white shrink-0">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-indigo-400" />
                <h4 className="text-xs font-bold font-mono tracking-wider uppercase">
                  Import Data Pelanggan Massal
                </h4>
              </div>
              <button onClick={() => { setIsImportOpen(false); setParsedData([]); setImportStatus({ type: "idle", message: "" }); }} className="text-slate-400 hover:text-white transition">
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-4">
              
              {/* Instructions Callout */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-650 space-y-2">
                <h5 className="font-bold text-slate-800 flex items-center gap-1.5">
                  <AlertCircle size={14} className="text-indigo-600" /> Petunjuk Format Import
                </h5>
                <p>
                  Sistem mendukung file format <strong className="text-slate-800">CSV (.csv)</strong> atau <strong className="text-slate-800">JSON (.json)</strong>. Kolom pertama dokumen wajib berupa baris header berikut:
                </p>
                <div className="bg-slate-900 text-indigo-300 p-2 rounded-md font-mono text-[10px] select-all">
                  nama,noTelp,alamat,layanan,noMeter
                </div>
                <div className="text-[11px] space-y-1">
                  <p>• <strong className="text-slate-700">layanan</strong> diisi dengan salah satu: <span className="text-indigo-700 font-semibold font-mono">PLN</span>, <span className="text-indigo-700 font-semibold font-mono">PDAM</span>, atau <span className="text-indigo-700 font-semibold font-mono">WIFI</span></p>
                  <p>• <strong className="text-slate-700">ID Pelanggan otomatis</strong> akan digenerate berurutan oleh sistem billing TagihanPay.</p>
                </div>

                <div className="pt-2">
                  <button 
                    type="button"
                    onClick={downloadTemplateCustomerCSV}
                    className="inline-flex items-center gap-1 bg-white hover:bg-slate-100 text-[11px] font-bold text-indigo-700 px-3 py-1.5 border border-slate-250 rounded-lg transition"
                  >
                    <Download size={12} /> Unduh Template CSV Pelanggan
                  </button>
                </div>
              </div>

              {/* Drag and Drop Zone Container */}
              <div 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-6 text-center transition cursor-pointer flex flex-col items-center justify-center ${
                  dragActive ? "border-indigo-600 bg-indigo-50/20" : "border-slate-300 hover:border-indigo-505 bg-slate-50/50"
                }`}
                onClick={() => document.getElementById("customer-import-file")?.click()}
              >
                <input 
                  type="file" 
                  id="customer-import-file" 
                  accept=".csv,.json" 
                  onChange={handleFileChange}
                  className="hidden" 
                />
                <div className="p-3 bg-white rounded-full shadow-xs text-slate-400 mb-2">
                  <FileText size={24} className="text-indigo-600" />
                </div>
                <p className="text-xs font-bold text-slate-700">
                  Seret & Letakkan file CSV/JSON di sini, atau <span className="text-indigo-600">Pilih File komputer</span>
                </p>
                <p className="text-[10px] text-slate-400 mt-1">Maksimal file size 5MB (Format .csv atau .json)</p>
              </div>

              {/* Manual text block pasting */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-slate-450 font-semibold block">ATAU TEMPELKAN TEKS CSV DI SINI</label>
                <textarea 
                  rows={2}
                  placeholder="nama,noTelp,alamat,layanan,noMeter&#13;&#10;Achmad,081223,Demak,PLN,11992200&#13;&#10;Zubaidah,087723,Kudus,PDAM,PAM998822"
                  value={rawText}
                  onChange={(e) => {
                    setRawText(e.target.value);
                    if (e.target.value.trim()) {
                      parseTextData(e.target.value, "csv");
                    } else {
                      setParsedData([]);
                    }
                  }}
                  className="w-full text-[11px] font-mono px-3 py-2 border border-slate-250 rounded-lg focus:outline-hidden focus:border-indigo-650 text-slate-700 bg-white"
                />
              </div>

              {/* Parsed Preview Table */}
              {parsedData.length > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center bg-emerald-50 text-emerald-800 p-2.5 rounded-lg text-xs font-bold border border-emerald-100">
                    <span className="flex items-center gap-1">
                      <Check size={14} /> Terbaca {parsedData.length} baris data siap diproses.
                    </span>
                    <button 
                      onClick={() => setParsedData([])} 
                      className="text-emerald-500 hover:text-emerald-800 underline uppercase text-[10px]"
                    >
                      Reset
                    </button>
                  </div>

                  <div className="border border-slate-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-900 text-white font-mono text-[9px] uppercase tracking-wider sticky top-0">
                        <tr>
                          <th className="p-2 pl-3">Nama</th>
                          <th className="p-2">Kontak</th>
                          <th className="p-2">Layanan</th>
                          <th className="p-2">No ID Meter</th>
                          <th className="p-2">Tarif Bulanan</th>
                          <th className="p-2 pr-3">ID Jatuh Tempo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-650 bg-white">
                        {parsedData.map((row, index) => (
                          <tr key={index} className="hover:bg-slate-50">
                            <td className="p-2 pl-3 font-semibold text-slate-800">{row.nama}</td>
                            <td className="p-2 font-mono">{row.noTelp}</td>
                            <td className="p-2">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                row.layanan === "PLN" ? "bg-amber-100 text-amber-800" :
                                row.layanan === "PDAM" ? "bg-blue-100 text-blue-800" :
                                "bg-purple-100 text-purple-800"
                              }`}>
                                {row.layanan}
                              </span>
                            </td>
                            <td className="p-2 font-mono font-semibold">{row.noMeter}</td>
                            <td className="p-2 font-mono text-slate-550 font-medium">
                              {row.nominalTarif !== undefined && row.nominalTarif !== null
                                ? <span className="text-indigo-700 font-bold">{formatRupiah(row.nominalTarif)}</span>
                                : (row.idTarif || <span className="text-slate-350 italic">Default</span>)}
                            </td>
                            <td className="p-2 pr-3 font-mono text-slate-550 font-medium">{row.idTanggal || <span className="text-slate-350 italic">Default</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Status Notice Display */}
              {importStatus.type !== "idle" && (
                <div className={`p-3.5 rounded-xl border text-xs font-semibold ${
                  importStatus.type === "success" 
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
                    : "bg-rose-50 text-rose-800 border-rose-200"
                }`}>
                  <p className="flex items-center gap-2">
                    {importStatus.type === "success" ? <Check size={15} /> : <AlertCircle size={15} />}
                    {importStatus.message}
                  </p>
                </div>
              )}

            </div>

            {/* Modal Actions */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 justify-end flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => { setIsImportOpen(false); setParsedData([]); setImportStatus({ type: "idle", message: "" }); }}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 bg-white hover:bg-slate-100 border border-slate-205 rounded-xl transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={parsedData.length === 0}
                onClick={processImportExecute}
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:text-slate-400 disabled:cursor-not-allowed rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-indigo-600/10"
              >
                <Check size={15} /> Proses Simpan ke Database ({parsedData.length})
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Customer Cards Grid / Table List */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden" id="pelanggan-data-container">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-slate-600">
             <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-mono uppercase tracking-wider text-slate-500">
                <th className="p-4 pl-6 font-bold">INFO PELANGGAN</th>
                <th className="p-4 font-bold">KONTAK</th>
                <th className="p-4 font-bold">ALAMAT</th>
                <th className="p-4 font-bold">LAYANAN UTAMA</th>
                <th className="p-4 font-bold">NOMOR / REK METERAN</th>
                <th className="p-4 font-bold">PROFIL TAGIHAN</th>
                <th className="p-4 pr-6 text-right font-bold">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredList.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/50 transition">
                  {/* info */}
                  <td className="p-4 pl-6">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center font-bold text-indigo-700 text-xs">
                        {p.nama.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800">{p.nama}</h4>
                        <span className="font-mono text-[10px] text-slate-400 font-semibold">{p.id}</span>
                      </div>
                    </div>
                  </td>
                  
                  {/* kontak */}
                  <td className="p-4 text-slate-700">
                    <span className="flex items-center gap-1 font-mono">
                      <Phone size={12} className="text-slate-400" />
                      {p.noTelp}
                    </span>
                  </td>

                  {/* alamat */}
                  <td className="p-4 max-w-[200px] text-slate-500">
                    <span className="flex items-start gap-1 line-clamp-2" title={p.alamat}>
                      <MapPin size={12} className="text-slate-400 mt-0.5 shrink-0" />
                      {p.alamat}
                    </span>
                  </td>

                  {/* layanan */}
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold uppercase ${
                      p.layanan === "PLN" ? "bg-amber-50 text-amber-600 border border-amber-100" :
                      p.layanan === "PDAM" ? "bg-blue-50 text-blue-600 border border-blue-100" :
                      "bg-purple-50 text-purple-600 border border-purple-100"
                    }`}>
                      {p.layanan === "PLN" && <Zap size={11} fill="currentColor" />}
                      {p.layanan === "PDAM" && <Droplet size={11} />}
                      {p.layanan === "WIFI" && <Wifi size={11} />}
                      {p.layanan}
                    </span>
                  </td>

                  {/* no meter */}
                  <td className="p-4 font-mono font-bold text-slate-700 text-[11px]">
                    {p.noMeter}
                  </td>

                  {/* profil tagihan */}
                  <td className="p-4 leading-normal">
                    {(() => {
                      const dt = p.idTanggal ? tanggalList.find(tg => tg.id === p.idTanggal) : tanggalList.find(tg => tg.layanan === p.layanan);
                      const displayNominal = p.nominalTarif !== undefined && p.nominalTarif !== null && p.nominalTarif >= 0
                        ? p.nominalTarif
                        : (p.idTarif ? biayaList.find(b => b.id === p.idTarif) : biayaList.find(b => b.layanan === p.layanan))?.biayaPerBulan || 0;
                      
                      return (
                        <div className="space-y-0.5">
                          <div className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5">
                            <span>Tarif Bulanan</span>
                          </div>
                          <div className="font-mono text-[10px] text-slate-500 flex items-center gap-1 font-semibold flex-wrap">
                            <span className="text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded text-[9px] font-black">
                              {formatRupiah(displayNominal)}
                            </span>
                            <span>•</span>
                            <span className="text-rose-600 font-bold bg-rose-50 px-1 py-0.5 rounded text-[9px]">
                              Tgl {dt ? dt.tanggalJatuhTempo : "15"}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </td>

                  {/* aksi */}
                  <td className="p-4 pr-6 text-right">
                    <div className="flex justify-end gap-1.5">
                      <button 
                        onClick={() => handleOpenEditForm(p)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                        title="Edit Data"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button 
                        onClick={() => {
                          if (confirm(`Apakah Anda yakin ingin menghapus pelanggan "${p.nama}"?`)) {
                            onDeletePelanggan(p.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Hapus Data"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredList.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400 text-xs">
                    Pelanggan tidak ditemukan. Masukkan kata kunci lain atau daftarkan pelanggan baru.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>

    {false && (
      <div className="space-y-6">
        {/* Header Panel */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-650 rounded-xl">
              <DollarSign size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Master Biaya & Tarif Tagihan Bulanan</h3>
              <p className="text-xs text-slate-500">Atur nominal besaran biaya per bulan untuk penawaran paket layanan pelanggan secara kustom</p>
            </div>
          </div>
          <button 
            onClick={handleOpenCreateBiaya}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 font-medium text-xs text-white rounded-xl flex items-center gap-2 transition cursor-pointer font-semibold shadow-xs"
            id="add-biaya-btn"
          >
            <Plus size={16} /> Tambah Paket Tarif Baru
          </button>
        </div>

        {/* Tariffs List Section */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden" id="biaya-table-section">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-4 px-6">Jenis Tarif & Layanan</th>
                  <th className="py-4 px-6 text-right">Nominal Bulanan</th>
                  <th className="py-4 px-6">Nama Pelanggan Terdaftar (Bisa Tambah/Edit/Hapus)</th>
                  <th className="py-4 px-6 text-center">Aksi Tarif</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {biayaList.map((b) => {
                  // Find all customers connected to this specific tariff package
                  const assignedCustomers = pelangganList.filter(p => p.idTarif === b.id);
                  
                  return (
                    <tr key={b.id} className="hover:bg-slate-50/50 transition duration-150">
                      {/* Jenis Tarif & Layanan */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <span className={`p-2 rounded-xl text-xs flex items-center justify-center ${
                            b.layanan === "PLN" ? "bg-amber-50 text-amber-600 border border-amber-100" :
                            b.layanan === "PDAM" ? "bg-blue-50 text-blue-600 border border-blue-100" :
                            "bg-purple-50 text-purple-600 border border-purple-100"
                          }`}>
                            {b.layanan === "PLN" && <Zap size={14} fill="currentColor" />}
                            {b.layanan === "PDAM" && <Droplet size={14} />}
                            {b.layanan === "WIFI" && <Wifi size={14} />}
                          </span>
                          <div>
                            <div className="font-bold text-slate-800 text-xs">{b.namaPaket}</div>
                            <div className="text-[10px] text-slate-450 font-mono font-bold uppercase tracking-wide">
                              ID: {b.id} • {b.layanan}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Nominal / Harga */}
                      <td className="py-4 px-6 text-right font-mono text-xs font-black text-slate-755">
                        {formatRupiah(b.biayaPerBulan)}
                      </td>

                      {/* Nama Pelanggan Terkait (dengan CRUD) */}
                      <td className="py-4 px-6">
                        <div className="space-y-3 py-1">
                          {assignedCustomers.length > 0 ? (
                            <div className="flex flex-wrap gap-2 max-w-xl">
                              {assignedCustomers.map((p) => (
                                <div 
                                  key={p.id}
                                  className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200/85 border border-slate-200 py-1 pl-3 pr-2 rounded-full transition text-[11px] text-slate-700 font-semibold shadow-2xs"
                                >
                                  <span>{p.nama}</span>
                                  <span className="font-mono text-[9px] text-slate-400">({p.id})</span>
                                  <div className="flex items-center gap-1 border-l border-slate-250 pl-2 ml-1.5">
                                    <button 
                                      onClick={() => handleOpenEditForm(p)}
                                      className="p-0.5 text-indigo-650 hover:bg-indigo-650 hover:text-white rounded-md transition cursor-pointer"
                                      title={`Ubah data pelanggan ${p.nama}`}
                                    >
                                      <Edit3 size={10} />
                                    </button>
                                    <button 
                                      onClick={() => {
                                        if (confirm(`Apakah Anda yakin ingin menghapus pelanggan "${p.nama}"?`)) {
                                          onDeletePelanggan(p.id);
                                        }
                                      }}
                                      className="p-0.5 text-rose-600 hover:bg-rose-600 hover:text-white rounded-md transition cursor-pointer"
                                      title={`Hapus pelanggan ${p.nama}`}
                                    >
                                      <Trash2 size={10} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic block">Belum ada pelanggan dengan tarif ini</span>
                          )}

                          {/* Action to immediately ADD a customer pre-filled with this tariff */}
                          <button
                            onClick={() => handleOpenCreateFormForTariff(b)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 rounded-lg text-[10px] font-bold tracking-wide transition cursor-pointer shadow-2xs"
                          >
                            <Plus size={11} /> Tambah Pelanggan Baru
                          </button>
                        </div>
                      </td>

                      {/* Aksi Tarif */}
                      <td className="py-4 px-6 text-center">
                        <div className="flex justify-center gap-1.5">
                          <button 
                            onClick={() => handleOpenEditBiaya(b)}
                            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 rounded-xl transition cursor-pointer"
                            title="Ubah Tarif"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button 
                            onClick={() => {
                              if (confirm(`Apakah Anda yakin ingin menghapus paket tarif "${b.namaPaket}"?`)) {
                                onDeleteBiaya(b.id);
                              }
                            }}
                            className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 rounded-xl transition cursor-pointer"
                            title="Hapus Tarif"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {biayaList.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-400 text-xs font-medium">
                      Belum ada data paket tarif bulanan tercatat. Tambahkan tarif baru untuk memulai.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )}

    {/* Biaya Form CRUD Overlay Modal */}
    {false && (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-all" id="biaya-modal">
        <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white">
            <h4 className="text-xs font-bold font-mono tracking-wider uppercase">
              {editingBiaya ? "Ubah Data Tarif Bulanan" : "Tambah Tarif Bulanan Baru"}
            </h4>
            <button onClick={() => setIsBiayaFormOpen(false)} className="text-slate-400 hover:text-white transition cursor-pointer">
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmitBiaya} className="p-6 space-y-4">
            
            {/* Jenis Layanan */}
            <div className="space-y-1">
              <label className="text-[11px] font-mono uppercase text-slate-500 font-semibold block">Jenis Layanan</label>
              <div className="grid grid-cols-3 gap-2">
                {(["PLN", "PDAM", "WIFI"] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setBiayaLayanan(l)}
                    className={`py-2 px-3 text-xs font-bold rounded-lg border text-center transition flex justify-center items-center gap-1.5 cursor-pointer ${
                      biayaLayanan === l 
                        ? "bg-slate-900 text-white border-slate-900 font-black shadow-xs" 
                        : "bg-white text-slate-650 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {l === "PLN" && <Zap size={12} />}
                    {l === "PDAM" && <Droplet size={12} />}
                    {l === "WIFI" && <Wifi size={12} />}
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Nama Paket */}
            <div className="space-y-1">
              <label className="text-[11px] font-mono uppercase text-slate-500 font-semibold">Nama Paket / Tarif</label>
              <input 
                type="text"
                placeholder="Contoh: Unlimited Fiber Home - 50 Mbps"
                value={biayaNamaPaket}
                onChange={(e) => setBiayaNamaPaket(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-250 rounded-lg focus:outline-hidden focus:border-indigo-650 text-slate-700 bg-white"
              />
              {biayaErrors.namaPaket && <p className="text-[10px] text-rose-500 mt-1">{biayaErrors.namaPaket}</p>}
            </div>

            {/* Besaran tarif */}
            <div className="space-y-1">
              <label className="text-[11px] font-mono uppercase text-slate-500 font-semibold">Nominal Biaya per Bulan (Rupiah)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-mono font-bold">Rp</span>
                <input 
                  type="number"
                  placeholder="Contoh: 275000"
                  value={biayaNominal === 0 ? "" : biayaNominal}
                  onChange={(e) => setBiayaNominal(parseInt(e.target.value) || 0)}
                  className="w-full text-xs pl-8 pr-4 py-2 border border-slate-250 rounded-lg focus:outline-hidden focus:border-indigo-650 text-slate-750 font-bold font-mono bg-white"
                />
              </div>
              {biayaErrors.biayaPerBulan && <p className="text-[10px] text-rose-500 mt-1">{biayaErrors.biayaPerBulan}</p>}
            </div>

            {/* Actions Footer */}
            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <button 
                type="button"
                onClick={() => setIsBiayaFormOpen(false)}
                className="px-4 py-2 border border-slate-300 text-slate-650 hover:bg-slate-50 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button 
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/10"
              >
                <Check size={14} /> Simpan Tarif
              </button>
            </div>

          </form>
        </div>
      </div>
    )}

    </div>
  );
}
