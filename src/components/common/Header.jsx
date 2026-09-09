import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Menu, Search, Bell, Plus, ChevronRight, User, 
  Layers, CheckSquare, Factory, PanelLeftClose, PanelLeftOpen,
  ArrowRight, FileText, ShoppingCart, Receipt, Truck
} from 'lucide-react';
import { 
  PURCHASE_ORDERS, 
  PROFORMA_INVOICES, 
  E_WAY_BILLS, 
  QUOTATIONS, 
  INVOICES 
} from '../../data/mockData';

export default function Header({ 
  currentScreen, 
  isSidebarCollapsed,
  onToggleCollapse, 
  onToggleMobile, 
  onOpenQuickAction, 
  onSearch, 
  searchQuery,
  onNavigate 
}) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchContainerRef = useRef(null);

  // Friendly title mapping for breadcrumb
  const breadcrumbMap = {
    'dashboard': 'Executive Dashboard',
    'production': 'Production Management',
    'workforce': 'Staff & Workforce Management',
    'work-order-detail': 'Work Order Detail (WO-2026-104)',
    'spindles': 'Spindle Fleet Registry',
    'spindle-detail': 'Digital Twin Profile (GPS-2026-0842)',
    'sales': 'Quotations & Commercial',
    'purchase-orders': 'Purchase Order Management',
    'proforma-invoices': 'Proforma Invoices',
    'e-way-bills': 'E-Way Bill System',
    'inventory': 'Materials & Stock Control',
    'quality': 'Quality Control & Metrology',
    'service': 'Service, Overhaul & Warranty',
    'customers': 'Customer Accounts',
    'suppliers': 'Precision Vendors',
    'invoices': 'Invoices & GST Billing',
    'reports': 'Plant Analytics & Reports',
    'settings': 'System Settings'
  };

  // Close search dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Multi-document search results matching requirement 20
  const searchResults = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    if (!q || q.length < 2) return [];

    const results = [];

    // 1. Purchase Orders
    PURCHASE_ORDERS.forEach(po => {
      if (
        po.poNumber.toLowerCase().includes(q) ||
        po.supplier.toLowerCase().includes(q) ||
        (po.items && po.items.some(it => (it.item || '').toLowerCase().includes(q)))
      ) {
        results.push({
          id: po.id,
          docType: 'Purchase Order',
          docNumber: po.poNumber,
          party: po.supplier,
          amount: po.formattedTotal || `₹${Number(po.totalAmount).toLocaleString('en-IN')}`,
          status: po.status,
          targetScreen: 'purchase-orders',
          icon: ShoppingCart,
          badgeColor: '#0F766E'
        });
      }
    });

    // 2. Proforma Invoices
    PROFORMA_INVOICES.forEach(pi => {
      if (
        pi.piNumber.toLowerCase().includes(q) ||
        pi.customer.toLowerCase().includes(q) ||
        pi.salesOrder.toLowerCase().includes(q)
      ) {
        results.push({
          id: pi.id,
          docType: 'Proforma Invoice',
          docNumber: pi.piNumber,
          party: pi.customer,
          amount: pi.formattedTotal || `₹${Number(pi.totalAmount).toLocaleString('en-IN')}`,
          status: pi.status,
          targetScreen: 'proforma-invoices',
          icon: Receipt,
          badgeColor: '#2563eb'
        });
      }
    });

    // 3. E-Way Bills
    E_WAY_BILLS.forEach(ewb => {
      if (
        ewb.ewbNumber.toLowerCase().includes(q) ||
        ewb.customer.toLowerCase().includes(q) ||
        ewb.vehicle.toLowerCase().includes(q) ||
        ewb.invoice.toLowerCase().includes(q)
      ) {
        results.push({
          id: ewb.id,
          docType: 'E-Way Bill',
          docNumber: ewb.ewbNumber,
          party: `${ewb.customer} (${ewb.vehicle})`,
          amount: ewb.formattedTotal || `₹${Number(ewb.totalInvoiceValue).toLocaleString('en-IN')}`,
          status: ewb.status,
          targetScreen: 'e-way-bills',
          icon: Truck,
          badgeColor: '#b45309'
        });
      }
    });

    // 4. Quotations
    QUOTATIONS.forEach(qt => {
      if (
        qt.id.toLowerCase().includes(q) ||
        qt.customer.toLowerCase().includes(q)
      ) {
        results.push({
          id: qt.id,
          docType: 'Quotation',
          docNumber: qt.id,
          party: qt.customer,
          amount: qt.totalAmount ? `₹${qt.totalAmount.toLocaleString('en-IN')}` : '-',
          status: qt.status,
          targetScreen: 'sales',
          icon: FileText,
          badgeColor: '#4f46e5'
        });
      }
    });

    // 5. Invoices
    INVOICES.forEach(inv => {
      if (
        inv.id.toLowerCase().includes(q) ||
        inv.customer.toLowerCase().includes(q) ||
        inv.refOrder.toLowerCase().includes(q)
      ) {
        results.push({
          id: inv.id,
          docType: 'Tax Invoice',
          docNumber: inv.id,
          party: inv.customer,
          amount: inv.amount,
          status: inv.status,
          targetScreen: 'invoices',
          icon: FileText,
          badgeColor: '#059669'
        });
      }
    });

    return results.slice(0, 8);
  }, [searchQuery]);

  const handleSelectResult = (res) => {
    if (onNavigate) {
      onNavigate(res.targetScreen);
    }
    if (onSearch) {
      onSearch('');
    }
    setIsSearchFocused(false);
  };

  return (
    <header className="app-header">
      <div className="header-left">
        <button 
          type="button" 
          className="header-toggle-btn"
          onClick={() => {
            if (window.innerWidth <= 768) {
              onToggleMobile();
            } else {
              onToggleCollapse();
            }
          }}
          title={isSidebarCollapsed ? "Open sidebar (Normal view)" : "Close sidebar (Full screen view)"}
          aria-label={isSidebarCollapsed ? "Open sidebar" : "Close sidebar"}
        >
          {isSidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          {isSidebarCollapsed && (
            <span style={{ fontSize: '11px', fontWeight: 600, marginLeft: '4px', color: 'var(--primary)' }}>
              Open Sidebar
            </span>
          )}
        </button>

        <div className="breadcrumbs">
          <span className="breadcrumb-curr">{breadcrumbMap[currentScreen] || 'Dashboard'}</span>
        </div>
      </div>

      <div className="header-right">
        {/* Global Search with Live Multi-Module Results Popup */}
        <div className="global-search" ref={searchContainerRef} style={{ position: 'relative' }}>
          <Search size={15} className="global-search-icon" />
          <input 
            type="text" 
            placeholder="Search PO#, PI#, EWB#, Invoice, Serial..."
            value={searchQuery || ''}
            onChange={(e) => onSearch && onSearch(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
          />
          <span className="search-shortcut">⌘K</span>

          {/* Interactive Search Dropdown Results */}
          {isSearchFocused && searchResults.length > 0 && (
            <div 
              style={{
                position: 'absolute',
                top: '38px',
                left: '0',
                right: '0',
                minWidth: '380px',
                background: '#ffffff',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
                zIndex: 100,
                padding: '6px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}
            >
              <div style={{ padding: '6px 8px', fontSize: '10.5px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Matching Commercial & Operations Documents ({searchResults.length})
              </div>

              {searchResults.map((res) => {
                const IconComponent = res.icon;
                return (
                  <div
                    key={`${res.docType}-${res.id}`}
                    onClick={() => handleSelectResult(res)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'background 0.12s ease',
                      fontSize: '11.5px',
                      background: '#ffffff'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#F5F7F6'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#ffffff'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ 
                        width: '26px', 
                        height: '26px', 
                        borderRadius: '4px', 
                        background: '#E6F4F1', 
                        color: res.badgeColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <IconComponent size={13} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="mono" style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                            {res.docNumber}
                          </span>
                          <span style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '3px', background: '#F1F5F9', color: 'var(--text-muted)' }}>
                            {res.docType}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {res.party}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div className="mono" style={{ fontWeight: 700, color: '#0F766E' }}>
                        {res.amount}
                      </div>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        {res.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Plant Status Indicator */}
        <div className="header-plant-badge">
          <Factory size={13} color="#0F766E" />
          <span>Nanded City Unit 1</span>
        </div>

        {/* Quick Action Button */}
        <button 
          type="button" 
          className="btn btn-primary btn-sm"
          onClick={onOpenQuickAction}
        >
          <Plus size={14} />
          <span>New Entry</span>
        </button>

        {/* Notification Bell */}
        <div style={{ position: 'relative' }}>
          <button 
            type="button" 
            className="header-icon-btn"
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label="Notifications"
          >
            <Bell size={17} />
            <span className="notification-dot" />
          </button>

          {showNotifications && (
            <div 
              style={{
                position: 'absolute',
                top: '44px',
                right: '0',
                width: '300px',
                background: '#ffffff',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                zIndex: 50,
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                <strong style={{ fontSize: '13px' }}>Shop Floor Alerts</strong>
                <span className="nav-badge" style={{ background: '#eff6ff', color: '#1d4ed8' }}>3 New</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                ⚠️ Ceramic bearings FAG-HC7008 dropped to 8 pairs. Reorder needed.
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                ✅ Spindle GPS-2026-0841 passed Final QC Inspection.
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', padding: '6px 0' }}>
                🔧 New Service Request logged from Kirloskar Oil Engines.
              </div>
            </div>
          )}
        </div>

        {/* User Profile */}
        <div 
          className="user-profile-menu"
          onClick={() => setShowUserMenu(!showUserMenu)}
        >
          <div className="user-avatar" style={{ background: '#ffffff', border: '1px solid var(--border-color)', padding: '2px', overflow: 'hidden' }}>
            <img src="/logo.jpg" alt="GPS Spindles" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'left center' }} />
          </div>
          <div className="user-info">
            <span className="user-name">GPS Spindles</span>
            <span className="user-role">Plant Admin & Operations</span>
          </div>
        </div>
      </div>
    </header>
  );
}
