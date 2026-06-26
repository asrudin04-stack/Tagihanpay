/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Robust client-side Firestore Sync engine for TagihanPay Database Publish
 */

import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { 
  getFirestore, 
  writeBatch, 
  doc, 
  getDocs, 
  collection, 
  getDocFromServer
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";
import { Pelanggan, Transaksi, TanggalPembayaran, BiayaTarif } from "../types";

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const auth = getAuth(app);

// --- Firestore Hardened Error Handler (MANDATORY) ---
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Hardened Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- Firestore Sync API ---

/**
 * Publishes the complete local database structure to Firebase Firestore under users/{userId}/
 */
export const publishDataToFirestore = async (
  userId: string,
  payload: {
    pelanggan: Pelanggan[];
    transaksi: Transaksi[];
    tanggal: TanggalPembayaran[];
    biaya: BiayaTarif[];
  }
): Promise<void> => {
  if (!userId) throw new Error("ID Pengguna tidak valid. Otorisasi diperlukan.");

  // Helper to sync a subcollection securely
  const syncSubcollection = async (
    collectionName: string,
    items: any[]
  ) => {
    const colPath = `users/${userId}/${collectionName}`;
    
    // 1. Fetch existing documents to delete them first (to keep in perfect sync)
    let existingDocIds: string[] = [];
    try {
      const snap = await getDocs(collection(db, colPath));
      existingDocIds = snap.docs.map(d => d.id);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, colPath);
    }

    // 2. Delete all existing docs using batched chunks of 400
    const deleteChunkSize = 400;
    for (let i = 0; i < existingDocIds.length; i += deleteChunkSize) {
      const chunk = existingDocIds.slice(i, i + deleteChunkSize);
      const batch = writeBatch(db);
      chunk.forEach(docId => {
        batch.delete(doc(db, colPath, docId));
      });
      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, colPath);
      }
    }

    // 3. Write new docs using batched chunks of 400
    const writeChunkSize = 400;
    for (let i = 0; i < items.length; i += writeChunkSize) {
      const chunk = items.slice(i, i + writeChunkSize);
      const batch = writeBatch(db);
      chunk.forEach(item => {
        // Enforce document ID mapping
        const docId = item.id;
        const docRef = doc(db, colPath, docId);
        batch.set(docRef, item);
      });
      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, colPath);
      }
    }
  };

  // Run sequential secure sync for all subcollections
  await syncSubcollection("pelanggan", payload.pelanggan);
  await syncSubcollection("tanggal", payload.tanggal);
  await syncSubcollection("biaya", payload.biaya);
  await syncSubcollection("transaksi", payload.transaksi);
};

/**
 * Downloads and restores the published database from Firebase Firestore under users/{userId}/
 */
export const downloadDataFromFirestore = async (
  userId: string
): Promise<{
  pelanggan: Pelanggan[];
  transaksi: Transaksi[];
  tanggal: TanggalPembayaran[];
  biaya: BiayaTarif[];
}> => {
  if (!userId) throw new Error("ID Pengguna tidak valid. Otorisasi diperlukan.");

  const fetchSubcollection = async <T>(collectionName: string): Promise<T[]> => {
    const colPath = `users/${userId}/${collectionName}`;
    try {
      const snap = await getDocs(collection(db, colPath));
      return snap.docs.map(doc => doc.data() as T);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, colPath);
      return [];
    }
  };

  const pelanggan = await fetchSubcollection<Pelanggan>("pelanggan");
  const tanggal = await fetchSubcollection<TanggalPembayaran>("tanggal");
  const biaya = await fetchSubcollection<BiayaTarif>("biaya");
  const transaksi = await fetchSubcollection<Transaksi>("transaksi");

  return { pelanggan, transaksi, tanggal, biaya };
};
