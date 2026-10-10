import QRCode from 'qrcode';

/**
 * Standard Bank & UPI details for General Precision Spindles
 */
export const DEFAULT_BANK_DETAILS = {
  bankName: 'ICICI BANK LIMITED, PUNE NANDED CITY',
  accountNo: '349105000701',
  ifscCode: 'ICIC0003491',
  accountHolder: 'GENERAL PRECISION SPINDLES',
  upiId: '7058731515@hdfc',
  branch: 'NANDED CITY BRANCH, PUNE - 411041',
  msmeNo: 'MH26A0189736'
};

const STORAGE_KEY_UPI_ID = 'gps_erp_company_upi_id';

/**
 * Retrieve the active company UPI ID (from localStorage if customized, or default)
 */
export function getActiveUpiId() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(STORAGE_KEY_UPI_ID);
      if (saved && saved.trim() && !saved.includes('349105000701')) {
        return saved.trim();
      }
    }
  } catch (_e) {
    // fallback
  }
  return DEFAULT_BANK_DETAILS.upiId;
}

/**
 * Persist an updated company UPI ID
 */
export function setActiveUpiId(newUpiId) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (newUpiId && newUpiId.trim()) {
        window.localStorage.setItem(STORAGE_KEY_UPI_ID, newUpiId.trim());
      } else {
        window.localStorage.removeItem(STORAGE_KEY_UPI_ID);
      }
    }
  } catch (_e) {
    // fallback
  }
}

/**
 * Build RFC / NPCI compliant UPI Deep Link URI
 * Format: upi://pay?pa=<UPI_ID>&pn=<PAYEE_NAME>&am=<AMOUNT>&cu=INR&tn=<NOTE>&tr=<REF>
 * 
 * @param {object} params
 * @param {string} [params.upiId] - Payee VPA / UPI ID (defaults to active company UPI ID)
 * @param {string} [params.payeeName] - Payee Name (defaults to 'GENERAL PRECISION SPINDLES')
 * @param {number|string} [params.amount] - Quotation total payable amount
 * @param {string} [params.transactionNote] - Memo or invoice/quotation reference
 * @param {string} [params.transactionRef] - Reference ID (estimate number)
 * @returns {string} upi://pay URI
 */
export function buildUpiPaymentUri({
  upiId,
  payeeName = DEFAULT_BANK_DETAILS.accountHolder,
  amount,
  transactionNote = '',
  transactionRef = ''
} = {}) {
  const activeUpi = (upiId && upiId.trim()) ? upiId.trim() : getActiveUpiId();
  const cleanName = (payeeName && payeeName.trim()) ? payeeName.trim() : DEFAULT_BANK_DETAILS.accountHolder;

  // Build URI query with proper %20 and %40 encoding (RFC 3986 & NPCI UPI specification)
  const queryParts = [
    `pa=${encodeURIComponent(activeUpi)}`,
    `pn=${encodeURIComponent(cleanName)}`
  ];

  // If amount is specified and positive, lock the exact amount in UPI (2 decimal places)
  const numAmount = Number(amount);
  if (!isNaN(numAmount) && numAmount > 0) {
    queryParts.push(`am=${numAmount.toFixed(2)}`);
  }

  queryParts.push('cu=INR');

  if (transactionNote && transactionNote.trim()) {
    const cleanNote = transactionNote.trim().replace(/[/\\#?&]/g, '-').slice(0, 50);
    queryParts.push(`tn=${encodeURIComponent(cleanNote)}`);
  }

  if (transactionRef && transactionRef.trim()) {
    const cleanRef = transactionRef.trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 30);
    queryParts.push(`tr=${encodeURIComponent(cleanRef)}`);
  }

  return `upi://pay?${queryParts.join('&')}`;
}

// In-memory cache for generated QR codes to make rendering instant
const qrDataUrlCache = new Map();

/**
 * Generate a high-resolution base64 PNG Data URL for a UPI payment URI
 * 
 * @param {object|string} upiOptions - Options object or prebuilt upi:// URI string
 * @param {object} [qrConfig] - QRCode generator configurations
 * @returns {Promise<string>} Base64 Data URL (data:image/png;base64,...)
 */
export async function generateUpiQrDataUrl(upiOptions, qrConfig = {}) {
  const uri = typeof upiOptions === 'string' 
    ? upiOptions 
    : buildUpiPaymentUri(upiOptions);

  const cacheKey = `${uri}_${qrConfig.width || 256}_${qrConfig.margin || 1}`;
  if (qrDataUrlCache.has(cacheKey)) {
    return qrDataUrlCache.get(cacheKey);
  }

  try {
    const dataUrl = await QRCode.toDataURL(uri, {
      errorCorrectionLevel: qrConfig.errorCorrectionLevel || 'M',
      margin: qrConfig.margin !== undefined ? qrConfig.margin : 1,
      width: qrConfig.width || 256,
      color: {
        dark: qrConfig.dark || '#000000',
        light: qrConfig.light || '#ffffff'
      }
    });

    qrDataUrlCache.set(cacheKey, dataUrl);
    return dataUrl;
  } catch (err) {
    console.error('[UPI QR Generator] Failed to generate QR code data URL:', err);
    throw err;
  }
}
