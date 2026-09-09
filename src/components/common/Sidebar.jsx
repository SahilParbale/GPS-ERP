import React from 'react';
import { 
  LayoutDashboard, ShoppingBag, Cog, Disc, Boxes, 
  ShieldCheck, Wrench, Users, Truck, FileText, 
  BarChart3, Settings, ChevronRight, Activity, 
  PanelLeftClose, PanelLeftOpen, Building2, ShoppingCart,
  Receipt, Mail
} from 'lucide-react';
import { PLANT_INFO } from '../../data/mockData';

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'sales', label: 'Sales & Quotes', icon: ShoppingBag },
  { id: 'proforma-invoices', label: 'Proforma Invoices', icon: Receipt, badge: '5' },
  { id: 'invoices', label: 'Invoices & Tax', icon: FileText },
  { id: 'e-way-bills', label: 'E-Way Bills', icon: Truck, badge: '5' },
  { id: 'purchase-orders', label: 'Purchase Orders', icon: ShoppingCart, badge: '5' },
  { id: 'production', label: 'Production', icon: Cog, badge: '18' },
  { id: 'workforce', label: 'Staff & Workforce', icon: Users, badge: '31' },
  { id: 'spindles', label: 'Spindles Registry', icon: Disc },
  { id: 'inventory', label: 'Inventory', icon: Boxes, badge: '3' },
  { id: 'quality', label: 'Quality Control', icon: ShieldCheck, badge: '4' },
  { id: 'service', label: 'Service & Repair', icon: Wrench, badge: '7' },
  { id: 'customers', label: 'Customers', icon: Building2 },
  { id: 'contacts', label: 'Contacts & Emails', icon: Mail },
  { id: 'suppliers', label: 'Suppliers', icon: Truck },
  { id: 'reports', label: 'Reports & BI', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ 
  currentScreen, 
  onNavigate, 
  isCollapsed, 
  onToggleCollapse,
  isMobileOpen, 
  onCloseMobile 
}) {
  return (
    <>
      {isMobileOpen && (
        <div className="sidebar-backdrop" onClick={onCloseMobile} />
      )}
      <aside className={`app-sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div 
            className="brand-badge"
            onClick={isCollapsed ? onToggleCollapse : undefined}
            style={{ 
              cursor: isCollapsed ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              minWidth: 0,
              maxWidth: '100%'
            }}
            title={isCollapsed ? "General Precision Spindles (Click to expand)" : "General Precision Spindles"}
          >
            <div 
              style={{
                background: '#ffffff',
                borderRadius: '5px',
                padding: '2px 4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                flexShrink: 0,
                height: '30px',
                width: isCollapsed ? '32px' : 'auto',
                maxWidth: isCollapsed ? '32px' : '170px',
                overflow: 'hidden'
              }}
            >
              <img 
                src="/logo.jpg" 
                alt="General Precision Spindles" 
                style={{
                  height: '26px',
                  width: isCollapsed ? '26px' : 'auto',
                  objectFit: isCollapsed ? 'cover' : 'contain',
                  objectPosition: 'left center',
                  display: 'block'
                }} 
              />
            </div>
          </div>
          {!isCollapsed && (
            <button
              type="button"
              className="sidebar-close-btn"
              onClick={onToggleCollapse}
              title="Collapse to icon rail"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose size={15} />
            </button>
          )}
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isTopActive = currentScreen === item.id || (item.id === 'production' && currentScreen === 'work-order-detail');

            return (
              <button
                key={item.id}
                type="button"
                className={`nav-item ${isTopActive ? 'active' : ''}`}
                onClick={() => {
                  onNavigate(item.id);
                  if (onCloseMobile) onCloseMobile();
                }}
                title={item.label}
              >
                <Icon size={isCollapsed ? 18 : 16} className="nav-icon" />
                {!isCollapsed && <span>{item.label}</span>}
                {!isCollapsed && item.badge && (
                  <span className="nav-badge">{item.badge}</span>
                )}
              </button>
            );
          })}
        </nav>

        {isCollapsed ? (
          <div className="sidebar-footer collapsed">
            <button
              type="button"
              className="sidebar-rail-toggle-btn"
              onClick={onToggleCollapse}
              title="Expand sidebar menu"
              aria-label="Expand sidebar"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        ) : (
          <div className="sidebar-footer">
            <div className="sidebar-plant-status">
              <span className="status-dot-pulse" />
              <span>Nanded City Unit 1 • Shift A</span>
            </div>
            <button
              type="button"
              className="sidebar-fullscreen-btn"
              onClick={onToggleCollapse}
              title="Collapse to icon rail"
              aria-label="Collapse to icon rail"
            >
              <PanelLeftClose size={13} />
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
