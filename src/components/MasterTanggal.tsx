/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  CalendarDays, 
  Plus, 
  Edit3, 
  Trash2, 
  X, 
  Check, 
  AlertCircle,
  Zap,
  Droplet,
  Wifi
} from "lucide-react";
import { TanggalPembayaran } from "../types";

interface MasterTanggalProps {
  tanggalList: TanggalPembayaran[];
  onAddTanggal: (tanggal: TanggalPembayaran) => void;
  onUpdateTanggal: (tanggal: TanggalPembayaran) => void;
  onDeleteTanggal: (id: string) => void;
}

export default function MasterTanggal({
  tanggalList,
  onAddTanggal,
  onUpdateTanggal,
  onDeleteTanggal
}: MasterTanggalProps) {
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTanggal, setEditingTanggal] = useState<TanggalPembayaran | null>(null);

  // Form input fields
  const [layanan, setLayanan] = useState<'PLN' | 'PDAM' | 'WIFI'>("PLN");
  const [namaJadwal, setNamaJadwal] = useState("");
  const [tanggalJatuhTempo, setTanggalJatuhTempo] = useState<number>(10);
  const [bulanAktif, setBulanAktif] = useState("Setiap Bulan");

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleOpenCreate = () => {
    setEditingTanggal(null);
    setLayanan("PLN");
    setNamaJadwal("");
    setTanggalJatuhTempo(10);
    setBulanAktif("Setiap Bulan");
    setErrors({});
    setIsFormOpen(true);
  };

  const handleOpenEdit = (t: TanggalPembayaran) => {
    setEditingTanggal(t);
    setLayanan(t.layanan);
    setNamaJadwal(t.namaJadwal);
    setTanggalJatuhTempo(t.tanggalJatuhTempo);
    setBulanAktif(t.bulanAktif);
    setErrors({});
    setIsFormOpen(true);
  };

  const validateForm = () => {
    const tempErrors: { [key: string]: string } = {};
    if (!namaJadwal.trim()) tempErrors.namaJadwal = "Nama jadwal penolakan/jatuh tempo wajib diisi";
    if (tanggalJatuhTempo < 1 || tanggalJatuhTempo > 31) {
      tempErrors.tanggalJatuhTempo = "Tanggal jatuh tempo harus di antara rentang 1 - 31";
    }
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const data: TanggalPembayaran = {
      id: editingTanggal ? editingTanggal.id : `TGL-${Math.floor(100 + Math.random() * 900)}`,
      layanan,
      namaJadwal: namaJadwal.trim(),
      tanggalJatuhTempo,
      bulanAktif
    };

    if (editingTanggal) {
      onUpdateTanggal(data);
    } else {
      onAddTanggal(data);
    }

    setIsFormOpen(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-sky-50 text-sky-600 rounded-xl">
            <CalendarDays size={24} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">Urus Tanggal Pembayaran & Jadwal</h3>
            <p className="text-xs text-slate-500">Konfigurasi batas/jatuh tempo pembayaran tagihan bulanan</p>
          </div>
        </div>
        <button 
          onClick={handleOpenCreate}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 font-medium text-xs text-white rounded-xl flex items-center gap-2"
          id="add-tanggal-btn"
        >
          <Plus size={16} /> Tambah Jadwal Baru
        </button>
      </div>

      {/* Info Card Alert (Aesthetic pairing) */}
      <div className="bg-amber-50 border border-amber-200/50 p-4 rounded-xl text-xs text-amber-800 flex items-start gap-2.5">
        <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-bold">Info Jatuh Tempo</span>
          <p className="text-amber-700 leading-relaxed">
            Sistem secara otomatis mengelompokkan tagihan bertanda merah apabila pelanggan melewati tanggal jatuh tempo yang diatur di bawah ini untuk periode bulan aktif berjalan.
          </p>
        </div>
      </div>

      {/* Scheduled Configuration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5" id="tanggal-list-grid">
        {tanggalList.map((t) => (
          <div 
            key={t.id} 
            className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col justify-between hover:border-slate-300 transition duration-300 relative group"
          >
            {/* Service Badge Top */}
            <div className="p-5 pb-4 border-b border-slate-50 space-y-3.5">
              <div className="flex justify-between items-start">
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[9px] font-bold uppercase ${
                  t.layanan === "PLN" ? "bg-amber-50 text-amber-600" :
                  t.layanan === "PDAM" ? "bg-blue-50 text-blue-600" :
                  "bg-purple-50 text-purple-600"
                }`}>
                  {t.layanan === "PLN" && <Zap size={9} fill="currentColor" />}
                  {t.layanan === "PDAM" && <Droplet size={9} />}
                  {t.layanan === "WIFI" && <Wifi size={9} />}
                  {t.layanan}
                </span>

                <span className="text-[10px] text-slate-400 font-mono font-bold uppercase">{t.id}</span>
              </div>

              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-800 leading-snug">{t.namaJadwal}</h4>
                <p className="text-[10px] text-slate-500 font-mono">Bulan Berlaku: {t.bulanAktif}</p>
              </div>
            </div>

            {/* Target Date Container */}
            <div className="p-5 bg-slate-50/50 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-450 uppercase font-mono tracking-wider font-semibold block">Hari Jatuh Tempo</span>
                <span className="text-lg font-bold text-slate-800">
                  Tanggal {t.tanggalJatuhTempo} <span className="text-xs font-normal text-slate-500">tiap bulan</span>
                </span>
              </div>

              {/* Edit/Delete Actions */}
              <div className="flex gap-1">
                <button 
                  onClick={() => handleOpenEdit(t)}
                  className="p-1.5 bg-white text-slate-500 hover:text-indigo-600 rounded-lg hover:shadow-xs transition border border-slate-200"
                  title="Ubah Konfigurasi"
                >
                  <Edit3 size={13} />
                </button>
                <button 
                  onClick={() => {
                    if (confirm(`Apakah Anda yakin ingin menghapus jadwal pembayaran ini?`)) {
                      onDeleteTanggal(t.id);
                    }
                  }}
                  className="p-1.5 bg-white text-slate-500 hover:text-rose-600 rounded-lg hover:shadow-xs transition border border-slate-200"
                  title="Hapus Konfigurasi"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          </div>
        ))}

        {tanggalList.length === 0 && (
          <div className="col-span-full border-2 border-dashed border-slate-200 p-12 text-center rounded-2xl bg-white text-slate-400 text-xs">
            Belum ada tanggal jatuh tempo pembayaran yang ditentukan.
          </div>
        )}
      </div>

      {/* Modal CRUD Form */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-all" id="tanggal-modal">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white">
              <h4 className="text-xs font-bold font-mono tracking-wider uppercase">
                {editingTanggal ? "Ubah Jadwal Pembayaran" : "Jadwal Pembayaran Baru"}
              </h4>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-white transition">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              
              {/* Layanan */}
              <div className="space-y-1">
                <label className="text-[11px] font-mono uppercase text-slate-500 font-semibold block">Jenis Layanan Tagihan</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["PLN", "PDAM", "WIFI"] as const).map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setLayanan(l)}
                      className={`py-2 px-3 text-xs font-bold rounded-lg border text-center transition flex justify-center items-center gap-1.5 cursor-pointer ${
                        layanan === l 
                          ? "bg-slate-900 text-white border-slate-900" 
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

              {/* Nama Jadwal */}
              <div className="space-y-1">
                <label className="text-[11px] font-mono uppercase text-slate-500 font-semibold">Nama Pengingat / Jadwal</label>
                <input 
                  type="text"
                  placeholder="Contoh: Jatuh Tempo PLN R1 Bulanan"
                  value={namaJadwal}
                  onChange={(e) => setNamaJadwal(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-250 rounded-lg focus:outline-hidden focus:border-indigo-650 text-slate-700 bg-white"
                />
                {errors.namaJadwal && <p className="text-[10px] text-rose-500 mt-1">{errors.namaJadwal}</p>}
              </div>

              {/* Tanggal jatuh tempo */}
              <div className="space-y-1">
                <label className="text-[11px] font-mono uppercase text-slate-500 font-semibold">
                  Hari / Tanggal Batas Bayar (1 - 31)
                </label>
                <input 
                  type="number"
                  min={1}
                  max={31}
                  placeholder="Contoh: 15"
                  value={tanggalJatuhTempo}
                  onChange={(e) => setTanggalJatuhTempo(parseInt(e.target.value) || 0)}
                  className="w-full text-xs px-3 py-2 border border-slate-250 rounded-lg focus:outline-hidden focus:border-indigo-650 text-slate-700 bg-white font-mono"
                />
                {errors.tanggalJatuhTempo && <p className="text-[10px] text-rose-500 mt-1">{errors.tanggalJatuhTempo}</p>}
                <p className="text-[10px] text-slate-400 mt-1">
                  Tagihan untuk bulan aktif dianggap terlambat jika belum terbayarkan melewati tanggal ini.
                </p>
              </div>

              {/* Bulan Berlaku */}
              <div className="space-y-1">
                <label className="text-[11px] font-mono uppercase text-slate-500 font-semibold">Periode Bulan Berlaku</label>
                <select 
                  value={bulanAktif}
                  onChange={(e) => setBulanAktif(e.target.value)}
                  className="w-full text-xs p-2 border border-slate-250 rounded-lg focus:outline-hidden focus:border-indigo-650 text-slate-700 bg-white font-medium"
                >
                  <option value="Setiap Bulan">Setiap Bulan Aktif (Rutin)</option>
                  <option value="Hanya Semester Ganjil">Hanya Semester Ganjil (Periode Ganjil)</option>
                  <option value="Hanya Semester Genap" >Hanya Semester Genap (Periode Genap)</option>
                </select>
              </div>

              {/* Actions Footer */}
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-650 hover:bg-slate-50 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/10"
                >
                  <Check size={14} /> Simpan Jadwal
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
