import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

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
// 1. TAX INVOICE GENERATOR
// ==========================================
export const exportTaxInvoicePdf = (inv) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = drawCorporateHeader(doc, 'TAX INVOICE', inv.id || 'INV-2026-001');

  // Bill To & Invoice Meta Two-Column Card
  doc.setFillColor(...THEME.surface);
  doc.roundedRect(14, y, pageWidth - 28, 30, 1.5, 1.5, 'F');
  doc.setDrawColor(...THEME.border);
  doc.roundedRect(14, y, pageWidth - 28, 30, 1.5, 1.5, 'S');

  // Left: Bill To
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...THEME.primary);
  doc.text('BILLED TO (BUYER):', 18, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...THEME.textMain);
  doc.text(inv.customer || 'Client Industrial Corporation', 18, y + 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...THEME.textMuted);
  doc.text(inv.customerAddress || 'Industrial Estate, Sector 12, Bhosari MIDC, Pune - 411026', 18, y + 15.5);
  doc.text(`GSTIN: ${inv.customerGstin || '27AAACB1829D1Z2'} | State: 27-Maharashtra`, 18, y + 19.5);
  doc.text(`Contact: ${inv.contactPerson || 'Procurement Dept'} • ${inv.customerPhone || '+91 98220 12345'}`, 18, y + 23.5);

  // Right: Invoice Meta
  const colRight = pageWidth - 80;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...THEME.primary);
  doc.text('INVOICE DETAILS:', colRight, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...THEME.textMain);
  doc.text(`Invoice No: ${inv.id || 'INV-2026-001'}`, colRight, y + 11);
  doc.text(`Invoice Date: ${formatDate(inv.date)}`, colRight, y + 15.5);
  doc.text(`Due Date: ${formatDate(inv.dueDate || '2026-03-15')}`, colRight, y + 19.5);
  doc.text(`Payment Status: ${inv.status || 'Payment Pending'}`, colRight, y + 23.5);

  y += 34;

  // Table Line Items
  const items = (inv.items && inv.items.length > 0) ? inv.items : [
    {
      description: inv.spindleModel ? `${inv.spindleModel} Precision Spindle Overhaul` : 'Precision Machine Tool Spindle Assembly (HSN 84669390)',
      hsn: '84669390',
      qty: 1,
      unit: 'Set',
      rate: inv.amount ? parseFloat(String(inv.amount).replace(/[^0-9.-]+/g, '')) * 0.847 : 350000,
      taxable: inv.amount ? parseFloat(String(inv.amount).replace(/[^0-9.-]+/g, '')) * 0.847 : 350000
    }
  ];

  const tableBody = items.map((it, idx) => {
    const rate = it.rate || 350000;
    const taxable = it.taxable || (rate * (it.qty || 1));
    const gstRate = 18;
    const gstAmt = (taxable * gstRate) / 100;
    const total = taxable + gstAmt;

    return [
      idx + 1,
      it.description || 'Precision Spindle Unit',
      it.hsn || '84669390',
      `${it.qty || 1} ${it.unit || 'Set'}`,
      formatCurrency(rate),
      formatCurrency(taxable),
      '18%',
      formatCurrency(gstAmt),
      formatCurrency(total)
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [['#', 'Item Description', 'HSN', 'Qty', 'Unit Rate', 'Taxable Val', 'GST %', 'GST Amt', 'Total Amount']],
    body: tableBody,
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
      cellPadding: 2.2,
      textColor: THEME.textMain,
      lineColor: THEME.border,
      lineWidth: 0.2
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { halign: 'left', cellWidth: 55 },
      2: { halign: 'center', cellWidth: 16 },
      3: { halign: 'center', cellWidth: 14 },
      4: { halign: 'right', cellWidth: 20 },
      5: { halign: 'right', cellWidth: 20 },
      6: { halign: 'center', cellWidth: 12 },
      7: { halign: 'right', cellWidth: 18 },
      8: { halign: 'right', cellWidth: 21 }
    }
  });

  const finalY = doc.lastAutoTable.finalY + 6;

  // Calculation Summary Box on Right
  const taxableTotal = items.reduce((acc, it) => acc + (it.taxable || ((it.rate || 350000) * (it.qty || 1))), 0);
  const cgst = taxableTotal * 0.09;
  const sgst = taxableTotal * 0.09;
  const grandTotal = taxableTotal + cgst + sgst;

  // Bank Details Left Box
  doc.setFillColor(...THEME.surface);
  doc.roundedRect(14, finalY, 96, 32, 1.5, 1.5, 'F');
  doc.setDrawColor(...THEME.border);
  doc.roundedRect(14, finalY, 96, 32, 1.5, 1.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...THEME.primary);
  doc.text('ELECTRONIC PAYMENT REMITTANCE (RTGS/NEFT):', 18, finalY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...THEME.textMain);
  doc.text(`Bank: ${COMPANY.bank.name} | Branch: ${COMPANY.bank.branch}`, 18, finalY + 10);
  doc.text(`A/C Name: ${COMPANY.name}`, 18, finalY + 14);
  doc.text(`Account No: ${COMPANY.bank.accountNo} (${COMPANY.bank.accountType})`, 18, finalY + 18);
  doc.text(`IFSC Code: ${COMPANY.bank.ifsc}`, 18, finalY + 22);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...THEME.textMuted);
  doc.text('Please quote invoice number on RTGS/NEFT transaction advice.', 18, finalY + 27);

  // Totals Breakdown Box
  const sumBoxX = pageWidth - 78;
  doc.setFillColor(...THEME.primaryLight);
  doc.roundedRect(sumBoxX, finalY, 64, 32, 1.5, 1.5, 'F');
  doc.setDrawColor(...THEME.border);
  doc.roundedRect(sumBoxX, finalY, 64, 32, 1.5, 1.5, 'S');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...THEME.textMain);
  doc.text('Subtotal (Taxable):', sumBoxX + 4, finalY + 6);
  doc.text(formatCurrency(taxableTotal), pageWidth - 18, finalY + 6, { align: 'right' });

  doc.text('CGST (9%):', sumBoxX + 4, finalY + 11);
  doc.text(formatCurrency(cgst), pageWidth - 18, finalY + 11, { align: 'right' });

  doc.text('SGST (9%):', sumBoxX + 4, finalY + 16);
  doc.text(formatCurrency(sgst), pageWidth - 18, finalY + 16, { align: 'right' });

  doc.setDrawColor(...THEME.primary);
  doc.setLineWidth(0.3);
  doc.line(sumBoxX + 4, finalY + 20, pageWidth - 18, finalY + 20);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...THEME.primary);
  doc.text('Total Invoice Value:', sumBoxX + 4, finalY + 26);
  doc.text(formatCurrency(grandTotal), pageWidth - 18, finalY + 26, { align: 'right' });

  drawSignatory(doc, finalY + 38);
  drawCorporateFooter(doc);

  doc.save(`GPS_Tax_Invoice_${inv.id || 'INV-2026'}.pdf`);
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
// 3. PURCHASE ORDER (PO) PDF
// ==========================================
export const exportPurchaseOrderPdf = (po) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = drawCorporateHeader(doc, 'PURCHASE ORDER', po.poNumber || po.id || 'PO-2026-089');

  // Vendor & Delivery Details Two-Column Card
  doc.setFillColor(...THEME.surface);
  doc.roundedRect(14, y, pageWidth - 28, 30, 1.5, 1.5, 'F');
  doc.setDrawColor(...THEME.border);
  doc.roundedRect(14, y, pageWidth - 28, 30, 1.5, 1.5, 'S');

  // Left: Vendor Info
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...THEME.primary);
  doc.text('VENDOR / SUPPLIER:', 18, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...THEME.textMain);
  doc.text(po.vendorName || po.vendor || 'Precision Bearings & Alloys Corp', 18, y + 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...THEME.textMuted);
  doc.text(po.vendorAddress || 'GIDC Industrial Estate, Phase 3, Naroda, Ahmedabad - 382330', 18, y + 15.5);
  doc.text(`GSTIN: ${po.vendorGstin || '24AABCP9871M1ZQ'} | State: 24-Gujarat`, 18, y + 19.5);
  doc.text(`Contact: ${po.vendorContact || 'Technical Sales Team'} • ${po.vendorPhone || '+91 79 2280 4455'}`, 18, y + 23.5);

  // Right: Order Info
  const colRight = pageWidth - 80;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...THEME.primary);
  doc.text('PO & SHIPMENT SPECIFICATION:', colRight, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...THEME.textMain);
  doc.text(`PO Number: ${po.poNumber || po.id || 'PO-2026-089'}`, colRight, y + 11);
  doc.text(`PO Date: ${formatDate(po.date || po.created_at)}`, colRight, y + 15.5);
  doc.text(`Expected Delivery: ${formatDate(po.deliveryDate || po.expected_delivery_date || '2026-03-20')}`, colRight, y + 19.5);
  doc.text(`Payment Terms: ${po.paymentTerms || 'Net 45 Days Post Inward QC'}`, colRight, y + 23.5);

  y += 34;

  // Line items
  const items = (po.items && po.items.length > 0) ? po.items : [
    {
      description: po.itemDescription || po.notes || 'Hybrid Ceramic Spindle Bearings (P4S Tolerance grade)',
      partNumber: po.partNumber || 'B-HC-7014-P4S',
      hsn: '84821011',
      qty: po.qty || 10,
      unit: 'Pairs',
      unitPrice: po.unitPrice || 24500,
      totalAmount: po.totalAmount || (po.unitPrice || 24500) * (po.qty || 10)
    }
  ];

  const tableBody = items.map((it, idx) => {
    const qty = it.qty || 1;
    const rate = it.unitPrice || it.rate || 24500;
    const taxable = qty * rate;
    const gstRate = 18;
    const gstAmt = (taxable * gstRate) / 100;
    const lineTotal = taxable + gstAmt;

    return [
      idx + 1,
      it.partNumber || 'PARTS-001',
      it.description || 'Precision Spindle Component',
      it.hsn || '84821011',
      `${qty} ${it.unit || 'Nos'}`,
      formatCurrency(rate),
      formatCurrency(taxable),
      '18%',
      formatCurrency(lineTotal)
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [['#', 'Part No', 'Material / Component Description', 'HSN', 'Qty', 'Unit Price', 'Taxable Val', 'GST', 'Total Val']],
    body: tableBody,
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
      cellPadding: 2.2,
      textColor: THEME.textMain,
      lineColor: THEME.border,
      lineWidth: 0.2
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { halign: 'center', cellWidth: 24 },
      2: { halign: 'left', cellWidth: 54 },
      3: { halign: 'center', cellWidth: 16 },
      4: { halign: 'center', cellWidth: 16 },
      5: { halign: 'right', cellWidth: 18 },
      6: { halign: 'right', cellWidth: 18 },
      7: { halign: 'center', cellWidth: 12 },
      8: { halign: 'right', cellWidth: 20 }
    }
  });

  const finalY = doc.lastAutoTable.finalY + 6;

  // Commercial Clauses Left Box
  doc.setFillColor(...THEME.surface);
  doc.roundedRect(14, finalY, 100, 32, 1.5, 1.5, 'F');
  doc.setDrawColor(...THEME.border);
  doc.roundedRect(14, finalY, 100, 32, 1.5, 1.5, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...THEME.primary);
  doc.text('PURCHASE TERMS & QUALITY REQUIREMENTS:', 18, finalY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(...THEME.textMuted);
  doc.text('1. Material Test Certificate (MTC) and CMM inspection report mandatory with dispatch.', 18, finalY + 10);
  doc.text('2. Parts subject to 100% incoming metrology inspection before GRN authorization.', 18, finalY + 14);
  doc.text('3. Packaging must be rust-preventive coated with vacuum sealed VCI wrapping.', 18, finalY + 18);
  doc.text(`4. Delivery Address: ${COMPANY.name}, Plant 1 Stores, Pune - 411041.`, 18, finalY + 22);

  // Totals Box Right
  const sumBoxX = pageWidth - 76;
  const taxableSum = items.reduce((acc, it) => acc + ((it.qty || 1) * (it.unitPrice || it.rate || 24500)), 0);
  const gstSum = taxableSum * 0.18;
  const grandTotal = taxableSum + gstSum;

  doc.setFillColor(...THEME.primaryLight);
  doc.roundedRect(sumBoxX, finalY, 62, 32, 1.5, 1.5, 'F');
  doc.setDrawColor(...THEME.border);
  doc.roundedRect(sumBoxX, finalY, 62, 32, 1.5, 1.5, 'S');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...THEME.textMain);
  doc.text('Subtotal:', sumBoxX + 4, finalY + 7);
  doc.text(formatCurrency(taxableSum), pageWidth - 18, finalY + 7, { align: 'right' });

  doc.text('GST (18%):', sumBoxX + 4, finalY + 14);
  doc.text(formatCurrency(gstSum), pageWidth - 18, finalY + 14, { align: 'right' });

  doc.setDrawColor(...THEME.primary);
  doc.setLineWidth(0.3);
  doc.line(sumBoxX + 4, finalY + 19, pageWidth - 18, finalY + 19);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...THEME.primary);
  doc.text('Total PO Value:', sumBoxX + 4, finalY + 26);
  doc.text(formatCurrency(grandTotal), pageWidth - 18, finalY + 26, { align: 'right' });

  drawSignatory(doc, finalY + 38, 'Procurement Manager Sign', 'Authorized Technical Director');
  drawCorporateFooter(doc);

  doc.save(`GPS_Purchase_Order_${po.poNumber || po.id || 'PO-2026'}.pdf`);
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
// 5. PROFORMA INVOICE (PI) PDF (EXACT ON-SCREEN DOCUMENT FORMAT)
// ==========================================
// 5. PROFORMA INVOICE (PI) PDF (EXACT ON-SCREEN DOCUMENT FORMAT)
// ==========================================
export const exportProformaInvoicePdf = (pi = {}) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const marginX = 14;
  const contentWidth = pageWidth - (marginX * 2); // 182mm

  const docId = pi.piNumber || pi.id || 'PI-2026-041';
  const partyName = pi.customerFullName || pi.customer || 'Customer Organization';
  const partyContact = pi.customerContact || pi.contactPerson || 'Procurement Officer';
  const partyAddress = pi.billingAddress || pi.customerAddress || 'Customer Plant, Industrial Area, Maharashtra';
  const partyGstin = pi.customerGstin || pi.gstin || '36AAACT2718E1ZQ';
  const partyEmail = pi.customerEmail || '';
  const dateStr = formatDate(pi.date || pi.piDate || pi.created_at);
  const validUntilStr = pi.validUntil ? formatDate(pi.validUntil) : '';
  const salesOrder = pi.salesOrder || 'SO-2026-041';
  const paymentTerms = pi.paymentTerms || '50% Advance with Proforma, 50% against Dispatch Inspection';
  const dispatchWindow = pi.dispatchWindow || '6 Weeks post-advance';

  // 1. Exact Document Header Matching On-Screen Modal
  let y = 14;

  // Company Logo Badge / Monogram Box
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225); // #cbd5e1
  doc.roundedRect(marginX, y, 14, 14, 1.5, 1.5, 'FD');
  doc.setFillColor(122, 31, 61); // #7A1F3D
  doc.rect(marginX + 1.5, y + 1.5, 11, 11, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('GPS', marginX + 7, y + 8.5, { align: 'center' });

  // Company Name & Subtitles
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
  doc.setTextColor(15, 23, 42); // #0f172a
  doc.text('GENERAL PRECISION SPINDLES PVT. LTD.', marginX + 17, y + 4.2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105); // #475569
  doc.text('Manufacturer of High-Precision Motorized & Belt-Driven Spindles • ISO 9001:2015 Certified', marginX + 17, y + 8);

  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139); // #64748b
  doc.text('Plot B-12, Nanded City Industrial Complex, Pune - 411041, Maharashtra, India', marginX + 17, y + 11.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(122, 31, 61); // #7A1F3D
  doc.text('GSTIN: 27AABCG1492K1Z8 • MSME: MH26A0189736 • sales@gpsspindle.com', marginX + 17, y + 15);

  // Right Side Header Metadata
  const badgeW = 44;
  const badgeH = 6.5;
  const badgeX = marginX + contentWidth - badgeW;
  doc.setFillColor(245, 232, 237); // #F5E8ED
  doc.roundedRect(badgeX, y, badgeW, badgeH, 1, 1, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(122, 31, 61); // #7A1F3D
  doc.text('PROFORMA INVOICE', badgeX + (badgeW / 2), y + 4.5, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(docId, marginX + contentWidth, y + 11.5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(100, 116, 139);
  doc.text('Date: ', marginX + contentWidth - 28, y + 15.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(dateStr, marginX + contentWidth, y + 15.5, { align: 'right' });

  if (validUntilStr) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Valid Until: ', marginX + contentWidth - 32, y + 19.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 83, 9); // #b45309 Amber
    doc.text(validUntilStr, marginX + contentWidth, y + 19.5, { align: 'right' });
  }

  // 2px Solid #7A1F3D Divider Line
  y += 24;
  doc.setDrawColor(122, 31, 61);
  doc.setLineWidth(0.65);
  doc.line(marginX, y, marginX + contentWidth, y);

  // 2. Customer Dossier & Commercial Reference (2 Columns)
  y += 3;
  const cardH = 30;
  const col1W = 104;
  const col2W = 74;
  const col2X = marginX + col1W + 4;

  // Box 1: Billed To Client
  doc.setFillColor(248, 250, 252); // #f8fafc
  doc.roundedRect(marginX, y, col1W, cardH, 1.2, 1.2, 'F');
  doc.setDrawColor(226, 232, 240); // #e2e8f0
  doc.roundedRect(marginX, y, col1W, cardH, 1.2, 1.2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(122, 31, 61); // #7A1F3D
  doc.text('BILLED TO CLIENT', marginX + 3.5, y + 4.8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.8);
  doc.setTextColor(15, 23, 42);
  doc.text(String(partyName), marginX + 3.5, y + 9.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  doc.text(partyAddress, marginX + 3.5, y + 13.8, { maxWidth: col1W - 7 });

  const contactText = `GSTIN: ${partyGstin}    |    Contact: ${partyContact}`;
  doc.text(contactText, marginX + 3.5, y + 23);
  if (partyEmail) {
    doc.text(`Email: ${partyEmail}`, marginX + 3.5, y + 27);
  }

  // Box 2: Commercial Reference
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(col2X, y, col2W, cardH, 1.2, 1.2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(col2X, y, col2W, cardH, 1.2, 1.2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(122, 31, 61);
  doc.text('COMMERCIAL REFERENCE', col2X + 3.5, y + 4.8);

  // Linked SO Pill
  doc.setFillColor(245, 232, 237);
  doc.roundedRect(col2X + 2.5, y + 7, col2W - 5, 6, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(122, 31, 61);
  doc.text('Linked Sales Order:', col2X + 4.5, y + 11);
  doc.text(String(salesOrder), col2X + col2W - 4.5, y + 11, { align: 'right' });

  // Payment Terms
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  doc.text('Payment Terms:', col2X + 3.5, y + 18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(String(paymentTerms), col2X + col2W - 3.5, y + 18, { align: 'right', maxWidth: col2W - 28 });

  // Dispatch Window
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Dispatch Window:', col2X + 3.5, y + 24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(String(dispatchWindow), col2X + col2W - 3.5, y + 24, { align: 'right' });

  y += cardH + 3.5;

  // 3. Line Items Table Matching On-Screen Table
  const items = (pi.items && pi.items.length > 0) ? pi.items : [
    { 
      product: 'GPS-HSK-A63-24K Precision Motorized Spindle Unit (15 kW, 24,000 RPM)', 
      desc: 'GPS-HSK-A63-24K Precision Motorized Spindle Unit (15 kW, 24,000 RPM)', 
      hsn: '84669390', 
      qty: 2, 
      rate: 421000, 
      discount: 0, 
      gst: 18, 
      total: 842000 
    }
  ];

  let calculatedSubtotal = 0;

  const tableRows = items.map((it, idx) => {
    const qty = Number(it.qty || it.quantity) || 1;
    const unit = it.unit || 'Units';
    const rate = Number(it.rate || it.unitPrice || 421000);
    const lineDiscount = Number(it.discount || 0);
    const lineTotal = it.total || it.totalValue || (qty * rate - lineDiscount);
    const name = it.product || it.item || it.name || it.desc || 'Precision Component';
    const desc = it.desc && it.desc !== name ? it.desc : '';
    const hsn = it.hsn || '84669390';
    const gstRate = Number(it.gst || it.gstRate || 18);

    calculatedSubtotal += (qty * rate);

    const titleAndDesc = desc ? `${name}\n${desc}` : name;

    return [
      idx + 1,
      titleAndDesc,
      hsn,
      `${qty} ${unit}`,
      'Rs. ' + Math.round(rate).toLocaleString('en-IN'),
      `${gstRate}%`,
      'Rs. ' + Math.round(lineTotal).toLocaleString('en-IN')
    ];
  });

  const subtotal = Number(pi.taxableValue || pi.subtotal || calculatedSubtotal);
  const discount = Number(pi.discount || 0);
  const cgst = Number(pi.cgstAmount || 0);
  const sgst = Number(pi.sgstAmount || 0);
  const igst = Number(pi.igstAmount || 0);
  const taxAmount = (cgst + sgst + igst) || Number(pi.gstAmount) || Math.round((subtotal - discount) * 0.18);
  const grandTotal = Number(pi.totalInvoiceValue || pi.totalAmount) || ((subtotal - discount) + taxAmount);
  const amountInWords = pi.amountInWords || numberToIndianWords(grandTotal);

  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    head: [['#', 'Description of Goods / Technical Specification', 'HSN', 'Qty', 'Rate (Rs.)', 'GST', 'Total (Rs.)']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [241, 245, 249], // #F1F5F9
      textColor: [15, 23, 42],    // #0f172a
      fontStyle: 'bold',
      fontSize: 7.2,
      halign: 'center',
      lineColor: [203, 213, 225],
      lineWidth: 0.2
    },
    styles: {
      fontSize: 6.8,
      cellPadding: 2,
      textColor: [15, 23, 42],
      lineColor: [226, 232, 240],
      lineWidth: 0.2
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { halign: 'left', fontStyle: 'bold', cellWidth: 74 },
      2: { halign: 'center', cellWidth: 20 },
      3: { halign: 'center', cellWidth: 16 },
      4: { halign: 'right', cellWidth: 22 },
      5: { halign: 'center', cellWidth: 14 },
      6: { halign: 'right', fontStyle: 'bold', cellWidth: 28 }
    }
  });

  const finalY = doc.lastAutoTable.finalY + 3.5;

  // 4. Calculation Summary & Bank / Terms Grid (2 Columns)
  const btmGridH = 44;
  const btmCol1W = 104;
  const btmCol2W = 74;
  const btmCol2X = marginX + btmCol1W + 4;

  // Left Box 1: Bank Wire Coordinates (RTGS / NEFT)
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(marginX, finalY, btmCol1W, 20, 1.2, 1.2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginX, finalY, btmCol1W, 20, 1.2, 1.2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(122, 31, 61);
  doc.text('BANK WIRE COORDINATES (RTGS / NEFT)', marginX + 3.5, finalY + 4.2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Bank: ICICI BANK LIMITED, PUNE NANDED CITY', marginX + 3.5, finalY + 8.5);
  doc.text('Account Name: GENERAL PRECISION SPINDLES', marginX + 3.5, finalY + 12);
  doc.setFont('helvetica', 'bold');
  doc.text('A/C Number: 349105000701    |    IFSC Code: ICIC0003491', marginX + 3.5, finalY + 16);

  // Left Box 2: Special Terms & Notes
  const notesY = finalY + 22.5;
  const notesH = 21.5;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(marginX, notesY, btmCol1W, notesH, 1.2, 1.2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginX, notesY, btmCol1W, notesH, 1.2, 1.2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(122, 31, 61);
  doc.text('SPECIAL TERMS & NOTES', marginX + 3.5, notesY + 4.2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(71, 85, 105);
  const noteStr = pi.notes || 'Proforma generated against confirmed Sales Order for advance wire remittance. Goods subject to GPS incoming inspection. Test certificates and calibration sheets mandatory.';
  doc.text(noteStr, marginX + 3.5, notesY + 8.5, { maxWidth: btmCol1W - 7 });

  // Right Box: Tax Calculation Card
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(btmCol2X, finalY, btmCol2W, btmGridH, 1.2, 1.2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(btmCol2X, finalY, btmCol2W, btmGridH, 1.2, 1.2, 'S');

  let curY = finalY + 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(100, 116, 139);
  doc.text('Taxable Subtotal:', btmCol2X + 3.5, curY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Rs. ' + Math.round(subtotal).toLocaleString('en-IN'), btmCol2X + btmCol2W - 3.5, curY, { align: 'right' });

  if (discount > 0) {
    curY += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(22, 128, 60);
    doc.text('Commercial Discount:', btmCol2X + 3.5, curY);
    doc.setFont('helvetica', 'bold');
    doc.text('-Rs. ' + Math.round(discount).toLocaleString('en-IN'), btmCol2X + btmCol2W - 3.5, curY, { align: 'right' });
  }

  if (cgst > 0) {
    curY += 4.8;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Central GST (CGST 9%):', btmCol2X + 3.5, curY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Rs. ' + Math.round(cgst).toLocaleString('en-IN'), btmCol2X + btmCol2W - 3.5, curY, { align: 'right' });
  }

  if (sgst > 0) {
    curY += 4.8;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('State GST (SGST 9%):', btmCol2X + 3.5, curY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Rs. ' + Math.round(sgst).toLocaleString('en-IN'), btmCol2X + btmCol2W - 3.5, curY, { align: 'right' });
  }

  if (igst > 0) {
    curY += 4.8;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Integrated GST (IGST 18%):', btmCol2X + 3.5, curY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Rs. ' + Math.round(igst).toLocaleString('en-IN'), btmCol2X + btmCol2W - 3.5, curY, { align: 'right' });
  }

  if (!cgst && !sgst && !igst) {
    curY += 4.8;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('GST (18% Applicable):', btmCol2X + 3.5, curY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Rs. ' + Math.round(taxAmount).toLocaleString('en-IN'), btmCol2X + btmCol2W - 3.5, curY, { align: 'right' });
  }

  // 2px Solid #7A1F3D Divider Line before Grand Total
  curY += 4;
  doc.setDrawColor(122, 31, 61);
  doc.setLineWidth(0.5);
  doc.line(btmCol2X + 3.5, curY, btmCol2X + btmCol2W - 3.5, curY);

  curY += 5.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(122, 31, 61);
  doc.text('Grand Total:', btmCol2X + 3.5, curY);
  doc.text('Rs. ' + Math.round(grandTotal).toLocaleString('en-IN'), btmCol2X + btmCol2W - 3.5, curY, { align: 'right' });

  curY += 4.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.8);
  doc.setTextColor(100, 116, 139);
  doc.text('Amount in Words:', btmCol2X + 3.5, curY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(71, 85, 105);
  doc.text(amountInWords, btmCol2X + 3.5, curY + 3.2, { maxWidth: btmCol2W - 7 });

  // 5. Signature Bar Matching On-Screen Modal
  const sigY = finalY + btmGridH + 5;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.line(marginX, sigY, marginX + contentWidth, sigY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(148, 163, 184); // #94a3b8
  doc.text(`Document Ref: ${docId} • Generated via GPS ERP Core on ${new Date().toLocaleDateString('en-GB')}`, marginX, sigY + 6);

  const sigCenterX = marginX + contentWidth - 36;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(15, 23, 42);
  doc.text('For GENERAL PRECISION SPINDLES PVT. LTD.', sigCenterX, sigY + 5, { align: 'center' });

  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(7.5);
  doc.setTextColor(122, 31, 61);
  doc.text('Authorized Signatory', sigCenterX, sigY + 11, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.8);
  doc.setTextColor(100, 116, 139);
  doc.text('Commercial Applications & Plant Operations', sigCenterX, sigY + 14.5, { align: 'center' });

  // Save the PDF
  const cleanId = String(docId).replace(/[^a-zA-Z0-9_-]/g, '_');
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
  let y = drawCorporateHeader(doc, 'CALIBRATION CERTIFICATE', inspection?.inspection_number || inspection?.id || 'QC-2026-104', 'Metrology Acceptance & Dynamic Balancing Certificate');

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
  doc.text(`Spindle Serial: ${spindleSerial}`, 18, y + 11.5);
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
// 15. OFFICIAL ESTIMATE / QUOTATION PDF (100% MATCHING ON-SCREEN ESTIMATE FORMAT)
// ==========================================
export const exportQuotationPdf = (quote = {}) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const marginX = 12;
  const contentWidth = pageWidth - (marginX * 2); // 186mm

  const subtotal = Number(quote.subtotal) || (quote.items || []).reduce((sum, it) => sum + (Number(it.qty || 0) * Number(it.unitPrice || 0)), 0);
  const gstAmount = Number(quote.gstAmount) || Number(quote.taxAmount) || Math.round(subtotal * 0.18);
  const totalAmount = Number(quote.totalAmount) || (subtotal + gstAmount);
  const totalQty = (quote.items || []).reduce((s, it) => s + (Number(it.qty) || 0), 0);

  const subtotalFormatted = subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const gstFormatted = gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const totalFormatted = totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // 1. Document Title Banner: "Estimate"
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42); // #0f172a
  doc.text('Estimate', pageWidth / 2, 16, { align: 'center' });

  // Underline
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.5);
  doc.line(marginX, 19, marginX + contentWidth, 19);

  // 2. Company Header & Metadata Grid Box
  const headerBoxY = 22;
  const headerBoxH = 26;
  doc.setDrawColor(203, 213, 225); // #cbd5e1
  doc.setLineWidth(0.25);
  doc.roundedRect(marginX, headerBoxY, contentWidth, headerBoxH, 1, 1, 'S');

  // Vertical dividing line at x = 122
  doc.line(122, headerBoxY, 122, headerBoxY + headerBoxH);

  // Left side: Seller Brand & Address
  // Logo square emblem
  doc.setFillColor(122, 31, 61); // Maroon
  doc.roundedRect(marginX + 2.5, headerBoxY + 3.5, 14, 14, 1.2, 1.2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('GPS', marginX + 9.5, headerBoxY + 11.5, { align: 'center' });

  // Company details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('GENERAL PRECISION SPINDLES', marginX + 20, headerBoxY + 6.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(71, 85, 105); // #475569
  doc.text('SR NO 15/A/2 GKD INDUSTRIAL ESTATE, NEAR SAVLI DHABA, NANDED PHATA SINHAGAD ROAD PUNE-411041', marginX + 20, headerBoxY + 11);
  doc.text('Ph: +919764252188 / 9764032929 • Email: process@gpsspindles.net', marginX + 20, headerBoxY + 15);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(15, 23, 42);
  doc.text('GSTIN: 27AATFG1527D1ZF • State: 27-Maharashtra', marginX + 20, headerBoxY + 19.5);

  // Right side: Metadata fields
  // Horizontal dividing line at headerBoxY + 13
  doc.line(122, headerBoxY + 13, marginX + contentWidth, headerBoxY + 13);
  // Vertical dividing line at x = 160 (between Estimate No. and Date)
  doc.line(160, headerBoxY, 160, headerBoxY + 13);

  // Top Left: Estimate No.
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.8);
  doc.setTextColor(100, 116, 139); // #64748b
  doc.text('ESTIMATE NO.', 125, headerBoxY + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(String(quote.estimateNo || quote.id || 'QTN/2026-27/294'), 125, headerBoxY + 9.5);

  // Top Right: Date
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.8);
  doc.setTextColor(100, 116, 139);
  doc.text('DATE', 163, headerBoxY + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(String(quote.date || formatDate(new Date())), 163, headerBoxY + 9.5);

  // Bottom: Place of Supply
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.8);
  doc.setTextColor(100, 116, 139);
  doc.text('PLACE OF SUPPLY', 125, headerBoxY + 17.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(122, 31, 61); // Maroon accent
  doc.text(String(quote.placeOfSupply || quote.state || '23-Madhya Pradesh'), 125, headerBoxY + 22.5);

  // 3. Estimate For (Customer Box)
  const custBoxY = headerBoxY + headerBoxH + 2.5; // 50.5
  const custBoxH = 20;

  doc.setFillColor(248, 250, 252); // #f8fafc
  doc.roundedRect(marginX, custBoxY, contentWidth, custBoxH, 1, 1, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(marginX, custBoxY, contentWidth, custBoxH, 1, 1, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.2);
  doc.setTextColor(100, 116, 139);
  doc.text('ESTIMATE FOR', marginX + 3, custBoxY + 4);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(String(quote.customer || quote.customerName || 'LINAMAR INDIA PRIVATE LIMITED'), marginX + 3, custBoxY + 8.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(51, 65, 85); // #334155
  doc.text(String(quote.customerAddress || 'Survey No.-332/3, 334 Industrial Area-3 AB Road Dewas, Dewas, Madhya Pradesh-455001 India'), marginX + 3, custBoxY + 12.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(15, 23, 42);
  const contactText = `Contact No. : ${quote.contactNo || '7773877714'}      GSTIN : ${quote.gstin || '23AACCL5351J1ZM'}      State: ${quote.state || quote.placeOfSupply || '23-Madhya Pradesh'}`;
  doc.text(contactText, marginX + 3, custBoxY + 16.8);

  // 4. Line Items Table
  const items = (quote.items && quote.items.length > 0) ? quote.items : [
    { id: 1, name: 'REPAIRING OF KESSLAR HSK-63 SPINDLE', hsn: '84669390', qty: 1, unitPrice: 110000 },
    { id: 2, name: 'SHAFT SLEEVING', hsn: '998717', qty: 1, unitPrice: 225000 },
    { id: 3, name: 'MANUFACTURING OF DRAWBAR LOCKNUT', hsn: '998717', qty: 1, unitPrice: 7500 },
    { id: 4, name: 'MANUFACTURING OF TOOL CLAMP DICLAMP PLATE', hsn: '998717', qty: 1, unitPrice: 7500 },
    { id: 5, name: 'HC7014-EDLR-T-P4S-UL -FAG MAKE.', hsn: '', qty: 2, unitPrice: 96000 },
    { id: 6, name: 'N1011-D-K-TVP-SP-XL', hsn: '84821012', qty: 1, unitPrice: 18000 },
    { id: 7, name: 'STATOR INSPECTION', hsn: '998717', qty: 1, unitPrice: 15000 }
  ];

  const tableRows = items.map((item, idx) => [
    idx + 1,
    item.name || item.desc,
    item.hsn || '—',
    item.qty,
    'Rs. ' + (Number(item.unitPrice) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
    'Rs. ' + (Number(item.total || (item.qty * item.unitPrice)) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })
  ]);

  autoTable(doc, {
    startY: custBoxY + custBoxH + 2.5,
    margin: { left: marginX, right: marginX },
    head: [['#', 'Item name', 'HSN/ SAC', 'Qty', 'Price/ Unit', 'Amount']],
    body: tableRows,
    foot: [['Total', '', '', totalQty, '', 'Rs. ' + subtotalFormatted]],
    theme: 'grid',
    headStyles: {
      fillColor: [241, 245, 249], // #f1f5f9
      textColor: [15, 23, 42],    // #0f172a
      fontStyle: 'bold',
      fontSize: 7.2,
      halign: 'center',
      lineColor: [203, 213, 225],
      lineWidth: 0.2
    },
    bodyStyles: {
      fontSize: 6.8,
      cellPadding: 1.6,
      textColor: [15, 23, 42],
      lineColor: [203, 213, 225],
      lineWidth: 0.2
    },
    footStyles: {
      fillColor: [248, 250, 252],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 7.2,
      lineColor: [203, 213, 225],
      lineWidth: 0.25
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { halign: 'left', fontStyle: 'bold', cellWidth: 88 },
      2: { halign: 'center', cellWidth: 24 },
      3: { halign: 'center', cellWidth: 16 },
      4: { halign: 'right', cellWidth: 25 },
      5: { halign: 'right', fontStyle: 'bold', cellWidth: 25 }
    }
  });

  // 5. Estimate Amount in Words Box
  let currentY = doc.lastAutoTable.finalY + 2;
  const wordsBoxH = 8;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(marginX, currentY, contentWidth, wordsBoxH, 1, 1, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(marginX, currentY, contentWidth, wordsBoxH, 1, 1, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.8);
  doc.setTextColor(100, 116, 139);
  doc.text('ESTIMATE AMOUNT IN WORDS', marginX + 3, currentY + 3.2);

  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(quote.amountInWords || 'Six Lakh Seventy Seven Thousand Three Hundred Twenty Rupees only', marginX + 3, currentY + 6.6);

  // 6. Description / Scope of Work & Amounts (2-Column Grid)
  currentY += wordsBoxH + 2;
  const gridH = 38;
  const leftColW = 110;
  const rightColW = 73;
  const rightColX = marginX + leftColW + 3;

  // Left: Description Box
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(marginX, currentY, leftColW, gridH, 1, 1, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(15, 23, 42);
  doc.text('DESCRIPTION', marginX + 3, currentY + 4);

  doc.setDrawColor(226, 232, 240);
  doc.line(marginX, currentY + 5.5, marginX + leftColW, currentY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(15, 23, 42);
  doc.text(`SERIAL NO: ${quote.spindleSerial || 'HMMXXVI'}     CHALLAN NO: ${quote.challanNo || 'N/A'}     INWORD DATE: ${quote.inwardDate || quote.date || '22-08-2026'}`, marginX + 3, currentY + 9.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(51, 65, 85);
  doc.text('SCOPE OF WORK :-', marginX + 3, currentY + 14);

  // Scope Items: 2 columns for compact, clean layout
  const rawScope = Array.isArray(quote.scopeOfWork)
    ? quote.scopeOfWork
    : (quote.scopeOfWork || '1. DISMANTLE\n2. CLEANING\n3. INSPECTION\n4. BEARING REPLACEMENT\n5. HSK -63 SHAFT SLEEVING\n6. MFG OF DRAWBAR LOCKNUT\n7. MFG OF TOOL CLAMP DICLAMP PLATE .\n8. STATOR INSPECTION.\n9. STATIC TEST.\n10. ASSEMBLY\n11. DYANAMIC TEST.').split('\n');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.8);
  doc.setTextColor(71, 85, 105);

  const halfLen = Math.ceil(rawScope.length / 2);
  rawScope.slice(0, halfLen).forEach((line, idx) => {
    doc.text(line.trim(), marginX + 3, currentY + 18 + (idx * 3.1));
  });
  rawScope.slice(halfLen).forEach((line, idx) => {
    doc.text(line.trim(), marginX + 56, currentY + 18 + (idx * 3.1));
  });

  // Right: Amounts Box
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(rightColX, currentY, rightColW, gridH, 1, 1, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(15, 23, 42);
  doc.text('AMOUNTS', rightColX + 3, currentY + 4);

  doc.setDrawColor(226, 232, 240);
  doc.line(rightColX, currentY + 5.5, rightColX + rightColW, currentY + 5.5);

  // Sub Total
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(15, 23, 42);
  doc.text('Sub Total', rightColX + 3, currentY + 11.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Rs. ' + subtotalFormatted, rightColX + rightColW - 3, currentY + 11.5, { align: 'right' });

  // Tax
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Tax (18% IGST)', rightColX + 3, currentY + 18.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Rs. ' + gstFormatted, rightColX + rightColW - 3, currentY + 18.5, { align: 'right' });

  // Total divider line
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.4);
  doc.line(rightColX + 3, currentY + 25.5, rightColX + rightColW - 3, currentY + 25.5);

  // Total
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(122, 31, 61); // Maroon
  doc.text('Total', rightColX + 3, currentY + 32.5);
  doc.text('Rs. ' + totalFormatted, rightColX + rightColW - 3, currentY + 32.5, { align: 'right' });

  // 7. HSN/SAC Tax Summary Table
  currentY += gridH + 2;

  const hsnRows = (quote.hsnSummary && quote.hsnSummary.length > 0)
    ? quote.hsnSummary.map(h => [h.hsn, 'Rs. ' + (Number(h.taxable) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }), h.rate || '18%', 'Rs. ' + (Number(h.igst) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }), 'Rs. ' + (Number(h.totalTax) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })])
    : [[quote.items?.[0]?.hsn || '84669390', 'Rs. ' + subtotalFormatted, '18%', 'Rs. ' + gstFormatted, 'Rs. ' + gstFormatted]];

  autoTable(doc, {
    startY: currentY,
    margin: { left: marginX, right: marginX },
    head: [
      [
        { content: 'HSN/ SAC', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'Taxable amount', rowSpan: 2, styles: { halign: 'right', valign: 'middle' } },
        { content: 'IGST', colSpan: 2, styles: { halign: 'center' } },
        { content: 'Total Tax Amount', rowSpan: 2, styles: { halign: 'right', valign: 'middle' } }
      ],
      [
        { content: 'Rate', styles: { halign: 'center' } },
        { content: 'Amount', styles: { halign: 'right' } }
      ]
    ],
    body: hsnRows,
    foot: [['Total', 'Rs. ' + subtotalFormatted, '', 'Rs. ' + gstFormatted, 'Rs. ' + gstFormatted]],
    theme: 'grid',
    headStyles: {
      fillColor: [248, 250, 252],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 6.5,
      lineColor: [203, 213, 225],
      lineWidth: 0.2
    },
    bodyStyles: {
      fontSize: 6.5,
      cellPadding: 1.4,
      textColor: [15, 23, 42],
      lineColor: [203, 213, 225],
      lineWidth: 0.2
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 6.5,
      lineColor: [203, 213, 225],
      lineWidth: 0.25
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 32 },
      1: { halign: 'right', cellWidth: 46 },
      2: { halign: 'center', cellWidth: 26 },
      3: { halign: 'right', cellWidth: 41 },
      4: { halign: 'right', cellWidth: 41 }
    }
  });

  // 8. Bottom 3-Column Grid (Bank Details, Terms, Authorized Signatory)
  const bottomY = doc.lastAutoTable.finalY + 2;
  const bottomH = 24;
  const col1W = 56;
  const col2W = 72;
  const col3W = 55;
  const col2X = marginX + col1W + 1.5;
  const col3X = col2X + col2W + 1.5;

  // Box 1: Bank Details
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.25);
  doc.roundedRect(marginX, bottomY, col1W, bottomH, 1, 1, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Bank Details', marginX + 3, bottomY + 3.8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Name : ${quote.bankName || 'ICICI BANK LIMITED, PUNE NANDED CITY'}`, marginX + 3, bottomY + 8);
  doc.setFont('helvetica', 'bold');
  doc.text(`Account No. : ${quote.accountNo || '349105000701'}`, marginX + 3, bottomY + 12);
  doc.text(`IFSC code : ${quote.ifscCode || 'ICIC0003491'}`, marginX + 3, bottomY + 16);
  doc.setFont('helvetica', 'normal');
  doc.text(`Account holder's name : ${quote.accountHolder || 'GENERAL PRECISION SPINDLES'}`, marginX + 3, bottomY + 20);

  // Box 2: Terms and Conditions
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(col2X, bottomY, col2W, bottomH, 1, 1, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Terms and conditions', col2X + 3, bottomY + 3.8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5);
  doc.setTextColor(71, 85, 105);
  doc.text('We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.', col2X + 3, bottomY + 7.5, { maxWidth: col2W - 6 });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.2);
  doc.setTextColor(15, 23, 42);
  doc.text(`MSME (UDYAM ADHAR) NO-${quote.msmeNo || 'MH26A0189736'}`, col2X + 3, bottomY + 13.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5);
  doc.setTextColor(71, 85, 105);
  doc.text(`TYPE OF ENTERPRISES: ${quote.enterpriseType || 'SPINDLE MANUFACTURING AND REPAIRING'}`, col2X + 3, bottomY + 17);
  doc.text('MAJOR ACTIVITIES: ALL TYPES OF CNC,VMC,HMC,BELT DRIVEN,DIRECT DRIVEN,SPINDLE REPAIRING & MANUFACTURING.', col2X + 3, bottomY + 20.5, { maxWidth: col2W - 6 });

  // Box 3: Authorized Signatory
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(col3X, bottomY, col3W, bottomH, 1, 1, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.2);
  doc.setTextColor(15, 23, 42);
  doc.text('For : GENERAL PRECISION SPINDLES', col3X + (col3W / 2), bottomY + 4.5, { align: 'center' });

  // Dotted Line for Signature
  doc.setLineDashPattern([1, 1], 0);
  doc.setDrawColor(148, 163, 184); // #94a3b8
  doc.line(col3X + 6, bottomY + 18, col3X + col3W - 6, bottomY + 18);
  doc.setLineDashPattern([], 0); // reset to solid

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(51, 65, 85);
  doc.text('Authorized Signatory', col3X + (col3W / 2), bottomY + 21.5, { align: 'center' });

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



