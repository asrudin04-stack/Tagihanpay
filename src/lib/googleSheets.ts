/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Robust client-side Google Sheets Sync client using Firebase Auth
 */

import { initializeApp, getApp, getApps } from "firebase/app";
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User,
  signOut
} from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize Firebase App if not already initialized
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Provider Config with required scopes
export const provider = new GoogleAuthProvider();
provider.addScope("https://www.googleapis.com/auth/spreadsheets");
provider.addScope("https://www.googleapis.com/auth/drive.file");

// Flag to indicate if we are signing in
let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Initialize Auth
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  // Try to retrieve token from memory-cache of current session if any
  const savedToken = sessionStorage.getItem("g_sheets_token");
  if (savedToken) {
    cachedAccessToken = savedToken;
  }

  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user && cachedAccessToken) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else {
      cachedAccessToken = null;
      sessionStorage.removeItem("g_sheets_token");
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Sign in with premium google popup
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Gagal memperoleh token akses Google Workspace.");
    }

    cachedAccessToken = credential.accessToken;
    sessionStorage.setItem("g_sheets_token", cachedAccessToken);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error("Kesalahan Sign-In Google:", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Log out
export const googleLogOut = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  sessionStorage.removeItem("g_sheets_token");
};

// Fetch token
export const getAccessToken = (): string | null => {
  if (!cachedAccessToken) {
    cachedAccessToken = sessionStorage.getItem("g_sheets_token");
  }
  return cachedAccessToken;
};

// Google Sheet API v4 Requests Helper
const apiRequest = async (url: string, method = "GET", body: any = null, token: string) => {
  const headers: HeadersInit = {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const config: RequestInit = {
    method,
    headers,
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(url, config);
  if (!response.ok) {
    if (response.status === 401) {
      // Clear token to force reauth
      sessionStorage.removeItem("g_sheets_token");
      throw new Error("Sesi Google Sheets Anda telah kedaluwarsa atau membutuhkan otorisasi ulang. Silakan putuskan akun dan login kembali.");
    }
    const errText = await response.text();
    console.error(`API Error ${response.status}:`, errText);
    throw new Error(`Google API ${response.status}: ${response.statusText} (${errText})`);
  }

  return response.json();
};

/**
 * Creates a new preconfigured Google Spreadsheet with correct worksheets
 */
export const createSyncSpreadsheet = async (token: string, title = "TagihanPay Data Sync"): Promise<string> => {
  const url = "https://sheets.googleapis.com/v4/spreadsheets";
  
  // Define sheet tabs
  const body = {
    properties: {
      title,
    },
    sheets: [
      {
        properties: {
          title: "Pelanggan",
          gridProperties: {
            frozenRowCount: 1,
          }
        }
      },
      {
        properties: {
          title: "Transaksi",
          gridProperties: {
            frozenRowCount: 1,
          }
        }
      }
    ]
  };

  const data = await apiRequest(url, "POST", body, token);
  return data.spreadsheetId;
};

/**
 * Checks if sheets exist, and if not, creates them inside the spreadsheet
 */
export const ensureSheetsExist = async (spreadsheetId: string, token: string) => {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
  const meta = await apiRequest(url, "GET", null, token);
  
  const existingTitles = meta.sheets?.map((s: any) => s.properties.title) || [];
  const requests: any[] = [];

  if (!existingTitles.includes("Pelanggan")) {
    requests.push({
      addSheet: {
        properties: {
          title: "Pelanggan",
          gridProperties: { frozenRowCount: 1 }
        }
      }
    });
  }

  if (!existingTitles.includes("Transaksi")) {
    requests.push({
      addSheet: {
        properties: {
          title: "Transaksi",
          gridProperties: { frozenRowCount: 1 }
        }
      }
    });
  }

  if (requests.length > 0) {
    const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
    await apiRequest(updateUrl, "POST", { requests }, token);
  }
};

/**
 * Exports lists to the linked Google Spreadsheet
 */
export const exportDataToSpreadsheet = async (
  spreadsheetId: string,
  token: string,
  pelanggan: any[],
  transaksi: any[]
) => {
  // 1. Ensure sheets exist
  await ensureSheetsExist(spreadsheetId, token);

  // 2. Format Pelanggan Sheet
  const pelangganHeaders = [
    "ID Pelanggan", 
    "Nama Pelanggan", 
    "No Telepon", 
    "Alamat Rumah", 
    "Layanan (PLN / PDAM / WIFI)", 
    "No Meter / ID Pelanggan"
  ];
  const pelangganRows = pelanggan.map(p => [
    p.id || "",
    p.nama || "",
    p.noTelp || "",
    p.alamat || "",
    p.layanan || "",
    p.noMeter || ""
  ]);

  // 3. Format Transaksi Sheet
  const transaksiHeaders = [
    "ID Transaksi",
    "ID Pelanggan",
    "Nama Pelanggan",
    "Layanan",
    "Periode (YYYY-MM)",
    "Jumlah Bayar (Rupiah)",
    "Metode Pembayaran (Tunai / Transfer)",
    "Tanggal Bayar (YYYY-MM-DD)",
    "Keterangan",
    "Nomor Referensi"
  ];
  const transaksiRows = transaksi.map(tx => [
    tx.id || "",
    tx.idPelanggan || "",
    tx.namaPelanggan || "",
    tx.layanan || "",
    tx.periode || "",
    tx.jumlahBayar || 0,
    tx.metodePembayaran || "Tunai",
    tx.tanggalBayar || "",
    tx.keterangan || "",
    tx.noReff || ""
  ]);

  // 4. Batch update values to Google Sheet
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;
  const body = {
    valueInputOption: "USER_ENTERED",
    data: [
      {
        range: "Pelanggan!A1:F" + (pelangganRows.length + 5),
        values: [pelangganHeaders, ...pelangganRows]
      },
      {
        range: "Transaksi!A1:J" + (transaksiRows.length + 5),
        values: [transaksiHeaders, ...transaksiRows]
      }
    ]
  };

  // Clear sheet content first to prevent residues from previous exports
  const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchClear`;
  await apiRequest(clearUrl, "POST", { ranges: ["Pelanggan!A2:F10000", "Transaksi!A2:J10000"] }, token);

  // Write new values
  await apiRequest(url, "POST", body, token);
};

/**
 * Imports data from the linked Google Spreadsheet
 */
export const importDataFromSpreadsheet = async (
  spreadsheetId: string,
  token: string
): Promise<{ pelanggan: any[]; transaksi: any[] }> => {
  // Ensure sheets exist first
  await ensureSheetsExist(spreadsheetId, token);

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?ranges=Pelanggan!A1:F1000&ranges=Transaksi!A1:J2000`;
  const data = await apiRequest(url, "GET", null, token);

  const valueRanges = data.valueRanges || [];
  const pelangganValues = valueRanges[0]?.values || [];
  const transaksiValues = valueRanges[1]?.values || [];

  const pelanggan: any[] = [];
  const transaksi: any[] = [];

  // Parse Pelanggan
  if (pelangganValues.length > 1) {
    // Skip headers in row 0
    for (let i = 1; i < pelangganValues.length; i++) {
      const row = pelangganValues[i];
      if (!row || row.length === 0) continue;
      
      const idVal = row[0] ? String(row[0]).trim() : "";
      const namaVal = row[1] ? String(row[1]).trim() : "";
      if (!idVal || !namaVal) continue; // ID and name are mandatory
      
      const layananStr = row[4] ? String(row[4]).trim().toUpperCase() : "PLN";
      const validLayanan = ["PLN", "PDAM", "WIFI"].includes(layananStr) ? layananStr : "PLN";

      pelanggan.push({
        id: idVal,
        nama: namaVal,
        noTelp: row[2] ? String(row[2]).trim() : "",
        alamat: row[3] ? String(row[3]).trim() : "",
        layanan: validLayanan,
        noMeter: row[5] ? String(row[5]).trim() : ""
      });
    }
  }

  // Parse Transaksi
  if (transaksiValues.length > 1) {
    // Skip headers in row 0
    for (let i = 1; i < transaksiValues.length; i++) {
      const row = transaksiValues[i];
      if (!row || row.length === 0) continue;

      const idVal = row[0] ? String(row[0]).trim() : "";
      const idPelangganVal = row[1] ? String(row[1]).trim() : "";
      const namaPelangganVal = row[2] ? String(row[2]).trim() : "";
      if (!idVal || !idPelangganVal || !namaPelangganVal) continue; // ID, Client ID, Client Name are mandatory

      const layananStr = row[3] ? String(row[3]).trim().toUpperCase() : "PLN";
      const validLayanan = ["PLN", "PDAM", "WIFI"].includes(layananStr) ? layananStr : "PLN";
      
      const metodeStr = row[6] ? String(row[6]).trim() : "Tunai";
      // Capitalize first letter to match "Tunai" | "Transfer"
      const capitalizedMetode = metodeStr.charAt(0).toUpperCase() + metodeStr.slice(1).toLowerCase();
      const validMetode = ["Tunai", "Transfer"].includes(capitalizedMetode) ? capitalizedMetode : "Tunai";

      const jumlahStr = String(row[5]).replace(/[^0-9.-]/g, "");
      const finalJumlah = Number(jumlahStr) || 0;

      transaksi.push({
        id: idVal,
        idPelanggan: idPelangganVal,
        namaPelanggan: namaPelangganVal,
        layanan: validLayanan,
        periode: row[4] ? String(row[4]).trim() : "2026-06",
        jumlahBayar: finalJumlah,
        metodePembayaran: validMetode,
        tanggalBayar: row[7] ? String(row[7]).trim() : new Date().toISOString().split("T")[0],
        keterangan: row[8] ? String(row[8]).trim() : "",
        noReff: row[9] ? String(row[9]).trim() : ""
      });
    }
  }

  return { pelanggan, transaksi };
};
