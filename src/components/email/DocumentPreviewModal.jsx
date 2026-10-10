import React from 'react';
import Modal from '../common/Modal';
import { Download, Printer, FileText, CheckCircle, Truck, AlertTriangle, ShieldCheck, ArrowRight, Wrench, UserCheck, Activity, Award } from 'lucide-react';
import { 
  exportElementAsPdf,
  exportProformaInvoicePdf, 
  exportPurchaseOrderPdf, 
  exportTaxInvoicePdf, 
  exportEWayBillPdf,
  exportQuotationPdf,
  exportCalibrationCertificatePdf,
  exportJobTravelerPdf,
  exportServiceJobReportPdf,
  numberToIndianWords
} from '../../utils/pdfGenerator';
import UpiQrCode from '../common/UpiQrCode';
import { getActiveUpiId, DEFAULT_BANK_DETAILS } from '../../utils/upiQrGenerator';

export default function DocumentPreviewModal({ isOpen, onClose, doc, onNotify }) {
  if (!isOpen || !doc) return null;

  const docId = doc.id || doc.poNumber || doc.piNumber || doc.ewbNumber || doc.estimateNo || doc.inspection_number || doc.workOrderNumber || doc.reportId || 'DOC-2026-0001';
  
  // Document Type Flags
  const isPO = doc.id?.startsWith('PO') || !!doc.poNumber || doc.type === 'Purchase Order' || doc.documentType === 'Purchase Order';
  const isPI = doc.id?.startsWith('PI') || !!doc.piNumber || doc.type === 'Proforma Invoice' || doc.documentType === 'Proforma Invoice';
  const isEWB = doc.id?.startsWith('EWB') || !!doc.ewbNumber || doc.type === 'E-Way Bill' || doc.documentType === 'E-Way Bill';
  const isCalibration = doc.type === 'Calibration Certificate' || doc.documentType === 'Calibration Certificate' || !!doc.inspection_number || !!doc.checkpoints;
  const isJobTraveler = doc.type === 'Job Traveler' || doc.documentType === 'Job Traveler' || (!!doc.operations && !isCalibration);
  const isService = doc.type === 'Service Report' || doc.documentType === 'Service Report' || (!!doc.failureDescription && !isCalibration && !isJobTraveler);
  const isReport = doc.type === 'Report' || doc.documentType === 'Report' || !!doc.reportType || doc.isReport || (Array.isArray(doc.headers) && Array.isArray(doc.rows));
  const isQuotation = !isPO && !isPI && !isEWB && !isCalibration && !isJobTraveler && !isService && !isReport && (doc.id?.startsWith('QTN') || doc.type === 'Quotation' || doc.documentType === 'Quotation' || !!doc.estimateNo);
  const isInvoice = !isPO && !isPI && !isEWB && !isCalibration && !isJobTraveler && !isService && !isReport && !isQuotation && (doc.id?.startsWith('INV') || doc.type === 'Tax Invoice' || doc.documentType === 'Tax Invoice');

  // Customer or Supplier details
  const partyName = isPO 
    ? (doc.supplier || 'Supplier Organization') 
    : (doc.customer || doc.customerFullName || doc.spindle?.customer || 'Customer Organization');
  
  const partyContact = isPO 
    ? (doc.supplierContact || 'Procurement In-charge')
    : (doc.customerContact || doc.contactPerson || 'Procurement Officer');

  const partyAddress = isPO
    ? (doc.supplierAddress || 'Vendor Industrial Zone, Pune, Maharashtra')
    : (doc.billingAddress || doc.customerAddress || 'Customer Plant, Industrial Area, Maharashtra');

  const partyGstin = isPO
    ? (doc.supplierGstin || '27AAACS4821M1ZB')
    : (doc.customerGstin || doc.gstin || '27AAACT2718E1ZQ');

  const dateStr = doc.date || doc.invoiceDate || doc.testDate || doc.inspection_date || new Date().toLocaleDateString('en-GB');
  const placeOfSupply = doc.placeOfSupply || doc.customerState || '27-Maharashtra';
  const refOrder = doc.salesOrder || doc.refOrder || doc.challanNo || 'SO-2026-0142';

  // Normalize items
  let items = [];
  if (doc.items && doc.items.length > 0) {
    items = doc.items;
  } else if (doc.goods && doc.goods.length > 0) {
    items = doc.goods.map(g => ({
      name: g.product,
      desc: g.product,
      hsn: g.hsn || '84669390',
      qty: g.quantity || 1,
      unit: g.unit || 'Unit',
      unitPrice: g.taxableValue / (g.quantity || 1),
      total: g.taxableValue,
      gst: g.gstRate || 18
    }));
  } else {
    items = [
      { 
        id: 1, 
        name: doc.spindleModel || doc.model || 'GPS-HSK-A63-24K Precision Motorized Spindle Unit (15 kW, 24,000 RPM)', 
        desc: doc.spindleModel || doc.model || 'GPS-HSK-A63-24K Precision Motorized Spindle Unit (15 kW, 24,000 RPM)',
        hsn: '84669390', 
        qty: 2, 
        unitPrice: 421000, 
        total: 842000 
      }
    ];
  }

  // Calculate totals
  const subtotal = doc.taxableValue || doc.subtotal || (typeof doc.amount === 'number' ? doc.amount : 842000);
  const discount = doc.discount || 0;
  const taxRate = doc.taxRate || 18;
  const cgst = doc.cgstAmount || 0;
  const sgst = doc.sgstAmount || 0;
  const igst = doc.igstAmount || 0;
  const taxAmount = (cgst + sgst + igst) || doc.gstAmount || Math.round((subtotal - discount) * (taxRate / 100));
  const grandTotal = doc.totalInvoiceValue || doc.totalAmount || ((subtotal - discount) + taxAmount);
  const amountInWords = doc.amountInWords || numberToIndianWords(grandTotal);

  // Calibration checkpoints
  const checkpoints = doc.checkpoints || doc.parameters || [
    { name: 'Radial Runout at Nose (Dynamic)', spec: '≤ 0.002 mm (2 µm)', actual: '0.0012 mm', deviation: '-0.0008 mm', status: 'Pass' },
    { name: 'Axial Float / End Play', spec: '≤ 0.0015 mm (1.5 µm)', actual: '0.0009 mm', deviation: '-0.0006 mm', status: 'Pass' },
    { name: 'Dynamic Balance Quality (ISO 1940)', spec: 'Grade G 0.4 at 24,000 RPM', actual: '0.28 mm/s RMS', deviation: 'Within spec', status: 'Pass' },
    { name: 'Full-Speed Temperature Rise (ΔT)', spec: '≤ 15°C over ambient', actual: '11.4°C rise', deviation: '-3.6°C', status: 'Pass' },
    { name: 'Tool Clamping Pull Force (HSK-A63)', spec: '18.0 kN ± 1.0 kN', actual: '18.4 kN', deviation: '+0.4 kN', status: 'Pass' },
    { name: 'Front Air Purge Sealing Pressure', spec: '1.2 - 1.5 bar continuous', actual: '1.35 bar', deviation: 'Nominal', status: 'Pass' }
  ];

  // Job Traveler operations
  const operations = doc.operations || [
    { step: 'Op 10', name: 'Shaft Precision CNC Turning & Roughing', station: 'Bay 1 - CNC Turning Cell 3', setup: 45, cycle: 120, specialist: 'Suresh Patil', status: 'Completed' },
    { step: 'Op 20', name: 'Vacuum Hardening & Cryogenic Stabilization', station: 'Bay 4 - Heat Treatment Furnace', setup: 60, cycle: 240, specialist: 'External / Met-Lab', status: 'Completed' },
    { step: 'Op 30', name: 'CNC Cylindrical & Internal Grinding (Sub-Micron)', station: 'Bay 2 - Studer S33 CNC Grinder', setup: 60, cycle: 90, specialist: 'Ramesh Kulkarni', status: 'Completed' },
    { step: 'Op 40', name: 'Class 10,000 Cleanroom Hybrid Bearing Assembly', station: 'Bay 3 - Cleanroom Cell A', setup: 30, cycle: 180, specialist: 'Vikram Shinde', status: 'In Progress' },
    { step: 'Op 50', name: 'Dual-Plane Dynamic Balancing at 24,000 RPM', station: 'Bay 3 - Schenck Balancing Rig', setup: 20, cycle: 60, specialist: 'Vikram Shinde', status: 'Pending' },
    { step: 'Op 60', name: 'Full-Speed Thermal Run-in & Motor Telemetry Test', station: 'Bay 5 - Final Test Stand #2', setup: 30, cycle: 120, specialist: 'QA Metrology Lead', status: 'Pending' }
  ];

  const handleDownload = async () => {
    try {
      if (isPO) {
        exportPurchaseOrderPdf(doc);
        if (onNotify) {
          onNotify(`Generated and downloaded official ${docId}.pdf successfully.`);
        }
        return;
      }
      const element = document.getElementById('printable-document-preview');
      let success = false;
      const cleanId = String(docId).replace(/[^a-zA-Z0-9_-]/g, '_');
      if (element) {
        success = await exportElementAsPdf(element, `GPS_${cleanId}.pdf`);
      }
      if (!success) {
        if (isPI) exportProformaInvoicePdf(doc);
        else if (isEWB) exportEWayBillPdf(doc);
        else if (isInvoice) exportTaxInvoicePdf(doc);
        else if (isCalibration) exportCalibrationCertificatePdf(doc);
        else if (isJobTraveler) exportJobTravelerPdf(doc, operations);
        else if (isService) exportServiceJobReportPdf(doc);
        else exportQuotationPdf(doc);
      }
      if (onNotify) {
        onNotify(`Generated and downloaded official ${docId}.pdf successfully.`);
      }
    } catch (err) {
      console.error('Failed to export mirror PDF, falling back to vector PDF:', err);
      try {
        if (isPI) exportProformaInvoicePdf(doc);
        else if (isPO) exportPurchaseOrderPdf(doc);
        else if (isEWB) exportEWayBillPdf(doc);
        else if (isInvoice) exportTaxInvoicePdf(doc);
        else if (isCalibration) exportCalibrationCertificatePdf(doc);
        else if (isJobTraveler) exportJobTravelerPdf(doc, operations);
        else if (isService) exportServiceJobReportPdf(doc);
        else exportQuotationPdf(doc);
        if (onNotify) onNotify(`Generated and downloaded official ${docId}.pdf successfully.`);
      } catch (fallbackErr) {
        if (onNotify) onNotify(`Failed to generate PDF for ${docId}`, 'error');
      }
    }
  };

  const handlePrint = async () => {
    try {
      if (isPO) await exportPurchaseOrderPdf(doc, 'print');
      else if (isPI) await exportProformaInvoicePdf(doc, 'print');
      else if (isInvoice) await exportTaxInvoicePdf(doc, 'print');
      else if (isEWB) await exportEWayBillPdf(doc, 'print');
      else if (isReport) { window.print(); }
      else if (isCalibration) await exportCalibrationCertificatePdf(doc, 'print');
      else if (isJobTraveler) await exportJobTravelerPdf(doc, operations, 'print');
      else if (isService) await exportServiceJobReportPdf(doc, 'print');
      else await exportQuotationPdf(doc, 'print');
      
      if (onNotify) onNotify(`Opening official ${docId} for printing`);
    } catch (err) {
      console.error('Failed to prepare document for printing:', err);
      if (onNotify) onNotify('Failed to print document', 'error');
    }
  };

  const getDocTitle = () => {
    if (doc.customTitle) return doc.customTitle;
    if (isCalibration) return 'ISO CALIBRATION CERTIFICATE';
    if (isJobTraveler) return 'SHOP FLOOR JOB TRAVELER';
    if (isService) return 'SPINDLE SERVICE & OVERHAUL';
    if (isReport) return doc.reportTitle || doc.title || 'MANAGEMENT REPORT';
    if (isPO) return 'PURCHASE ORDER';
    if (isPI) return 'PROFORMA INVOICE';
    if (isEWB) return 'e-WAY BILL (PART-A & PART-B)';
    if (isInvoice) return 'TAX INVOICE';
    if (isQuotation) return 'ESTIMATE';
    return 'COMMERCIAL ESTIMATE';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Document Preview: ${docId}.pdf`}
      maxWidth="880px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Document Type: <strong style={{ color: '#7A1F3D' }}>{getDocTitle()}</strong> • Ref: <span className="mono">{docId}</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={handlePrint}
              title="Print document directly"
            >
              <Printer size={13} />
              <span>Print Document</span>
            </button>
            <button 
              type="button" 
              className="btn btn-primary" 
              onClick={handleDownload}
              title="Download official PDF (Exact mirror image)"
            >
              <Download size={13} />
              <span>Download PDF</span>
            </button>
          </div>
        </div>
      }
    >
      {/* Outer Document Canvas with ID for Mirror PDF Export and Print */}
      <div id="printable-document-preview" style={{ 
        background: '#ffffff', 
        color: '#0f172a', 
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif', 
        padding: '24px 28px', 
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border-color)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        fontSize: '11.5px',
        lineHeight: 1.4
      }}>
        {/* Document Header (For non-quotations and non-PO) */}
        {!isQuotation && !isPO && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #7A1F3D', paddingBottom: '16px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
              <div style={{ 
                width: '56px', 
                height: '56px', 
                border: '1px solid var(--border-color)', 
                borderRadius: '6px', 
                padding: '3px',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                background: '#ffffff'
              }}>
                <img src="/logo.jpg" alt="GPS Spindle" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              </div>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.01em', margin: 0 }}>
                  GENERAL PRECISION SPINDLES PVT. LTD.
                </h2>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Manufacturer of High-Precision Motorized & Belt-Driven Spindles • ISO 9001:2015 Certified
                </div>
                <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                  Plot B-12, Nanded City Industrial Complex, Pune - 411041, Maharashtra, India
                </div>
                <div style={{ fontSize: '10.5px', color: '#7A1F3D', fontWeight: 600 }}>
                  GSTIN: 27AABCG1492K1Z8 • MSME: MH26A0189736 • sales@gpsspindle.com
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ 
                display: 'inline-block',
                padding: '4px 10px', 
                borderRadius: '4px', 
                background: '#F5E8ED', 
                color: '#7A1F3D', 
                fontWeight: 800, 
                fontSize: '12px',
                letterSpacing: '0.04em',
                textTransform: 'uppercase'
              }}>
                {getDocTitle()}
              </div>
              <div className="mono" style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)', marginTop: '6px' }}>
                {docId}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Date: <strong className="mono" style={{ color: 'var(--text-main)' }}>{dateStr}</strong>
              </div>
              {isPI && doc.validUntil && (
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Valid Until: <strong className="mono" style={{ color: '#9A6700' }}>{doc.validUntil}</strong>
                </div>
              )}
              {isEWB && (
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Valid Until: <strong className="mono" style={{ color: '#7A1F3D' }}>{doc.validUntil || '10 Sep 2026'}</strong>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 0: OFFICIAL ESTIMATE / QUOTATION & PROFORMA INVOICE REPLICA           */}
        {/* ========================================================================= */}
        {(isQuotation || isPI) && (() => {
          const piItems = (doc.items && doc.items.length > 0) ? doc.items : items;
          const calcSubtotal = piItems.reduce(
            (sum, it) => sum + (Number(it.total != null ? it.total : (Number(it.qty || 0) * Number(it.unitPrice || it.rate || 0))) || 0),
            0
          ) || Number(doc.subtotal) || (isPI ? 89500 : 575000);

          const taxRate = Number(doc.taxRate) || 18;
          const calcTax = Number(doc.gstAmount) || Number(doc.taxAmount) || Math.round(calcSubtotal * (taxRate / 100));
          const calcTotal = Number(doc.totalAmount) || (calcSubtotal + calcTax);
          const totalQty = piItems.reduce((s, it) => s + (Number(it.qty) || 0), 0);
          const isIntraState = String(doc.placeOfSupply || doc.state || placeOfSupply || '').startsWith('27');

          const computeHsn = (itemList) => {
            const map = {};
            (itemList || []).forEach(it => {
              const rawCode = it.hsn != null ? String(it.hsn).trim() : '';
              const key = rawCode === '' ? '__blank__' : rawCode;
              const amt = Number(it.total != null ? it.total : (Number(it.qty || 0) * Number(it.unitPrice || it.rate || 0))) || 0;
              if (!map[key]) {
                map[key] = { hsn: rawCode, taxable: 0 };
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
                const totalTax = Math.round(entry.taxable * (taxRate / 100));
                const halfTax = Math.round(entry.taxable * (taxRate / 200));
                return {
                  hsn: entry.hsn,
                  taxable: entry.taxable,
                  rate: `${taxRate}%`,
                  halfRate: `${taxRate / 2}%`,
                  cgst: halfTax,
                  sgst: halfTax,
                  igst: totalTax,
                  totalTax: totalTax
                };
              });
          };

          const hsnBreakdown = (doc.hsnSummary && doc.hsnSummary.length > 0)
            ? doc.hsnSummary
            : computeHsn(piItems);

          return (
            <div style={{ background: 'transparent', padding: '16px 0', overflowY: 'auto', overflowX: 'auto', width: '100%', boxSizing: 'border-box' }}>
              <div style={{ minWidth: 'max-content', width: '100%', display: 'flex', justifyContent: 'center', minHeight: '100%', padding: '0 8px', boxSizing: 'border-box' }}>
              <div 
                style={{ 
                  width: '794px',
                  minWidth: '794px',
                  maxWidth: '794px',
                  height: '1123px',
                  minHeight: '1123px',
                  maxHeight: '1123px',
                  background: '#ffffff', 
                  padding: '24px 28px', 
                  color: '#000000', 
                  fontFamily: 'Arial, Helvetica, sans-serif',
                  boxShadow: 'none',
                  border: '1px solid var(--border-color)',
                  boxSizing: 'border-box',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '15px', color: '#000000', marginBottom: '6px', letterSpacing: '0.02em', flexShrink: 0 }}>
                  {isPI ? 'Proforma Invoice' : 'Estimate'}
                </div>

                {/* Main Outer Box */}
                <div style={{ 
                  border: '1px solid #b8b8b8', 
                  background: '#ffffff', 
                  boxSizing: 'border-box',
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  minHeight: 0
                }}>
                  {/* Header Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '62% 38%', borderBottom: '1px solid #b8b8b8', flexShrink: 0 }}>
                    <div style={{ padding: '8px 10px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <img 
                        src="/logo.jpg" 
                        alt="GPS General Precision Spindles" 
                        style={{ width: '115px', height: 'auto', maxHeight: '54px', objectFit: 'contain', flexShrink: 0, marginTop: '2px' }} 
                      />
                      <div style={{ lineHeight: '1.25' }}>
                        <div style={{ fontWeight: 700, fontSize: '13px', color: '#000000', lineHeight: 1.15 }}>
                          GENERAL PRECISION<br />
                          SPINDLES
                        </div>
                        <div style={{ fontSize: '7.8px', color: '#000000', marginTop: '3px' }}>
                          SR NO 15/A/2 GKD INDUSTRIAL ESTATE, NEAR SAVLI<br />
                          DHABA,NANDED PHATA SINHAGAD ROAD PUNE-411041 ,<br />
                          ☎+919764252188 /9764032929<br />
                          Email: process@gpsspindles.net<br />
                          GSTIN: 27AATFG1527D1ZF<br />
                          State: 27-Maharashtra
                        </div>
                      </div>
                    </div>

                    <div style={{ borderLeft: '1px solid #b8b8b8', display: 'flex', flexDirection: 'column' }}>
                      {/* Row 1: Estimate / Proforma Invoice No. & Date */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #b8b8b8', minHeight: '32px' }}>
                        <div style={{ padding: '3.5px 6px' }}>
                          <div style={{ fontSize: '7px', color: '#000000' }}>
                            {isPI ? 'Proforma Invoice No.' : 'Estimate No.'}
                          </div>
                          <div style={{ fontWeight: 700, fontSize: '8px', color: '#000000', marginTop: '1px' }}>
                            {isPI ? (doc.piNumber || doc.id || '27') : (doc.estimateNo || docId)}
                          </div>
                        </div>
                        <div style={{ padding: '3.5px 6px', borderLeft: '1px solid #b8b8b8' }}>
                          <div style={{ fontSize: '7px', color: '#000000' }}>Date</div>
                          <div style={{ fontWeight: 700, fontSize: '8px', color: '#000000', marginTop: '1px' }}>
                            {doc.date || doc.issueDate || dateStr}
                          </div>
                        </div>
                      </div>

                      {/* Row 2: Place of supply & empty right corner */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #b8b8b8', minHeight: '32px' }}>
                        <div style={{ padding: '3.5px 6px' }}>
                          <div style={{ fontSize: '7px', color: '#000000' }}>Place of supply</div>
                          <div style={{ fontWeight: 700, fontSize: '8px', color: '#000000', marginTop: '1px' }}>
                            {doc.placeOfSupply || doc.state || placeOfSupply}
                          </div>
                        </div>
                        <div style={{ borderLeft: '1px solid #b8b8b8' }}></div>
                      </div>

                      {/* Row 3: Empty bottom column space */}
                      <div style={{ flex: 1, minHeight: '34px' }}></div>
                    </div>
                  </div>

                  {/* Customer Box */}
                  <div style={{ padding: '8px 12px 14px 12px', borderBottom: '1px solid #b8b8b8', flexShrink: 0 }}>
                    <div style={{ fontSize: '7.8px', color: '#000000', marginBottom: '3px' }}>
                      {isPI ? 'Proforma Invoice For' : 'Estimate For'}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '10.5px', color: '#000000', marginBottom: '4px' }}>
                      {partyName}
                    </div>
                    <div style={{ fontSize: '8px', color: '#000000', lineHeight: '1.32', marginBottom: '16px' }}>
                      {partyAddress ? (
                        partyAddress.includes('\n') ? (
                          partyAddress.split('\n').map((l, i) => <div key={i}>{l}</div>)
                        ) : (
                          <div>{partyAddress}</div>
                        )
                      ) : (
                        <>
                          <div>{isPI ? 'PLOT NO. A-29-A PHASE-II, KHALUMBRE Chakan' : 'Survey No.-332/3, 334 Industrial Area-3 AB Road Dewas'}</div>
                          <div>{isPI ? 'Pune, Maharashtra-410501' : 'Dewas, Madhya Pradesh-455001'}</div>
                          <div>India</div>
                        </>
                      )}
                    </div>
                    <div style={{ fontSize: '8px', color: '#000000', marginBottom: '6px' }}>
                      Contact No. : {doc.contactNo || doc.customerContact || partyContact || (isPI ? '9975108709' : '7773877714')}
                    </div>
                    <div style={{ fontSize: '8px', color: '#000000', marginBottom: '6px' }}>
                      GSTIN : {partyGstin || doc.gstin || (isPI ? '27AAKFT2876K1ZI' : '23AACCL5351J1ZM')}
                    </div>
                    <div style={{ fontSize: '8px', color: '#000000' }}>
                      State: {doc.placeOfSupply || doc.state || placeOfSupply}
                    </div>
                  </div>

                  {/* Line Items Table */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', borderBottom: '1px solid #b8b8b8', fontSize: '8px', color: '#000000', flexShrink: 0 }}>
                    <thead>
                      <tr>
                        <th style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '3.5px 5px', width: '28px', textAlign: 'left', fontWeight: 700, background: '#ffffff' }}>#</th>
                        <th style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '3.5px 6px', textAlign: 'left', fontWeight: 700, background: '#ffffff' }}>Item name</th>
                        <th style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '3.5px 6px', width: isPI ? '85px' : '95px', textAlign: 'left', fontWeight: 700, background: '#ffffff' }}>HSN/ SAC</th>
                        <th style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '3.5px 6px', width: isPI ? '60px' : '70px', textAlign: 'right', fontWeight: 700, background: '#ffffff' }}>Quantity</th>
                        {isPI && (
                          <th style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '3.5px 6px', width: '50px', textAlign: 'center', fontWeight: 700, background: '#ffffff' }}>Unit</th>
                        )}
                        <th style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '3.5px 6px', width: isPI ? '90px' : '100px', textAlign: 'right', fontWeight: 700, background: '#ffffff' }}>Price/ Unit</th>
                        <th style={{ borderBottom: '1px solid #b8b8b8', padding: '3.5px 6px', width: isPI ? '100px' : '110px', textAlign: 'right', fontWeight: 700, background: '#ffffff' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {piItems.map((item, idx) => {
                        const itemTotal = Number(item.total != null ? item.total : (Number(item.qty || 0) * Number(item.unitPrice || item.rate || 0))) || 0;
                        return (
                          <tr key={item.id || idx}>
                            <td style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '3.2px 5px', textAlign: 'left' }}>
                              {idx + 1}
                            </td>
                            <td style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '3.2px 6px', fontWeight: 700 }}>
                              {item.name || item.product || item.desc}
                            </td>
                            <td style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '3.2px 6px', textAlign: 'left' }}>
                              {item.hsn || ''}
                            </td>
                            <td style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '3.2px 6px', textAlign: 'right' }}>
                              {item.qty}
                            </td>
                            {isPI && (
                              <td style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '3.2px 6px', textAlign: 'center' }}>
                                {item.unit || '-'}
                              </td>
                            )}
                            <td style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '3.2px 6px', textAlign: 'right' }}>
                              ₹ {Number(item.unitPrice || item.rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td style={{ borderBottom: '1px solid #b8b8b8', padding: '3.2px 6px', textAlign: 'right' }}>
                              ₹ {itemTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })}
                      <tr style={{ fontWeight: 700 }}>
                        <td style={{ borderRight: '1px solid #b8b8b8', padding: '3.5px 5px' }}></td>
                        <td style={{ borderRight: '1px solid #b8b8b8', padding: '3.5px 6px', textAlign: 'left' }}>Total</td>
                        <td style={{ borderRight: '1px solid #b8b8b8', padding: '3.5px 6px' }}></td>
                        <td style={{ borderRight: '1px solid #b8b8b8', padding: '3.5px 6px', textAlign: 'right' }}>
                          {totalQty}
                        </td>
                        {isPI && <td style={{ borderRight: '1px solid #b8b8b8', padding: '3.5px 6px' }}></td>}
                        <td style={{ borderRight: '1px solid #b8b8b8', padding: '3.5px 6px' }}></td>
                        <td style={{ padding: '3.5px 6px', textAlign: 'right' }}>
                          ₹ {calcSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Middle Section: Words, Description & Amounts */}
                  <div style={{ display: 'grid', gridTemplateColumns: '62% 38%', borderBottom: '1px solid #b8b8b8', flexShrink: 0 }}>
                    <div>
                      <div style={{ padding: '5px 8px', borderBottom: '1px solid #b8b8b8' }}>
                        <div style={{ fontSize: '7.5px', color: '#000000' }}>
                          {isPI ? 'Proforma Invoice Amount in Words' : 'Estimate Amount in Words'}
                        </div>
                        <div style={{ fontSize: '8.5px', fontWeight: 700, color: '#000000', marginTop: '2px' }}>
                          {doc.amountInWords || numberToIndianWords(calcTotal)}
                        </div>
                      </div>

                      <div style={{ padding: '6px 8px', fontSize: '7.8px', color: '#000000', lineHeight: '1.3' }}>
                        <div style={{ color: '#000000' }}>Description</div>
                        <div style={{ fontWeight: 700, marginTop: '2px' }}>
                          SERIAL NO. {doc.spindleSerial || (isPI ? 'HMMXXVI (M77-002)' : 'HMMXXVI')}
                        </div>
                        <div style={{ fontWeight: 700 }}>
                          CHALLAN NO. {doc.challanNo || (isPI ? '049' : 'N/A')}
                        </div>
                        <div style={{ fontWeight: 700 }}>
                          {isPI ? 'CHALLAN DATE. ' : 'INWORD DATE. '}{(() => {
                            const raw = isPI ? (doc.challanDate || doc.inwardDate || '18-08-2026') : (doc.inwardDate || '22-08-2026');
                            if (/^\d{2}-\d{2}-\d{4}$/.test(raw)) return raw;
                            const d = new Date(raw);
                            if (!isNaN(d.getTime())) {
                              return `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`;
                            }
                            return raw;
                          })()}
                        </div>
                        <div style={{ fontWeight: 700, marginTop: '2px' }}>
                          SCOPE OF WORK :-
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', marginTop: '2px', fontSize: '7.4px', lineHeight: '1.5', fontWeight: 700 }}>
                          {(() => {
                            const defaultScope = isPI 
                              ? '1. DISMANTLE\n2. CLEANING\n3. INSPECTION\n4. BEARING REPLACEMENT\n5. SHAFT TAPER GRINDING\n6. SHAFT BALANCING\n7. DRAWBAR ASSEMBLY WITH NEW DISC SPRING\n8. STATIC TEST\n9. ASSEMBLYY\n10. DYNAMIC TEST.'
                              : '1. DISMANTLE\n2. CLEANING\n3. INSPECTION\n4. BEARING REPLACEMENT\n5. HSK -63 SHAFT SLEEVING\n6. MFG OF DRAWBAR LOCKNUT\n7. MFG OF TOOL CLAMP DICLAMP PLATE .\n8. STATOR INSPECTION.\n9. STATIC TEST.\n10. ASSEMBLY\n11. DYANAMIC TEST.';
                            const rawScope = Array.isArray(doc.scopeOfWork)
                              ? doc.scopeOfWork
                              : (doc.scopeOfWork || defaultScope).split('\n');
                            return rawScope.map((line, idx) => (
                              <div key={idx}>{line.trim()}</div>
                            ));
                          })()}
                        </div>
                      </div>
                    </div>

                    <div style={{ borderLeft: '1px solid #b8b8b8', padding: '6px 10px', display: 'flex', flexDirection: 'column' }}>
                      <div style={{ fontSize: '8px', color: '#000000', marginBottom: '4px', fontWeight: 700 }}>Amounts</div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', padding: '3.5px 0' }}>
                        <span>Sub Total</span>
                        <span>₹ {calcSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', padding: '3.5px 0' }}>
                        <span>Tax ({taxRate}%)</span>
                        <span>₹ {calcTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>

                      <div style={{ borderTop: '1px solid #b8b8b8', margin: '4px 0' }} />

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8.8px', fontWeight: 700, padding: '3px 0' }}>
                        <span>Total</span>
                        <span>₹ {calcTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>

                  {/* HSN/SAC Tax Summary Table */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', borderBottom: '1px solid #b8b8b8', fontSize: '7.8px', color: '#000000', flexShrink: 0 }}>
                    <thead>
                      {isIntraState ? (
                        <>
                          <tr>
                            <th rowSpan="2" style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '3px 4px', textAlign: 'center', verticalAlign: 'middle', fontWeight: 700, background: '#ffffff', width: '16%' }}>HSN/ SAC</th>
                            <th rowSpan="2" style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '3px 6px', textAlign: 'center', verticalAlign: 'middle', fontWeight: 700, background: '#ffffff', width: '20%' }}>Taxable amount</th>
                            <th colSpan="2" style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '3px 4px', textAlign: 'center', fontWeight: 700, background: '#ffffff', width: '22%' }}>Central Tax</th>
                            <th colSpan="2" style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '3px 4px', textAlign: 'center', fontWeight: 700, background: '#ffffff', width: '22%' }}>State Tax</th>
                            <th rowSpan="2" style={{ borderBottom: '1px solid #b8b8b8', padding: '3px 6px', textAlign: 'center', verticalAlign: 'middle', fontWeight: 700, background: '#ffffff', width: '20%' }}>Total Tax Amount</th>
                          </tr>
                          <tr>
                            <th style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '2px 4px', textAlign: 'center', fontWeight: 700, background: '#ffffff', width: '9%' }}>Rate</th>
                            <th style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '2px 6px', textAlign: 'center', fontWeight: 700, background: '#ffffff', width: '13%' }}>Amount</th>
                            <th style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '2px 4px', textAlign: 'center', fontWeight: 700, background: '#ffffff', width: '9%' }}>Rate</th>
                            <th style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '2px 6px', textAlign: 'center', fontWeight: 700, background: '#ffffff', width: '13%' }}>Amount</th>
                          </tr>
                        </>
                      ) : (
                        <>
                          <tr>
                            <th rowSpan="2" style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '3px 4px', textAlign: 'center', verticalAlign: 'middle', fontWeight: 700, background: '#ffffff', width: '22%' }}>HSN/ SAC</th>
                            <th rowSpan="2" style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '3px 6px', textAlign: 'center', verticalAlign: 'middle', fontWeight: 700, background: '#ffffff', width: '24%' }}>Taxable amount</th>
                            <th colSpan="2" style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '3px 4px', textAlign: 'center', fontWeight: 700, background: '#ffffff', width: '30%' }}>IGST</th>
                            <th rowSpan="2" style={{ borderBottom: '1px solid #b8b8b8', padding: '3px 6px', textAlign: 'center', verticalAlign: 'middle', fontWeight: 700, background: '#ffffff', width: '24%' }}>Total Tax Amount</th>
                          </tr>
                          <tr>
                            <th style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '2px 4px', textAlign: 'center', fontWeight: 700, background: '#ffffff', width: '14%' }}>Rate</th>
                            <th style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '2px 6px', textAlign: 'center', fontWeight: 700, background: '#ffffff', width: '16%' }}>Amount</th>
                          </tr>
                        </>
                      )}
                    </thead>
                    <tbody>
                      {hsnBreakdown.map((row, idx) => (
                        <tr key={idx}>
                          <td style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '2.5px 6px', textAlign: 'left' }}>
                            {row.hsn || ''}
                          </td>
                          <td style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '2.5px 6px', textAlign: 'right' }}>
                            ₹ {Number(row.taxable || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          {isIntraState ? (
                            <>
                              <td style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '2.5px 6px', textAlign: 'right' }}>
                                {row.halfRate || `${taxRate / 2}%`}
                              </td>
                              <td style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '2.5px 6px', textAlign: 'right' }}>
                                ₹ {Number(row.cgst || (row.totalTax / 2) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '2.5px 6px', textAlign: 'right' }}>
                                {row.halfRate || `${taxRate / 2}%`}
                              </td>
                              <td style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '2.5px 6px', textAlign: 'right' }}>
                                ₹ {Number(row.sgst || (row.totalTax / 2) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </>
                          ) : (
                            <>
                              <td style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '2.5px 6px', textAlign: 'right' }}>
                                {row.rate || `${taxRate}%`}
                              </td>
                              <td style={{ borderBottom: '1px solid #b8b8b8', borderRight: '1px solid #b8b8b8', padding: '2.5px 6px', textAlign: 'right' }}>
                                ₹ {Number(row.igst || row.totalTax || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </>
                          )}
                          <td style={{ borderBottom: '1px solid #b8b8b8', padding: '2.5px 6px', textAlign: 'right' }}>
                            ₹ {Number(row.totalTax || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                      <tr style={{ fontWeight: 700 }}>
                        <td style={{ borderRight: '1px solid #b8b8b8', padding: '3px 6px', textAlign: 'right' }}>Total</td>
                        <td style={{ borderRight: '1px solid #b8b8b8', padding: '3px 6px', textAlign: 'right' }}>
                          ₹ {calcSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        {isIntraState ? (
                          <>
                            <td style={{ borderRight: '1px solid #b8b8b8', padding: '3px 4px', textAlign: 'right' }}></td>
                            <td style={{ borderRight: '1px solid #b8b8b8', padding: '3px 6px', textAlign: 'right' }}>
                              ₹ {Math.round(calcTax / 2).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td style={{ borderRight: '1px solid #b8b8b8', padding: '3px 4px', textAlign: 'right' }}></td>
                            <td style={{ borderRight: '1px solid #b8b8b8', padding: '3px 6px', textAlign: 'right' }}>
                              ₹ {Math.round(calcTax / 2).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </>
                        ) : (
                          <>
                            <td style={{ borderRight: '1px solid #b8b8b8', padding: '3px 4px', textAlign: 'right' }}></td>
                            <td style={{ borderRight: '1px solid #b8b8b8', padding: '3px 6px', textAlign: 'right' }}>
                              ₹ {calcTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </>
                        )}
                        <td style={{ padding: '3px 6px', textAlign: 'right' }}>
                          ₹ {calcTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Bottom: Bank Details, Terms, and Signatory (3 Columns matching Image 1) */}
                  <div style={{ display: 'grid', gridTemplateColumns: '29% 41% 30%', fontSize: '7.2px', color: '#000000', flex: 1, minHeight: 0 }}>
                    {/* Col 1: Bank Details */}
                    <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column' }}>
                      <div style={{ fontWeight: 700, fontSize: '8.5px', marginBottom: '6px' }}>Bank Details</div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                        <UpiQrCode 
                          amount={calcTotal}
                          quoteNo={doc.estimateNo || doc.piNumber || doc.id}
                          upiId={doc.bankDetails?.upiId || doc.upiId || getActiveUpiId()}
                          payeeName={doc.bankDetails?.accountHolder || 'GENERAL PRECISION SPINDLES'}
                          size={48}
                          onNotify={onNotify}
                        />

                        <div style={{ fontSize: '7.4px', lineHeight: '1.45' }}>
                          <div style={{ marginBottom: '4px' }}>Name : ICICI BANK LIMITED, PUNE<br />NANDED CITY</div>
                          <div style={{ marginBottom: '4px' }}>Account No. : 349105000701</div>
                          <div style={{ marginBottom: '4px' }}>IFSC code : ICIC0003491</div>
                          <div style={{ marginBottom: '4px' }}>UPI ID : <span className="mono" style={{ color: '#7A1F3D', fontWeight: 600 }}>{doc.bankDetails?.upiId || doc.upiId || getActiveUpiId()}</span></div>
                          <div>Account holder's name : GENERAL<br />PRECISION SPINDLES</div>
                        </div>
                      </div>
                    </div>

                    {/* Col 2: Terms and conditions */}
                    <div style={{ borderLeft: '1px solid #b8b8b8', padding: '8px 10px' }}>
                      <div style={{ fontWeight: 700, fontSize: '8.5px', marginBottom: '6px' }}>Terms and conditions</div>
                      <div style={{ fontSize: '7px', lineHeight: '1.5', color: '#000000' }}>
                        <div style={{ marginBottom: '6px' }}>
                          We declare that this invoice shows the actual price of the goods<br />
                          described and that all particulars are true and correct.
                        </div>
                        <div style={{ fontWeight: 700, marginBottom: '2px' }}>Bank Details:</div>
                        <div style={{ marginBottom: '1px' }}>ICICI Bank Ltd(Nanded City Branch)</div>
                        <div style={{ marginBottom: '1px' }}>A/c No : 349105000701</div>
                        <div style={{ marginBottom: '1px' }}>IFSC Code : ICIC0003491</div>
                        <div style={{ marginBottom: '4px' }}>MSME (UDYAM ADHAR) NO-MH26A0189736</div>
                        <div style={{ marginBottom: '1px' }}>TYPE OF ENTERPRISES: SPINDLE MANUFACTURING AND REPAIRING</div>
                        <div>MAJOR ACTIVITIES IN OUR INVOICE: ALL TYPES OF CNC, VMC, HMC, BELT DRIVEN, DIRECT DRIVEN, INTEGRATED, SPINDLE REPAIRING, SPINDLE MANUFACTURING.</div>
                      </div>
                    </div>

                    {/* Col 3: Signatory */}
                    <div style={{ borderLeft: '1px solid #b8b8b8', padding: '8px 10px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', boxSizing: 'border-box' }}>
                      <div style={{ fontSize: '8px', fontWeight: 400, textAlign: 'center' }}>
                        For : GENERAL PRECISION SPINDLES
                      </div>
                      <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '8.5px', paddingBottom: '8px' }}>
                        Authorized Signatory
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          );
        })()}

        {/* ========================================================================= */}
        {/* VIEW 0B: OFFICIAL PURCHASE ORDER (100% REPLICA OF PURCHASE ORDER PDF)     */}
        {/* ========================================================================= */}
        {isPO && (() => {
          const poItems = (doc.items && doc.items.length > 0) ? doc.items : items;
          const calcSubtotal = poItems.reduce(
            (sum, it) => sum + (Number(it.total != null ? it.total : (Number(it.qty || 1) * Number(it.rate || it.unitPrice || 0))) || 0),
            0
          ) || Number(doc.subtotal) || 58262;

          const taxRate = Number(doc.taxRate) || 18;
          const calcTax = Number(doc.gstAmount) || Number(doc.taxAmount) || (calcSubtotal * (taxRate / 100));
          const rawTotal = calcSubtotal + calcTax;
          const roundOff = doc.roundOff != null ? Number(doc.roundOff) : (doc.totalAmount ? Number(doc.totalAmount) - rawTotal : Number((Math.round(rawTotal) - rawTotal).toFixed(2)));
          const calcTotal = doc.totalAmount != null ? Number(doc.totalAmount) : Math.round(rawTotal);
          const advance = Number(doc.advance || doc.advanceAmount || 0);
          const balance = Number(doc.balance != null ? doc.balance : (calcTotal - advance));
          const totalQty = poItems.reduce((s, it) => s + (Number(it.qty) || 0), 0);
          const isIntraState = String(doc.placeOfSupply || doc.supplierState || '27-Maharashtra').startsWith('27');

          const computeHsn = (itemList) => {
            const map = {};
            (itemList || []).forEach(it => {
              const code = it.hsn ? String(it.hsn).trim() : (it.hsn_code || '84821012');
              const amt = Number(it.total != null ? it.total : (Number(it.qty || 1) * Number(it.rate || it.unitPrice || 0))) || 0;
              if (!map[code]) {
                map[code] = { hsn: code, taxable: 0 };
              }
              map[code].taxable += amt;
            });
            return Object.values(map);
          };

          const hsnBreakdown = computeHsn(poItems);
          const suppAddress = doc.supplierAddress || partyAddress || 'P-84, D-II BLOCK MIDC Road Pimpri Chinchwad\nPune, Maharashtra-411019\nIndia';

          return (
            <div style={{ background: 'transparent', padding: '16px 0', overflowY: 'auto', overflowX: 'auto', width: '100%', boxSizing: 'border-box' }}>
              <div style={{ minWidth: 'max-content', width: '100%', display: 'flex', justifyContent: 'center', minHeight: '100%', padding: '0 8px', boxSizing: 'border-box' }}>
              <div 
                style={{ 
                  width: '794px',
                  minWidth: '794px',
                  maxWidth: '794px',
                  height: '1123px',
                  minHeight: '1123px',
                  maxHeight: '1123px',
                  background: '#ffffff', 
                  padding: '24px 28px', 
                  color: '#000000', 
                  fontFamily: 'Arial, Helvetica, sans-serif',
                  boxShadow: 'none',
                  border: '1px solid var(--border-color)',
                  boxSizing: 'border-box',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '15px', color: '#000000', marginBottom: '6px', letterSpacing: '0.02em', flexShrink: 0 }}>
                  Purchase Order
                </div>

                {/* Main Outer Box */}
                <div style={{ 
                  border: '1px solid #b8b8b8', 
                  background: '#ffffff', 
                  boxSizing: 'border-box',
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  minHeight: 0
                }}>
                  {/* Header Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '62% 38%', borderBottom: '1px solid #b8b8b8', flexShrink: 0 }}>
                    <div style={{ padding: '8px 10px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <img 
                        src="/logo.jpg" 
                        alt="GPS General Precision Spindles" 
                        style={{ width: '115px', height: 'auto', maxHeight: '54px', objectFit: 'contain', flexShrink: 0, marginTop: '2px' }} 
                      />
                      <div style={{ lineHeight: '1.25' }}>
                        <div style={{ fontWeight: 700, fontSize: '13px', color: '#000000', lineHeight: 1.15 }}>
                          GENERAL PRECISION<br />
                          SPINDLES
                        </div>
                        <div style={{ fontSize: '7.8px', color: '#000000', marginTop: '3px' }}>
                          SR NO 15/A/2 GKD INDUSTRIAL ESTATE, NEAR SAVLI<br />
                          DHABA,NANDED PHATA SINHAGAD ROAD PUNE-411041 ,<br />
                          ☎+919764252188 /9764032929<br />
                          Email: process@gpsspindles.net<br />
                          GSTIN: 27AATFG1527D1ZF<br />
                          State: 27-Maharashtra
                        </div>
                      </div>
                    </div>

                    <div style={{ borderLeft: '1px solid #b8b8b8', display: 'flex', flexDirection: 'column' }}>
                      {/* Row 1: Order No. & Date */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #b8b8b8', flex: 1 }}>
                        <div style={{ padding: '4px 6px' }}>
                          <div style={{ fontSize: '7px', color: '#000000' }}>Order No.</div>
                          <div style={{ fontWeight: 700, fontSize: '8px', color: '#000000', marginTop: '1px' }}>
                            {doc.poNumber || doc.id || 'PO/2025-26/00106'}
                          </div>
                        </div>
                        <div style={{ padding: '4px 6px', borderLeft: '1px solid #b8b8b8' }}>
                          <div style={{ fontSize: '7px', color: '#000000' }}>Date</div>
                          <div style={{ fontWeight: 700, fontSize: '8px', color: '#000000', marginTop: '1px' }}>
                            {doc.date || dateStr || '04-09-2026'}
                          </div>
                        </div>
                      </div>

                      {/* Row 2: Due Date & Place of supply */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', flex: 1 }}>
                        <div style={{ padding: '4px 6px' }}>
                          <div style={{ fontSize: '7px', color: '#000000' }}>Due Date:</div>
                          <div style={{ fontWeight: 700, fontSize: '8px', color: '#000000', marginTop: '1px' }}>
                            {doc.dueDate || doc.expectedDelivery || doc.date || '04-09-2026'}
                          </div>
                        </div>
                        <div style={{ padding: '4px 6px', borderLeft: '1px solid #b8b8b8' }}>
                          <div style={{ fontSize: '7px', color: '#000000' }}>Place of supply</div>
                          <div style={{ fontWeight: 700, fontSize: '8px', color: '#000000', marginTop: '1px' }}>
                            {doc.placeOfSupply || '27-Maharashtra'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Order To (Supplier Box) */}
                  <div style={{ padding: '8px 12px 14px 12px', borderBottom: '1px solid #b8b8b8', flexShrink: 0 }}>
                    <div style={{ fontSize: '7.8px', color: '#000000', marginBottom: '3px' }}>
                      Order To
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '10.5px', color: '#000000', marginBottom: '4px' }}>
                      {doc.supplier || partyName || 'PREMIER INDUSTRIAL SOLUTIONS'}
                    </div>
                    <div style={{ fontSize: '8px', color: '#000000', lineHeight: '1.32', marginBottom: '14px' }}>
                      {suppAddress.includes('\n') ? (
                        suppAddress.split('\n').map((l, i) => <div key={i}>{l}</div>)
                      ) : (
                        <>
                          <div>{suppAddress}</div>
                          <div>India</div>
                        </>
                      )}
                    </div>
                    <div style={{ fontSize: '8px', color: '#000000', lineHeight: '1.4' }}>
                      <div>Contact No. : {doc.supplierPhone || doc.supplierContact || partyContact || '0124-4510000'}</div>
                      <div>GSTIN : {doc.supplierGstin || partyGstin || '27ABDFP3172C1ZH'}</div>
                      <div>State: {doc.supplierState || doc.placeOfSupply || '27-Maharashtra'}</div>
                    </div>
                  </div>

                  {/* Items Table */}
                  <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8px', color: '#000000' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #b8b8b8', background: '#ffffff', fontWeight: 700 }}>
                          <th style={{ width: '32px', textAlign: 'center', padding: '4px 2px', borderRight: '1px solid #b8b8b8' }}>#</th>
                          <th style={{ textAlign: 'left', padding: '4px 6px', borderRight: '1px solid #b8b8b8' }}>Item name</th>
                          <th style={{ width: '90px', textAlign: 'center', padding: '4px 4px', borderRight: '1px solid #b8b8b8' }}>HSN/ SAC</th>
                          <th style={{ width: '60px', textAlign: 'right', padding: '4px 6px', borderRight: '1px solid #b8b8b8' }}>Quantity</th>
                          <th style={{ width: '95px', textAlign: 'right', padding: '4px 6px', borderRight: '1px solid #b8b8b8' }}>Price/ Unit</th>
                          <th style={{ width: '100px', textAlign: 'right', padding: '4px 6px' }}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {poItems.map((it, idx) => {
                          const itRate = Number(it.rate || it.unitPrice || 0);
                          const itAmt = Number(it.total != null ? it.total : ((Number(it.qty) || 1) * itRate));
                          return (
                            <tr key={it.id || idx} style={{ borderBottom: '1px solid #e5e5e5' }}>
                              <td style={{ textAlign: 'center', padding: '5px 2px', borderRight: '1px solid #b8b8b8' }}>{idx + 1}</td>
                              <td style={{ textAlign: 'left', padding: '5px 6px', fontWeight: 700, borderRight: '1px solid #b8b8b8' }}>
                                {it.item || it.name || it.desc || '120TAC20FME2DBCP5P01-NSK'}
                              </td>
                              <td style={{ textAlign: 'center', padding: '5px 4px', borderRight: '1px solid #b8b8b8' }}>
                                {it.hsn || it.hsn_code || '84821012'}
                              </td>
                              <td style={{ textAlign: 'right', padding: '5px 6px', borderRight: '1px solid #b8b8b8' }}>
                                {it.qty != null ? it.qty : 1}
                              </td>
                              <td style={{ textAlign: 'right', padding: '5px 6px', borderRight: '1px solid #b8b8b8' }}>
                                ₹ {itRate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td style={{ textAlign: 'right', padding: '5px 6px', fontWeight: 700 }}>
                                ₹ {itAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          );
                        })}
                        {/* Total Row */}
                        <tr style={{ borderTop: '1px solid #b8b8b8', borderBottom: '1px solid #b8b8b8', fontWeight: 700 }}>
                          <td style={{ borderRight: '1px solid #b8b8b8' }}></td>
                          <td style={{ textAlign: 'left', padding: '5px 6px', borderRight: '1px solid #b8b8b8' }}>Total</td>
                          <td style={{ borderRight: '1px solid #b8b8b8' }}></td>
                          <td style={{ textAlign: 'right', padding: '5px 6px', borderRight: '1px solid #b8b8b8' }}>{totalQty}</td>
                          <td style={{ borderRight: '1px solid #b8b8b8' }}></td>
                          <td style={{ textAlign: 'right', padding: '5px 6px' }}>
                            ₹ {calcSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Middle Section: Words & Amounts */}
                  <div style={{ display: 'grid', gridTemplateColumns: '58% 42%', borderTop: '1px solid #b8b8b8', borderBottom: '1px solid #b8b8b8', minHeight: '120px', flexShrink: 0 }}>
                    <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column' }}>
                      <div style={{ fontSize: '7.8px', color: '#000000', marginBottom: '4px' }}>Order Amount in Words</div>
                      <div style={{ fontWeight: 700, fontSize: '9px', color: '#000000' }}>
                        {doc.amountInWords || numberToIndianWords(calcTotal)}
                      </div>
                    </div>

                    <div style={{ borderLeft: '1px solid #b8b8b8', padding: '8px 12px', fontSize: '8px', color: '#000000', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <div style={{ fontSize: '7.8px', marginBottom: '2px' }}>Amounts</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Sub Total</span>
                        <span>₹ {calcSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Tax ({taxRate}%)</span>
                        <span>₹ {calcTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Round off</span>
                        <span>{roundOff < 0 ? `- ₹ ${Math.abs(roundOff).toFixed(2)}` : `₹ ${roundOff.toFixed(2)}`}</span>
                      </div>
                      <div style={{ borderTop: '1px solid #b8b8b8', marginTop: '3px', paddingTop: '3px', display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '9px' }}>
                        <span>Total</span>
                        <span>₹ {calcTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Advance</span>
                        <span>₹ {advance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '9px' }}>
                        <span>Balance</span>
                        <span>₹ {balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>

                  {/* Tax Summary Table */}
                  <div style={{ borderBottom: '1px solid #b8b8b8', flexShrink: 0 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '7.5px', color: '#000000' }}>
                      <thead>
                        {isIntraState ? (
                          <>
                            <tr style={{ borderBottom: '1px solid #b8b8b8', background: '#ffffff', fontWeight: 700 }}>
                              <th rowSpan={2} style={{ textAlign: 'center', padding: '3px', borderRight: '1px solid #b8b8b8' }}>HSN/ SAC</th>
                              <th rowSpan={2} style={{ textAlign: 'center', padding: '3px 6px', borderRight: '1px solid #b8b8b8' }}>Taxable amount</th>
                              <th colSpan={2} style={{ textAlign: 'center', padding: '3px', borderRight: '1px solid #b8b8b8' }}>CGST</th>
                              <th colSpan={2} style={{ textAlign: 'center', padding: '3px', borderRight: '1px solid #b8b8b8' }}>SGST</th>
                              <th rowSpan={2} style={{ textAlign: 'center', padding: '3px 6px' }}>Total Tax Amount</th>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #b8b8b8', fontWeight: 700 }}>
                              <th style={{ textAlign: 'center', padding: '2px', borderRight: '1px solid #b8b8b8' }}>Rate</th>
                              <th style={{ textAlign: 'center', padding: '2px 4px', borderRight: '1px solid #b8b8b8' }}>Amount</th>
                              <th style={{ textAlign: 'center', padding: '2px', borderRight: '1px solid #b8b8b8' }}>Rate</th>
                              <th style={{ textAlign: 'center', padding: '2px 4px', borderRight: '1px solid #b8b8b8' }}>Amount</th>
                            </tr>
                          </>
                        ) : (
                          <>
                            <tr style={{ borderBottom: '1px solid #b8b8b8', background: '#ffffff', fontWeight: 700 }}>
                              <th rowSpan={2} style={{ textAlign: 'center', padding: '3px', borderRight: '1px solid #b8b8b8' }}>HSN/ SAC</th>
                              <th rowSpan={2} style={{ textAlign: 'center', padding: '3px 6px', borderRight: '1px solid #b8b8b8' }}>Taxable amount</th>
                              <th colSpan={2} style={{ textAlign: 'center', padding: '3px', borderRight: '1px solid #b8b8b8' }}>IGST</th>
                              <th rowSpan={2} style={{ textAlign: 'center', padding: '3px 6px' }}>Total Tax Amount</th>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #b8b8b8', fontWeight: 700 }}>
                              <th style={{ textAlign: 'center', padding: '2px', borderRight: '1px solid #b8b8b8' }}>Rate</th>
                              <th style={{ textAlign: 'center', padding: '2px 4px', borderRight: '1px solid #b8b8b8' }}>Amount</th>
                            </tr>
                          </>
                        )}
                      </thead>
                      <tbody>
                        {hsnBreakdown.map((h, i) => {
                          const halfRate = taxRate / 2;
                          const cgstAmt = Number((h.taxable * (halfRate / 100)).toFixed(2));
                          const sgstAmt = Number((h.taxable * (halfRate / 100)).toFixed(2));
                          const igstAmt = Number((h.taxable * (taxRate / 100)).toFixed(2));
                          const totalTax = isIntraState ? (cgstAmt + sgstAmt) : igstAmt;

                          return isIntraState ? (
                            <tr key={i} style={{ borderBottom: '1px solid #e5e5e5' }}>
                              <td style={{ textAlign: 'left', padding: '3px 6px', borderRight: '1px solid #b8b8b8' }}>{h.hsn}</td>
                              <td style={{ textAlign: 'right', padding: '3px 6px', borderRight: '1px solid #b8b8b8' }}>
                                ₹ {h.taxable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td style={{ textAlign: 'right', padding: '3px 4px', borderRight: '1px solid #b8b8b8' }}>{halfRate}%</td>
                              <td style={{ textAlign: 'right', padding: '3px 4px', borderRight: '1px solid #b8b8b8' }}>
                                ₹ {cgstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td style={{ textAlign: 'right', padding: '3px 4px', borderRight: '1px solid #b8b8b8' }}>{halfRate}%</td>
                              <td style={{ textAlign: 'right', padding: '3px 4px', borderRight: '1px solid #b8b8b8' }}>
                                ₹ {sgstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td style={{ textAlign: 'right', padding: '3px 6px', fontWeight: 700 }}>
                                ₹ {totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ) : (
                            <tr key={i} style={{ borderBottom: '1px solid #e5e5e5' }}>
                              <td style={{ textAlign: 'left', padding: '3px 6px', borderRight: '1px solid #b8b8b8' }}>{h.hsn}</td>
                              <td style={{ textAlign: 'right', padding: '3px 6px', borderRight: '1px solid #b8b8b8' }}>
                                ₹ {h.taxable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td style={{ textAlign: 'right', padding: '3px 4px', borderRight: '1px solid #b8b8b8' }}>{taxRate}%</td>
                              <td style={{ textAlign: 'right', padding: '3px 4px', borderRight: '1px solid #b8b8b8' }}>
                                ₹ {igstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td style={{ textAlign: 'right', padding: '3px 6px', fontWeight: 700 }}>
                                ₹ {totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          );
                        })}
                        {/* Tax Total Row */}
                        <tr style={{ borderTop: '1px solid #b8b8b8', fontWeight: 700 }}>
                          <td style={{ textAlign: 'right', padding: '3px 6px', borderRight: '1px solid #b8b8b8' }}>Total</td>
                          <td style={{ textAlign: 'right', padding: '3px 6px', borderRight: '1px solid #b8b8b8' }}>
                            ₹ {calcSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          {isIntraState ? (
                            <>
                              <td style={{ borderRight: '1px solid #b8b8b8' }}></td>
                              <td style={{ textAlign: 'right', padding: '3px 4px', borderRight: '1px solid #b8b8b8' }}>
                                ₹ {(calcTax / 2).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td style={{ borderRight: '1px solid #b8b8b8' }}></td>
                              <td style={{ textAlign: 'right', padding: '3px 4px', borderRight: '1px solid #b8b8b8' }}>
                                ₹ {(calcTax / 2).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </>
                          ) : (
                            <>
                              <td style={{ borderRight: '1px solid #b8b8b8' }}></td>
                              <td style={{ textAlign: 'right', padding: '3px 4px', borderRight: '1px solid #b8b8b8' }}>
                                ₹ {calcTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </>
                          )}
                          <td style={{ textAlign: 'right', padding: '3px 6px' }}>
                            ₹ {calcTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Bottom Section: Terms & Conditions and Signatory */}
                  <div style={{ display: 'grid', gridTemplateColumns: '58% 42%', minHeight: '90px', flexShrink: 0 }}>
                    <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column' }}>
                      <div style={{ fontWeight: 700, fontSize: '8px', color: '#000000', marginBottom: '4px' }}>
                        Terms and conditions
                      </div>
                      <div style={{ fontSize: '7.5px', color: '#000000' }}>
                        {doc.termsAndConditions || doc.notes || 'Thanks for doing business with us!'}
                      </div>
                    </div>

                    <div style={{ borderLeft: '1px solid #b8b8b8', padding: '8px 10px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '8px', color: '#000000', alignSelf: 'flex-start', paddingLeft: '8px' }}>
                        For : GENERAL PRECISION SPINDLES
                      </div>
                      <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '8.5px', paddingBottom: '8px' }}>
                        Authorized Signatory
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          );
        })()}

        {/* ========================================================================= */}
        {/* VIEW 1: ISO CALIBRATION & METROLOGY CERTIFICATE                           */}
        {/* ========================================================================= */}
        {isCalibration && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '14px', marginBottom: '16px' }}>
              <div style={{ padding: '12px 14px', border: '1px solid var(--border-color)', borderRadius: '4px', background: 'var(--bg-surface-subtle)' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#7A1F3D', textTransform: 'uppercase' }}>Spindle Asset Under Test</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginTop: '3px' }}>
                  {doc.spindle?.serial_number || doc.spindle_serial || doc.serialNumber || 'GPS-2026-0842'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Model: <strong>{doc.spindle?.model || doc.spindle_model || doc.model || 'GPS-HSK-A63-24K'}</strong>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Customer: {doc.spindle?.customer || doc.customer || 'Tata Advanced Systems Ltd'}
                </div>
                <div style={{ fontSize: '10.5px', marginTop: '4px' }}>
                  <span style={{
                    padding: '2px 6px',
                    borderRadius: '3px',
                    fontWeight: 700,
                    fontSize: '10px',
                    background: doc.spindleCategory === 'service' ? '#fffbeb' : '#fdf2f4',
                    color: doc.spindleCategory === 'service' ? '#b45309' : '#7A1F3D',
                    border: `1px solid ${doc.spindleCategory === 'service' ? '#fde68a' : 'rgba(122,31,61,0.2)'}`
                  }}>
                    {doc.spindleCategory === 'service' ? 'SERVICE & OVERHAUL REPAIR' : 'NEW MANUFACTURE BUILD'}
                  </span>
                </div>
              </div>

              <div style={{ padding: '12px 14px', border: '1px solid var(--border-color)', borderRadius: '4px', background: 'var(--bg-surface-subtle)' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#7A1F3D', textTransform: 'uppercase' }}>Testing Rig & Environment</div>
                <div style={{ fontSize: '11.5px', marginTop: '3px' }}>
                  Standard: <strong>ISO 9001:2015 / ISO 1940 G0.4</strong>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Calibrated Rig: {doc.gauge_equipment_used || 'Mahr Millimar Air Gauge + Schenck SmartBalancer'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Lead Metrologist: <strong>{doc.inspector_name || 'Rajesh Patil (QA Head)'}</strong>
                </div>
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
              <thead>
                <tr style={{ background: '#F1F5F9', borderBottom: '1px solid #cbd5e1' }}>
                  <th style={{ padding: '8px 10px', textAlign: 'center', width: '36px', fontSize: '11px', fontWeight: 700 }}>#</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px', fontWeight: 700 }}>Metrology Parameter</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px', fontWeight: 700 }}>Nominal & Tolerance Spec</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: '11px', fontWeight: 700 }}>Measured Value</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: '11px', fontWeight: 700 }}>Deviation</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', width: '70px', fontSize: '11px', fontWeight: 700 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {checkpoints.map((cp, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', background: idx % 2 === 1 ? '#F8FAFC' : '#ffffff' }}>
                    <td style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--text-muted)' }}>{idx + 1}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 600 }}>{cp.parameter_name || cp.name}</td>
                    <td style={{ padding: '8px 10px', color: 'var(--text-secondary)' }}>{cp.specified_value || cp.spec}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }} className="mono">{cp.measured_value || cp.actual}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--text-muted)' }} className="mono">{cp.deviation || '0.000'}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      <span className="badge" style={{ background: '#EAF7EE', color: '#16803C', fontWeight: 700 }}>
                        {cp.result_status || cp.status || 'Pass'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ padding: '12px 14px', background: '#F8FAF9', border: '1px dashed #16803C', borderRadius: '4px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '12px', color: '#16803C' }}>Official ISO Quality Sign-off</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {doc.remarks || 'Dynamic balancing achieved ISO 1940 standard. Full-speed thermal run-in test verified within tolerance.'}
                </div>
              </div>
              <span className="badge" style={{ background: '#16803C', color: '#ffffff', fontWeight: 800, padding: '5px 12px', fontSize: '11.5px' }}>
                PASSED & CERTIFIED
              </span>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: SHOP FLOOR JOB TRAVELER                                           */}
        {/* ========================================================================= */}
        {isJobTraveler && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '14px', marginBottom: '16px' }}>
              <div style={{ padding: '12px 14px', border: '1px solid var(--border-color)', borderRadius: '4px', background: 'var(--bg-surface-subtle)' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#7A1F3D', textTransform: 'uppercase' }}>Work Order & Target Asset</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginTop: '3px' }}>
                  WO #{doc.id || doc.workOrderNumber || 'WO-2026-0182'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Spindle Model: <strong>{doc.spindleModel || doc.model || 'GPS-HSK-A63-24K'}</strong>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Customer: {doc.customer || 'Tata Advanced Systems Ltd'} • Qty: <strong>{doc.quantity || 1} Unit(s)</strong>
                </div>
              </div>

              <div style={{ padding: '12px 14px', border: '1px solid var(--border-color)', borderRadius: '4px', background: 'var(--bg-surface-subtle)' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#7A1F3D', textTransform: 'uppercase' }}>Routing Schedule</div>
                <div style={{ fontSize: '11.5px', marginTop: '3px' }}>
                  Target Completion: <strong>{doc.targetDate || doc.dueDate || '18 Oct 2026'}</strong>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Priority: <strong style={{ color: '#dc2626' }}>{doc.priority || 'High'}</strong> • Bay: {doc.bay || 'Bay 3 - Assembly'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Drawing Ref: <strong className="mono">GPS-DWG-8812-REV4</strong>
                </div>
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
              <thead>
                <tr style={{ background: '#F1F5F9', borderBottom: '1px solid #cbd5e1' }}>
                  <th style={{ padding: '8px 10px', textAlign: 'center', width: '50px', fontSize: '11px', fontWeight: 700 }}>Step</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px', fontWeight: 700 }}>Operation & Process Details</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px', fontWeight: 700 }}>Workstation / Bay</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', width: '70px', fontSize: '11px', fontWeight: 700 }}>Cycle (m)</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px', fontWeight: 700 }}>Specialist</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', width: '80px', fontSize: '11px', fontWeight: 700 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {operations.map((op, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', background: idx % 2 === 1 ? '#F8FAFC' : '#ffffff' }}>
                    <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700 }} className="mono">{op.step || `Op ${(idx + 1) * 10}`}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 600 }}>{op.name || op.operation_name}</td>
                    <td style={{ padding: '8px 10px', color: 'var(--text-secondary)' }}>{op.station || op.workstation}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }} className="mono">{op.cycle || 60} min</td>
                    <td style={{ padding: '8px 10px' }}>{op.specialist || op.operator || 'Assigned'}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      <span className="badge" style={{ 
                        background: op.status === 'Completed' ? '#EAF7EE' : (op.status === 'In Progress' ? '#FEF3C7' : '#F1F5F9'),
                        color: op.status === 'Completed' ? '#16803C' : (op.status === 'In Progress' ? '#9A6700' : '#475569'),
                        fontWeight: 700
                      }}>
                        {op.status || 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: SPINDLE SERVICE & OVERHAUL REPORT                                 */}
        {/* ========================================================================= */}
        {isService && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '14px', marginBottom: '16px' }}>
              <div style={{ padding: '12px 14px', border: '1px solid var(--border-color)', borderRadius: '4px', background: 'var(--bg-surface-subtle)' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#7A1F3D', textTransform: 'uppercase' }}>Service Ticket Dossier</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginTop: '3px' }}>
                  Ticket #{doc.id || 'SRV-2026-0041'} • Serial: <strong className="mono">{doc.spindleSerial || 'GPS-2025-0740'}</strong>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Customer: <strong>{doc.customer || doc.customerCompany || 'Tata Advanced Systems Ltd'}</strong>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Priority: <strong style={{ color: '#dc2626' }}>{doc.priority || 'Critical'}</strong> • Status: {doc.status || 'Active'}
                </div>
              </div>

              <div style={{ padding: '12px 14px', border: '1px solid var(--border-color)', borderRadius: '4px', background: 'var(--bg-surface-subtle)' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#7A1F3D', textTransform: 'uppercase' }}>Assigned Service Engineer</div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)', marginTop: '3px' }}>
                  {doc.technicianName || 'Vikram Shinde (Senior Service Engineer)'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Current Stage: <strong>{doc.currentStage || 'Cleanroom Teardown & Metrology'}</strong>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Est. Overhaul Cost: <strong className="mono" style={{ color: '#7A1F3D' }}>{doc.estimatedCost || '₹1,25,000'}</strong>
                </div>
              </div>
            </div>

            <div style={{ padding: '12px 14px', border: '1px solid var(--border-color)', borderRadius: '4px', background: '#F8FAFC', marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#7A1F3D' }}>Customer Complaint & Symptoms</div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-main)', marginTop: '4px' }}>
                {doc.failureDescription || 'Excessive temperature rise (>70°C) and axis servo trip during titanium milling.'}
              </div>
            </div>

            <div style={{ padding: '12px 14px', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#ffffff', marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#0f172a' }}>Diagnostic Teardown Findings & Recommended Action</div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {doc.teardownFindings || 'Front duplex ceramic bearing cage cracked due to coolant seal degradation. Journal shaft scored 8 microns. Requires re-grinding, ceramic bearing set replacement, and dynamic re-balancing to ISO G0.4.'}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 4: MANAGEMENT / REGISTRY REPORT                                      */}
        {/* ========================================================================= */}
        {isReport && (
          <div>
            {doc.metrics && doc.metrics.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(doc.metrics.length, 4)}, 1fr)`, gap: '10px', marginBottom: '16px' }}>
                {doc.metrics.map((m, idx) => (
                  <div key={idx} style={{ padding: '10px 12px', background: '#F8FAFC', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
                    <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>{m.label}</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{m.value}</div>
                    {m.sub && <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>{m.sub}</div>}
                  </div>
                ))}
              </div>
            )}

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
              <thead>
                <tr style={{ background: '#F1F5F9', borderBottom: '1px solid #cbd5e1' }}>
                  {(doc.headers || ['#', 'Item', 'Reference', 'Category', 'Status']).map((h, idx) => (
                    <th key={idx} style={{ padding: '8px 10px', textAlign: idx === 0 ? 'center' : (idx === (doc.headers?.length || 5) - 1 ? 'right' : 'left'), fontSize: '11px', fontWeight: 700 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(doc.rows || []).map((row, rIdx) => (
                  <tr key={rIdx} style={{ borderBottom: '1px solid #e2e8f0', background: rIdx % 2 === 1 ? '#F8FAFC' : '#ffffff' }}>
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} style={{ padding: '8px 10px', textAlign: cIdx === 0 ? 'center' : (cIdx === row.length - 1 ? 'right' : 'left'), fontSize: '11px' }}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 5: COMMERCIAL INVOICE / E-WAY BILL                                   */}
        {/* ========================================================================= */}
        {!isCalibration && !isJobTraveler && !isService && !isReport && !isQuotation && !isPO && !isPI && (
          <div>
            {/* EWB Barcode Simulation */}
            {isEWB && (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                padding: '10px 14px', 
                background: '#F8FAF9', 
                border: '1px dashed #cbd5e1', 
                borderRadius: '4px', 
                marginBottom: '14px' 
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ 
                    fontFamily: 'monospace', 
                    letterSpacing: '4px', 
                    fontSize: '18px', 
                    fontWeight: 800, 
                    color: '#1e293b',
                    background: '#e2e8f0',
                    padding: '4px 10px',
                    borderRadius: '3px'
                  }}>
                    ||| | |||| || ||| |||| |
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#0f172a' }}>E-Way Bill QR & 12-Digit Verification Code</div>
                    <div className="mono" style={{ fontSize: '10.5px', color: '#475569' }}>9821-4409-1284-0042 (Generated by GPS Spindle Dispatch)</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="badge" style={{ background: '#EAF7EE', color: '#16803C', fontWeight: 700, padding: '3px 8px' }}>
                    {doc.status || 'Active'}
                  </span>
                </div>
              </div>
            )}

            {/* Customer / Supplier & Commercial Info Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '14px', marginBottom: '16px' }}>
              <div style={{ padding: '12px 14px', border: '1px solid var(--border-color)', borderRadius: '4px', background: 'var(--bg-surface-subtle)' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#7A1F3D', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {isPO ? 'Vendor / Supplier Information' : (isEWB ? 'Consignee / Recipient Details' : 'Billed To Client')}
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginTop: '3px' }}>
                  {partyName}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {partyAddress}
                </div>
                <div style={{ marginTop: '6px', fontSize: '11px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>GSTIN: </span>
                    <strong className="mono" style={{ color: 'var(--text-main)' }}>{partyGstin}</strong>
                  </div>
                  {partyContact && (
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Contact: </span>
                      <strong style={{ color: 'var(--text-main)' }}>{partyContact}</strong>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ padding: '12px 14px', border: '1px solid var(--border-color)', borderRadius: '4px', background: 'var(--bg-surface-subtle)' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#7A1F3D', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {isPO ? 'Delivery & Logistics' : (isEWB ? 'Part-B Transportation Details' : 'Commercial Reference')}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px', fontSize: '11.5px' }}>
                  {isPO && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Delivery Terms:</span>
                        <span style={{ fontWeight: 600 }}>Door Delivery (GPS Stores)</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Payment Terms:</span>
                        <span style={{ fontWeight: 600 }}>{doc.paymentTerms || 'Net 30 Days'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Delivery Bay:</span>
                        <span style={{ fontWeight: 600 }}>Bay 1 - Raw Stores</span>
                      </div>
                    </>
                  )}

                  {isPI && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F5E8ED', padding: '3px 6px', borderRadius: '3px' }}>
                        <span style={{ color: '#7A1F3D', fontWeight: 700 }}>Linked Sales Order:</span>
                        <span className="mono" style={{ fontWeight: 800, color: '#7A1F3D' }}>{doc.salesOrder || 'SO-2026-041'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Payment Terms:</span>
                        <span style={{ fontWeight: 600 }}>{doc.paymentTerms || '50% Advance'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Dispatch Window:</span>
                        <span style={{ fontWeight: 600 }}>6 Weeks post-advance</span>
                      </div>
                    </>
                  )}

                  {isEWB && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Tax Invoice Ref:</span>
                        <span className="mono" style={{ fontWeight: 700 }}>{doc.invoice || 'INV-2026-019'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Vehicle Number:</span>
                        <span className="mono" style={{ fontWeight: 700, color: '#7A1F3D' }}>{doc.vehicle || 'MH12AB1234'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Transporter:</span>
                        <span style={{ fontWeight: 600 }}>{doc.transporter || 'ABC Logistics'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Mode & Distance:</span>
                        <span style={{ fontWeight: 600 }}>{doc.mode || 'Road'} • {doc.distance || '540 km'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>LR / Doc No:</span>
                        <span className="mono" style={{ fontWeight: 600 }}>{doc.transportDocNo || 'LR-2026-88192'}</span>
                      </div>
                    </>
                  )}

                  {isInvoice && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b' }}>Reference Order:</span>
                        <span className="mono" style={{ fontWeight: 600 }}>{refOrder}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b' }}>Payment Terms:</span>
                        <span style={{ fontWeight: 600 }}>{doc.creditTerms || 'Net 30 Days'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b' }}>Dispatch Mode:</span>
                        <span style={{ fontWeight: 600 }}>Door Delivery (Insured)</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
              <thead>
                <tr style={{ background: '#F1F5F9', borderBottom: '1px solid #cbd5e1' }}>
                  <th style={{ padding: '8px 10px', textAlign: 'center', width: '36px', fontSize: '11px', fontWeight: 700, color: 'var(--text-main)' }}>#</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--text-main)' }}>Description of Goods / Technical Specification</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', width: '70px', fontSize: '11px', fontWeight: 700, color: 'var(--text-main)' }}>HSN</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', width: '60px', fontSize: '11px', fontWeight: 700, color: 'var(--text-main)' }}>Qty</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', width: '95px', fontSize: '11px', fontWeight: 700, color: 'var(--text-main)' }}>Rate (₹)</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center', width: '55px', fontSize: '11px', fontWeight: 700, color: 'var(--text-main)' }}>GST</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right', width: '105px', fontSize: '11px', fontWeight: 700, color: 'var(--text-main)' }}>Total (₹)</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => {
                  const qty = Number(it.qty || it.quantity) || 1;
                  const unit = it.unit || 'Units';
                  const unitPrice = Number(it.rate || it.unitPrice) || 0;
                  const lineTotal = it.total || it.totalValue || (qty * unitPrice);
                  const name = it.item || it.product || it.name || it.desc || 'Precision Component';
                  const desc = it.desc !== name ? it.desc : null;
                  const hsn = it.hsn || '84669390';
                  const gst = it.gst || it.gstRate || 18;

                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', background: idx % 2 === 1 ? '#F8FAFC' : '#ffffff' }}>
                      <td style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--text-muted)' }}>{idx + 1}</td>
                      <td style={{ padding: '8px 10px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{name}</div>
                        {desc && <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '2px' }}>{desc}</div>}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }} className="mono">{hsn}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600 }} className="mono">{qty} {unit}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }} className="mono">₹{Math.round(unitPrice).toLocaleString('en-IN')}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>{gst}%</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }} className="mono">₹{Math.round(lineTotal).toLocaleString('en-IN')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Calculations & Bank Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '14px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '4px', background: 'var(--bg-surface-subtle)', fontSize: '11px' }}>
                  <div style={{ fontWeight: 700, color: '#7A1F3D', marginBottom: '4px' }}>Bank Wire Coordinates (RTGS / NEFT)</div>
                  <div style={{ color: 'var(--text-secondary)' }}>Bank: <strong>ICICI BANK LIMITED, PUNE NANDED CITY</strong></div>
                  <div style={{ color: 'var(--text-secondary)' }}>Account Name: <strong>GENERAL PRECISION SPINDLES</strong></div>
                  <div style={{ color: 'var(--text-secondary)' }}>A/C Number: <strong className="mono">349105000701</strong> • IFSC: <strong className="mono">ICIC0003491</strong></div>
                </div>

                <div style={{ padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '4px', background: 'var(--bg-surface-subtle)', fontSize: '11px' }}>
                  <div style={{ fontWeight: 700, color: '#7A1F3D', marginBottom: '4px' }}>Special Terms & Notes</div>
                  <div style={{ color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {doc.notes || 'Goods subject to GPS incoming inspection. Test certificates and calibration sheets mandatory. Warranty 12 months from commissioning.'}
                  </div>
                </div>
              </div>

              {/* Amount Breakdown Card */}
              <div style={{ padding: '12px 14px', border: '1px solid var(--border-color)', borderRadius: '4px', background: '#ffffff', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                  <span>Taxable Subtotal:</span>
                  <span className="mono" style={{ fontWeight: 600, color: 'var(--text-main)' }}>₹{Math.round(subtotal).toLocaleString('en-IN')}</span>
                </div>
                {discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#176B3A' }}>
                    <span>Commercial Discount:</span>
                    <span className="mono">-₹{Math.round(discount).toLocaleString('en-IN')}</span>
                  </div>
                )}
                {cgst > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    <span>Central GST (CGST 9%):</span>
                    <span className="mono">₹{Math.round(cgst).toLocaleString('en-IN')}</span>
                  </div>
                )}
                {sgst > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    <span>State GST (SGST 9%):</span>
                    <span className="mono">₹{Math.round(sgst).toLocaleString('en-IN')}</span>
                  </div>
                )}
                {igst > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    <span>Integrated GST (IGST 18%):</span>
                    <span className="mono">₹{Math.round(igst).toLocaleString('en-IN')}</span>
                  </div>
                )}
                {!cgst && !sgst && !igst && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    <span>GST (18% Applicable):</span>
                    <span className="mono">₹{Math.round(taxAmount).toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  fontSize: '14px', 
                  fontWeight: 800, 
                  borderTop: '2px solid #7A1F3D', 
                  paddingTop: '8px', 
                  marginTop: '4px',
                  color: '#7A1F3D' 
                }}>
                  <span>Grand Total:</span>
                  <span className="mono">₹{Math.round(grandTotal).toLocaleString('en-IN')}</span>
                </div>
                <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.3 }}>
                  <strong>Amount in Words:</strong> {amountInWords}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Universal Signature Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '24px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
            Document Ref: {docId} • Generated via GPS ERP Core on {new Date().toLocaleDateString('en-GB')}
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-main)' }}>For GENERAL PRECISION SPINDLES PVT. LTD.</div>
            <div style={{ height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontStyle: 'italic', color: '#7A1F3D', fontWeight: 600 }}>
              Authorized Signatory
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              {isCalibration ? 'Metrology & Quality Assurance Department' : (isJobTraveler ? 'Plant Operations & Shop Floor Supervision' : (isService ? 'Service Engineering & Repair Applications' : 'Commercial Applications & Plant Operations'))}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
