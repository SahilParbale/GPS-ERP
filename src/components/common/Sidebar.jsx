import React from 'react';
import { 
  LayoutDashboard, ShoppingBag, Cog, Disc, Boxes, 
  ShieldCheck, Wrench, Users, Truck, FileText, 
  BarChart3, Settings, ChevronRight, Activity, 
  PanelLeftClose, PanelLeftOpen, Building2, ShoppingCart,
  Receipt, Mail, Shield
} from 'lucide-react';
import { PLANT_INFO } from '../../data/mockData';
import { useAuth } from '../../context/AuthContext';

export const NAV_SECTIONS = [
  {
    id: 'overview',
    category: 'Overview',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ]
  },
  {
    id: 'commercial',
    category: 'Commercial & Sales',
    items: [
      { id: 'sales', label: 'Sales & Quotes', icon: ShoppingBag },
      { id: 'proforma-invoices', label: 'Proforma Invoices', icon: Receipt, badge: '5' },
      { id: 'invoices', label: 'Invoices & Tax', icon: FileText },
      { id: 'e-way-bills', label: 'E-Way Bills', icon: Truck, badge: '5' },
      { id: 'customers', label: 'Customers', icon: Building2 },
      { id: 'contacts', label: 'Contacts & Directory', icon: Mail },
    ]
  },
  {
    id: 'manufacturing',
    category: 'Shop Floor & Operations',
    items: [
      { id: 'production', label: 'Production Flow', icon: Cog, badge: '18' },
      { id: 'workforce', label: 'Staff & Workforce', icon: Users, badge: '31' },
      { id: 'spindles', label: 'Spindles Registry', icon: Disc },
      { id: 'quality', label: 'Quality Control', icon: ShieldCheck, badge: '4' },
      { id: 'service', label: 'Service & Repair', icon: Wrench, badge: '7' },
    ]
  },
  {
    id: 'supply-chain',
    category: 'Supply Chain & Stores',
    items: [
      { id: 'purchase-orders', label: 'Purchase Orders', icon: ShoppingCart, badge: '5' },
      { id: 'inventory', label: 'Inventory & Stock', icon: Boxes, badge: '3' },
      { id: 'suppliers', label: 'Suppliers', icon: Truck },
    ]
  },
  {
    id: 'system',
    category: 'Analytics & System',
    items: [
      { id: 'reports', label: 'Reports & BI', icon: BarChart3 },
      { id: 'settings', label: 'Settings', icon: Settings },
    ]
  }
];

// Flat array export for backwards compatibility
export const NAV_ITEMS = NAV_SECTIONS.flatMap(s => s.items);

export default function Sidebar({ 
  currentScreen, 
  onNavigate, 
  isCollapsed, 
  onToggleCollapse,
  isMobileOpen, 
  onCloseMobile 
}) {
  const { canAccessScreen, role, roleLabel, employee } = useAuth();

  // Filter navigation items by role-authorized screens
  const visibleSections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => canAccessScreen(item.id))
  })).filter((section) => section.items.length > 0);

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
          {visibleSections.map((section) => (
            <div key={section.id} className="sidebar-category-wrap">
              {!isCollapsed && (
                <div className="sidebar-category-header">
                  <span>{section.category}</span>
                </div>
              )}
              {section.items.map((item) => {
                const Icon = item.icon;
                const isTopActive = 
                  currentScreen === item.id || 
                  (item.id === 'production' && currentScreen === 'work-order-detail') ||
                  (item.id === 'spindles' && currentScreen === 'spindle-detail');

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
            </div>
          ))}
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
          <div className="sidebar-footer" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <div className="sidebar-plant-status">
                <span className="status-dot-pulse" />
                <span>Nanded City Plant 1</span>
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
            {/* Active User Role Badge */}
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                backgroundColor: 'rgba(122, 31, 61, 0.08)',
                color: '#7A1F3D',
                padding: '4px 8px',
                borderRadius: '4px',
                fontWeight: 600
              }}
              title={`Logged in as ${employee?.employeeCode || 'GPS'} (${roleLabel})`}
            >
              <Shield size={12} style={{ flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {roleLabel}
              </span>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
