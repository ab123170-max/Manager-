/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { SavedInventoryItem, StockTransaction } from '../types';

export const GOOGLE_SHEETS_SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/spreadsheets.readonly',
];

// Initialize Firebase App instance singleton
const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);

const googleProvider = new GoogleAuthProvider();
GOOGLE_SHEETS_SCOPES.forEach((scope) => {
  googleProvider.addScope(scope);
});
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// IN-MEMORY TOKEN CACHING ONLY (No localStorage/sessionStorage)
let cachedAccessToken: string | null = null;
let cachedGoogleUser: User | null = null;
let isSigningIn = false;

// Event listeners for auth state changes
type AuthCallback = (user: User | null, token: string | null) => void;
const authListeners = new Set<AuthCallback>();

export const subscribeGoogleAuth = (callback: AuthCallback): (() => void) => {
  authListeners.add(callback);
  callback(cachedGoogleUser, cachedAccessToken);
  return () => {
    authListeners.delete(callback);
  };
};

const notifyListeners = () => {
  authListeners.forEach((listener) => {
    try {
      listener(cachedGoogleUser, cachedAccessToken);
    } catch (err) {
      console.error('Error in google auth listener:', err);
    }
  });
};

// Monitor Firebase auth state
onAuthStateChanged(firebaseAuth, (user) => {
  cachedGoogleUser = user;
  if (!user) {
    cachedAccessToken = null;
  }
  notifyListeners();
});

/**
 * Connect Google Account using Firebase Auth with required Google Drive and Sheets scopes
 */
export const connectGoogleAccount = async (): Promise<{
  user: User;
  accessToken: string;
}> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(firebaseAuth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);

    if (!credential?.accessToken) {
      throw new Error('Google did not return an access token. Please verify permissions.');
    }

    cachedAccessToken = credential.accessToken;
    cachedGoogleUser = result.user;
    notifyListeners();

    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google sign-in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Disconnect Google Account and clear cached access token
 */
export const disconnectGoogleAccount = async (): Promise<void> => {
  await signOut(firebaseAuth);
  cachedAccessToken = null;
  cachedGoogleUser = null;
  notifyListeners();
};

/**
 * Get current active in-memory access token
 */
export const getGoogleAccessToken = (): string | null => {
  return cachedAccessToken;
};

/**
 * Check if Google is currently connected with a valid in-memory token
 */
export const isGoogleConnected = (): boolean => {
  return !!cachedAccessToken && !!cachedGoogleUser;
};

/**
 * Get current Google User profile
 */
export const getGoogleUser = (): User | null => {
  return cachedGoogleUser;
};

// ============================================================================
// GOOGLE DRIVE & SHEETS API METHODS
// ============================================================================

export interface GoogleDriveSpreadsheet {
  id: string;
  name: string;
  modifiedTime?: string;
  webViewLink?: string;
}

/**
 * Search/list existing spreadsheets from user's Google Drive
 */
export const listGoogleSpreadsheets = async (): Promise<GoogleDriveSpreadsheet[]> => {
  if (!cachedAccessToken) {
    throw new Error('Google account is not connected. Please sign in with Google first.');
  }

  const query = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and trashed=false");
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=modifiedTime desc&pageSize=30&fields=files(id,name,modifiedTime,webViewLink)`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${cachedAccessToken}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to fetch spreadsheets (${res.status})`);
  }

  const data = await res.json();
  return data.files || [];
};

/**
 * Create a new Google Spreadsheet for SmartStock AI Inventory
 */
export const createInventorySpreadsheet = async (
  title: string,
  products: SavedInventoryItem[]
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> => {
  if (!cachedAccessToken) {
    throw new Error('Google account is not connected. Please sign in with Google first.');
  }

  // 1. Create Spreadsheet
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cachedAccessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: title || `SmartStock AI - Inventory ${new Date().toISOString().split('T')[0]}`,
      },
      sheets: [
        {
          properties: {
            title: 'Inventory Catalog',
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
        {
          properties: {
            title: 'Stock Ledger Logs',
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
      ],
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to create Google Spreadsheet (${createRes.status})`);
  }

  const sheetData = await createRes.json();
  const spreadsheetId = sheetData.spreadsheetId;
  const spreadsheetUrl = sheetData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // 2. Populate Headers & Product Rows
  const headers = [
    'ID',
    'Product Name',
    'SKU',
    'Barcode',
    'Category',
    'Stock Qty',
    'Min Threshold',
    'Purchase Cost ($)',
    'Retail Price ($)',
    'Mfg Date',
    'Expiry Date',
    'Batch No',
    'Status',
    'Supplier',
    'Last Updated',
  ];

  const rows = products.map((p) => [
    p.id || '',
    p.productName || '',
    p.sku || '',
    p.barcode || '',
    p.category || 'General',
    p.stockQuantity ?? (parseInt(p.quantity, 10) || 0),
    p.minStockAlert ?? 5,
    p.purchasePrice || '0',
    p.sellingPrice || '0',
    p.manufacturingDate || '',
    p.expiryDate || '',
    p.batchNumber || '',
    p.status || 'in_stock',
    p.supplier || '',
    p.updatedAt || p.savedAt || new Date().toISOString(),
  ]);

  const valuesPayload = {
    values: [headers, ...rows],
  };

  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'Inventory Catalog'!A1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${cachedAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(valuesPayload),
    }
  );

  if (!updateRes.ok) {
    const err = await updateRes.json().catch(() => ({}));
    console.warn('Could not populate initial values:', err);
  }

  // 3. Format header row styling (bold + background fill)
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cachedAccessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        {
          repeatCell: {
            range: {
              sheetId: sheetData.sheets?.[0]?.properties?.sheetId || 0,
              startRowIndex: 0,
              endRowIndex: 1,
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.08, green: 0.45, blue: 0.92 }, // Indigo / Blue
                textFormat: {
                  foregroundColor: { red: 1, green: 1, blue: 1 },
                  bold: true,
                  fontSize: 11,
                },
              },
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat)',
          },
        },
        {
          autoResizeDimensions: {
            dimensions: {
              sheetId: sheetData.sheets?.[0]?.properties?.sheetId || 0,
              dimension: 'COLUMNS',
              startIndex: 0,
              endIndex: 15,
            },
          },
        },
      ],
    }),
  }).catch((e) => console.warn('Header styling batchUpdate error:', e));

  return { spreadsheetId, spreadsheetUrl };
};

/**
 * Export current inventory to an existing spreadsheet with confirmation
 */
export const exportToExistingSpreadsheet = async (
  spreadsheetId: string,
  sheetName: string,
  products: SavedInventoryItem[]
): Promise<void> => {
  if (!cachedAccessToken) {
    throw new Error('Google account is not connected. Please sign in with Google first.');
  }

  const headers = [
    'ID',
    'Product Name',
    'SKU',
    'Barcode',
    'Category',
    'Stock Qty',
    'Min Threshold',
    'Purchase Cost ($)',
    'Retail Price ($)',
    'Mfg Date',
    'Expiry Date',
    'Batch No',
    'Status',
    'Supplier',
    'Last Updated',
  ];

  const rows = products.map((p) => [
    p.id || '',
    p.productName || '',
    p.sku || '',
    p.barcode || '',
    p.category || 'General',
    p.stockQuantity ?? (parseInt(p.quantity, 10) || 0),
    p.minStockAlert ?? 5,
    p.purchasePrice || '0',
    p.sellingPrice || '0',
    p.manufacturingDate || '',
    p.expiryDate || '',
    p.batchNumber || '',
    p.status || 'in_stock',
    p.supplier || '',
    p.updatedAt || p.savedAt || new Date().toISOString(),
  ]);

  const targetRange = encodeURIComponent(`'${sheetName || 'Sheet1'}'!A1`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${targetRange}?valueInputOption=USER_ENTERED`;

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${cachedAccessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: [headers, ...rows],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to update spreadsheet (${res.status})`);
  }
};

/**
 * Fetch spreadsheet metadata to get available sheet tabs
 */
export const getSpreadsheetMetadata = async (
  spreadsheetId: string
): Promise<{ title: string; sheetNames: string[] }> => {
  if (!cachedAccessToken) {
    throw new Error('Google account is not connected. Please sign in with Google first.');
  }

  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties.title`, {
    headers: {
      Authorization: `Bearer ${cachedAccessToken}`,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to fetch spreadsheet details (${res.status})`);
  }

  const data = await res.json();
  const title = data.properties?.title || 'Spreadsheet';
  const sheetNames = (data.sheets || []).map((s: any) => s.properties?.title || 'Sheet1');

  return { title, sheetNames };
};

/**
 * Read raw values from a Google Spreadsheet range
 */
export const readSpreadsheetValues = async (
  spreadsheetId: string,
  range: string
): Promise<string[][]> => {
  if (!cachedAccessToken) {
    throw new Error('Google account is not connected. Please sign in with Google first.');
  }

  const encodedRange = encodeURIComponent(range);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}`,
    {
      headers: {
        Authorization: `Bearer ${cachedAccessToken}`,
      },
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to read spreadsheet values (${res.status})`);
  }

  const data = await res.json();
  return data.values || [];
};

/**
 * Append a stock transaction entry into Google Sheets
 */
export const appendStockTransactionToSheet = async (
  spreadsheetId: string,
  sheetName: string,
  entry: StockTransaction
): Promise<void> => {
  if (!cachedAccessToken) return;

  const row = [
    entry.id || entry.transactionId,
    entry.dateTime || new Date(entry.timestamp).toISOString(),
    entry.productName,
    entry.barcode || '',
    entry.transactionType,
    entry.subType,
    entry.quantity,
    entry.newStock,
    entry.referenceId || '',
    entry.notes || '',
  ];

  const targetRange = encodeURIComponent(`'${sheetName || 'Stock Ledger Logs'}'!A1`);
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${targetRange}:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cachedAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [row],
      }),
    }
  ).catch((e) => console.warn('Failed to append stock transaction to sheet:', e));
};
