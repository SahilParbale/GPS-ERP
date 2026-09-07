import React from 'react';
import { 
  LayoutDashboard, ShoppingBag, Cog, Disc, Boxes, 
  ShieldCheck, Wrench, Users, Truck, FileText, 
  BarChart3, Settings, ChevronRight, Activity, 
  PanelLeftClose, PanelLeftOpen
} from 'lucide-react';
import { PLANT_INFO } from '../../data/mockData';

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { 
    id: 'sales', 
    label: 'Sales & Quotes', 
    icon: ShoppingBag,
    subItems: [
      { id: 'sales-quotes', label: 'Quotations' },
      { id: 'sales-orders', label: 'Sales Orders' }
    ]
  },
  { 
    id: 'production', 
    label: 'Production', 
    icon: Cog, 
    badge: '18',
    subItems: [
      { id: 'production', label: 'Pipeline & Bays' },
      { id: 'production-wos', label: 'Work Orders' }
    ]
  },
  { 
    id: 'spindles', 
    label: 'Spindles Registry', 
    icon: Disc,
    subItems: [
      { id: 'spindles', label: 'Fleet Registry' },
      { id: 'spindle-detail', label: 'Digital Twin' }
    ]
  },
  { 
    id: 'inventory', 
    label: 'Inventory', 
    icon: Boxes, 
    badge: '3',
    subItems: [
      { id: 'inventory', label: 'Stock Levels' },
      { id: 'inventory-tx', label: 'Material Logs' }
    ]
  },
  { 
    id: 'quality', 
    label: 'Quality Control', 
    icon: ShieldCheck, 
    badge: '4',
    subItems: [
      { id: 'quality', label: 'Inspections' },
      { id: 'quality-reports', label: 'Test Reports' }
    ]
  },
  { 
    id: 'service', 
    label: 'Service & Repair', 
    icon: Wrench, 
    badge: '7',
    subItems: [
      { id: 'service', label: 'Service Dashboard' },
      { id: 'service-detail', label: 'Repair Lifecycle' }
    ]
  },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'suppliers', label: 'Suppliers', icon: Truck },
  { id: 'invoices', label: 'Invoices & Tax', icon: FileText },
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
            style={{ cursor: isCollapsed ? 'pointer' : 'default' }}
            title={isCollapsed ? "GPS Spindle (Click to expand)" : "GPS Spindle"}
          >
            <div className="brand-logo">
              <Activity size={18} strokeWidth={2.5} />
            </div>
            {!isCollapsed && (
              <div className="brand-text">
                <span className="brand-name">GPS SPINDLE</span>
                <span className="brand-sub">PRECISION ERP</span>
              </div>
            )}
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
