/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Pelanggan {
  id: string; // generated format, e.g., PLG-2026-0001
  nama: string;
  noTelp: string;
  alamat: string;
  layanan: 'PLN' | 'PDAM' | 'WIFI';
  noMeter: string; // Meter ID or Customer WiFi Account ID
}

export interface TanggalPembayaran {
  id: string;
  layanan: 'PLN' | 'PDAM' | 'WIFI';
  namaJadwal: string; // e.g. "Periode Rutin Bulanan"
  tanggalJatuhTempo: number; // e.g. 10 (tanggal 10 setiap bulan)
  bulanAktif: string; // e.g. "Semua Bulan" or custom range
}

export interface BiayaTarif {
  id: string;
  layanan: 'PLN' | 'PDAM' | 'WIFI';
  namaPaket: string; // e.g., "PLN 1300VA Subsidized", "WIFI Fiber 50Mbps", "PDAM Rumah Tangga A"
  biayaPerBulan: number; // e.g., 150000
}

export interface Transaksi {
  id: string; // e.g., INV-2026-10023
  idPelanggan: string;
  namaPelanggan: string;
  layanan: 'PLN' | 'PDAM' | 'WIFI';
  periode: string; // format "YYYY-MM" (e.g. "2026-06" - Juni 2026)
  jumlahBayar: number;
  metodePembayaran: 'Tunai' | 'Transfer';
  tanggalBayar: string; // ISO timestamp or localized date
  keterangan?: string;
  noReff?: string; // Reference code
}

// Generate default mock data to seed local storage on first launch
export const INITIAL_PELANGGAN: Pelanggan[] = [
  {
    id: "PLG-2026-0001",
    nama: "Fajar Prasetyo",
    noTelp: "081234567890",
    alamat: "Jl. Merdeka No. 45, Jakarta",
    layanan: "PLN",
    noMeter: "532298110902"
  },
  {
    id: "PLG-2026-0002",
    nama: "Siti Rahmawati",
    noTelp: "085712345678",
    alamat: "Perum Asri Indah Blok C-12, Bogor",
    layanan: "PDAM",
    noMeter: "PAM-99812-B"
  },
  {
    id: "PLG-2026-0003",
    nama: "Budi Kusuma",
    noTelp: "089876543210",
    alamat: "Jl. Melati IV No. 12, Bekasi",
    layanan: "WIFI",
    noMeter: "WIFI-IND-4091"
  },
  {
    id: "PLG-2026-0004",
    nama: "Dewi Lestari",
    noTelp: "082155443322",
    alamat: "Kp. Baru RT 04/RW 02, Tangerang",
    layanan: "PLN",
    noMeter: "532298551042"
  },
  {
    id: "PLG-2026-0005",
    nama: "Ahmad Fauzi",
    noTelp: "081388776655",
    alamat: "Jl. Veteran No. 8, Depok",
    layanan: "WIFI",
    noMeter: "WIFI-IND-8025"
  }
];

export const INITIAL_TANGGAL_PEMBAYARAN: TanggalPembayaran[] = [
  {
    id: "TGL-001",
    layanan: "PLN",
    namaJadwal: "Jatuh Tempo Litrik Bulanan",
    tanggalJatuhTempo: 20,
    bulanAktif: "Setiap Bulan"
  },
  {
    id: "TGL-002",
    layanan: "PDAM",
    namaJadwal: "Jatuh Tempo Air Bersih",
    tanggalJatuhTempo: 15,
    bulanAktif: "Setiap Bulan"
  },
  {
    id: "TGL-003",
    layanan: "WIFI",
    namaJadwal: "Paket Wifi Fiber",
    tanggalJatuhTempo: 5,
    bulanAktif: "Setiap Bulan"
  }
];

export const INITIAL_BIAYA_TARIF: BiayaTarif[] = [
  {
    id: "TRF-001",
    layanan: "PLN",
    namaPaket: "PLN Daya R1 / 1300 VA",
    biayaPerBulan: 185000
  },
  {
    id: "TRF-002",
    layanan: "PLN",
    namaPaket: "PLN Daya R1 / 900 VA (Subsidi)",
    biayaPerBulan: 95000
  },
  {
    id: "TRF-003",
    layanan: "PDAM",
    namaPaket: "PDAM Golongan II (Rumah Tangga)",
    biayaPerBulan: 74500
  },
  {
    id: "TRF-004",
    layanan: "PDAM",
    namaPaket: "PDAM Golongan III (Bisnis Kecil)",
    biayaPerBulan: 150000
  },
  {
    id: "TRF-005",
    layanan: "WIFI",
    namaPaket: "Wifi Unlimited - 30 Mbps",
    biayaPerBulan: 275000
  },
  {
    id: "TRF-006",
    layanan: "WIFI",
    namaPaket: "Wifi Premium - 100 Mbps",
    biayaPerBulan: 450000
  }
];

export const INITIAL_TRANSAKSI: Transaksi[] = [
  {
    id: "TX-202606-0001",
    idPelanggan: "PLG-2026-0001",
    namaPelanggan: "Fajar Prasetyo",
    layanan: "PLN",
    periode: "2026-06",
    jumlahBayar: 185000,
    metodePembayaran: "Transfer",
    tanggalBayar: "2026-06-10",
    keterangan: "Pembayaran PLN Juni OK",
    noReff: "REF-PLN-3129"
  },
  {
    id: "TX-202606-0002",
    idPelanggan: "PLG-2026-0002",
    namaPelanggan: "Siti Rahmawati",
    layanan: "PDAM",
    periode: "2026-06",
    jumlahBayar: 74500,
    metodePembayaran: "Tunai",
    tanggalBayar: "2026-06-12",
    keterangan: "Lunas Bayar Kasir",
    noReff: "REF-PAM-4021"
  },
  {
    id: "TX-202606-0003",
    idPelanggan: "PLG-2026-0003",
    namaPelanggan: "Budi Kusuma",
    layanan: "WIFI",
    periode: "2026-06",
    jumlahBayar: 275000,
    metodePembayaran: "Transfer",
    tanggalBayar: "2026-06-03",
    keterangan: "M-Banking Transfer",
    noReff: "REF-WIF-8812"
  },
  {
    id: "TX-202605-0001",
    idPelanggan: "PLG-2026-0001",
    namaPelanggan: "Fajar Prasetyo",
    layanan: "PLN",
    periode: "2026-05",
    jumlahBayar: 185000,
    metodePembayaran: "Transfer",
    tanggalBayar: "2026-05-09",
    keterangan: "Lunas",
    noReff: "REF-PLN-1092"
  },
  {
    id: "TX-202605-0002",
    idPelanggan: "PLG-2026-0003",
    namaPelanggan: "Budi Kusuma",
    layanan: "WIFI",
    periode: "2026-05",
    jumlahBayar: 275000,
    metodePembayaran: "Tunai",
    tanggalBayar: "2026-05-05",
    keterangan: "Lunas",
    noReff: "REF-WIF-1209"
  },
  {
    id: "TX-202605-0003",
    idPelanggan: "PLG-2026-0004",
    namaPelanggan: "Dewi Lestari",
    layanan: "PLN",
    periode: "2026-05",
    jumlahBayar: 95000,
    metodePembayaran: "Tunai",
    tanggalBayar: "2026-05-18",
    keterangan: "Bayar di loket",
    noReff: "REF-PLN-4421"
  }
];

// Helper to determine typical months
export const BULAN_LIST = [
  { value: "01", label: "Januari" },
  { value: "02", label: "Februari" },
  { value: "03", label: "Maret" },
  { value: "04", label: "April" },
  { value: "05", label: "Mei" },
  { value: "06", label: "Juni" },
  { value: "07", label: "Juli" },
  { value: "08", label: "Agustus" },
  { value: "09", label: "September" },
  { value: "10", label: "Oktober" },
  { value: "11", label: "November" },
  { value: "12", label: "Desember" }
];

export const TAHUN_LIST = ["2024", "2025", "2026", "2027"];

export function getMonthLabel(monthVal: string): string {
  const m = BULAN_LIST.find((item) => item.value === monthVal);
  return m ? m.label : monthVal;
}

export function formatRupiah(num: number): string {
  return "Rp " + num.toLocaleString("id-ID");
}

export interface Tunggakan {
  pelanggan: Pelanggan;
  periode: string; // YYYY-MM
  tarif: BiayaTarif;
  jatuhTempo: string; // e.g., "10 Juni 2026"
  jumlahTunggakan: number;
}
