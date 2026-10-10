import React, { useState, useEffect } from 'react';
import { 
  generateUpiQrDataUrl, 
  buildUpiPaymentUri, 
  getActiveUpiId, 
  setActiveUpiId, 
  DEFAULT_BANK_DETAILS 
} from '../../utils/upiQrGenerator';
import { 
  QrCode, Copy, Check, Download, Edit2, ShieldCheck, X, 
  ExternalLink, AlertTriangle 
} from 'lucide-react';

export default function UpiQrCode({
  amount = 0,
  quoteNo = '',
  upiId,
  payeeName = DEFAULT_BANK_DETAILS.accountHolder,
  size = 48,
  showBadge = true,
  badgeText = 'UPI: SCAN TO PAY',
  interactive = true,
  onNotify
}) {
  const [currentUpiId, setCurrentUpiId] = useState(() => upiId || getActiveUpiId());
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isEditingUpi, setIsEditingUpi] = useState(false);
  const [tempUpiInput, setTempUpiInput] = useState('');

  // Update when prop changes
  useEffect(() => {
    if (upiId) {
      setCurrentUpiId(upiId);
    } else {
      setCurrentUpiId(getActiveUpiId());
    }
  }, [upiId]);

  // Generate QR code data URL whenever amount, quoteNo, or currentUpiId changes
  useEffect(() => {
    let isCancelled = false;

    async function loadQr() {
      try {
        const url = await generateUpiQrDataUrl({
          upiId: currentUpiId,
          payeeName,
          amount: Number(amount) || 0,
          transactionNote: quoteNo ? `Quotation ${quoteNo}` : 'Quotation Payment',
          transactionRef: quoteNo
        }, {
          width: 320,
          margin: 1
        });
        if (!isCancelled) {
          setQrDataUrl(url);
        }
      } catch (err) {
        console.error('Failed to generate UPI QR:', err);
      }
    }

    loadQr();
    return () => { isCancelled = true; };
  }, [amount, quoteNo, currentUpiId, payeeName]);

  const upiUri = buildUpiPaymentUri({
    upiId: currentUpiId,
    payeeName,
    amount: Number(amount) || 0,
    transactionNote: quoteNo ? `Quotation ${quoteNo}` : 'Quotation Payment',
    transactionRef: quoteNo
  });

  const handleCopyUri = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(upiUri);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      if (onNotify) onNotify('UPI payment link copied to clipboard!');
    }
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `UPI_QR_${quoteNo ? quoteNo.replace(/[^a-zA-Z0-9_-]/g, '_') : 'Quotation'}_Rs${Math.round(Number(amount) || 0)}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (onNotify) onNotify('UPI QR Code downloaded successfully');
  };

  const handleSaveCustomUpi = (e) => {
    e.preventDefault();
    if (!tempUpiInput.trim()) return;
    setActiveUpiId(tempUpiInput.trim());
    setCurrentUpiId(tempUpiInput.trim());
    setIsEditingUpi(false);
    if (onNotify) onNotify(`UPI ID updated to ${tempUpiInput.trim()}`);
  };

  return (
    <>
      <div 
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          width: `${size + 4}px`, 
          flexShrink: 0,
          cursor: interactive ? 'pointer' : 'default',
          position: 'relative'
        }}
        onClick={() => {
          if (interactive) {
            setTempUpiInput(currentUpiId);
            if (currentUpiId.includes('349105000701')) {
              setIsEditingUpi(true);
            }
            setIsModalOpen(true);
          }
        }}
        title={interactive ? "Click to view full scanner, copy UPI link, or change UPI ID" : "UPI QR Code"}
      >
        <div style={{
          width: `${size}px`,
          height: `${size}px`,
          background: '#ffffff',
          borderRadius: '2px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          boxShadow: '0 1px 2px rgba(0,0,0,0.06)'
        }}>
          {qrDataUrl ? (
            <img 
              src={qrDataUrl} 
              alt="UPI Scanner" 
              style={{ width: '100%', height: '100%', display: 'block', imageRendering: 'pixelated' }} 
            />
          ) : (
            <QrCode size={size * 0.7} color="#64748b" />
          )}
        </div>

        {showBadge && (
          <div style={{ 
            background: '#16a34a', 
            color: '#ffffff', 
            fontSize: '5px', 
            fontWeight: 700, 
            padding: '1.5px 3px', 
            borderRadius: '2px', 
            marginTop: '2px', 
            textAlign: 'center', 
            whiteSpace: 'nowrap',
            letterSpacing: '0.2px',
            boxShadow: '0 1px 2px rgba(22, 163, 74, 0.25)'
          }}>
            {badgeText}
          </div>
        )}
      </div>

      {/* Enlarged Scanner & Configuration Modal */}
      {isModalOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '420px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
              animation: 'scaleIn 0.15s ease-out',
              border: '1px solid #e2e8f0'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, #7A1F3D 0%, #4A0E23 100%)',
              color: '#ffffff',
              padding: '18px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: 'rgba(255,255,255,0.15)', padding: '6px', borderRadius: '8px' }}>
                  <QrCode size={20} color="#ffffff" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#ffffff' }}>
                    Amount-Wise UPI Scanner
                  </h3>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)', marginTop: '2px' }}>
                    {quoteNo ? `Quotation ${quoteNo}` : 'Direct Commercial Payment'}
                  </div>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ffffff',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  opacity: 0.8
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {/* Amount Chip */}
              <div style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                color: '#15803d',
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '14px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '16px'
              }}>
                <ShieldCheck size={16} />
                <span>Payable: ₹ {Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>

              {/* Warning if using placeholder account ID */}
              {currentUpiId.includes('349105000701') && (
                <div style={{
                  width: '100%',
                  background: '#fffbeb',
                  border: '1px solid #fde68a',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  marginBottom: '14px',
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'flex-start',
                  fontSize: '11px',
                  color: '#92400e',
                  lineHeight: '1.4'
                }}>
                  <AlertTriangle size={16} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong>Why GPay shows "Could not load banking name":</strong><br />
                    <code>{currentUpiId}</code> is an account placeholder, not registered on the NPCI network. Google Pay & PhonePe verify the receiver's name with NPCI using your <strong>registered UPI ID</strong>. Enter your real UPI ID below to enable live payments.
                  </div>
                </div>
              )}

              {/* QR Image Box */}
              <div style={{
                padding: '12px',
                background: '#ffffff',
                border: '2px dashed #cbd5e1',
                borderRadius: '12px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                marginBottom: '16px'
              }}>
                {qrDataUrl ? (
                  <img 
                    src={qrDataUrl} 
                    alt="Scan with any UPI App" 
                    style={{ width: '200px', height: '200px', display: 'block' }}
                  />
                ) : (
                  <div style={{ width: '200px', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    Generating QR...
                  </div>
                )}
              </div>

              <div style={{ fontSize: '11.5px', color: '#64748b', textAlign: 'center', marginBottom: '16px' }}>
                Scan using <strong>GPay, PhonePe, Paytm, BHIM</strong> or any UPI banking app.<br />
                The exact amount of <strong>₹{Number(amount || 0).toLocaleString('en-IN')}</strong> is auto-filled!
              </div>

              {/* Bank & UPI Account Details Box */}
              <div style={{
                width: '100%',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '12px 14px',
                fontSize: '11.5px',
                color: '#334155',
                display: 'flex',
                flexDirection: 'column',
                gap: '5px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Account Name:</span>
                  <strong style={{ color: '#0f172a' }}>{payeeName}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Bank & Branch:</span>
                  <span>{DEFAULT_BANK_DETAILS.bankName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Account No:</span>
                  <strong className="mono">{DEFAULT_BANK_DETAILS.accountNo}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>IFSC Code:</span>
                  <strong className="mono">{DEFAULT_BANK_DETAILS.ifscCode}</strong>
                </div>

                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  borderTop: '1px solid #e2e8f0', 
                  paddingTop: '6px', 
                  marginTop: '2px' 
                }}>
                  <span style={{ color: '#64748b' }}>UPI ID (VPA):</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <strong className="mono" style={{ color: '#7A1F3D' }}>{currentUpiId}</strong>
                    <button 
                      type="button"
                      onClick={() => setIsEditingUpi(!isEditingUpi)}
                      title="Edit Company UPI ID"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#64748b',
                        cursor: 'pointer',
                        padding: '2px',
                        display: 'flex'
                      }}
                    >
                      <Edit2 size={13} />
                    </button>
                  </div>
                </div>

                {isEditingUpi && (
                  <form onSubmit={handleSaveCustomUpi} style={{ marginTop: '8px', display: 'flex', gap: '6px' }}>
                    <input 
                      type="text" 
                      value={tempUpiInput}
                      onChange={(e) => setTempUpiInput(e.target.value)}
                      placeholder="e.g. 7058731515@hdfc"
                      style={{
                        flex: 1,
                        padding: '5px 8px',
                        fontSize: '11px',
                        borderRadius: '4px',
                        border: '1px solid #cbd5e1'
                      }}
                      required
                    />
                    <button 
                      type="submit"
                      style={{
                        padding: '5px 10px',
                        fontSize: '11px',
                        background: '#7A1F3D',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '4px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Save
                    </button>
                    <button 
                      type="button"
                      onClick={() => setIsEditingUpi(false)}
                      style={{
                        padding: '5px 8px',
                        fontSize: '11px',
                        background: '#e2e8f0',
                        color: '#475569',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                  </form>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '16px' }}>
                <button 
                  type="button"
                  onClick={handleCopyUri}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '9px 12px',
                    background: '#f1f5f9',
                    color: '#334155',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {copied ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                  <span>{copied ? 'Link Copied!' : 'Copy UPI Link'}</span>
                </button>

                <button 
                  type="button"
                  onClick={handleDownloadQr}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '9px 12px',
                    background: '#7A1F3D',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <Download size={14} />
                  <span>Download QR</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
