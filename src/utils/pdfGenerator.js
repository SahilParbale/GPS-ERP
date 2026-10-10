import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { generateUpiQrDataUrl, getActiveUpiId, DEFAULT_BANK_DETAILS } from './upiQrGenerator';

// Export DOM element directly to PDF (Exact Mirror Image of on-screen document)
export const exportElementAsPdf = async (element, filename = 'document.pdf') => {
  if (!element) return false;

  try {
    const canvas = await html2canvas(element, {
      scale: 2.2, // Crisp retina / print resolution
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.98);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth(); // 210mm
    const pageHeight = pdf.internal.pageSize.getHeight(); // 297mm
    const margin = 8;
    const printWidth = pageWidth - (margin * 2); // 194mm
    const printHeight = (canvas.height * printWidth) / canvas.width;

    if (printHeight <= (pageHeight - (margin * 2))) {
      pdf.addImage(imgData, 'JPEG', margin, margin, printWidth, printHeight, undefined, 'FAST');
    } else {
      let heightLeft = printHeight;
      let position = margin;
      const usablePageHeight = pageHeight - (margin * 2);

      pdf.addImage(imgData, 'JPEG', margin, position, printWidth, printHeight, undefined, 'FAST');
      heightLeft -= usablePageHeight;

      while (heightLeft > 0) {
        position = heightLeft - printHeight + margin;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', margin, position, printWidth, printHeight, undefined, 'FAST');
        heightLeft -= usablePageHeight;
      }
    }

    pdf.save(filename);
    return true;
  } catch (err) {
    console.error('Error generating PDF from element:', err);
    return false;
  }
};

// Corporate Branding Constants
const COMPANY = {
  name: 'GENERAL PRECISION SPINDLES PVT. LTD.',
  tagline: 'High-Speed Motorized & Belt-Driven Machine Tool Spindles | ISO 9001:2015 Certified',
  address: 'Plot B-12, Nanded City Industrial Complex, Sinhagad Road, Pune - 411041, Maharashtra, India',
  contact: 'Tel: +91 20 2422 7890 | Email: erp@gpspindles.com | Web: www.gpspindles.com',
  gstin: '27AAACG0821M1Z5',
  pan: 'AAACG0821M',
  cin: 'U29299PN2014PTC151234',
  bank: {
    name: 'HDFC Bank Ltd',
    branch: 'Sinhagad Road Branch, Pune',
    accountNo: '50200049281729',
    ifsc: 'HDFC0001042',
    accountType: 'Current Account'
  }
};

const THEME = {
  primary: [122, 31, 61],       // #7A1F3D - Deep Maroon
  primaryDark: [90, 20, 45],   // #5A142D
  primaryLight: [249, 242, 245],// #F9F2F5
  textMain: [43, 32, 36],       // #2B2024 - Graphite Black
  textMuted: [115, 100, 105],   // #736469 - Slate Gray
  border: [232, 215, 222],      // #E8D7DE - Soft Border
  surface: [248, 250, 249],     // #F8FAF9
  accentGreen: [5, 150, 105],   // #059669
  accentAmber: [217, 119, 6],   // #D97706
  accentRed: [220, 38, 38],     // #DC2626
  white: [255, 255, 255]
};

// Safe number formatter
const formatCurrency = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return 'Rs. 0';
  const num = typeof amount === 'string' ? parseFloat(amount.replace(/[^0-9.-]+/g, '')) || 0 : amount;
  return 'Rs. ' + num.toLocaleString('en-IN', { maximumFractionDigits: 2 });
};

const formatDate = (dateStr) => {
  if (!dateStr) return new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? String(dateStr) : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

// Indian numbering format numbers to words converter
export function numberToIndianWords(num) {
  if (!num || isNaN(num) || num === 0) return 'Zero Rupees only';
  
  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const inWords = (n) => {
    let str = '';
    if (n > 19) {
      str += b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
    } else if (n > 0) {
      str += a[n];
    }
    return str;
  };

  let n = Math.floor(Math.abs(num));
  let crore = Math.floor(n / 10000000);
  n %= 10000000;
  let lakh = Math.floor(n / 100000);
  n %= 100000;
  let thousand = Math.floor(n / 1000);
  n %= 1000;
  let hundred = Math.floor(n / 100);
  let rem = n % 100;

  let res = [];
  if (crore > 0) res.push(`${inWords(crore)} Crore`);
  if (lakh > 0) res.push(`${inWords(lakh)} Lakh`);
  if (thousand > 0) res.push(`${inWords(thousand)} Thousand`);
  if (hundred > 0) res.push(`${inWords(hundred)} Hundred`);
  if (rem > 0) res.push(inWords(rem));

  return res.join(' ') + ' Rupees only';
}

// Generator for classic solid black telephone icon (☎) matching exact reference image
let cachedPhoneIconData = null;
export const getBlackPhoneIconData = () => {
  if (cachedPhoneIconData) return cachedPhoneIconData;
  if (typeof document === 'undefined') return null;
  try {
    const rawCanvas = document.createElement('canvas');
    rawCanvas.width = 128;
    rawCanvas.height = 128;
    const ctx = rawCanvas.getContext('2d');
    if (!ctx) return null;

    // Draw the exact solid black classic telephone icon
    // 1. Handset (receiver) with arched bridge and angled cups
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.moveTo(18, 30);
    ctx.bezierCurveTo(36, 14, 92, 14, 110, 30);
    ctx.bezierCurveTo(120, 38, 122, 54, 112, 58);
    ctx.bezierCurveTo(102, 62, 94, 52, 94, 42);
    ctx.bezierCurveTo(80, 32, 48, 32, 34, 42);
    ctx.bezierCurveTo(34, 52, 26, 62, 16, 58);
    ctx.bezierCurveTo(6, 54, 8, 38, 18, 30);
    ctx.closePath();
    ctx.fill();

    // 2. Base body of telephone
    ctx.beginPath();
    ctx.moveTo(36, 44);
    ctx.lineTo(42, 54);
    ctx.lineTo(86, 54);
    ctx.lineTo(92, 44);
    ctx.lineTo(98, 50);
    ctx.lineTo(88, 60);
    ctx.lineTo(108, 104);
    ctx.bezierCurveTo(110, 112, 106, 116, 98, 116);
    ctx.lineTo(30, 116);
    ctx.bezierCurveTo(22, 116, 18, 112, 20, 104);
    ctx.lineTo(40, 60);
    ctx.lineTo(30, 50);
    ctx.closePath();
    ctx.fill();

    // 3. Central rotary dial - crisp white outer ring
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(64, 86, 15, 0, Math.PI * 2);
    ctx.fill();

    // 4. Central hub - solid black center dot
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(64, 86, 6.5, 0, Math.PI * 2);
    ctx.fill();

    // Crop to tight bounding box so there is ZERO transparent padding
    const imgData = ctx.getImageData(0, 0, 128, 128);
    let minX = 128, minY = 128, maxX = 0, maxY = 0;
    for (let y = 0; y < 128; y++) {
      for (let x = 0; x < 128; x++) {
        const alpha = imgData.data[(y * 128 + x) * 4 + 3];
        if (alpha > 20) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (maxX < minX || maxY < minY) return null;

    const cropW = maxX - minX + 1;
    const cropH = maxY - minY + 1;
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = cropW;
    cropCanvas.height = cropH;
    const cropCtx = cropCanvas.getContext('2d');
    cropCtx.drawImage(rawCanvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);

    cachedPhoneIconData = {
      dataUrl: cropCanvas.toDataURL('image/png'),
      w: cropW,
      h: cropH,
      aspectRatio: cropW / cropH
    };
    return cachedPhoneIconData;
  } catch (_e) {
    return null;
  }
};

export const getBlackPhoneIconDataUrl = () => {
  const d = getBlackPhoneIconData();
  return d ? d.dataUrl : null;
};

// Universal Letterhead Header
const drawCorporateHeader = (doc, title, docNo = '', subtitle = '') => {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Top Maroon Accent Stripe
  doc.setFillColor(...THEME.primary);
  doc.rect(0, 0, pageWidth, 4.5, 'F');

  // Company Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...THEME.primary);
  doc.text(COMPANY.name, 14, 14);

  // Subtitle / Plant
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...THEME.textMuted);
  doc.text(COMPANY.tagline, 14, 18.5);
  doc.text(COMPANY.address, 14, 22.5);
  doc.text(`GSTIN: ${COMPANY.gstin} | PAN: ${COMPANY.pan} | CIN: ${COMPANY.cin}`, 14, 26.5);

  // Right-aligned Document Box
  doc.setFillColor(...THEME.primaryLight);
  doc.roundedRect(pageWidth - 78, 8, 64, 20, 2, 2, 'F');
  doc.setDrawColor(...THEME.border);
  doc.roundedRect(pageWidth - 78, 8, 64, 20, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...THEME.primary);
  doc.text(title.toUpperCase(), pageWidth - 46, 14, { align: 'center' });

  if (docNo) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...THEME.textMain);
    doc.text(docNo, pageWidth - 46, 19, { align: 'center' });
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...THEME.textMuted);
  doc.text(`Date: ${formatDate()}`, pageWidth - 46, 24, { align: 'center' });

  // Dividing Line
  doc.setDrawColor(...THEME.border);
  doc.setLineWidth(0.4);
  doc.line(14, 30, pageWidth - 14, 30);

  return 34; // return Y offset for content start
};

// Universal Corporate Footer with Page Numbers
const drawCorporateFooter = (doc) => {
  const pageCount = doc.internal.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Top footer line
    doc.setDrawColor(...THEME.border);
    doc.setLineWidth(0.3);
    doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...THEME.textMuted);
    doc.text(`${COMPANY.name} • Official ERP System Generated Record`, 14, pageHeight - 7.5);
    doc.text(`ISO 9001:2015 Quality Verified • Page ${i} of ${pageCount}`, pageWidth - 14, pageHeight - 7.5, { align: 'right' });

    // Bottom tiny maroon accent stripe
    doc.setFillColor(...THEME.primary);
    doc.rect(0, pageHeight - 2, pageWidth, 2, 'F');
  }
};

// Signatory Block
const drawSignatory = (doc, startY, leftLabel = 'Prepared & Verified By', rightLabel = 'Authorized Signatory') => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const y = Math.max(startY, 240);

  // Left Signatory
  doc.setDrawColor(...THEME.border);
  doc.setLineWidth(0.3);
  doc.line(14, y + 16, 68, y + 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...THEME.textMuted);
  doc.text(leftLabel, 14, y + 20);
  doc.text('Production & Operations Dept.', 14, y + 24);

  // Right Signatory
  doc.line(pageWidth - 78, y + 16, pageWidth - 14, y + 16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...THEME.primary);
  doc.text(`For ${COMPANY.name}`, pageWidth - 78, y + 8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...THEME.textMuted);
  doc.text(rightLabel, pageWidth - 78, y + 20);
  doc.text('Plant General Manager / Director', pageWidth - 78, y + 24);
};

// ==========================================
// 1. TAX INVOICE GENERATOR (1:1 Replica of Tax Invoice_INV2026-27 265_PS MAINTENANCE.pdf)
// ==========================================
export const exportTaxInvoicePdf = async (inv = {}) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const marginX = 14;
  const contentWidth = pageWidth - (marginX * 2); // 182mm

  const items = (inv.items && inv.items.length > 0) ? inv.items : [
    { id: 1, name: 'REPAIR MAKINO (S-33)', hsn: '84669390', qty: 1, unitPrice: 55000, rate: 55000, total: 55000 },
    { id: 2, name: 'SHAFT SLEEVING', hsn: '998717', qty: 1, unitPrice: 25000, rate: 25000, total: 25000 }
  ];

  const subtotal = Number(inv.subtotal) || items.reduce((sum, it) => sum + (Number(it.qty != null ? it.qty : (it.quantity || 1)) * Number(it.unitPrice != null ? it.unitPrice : (it.rate || it.price || 0))), 0);
  const taxRate = Number(inv.taxRate) || 18;
  const gstAmount = Number(inv.gstAmount) || Number(inv.taxAmount) || Math.round(subtotal * (taxRate / 100));
  const totalAmount = Number(inv.totalAmount || inv.amountNum) || (subtotal + gstAmount);
  const receivedAmount = Number(inv.receivedAmount || inv.paidAmountNum || inv.paid_amount || 0);
  const balanceAmount = Math.max(0, totalAmount - receivedAmount);
  const totalQty = items.reduce((s, it) => s + (Number(it.qty != null ? it.qty : (it.quantity || 1)) || 0), 0);

  const formatRupee = (num) => 'Rs. ' + Number(num || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const subtotalFormatted = formatRupee(subtotal);
  const gstFormatted = formatRupee(gstAmount);
  const totalFormatted = formatRupee(totalAmount);
  const receivedFormatted = formatRupee(receivedAmount);
  const balanceFormatted = formatRupee(balanceAmount);

  // 1. Document Title: "Tax Invoice" centered at top, and "ORIGINAL FOR RECIPIENT" right-aligned
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(0, 0, 0);
  doc.text('Tax Invoice', pageWidth / 2, 12.5, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(80, 80, 80);
  doc.text('ORIGINAL FOR RECIPIENT', marginX + contentWidth, 12.5, { align: 'right' });

  // 2. Main Outer Top Header Grid (X = marginX, Y = 15.5)
  const headerBoxY = 15.5;
  const headerBoxH = 27;
  const splitColX = 124;

  doc.setDrawColor(184, 184, 184);
  doc.setLineWidth(0.18);
  doc.rect(marginX, headerBoxY, contentWidth, headerBoxH, 'S');

  // Vertical dividing line between left company details and right metadata
  doc.line(splitColX, headerBoxY, splitColX, headerBoxY + headerBoxH);

  // Company details on Left — with GPS logo
  let logoDataUrl = null;
  try {
    const resp = await fetch('/logo.jpg');
    const blob = await resp.blob();
    logoDataUrl = await new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result);
      reader.onerror = rej;
      reader.readAsDataURL(blob);
    });
  } catch(_e) { logoDataUrl = null; }

  const textX = logoDataUrl ? (marginX + 32) : (marginX + 3);

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'JPEG', marginX + 2.5, headerBoxY + 6.5, 27, 13.5);
  }

  // Company title: 2 lines
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);
  doc.text('GENERAL PRECISION', textX, headerBoxY + 4.2);
  doc.text('SPINDLES', textX, headerBoxY + 7.6);

  // Address lines
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.8);
  doc.setTextColor(0, 0, 0);
  doc.text('SR NO 15/A/2 GKD INDUSTRIAL ESTATE, NEAR SAVLI', textX, headerBoxY + 11.0);
  doc.text('DHABA,NANDED PHATA SINHAGAD ROAD PUNE-411041 ,', textX, headerBoxY + 13.8);
  const taxPhoneData = getBlackPhoneIconData();
  if (taxPhoneData) {
    try {
      const iconH = 1.9;
      const iconW = iconH * (taxPhoneData.aspectRatio || 1.08);
      doc.addImage(taxPhoneData.dataUrl, 'PNG', textX, headerBoxY + 14.7, iconW, iconH);
      doc.text('+919764252188 /9764032929', textX + iconW + 0.35, headerBoxY + 16.6);
    } catch (_e) {
      doc.text('+919764252188 /9764032929', textX, headerBoxY + 16.6);
    }
  } else {
    doc.text('+919764252188 /9764032929', textX, headerBoxY + 16.6);
  }
  doc.text('Email: process@gpsspindles.net', textX, headerBoxY + 19.4);
  doc.text('GSTIN: 27AATFG1527D1ZF', textX, headerBoxY + 22.2);
  doc.text('State: 27-Maharashtra', textX, headerBoxY + 25.0);

  // Right side: Metadata (2x2 grid)
  const rightW = (marginX + contentWidth) - splitColX;
  const midMetaX = splitColX + (rightW / 2);

  // Horizontal line separates row 1 from row 2
  doc.line(splitColX, headerBoxY + 13.5, marginX + contentWidth, headerBoxY + 13.5);

  // Vertical line dividing left and right in BOTH rows
  doc.line(midMetaX, headerBoxY, midMetaX, headerBoxY + headerBoxH);

  // Row 1: Invoice No. (left) and Date (right)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(0, 0, 0);
  doc.text('Invoice No.', splitColX + 2.5, headerBoxY + 4.5);
  doc.text('Date', midMetaX + 2.5, headerBoxY + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(String(inv.invoiceNumber || inv.id || 'INV2026-27/265'), splitColX + 2.5, headerBoxY + 9.5);
  doc.text(String(inv.date || inv.invoiceDate || '30-09-2026'), midMetaX + 2.5, headerBoxY + 9.5);

  // Row 2: Place of supply (left) and Purchase Order No (right)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('Place of supply', splitColX + 2.5, headerBoxY + 18.0);
  doc.text('Purchease Order No', midMetaX + 2.5, headerBoxY + 18.0);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(String(inv.placeOfSupply || inv.state || '27-Maharashtra'), splitColX + 2.5, headerBoxY + 23.0);
  doc.text(String(inv.poNumber || inv.salesOrder || inv.refOrder || 'VERBAL'), midMetaX + 2.5, headerBoxY + 23.0);

  // 3. Bill To Box (Customer Box)
  const custBoxY = headerBoxY + headerBoxH;
  const custBoxH = 32;
  doc.rect(marginX, custBoxY, contentWidth, custBoxH, 'S');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('Bill To', marginX + 2.5, custBoxY + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(String(inv.customer || inv.customerFullName || 'PS MAINTENANCE SERVICE'), marginX + 2.5, custBoxY + 9.0);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  const custAddr = String(inv.customerAddress || inv.billingAddress || 'PLOT NO 64 FLAT NO 6 PURVA APARTMENT CDC SHAHU NAGAR CHINCHWAD\nPune, Maharashtra-411019\nIndia');
  const addrLines = doc.splitTextToSize(custAddr, contentWidth - 6);
  let addrCurY = custBoxY + 12.8;
  addrLines.forEach((l) => {
    doc.text(l, marginX + 2.5, addrCurY);
    addrCurY += 3.2;
  });

  doc.text(`Contact No. : ${inv.contactNo || inv.customerContact || '8600280084'}`, marginX + 2.5, addrCurY + 0.5);
  doc.text(`GSTIN : ${inv.gstin || inv.customerGstin || '27AIBPB6756H1ZB'}`, marginX + 2.5, addrCurY + 3.8);
  doc.text(`State: ${inv.placeOfSupply || inv.state || '27-Maharashtra'}`, marginX + 2.5, addrCurY + 7.1);

  // 4. Line Items Table (6 columns: #, Item name, HSN/ SAC, Quantity, Price/ Unit, Amount)
  const tableStartY = custBoxY + custBoxH;

  const tableBody = items.map((it, idx) => {
    const itName = it.name || it.product || it.desc || 'Precision Spindle Component';
    const itHsn = it.hsn || it.hsn_sac || '84669390';
    const itQty = it.qty != null ? it.qty : (it.quantity || 1);
    const itRate = it.unitPrice != null ? it.unitPrice : (it.rate || it.price || 0);
    const itTotal = it.total != null ? it.total : (Number(itQty) * Number(itRate));

    return [
      idx + 1,
      itName,
      itHsn,
      itQty,
      formatRupee(itRate),
      formatRupee(itTotal)
    ];
  });

  autoTable(doc, {
    startY: tableStartY,
    margin: { left: marginX, right: marginX },
    head: [['#', 'Item name', 'HSN/ SAC', 'Quantity', 'Price/ Unit', 'Amount']],
    body: tableBody,
    foot: [['', 'Total', '', { content: String(totalQty), styles: { halign: 'right' } }, '', { content: subtotalFormatted, styles: { halign: 'right' } }]],
    theme: 'grid',
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 6.8,
      lineColor: [184, 184, 184],
      lineWidth: 0.18,
      cellPadding: { top: 1.5, bottom: 1.5, left: 2, right: 2 }
    },
    bodyStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontSize: 6.5,
      lineColor: [184, 184, 184],
      lineWidth: 0.18,
      cellPadding: { top: 1.4, bottom: 1.4, left: 2, right: 2 }
    },
    footStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 6.8,
      lineColor: [184, 184, 184],
      lineWidth: 0.18,
      cellPadding: { top: 1.5, bottom: 1.5, left: 2, right: 2 }
    },
    columnStyles: {
      0: { halign: 'left', cellWidth: 10 },
      1: { halign: 'left', cellWidth: 82 },
      2: { halign: 'left', cellWidth: 24 },
      3: { halign: 'right', cellWidth: 18 },
      4: { halign: 'right', cellWidth: 24 },
      5: { halign: 'right', cellWidth: 24 }
    },
    didParseCell: (data) => {
      if (data.column.index === 0 || data.column.index === 1 || data.column.index === 2) {
        data.cell.styles.halign = 'left';
      } else if (data.column.index === 3 || data.column.index === 4 || data.column.index === 5) {
        data.cell.styles.halign = 'right';
      }
    }
  });

  // 5. Middle Section (Words & Description on left, Amounts on right)
  const middleY = doc.lastAutoTable.finalY;
  const middleH = 38;
  const midSplitX = marginX + 112;

  doc.setDrawColor(184, 184, 184);
  doc.setLineWidth(0.18);
  doc.rect(marginX, middleY, contentWidth, middleH, 'S');
  doc.line(midSplitX, middleY, midSplitX, middleY + middleH);

  // Left Side: Invoice Amount in Words Box
  const wordsH = 9.5;
  doc.line(marginX, middleY + wordsH, midSplitX, middleY + wordsH);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(0, 0, 0);
  doc.text('Invoice Amount in Words', marginX + 2, middleY + 3.8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  const amtWords = inv.amountInWords || numberToIndianWords(totalAmount);
  const amtWordLines = doc.splitTextToSize(amtWords, midSplitX - marginX - 4);
  doc.text(amtWordLines, marginX + 2, middleY + 7.8);

  // Description Box
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('Description', marginX + 2, middleY + wordsH + 3.8);

  let descY = middleY + wordsH + 7.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  if (inv.spindleSerial) {
    doc.text(`SERIAL NO. ${inv.spindleSerial}`, marginX + 2, descY);
    descY += 3.2;
  }
  doc.text('SCOPE OF WORK :-', marginX + 2, descY);
  descY += 3.2;

  const rawScope = Array.isArray(inv.scopeOfWork)
    ? inv.scopeOfWork
    : (inv.scopeOfWork || '1. DISMANTLE\n2. CLEANING\n3. INSPECTION\n4. BEARING REPLACEMENT\n5. SHAFT SLEEVING\n6. STATIC TEST\n7. ASSEMBLY\n8. DYNAMIC TEST').split('\n');

  rawScope.forEach((line, idx) => {
    if (descY + (idx * 2.8) < middleY + middleH - 1) {
      doc.text(line.trim(), marginX + 2, descY + (idx * 2.8));
    }
  });

  // Right Side: Amounts Box
  const amtRX = midSplitX + 2;
  const amtRight = marginX + contentWidth - 2;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(0, 0, 0);
  doc.text('Amounts', amtRX, middleY + 3.8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.text('Sub Total', amtRX, middleY + 10.5);
  doc.text(subtotalFormatted, amtRight, middleY + 10.5, { align: 'right' });

  doc.text(`Tax (${taxRate}%)`, amtRX, middleY + 16.5);
  doc.text(gstFormatted, amtRight, middleY + 16.5, { align: 'right' });

  doc.setDrawColor(184, 184, 184);
  doc.setLineWidth(0.18);
  doc.line(amtRX, middleY + 20, amtRight, middleY + 20);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('Total', amtRX, middleY + 24.5);
  doc.text(totalFormatted, amtRight, middleY + 24.5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.text('Received', amtRX, middleY + 29.5);
  doc.text(receivedFormatted, amtRight, middleY + 29.5, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('Balance', amtRX, middleY + 34.5);
  doc.text(balanceFormatted, amtRight, middleY + 34.5, { align: 'right' });

  // 6. GST Tax Summary Table
  const isIntraState = String(inv.placeOfSupply || inv.state || '27-Maharashtra').startsWith('27');

  const computeHsnSummary = (itemList) => {
    const map = {};
    itemList.forEach(it => {
      const rawCode = it.hsn != null ? String(it.hsn).trim() : (it.hsn_sac || '84669390');
      const key = rawCode === '' ? '84669390' : rawCode;
      const itQty = it.qty != null ? it.qty : (it.quantity || 1);
      const itRate = it.unitPrice != null ? it.unitPrice : (it.rate || it.price || 0);
      const amt = Number(it.total != null ? it.total : (Number(itQty) * Number(itRate))) || 0;
      if (!map[key]) {
        map[key] = { hsn: key, taxable: 0 };
      }
      map[key].taxable += amt;
    });
    return Object.values(map).sort((a, b) => String(a.hsn).localeCompare(String(b.hsn)));
  };

  const hsnList = computeHsnSummary(items);

  if (isIntraState) {
    const hsnRows = hsnList.map(h => {
      const cgstAmt = Math.round(h.taxable * 0.09);
      const sgstAmt = Math.round(h.taxable * 0.09);
      const totalTax = cgstAmt + sgstAmt;
      return [
        h.hsn || '',
        formatRupee(h.taxable),
        '9%',
        formatRupee(cgstAmt),
        '9%',
        formatRupee(sgstAmt),
        formatRupee(totalTax)
      ];
    });

    const halfTax = Math.round(gstAmount / 2);
    autoTable(doc, {
      startY: middleY + middleH,
      margin: { left: marginX, right: marginX },
      head: [
        [
          { content: 'HSN/ SAC', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'Taxable amount', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'CGST', colSpan: 2, styles: { halign: 'center' } },
          { content: 'SGST', colSpan: 2, styles: { halign: 'center' } },
          { content: 'Total Tax Amount', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }
        ],
        [
          { content: 'Rate', styles: { halign: 'center' } },
          { content: 'Amount', styles: { halign: 'center' } },
          { content: 'Rate', styles: { halign: 'center' } },
          { content: 'Amount', styles: { halign: 'center' } }
        ]
      ],
      body: hsnRows,
      foot: [[{ content: 'Total', styles: { halign: 'right' } }, subtotalFormatted, '', formatRupee(halfTax), '', formatRupee(halfTax), gstFormatted]],
      theme: 'grid',
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 6,
        lineColor: [184, 184, 184],
        lineWidth: 0.18,
        cellPadding: { top: 0.9, bottom: 0.9, left: 1.5, right: 1.5 }
      },
      bodyStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontSize: 6,
        lineColor: [184, 184, 184],
        lineWidth: 0.18,
        cellPadding: { top: 0.9, bottom: 0.9, left: 1.5, right: 1.5 }
      },
      footStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 6,
        lineColor: [184, 184, 184],
        lineWidth: 0.18,
        cellPadding: { top: 0.9, bottom: 0.9, left: 1.5, right: 1.5 }
      },
      columnStyles: {
        0: { halign: 'left', cellWidth: 26 },
        1: { halign: 'right', cellWidth: 34 },
        2: { halign: 'right', cellWidth: 16 },
        3: { halign: 'right', cellWidth: 26 },
        4: { halign: 'right', cellWidth: 16 },
        5: { halign: 'right', cellWidth: 26 },
        6: { halign: 'right', cellWidth: 38 }
      },
      didParseCell: (data) => {
        if (data.section === 'head') {
          data.cell.styles.halign = 'center';
        } else if (data.section === 'body') {
          if (data.column.index === 0) data.cell.styles.halign = 'left';
          else data.cell.styles.halign = 'right';
        } else if (data.section === 'foot') {
          data.cell.styles.halign = 'right';
        }
      }
    });
  } else {
    // Inter-State IGST table
    const hsnRows = hsnList.map(h => {
      const tax = Math.round(h.taxable * 0.18);
      return [
        h.hsn || '',
        formatRupee(h.taxable),
        '18%',
        formatRupee(tax),
        formatRupee(tax)
      ];
    });

    autoTable(doc, {
      startY: middleY + middleH,
      margin: { left: marginX, right: marginX },
      head: [
        [
          { content: 'HSN/ SAC', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'Taxable amount', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'IGST', colSpan: 2, styles: { halign: 'center' } },
          { content: 'Total Tax Amount', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }
        ],
        [
          { content: 'Rate', styles: { halign: 'center' } },
          { content: 'Amount', styles: { halign: 'center' } }
        ]
      ],
      body: hsnRows,
      foot: [[{ content: 'Total', styles: { halign: 'right' } }, subtotalFormatted, '', gstFormatted, gstFormatted]],
      theme: 'grid',
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 6,
        lineColor: [184, 184, 184],
        lineWidth: 0.18,
        cellPadding: { top: 0.9, bottom: 0.9, left: 1.5, right: 1.5 }
      },
      bodyStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontSize: 6,
        lineColor: [184, 184, 184],
        lineWidth: 0.18,
        cellPadding: { top: 0.9, bottom: 0.9, left: 1.5, right: 1.5 }
      },
      footStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 6,
        lineColor: [184, 184, 184],
        lineWidth: 0.18,
        cellPadding: { top: 0.9, bottom: 0.9, left: 1.5, right: 1.5 }
      },
      columnStyles: {
        0: { halign: 'left', cellWidth: 38 },
        1: { halign: 'right', cellWidth: 44 },
        2: { halign: 'right', cellWidth: 22 },
        3: { halign: 'right', cellWidth: 40 },
        4: { halign: 'right', cellWidth: 38 }
      },
      didParseCell: (data) => {
        if (data.section === 'head') {
          data.cell.styles.halign = 'center';
        } else if (data.section === 'body') {
          if (data.column.index === 0) data.cell.styles.halign = 'left';
          else data.cell.styles.halign = 'right';
        } else if (data.section === 'foot') {
          data.cell.styles.halign = 'right';
        }
      }
    });
  }

  // 7. Bottom 3-Column Footer Box
  const actualBottomY = doc.lastAutoTable.finalY;
  const bottomH = 34;
  const col1W = 58;
  const col2W = 72;
  const col3W = contentWidth - col1W - col2W;
  const col2X = marginX + col1W;
  const col3X = col2X + col2W;

  doc.setDrawColor(184, 184, 184);
  doc.setLineWidth(0.18);
  doc.rect(marginX, actualBottomY, contentWidth, bottomH, 'S');
  doc.line(col2X, actualBottomY, col2X, actualBottomY + bottomH);
  doc.line(col3X, actualBottomY, col3X, actualBottomY + bottomH);

  // Column 1: Bank Details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(0, 0, 0);
  doc.text('Bank Details', marginX + 2, actualBottomY + 4.5);

  // Dynamic Amount-Wise Scannable UPI QR Code
  const upiId = inv.bankDetails?.upiId || inv.upiId || getActiveUpiId();
  const payeeName = inv.bankDetails?.accountHolder || inv.bankDetails?.accountName || DEFAULT_BANK_DETAILS.accountHolder;
  const invRef = inv.invoiceNo || inv.invoiceNumber || inv.id || '';

  try {
    const qrDataUrl = await generateUpiQrDataUrl({
      upiId,
      payeeName,
      amount: totalAmount,
      transactionNote: invRef ? `Invoice ${invRef}` : 'Tax Invoice Payment',
      transactionRef: invRef
    }, { width: 300, margin: 1 });

    if (qrDataUrl) {
      doc.addImage(qrDataUrl, 'PNG', marginX + 2, actualBottomY + 6.5, 14.5, 14.5);
    }
  } catch (_qrErr) {
    console.error('Failed to generate UPI QR for tax invoice PDF:', _qrErr);
  }

  // UPI badge
  doc.setFillColor(22, 163, 74);
  doc.rect(marginX + 2, actualBottomY + 22.0, 14.5, 3.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4);
  doc.setTextColor(255, 255, 255);
  doc.text('UPI: SCAN TO PAY', marginX + 9.25, actualBottomY + 24.3, { align: 'center' });

  // Bank Text
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.6);
  doc.setTextColor(0, 0, 0);
  let bankY = actualBottomY + 7.5;
  doc.text('Name : ICICI BANK LIMITED, PUNE', marginX + 17.5, bankY); bankY += 3.0;
  doc.text('NANDED CITY', marginX + 17.5, bankY); bankY += 3.6;
  doc.text('Account No. : 349105000701', marginX + 17.5, bankY); bankY += 3.6;
  doc.text('IFSC code : ICIC0003491', marginX + 17.5, bankY); bankY += 3.6;
  doc.text(`UPI ID : ${upiId}`, marginX + 17.5, bankY); bankY += 3.6;
  doc.text("Account holder's name : GENERAL", marginX + 17.5, bankY); bankY += 3.0;
  doc.text('PRECISION SPINDLES', marginX + 17.5, bankY);

  // Column 2: Terms and conditions
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(0, 0, 0);
  doc.text('Terms and conditions', col2X + 2, actualBottomY + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.4);
  const defaultTerms = `We declare that this invoice shows the actual price of the goods\ndescribed and that all particulars are true and correct.\nBank Details:\nICICI Bank Ltd(Nanded City Branch)\nA/c No : 349105000701\nIFSC Code: ICIC0003491\nMSME (UDYAM ADHAR) NO-MH26A0189736\nTYPE OF ENTERPRISES: SPINDLE MANUFACTURING AND REPAIRING\nMAJOR ACTIVITIES IN OUR INVOICE: ALL TYPES OF CNC,VMC,HMC,BELT DRIVEN,DIRECT DRIVEN,INTEGRATED,SPINDLE REPAIRING ,SPINDLE MANUFACTURING.`;
  const cleanTerms = String(inv.terms || defaultTerms).replace('the goods described', 'the goods\ndescribed');
  doc.text(cleanTerms, col2X + 2, actualBottomY + 8.5, { maxWidth: col2W - 4 });

  // Column 3: Authorized Signatory
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(0, 0, 0);
  doc.text('For : GENERAL PRECISION SPINDLES', col3X + (col3W / 2), actualBottomY + 5.5, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('Authorized Signatory', col3X + (col3W / 2), actualBottomY + bottomH - 4, { align: 'center' });

  // Save the PDF
  const cleanId = String(inv.invoiceNumber || inv.id || 'INV2026-27_265').replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`GPS_Tax_Invoice_${cleanId}.pdf`);
};

// ==========================================
// 2. GSTR-1 SALES REGISTER PDF
// ==========================================
export const exportGstr1ReportPdf = (invoices = []) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = drawCorporateHeader(doc, 'GSTR-1 SALES REGISTER', 'FEB 2026', 'Outward B2B Supplies of Precision Spindles & Rebuilding Services');

  const rows = (invoices.length > 0 ? invoices : [
    { id: 'INV-2026-021', date: '2026-02-18', customer: 'Tata Motors Powertrain', customerGstin: '27AAACT2727Q1ZG', amount: '₹4,50,000', status: 'Paid' },
    { id: 'INV-2026-022', date: '2026-02-20', customer: 'Bharat Forge Mundhwa', customerGstin: '27AAACB1829D1Z2', amount: '₹8,20,000', status: 'Payment Pending' },
    { id: 'INV-2026-023', date: '2026-02-22', customer: 'L&T Heavy Engineering', customerGstin: '24AAACL0123M1Z8', amount: '₹12,40,000', status: 'Paid' },
    { id: 'INV-2026-024', date: '2026-02-24', customer: 'Kirloskar Oil Engines', customerGstin: '27AAACK1092P1Z4', amount: '₹3,80,000', status: 'Paid' },
    { id: 'INV-2026-025', date: '2026-02-26', customer: 'Godrej Aerospace Division', customerGstin: '27AAACG0821M1Z5', amount: '₹13,00,000', status: 'Payment Pending' }
  ]).map((inv, idx) => {
    const rawAmt = typeof inv.amount === 'number' ? inv.amount : parseFloat(String(inv.amount || '0').replace(/[^0-9.-]+/g, '')) || 0;
    const taxable = Math.round(rawAmt / 1.18);
    const cgst = Math.round(taxable * 0.09);
    const sgst = Math.round(taxable * 0.09);
    const total = taxable + cgst + sgst;

    return [
      idx + 1,
      inv.id,
      formatDate(inv.date),
      inv.customer,
      inv.customerGstin || '27AAACG0821M1Z5',
      '27-Maharashtra',
      '84669390',
      formatCurrency(taxable),
      formatCurrency(cgst),
      formatCurrency(sgst),
      formatCurrency(total),
      inv.status || 'Active'
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [['#', 'Invoice No', 'Inv Date', 'Customer / Buyer Name', 'Buyer GSTIN', 'POS', 'HSN', 'Taxable Amt', 'CGST (9%)', 'SGST (9%)', 'Total Invoice', 'Status']],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: THEME.primary,
      textColor: THEME.white,
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'center'
    },
    styles: {
      fontSize: 7,
      cellPadding: 2,
      textColor: THEME.textMain,
      lineColor: THEME.border,
      lineWidth: 0.2
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { halign: 'center', cellWidth: 22 },
      2: { halign: 'center', cellWidth: 20 },
      3: { halign: 'left', cellWidth: 50 },
      4: { halign: 'center', cellWidth: 32 },
      5: { halign: 'center', cellWidth: 22 },
      6: { halign: 'center', cellWidth: 18 },
      7: { halign: 'right', cellWidth: 24 },
      8: { halign: 'right', cellWidth: 20 },
      9: { halign: 'right', cellWidth: 20 },
      10: { halign: 'right', cellWidth: 24 },
      11: { halign: 'center', cellWidth: 20 }
    }
  });

  drawCorporateFooter(doc);
  doc.save(`GPS_GSTR1_Sales_Report_${new Date().toISOString().split('T')[0]}.pdf`);
};

// ==========================================
// 3. PURCHASE ORDER (PO) PDF (Exact Replica of Purchase Order_PO 2025-26 00106_PREMIER.pdf)
// ==========================================
export const exportPurchaseOrderPdf = async (po = {}) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const marginX = 14;
  const contentWidth = pageWidth - (marginX * 2); // 182mm

  // Normalize Line items
  const items = (po.items && po.items.length > 0) ? po.items : [
    {
      id: 1,
      name: po.itemDescription || po.notes || '120TAC20FME2DBCP5P01-NSK',
      item: po.itemDescription || po.notes || '120TAC20FME2DBCP5P01-NSK',
      hsn: po.hsn || '84821012',
      qty: po.qty != null ? po.qty : 1,
      unitPrice: po.unitPrice || po.rate || 58262,
      rate: po.unitPrice || po.rate || 58262,
      total: po.totalAmount || 58262
    }
  ];

  const subtotal = Number(po.subtotal) || items.reduce((sum, it) => sum + (Number(it.qty != null ? it.qty : 1) * Number(it.unitPrice != null ? it.unitPrice : (it.rate || 0))), 0);
  const taxRate = Number(po.taxRate) || 18;
  const gstAmount = Number(po.gstAmount) || Number(po.taxAmount) || (subtotal * (taxRate / 100));
  const rawTotal = subtotal + gstAmount;
  const roundOff = po.roundOff != null ? Number(po.roundOff) : (po.totalAmount ? Number(po.totalAmount) - rawTotal : Number((Math.round(rawTotal) - rawTotal).toFixed(2)));
  const totalAmount = po.totalAmount != null ? Number(po.totalAmount) : Math.round(rawTotal);
  const advance = Number(po.advance || po.advanceAmount || 0);
  const balance = Number(po.balance != null ? po.balance : (totalAmount - advance));
  const totalQty = items.reduce((s, it) => s + (Number(it.qty != null ? it.qty : (it.quantity || 1)) || 0), 0);

  const formatRupee = (num) => 'Rs. ' + Number(num || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatRupeeWithSign = (num) => {
    const val = Number(num || 0);
    if (val < 0) return '- Rs. ' + Math.abs(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return 'Rs. ' + val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const subtotalFormatted = formatRupee(subtotal);
  const gstFormatted = formatRupee(gstAmount);
  const roundOffFormatted = formatRupeeWithSign(roundOff);
  const totalFormatted = formatRupee(totalAmount);
  const advanceFormatted = formatRupee(advance);
  const balanceFormatted = formatRupee(balance);

  // 1. Document Title: "Purchase Order" centered at top, NO underline
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(0, 0, 0);
  doc.text('Purchase Order', pageWidth / 2, 12.5, { align: 'center' });

  // 2. Main Outer Top Header Grid (X = marginX, Y = 16)
  const headerBoxY = 16;
  const headerBoxH = 28;
  const splitColX = 124;

  doc.setDrawColor(184, 184, 184);
  doc.setLineWidth(0.18);
  doc.rect(marginX, headerBoxY, contentWidth, headerBoxH, 'S');

  // Vertical dividing line between left company details and right metadata
  doc.line(splitColX, headerBoxY, splitColX, headerBoxY + headerBoxH);

  // Company details on Left — with GPS logo
  let logoDataUrl = null;
  try {
    const resp = await fetch('/logo.jpg');
    const blob = await resp.blob();
    logoDataUrl = await new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result);
      reader.onerror = rej;
      reader.readAsDataURL(blob);
    });
  } catch(_e) { logoDataUrl = null; }

  const textX = logoDataUrl ? (marginX + 32) : (marginX + 3);

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'JPEG', marginX + 2.5, headerBoxY + 6.5, 27, 13.5);
  }

  // Company title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);
  doc.text('GENERAL PRECISION', textX, headerBoxY + 4.2);
  doc.text('SPINDLES', textX, headerBoxY + 7.6);

  // Address lines
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.8);
  doc.setTextColor(0, 0, 0);
  doc.text('SR NO 15/A/2 GKD INDUSTRIAL ESTATE, NEAR SAVLI', textX, headerBoxY + 11.0);
  doc.text('DHABA,NANDED PHATA SINHAGAD ROAD PUNE-411041 ,', textX, headerBoxY + 13.8);

  const piPhoneData = getBlackPhoneIconData();
  if (piPhoneData) {
    try {
      const iconH = 1.9;
      const iconW = iconH * (piPhoneData.aspectRatio || 1.08);
      doc.addImage(piPhoneData.dataUrl, 'PNG', textX, headerBoxY + 14.7, iconW, iconH);
      doc.text('+919764252188 /9764032929', textX + iconW + 0.35, headerBoxY + 16.6);
    } catch (_imgErr) {
      doc.text('+919764252188 /9764032929', textX, headerBoxY + 16.6);
    }
  } else {
    doc.text('+919764252188 /9764032929', textX, headerBoxY + 16.6);
  }
  doc.text('Email: process@gpsspindles.net', textX, headerBoxY + 19.4);
  doc.text('GSTIN: 27AATFG1527D1ZF', textX, headerBoxY + 22.2);
  doc.text('State: 27-Maharashtra', textX, headerBoxY + 25.0);

  // Right side: Metadata (2 rows x 2 cols)
  const rightW = (marginX + contentWidth) - splitColX;
  const midMetaX = splitColX + (rightW / 2);

  // Horizontal line separating top row from bottom row
  doc.line(splitColX, headerBoxY + 14, marginX + contentWidth, headerBoxY + 14);

  // Vertical line dividing left and right in BOTH rows
  doc.line(midMetaX, headerBoxY, midMetaX, headerBoxY + headerBoxH);

  // Row 1: Order No. (left) and Date (right)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(0, 0, 0);
  doc.text('Order No.', splitColX + 2.5, headerBoxY + 4.5);
  doc.text('Date', midMetaX + 2.5, headerBoxY + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(String(po.poNumber || po.id || 'PO/2025-26/00106'), splitColX + 2.5, headerBoxY + 9.5);
  doc.text(String(po.date || '04-09-2026'), midMetaX + 2.5, headerBoxY + 9.5);

  // Row 2: Due Date: (left) and Place of supply (right)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('Due Date:', splitColX + 2.5, headerBoxY + 18.0);
  doc.text('Place of supply', midMetaX + 2.5, headerBoxY + 18.0);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(String(po.dueDate || po.expectedDelivery || po.date || '04-09-2026'), splitColX + 2.5, headerBoxY + 23.0);
  doc.text(String(po.placeOfSupply || po.state || '27-Maharashtra'), midMetaX + 2.5, headerBoxY + 23.0);

  // 3. Order To (Supplier Box)
  const suppBoxY = headerBoxY + headerBoxH;
  const suppBoxH = 34;

  doc.rect(marginX, suppBoxY, contentWidth, suppBoxH, 'S');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(0, 0, 0);
  doc.text('Order To', marginX + 3, suppBoxY + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(String(po.supplier || po.vendorName || po.vendor || 'PREMIER INDUSTRIAL SOLUTIONS'), marginX + 3, suppBoxY + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  const suppAddress = po.supplierAddress || po.vendorAddress || 'P-84, D-II BLOCK MIDC Road Pimpri Chinchwad\nPune, Maharashtra-411019\nIndia';
  const addrLines = suppAddress.split('\n');
  doc.text(addrLines[0] || 'P-84, D-II BLOCK MIDC Road Pimpri Chinchwad', marginX + 3, suppBoxY + 13.5);
  doc.text(addrLines[1] || 'Pune, Maharashtra-411019', marginX + 3, suppBoxY + 16.7);
  doc.text(addrLines[2] || 'India', marginX + 3, suppBoxY + 19.9);

  doc.text(`Contact No. : ${po.supplierPhone || po.supplierContact || po.vendorContact || '0124-4510000'}`, marginX + 3, suppBoxY + 24.5);
  doc.text(`GSTIN : ${po.supplierGstin || po.vendorGstin || '27ABDFP3172C1ZH'}`, marginX + 3, suppBoxY + 28);
  doc.text(`State: ${po.supplierState || po.placeOfSupply || '27-Maharashtra'}`, marginX + 3, suppBoxY + 31.5);

  // 4. Line Items Table (6 cols: #, Item name, HSN/ SAC, Quantity, Price/ Unit, Amount)
  const tableRows = items.map((item, idx) => {
    const lineAmt = Number(item.total != null ? item.total : (Number(item.qty || 0) * Number(item.unitPrice || item.rate || 0)));
    return [
      idx + 1,
      item.item || item.name || item.desc || '120TAC20FME2DBCP5P01-NSK',
      item.hsn || item.hsn_code || '84821012',
      item.qty != null ? item.qty : 1,
      formatRupee(item.unitPrice || item.rate),
      formatRupee(lineAmt)
    ];
  });

  autoTable(doc, {
    startY: suppBoxY + suppBoxH,
    margin: { left: marginX, right: marginX },
    head: [['#', 'Item name', 'HSN/ SAC', 'Quantity', 'Price/ Unit', 'Amount']],
    body: tableRows,
    foot: [['', 'Total', '', { content: String(totalQty), styles: { halign: 'right' } }, '', { content: subtotalFormatted, styles: { halign: 'right' } }]],
    theme: 'grid',
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 7,
      lineColor: [184, 184, 184],
      lineWidth: 0.18,
      cellPadding: { top: 2, bottom: 2, left: 1.5, right: 1.5 }
    },
    bodyStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontSize: 6.8,
      lineColor: [184, 184, 184],
      lineWidth: 0.18,
      cellPadding: { top: 1.8, bottom: 1.8, left: 1.5, right: 1.5 }
    },
    footStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 7,
      lineColor: [184, 184, 184],
      lineWidth: 0.18,
      cellPadding: { top: 2, bottom: 2, left: 1.5, right: 1.5 }
    },
    columnStyles: {
      0: { halign: 'left', cellWidth: 8 },
      1: { halign: 'left', fontStyle: 'bold', cellWidth: 82 },
      2: { halign: 'left', cellWidth: 24 },
      3: { halign: 'right', cellWidth: 16 },
      4: { halign: 'right', cellWidth: 26 },
      5: { halign: 'right', fontStyle: 'bold', cellWidth: 26 }
    },
    didParseCell: (data) => {
      if (data.column.index === 0 || data.column.index === 1 || data.column.index === 2) {
        data.cell.styles.halign = 'left';
      } else if (data.column.index === 3 || data.column.index === 4 || data.column.index === 5) {
        data.cell.styles.halign = 'right';
      }
    }
  });

  // 5. Middle Section (Words on Left, Amounts on Right)
  const pageBottom = pageHeight - marginX; // 283mm
  let middleY = doc.lastAutoTable.finalY;
  const middleH = 38;
  const midSplitX = marginX + 110;

  doc.setDrawColor(184, 184, 184);
  doc.setLineWidth(0.18);
  doc.rect(marginX, middleY, contentWidth, middleH, 'S');
  doc.line(midSplitX, middleY, midSplitX, middleY + middleH);

  // Left: Order Amount in Words
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(0, 0, 0);
  doc.text('Order Amount in Words', marginX + 2.5, middleY + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  const amtWords = po.amountInWords || numberToIndianWords(totalAmount);
  const amtWordLines = doc.splitTextToSize(amtWords, midSplitX - marginX - 5);
  doc.text(amtWordLines, marginX + 2.5, middleY + 9.5);

  // Right: Amounts Box
  const amtRX = midSplitX + 2.5;
  const amtRight = marginX + contentWidth - 2.5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(0, 0, 0);
  doc.text('Amounts', amtRX, middleY + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  let curAmtY = middleY + 9.5;
  doc.text('Sub Total', amtRX, curAmtY);
  doc.text(subtotalFormatted, amtRight, curAmtY, { align: 'right' });

  curAmtY += 4.5;
  doc.text(`Tax (${taxRate}%)`, amtRX, curAmtY);
  doc.text(gstFormatted, amtRight, curAmtY, { align: 'right' });

  curAmtY += 4.5;
  doc.text('Round off', amtRX, curAmtY);
  doc.text(roundOffFormatted, amtRight, curAmtY, { align: 'right' });

  // Dividing line above Total
  curAmtY += 2;
  doc.setDrawColor(184, 184, 184);
  doc.setLineWidth(0.18);
  doc.line(midSplitX, curAmtY, marginX + contentWidth, curAmtY);

  curAmtY += 4.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.text('Total', amtRX, curAmtY);
  doc.text(totalFormatted, amtRight, curAmtY, { align: 'right' });

  curAmtY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Advance', amtRX, curAmtY);
  doc.text(advanceFormatted, amtRight, curAmtY, { align: 'right' });

  curAmtY += 4.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.text('Balance', amtRX, curAmtY);
  doc.text(balanceFormatted, amtRight, curAmtY, { align: 'right' });

  // 6. Tax Summary Table (CGST+SGST if Maharashtra, IGST if inter-state)
  const isIntraState = String(po.placeOfSupply || po.state || '27-Maharashtra').startsWith('27');

  const computeHsnSummary = (itemList) => {
    const map = {};
    itemList.forEach(it => {
      const rawCode = it.hsn || it.hsn_code || '84821012';
      const key = rawCode === '' ? '84821012' : rawCode;
      const amt = Number(it.total != null ? it.total : (Number(it.qty || 1) * Number(it.unitPrice || it.rate || 0))) || 0;
      if (!map[key]) {
        map[key] = { hsn: key, taxable: 0 };
      }
      map[key].taxable += amt;
    });
    return Object.values(map).sort((a, b) => String(a.hsn).localeCompare(String(b.hsn)));
  };

  const hsnList = computeHsnSummary(items);
  const taxStartY = middleY + middleH;

  if (isIntraState) {
    const hsnRows = hsnList.map(h => {
      const halfRate = (taxRate / 2);
      const cgstAmt = Number((h.taxable * (halfRate / 100)).toFixed(2));
      const sgstAmt = Number((h.taxable * (halfRate / 100)).toFixed(2));
      const totalTax = cgstAmt + sgstAmt;
      return [
        h.hsn || '84821012',
        formatRupee(h.taxable),
        `${halfRate}%`,
        formatRupee(cgstAmt),
        `${halfRate}%`,
        formatRupee(sgstAmt),
        formatRupee(totalTax)
      ];
    });

    const halfTax = Number((gstAmount / 2).toFixed(2));
    autoTable(doc, {
      startY: taxStartY,
      margin: { left: marginX, right: marginX },
      head: [
        [
          { content: 'HSN/ SAC', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'Taxable amount', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'CGST', colSpan: 2, styles: { halign: 'center' } },
          { content: 'SGST', colSpan: 2, styles: { halign: 'center' } },
          { content: 'Total Tax Amount', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }
        ],
        [
          { content: 'Rate', styles: { halign: 'center' } },
          { content: 'Amount', styles: { halign: 'center' } },
          { content: 'Rate', styles: { halign: 'center' } },
          { content: 'Amount', styles: { halign: 'center' } }
        ]
      ],
      body: hsnRows,
      foot: [[{ content: 'Total', styles: { halign: 'right' } }, subtotalFormatted, '', formatRupee(halfTax), '', formatRupee(halfTax), gstFormatted]],
      theme: 'grid',
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 6,
        lineColor: [184, 184, 184],
        lineWidth: 0.18,
        cellPadding: { top: 0.9, bottom: 0.9, left: 1.5, right: 1.5 }
      },
      bodyStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontSize: 6,
        lineColor: [184, 184, 184],
        lineWidth: 0.18,
        cellPadding: { top: 0.9, bottom: 0.9, left: 1.5, right: 1.5 }
      },
      footStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 6,
        lineColor: [184, 184, 184],
        lineWidth: 0.18,
        cellPadding: { top: 0.9, bottom: 0.9, left: 1.5, right: 1.5 }
      },
      columnStyles: {
        0: { halign: 'left', cellWidth: 26 },
        1: { halign: 'right', cellWidth: 32 },
        2: { halign: 'right', cellWidth: 16 },
        3: { halign: 'right', cellWidth: 27 },
        4: { halign: 'right', cellWidth: 16 },
        5: { halign: 'right', cellWidth: 27 },
        6: { halign: 'right', fontStyle: 'bold', cellWidth: 38 }
      },
      didParseCell: (data) => {
        if (data.section === 'head') {
          data.cell.styles.halign = 'center';
        } else if (data.section === 'body') {
          if (data.column.index === 0) data.cell.styles.halign = 'left';
          else data.cell.styles.halign = 'right';
        } else if (data.section === 'foot') {
          data.cell.styles.halign = 'right';
        }
      }
    });
  } else {
    // Inter-State IGST
    const hsnRows = hsnList.map(h => {
      const igstAmt = Number((h.taxable * (taxRate / 100)).toFixed(2));
      return [
        h.hsn || '84821012',
        formatRupee(h.taxable),
        `${taxRate}%`,
        formatRupee(igstAmt),
        formatRupee(igstAmt)
      ];
    });

    autoTable(doc, {
      startY: taxStartY,
      margin: { left: marginX, right: marginX },
      head: [
        [
          { content: 'HSN/ SAC', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'Taxable amount', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'IGST', colSpan: 2, styles: { halign: 'center' } },
          { content: 'Total Tax Amount', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }
        ],
        [
          { content: 'Rate', styles: { halign: 'center' } },
          { content: 'Amount', styles: { halign: 'center' } }
        ]
      ],
      body: hsnRows,
      foot: [[{ content: 'Total', styles: { halign: 'right' } }, subtotalFormatted, '', gstFormatted, gstFormatted]],
      theme: 'grid',
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 6,
        lineColor: [184, 184, 184],
        lineWidth: 0.18,
        cellPadding: { top: 0.9, bottom: 0.9, left: 1.5, right: 1.5 }
      },
      bodyStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontSize: 6,
        lineColor: [184, 184, 184],
        lineWidth: 0.18,
        cellPadding: { top: 0.9, bottom: 0.9, left: 1.5, right: 1.5 }
      },
      footStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 6,
        lineColor: [184, 184, 184],
        lineWidth: 0.18,
        cellPadding: { top: 0.9, bottom: 0.9, left: 1.5, right: 1.5 }
      },
      columnStyles: {
        0: { halign: 'left', cellWidth: 32 },
        1: { halign: 'right', cellWidth: 42 },
        2: { halign: 'right', cellWidth: 20 },
        3: { halign: 'right', cellWidth: 42 },
        4: { halign: 'right', fontStyle: 'bold', cellWidth: 46 }
      },
      didParseCell: (data) => {
        if (data.section === 'head') {
          data.cell.styles.halign = 'center';
        } else if (data.section === 'body') {
          if (data.column.index === 0) data.cell.styles.halign = 'left';
          else data.cell.styles.halign = 'right';
        } else if (data.section === 'foot') {
          data.cell.styles.halign = 'right';
        }
      }
    });
  }

  // 7. Bottom Section (Terms on Left, Signatory on Right)
  const bottomFinalY = doc.lastAutoTable.finalY;
  const bottomBoxH = Math.max(30, pageBottom - bottomFinalY);

  doc.setDrawColor(184, 184, 184);
  doc.setLineWidth(0.18);
  doc.rect(marginX, bottomFinalY, contentWidth, bottomBoxH, 'S');

  // Vertical line separating Terms from Signatory
  doc.line(midSplitX, bottomFinalY, midSplitX, bottomFinalY + bottomBoxH);

  // Left: Terms and conditions
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(0, 0, 0);
  doc.text('Terms and conditions', marginX + 2.5, bottomFinalY + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  const termsText = po.termsAndConditions || po.notes || 'Thanks for doing business with us!';
  doc.text(termsText, marginX + 2.5, bottomFinalY + 8.5);

  // Right: Authorized Signatory
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.text('For : GENERAL PRECISION SPINDLES', midSplitX + 28, bottomFinalY + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.text('Authorized Signatory', midSplitX + 38, bottomFinalY + bottomBoxH - 4.5);

  // Save PDF using exact user naming format
  const poNumClean = String(po.poNumber || po.id || 'PO 2025-26 00106').replace(/[\/\\]/g, ' ');
  const suppNameClean = String(po.supplier || po.vendor || 'PREMIER').split(' ')[0].toUpperCase();
  const filename = `Purchase Order_${poNumClean}_${suppNameClean}.pdf`;
  doc.save(filename);
};

// ==========================================
// 4. PURCHASE ORDER REGISTER PDF
// ==========================================
export const exportPurchaseOrderRegisterPdf = (orders = []) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  let y = drawCorporateHeader(doc, 'PURCHASE ORDER REGISTER', 'ACTIVE PO REGISTRY', 'All Procurement Contracts & Raw Material Forgings');

  const rows = (orders.length > 0 ? orders : [
    { poNumber: 'PO-2026-081', vendor: 'SKF India Bearings Ltd', date: '2026-02-10', deliveryDate: '2026-02-28', totalAmount: '₹3,40,000', status: 'In Transit' },
    { poNumber: 'PO-2026-082', vendor: 'Kalyani Steels Alloy Forgings', date: '2026-02-12', deliveryDate: '2026-03-05', totalAmount: '₹6,15,000', status: 'Approved' },
    { poNumber: 'PO-2026-083', vendor: 'Parker Hannifin Pneumatics', date: '2026-02-15', deliveryDate: '2026-03-10', totalAmount: '₹1,85,000', status: 'Pending Approval' }
  ]).map((po, idx) => [
    idx + 1,
    po.poNumber || po.id,
    formatDate(po.date || po.created_at),
    po.vendorName || po.vendor,
    po.category || 'Spindle Components',
    formatDate(po.deliveryDate || po.expected_delivery_date),
    formatCurrency(po.totalAmount || po.amount || 250000),
    po.status || 'Active'
  ]);

  autoTable(doc, {
    startY: y,
    head: [['#', 'PO Number', 'Date', 'Supplier / Vendor Name', 'Category', 'Target Delivery', 'PO Total Amount', 'Status']],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: THEME.primary,
      textColor: THEME.white,
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center'
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2.2,
      textColor: THEME.textMain,
      lineColor: THEME.border,
      lineWidth: 0.2
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'center', cellWidth: 28 },
      2: { halign: 'center', cellWidth: 26 },
      3: { halign: 'left', cellWidth: 70 },
      4: { halign: 'left', cellWidth: 45 },
      5: { halign: 'center', cellWidth: 28 },
      6: { halign: 'right', cellWidth: 35 },
      7: { halign: 'center', cellWidth: 26 }
    }
  });

  drawCorporateFooter(doc);
  doc.save(`GPS_Purchase_Order_Register_${new Date().toISOString().split('T')[0]}.pdf`);
};

// ==========================================
// ==========================================
// 5. PROFORMA INVOICE (PI) PDF (EXACT 1:1 REPLICA OF PROFORMA INVOICE_27_TTB.PDF)
// ==========================================
export const exportProformaInvoicePdf = async (pi = {}) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const marginX = 14;
  const contentWidth = pageWidth - (marginX * 2); // 182mm

  const items = (pi.items && pi.items.length > 0) ? pi.items : [
    { id: 1, name: 'RECONDITIONING CHARGES FOR SPINDLE (M77-002)', hsn: '84669390', qty: 1, unit: '-', unitPrice: 33500 },
    { id: 2, name: '7014CTYNSULP4 NSK (SET OF 4 )', hsn: '84821012', qty: 1, unit: 'SET', unitPrice: 22500 },
    { id: 3, name: 'TRANSPORT CHARGES', hsn: '996511', qty: 1, unit: '-', unitPrice: 3500 },
    { id: 4, name: 'DRAWBAR ASSEMBLY WITH DISC SPRING (MUBEA MAKE GERMANY)', hsn: '84669390', qty: 1, unit: '-', unitPrice: 15500 },
    { id: 5, name: 'TAPER GRINDING', hsn: '998717', qty: 1, unit: '-', unitPrice: 5500 },
    { id: 6, name: 'SHAFT BALANCING G2.5', hsn: '84669390', qty: 1, unit: '-', unitPrice: 2500 },
    { id: 7, name: 'REMOVAL & FITMENT CHARGES', hsn: '998717', qty: 1, unit: '-', unitPrice: 12500 }
  ];

  const subtotal = Number(pi.subtotal) || items.reduce((sum, it) => sum + (Number(it.qty || 0) * Number(it.unitPrice || it.rate || 0)), 0);
  const taxRate = Number(pi.taxRate) || 18;
  const gstAmount = Number(pi.gstAmount) || Number(pi.taxAmount) || Math.round(subtotal * (taxRate / 100));
  const totalAmount = Number(pi.totalAmount) || (subtotal + gstAmount);
  const totalQty = items.reduce((s, it) => s + (Number(it.qty) || 0), 0);

  const formatRupee = (num) => 'Rs. ' + Number(num || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const subtotalFormatted = formatRupee(subtotal);
  const gstFormatted = formatRupee(gstAmount);
  const totalFormatted = formatRupee(totalAmount);

  // 1. Document Title: "Proforma Invoice" centered at top, NO underline
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text('Proforma Invoice', pageWidth / 2, 13, { align: 'center' });

  // 2. Main Outer Top Header Grid (X = marginX, Y = 16)
  const headerBoxY = 16;
  const headerBoxH = 27;
  const splitColX = 124;

  doc.setDrawColor(184, 184, 184);
  doc.setLineWidth(0.18);
  doc.rect(marginX, headerBoxY, contentWidth, headerBoxH, 'S');

  // Vertical dividing line between left company details and right metadata
  doc.line(splitColX, headerBoxY, splitColX, headerBoxY + headerBoxH);

  // Company details on Left — with GPS logo
  let logoDataUrl = null;
  try {
    const resp = await fetch('/logo.jpg');
    const blob = await resp.blob();
    logoDataUrl = await new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result);
      reader.onerror = rej;
      reader.readAsDataURL(blob);
    });
  } catch(_e) { logoDataUrl = null; }

  const textX = logoDataUrl ? (marginX + 32) : (marginX + 3);

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'JPEG', marginX + 2.5, headerBoxY + 6.5, 27, 13.5);
  }

  // Company title: 2 lines matching the original format
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);
  doc.text('GENERAL PRECISION', textX, headerBoxY + 4.2);
  doc.text('SPINDLES', textX, headerBoxY + 7.6);

  // Address lines to the right of the logo — no overlap
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.8);
  doc.setTextColor(0, 0, 0);
  doc.text('SR NO 15/A/2 GKD INDUSTRIAL ESTATE, NEAR SAVLI', textX, headerBoxY + 11.0);
  doc.text('DHABA,NANDED PHATA SINHAGAD ROAD PUNE-411041 ,', textX, headerBoxY + 13.8);
  const piPhoneData = getBlackPhoneIconData();
  if (piPhoneData) {
    try {
      const iconH = 1.9;
      const iconW = iconH * (piPhoneData.aspectRatio || 1.08);
      doc.addImage(piPhoneData.dataUrl, 'PNG', textX, headerBoxY + 14.7, iconW, iconH);
      doc.text('+919764252188 /9764032929', textX + iconW + 0.35, headerBoxY + 16.6);
    } catch (_imgErr) {
      doc.text('+919764252188 /9764032929', textX, headerBoxY + 16.6);
    }
  } else {
    doc.text('+919764252188 /9764032929', textX, headerBoxY + 16.6);
  }
  doc.text('Email: process@gpsspindles.net', textX, headerBoxY + 19.4);
  doc.text('GSTIN: 27AATFG1527D1ZF', textX, headerBoxY + 22.2);
  doc.text('State: 27-Maharashtra', textX, headerBoxY + 25.0);

  // Right side: Metadata (3 Rows: Row 1 = Proforma Invoice No/Date, Row 2 = Place of supply/empty corner, Row 3 = empty bottom space)
  const rightW = (marginX + contentWidth) - splitColX;
  const midMetaX = splitColX + (rightW / 2);
  const row1H = 8.5;
  const row2H = 8.5;
  const row1Bottom = headerBoxY + row1H;
  const row2Bottom = row1Bottom + row2H;

  // Horizontal line 1: separates Row 1 from Row 2
  doc.line(splitColX, row1Bottom, marginX + contentWidth, row1Bottom);

  // Horizontal line 2: separates Row 2 from Row 3 (empty bottom space)
  doc.line(splitColX, row2Bottom, marginX + contentWidth, row2Bottom);

  // Vertical line dividing left and right columns across Row 1 and Row 2 (stops before empty Row 3)
  doc.line(midMetaX, headerBoxY, midMetaX, row2Bottom);

  // Row 1: Proforma Invoice No. (left) and Date (right)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(0, 0, 0);
  doc.text('Proforma Invoice No.', splitColX + 2.5, headerBoxY + 3.4);
  doc.text('Date', midMetaX + 2.5, headerBoxY + 3.4);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(String(pi.piNumber || pi.id || '27'), splitColX + 2.5, headerBoxY + 7.2);
  doc.text(String(pi.date || pi.issueDate || '22-08-2026'), midMetaX + 2.5, headerBoxY + 7.2);

  // Row 2: Place of supply (left) and empty right corner
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.text('Place of supply', splitColX + 2.5, row1Bottom + 3.4);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(String(pi.placeOfSupply || pi.state || '27-Maharashtra'), splitColX + 2.5, row1Bottom + 7.2);

  // Row 3: Empty space between row2Bottom and (headerBoxY + headerBoxH) matching original PDF

  // 3. Proforma Invoice For (Customer Box)
  const custBoxY = headerBoxY + headerBoxH;
  const custBoxH = 34;
  doc.rect(marginX, custBoxY, contentWidth, custBoxH, 'S');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(0, 0, 0);
  doc.text('Proforma Invoice For', marginX + 3, custBoxY + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(String(pi.customer || 'T T B TOOLING'), marginX + 3, custBoxY + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  const addrLines = (pi.customerAddress || 'PLOT NO. A-29-A PHASE-II, KHALUMBRE Chakan\nPune, Maharashtra-410501').split('\n');
  doc.text(addrLines[0] || 'PLOT NO. A-29-A PHASE-II, KHALUMBRE Chakan', marginX + 3, custBoxY + 13.5);
  doc.text(addrLines[1] || 'Pune, Maharashtra-410501', marginX + 3, custBoxY + 16.7);
  doc.text('India', marginX + 3, custBoxY + 19.9);
  doc.text(`Contact No. : ${pi.contactNo || '9975108709'}`, marginX + 3, custBoxY + 24.5);
  doc.text(`GSTIN : ${pi.gstin || '27AAKFT2876K1ZI'}`, marginX + 3, custBoxY + 28);
  doc.text(`State: ${pi.state || pi.placeOfSupply || '27-Maharashtra'}`, marginX + 3, custBoxY + 31.5);

  // 4. Line Items Table with Unit column
  const tableRows = items.map((item, idx) => {
    const lineAmt = Number(item.total != null ? item.total : (Number(item.qty || 0) * Number(item.unitPrice || item.rate || 0)));
    return [
      idx + 1,
      item.name || item.product || item.desc,
      item.hsn || '',
      item.qty,
      item.unit || '-',
      formatRupee(item.unitPrice || item.rate),
      formatRupee(lineAmt)
    ];
  });

  autoTable(doc, {
    startY: custBoxY + custBoxH,
    margin: { left: marginX, right: marginX },
    head: [['#', 'Item name', 'HSN/ SAC', 'Quantity', 'Unit', 'Price/ Unit', 'Amount']],
    body: tableRows,
    foot: [['', 'Total', '', totalQty, '', '', subtotalFormatted]],
    theme: 'grid',
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 7,
      halign: 'center',
      lineColor: [184, 184, 184],
      lineWidth: 0.18,
      cellPadding: { top: 2, bottom: 2, left: 1.5, right: 1.5 }
    },
    bodyStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontSize: 6.8,
      lineColor: [184, 184, 184],
      lineWidth: 0.18,
      cellPadding: { top: 1.8, bottom: 1.8, left: 1.5, right: 1.5 }
    },
    footStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 7,
      lineColor: [184, 184, 184],
      lineWidth: 0.18,
      cellPadding: { top: 2, bottom: 2, left: 1.5, right: 1.5 }
    },
    columnStyles: {
      0: { halign: 'left', cellWidth: 8 },
      1: { halign: 'left', fontStyle: 'bold', cellWidth: 72 },
      2: { halign: 'left', cellWidth: 22 },
      3: { halign: 'right', cellWidth: 16 },
      4: { halign: 'center', cellWidth: 14 },
      5: { halign: 'right', cellWidth: 25 },
      6: { halign: 'right', fontStyle: 'bold', cellWidth: 25 }
    },
    didParseCell: (data) => {
      if (data.section === 'head') {
        if (data.column.index === 0) data.cell.styles.halign = 'left';
        if (data.column.index === 1) data.cell.styles.halign = 'left';
        if (data.column.index === 2) data.cell.styles.halign = 'left';
        if (data.column.index === 3) data.cell.styles.halign = 'right';
        if (data.column.index === 4) data.cell.styles.halign = 'center';
        if (data.column.index === 5) data.cell.styles.halign = 'right';
        if (data.column.index === 6) data.cell.styles.halign = 'right';
      } else if (data.section === 'body') {
        if (data.column.index === 0) data.cell.styles.halign = 'left';
        if (data.column.index === 1) data.cell.styles.halign = 'left';
        if (data.column.index === 2) data.cell.styles.halign = 'left';
        if (data.column.index === 3) data.cell.styles.halign = 'right';
        if (data.column.index === 4) data.cell.styles.halign = 'center';
        if (data.column.index === 5) data.cell.styles.halign = 'right';
        if (data.column.index === 6) data.cell.styles.halign = 'right';
      } else if (data.section === 'foot') {
        if (data.column.index === 1) data.cell.styles.halign = 'left';
        if (data.column.index === 3) data.cell.styles.halign = 'right';
        if (data.column.index === 6) data.cell.styles.halign = 'right';
      }
    }
  });

  // 5. Middle Section (Words, Description, Amounts)
  const pageBottom = pageHeight - marginX; // 283mm
  const bottomH = 44;
  const bottomY = pageBottom - bottomH; // ~239mm

  let middleY = doc.lastAutoTable.finalY;
  const middleH = Math.max(55, bottomY - middleY - 32);
  const midSplitX = marginX + 110;

  doc.setDrawColor(184, 184, 184);
  doc.setLineWidth(0.18);
  doc.rect(marginX, middleY, contentWidth, middleH, 'S');
  doc.line(midSplitX, middleY, midSplitX, middleY + middleH);

  // Proforma Invoice Amount in Words Box
  const wordsH = 10;
  doc.line(marginX, middleY + wordsH, midSplitX, middleY + wordsH);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(0, 0, 0);
  doc.text('Proforma Invoice Amount in Words', marginX + 2, middleY + 4);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  const amtWords = pi.amountInWords || numberToIndianWords(totalAmount);
  const amtWordLines = doc.splitTextToSize(amtWords, midSplitX - marginX - 4);
  doc.text(amtWordLines, marginX + 2, middleY + 8);

  // Description Box
  const formatChallanDate = (raw) => {
    if (!raw) return '18-08-2026';
    if (/^\d{2}-\d{2}-\d{4}$/.test(raw)) return raw;
    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}-${mm}-${yyyy}`;
    }
    return String(raw);
  };

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.text('Description', marginX + 2, middleY + wordsH + 4);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  let descY = middleY + wordsH + 8;
  doc.text(`SERIAL NO. ${pi.spindleSerial || 'HMMXXVI (M77-002)'}`, marginX + 2, descY); descY += 3.4;
  doc.text(`CHALLAN NO. ${pi.challanNo || '049'}`, marginX + 2, descY); descY += 3.4;
  doc.text(`CHALLAN DATE. ${formatChallanDate(pi.challanDate)}`, marginX + 2, descY); descY += 3.4;
  doc.text('SCOPE OF WORK :-', marginX + 2, descY); descY += 3.5;

  const rawScope = Array.isArray(pi.scopeOfWork)
    ? pi.scopeOfWork
    : (pi.scopeOfWork || '1. DISMANTLE\n2. CLEANING\n3. INSPECTION\n4. BEARING REPLACEMENT\n5. SHAFT TAPER GRINDING\n6. SHAFT BALANCING\n7. DRAWBAR ASSEMBLY WITH NEW DISC SPRING\n8. STATIC TEST\n9. ASSEMBLYY\n10. DYNAMIC TEST.').split('\n');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  rawScope.forEach((line, idx) => {
    doc.text(line.trim(), marginX + 2, descY + (idx * 3.0));
  });

  // Right Side: Amounts Box
  const amtRX = midSplitX + 2;
  const amtRight = marginX + contentWidth - 2;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(0, 0, 0);
  doc.text('Amounts', amtRX, middleY + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Sub Total', amtRX, middleY + 14);
  doc.text(subtotalFormatted, amtRight, middleY + 14, { align: 'right' });

  doc.text(`Tax (${taxRate}%)`, amtRX, middleY + 22);
  doc.text(gstFormatted, amtRight, middleY + 22, { align: 'right' });

  doc.setDrawColor(184, 184, 184);
  doc.setLineWidth(0.18);
  doc.line(amtRX, middleY + 27, amtRight, middleY + 27);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Total', amtRX, middleY + 34);
  doc.text(totalFormatted, amtRight, middleY + 34, { align: 'right' });

  // 6. Tax Summary Table (CGST+SGST if Maharashtra, IGST if inter-state)
  const isIntraState = String(pi.placeOfSupply || pi.state || '27-Maharashtra').startsWith('27');

  const computeHsnSummary = (itemList) => {
    const map = {};
    itemList.forEach(it => {
      const rawCode = it.hsn != null ? String(it.hsn).trim() : '';
      const key = rawCode === '' ? '__blank__' : rawCode;
      const amt = Number(it.total != null ? it.total : (Number(it.qty || 0) * Number(it.unitPrice || it.rate || 0))) || 0;
      if (!map[key]) {
        map[key] = { hsn: rawCode, taxable: 0 };
      }
      map[key].taxable += amt;
    });
    return Object.values(map)
      .sort((a, b) => String(a.hsn).localeCompare(String(b.hsn)));
  };

  const hsnList = computeHsnSummary(items);

  if (isIntraState) {
    const hsnRows = hsnList.map(h => {
      const cgstAmt = Math.round(h.taxable * 0.09);
      const sgstAmt = Math.round(h.taxable * 0.09);
      const totalTax = cgstAmt + sgstAmt;
      return [
        h.hsn || '',
        formatRupee(h.taxable),
        '9%',
        formatRupee(cgstAmt),
        '9%',
        formatRupee(sgstAmt),
        formatRupee(totalTax)
      ];
    });

    const halfTax = Math.round(gstAmount / 2);
    autoTable(doc, {
      startY: middleY + middleH,
      margin: { left: marginX, right: marginX },
      head: [
        [
          { content: 'HSN/ SAC', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'Taxable amount', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'CGST', colSpan: 2, styles: { halign: 'center' } },
          { content: 'SGST', colSpan: 2, styles: { halign: 'center' } },
          { content: 'Total Tax Amount', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }
        ],
        [
          { content: 'Rate', styles: { halign: 'center' } },
          { content: 'Amount', styles: { halign: 'center' } },
          { content: 'Rate', styles: { halign: 'center' } },
          { content: 'Amount', styles: { halign: 'center' } }
        ]
      ],
      body: hsnRows,
      foot: [[{ content: 'Total', styles: { halign: 'right' } }, subtotalFormatted, '', formatRupee(halfTax), '', formatRupee(halfTax), gstFormatted]],
      theme: 'grid',
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 6,
        lineColor: [184, 184, 184],
        lineWidth: 0.18,
        cellPadding: { top: 0.9, bottom: 0.9, left: 1.5, right: 1.5 }
      },
      bodyStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontSize: 6,
        lineColor: [184, 184, 184],
        lineWidth: 0.18,
        cellPadding: { top: 0.9, bottom: 0.9, left: 1.5, right: 1.5 }
      },
      footStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 6,
        lineColor: [184, 184, 184],
        lineWidth: 0.18,
        cellPadding: { top: 0.9, bottom: 0.9, left: 1.5, right: 1.5 }
      },
      columnStyles: {
        0: { halign: 'left', cellWidth: 28 },
        1: { halign: 'right', cellWidth: 34 },
        2: { halign: 'right', cellWidth: 16 },
        3: { halign: 'right', cellWidth: 26 },
        4: { halign: 'right', cellWidth: 16 },
        5: { halign: 'right', cellWidth: 26 },
        6: { halign: 'right', cellWidth: 36 }
      },
      didParseCell: (data) => {
        if (data.section === 'head') {
          data.cell.styles.halign = 'center';
        } else if (data.section === 'body') {
          if (data.column.index === 0) data.cell.styles.halign = 'left';
          else data.cell.styles.halign = 'right';
        } else if (data.section === 'foot') {
          data.cell.styles.halign = 'right';
        }
      }
    });
  } else {
    // Inter-state (IGST)
    const hsnRows = hsnList.map(h => {
      const tax = Math.round(h.taxable * 0.18);
      return [
        h.hsn || '',
        formatRupee(h.taxable),
        '18%',
        formatRupee(tax),
        formatRupee(tax)
      ];
    });

    autoTable(doc, {
      startY: middleY + middleH,
      margin: { left: marginX, right: marginX },
      head: [
        [
          { content: 'HSN/ SAC', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'Taxable amount', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
          { content: 'IGST', colSpan: 2, styles: { halign: 'center' } },
          { content: 'Total Tax Amount', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }
        ],
        [
          { content: 'Rate', styles: { halign: 'center' } },
          { content: 'Amount', styles: { halign: 'center' } }
        ]
      ],
      body: hsnRows,
      foot: [[{ content: 'Total', styles: { halign: 'right' } }, subtotalFormatted, '', gstFormatted, gstFormatted]],
      theme: 'grid',
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 6,
        lineColor: [184, 184, 184],
        lineWidth: 0.18,
        cellPadding: { top: 0.9, bottom: 0.9, left: 1.5, right: 1.5 }
      },
      bodyStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontSize: 6,
        lineColor: [184, 184, 184],
        lineWidth: 0.18,
        cellPadding: { top: 0.9, bottom: 0.9, left: 1.5, right: 1.5 }
      },
      footStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 6,
        lineColor: [184, 184, 184],
        lineWidth: 0.18,
        cellPadding: { top: 0.9, bottom: 0.9, left: 1.5, right: 1.5 }
      },
      columnStyles: {
        0: { halign: 'left', cellWidth: 38 },
        1: { halign: 'right', cellWidth: 44 },
        2: { halign: 'right', cellWidth: 22 },
        3: { halign: 'right', cellWidth: 40 },
        4: { halign: 'right', cellWidth: 38 }
      },
      didParseCell: (data) => {
        if (data.section === 'head') {
          data.cell.styles.halign = 'center';
        } else if (data.section === 'body') {
          if (data.column.index === 0) data.cell.styles.halign = 'left';
          else data.cell.styles.halign = 'right';
        } else if (data.section === 'foot') {
          data.cell.styles.halign = 'right';
        }
      }
    });
  }

  // 7. Bottom 3-Column Footer Box
  const actualBottomY = Math.max(doc.lastAutoTable.finalY, bottomY);
  const col1W = 62;
  const col2W = 68;
  const col3W = contentWidth - col1W - col2W;
  const col2X = marginX + col1W;
  const col3X = col2X + col2W;

  doc.setDrawColor(184, 184, 184);
  doc.setLineWidth(0.18);
  doc.rect(marginX, actualBottomY, contentWidth, bottomH, 'S');
  doc.line(col2X, actualBottomY, col2X, actualBottomY + bottomH);
  doc.line(col3X, actualBottomY, col3X, actualBottomY + bottomH);

  // Column 1: Bank Details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(0, 0, 0);
  doc.text('Bank Details', marginX + 2, actualBottomY + 4.5);

  // Dynamic Amount-Wise Scannable UPI QR Code
  const upiId = pi.bankDetails?.upiId || pi.upiId || getActiveUpiId();
  const payeeName = pi.bankDetails?.accountHolder || pi.bankDetails?.accountName || DEFAULT_BANK_DETAILS.accountHolder;
  const piRef = pi.proformaNo || pi.piNumber || pi.id || '';

  try {
    const qrDataUrl = await generateUpiQrDataUrl({
      upiId,
      payeeName,
      amount: totalAmount,
      transactionNote: piRef ? `Proforma ${piRef}` : 'Proforma Invoice Payment',
      transactionRef: piRef
    }, { width: 300, margin: 1 });

    if (qrDataUrl) {
      doc.addImage(qrDataUrl, 'PNG', marginX + 2, actualBottomY + 6.5, 14.5, 14.5);
    }
  } catch (_qrErr) {
    console.error('Failed to generate UPI QR for proforma PDF:', _qrErr);
  }

  // UPI badge
  doc.setFillColor(22, 163, 74);
  doc.rect(marginX + 2, actualBottomY + 21.5, 14.5, 3.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4);
  doc.setTextColor(255, 255, 255);
  doc.text('UPI: SCAN TO PAY', marginX + 9.25, actualBottomY + 23.8, { align: 'center' });

  // Bank Text
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.6);
  doc.setTextColor(0, 0, 0);
  let bankY = actualBottomY + 7.5;
  doc.text('Name : ICICI BANK LIMITED, PUNE', marginX + 18, bankY); bankY += 3.0;
  doc.text('NANDED CITY', marginX + 18, bankY); bankY += 3.6;
  doc.text('Account No. : 349105000701', marginX + 18, bankY); bankY += 3.6;
  doc.text('IFSC code : ICIC0003491', marginX + 18, bankY); bankY += 3.6;
  doc.text(`UPI ID : ${upiId}`, marginX + 18, bankY); bankY += 3.6;
  doc.text("Account holder's name : GENERAL", marginX + 18, bankY); bankY += 3.0;
  doc.text('PRECISION SPINDLES', marginX + 18, bankY);

  // Column 2: Terms and conditions
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(0, 0, 0);
  doc.text('Terms and conditions', col2X + 2, actualBottomY + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.2);
  const termsTextLines = [
    'We declare that this invoice shows the actual price of the goods',
    'described and that all particulars are true and correct.',
    '',
    'Bank Details:',
    'ICICI Bank Ltd(Nanded City Branch)',
    'A/c No : 349105000701',
    'IFSC Code: ICIC0003491',
    'MSME (UDYAM ADHAR) NO-MH26A0189736',
    'TYPE OF ENTERPRISES: SPINDLE MANUFACTURING',
    'AND REPAIRING',
    'MAJOR ACTIVITIES IN OUR INVOICE: ALL TYPES OF',
    'CNC,VMC,HMC,BELT DRIVEN,DIRECT DRIVEN,',
    'INTEGRATED,SPINDLE REPAIRING ,SPINDLE',
    'MANUFACTURING.'
  ];
  termsTextLines.forEach((line, i) => { doc.text(line, col2X + 2, actualBottomY + 7.5 + (i * 2.35)); });

  // Column 3: Authorized Signatory
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(0, 0, 0);
  doc.text('For : GENERAL PRECISION SPINDLES', col3X + (col3W / 2), actualBottomY + 5.5, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('Authorized Signatory', col3X + (col3W / 2), actualBottomY + bottomH - 4, { align: 'center' });

  // Save the PDF
  const cleanId = String(pi.piNumber || pi.id || 'PI_27').replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`GPS_Proforma_Invoice_${cleanId}.pdf`);
};

// ==========================================
// 6. PROFORMA INVOICE REGISTER PDF
// ==========================================
export const exportProformaInvoiceRegisterPdf = (proformas = []) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  let y = drawCorporateHeader(doc, 'PROFORMA INVOICE REGISTER', 'PI REGISTRY', 'Quotations & Advance Payment Invoices');

  const rows = (proformas.length > 0 ? proformas : [
    { piNumber: 'PI-2026-039', customer: 'Tata Motors Limited', date: '2026-02-14', validUntil: '2026-03-15', totalAmount: '₹5,80,000', status: 'Converted to SO' },
    { piNumber: 'PI-2026-040', customer: 'Bharat Forge Ltd', date: '2026-02-18', validUntil: '2026-03-20', totalAmount: '₹8,40,000', status: 'Pending Approval' },
    { piNumber: 'PI-2026-041', customer: 'Godrej Aerospace', date: '2026-02-22', validUntil: '2026-03-25', totalAmount: '₹14,50,000', status: 'Draft' }
  ]).map((pi, idx) => [
    idx + 1,
    pi.piNumber || pi.id,
    formatDate(pi.date || pi.created_at),
    pi.customer || pi.customerName,
    formatDate(pi.validUntil || pi.valid_until),
    formatCurrency(pi.taxableAmount || 420000),
    formatCurrency(pi.totalAmount || 495600),
    pi.status || 'Active'
  ]);

  autoTable(doc, {
    startY: y,
    head: [['#', 'PI Number', 'Issue Date', 'Customer Name', 'Valid Until', 'Taxable Val', 'Total Invoice Amount', 'Status']],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: THEME.primary,
      textColor: THEME.white,
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center'
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2.2,
      textColor: THEME.textMain,
      lineColor: THEME.border,
      lineWidth: 0.2
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'center', cellWidth: 30 },
      2: { halign: 'center', cellWidth: 26 },
      3: { halign: 'left', cellWidth: 80 },
      4: { halign: 'center', cellWidth: 26 },
      5: { halign: 'right', cellWidth: 32 },
      6: { halign: 'right', cellWidth: 35 },
      7: { halign: 'center', cellWidth: 28 }
    }
  });

  drawCorporateFooter(doc);
  doc.save(`GPS_Proforma_Invoice_Register_${new Date().toISOString().split('T')[0]}.pdf`);
};

// ==========================================
// 7. E-WAY BILL TRANSIT PASS PDF
// ==========================================
export const exportEWayBillPdf = (ewb) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = drawCorporateHeader(doc, 'E-WAY BILL TRANSIT PASS', ewb.ewbNumber || 'EWB-2710-9821-4412');

  // PART-A: Consignment & Supplier/Recipient Details
  doc.setFillColor(...THEME.primary);
  doc.rect(14, y, pageWidth - 28, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...THEME.white);
  doc.text('PART-A: CONSIGNMENT PARTICULARS (SUPPLIER & RECIPIENT)', 18, y + 4.2);

  y += 6;

  doc.setFillColor(...THEME.surface);
  doc.rect(14, y, pageWidth - 28, 40, 'F');
  doc.setDrawColor(...THEME.border);
  doc.rect(14, y, pageWidth - 28, 40, 'S');

  // Left: Supplier
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...THEME.primary);
  doc.text('CONSIGNOR (FROM):', 18, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...THEME.textMain);
  doc.text(COMPANY.name, 18, y + 10.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...THEME.textMuted);
  doc.text(`GSTIN: ${COMPANY.gstin} | State: 27-Maharashtra`, 18, y + 14.5);
  doc.text(COMPANY.address, 18, y + 18.5);
  doc.text('Dispatch From: Plant 1 Warehouse, Sinhagad Road, Pune - 411041', 18, y + 22.5);

  // Right: Consignee
  const colRight = pageWidth - 90;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...THEME.primary);
  doc.text('CONSIGNEE (TO):', colRight, y + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...THEME.textMain);
  doc.text(ewb.customer || ewb.customerFullName || 'Bharat Forge Ltd', colRight, y + 10.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...THEME.textMuted);
  doc.text(`GSTIN: ${ewb.customerGstin || '27AAACB1829D1Z2'} | State: ${ewb.state || '27-Maharashtra'}`, colRight, y + 14.5);
  doc.text(ewb.address || 'Mundhwa Industrial Area, Pune Cantonment, Pune - 411036', colRight, y + 18.5);
  doc.text(`Destination PIN: ${ewb.pin || '411036'} | Approx Distance: ${ewb.distance || '35 km'}`, colRight, y + 22.5);

  // Invoice Details Stripe
  doc.setFillColor(...THEME.primaryLight);
  doc.rect(14, y + 28, pageWidth - 28, 12, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...THEME.textMain);
  doc.text(`Invoice No: ${ewb.invoice || 'INV-2026-021'}`, 18, y + 35);
  doc.text(`HSN: ${ewb.hsn || '84669390'}`, 65, y + 35);
  doc.text(`Product: ${ewb.product || 'Precision Motorized Spindle Unit'}`, 105, y + 35);
  doc.text(`Taxable Val: ${formatCurrency(ewb.taxable || 544322)}`, pageWidth - 20, y + 35, { align: 'right' });

  y += 46;

  // PART-B: Transporter & Vehicle Logistics
  doc.setFillColor(...THEME.primary);
  doc.rect(14, y, pageWidth - 28, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...THEME.white);
  doc.text('PART-B: TRANSPORTER LOGISTICS & VEHICLE VERIFICATION', 18, y + 4.2);

  y += 6;

  const transportData = [
    ['E-Way Bill Number', ewb.ewbNumber || 'EWB-2710-9821-4412', 'Valid Until Date', ewb.validUntil || '2026-03-02 23:59:00'],
    ['Transport Mode', ewb.mode || 'Road', 'Approx Transit Distance', ewb.distance || '35 km'],
    ['Transporter Name', ewb.transporter || 'FastTrack Logistics Ltd', 'Transporter GSTIN/ID', ewb.transporterId || '27AABCF4411Q1ZN'],
    ['Vehicle Number', ewb.vehicle || 'MH14CD5678', 'Consignment Status', ewb.status || 'Active in Transit']
  ];

  autoTable(doc, {
    startY: y,
    body: transportData,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 3,
      textColor: THEME.textMain,
      lineColor: THEME.border,
      lineWidth: 0.2
    },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: THEME.surface, cellWidth: 40 },
      1: { cellWidth: 50 },
      2: { fontStyle: 'bold', fillColor: THEME.surface, cellWidth: 40 },
      3: { cellWidth: 52 }
    }
  });

  const finalY = doc.lastAutoTable.finalY + 8;

  // NIC / QR Code Verification Box
  doc.setFillColor(...THEME.surface);
  doc.roundedRect(14, finalY, pageWidth - 28, 28, 1.5, 1.5, 'F');
  doc.setDrawColor(...THEME.border);
  doc.roundedRect(14, finalY, pageWidth - 28, 28, 1.5, 1.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...THEME.primary);
  doc.text('GOVERNMENT OF INDIA • GST E-WAY BILL SYSTEM VERIFICATION', 18, finalY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...THEME.textMuted);
  doc.text('This document is generated by General Precision Spindles ERP conforming to Rule 138 of the CGST Rules, 2017.', 18, finalY + 11);
  doc.text(`Official NIC Gateway Status: Digitally Authenticated & Recorded on National E-Way Portal.`, 18, finalY + 15.5);
  doc.text('Consignment must be accompanied by the original Tax Invoice and this physical/electronic transit pass.', 18, finalY + 20);

  drawSignatory(doc, finalY + 36, 'Driver / Transporter Signature', 'Authorized Dispatch Officer');
  drawCorporateFooter(doc);

  doc.save(`GPS_EWayBill_${ewb.ewbNumber || 'EWB-2026'}.pdf`);
};

// ==========================================
// 8. E-WAY BILL REGISTER PDF
// ==========================================
export const exportEWayBillRegisterPdf = (ewbs = []) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  let y = drawCorporateHeader(doc, 'E-WAY BILL REGISTRY', 'TRANSIT PASSES', 'GST Rule 138 Dispatch & Outward Movement Summary');

  const rows = (ewbs.length > 0 ? ewbs : [
    { ewbNumber: '2710-9821-4412', invoice: 'INV-2026-021', customer: 'Bharat Forge Ltd', vehicle: 'MH14CD5678', transporter: 'FastTrack Logistics', validUntil: '2026-03-02', status: 'Active' },
    { ewbNumber: '2710-9821-4413', invoice: 'INV-2026-022', customer: 'Tata Motors Powertrain', vehicle: 'MH12AB1234', transporter: 'ABC Logistics', validUntil: '2026-03-03', status: 'Active' },
    { ewbNumber: '2710-9821-4414', invoice: 'INV-2026-024', customer: 'Godrej Aerospace', vehicle: 'MH04EF9012', transporter: 'V-Trans India Ltd', validUntil: '2026-03-04', status: 'Active' }
  ]).map((e, idx) => [
    idx + 1,
    e.ewbNumber,
    e.invoice,
    e.customer,
    e.customerGstin || '27AAACB1829D1Z2',
    e.vehicle,
    e.transporter,
    formatDate(e.validUntil),
    e.status || 'Active'
  ]);

  autoTable(doc, {
    startY: y,
    head: [['#', 'EWB Number', 'Invoice', 'Consignee / Customer', 'Customer GSTIN', 'Vehicle No', 'Transporter Name', 'Valid Until', 'Status']],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: THEME.primary,
      textColor: THEME.white,
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center'
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2.2,
      textColor: THEME.textMain,
      lineColor: THEME.border,
      lineWidth: 0.2
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'center', cellWidth: 32 },
      2: { halign: 'center', cellWidth: 26 },
      3: { halign: 'left', cellWidth: 55 },
      4: { halign: 'center', cellWidth: 32 },
      5: { halign: 'center', cellWidth: 26 },
      6: { halign: 'left', cellWidth: 40 },
      7: { halign: 'center', cellWidth: 24 },
      8: { halign: 'center', cellWidth: 22 }
    }
  });

  drawCorporateFooter(doc);
  doc.save(`GPS_EWayBill_Register_${new Date().toISOString().split('T')[0]}.pdf`);
};

// ==========================================
// 9. INVENTORY VALUATION & STOCK STATEMENT PDF
// ==========================================
export const exportInventoryValuationPdf = (items = [], summary = {}) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = drawCorporateHeader(doc, 'INVENTORY VALUATION & STOCK STATEMENT', 'AS OF TODAY', 'Weighted Average Cost Valuation Across Central Warehouses & Assembly Stores');

  // Executive Metric Cards
  const totalValuation = summary.totalInventoryValueFormatted || 'Rs. 4,82,40,000';
  const totalSkus = summary.totalItemsCount || items.length || 184;

  doc.setFillColor(...THEME.surface);
  doc.roundedRect(14, y, pageWidth - 28, 16, 1.5, 1.5, 'F');
  doc.setDrawColor(...THEME.border);
  doc.roundedRect(14, y, pageWidth - 28, 16, 1.5, 1.5, 'S');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...THEME.textMuted);
  doc.text('TOTAL WAREHOUSE VALUATION:', 20, y + 6.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...THEME.primary);
  doc.text(totalValuation, 20, y + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...THEME.textMuted);
  doc.text('ACTIVE STOCK SKUs:', 110, y + 6.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...THEME.textMain);
  doc.text(`${totalSkus} Material Lines`, 110, y + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...THEME.textMuted);
  doc.text('ACCOUNTING AUDIT COMPLIANCE:', 195, y + 6.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...THEME.accentGreen);
  doc.text('AS-2 / Ind AS 2 (FIFO / Weighted Avg)', 195, y + 12);

  y += 20;

  const rows = (items.length > 0 ? items : [
    { sku: 'BRG-7014-CER', name: 'Ceramic Angular Contact Bearing 7014 P4S', category: 'Bearings', warehouseName: 'Central Raw Material Store', binLocation: 'BIN-A1-04', availableQty: 48, unit: 'Nos', unitCost: 18500, lineValuation: 888000, status: 'Optimal' },
    { sku: 'SHF-BT40-4140', name: 'BT40 Spindle Shaft 4140 Alloy Forging', category: 'Raw Materials', warehouseName: 'Machining Bay Store', binLocation: 'RACK-B-12', availableQty: 12, unit: 'Nos', unitCost: 45000, lineValuation: 540000, status: 'Optimal' },
    { sku: 'MOT-ST-18KW', name: 'Stator Pack 18kW 24,000 RPM Synchronous', category: 'Motors', warehouseName: 'Electrical Bay Store', binLocation: 'ELEC-ST-02', availableQty: 6, unit: 'Nos', unitCost: 92000, lineValuation: 552000, status: 'Low Stock' },
    { sku: 'COL-HSK-A63', name: 'HSK-A63 Tool Clamping Collet Mechanism', category: 'Tooling', warehouseName: 'Assembly Cleanroom', binLocation: 'CLN-TOOL-01', availableQty: 18, unit: 'Nos', unitCost: 28000, lineValuation: 504000, status: 'Optimal' }
  ]).map((it, idx) => {
    const rawVal = it.lineValuation || ((it.availableQty || 1) * (typeof it.unitCost === 'number' ? it.unitCost : parseFloat(String(it.unitCost || 0).replace(/[^0-9.-]+/g, '')) || 1000));
    return [
      idx + 1,
      it.sku || it.item_code,
      it.name || it.item_name,
      it.category || 'General',
      it.warehouseName || it.location || 'Central Store',
      it.binLocation || it.bin || '—',
      `${it.availableQty || it.quantity || 0} ${it.unit || 'Nos'}`,
      formatCurrency(it.unitCost || 1000),
      formatCurrency(rawVal),
      it.status || 'Active'
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [['#', 'SKU / Part Code', 'Material / Component Name', 'Category', 'Warehouse Facility', 'Bin / Rack', 'Stock Qty', 'Unit Cost', 'Total Valuation', 'Stock Status']],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: THEME.primary,
      textColor: THEME.white,
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'center'
    },
    styles: {
      fontSize: 7,
      cellPadding: 2,
      textColor: THEME.textMain,
      lineColor: THEME.border,
      lineWidth: 0.2
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { halign: 'center', cellWidth: 26 },
      2: { halign: 'left', cellWidth: 62 },
      3: { halign: 'left', cellWidth: 26 },
      4: { halign: 'left', cellWidth: 42 },
      5: { halign: 'center', cellWidth: 22 },
      6: { halign: 'right', cellWidth: 20 },
      7: { halign: 'right', cellWidth: 22 },
      8: { halign: 'right', cellWidth: 26 },
      9: { halign: 'center', cellWidth: 22 }
    }
  });

  drawCorporateFooter(doc);
  doc.save(`GPS_Inventory_Valuation_${new Date().toISOString().split('T')[0]}.pdf`);
};

// ==========================================
// 10. SPINDLE FLEET ASSET REGISTRY PDF
// ==========================================
export const exportSpindleRegistryPdf = (spindles = []) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  let y = drawCorporateHeader(doc, 'SPINDLE FLEET ASSET REGISTRY', 'FLEET SUMMARY', 'Installed Base, Precision Machine Tool Spindles & Service Life History');

  const rows = (spindles.length > 0 ? spindles : [
    { serial_number: 'SN-2026-081', model: 'GPS-HSK-A63-24K', max_rpm: 24000, power_kw: 18.5, tool_interface: 'HSK-A63', customer: 'Tata Motors Powertrain', warranty_status: 'Active', health: 'Optimal' },
    { serial_number: 'SN-2026-082', model: 'GPS-BT40-15K', max_rpm: 15000, power_kw: 15.0, tool_interface: 'BT40', customer: 'Bharat Forge Ltd', warranty_status: 'Active', health: 'Optimal' },
    { serial_number: 'SN-2026-083', model: 'GPS-BT50-8K-GEAR', max_rpm: 8000, power_kw: 22.0, tool_interface: 'BT50', customer: 'L&T Heavy Engineering', warranty_status: 'Expired', health: 'Service Due' },
    { serial_number: 'SN-2026-084', model: 'GPS-HF-60K-AERO', max_rpm: 60000, power_kw: 12.0, tool_interface: 'HSK-E25', customer: 'Godrej Aerospace', warranty_status: 'Active', health: 'Optimal' }
  ]).map((s, idx) => [
    idx + 1,
    s.serial_number || s.serialNumber || s.id,
    s.model || s.spindle_model || 'GPS Spindle Unit',
    `${(s.max_rpm || s.maxRpm || 24000).toLocaleString()} RPM`,
    `${s.power_kw || s.powerKw || 15} kW`,
    s.tool_interface || s.toolInterface || 'HSK-A63',
    s.customer || s.customer_name || 'Plant Asset',
    formatDate(s.installation_date || s.commissioning_date || '2025-06-15'),
    s.warranty_status || 'Under Warranty',
    s.status || s.health || 'Operational'
  ]);

  autoTable(doc, {
    startY: y,
    head: [['#', 'Spindle Serial', 'Model Designation', 'Max Speed', 'Power', 'Tooling', 'Customer / Plant Installation', 'Commissioned', 'Warranty', 'Health Status']],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: THEME.primary,
      textColor: THEME.white,
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center'
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2.2,
      textColor: THEME.textMain,
      lineColor: THEME.border,
      lineWidth: 0.2
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'center', cellWidth: 28 },
      2: { halign: 'left', cellWidth: 42 },
      3: { halign: 'center', cellWidth: 24 },
      4: { halign: 'center', cellWidth: 18 },
      5: { halign: 'center', cellWidth: 24 },
      6: { halign: 'left', cellWidth: 60 },
      7: { halign: 'center', cellWidth: 26 },
      8: { halign: 'center', cellWidth: 24 },
      9: { halign: 'center', cellWidth: 24 }
    }
  });

  drawCorporateFooter(doc);
  doc.save(`GPS_Spindle_Asset_Registry_${new Date().toISOString().split('T')[0]}.pdf`);
};

// ==========================================
// 11. QUALITY CALIBRATION CERTIFICATE PDF
// ==========================================
export const exportCalibrationCertificatePdf = (inspection) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const isService = inspection?.spindleCategory === 'service';
  const certSubtitle = isService 
    ? 'Spindle Overhaul Metrology Acceptance & Re-Certification' 
    : 'Metrology Acceptance & Dynamic Balancing Certificate';
  let y = drawCorporateHeader(doc, 'CALIBRATION CERTIFICATE', inspection?.inspection_number || inspection?.id || 'QC-2026-104', certSubtitle);

  // Spindle & Test Specification Card
  doc.setFillColor(...THEME.surface);
  doc.roundedRect(14, y, pageWidth - 28, 28, 1.5, 1.5, 'F');
  doc.setDrawColor(...THEME.border);
  doc.roundedRect(14, y, pageWidth - 28, 28, 1.5, 1.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...THEME.primary);
  doc.text('METROLOGY SPECIFICATIONS & ENVIRONMENT:', 18, y + 6);

  const spindleSerial = inspection?.spindle?.serial_number || inspection?.spindle_serial || 'SN-2026-081';
  const spindleModel = inspection?.spindle?.model || inspection?.spindle_model || 'GPS-HSK-A63-24K';
  const customer = inspection?.work_order?.customer_name || inspection?.customer || 'Tata Motors Powertrain';
  const inspector = inspection?.inspector?.full_name || inspection?.inspector_name || 'Prakash Kulkarni (Lead QA Metrologist)';

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...THEME.textMain);
  doc.text(`Spindle Serial: ${spindleSerial} (${isService ? 'Service Overhaul' : 'New Build'})`, 18, y + 11.5);
  doc.text(`Spindle Model: ${spindleModel}`, 18, y + 16.5);
  doc.text(`Customer / End User: ${customer}`, 18, y + 21.5);

  const colRight = pageWidth - 90;
  doc.text(`Inspection Date: ${formatDate(inspection?.inspection_date)}`, colRight, y + 11.5);
  doc.text(`Ambient Temp: ${inspection?.ambient_temp_celsius || '20.0'} °C (Cleanroom Lab)`, colRight, y + 16.5);
  doc.text(`Certified Inspector: ${inspector}`, colRight, y + 21.5);

  y += 32;

  // Metrology Checkpoints Table
  const checkpoints = (inspection?.checkpoints && inspection?.checkpoints.length > 0) ? inspection.checkpoints : [
    { parameter_name: 'Taper Runout at Nose (Radial)', nominal_value: 0, tolerance_max: 0.0010, measured_value: 0.0006, unit_of_measure: 'mm', status: 'Pass' },
    { parameter_name: 'Taper Runout at 300mm Test Bar', nominal_value: 0, tolerance_max: 0.0030, measured_value: 0.0018, unit_of_measure: 'mm', status: 'Pass' },
    { parameter_name: 'Axial Float / End Play', nominal_value: 0, tolerance_max: 0.0010, measured_value: 0.0005, unit_of_measure: 'mm', status: 'Pass' },
    { parameter_name: 'Dynamic Balancing Quality Grade', nominal_value: 'ISO 1940', tolerance_max: 'G0.4', measured_value: 'G0.32', unit_of_measure: 'Grade', status: 'Pass' },
    { parameter_name: 'Max Vibration Velocity (RMS)', nominal_value: 0, tolerance_max: 0.8, measured_value: 0.42, unit_of_measure: 'mm/s', status: 'Pass' },
    { parameter_name: 'Front Bearing Temp Rise @ 24,000 RPM', nominal_value: 20, tolerance_max: 18.0, measured_value: 12.4, unit_of_measure: '°C ΔT', status: 'Pass' },
    { parameter_name: 'Tool Clamping Retention Force', nominal_value: 18, tolerance_min: 16.5, tolerance_max: 20.0, measured_value: 18.2, unit_of_measure: 'kN', status: 'Pass' }
  ];

  const tableRows = checkpoints.map((cp, idx) => {
    let spec = 'Nominal';
    if (cp.tolerance_max !== undefined && cp.tolerance_max !== null) {
      spec = cp.tolerance_min ? `${cp.tolerance_min} to ${cp.tolerance_max} ${cp.unit_of_measure || ''}` : `≤ ${cp.tolerance_max} ${cp.unit_of_measure || ''}`;
    }

    return [
      idx + 1,
      cp.parameter_name || cp.name,
      spec,
      `${cp.measured_value !== undefined ? cp.measured_value : '—'} ${cp.unit_of_measure || ''}`,
      'Dial Indicator / Schenck Balancing Rig',
      cp.status || 'Pass'
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [['#', 'Metrology Checkpoint / Test Parameter', 'Tolerance Specification', 'Measured Value', 'Test Instrument / Gauge', 'Result']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: THEME.primary,
      textColor: THEME.white,
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center'
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2.5,
      textColor: THEME.textMain,
      lineColor: THEME.border,
      lineWidth: 0.2
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { halign: 'left', cellWidth: 62 },
      2: { halign: 'center', cellWidth: 38 },
      3: { halign: 'center', cellWidth: 30 },
      4: { halign: 'left', cellWidth: 36 },
      5: { halign: 'center', cellWidth: 18 }
    }
  });

  const finalY = doc.lastAutoTable.finalY + 8;

  // QA Stamp & ISO Declaration
  doc.setFillColor(...THEME.primaryLight);
  doc.roundedRect(14, finalY, pageWidth - 28, 28, 1.5, 1.5, 'F');
  doc.setDrawColor(...THEME.border);
  doc.roundedRect(14, finalY, pageWidth - 28, 28, 1.5, 1.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...THEME.primary);
  doc.text('FINAL QUALITY CERTIFICATION & RELEASE VERDICT:', 18, finalY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...THEME.textMain);
  doc.text('This spindle has undergone 100% rigorous thermal run-in at maximum rated velocity for 4 continuous hours.', 18, finalY + 11.5);
  doc.text('All micron geometric tolerances, vibration spectra, and dynamic balancing meet or exceed ISO 1940:2003 standards.', 18, finalY + 16);
  doc.text('Verdict: APPROVED FOR DISPATCH & PRODUCTION COMMISSIONING', 18, finalY + 21, { fontStyle: 'bold' });

  drawSignatory(doc, finalY + 36, 'Lead QA Metrologist Sign', 'Director of Quality Assurance');
  drawCorporateFooter(doc);

  doc.save(`GPS_Calibration_Certificate_${spindleSerial}.pdf`);
};

// ==========================================
// 12. EXECUTIVE BI & ANALYTICS REPORT PDF
// ==========================================
export const exportExecutiveBiReportPdf = (analytics = {}, timeRange = 'q4') => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = drawCorporateHeader(doc, 'EXECUTIVE BI & ANALYTICS', timeRange.toUpperCase(), 'Manufacturing Performance, Metrology Yields & Factory Throughput');

  const kpis = analytics.kpis || {
    spindlesManufactured: 214,
    firstPassYield: 98.4,
    avgServiceTatDays: 4.2,
    annualRevenueCr: 16.8
  };

  // Top 4 Metric Tiles
  const boxWidth = (pageWidth - 28 - 9) / 4;
  const kpiData = [
    { label: 'Spindles Built', val: `${kpis.spindlesManufactured} Units` },
    { label: 'First-Pass Yield', val: `${kpis.firstPassYield}%` },
    { label: 'Avg Service TAT', val: `${kpis.avgServiceTatDays} Days` },
    { label: 'Annual Revenue', val: `Rs. ${kpis.annualRevenueCr} Cr` }
  ];

  kpiData.forEach((kpi, idx) => {
    const x = 14 + idx * (boxWidth + 3);
    doc.setFillColor(...THEME.surface);
    doc.roundedRect(x, y, boxWidth, 18, 1.5, 1.5, 'F');
    doc.setDrawColor(...THEME.border);
    doc.roundedRect(x, y, boxWidth, 18, 1.5, 1.5, 'S');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...THEME.textMuted);
    doc.text(kpi.label, x + boxWidth / 2, y + 6, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(...THEME.primary);
    doc.text(kpi.val, x + boxWidth / 2, y + 13, { align: 'center' });
  });

  y += 24;

  // Monthly Production Throughput Table
  const throughput = (analytics.throughput && analytics.throughput.length > 0) ? analytics.throughput : [
    { month: 'Oct 2025', motorized: 32, beltDriven: 14, rebuilds: 22, total: 68 },
    { month: 'Nov 2025', motorized: 36, beltDriven: 16, rebuilds: 25, total: 77 },
    { month: 'Dec 2025', motorized: 38, beltDriven: 18, rebuilds: 28, total: 84 },
    { month: 'Jan 2026', motorized: 42, beltDriven: 20, rebuilds: 30, total: 92 },
    { month: 'Feb 2026', motorized: 45, beltDriven: 22, rebuilds: 34, total: 101 }
  ];

  const throughputRows = throughput.map(r => [
    r.month,
    r.motorized,
    r.beltDriven,
    r.rebuilds,
    r.total,
    'On Target'
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Month', 'Motorized Spindles', 'Belt-Driven Spindles', 'Service Rebuilds', 'Total Plant Output', 'Performance']],
    body: throughputRows,
    theme: 'grid',
    headStyles: {
      fillColor: THEME.primary,
      textColor: THEME.white,
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center'
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2.2,
      textColor: THEME.textMain,
      lineColor: THEME.border,
      lineWidth: 0.2
    },
    columnStyles: {
      0: { halign: 'left', cellWidth: 35 },
      1: { halign: 'center', cellWidth: 35 },
      2: { halign: 'center', cellWidth: 35 },
      3: { halign: 'center', cellWidth: 30 },
      4: { halign: 'center', fontStyle: 'bold', cellWidth: 30 },
      5: { halign: 'center', cellWidth: 27 }
    }
  });

  y = doc.lastAutoTable.finalY + 8;

  // Spindle Model Distribution Table
  const models = (analytics.models && analytics.models.length > 0) ? analytics.models : [
    { model: 'GPS-HSK-A63 24,000 RPM Motorized', units: 78, share: '36.4%' },
    { model: 'GPS-BT40 15,000 RPM Direct Drive', units: 54, share: '25.2%' },
    { model: 'GPS-BT50 8,000 RPM Geared Heavy Mill', units: 36, share: '16.8%' },
    { model: 'GPS-HF-60K Ultra High-Speed Aero', units: 28, share: '13.1%' },
    { model: 'Custom Engineering & Grinding Spindles', units: 18, share: '8.5%' }
  ];

  const modelRows = models.map((m, idx) => [
    idx + 1,
    m.model,
    m.units,
    m.share
  ]);

  autoTable(doc, {
    startY: y,
    head: [['#', 'Spindle Series / Model Class', 'Units Manufactured', 'Revenue Share %']],
    body: modelRows,
    theme: 'grid',
    headStyles: {
      fillColor: THEME.primaryDark,
      textColor: THEME.white,
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center'
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2.2,
      textColor: THEME.textMain,
      lineColor: THEME.border,
      lineWidth: 0.2
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'left', cellWidth: 110 },
      2: { halign: 'center', cellWidth: 35 },
      3: { halign: 'center', cellWidth: 37 }
    }
  });

  drawCorporateFooter(doc);
  doc.save(`GPS_Executive_BI_Analytics_${timeRange}_${new Date().toISOString().split('T')[0]}.pdf`);
};

// ==========================================
// 13. SHIFT HANDOVER & SHOP FLOOR REPORT PDF
// ==========================================
export const exportShiftReportPdf = (workOrders = []) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  let y = drawCorporateHeader(doc, 'SHIFT HANDOVER & SHOP FLOOR REPORT', 'DAY SHIFT (BAY 1-5)', 'Active Assembly Work Orders, Bay Bottlenecks & Operational Handoff');

  const rows = (workOrders.length > 0 ? workOrders : [
    { id: 'WO-2026-081', spindleSerial: 'SN-2026-081', customer: 'Tata Motors Powertrain', model: 'GPS-HSK-A63-24K', currentOp: 'Bay 3 Assembly', technician: 'Rahul Shinde', status: 'In Progress' },
    { id: 'WO-2026-082', spindleSerial: 'SN-2026-082', customer: 'Bharat Forge Mundhwa', model: 'GPS-BT40-15K', currentOp: 'Bay 4 Dynamic Balancing', technician: 'Prakash Kulkarni', status: 'In Progress' },
    { id: 'WO-2026-083', spindleSerial: 'SN-2026-083', customer: 'L&T Heavy Engineering', model: 'GPS-BT50-8K', currentOp: 'Bay 5 4-Hr Thermal Run-in', technician: 'Amol Deshmukh', status: 'Testing' },
    { id: 'WO-2026-084', spindleSerial: 'SN-2026-084', customer: 'Godrej Aerospace', model: 'GPS-HF-60K', currentOp: 'Bay 2 Precision Grinding', technician: 'Vikram Jadhav', status: 'In Progress' }
  ]).map((wo, idx) => [
    idx + 1,
    wo.id,
    wo.spindleSerial || wo.serial || '—',
    wo.customer || 'Internal Stock',
    wo.model || wo.spindleModel || 'Precision Spindle',
    wo.currentOp || wo.stage || 'Bay 3 Assembly',
    wo.technician || wo.assignedTo || 'Unassigned',
    wo.status || 'Active'
  ]);

  autoTable(doc, {
    startY: y,
    head: [['#', 'Work Order #', 'Spindle Serial', 'Client / Target Facility', 'Model Specification', 'Current Bay Operation', 'Lead Technician', 'Production Status']],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: THEME.primary,
      textColor: THEME.white,
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center'
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2.5,
      textColor: THEME.textMain,
      lineColor: THEME.border,
      lineWidth: 0.2
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'center', cellWidth: 26 },
      2: { halign: 'center', cellWidth: 28 },
      3: { halign: 'left', cellWidth: 55 },
      4: { halign: 'left', cellWidth: 45 },
      5: { halign: 'left', cellWidth: 45 },
      6: { halign: 'left', cellWidth: 35 },
      7: { halign: 'center', cellWidth: 25 }
    }
  });

  drawCorporateFooter(doc);
  doc.save(`GPS_Shift_Report_${new Date().toISOString().split('T')[0]}.pdf`);
};

// ==========================================
// 14. SHOP FLOOR JOB TRAVELER SHEET PDF
// ==========================================
export const exportJobTravelerPdf = (wo, operations = []) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = drawCorporateHeader(doc, 'JOB TRAVELER SHEET', wo?.id || 'WO-2026-081', 'Shop Floor Manufacturing & Quality Routing Sign-Off Document');

  // Work Order Meta Banner
  doc.setFillColor(...THEME.surface);
  doc.roundedRect(14, y, pageWidth - 28, 26, 1.5, 1.5, 'F');
  doc.setDrawColor(...THEME.border);
  doc.roundedRect(14, y, pageWidth - 28, 26, 1.5, 1.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...THEME.primary);
  doc.text('TRAVELER SPECIFICATIONS:', 18, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...THEME.textMain);
  doc.text(`Work Order: ${wo?.id || 'WO-2026-081'}`, 18, y + 11);
  doc.text(`Spindle Serial: ${wo?.spindleSerial || 'SN-2026-081'}`, 18, y + 15.5);
  doc.text(`Spindle Model: ${wo?.spindleModel || 'GPS-HSK-A63-24K'}`, 18, y + 20);

  const colRight = pageWidth - 90;
  doc.text(`Customer: ${wo?.customer || 'Tata Motors Powertrain'}`, colRight, y + 11);
  doc.text(`Target Completion: ${formatDate(wo?.targetDate || '2026-03-10')}`, colRight, y + 15.5);
  doc.text(`Current Status: ${wo?.status || 'Active On Shop Floor'}`, colRight, y + 20);

  y += 30;

  // Operations Routing Grid
  const ops = (operations && operations.length > 0) ? operations : [
    { op_number: '10', name: 'Bay 1: Raw Material Kitting & CNC Rough Turning', bay: 'Bay 1', technician: 'Suresh Patil', status: 'Completed' },
    { op_number: '20', name: 'Bay 2: Precision CNC Cylindrical Grinding (Taper & Bearing Seats)', bay: 'Bay 2', technician: 'Vikram Jadhav', status: 'Completed' },
    { op_number: '30', name: 'Bay 3: Cleanroom Assembly & Ceramic Bearing Preload Setting', bay: 'Bay 3', technician: 'Rahul Shinde', status: 'Completed' },
    { op_number: '40', name: 'Bay 4: Dynamic Balancing @ Max RPM (Schenck Balancing Rig)', bay: 'Bay 4', technician: 'Prakash Kulkarni', status: 'In Progress' },
    { op_number: '50', name: 'Bay 5: 4-Hour Thermal Run-in & Motor Stator Diagnostic', bay: 'Bay 5', technician: 'Amol Deshmukh', status: 'Pending' },
    { op_number: '60', name: 'Bay 6: Final QA Micron Metrology Acceptance Sign-Off', bay: 'QA Lab', technician: 'Quality Inspector', status: 'Pending' },
    { op_number: '70', name: 'Bay 7: Anti-corrosion VCI Packaging & Dispatch Box Crating', bay: 'Stores', technician: 'Warehouse Lead', status: 'Pending' }
  ];

  const tableRows = ops.map(o => [
    o.op_number || o.seq || '—',
    o.name,
    o.bay || 'Shop Floor',
    o.technician || 'Technician',
    o.status === 'Completed' ? 'SIGNED OFF' : (o.status === 'In Progress' ? 'ACTIVE' : 'QUEUED'),
    '' // blank column for physical stamp/sign
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Seq', 'Operation Description', 'Work Station', 'Assigned Tech', 'Routing Status', 'Shop Sign / Stamp']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: THEME.primary,
      textColor: THEME.white,
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center'
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 3.5,
      textColor: THEME.textMain,
      lineColor: THEME.border,
      lineWidth: 0.2
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 12 },
      1: { halign: 'left', cellWidth: 70 },
      2: { halign: 'left', cellWidth: 26 },
      3: { halign: 'left', cellWidth: 28 },
      4: { halign: 'center', cellWidth: 24 },
      5: { halign: 'center', cellWidth: 22 }
    }
  });

  const finalY = doc.lastAutoTable.finalY + 8;
  drawSignatory(doc, finalY, 'Production Supervisor Sign', 'Plant Operations Head');
  drawCorporateFooter(doc);

  doc.save(`GPS_Job_Traveler_${wo?.id || 'WO-2026'}.pdf`);
};

// ==========================================
// 15. OFFICIAL ESTIMATE / QUOTATION PDF (100% EXACT 1:1 REPLICA OF ESTIMATE_QTN 2026-27 294 PDF)
// ==========================================
export const exportQuotationPdf = async (quote = {}) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const marginX = 14;
  const contentWidth = pageWidth - (marginX * 2); // 182mm

  const items = (quote.items && quote.items.length > 0) ? quote.items : [
    { id: 1, name: 'REPAIRING OF KESSLAR HSK-63 SPINDLE', hsn: '84669390', qty: 1, unitPrice: 110000 },
    { id: 2, name: 'SHAFT SLEEVING', hsn: '998717', qty: 1, unitPrice: 225000 },
    { id: 3, name: 'MANUFACTURING OF DRAWBAR LOCKNUT', hsn: '998717', qty: 1, unitPrice: 7500 },
    { id: 4, name: 'MANUFACTURING OF TOOL CLAMP DICLAMP PLATE', hsn: '998717', qty: 1, unitPrice: 7500 },
    { id: 5, name: 'HC7014-EDLR-T-P4S-UL -FAG MAKE.', hsn: '', qty: 2, unitPrice: 96000 },
    { id: 6, name: 'N1011-D-K-TVP-SP-XL', hsn: '84821012', qty: 1, unitPrice: 18000 },
    { id: 7, name: 'STATOR INSPECTION', hsn: '998717', qty: 1, unitPrice: 15000 }
  ];

  const subtotal = Number(quote.subtotal) || items.reduce((sum, it) => sum + (Number(it.qty || 0) * Number(it.unitPrice || 0)), 0);
  const taxRate = Number(quote.taxRate) || 18;
  const gstAmount = Number(quote.gstAmount) || Number(quote.taxAmount) || Math.round(subtotal * (taxRate / 100));
  const totalAmount = Number(quote.totalAmount) || (subtotal + gstAmount);
  const totalQty = items.reduce((s, it) => s + (Number(it.qty) || 0), 0);

  const formatRupee = (num) => 'Rs. ' + Number(num || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const subtotalFormatted = formatRupee(subtotal);
  const gstFormatted = formatRupee(gstAmount);
  const totalFormatted = formatRupee(totalAmount);

  // 1. Document Title: "Estimate" centered at top, NO underline
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text('Estimate', pageWidth / 2, 13, { align: 'center' });

  // 2. Main Outer Top Header Grid (X = marginX, Y = 16)
  const headerBoxY = 16;
  const headerBoxH = 27;
  const splitColX = 124;

  doc.setDrawColor(184, 184, 184);
  doc.setLineWidth(0.18);
  doc.rect(marginX, headerBoxY, contentWidth, headerBoxH, 'S');

  // Vertical dividing line between left company details and right metadata
  doc.line(splitColX, headerBoxY, splitColX, headerBoxY + headerBoxH);

  // Company details on Left — with GPS logo
  // Fetch logo as base64 so jsPDF can embed it
  let logoDataUrl = null;
  try {
    const resp = await fetch('/logo.jpg');
    const blob = await resp.blob();
    logoDataUrl = await new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result);
      reader.onerror = rej;
      reader.readAsDataURL(blob);
    });
  } catch(_e) { logoDataUrl = null; }

  const textX = logoDataUrl ? (marginX + 32) : (marginX + 3);

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'JPEG', marginX + 2.5, headerBoxY + 6.5, 27, 13.5);
  }

  // Company title: 2 lines matching the original format
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);
  doc.text('GENERAL PRECISION', textX, headerBoxY + 4.2);
  doc.text('SPINDLES', textX, headerBoxY + 7.6);

  // Address lines to the right of the logo — no overlap
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.8);
  doc.setTextColor(0, 0, 0);
  doc.text('SR NO 15/A/2 GKD INDUSTRIAL ESTATE, NEAR SAVLI', textX, headerBoxY + 11.0);
  doc.text('DHABA,NANDED PHATA SINHAGAD ROAD PUNE-411041 ,', textX, headerBoxY + 13.8);

  const qtnPhoneData = getBlackPhoneIconData();
  if (qtnPhoneData) {
    try {
      const iconH = 1.9;
      const iconW = iconH * (qtnPhoneData.aspectRatio || 1.08);
      doc.addImage(qtnPhoneData.dataUrl, 'PNG', textX, headerBoxY + 14.7, iconW, iconH);
      doc.text('+919764252188 /9764032929', textX + iconW + 0.35, headerBoxY + 16.6);
    } catch (_imgErr) {
      doc.text('+919764252188 /9764032929', textX, headerBoxY + 16.6);
    }
  } else {
    doc.text('+919764252188 /9764032929', textX, headerBoxY + 16.6);
  }
  doc.text('Email: process@gpsspindles.net', textX, headerBoxY + 19.4);
  doc.text('GSTIN: 27AATFG1527D1ZF', textX, headerBoxY + 22.2);
  doc.text('State: 27-Maharashtra', textX, headerBoxY + 25.0);

  // Right side: Metadata (3 Rows: Row 1 = Estimate No/Date, Row 2 = Place of supply/empty corner, Row 3 = empty bottom space)
  const rightW = (marginX + contentWidth) - splitColX;
  const midMetaX = splitColX + (rightW / 2);
  const row1H = 8.5;
  const row2H = 8.5;
  const row1Bottom = headerBoxY + row1H;
  const row2Bottom = row1Bottom + row2H;

  // Horizontal line 1: separates Row 1 from Row 2
  doc.line(splitColX, row1Bottom, marginX + contentWidth, row1Bottom);

  // Horizontal line 2: separates Row 2 from Row 3 (empty bottom space)
  doc.line(splitColX, row2Bottom, marginX + contentWidth, row2Bottom);

  // Vertical line dividing left and right columns across Row 1 and Row 2 (stops before empty Row 3)
  doc.line(midMetaX, headerBoxY, midMetaX, row2Bottom);

  // Row 1: Estimate No. (left) and Date (right)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(0, 0, 0);
  doc.text('Estimate No.', splitColX + 2.5, headerBoxY + 3.4);
  doc.text('Date', midMetaX + 2.5, headerBoxY + 3.4);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(String(quote.estimateNo || quote.id || 'QTN/2026-27/294'), splitColX + 2.5, headerBoxY + 7.2);
  doc.text(String(quote.date || '07-09-2026'), midMetaX + 2.5, headerBoxY + 7.2);

  // Row 2: Place of supply (left) and empty right corner
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.text('Place of supply', splitColX + 2.5, row1Bottom + 3.4);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(String(quote.placeOfSupply || quote.state || '23-Madhya Pradesh'), splitColX + 2.5, row1Bottom + 7.2);

  // Row 3: Empty space between row2Bottom and (headerBoxY + headerBoxH) matching original PDF

  // 3. Estimate For (Customer Box) - matching generous spacing from Image 3
  const custBoxY = headerBoxY + headerBoxH;
  const custBoxH = 34;

  doc.rect(marginX, custBoxY, contentWidth, custBoxH, 'S');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(0, 0, 0);
  doc.text('Estimate For', marginX + 3, custBoxY + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(String(quote.customer || 'LINAMAR INDIA PRIVATE LIMITED'), marginX + 3, custBoxY + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.text('Survey No.-332/3, 334 Industrial Area-3 AB Road Dewas', marginX + 3, custBoxY + 13.5);
  doc.text('Dewas, Madhya Pradesh-455001', marginX + 3, custBoxY + 16.7);
  doc.text('India', marginX + 3, custBoxY + 19.9);
  // Generous gap after India matching Image 3
  doc.text(`Contact No. : ${quote.contactNo || '7773877714'}`, marginX + 3, custBoxY + 24.5);
  doc.text(`GSTIN : ${quote.gstin || '23AACCL5351J1ZM'}`, marginX + 3, custBoxY + 28);
  doc.text(`State: ${quote.state || quote.placeOfSupply || '23-Madhya Pradesh'}`, marginX + 3, custBoxY + 31.5);

  // 4. Line Items Table (no dummy rows, matching exact PDF line items)
  const tableRows = items.map((item, idx) => {
    const lineAmt = Number(item.total != null ? item.total : (Number(item.qty || 0) * Number(item.unitPrice || 0)));
    return [
      idx + 1,
      item.name || item.desc,
      item.hsn || '',
      item.qty,
      formatRupee(item.unitPrice),
      formatRupee(lineAmt)
    ];
  });

  autoTable(doc, {
    startY: custBoxY + custBoxH,
    margin: { left: marginX, right: marginX },
    head: [['#', 'Item name', 'HSN/ SAC', 'Quantity', 'Price/ Unit', 'Amount']],
    body: tableRows,
    foot: [['', 'Total', '', { content: String(totalQty), styles: { halign: 'right' } }, '', { content: subtotalFormatted, styles: { halign: 'right' } }]],
    theme: 'grid',
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 7,
      lineColor: [184, 184, 184],
      lineWidth: 0.18,
      cellPadding: { top: 2, bottom: 2, left: 1.5, right: 1.5 }
    },
    bodyStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontSize: 6.8,
      lineColor: [184, 184, 184],
      lineWidth: 0.18,
      cellPadding: { top: 1.8, bottom: 1.8, left: 1.5, right: 1.5 }
    },
    footStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 7,
      lineColor: [184, 184, 184],
      lineWidth: 0.18,
      cellPadding: { top: 2, bottom: 2, left: 1.5, right: 1.5 }
    },
    columnStyles: {
      0: { halign: 'left', cellWidth: 8 },
      1: { halign: 'left', fontStyle: 'bold', cellWidth: 82 },
      2: { halign: 'left', cellWidth: 24 },
      3: { halign: 'right', cellWidth: 16 },
      4: { halign: 'right', cellWidth: 26 },
      5: { halign: 'right', cellWidth: 26 }
    },
    didParseCell: (data) => {
      if (data.column.index === 0 || data.column.index === 1 || data.column.index === 2) {
        data.cell.styles.halign = 'left';
      } else if (data.column.index === 3 || data.column.index === 4 || data.column.index === 5) {
        data.cell.styles.halign = 'right';
      }
    }
  });

  // 5. Middle Section (Words, Description, Amounts)
  const pageBottom = pageHeight - marginX; // 283mm
  const targetBottomH = 44;
  const targetBottomY = pageBottom - targetBottomH; // ~239mm
  const midSplitX = marginX + 110;
  let middleY = doc.lastAutoTable.finalY;

  // Precompute HSN table so we can size Middle Section so HSN table lands flush with Bottom Box
  const computeHsnSummary = (itemList) => {
    const map = {};
    itemList.forEach(it => {
      const rawCode = it.hsn != null ? String(it.hsn).trim() : '';
      const key = rawCode === '' ? '__blank__' : rawCode;
      const amt = Number(it.total != null ? it.total : (Number(it.qty || 0) * Number(it.unitPrice || 0))) || 0;
      if (!map[key]) {
        map[key] = { hsn: rawCode, taxable: 0, rate: '18%', igst: 0, totalTax: 0 };
      }
      map[key].taxable += amt;
    });
    return Object.values(map)
      .sort((a, b) => {
        if (!a.hsn && b.hsn) return -1;
        if (a.hsn && !b.hsn) return 1;
        return String(a.hsn).localeCompare(String(b.hsn));
      })
      .map(entry => {
        const tax = Math.round(entry.taxable * 0.18);
        return {
          hsn: entry.hsn,
          taxable: entry.taxable,
          rate: '18%',
          igst: tax,
          totalTax: tax
        };
      });
  };

  const hsnList = (quote.hsnSummary && quote.hsnSummary.length > 0)
    ? quote.hsnSummary
    : computeHsnSummary(items);

  const hsnRows = hsnList.map(h => [
    h.hsn || '',
    formatRupee(h.taxable),
    h.rate || '18%',
    formatRupee(h.igst),
    formatRupee(h.totalTax)
  ]);

  // HSN table height: 2 header rows (6.2mm) + body rows (2.8mm each) + 1 foot row (2.8mm)
  const estimatedHsnH = 6.2 + (hsnRows.length * 2.8) + 2.8;
  const availableMiddleH = targetBottomY - estimatedHsnH - middleY;
  const middleH = Math.max(52, availableMiddleH);

  doc.setDrawColor(184, 184, 184);
  doc.setLineWidth(0.18);
  doc.rect(marginX, middleY, contentWidth, middleH, 'S');
  doc.line(midSplitX, middleY, midSplitX, middleY + middleH);

  // Estimate Amount in Words Box
  const wordsH = 10;
  doc.line(marginX, middleY + wordsH, midSplitX, middleY + wordsH);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(0, 0, 0);
  doc.text('Estimate Amount in Words', marginX + 2, middleY + 4);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  const amtWords = quote.amountInWords || numberToIndianWords(totalAmount);
  const amtWordLines = doc.splitTextToSize(amtWords, midSplitX - marginX - 4);
  doc.text(amtWordLines, marginX + 2, middleY + 8);

  // Description Box — matches actual PDF format exactly:
  // - "Description" label in normal weight
  // - SERIAL NO / CHALLAN / INWORD DATE / SCOPE OF WORK header in bold
  // - All scope items in a SINGLE COLUMN in bold (not two-column split)
  // - inwardDate formatted as DD-MM-YYYY

  const formatInwardDate = (raw) => {
    if (!raw) return '22-08-2026';
    if (/^\d{2}-\d{2}-\d{4}$/.test(raw)) return raw;
    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}-${mm}-${yyyy}`;
    }
    return String(raw);
  };

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.text('Description', marginX + 2, middleY + wordsH + 4);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  let descY = middleY + wordsH + 8;
  doc.text(`SERIAL NO. ${quote.spindleSerial || 'HMMXXVI'}`, marginX + 2, descY); descY += 3.4;
  doc.text(`CHALLAN NO. ${quote.challanNo || 'N/A'}`, marginX + 2, descY); descY += 3.4;
  doc.text(`INWORD DATE. ${formatInwardDate(quote.inwardDate)}`, marginX + 2, descY); descY += 3.4;
  doc.text('SCOPE OF WORK :-', marginX + 2, descY); descY += 3.5;

  const rawScope = Array.isArray(quote.scopeOfWork)
    ? quote.scopeOfWork
    : (quote.scopeOfWork || '1. DISMANTLE\n2. CLEANING\n3. INSPECTION\n4. BEARING REPLACEMENT\n5. HSK -63 SHAFT SLEEVING\n6. MFG OF DRAWBAR LOCKNUT\n7. MFG OF TOOL CLAMP DICLAMP PLATE .\n8. STATOR INSPECTION.\n9. STATIC TEST.\n10. ASSEMBLY\n11. DYANAMIC TEST.').split('\n');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  rawScope.forEach((line, idx) => {
    doc.text(line.trim(), marginX + 2, descY + (idx * 3.0));
  });

  // Right Side: Amounts Box
  const amtRX = midSplitX + 2;
  const amtRight = marginX + contentWidth - 2;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(0, 0, 0);
  doc.text('Amounts', amtRX, middleY + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Sub Total', amtRX, middleY + 14);
  doc.text(subtotalFormatted, amtRight, middleY + 14, { align: 'right' });

  doc.text(`Tax (${taxRate}%)`, amtRX, middleY + 22);
  doc.text(gstFormatted, amtRight, middleY + 22, { align: 'right' });

  doc.setDrawColor(184, 184, 184);
  doc.setLineWidth(0.18);
  doc.line(amtRX, middleY + 27, amtRight, middleY + 27);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Total', amtRX, middleY + 34);
  doc.text(totalFormatted, amtRight, middleY + 34, { align: 'right' });

  // 6. HSN/SAC Tax Summary Table (matching blank-HSN sorted first)

  autoTable(doc, {
    startY: middleY + middleH,
    margin: { left: marginX, right: marginX },
    head: [
      [
        { content: 'HSN/ SAC', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'Taxable amount', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'IGST', colSpan: 2, styles: { halign: 'center' } },
        { content: 'Total Tax Amount', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }
      ],
      [
        { content: 'Rate', styles: { halign: 'center' } },
        { content: 'Amount', styles: { halign: 'center' } }
      ]
    ],
    body: hsnRows,
    foot: [[{ content: 'Total', styles: { halign: 'right' } }, subtotalFormatted, '', gstFormatted, gstFormatted]],
    theme: 'grid',
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 6,
      lineColor: [184, 184, 184],
      lineWidth: 0.18,
      cellPadding: { top: 0.9, bottom: 0.9, left: 1.5, right: 1.5 }
    },
    bodyStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontSize: 6,
      lineColor: [184, 184, 184],
      lineWidth: 0.18,
      cellPadding: { top: 0.9, bottom: 0.9, left: 1.5, right: 1.5 }
    },
    footStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 6,
      lineColor: [184, 184, 184],
      lineWidth: 0.18,
      cellPadding: { top: 0.9, bottom: 0.9, left: 1.5, right: 1.5 }
    },
    columnStyles: {
      0: { halign: 'left', cellWidth: 38 },
      1: { halign: 'right', cellWidth: 44 },
      2: { halign: 'right', cellWidth: 22 },
      3: { halign: 'right', cellWidth: 40 },
      4: { halign: 'right', cellWidth: 38 }
    },
    didParseCell: (data) => {
      if (data.section === 'head') {
        data.cell.styles.halign = 'center';
      } else if (data.section === 'body') {
        if (data.column.index === 0) data.cell.styles.halign = 'left';
        if (data.column.index === 1) data.cell.styles.halign = 'right';
        if (data.column.index === 2) data.cell.styles.halign = 'right';
        if (data.column.index === 3) data.cell.styles.halign = 'right';
        if (data.column.index === 4) data.cell.styles.halign = 'right';
      } else if (data.section === 'foot') {
        data.cell.styles.halign = 'right';
      }
    }
  });

  // 7. Bottom 3-Column Footer Box (Bank Details, Terms, Signatory)
  // Attached directly to bottom of HSN table with ZERO gap
  const actualBottomY = doc.lastAutoTable.finalY;
  const actualBottomH = Math.max(targetBottomH, pageBottom - actualBottomY);
  const col1W = 62;
  const col2W = 68;
  const col3W = contentWidth - col1W - col2W;
  const col2X = marginX + col1W;
  const col3X = col2X + col2W;

  doc.setDrawColor(184, 184, 184);
  doc.setLineWidth(0.18);
  doc.rect(marginX, actualBottomY, contentWidth, actualBottomH, 'S');
  doc.line(col2X, actualBottomY, col2X, actualBottomY + actualBottomH);
  doc.line(col3X, actualBottomY, col3X, actualBottomY + actualBottomH);

  // Column 1: Bank Details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(0, 0, 0);
  doc.text('Bank Details', marginX + 2, actualBottomY + 4.5);

  // Dynamic Amount-Wise Scannable UPI QR Code
  const upiId = quote.bankDetails?.upiId || quote.upiId || getActiveUpiId();
  const payeeName = quote.bankDetails?.accountHolder || quote.bankDetails?.accountName || DEFAULT_BANK_DETAILS.accountHolder;
  const quoteRef = quote.estimateNo || quote.id || '';

  try {
    const qrDataUrl = await generateUpiQrDataUrl({
      upiId,
      payeeName,
      amount: totalAmount,
      transactionNote: quoteRef ? `Quotation ${quoteRef}` : 'Quotation Payment',
      transactionRef: quoteRef
    }, { width: 300, margin: 1 });

    if (qrDataUrl) {
      doc.addImage(qrDataUrl, 'PNG', marginX + 2, actualBottomY + 6.5, 14.5, 14.5);
    }
  } catch (_qrErr) {
    console.error('Failed to generate UPI QR for quotation PDF:', _qrErr);
  }

  // UPI badge
  doc.setFillColor(22, 163, 74);
  doc.rect(marginX + 2, actualBottomY + 21.5, 14.5, 3.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4);
  doc.setTextColor(255, 255, 255);
  doc.text('UPI: SCAN TO PAY', marginX + 9.25, actualBottomY + 23.8, { align: 'center' });

  // Bank Text
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.6);
  doc.setTextColor(0, 0, 0);
  let bankY = actualBottomY + 7.5;
  doc.text('Name : ICICI BANK LIMITED, PUNE', marginX + 18, bankY); bankY += 3.0;
  doc.text('NANDED CITY', marginX + 18, bankY); bankY += 3.6;
  doc.text('Account No. : 349105000701', marginX + 18, bankY); bankY += 3.6;
  doc.text('IFSC code : ICIC0003491', marginX + 18, bankY); bankY += 3.6;
  doc.text(`UPI ID : ${upiId}`, marginX + 18, bankY); bankY += 3.6;
  doc.text("Account holder's name : GENERAL", marginX + 18, bankY); bankY += 3.0;
  doc.text('PRECISION SPINDLES', marginX + 18, bankY);

  // Column 2: Terms and conditions
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(0, 0, 0);
  doc.text('Terms and conditions', col2X + 2, actualBottomY + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.2);
  const termsTextLines = [
    'We declare that this invoice shows the actual price of the goods',
    'described and that all particulars are true and correct.',
    '',
    'Bank Details:',
    'ICICI Bank Ltd(Nanded City Branch)',
    'A/c No : 349105000701',
    'IFSC Code: ICIC0003491',
    'MSME (UDYAM ADHAR) NO-MH26A0189736',
    'TYPE OF ENTERPRISES: SPINDLE MANUFACTURING',
    'AND REPAIRING',
    'MAJOR ACTIVITIES IN OUR INVOICE: ALL TYPES OF',
    'CNC,VMC,HMC,BELT DRIVEN,DIRECT DRIVEN,',
    'INTEGRATED,SPINDLE REPAIRING ,SPINDLE',
    'MANUFACTURING.'
  ];
  termsTextLines.forEach((line, i) => { doc.text(line, col2X + 2, actualBottomY + 7.5 + (i * 2.35)); });

  // Column 3: Authorized Signatory
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(0, 0, 0);
  doc.text('For : GENERAL PRECISION SPINDLES', col3X + (col3W / 2), actualBottomY + 5.5, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('Authorized Signatory', col3X + (col3W / 2), actualBottomY + actualBottomH - 4.5, { align: 'center' });

  // Save the PDF
  const cleanId = String(quote.estimateNo || quote.id || 'QTN-2026').replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`GPS_Estimate_${cleanId}.pdf`);
};

// ==========================================
// 16. TECHNICIAN WORK LOG REPORT PDF
// ==========================================
export const exportWorkLogPdf = (workLogs = []) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  let y = drawCorporateHeader(doc, 'TECHNICIAN WORK LOG REGISTER', 'MONTHLY AUDIT', 'Daily Shop Floor Time Tracking, Operation Allocations & Productivity');

  const rows = (workLogs.length > 0 ? workLogs : [
    { date: '2026-02-28', technician: 'Rahul Shinde', bay: 'Bay 3 Assembly', task: 'HSK-A63 Cleanroom Bearing Preload & Assembly', hours: 7.5, efficiency: '98%' },
    { date: '2026-02-28', technician: 'Vikram Jadhav', bay: 'Bay 2 Grinding', task: 'BT40 Spindle Shaft Nose Taper Grinding', hours: 8.0, efficiency: '95%' },
    { date: '2026-02-28', technician: 'Prakash Kulkarni', bay: 'Bay 4 Dynamic Balancing', task: '60,000 RPM Ultra High-Speed Dynamic Balancing', hours: 7.0, efficiency: '100%' },
    { date: '2026-02-28', technician: 'Amol Deshmukh', bay: 'Bay 5 Testing', task: '4-Hour Thermal Run-in Verification & Vibration Logging', hours: 8.0, efficiency: '96%' }
  ]).map((l, idx) => [
    idx + 1,
    formatDate(l.date),
    l.technician || l.employee_name || 'Technician',
    l.bay || l.workstation || 'Shop Floor',
    l.task || l.description || 'Production Operation',
    `${l.hours || 8.0} Hrs`,
    l.efficiency || '100%',
    'Verified by Supervisor'
  ]);

  autoTable(doc, {
    startY: y,
    head: [['#', 'Date', 'Technician Name', 'Workstation / Bay', 'Assigned Task Description', 'Hours Logged', 'Productivity', 'Supervisor Sign']],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: THEME.primary,
      textColor: THEME.white,
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center'
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2.2,
      textColor: THEME.textMain,
      lineColor: THEME.border,
      lineWidth: 0.2
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'center', cellWidth: 26 },
      2: { halign: 'left', cellWidth: 45 },
      3: { halign: 'left', cellWidth: 35 },
      4: { halign: 'left', cellWidth: 80 },
      5: { halign: 'center', cellWidth: 22 },
      6: { halign: 'center', cellWidth: 22 },
      7: { halign: 'center', cellWidth: 30 }
    }
  });

  drawCorporateFooter(doc);
  doc.save(`GPS_Work_Log_Report_${new Date().toISOString().split('T')[0]}.pdf`);
};

// ==========================================
// 17. CONTACTS & EMAIL DIRECTORY PDF
// ==========================================
export const exportContactsDirectoryPdf = (contacts = []) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  let y = drawCorporateHeader(doc, 'CONTACTS & CC EMAIL DIRECTORY', 'DIRECTORY', 'Approved Client & Vendor Commercial Accounts with Pre-Stored CC Groups');

  const rows = (contacts.length > 0 ? contacts : [
    { companyName: 'Tata Motors Limited', category: 'Customer', tier: 'Tier 1 OEM', location: 'Pune, Maharashtra', primaryContact: { name: 'Vikram Joshi', email: 'v.joshi@tatamotors.com', phone: '+91 98220 11223' }, ccList: [{ email: 'procurement@tatamotors.com' }] },
    { companyName: 'Bharat Forge Ltd', category: 'Customer', tier: 'Tier 1 OEM', location: 'Pune, Maharashtra', primaryContact: { name: 'Rajesh Nair', email: 'rajesh.nair@bharatforge.com', phone: '+91 98230 44556' }, ccList: [{ email: 'accounts@bharatforge.com' }] },
    { companyName: 'Schaeffler India', category: 'Supplier', tier: 'Approved Vendor', location: 'Vadodara, Gujarat', primaryContact: { name: 'Amitabh Sen', email: 'a.sen@schaeffler.com', phone: '+91 265 220 8900' }, ccList: [{ email: 'orders@schaeffler.com' }] }
  ]).map((c, idx) => [
    idx + 1,
    c.companyName,
    c.category || 'Customer',
    c.tier || 'Standard',
    c.location || 'Maharashtra',
    c.primaryContact?.name ? `${c.primaryContact.name} (${c.primaryContact.designation || 'Lead'})` : '—',
    c.primaryContact?.email || '—',
    c.primaryContact?.phone || '—',
    (c.ccList && c.ccList.length > 0) ? c.ccList.map(cc => cc.email).join(', ') : 'None'
  ]);

  autoTable(doc, {
    startY: y,
    head: [['#', 'Company / Account', 'Type', 'Tier', 'Facility Location', 'Primary Contact Person', 'Official Email', 'Direct Phone', 'CC Distribution List']],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: THEME.primary,
      textColor: THEME.white,
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center'
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2.2,
      textColor: THEME.textMain,
      lineColor: THEME.border,
      lineWidth: 0.2
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { halign: 'left', cellWidth: 42 },
      2: { halign: 'center', cellWidth: 20 },
      3: { halign: 'center', cellWidth: 24 },
      4: { halign: 'left', cellWidth: 32 },
      5: { halign: 'left', cellWidth: 38 },
      6: { halign: 'left', cellWidth: 40 },
      7: { halign: 'left', cellWidth: 26 },
      8: { halign: 'left', cellWidth: 40 }
    }
  });

  drawCorporateFooter(doc);
  doc.save(`GPS_Contacts_Directory_${new Date().toISOString().split('T')[0]}.pdf`);
};

// ==========================================
// 18. SERVICE & OVERHAUL JOB REPORT PDF
// ==========================================
export const exportServiceJobReportPdf = (job) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = drawCorporateHeader(doc, 'SPINDLE SERVICE & OVERHAUL REPORT', job?.id || 'SR-2026-088', 'Factory Restoration, Bearing Overhaul & Metrology Diagnostics');

  // Job Meta Banner
  doc.setFillColor(...THEME.surface);
  doc.roundedRect(14, y, pageWidth - 28, 30, 1.5, 1.5, 'F');
  doc.setDrawColor(...THEME.border);
  doc.roundedRect(14, y, pageWidth - 28, 30, 1.5, 1.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...THEME.primary);
  doc.text('OVERHAUL TICKET PARTICULARS:', 18, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...THEME.textMain);
  doc.text(`Service Ticket: ${job?.id || 'SR-2026-088'}`, 18, y + 11.5);
  doc.text(`Spindle Serial: ${job?.spindleSerial || 'SN-2024-041'}`, 18, y + 16.5);
  doc.text(`Customer: ${job?.customer || 'Bharat Forge Ltd'}`, 18, y + 21.5);
  doc.text(`Current Stage: ${job?.currentStage || 'Bay 3 Bearing Assembly'}`, 18, y + 26.5);

  const colRight = pageWidth - 90;
  doc.text(`Received Date: ${formatDate(job?.inwardDate || '2026-02-15')}`, colRight, y + 11.5);
  doc.text(`Target Dispatch: ${formatDate(job?.targetDate || '2026-03-05')}`, colRight, y + 16.5);
  doc.text(`Priority Level: ${job?.priority || 'High'}`, colRight, y + 21.5);
  doc.text(`Overall Status: ${job?.status || 'In Progress'}`, colRight, y + 26.5);

  y += 36;

  // Diagnostics Findings Grid
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...THEME.primary);
  doc.text('DIAGNOSTIC FINDINGS & METROLOGY ASSESSMENT:', 14, y);

  y += 4;

  const diagnosticsData = [
    ['Spindle Taper & Runout', `Initial Runout: ${job?.taperRunoutInitial ? `${job.taperRunoutInitial} mm` : '0.0058 mm'} | Target Spec: ≤ 0.0010 mm`, 'Requires CNC nose re-grinding at Bay 2.'],
    ['Bearings & Raceways', job?.notes || 'Front hybrid ceramic bearings suffered coolant contamination and raceway brinelling.', '100% replacement with matched P4S ceramic pair.'],
    ['Motor Stator Insulation', 'Megger test: 250 MOhm @ 1000V DC | Winding resistance balanced across all 3 phases.', 'Stator dried, revarnished and bake-cured.'],
    ['Tool Clamping / Drawbar', 'Collet retention force measured: 14.2 kN (Degraded disc spring stack).', 'Belleville spring stack rebuilt; force restored to 18.5 kN.'],
    ['Dynamic Balancing Target', 'Final Balancing Grade: ISO 1940 G0.4 @ 24,000 RPM.', 'Achieved residual unbalance < 0.25 g-mm.']
  ];

  autoTable(doc, {
    startY: y,
    head: [['Inspection Subsystem', 'As-Received Findings', 'Factory Corrective Action']],
    body: diagnosticsData,
    theme: 'grid',
    headStyles: {
      fillColor: THEME.primary,
      textColor: THEME.white,
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center'
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 3,
      textColor: THEME.textMain,
      lineColor: THEME.border,
      lineWidth: 0.2
    },
    columnStyles: {
      0: { halign: 'left', fontStyle: 'bold', cellWidth: 42 },
      1: { halign: 'left', cellWidth: 80 },
      2: { halign: 'left', cellWidth: 60 }
    }
  });

  const finalY = doc.lastAutoTable.finalY + 8;
  drawSignatory(doc, finalY, 'Service Lead Engineer Sign', 'Head of Spindle Rebuilding');
  drawCorporateFooter(doc);

  doc.save(`GPS_Service_Job_Report_${job?.id || 'SR-2026'}.pdf`);
};

// ==========================================
// 19. VENDOR DIRECTORY REPORT PDF
// ==========================================
export const exportVendorDirectoryPdf = (suppliers = []) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  let y = drawCorporateHeader(doc, 'APPROVED VENDOR & SUPPLIER DIRECTORY', 'PROCUREMENT', 'Precision Bearings, Raw Alloy Forgings, Pneumatics & Stators');

  const rows = (suppliers.length > 0 ? suppliers : [
    { name: 'Schaeffler India Bearings', category: 'Precision Spindle Bearings', location: 'Pune Chakan MIDC', leadTime: '3-4 Weeks', rating: 4.9, status: 'Active Tier 1' },
    { name: 'Kalyani Steels Alloy Forgings', category: 'Alloy Steel Bar Stock (4140/4340)', location: 'Mundhwa, Pune', leadTime: '2-3 Weeks', rating: 4.8, status: 'Active Tier 1' },
    { name: 'Parker Hannifin Pneumatics', category: 'Pneumatics & Rotary Unions', location: 'Mahape, Navi Mumbai', leadTime: '1-2 Weeks', rating: 4.7, status: 'Active' },
    { name: 'Heidenhain Encoders', category: 'Precision Optical & Magnetic Encoders', location: 'Bengaluru, Karnataka', leadTime: '4-6 Weeks', rating: 4.9, status: 'Active Tier 1' }
  ]).map((v, idx) => [
    idx + 1,
    v.name,
    v.category || 'Components',
    v.location || 'India',
    v.leadTime || '2-3 Weeks',
    v.rating ? `${v.rating} / 5.0` : '4.8 / 5.0',
    'ISO 9001 Approved',
    v.status || 'Active'
  ]);

  autoTable(doc, {
    startY: y,
    head: [['#', 'Vendor / Supplier Name', 'Component Category', 'Facility Location', 'Avg Lead Time', 'Quality Rating', 'Audit Compliance', 'Procurement Status']],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: THEME.primary,
      textColor: THEME.white,
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center'
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2.5,
      textColor: THEME.textMain,
      lineColor: THEME.border,
      lineWidth: 0.2
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'left', cellWidth: 55 },
      2: { halign: 'left', cellWidth: 55 },
      3: { halign: 'left', cellWidth: 40 },
      4: { halign: 'center', cellWidth: 26 },
      5: { halign: 'center', cellWidth: 26 },
      6: { halign: 'center', cellWidth: 32 },
      7: { halign: 'center', cellWidth: 26 }
    }
  });

  drawCorporateFooter(doc);
  doc.save(`GPS_Approved_Vendors_${new Date().toISOString().split('T')[0]}.pdf`);
};

// ==========================================
// 20. CUSTOMER DIRECTORY REPORT PDF
// ==========================================
export const exportCustomerDirectoryPdf = (customers = []) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  let y = drawCorporateHeader(doc, 'CORPORATE CLIENT & CUSTOMER DIRECTORY', 'ACCOUNTS', 'Installed Base Machine Tool Manufacturers, Tier 1 Auto & Aerospace Clients');

  const rows = (customers.length > 0 ? customers : [
    { name: 'Tata Motors Limited', industry: 'Automotive Powertrain', location: 'Pune & Sanand', activeSpindles: 34, tier: 'Key Enterprise Account', gstin: '27AAACT2727Q1ZG' },
    { name: 'Bharat Forge Ltd', industry: 'Forging & Heavy Machining', location: 'Mundhwa, Pune', activeSpindles: 48, tier: 'Key Enterprise Account', gstin: '27AAACB1829D1Z2' },
    { name: 'Godrej Aerospace Division', industry: 'Aerospace & Defense', location: 'Vikhroli, Mumbai', activeSpindles: 16, tier: 'Strategic Account', gstin: '27AAACG0821M1Z5' },
    { name: 'L&T Heavy Engineering', industry: 'Heavy Infrastructure & Energy', location: 'Hazira & Powai', activeSpindles: 22, tier: 'Key Enterprise Account', gstin: '24AAACL0123M1Z8' }
  ]).map((c, idx) => [
    idx + 1,
    c.name,
    c.industry || 'Manufacturing',
    c.location || 'India',
    c.gstin || '27AAACG0821M1Z5',
    `${c.activeSpindles || 12} Fleet Units`,
    c.tier || 'Key Account',
    'Active Contract'
  ]);

  autoTable(doc, {
    startY: y,
    head: [['#', 'Customer / Enterprise Name', 'Industry Sector', 'Operating Plant', 'Customer GSTIN', 'Spindle Fleet Size', 'Account Tier', 'Commercial Status']],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: THEME.primary,
      textColor: THEME.white,
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center'
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2.5,
      textColor: THEME.textMain,
      lineColor: THEME.border,
      lineWidth: 0.2
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'left', cellWidth: 55 },
      2: { halign: 'left', cellWidth: 45 },
      3: { halign: 'left', cellWidth: 40 },
      4: { halign: 'center', cellWidth: 35 },
      5: { halign: 'center', cellWidth: 28 },
      6: { halign: 'center', cellWidth: 32 },
      7: { halign: 'center', cellWidth: 25 }
    }
  });

  drawCorporateFooter(doc);
  doc.save(`GPS_Customer_Directory_${new Date().toISOString().split('T')[0]}.pdf`);
};



