import React from 'react';
import { 
  LayoutDashboard, ShoppingBag, Cog, Disc, Boxes, 
  ShieldCheck, Wrench, Users, Truck, FileText, 
  BarChart3, Settings, ChevronRight, Activity, 
  PanelLeftClose, PanelLeftOpen, Building2, ShoppingCart,
  Receipt, Mail, Shield, FolderOpen, Bell, X, CreditCard
} from 'lucide-react';
import { PLANT_INFO } from '../../data/mockData';
import { useAuth } from '../../context/AuthContext';
import { isCleanSlateMode } from '../../utils/dataMode';

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
      { id: 'proforma-invoices', label: 'Proforma Invoices', icon: Receipt },
      { id: 'invoices', label: 'Invoices & Tax', icon: FileText },
<<<<<<< HEAD
      { id: 'e-way-bills', label: 'E-Way Bills', icon: Truck },
=======
      { id: 'payments', label: 'Client Payments', icon: CreditCard },
      { id: 'e-way-bills', label: 'E-Way Bills', icon: Truck, badge: '5' },
>>>>>>> 6d21c09e5f37158641e56603d881a66bc337e4d5
      { id: 'customers', label: 'Customers', icon: Building2 },
      { id: 'contacts', label: 'Contacts & Directory', icon: Mail },
      { id: 'email-activity', label: 'Email Activity', icon: Mail },
    ]
  },
  {
    id: 'manufacturing',
    category: 'Shop Floor & Operations',
    items: [
      { id: 'production', label: 'Production Flow', icon: Cog },
      { id: 'workforce', label: 'Staff & Workforce', icon: Users },
      { id: 'spindles', label: 'Spindle Fleet & Registry', icon: Disc },
      { id: 'quality', label: 'Quality Control', icon: ShieldCheck },
      { id: 'service', label: 'Service & Repair', icon: Wrench },
    ]
  },
  {
    id: 'supply-chain',
    category: 'Supply Chain & Stores',
    items: [
      { id: 'purchase-orders', label: 'Purchase Orders', icon: ShoppingCart },
      { id: 'inventory', label: 'Inventory & Stock', icon: Boxes },
      { id: 'suppliers', label: 'Suppliers', icon: Truck },
    ]
  },
  {
    id: 'system',
    category: 'Analytics & System',
    items: [
      { id: 'documents', label: 'Documents & Vault', icon: FolderOpen },
      { id: 'notifications', label: 'Notifications & Alerts', icon: Bell },
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
          <div className="sidebar-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {/* Mobile-only close drawer button */}
            {isMobileOpen && (
              <button
                type="button"
                className="sidebar-close-btn mobile-close-btn"
                onClick={onCloseMobile}
                title="Close navigation drawer"
                aria-label="Close navigation"
              >
                <X size={16} />
              </button>
            )}
          </div>
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
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {isCollapsed ? (
          <div className="sidebar-footer collapsed">
          </div>
        ) : (
          <div className="sidebar-footer" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <div className="sidebar-plant-status">
                <span className="status-dot-pulse" />
                <span>Nanded City Plant 1</span>
              </div>
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
