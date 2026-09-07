import React, { useState } from 'react';
import { 
  Menu, Search, Bell, Plus, ChevronRight, User, 
  Layers, CheckSquare, Factory, PanelLeftClose, PanelLeftOpen
} from 'lucide-react';
import { PLANT_INFO } from '../../data/mockData';

export default function Header({ 
  currentScreen, 
  isSidebarCollapsed,
  onToggleCollapse, 
  onToggleMobile, 
  onOpenQuickAction, 
  onSearch, 
  searchQuery 
}) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Friendly title mapping for breadcrumb
  const breadcrumbMap = {
    'dashboard': 'Executive Dashboard',
    'production': 'Production Management',
    'workforce': 'Staff & Workforce Management',
    'work-order-detail': 'Work Order Detail (WO-2026-104)',
    'spindles': 'Spindle Fleet Registry',
    'spindle-detail': 'Digital Twin Profile (GPS-2026-0842)',
    'sales': 'Quotations & Commercial',
    'inventory': 'Materials & Stock Control',
    'quality': 'Quality Control & Metrology',
    'service': 'Service, Overhaul & Warranty',
    'customers': 'Customer Accounts',
    'suppliers': 'Precision Vendors',
    'invoices': 'Invoices & GST Billing',
    'reports': 'Plant Analytics & Reports',
    'settings': 'System Settings'
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
          <img 
            src="/logo.jpg" 
            alt="General Precision Spindles" 
            style={{ 
              height: '22px', 
              borderRadius: '3px',
              background: '#ffffff',
              padding: '1px 3px',
              border: '1px solid var(--border-color)',
              verticalAlign: 'middle'
            }} 
          />
          <ChevronRight size={14} />
          <span className="breadcrumb-curr">{breadcrumbMap[currentScreen] || 'Dashboard'}</span>
        </div>
      </div>

      <div className="header-right">
        {/* Global Search */}
        <div className="global-search">
          <Search size={15} className="global-search-icon" />
          <input 
            type="text" 
            placeholder="Search Serial, WO#, Part, Customer..."
            value={searchQuery || ''}
            onChange={(e) => onSearch && onSearch(e.target.value)}
          />
          <span className="search-shortcut">⌘K</span>
        </div>

        {/* Plant Status Indicator */}
        <div className="header-plant-badge">
          <Factory size={13} color="#0284c7" />
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
