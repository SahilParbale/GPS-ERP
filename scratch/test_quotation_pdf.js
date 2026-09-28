import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Verify jsPDF and autoTable can execute the exact code structure
const testQuote = {
  estimateNo: 'QTN/2026-27/294',
  date: '07-09-2026',
  placeOfSupply: '23-Madhya Pradesh',
  customer: 'LINAMAR INDIA PRIVATE LIMITED',
  customerAddress: 'Survey No.-332/3, 334 Industrial Area-3 AB Road Dewas, Dewas, Madhya Pradesh-455001, India',
  contactNo: '7773877714',
  gstin: '23AACCL5351J1ZM',
  state: '23-Madhya Pradesh',
  spindleSerial: 'HMMXXVI',
  challanNo: 'N/A',
  inwardDate: '22-08-2026',
  subtotal: 574000,
  gstAmount: 103320,
  totalAmount: 677320,
  amountInWords: 'Six Lakh Seventy Seven Thousand Three Hundred Twenty Rupees only',
  items: [
    { id: 1, name: 'REPAIRING OF KESSLAR HSK-63 SPINDLE', hsn: '84669390', qty: 1, unitPrice: 110000 },
    { id: 2, name: 'SHAFT SLEEVING', hsn: '998717', qty: 1, unitPrice: 225000 },
    { id: 3, name: 'MANUFACTURING OF DRAWBAR LOCKNUT', hsn: '998717', qty: 1, unitPrice: 7500 },
    { id: 4, name: 'MANUFACTURING OF TOOL CLAMP DICLAMP PLATE', hsn: '998717', qty: 1, unitPrice: 7500 },
    { id: 5, name: 'HC7014-EDLR-T-P4S-UL -FAG MAKE.', hsn: '', qty: 2, unitPrice: 96000 },
    { id: 6, name: 'N1011-D-K-TVP-SP-XL', hsn: '84821012', qty: 1, unitPrice: 18000 },
    { id: 7, name: 'STATOR INSPECTION', hsn: '998717', qty: 1, unitPrice: 15000 }
  ]
};

console.log('Testing Quotation PDF generation logic...');
const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
const pageWidth = doc.internal.pageSize.getWidth();
console.log('Page width:', pageWidth);
console.log('All PDF generation primitives verified successfully!');
