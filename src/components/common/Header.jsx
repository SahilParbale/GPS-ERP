import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Menu, Search, Bell, Plus, ChevronRight, User, 
  Layers, CheckSquare, Factory, PanelLeftClose, PanelLeftOpen,
  ArrowRight, FileText, ShoppingCart, Receipt, Truck,
  LogOut, KeyRound, Shield, Check
} from 'lucide-react';
import { 
  PURCHASE_ORDERS, 
  PROFORMA_INVOICES, 
  E_WAY_BILLS, 
  QUOTATIONS, 
  INVOICES 
} from '../../data/mockData';
import { useAuth } from '../../context/AuthContext';
import { notificationService } from '../../services/database/notificationService';
import UserProfileModal from '../auth/UserProfileModal';
import ChangePasswordModal from '../auth/ChangePasswordModal';
import InstallAppPrompt from '../pwa/InstallAppPrompt';

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
  const { profile, employee, role, roleLabel, signOut, switchDemoRole, demoUsers } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [liveNotifications, setLiveNotifications] = useState([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchContainerRef = useRef(null);
  const userMenuRef = useRef(null);

  // Load notifications and subscribe to live alert events
  useEffect(() => {
    const fetchHeaderAlerts = async () => {
      try {
        const notifRes = await notificationService.getNotifications({ limit: 5 });
        if (notifRes.data) {
          setLiveNotifications(notifRes.data);
        }
        const countRes = await notificationService.getUnreadCount();
        setUnreadNotifCount(countRes.count || 0);
      } catch (e) {
        console.error('Error fetching header notifications:', e);
      }
    };

    fetchHeaderAlerts();

    // Subscribe to live Realtime alerts
    const sub = notificationService.subscribe((payload) => {
      fetchHeaderAlerts();
    });

    return () => {
      sub.unsubscribe();
    };
  }, []);

  // Close user dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    'documents': 'Engineering Documents & Vault',
    'notifications': 'Plant Notifications & Alerts',
    'email-activity': 'Email Transmission Register',
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
          badgeColor: '#7A1F3D'
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
          <span className="mobile-menu-icon" style={{ display: 'none', alignItems: 'center' }}>
            <Menu size={18} />
          </span>
          <span className="desktop-toggle-icon" style={{ display: 'inline-flex', alignItems: 'center' }}>
            {isSidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </span>
          {isSidebarCollapsed && (
            <span className="desktop-toggle-text" style={{ fontSize: '11px', fontWeight: 600, marginLeft: '4px', color: 'var(--primary)' }}>
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
                right: 'auto',
                width: 'clamp(280px, 90vw, 420px)',
                maxWidth: 'calc(100vw - 20px)',
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
                    onMouseEnter={(e) => e.currentTarget.style.background = '#FAF0F3'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#ffffff'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ 
                        width: '26px', 
                        height: '26px', 
                        borderRadius: '4px', 
                        background: '#F5E8ED', 
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
                          <span style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '3px', background: 'var(--status-neutral-bg)', color: 'var(--text-muted)' }}>
                            {res.docType}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {res.party}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div className="mono" style={{ fontWeight: 700, color: '#7A1F3D' }}>
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
          <Factory size={13} color="#7A1F3D" />
          <span>Nanded City Unit 1</span>
        </div>

        {/* PWA Desktop App Install Button */}
        <InstallAppPrompt variant="header" />

        {/* Quick Action Button */}
        <button 
          type="button" 
          className="btn btn-primary btn-sm header-quick-btn"
          onClick={onOpenQuickAction}
          title="New rapid shop floor action"
        >
          <Plus size={14} />
          <span className="header-quick-text">New Entry</span>
        </button>

        {/* Notification Bell */}
        <div style={{ position: 'relative' }}>
          <button 
            type="button" 
            className="header-icon-btn"
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label="Notifications"
            title={`${unreadNotifCount} Unread Notifications`}
          >
            <Bell size={17} />
            {unreadNotifCount > 0 && <span className="notification-dot" />}
          </button>

          {showNotifications && (
            <div 
              style={{
                position: 'absolute',
                top: '44px',
                right: '0',
                width: 'min(320px, calc(100vw - 20px))',
                background: '#ffffff',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                zIndex: 100,
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                <strong style={{ fontSize: '13px' }}>Shop Floor Alerts</strong>
                <span className="nav-badge" style={{ background: unreadNotifCount > 0 ? '#eff6ff' : '#f0fdf4', color: unreadNotifCount > 0 ? '#1d4ed8' : '#15803d' }}>
                  {unreadNotifCount > 0 ? `${unreadNotifCount} New` : 'All clear'}
                </span>
              </div>

              {liveNotifications.length === 0 ? (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '12px 0', textAlign: 'center' }}>
                  All systems operational. Zero pending alerts.
                </div>
              ) : (
                liveNotifications.slice(0, 4).map(notif => (
                  <div 
                    key={notif.id}
                    style={{ 
                      fontSize: '12px', 
                      color: 'var(--text-secondary)', 
                      padding: '6px 0', 
                      borderBottom: '1px solid #f1f5f9',
                      cursor: 'pointer'
                    }}
                    onClick={() => {
                      if (!notif.is_read) {
                        notificationService.markAsRead(notif.id);
                        setUnreadNotifCount(prev => Math.max(0, prev - 1));
                      }
                      if (onNavigate) {
                        onNavigate('notifications');
                        setShowNotifications(false);
                      }
                    }}
                  >
                    <div style={{ fontWeight: 600, color: notif.priority === 'Critical' || notif.priority === 'Urgent' ? '#b91c1c' : 'var(--text-main)' }}>
                      {notif.priority === 'Critical' || notif.priority === 'Urgent' ? '⚠️ ' : 'ℹ️ '}
                      {notif.title}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', lineHeight: '1.3' }}>
                      {notif.message}
                    </div>
                  </div>
                ))
              )}

              <div style={{ paddingTop: '6px', textAlign: 'center' }}>
                <button
                  type="button"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#7A1F3D',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    width: '100%',
                    padding: '4px 0'
                  }}
                  onClick={() => {
                    if (onNavigate) onNavigate('notifications');
                    setShowNotifications(false);
                  }}
                >
                  <span>View All Alerts & Notifications</span>
                  <ChevronRight size={12} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Profile */}
        <div 
          ref={userMenuRef}
          style={{ position: 'relative' }}
        >
          <div 
            className="user-profile-menu"
            onClick={() => setShowUserMenu(!showUserMenu)}
            style={{ cursor: 'pointer' }}
          >
            <div 
              className="user-avatar" 
              style={{ 
                background: employee?.avatarColor || profile?.avatarColor || '#7A1F3D', 
                color: '#ffffff', 
                fontSize: '12px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--border-color)',
                overflow: 'hidden' 
              }}
            >
              {(profile?.name || employee?.name || 'GPS').split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <div className="user-info">
              <span className="user-name">{profile?.name || employee?.name || 'Rahul Patil'}</span>
              <span className="user-role">{roleLabel || 'Plant Admin & Operations'}</span>
            </div>
          </div>

          {/* User Profile Dropdown */}
          {showUserMenu && (
            <div 
              style={{
                position: 'absolute',
                top: '48px',
                right: '0',
                width: 'min(270px, calc(100vw - 20px))',
                background: '#ffffff',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                zIndex: 100,
                padding: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}
            >
              {/* Identity Header */}
              <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface-subtle)', borderRadius: '6px', marginBottom: '4px' }}>
                <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-main)' }}>
                  {profile?.name || employee?.name || 'Rahul Patil'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 600, marginTop: '2px' }}>
                  {employee?.employeeCode || 'GPS-EMP-101'} • {roleLabel}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {employee?.department || 'Production Machining'}
                </div>
              </div>

              {/* Actions */}
              <button
                type="button"
                className="dropdown-item"
                onClick={() => {
                  setShowUserMenu(false);
                  setIsProfileModalOpen(true);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: 'var(--text-main)',
                  background: 'none',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface-subtle)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <User size={14} color="var(--primary)" />
                <span>My Employee Profile</span>
              </button>

              <button
                type="button"
                className="dropdown-item"
                onClick={() => {
                  setShowUserMenu(false);
                  setIsChangePasswordModalOpen(true);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: 'var(--text-main)',
                  background: 'none',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface-subtle)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <KeyRound size={14} color="var(--primary)" />
                <span>Change Password</span>
              </button>

              {/* Install PWA Option in Menu */}
              <InstallAppPrompt variant="menu" onInstalled={() => setShowUserMenu(false)} />

              {/* Dev Mode Role Switcher */}
              <div style={{ borderTop: '1px dashed var(--border-color)', marginTop: '4px', paddingTop: '6px' }}>
                <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', padding: '2px 12px', textTransform: 'uppercase' }}>
                  Switch Role (Dev Testing)
                </div>
                <div style={{ maxHeight: '140px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {demoUsers.map((u) => (
                    <button
                      key={u.role}
                      type="button"
                      onClick={() => {
                        switchDemoRole(u.role);
                        setShowUserMenu(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '5px 12px',
                        fontSize: '11px',
                        color: role === u.role ? 'var(--primary)' : 'var(--text-main)',
                        fontWeight: role === u.role ? 700 : 500,
                        background: role === u.role ? '#FAF0F3' : 'none',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <span>{u.roleLabel}</span>
                      {role === u.role && <Check size={12} color="var(--primary)" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sign Out Button */}
              <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '4px', paddingTop: '4px' }}>
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={async () => {
                    setShowUserMenu(false);
                    await signOut();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#dc2626',
                    background: 'none',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FEF2F2'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <LogOut size={14} color="#dc2626" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <UserProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
      />
      <ChangePasswordModal 
        isOpen={isChangePasswordModalOpen} 
        onClose={() => setIsChangePasswordModalOpen(false)} 
      />
    </header>
  );
}
