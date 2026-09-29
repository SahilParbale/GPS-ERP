import React, { useState, useEffect } from 'react';
import Sidebar from './components/common/Sidebar';
import Header from './components/common/Header';
import Toast from './components/common/Toast';
import Modal from './components/common/Modal';
import AccessDenied from './components/common/AccessDenied';
import ErrorBoundary from './components/common/ErrorBoundary';

// Auth Integration
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginScreen from './screens/LoginScreen';
import { AppShellSkeleton, LoginScreenSkeleton } from './components/common/Skeleton';

// Screens
import DashboardScreen from './screens/DashboardScreen';
import ProductionScreen from './screens/ProductionScreen';
import WorkOrderDetailScreen from './screens/WorkOrderDetailScreen';
import SpindleRegistryScreen from './screens/SpindleRegistryScreen';
import SpindleDetailScreen from './screens/SpindleDetailScreen';
import ServiceScreen from './screens/ServiceScreen';
import InventoryScreen from './screens/InventoryScreen';
import QualityScreen from './screens/QualityScreen';
import WorkforceScreen from './screens/WorkforceScreen';
import SalesScreen from './screens/SalesScreen';
import CustomersScreen from './screens/CustomersScreen';
import ContactsScreen from './screens/ContactsScreen';
import SuppliersScreen from './screens/SuppliersScreen';
import InvoicesScreen from './screens/InvoicesScreen';
import PurchaseOrderScreen from './screens/PurchaseOrderScreen';
import ProformaInvoiceScreen from './screens/ProformaInvoiceScreen';
import EWayBillScreen from './screens/EWayBillScreen';
import ReportsScreen from './screens/ReportsScreen';
import SettingsScreen from './screens/SettingsScreen';
import DocumentsScreen from './screens/DocumentsScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import EmailActivityScreen from './screens/EmailActivityScreen';
import PWAUpdatePrompt from './components/pwa/PWAUpdatePrompt';
import PWAOfflineNotice from './components/pwa/PWAOfflineNotice';

import { WORK_ORDERS, SPINDLES } from './data/mockData';

// Helper to resolve initial screen from PWA shortcut query parameters
const getInitialScreen = () => {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const screenParam = params.get('screen');
    const validScreens = [
      'dashboard', 'production', 'workforce', 'work-order-detail',
      'spindles', 'spindle-detail', 'service', 'inventory', 'quality',
      'sales', 'customers', 'contacts', 'suppliers', 'invoices',
      'purchase-orders', 'proforma-invoices', 'e-way-bills', 'sales-activity',
      'documents', 'notifications', 'email-activity', 'reports', 'settings'
    ];
    if (screenParam && validScreens.includes(screenParam)) {
      return screenParam;
    }
  }
  return 'dashboard';
};

function AppContent() {
  const { isAuthenticated, isLoading, isLoggingIn, isLoggingOut, canAccessScreen, role } = useAuth();

  const [currentScreen, setCurrentScreen] = useState(getInitialScreen);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState(WORK_ORDERS[0]);
  const [selectedSpindle, setSelectedSpindle] = useState(SPINDLES[0]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [quickActionOpen, setQuickActionOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Toast notification system
  const addToast = (message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  };

  // Keyboard shortcut listener (Ctrl+K or ⌘K for search focus)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('.global-search input');
        if (searchInput) searchInput.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Ensure user screen is permitted when role changes
  useEffect(() => {
    if (isAuthenticated && !canAccessScreen(currentScreen)) {
      const defaultScreen = role === 'OPERATOR' || role === 'EMPLOYEE' ? 'workforce' : 'dashboard';
      setCurrentScreen(defaultScreen);
    }
  }, [role, isAuthenticated, canAccessScreen, currentScreen]);

  const handleGlobalSearch = (query) => {
    setSearchQuery(query);
    const q = query.toLowerCase().trim();
    if (!q) return;

    if (q.includes('po-') || q.includes('purchase order') || q.includes('purchase') || q.includes('schaeffler') || q.includes('jakob')) {
      if (canAccessScreen('purchase-orders')) setCurrentScreen('purchase-orders');
    } else if (q.includes('pi-') || q.includes('proforma')) {
      if (canAccessScreen('proforma-invoices')) setCurrentScreen('proforma-invoices');
    } else if (q.includes('ewb-') || q.includes('e-way') || q.includes('way bill') || q.includes('transporter')) {
      if (canAccessScreen('e-way-bills')) setCurrentScreen('e-way-bills');
    } else if (q.includes('wo-') || q.includes('work order') || q.includes('prod')) {
      if (canAccessScreen('production')) setCurrentScreen('production');
    } else if (q.includes('gps-20') || q.includes('spindle') || q.includes('twin')) {
      if (canAccessScreen('spindles')) setCurrentScreen('spindles');
    } else if (q.includes('sr-') || q.includes('repair') || q.includes('service')) {
      if (canAccessScreen('service')) setCurrentScreen('service');
    } else if (q.includes('inv-') || q.includes('bill') || q.includes('tax')) {
      if (canAccessScreen('invoices')) setCurrentScreen('invoices');
    } else if (q.includes('qc') || q.includes('runout') || q.includes('balance')) {
      if (canAccessScreen('quality')) setCurrentScreen('quality');
    } else if (q.includes('stock') || q.includes('bearing') || q.includes('mat-')) {
      if (canAccessScreen('inventory')) setCurrentScreen('inventory');
    } else if (q.includes('staff') || q.includes('workforce') || q.includes('worker') || q.includes('operator') || q.includes('emp-')) {
      if (canAccessScreen('workforce')) setCurrentScreen('workforce');
    }
  };

  // 1. Logging out state -> Show Login Screen Skeleton
  if (isLoggingOut) {
    return <LoginScreenSkeleton message="Securely signing out of plant session..." />;
  }

  // 2. Logging in state -> Show App Shell Skeleton
  if (isLoggingIn) {
    return <AppShellSkeleton message="Authenticating & Loading Precision ERP..." />;
  }

  // 3. Initial splash / session boot loading state
  if (isLoading) {
    return isAuthenticated ? (
      <AppShellSkeleton message="Restoring Precision ERP Workspace..." />
    ) : (
      <LoginScreenSkeleton message="Initializing Precision ERP Portal..." />
    );
  }

  // 4. Unauthenticated User State
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  // 3. Screen Router
  const renderScreen = () => {
    // Role-based route protection: Verify access to requested screen
    if (!canAccessScreen(currentScreen)) {
      return (
        <AccessDenied 
          attemptedScreen={currentScreen} 
          onNavigate={setCurrentScreen} 
        />
      );
    }

    switch (currentScreen) {
      case 'dashboard':
        return (
          <DashboardScreen 
            onNavigate={setCurrentScreen}
            onSelectWorkOrder={setSelectedWorkOrder}
            onNotify={addToast}
          />
        );
      case 'production':
        return (
          <ProductionScreen 
            onNavigate={setCurrentScreen}
            onSelectWorkOrder={setSelectedWorkOrder}
            onNotify={addToast}
          />
        );
      case 'workforce':
        return (
          <WorkforceScreen 
            onNavigate={setCurrentScreen}
            onSelectWorkOrder={setSelectedWorkOrder}
            onNotify={addToast}
          />
        );
      case 'work-order-detail':
        return (
          <WorkOrderDetailScreen 
            key={selectedWorkOrder?.id || selectedWorkOrder?.dbId || 'wo-detail'}
            workOrder={selectedWorkOrder}
            onNavigate={setCurrentScreen}
            onNotify={addToast}
          />
        );
      case 'spindles':
        return (
          <SpindleRegistryScreen 
            onNavigate={setCurrentScreen}
            onSelectSpindle={setSelectedSpindle}
            onNotify={addToast}
          />
        );
      case 'spindle-detail':
        return (
          <SpindleDetailScreen 
            spindle={selectedSpindle}
            onNavigate={setCurrentScreen}
            onNotify={addToast}
          />
        );
      case 'service':
        return (
          <ServiceScreen 
            onNavigate={setCurrentScreen}
            onNotify={addToast}
          />
        );
      case 'inventory':
        return (
          <InventoryScreen 
            onNavigate={setCurrentScreen}
            onNotify={addToast}
          />
        );
      case 'quality':
        return (
          <QualityScreen 
            onNotify={addToast}
          />
        );
      case 'sales':
        return (
          <SalesScreen 
            onNavigate={setCurrentScreen}
            onNotify={addToast}
          />
        );
      case 'customers':
        return (
          <CustomersScreen 
            onNavigate={setCurrentScreen}
            onNotify={addToast}
          />
        );
      case 'contacts':
        return (
          <ContactsScreen 
            onNavigate={setCurrentScreen}
            onNotify={addToast}
          />
        );
      case 'suppliers':
        return (
          <SuppliersScreen 
            onNotify={addToast}
          />
        );
      case 'invoices':
        return (
          <InvoicesScreen 
            onNotify={addToast}
          />
        );
      case 'purchase-orders':
        return (
          <PurchaseOrderScreen 
            onNavigate={setCurrentScreen}
            onNotify={addToast}
          />
        );
      case 'proforma-invoices':
        return (
          <ProformaInvoiceScreen 
            onNavigate={setCurrentScreen}
            onNotify={addToast}
          />
        );
      case 'e-way-bills':
        return (
          <EWayBillScreen 
            onNavigate={setCurrentScreen}
            onNotify={addToast}
          />
        );
      case 'sales-activity':
        return (
          <SalesScreen 
            initialTab="activity"
            onNavigate={setCurrentScreen}
            onNotify={addToast}
          />
        );
      case 'documents':
        return (
          <DocumentsScreen 
            onNotify={addToast}
          />
        );
      case 'notifications':
        return (
          <NotificationsScreen 
            onNavigate={setCurrentScreen}
            onNotify={addToast}
          />
        );
      case 'email-activity':
        return (
          <EmailActivityScreen 
            onNotify={addToast}
          />
        );
      case 'reports':
        return (
          <ReportsScreen 
            onNotify={addToast}
          />
        );
      case 'settings':
        return (
          <SettingsScreen 
            onNotify={addToast}
          />
        );
      default:
        return (
          <DashboardScreen 
            onNavigate={setCurrentScreen}
            onSelectWorkOrder={setSelectedWorkOrder}
            onNotify={addToast}
          />
        );
    }
  };

  // Filter quick actions by authorized screens
  const permittedQuickActions = [
    { label: 'Create Purchase Order (PO)', desc: 'Issue PO to Schaeffler, Bharat Steel, or OTT Jakob', screen: 'purchase-orders' },
    { label: 'Issue Proforma Invoice (PI)', desc: 'Generate advance payment proforma linked to Sales Order', screen: 'proforma-invoices' },
    { label: 'Generate E-Way Bill (EWB)', desc: 'Create dispatch transit pass for customer consignment', screen: 'e-way-bills' },
    { label: 'Draft Precision Quotation', desc: 'Prepare proposal with 18% GST and terms', screen: 'sales' },
    { label: 'Launch New Work Order', desc: 'Initialize traveler for CNC machining & grinding', screen: 'production' },
    { label: 'Register Spindle Serial Asset', desc: 'Add new manufactured unit to digital fleet registry', screen: 'spindles' },
    { label: 'Log Inward Service / Overhaul', desc: 'Create inspection ticket for customer rebuild', screen: 'service' },
    { label: 'Final QC Air Gauge Inspection', desc: 'Perform micron dial test indicator sign-off', screen: 'quality' },
  ].filter(action => canAccessScreen(action.screen));

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <Sidebar 
        currentScreen={currentScreen}
        onNavigate={setCurrentScreen}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => {
          setIsSidebarCollapsed(!isSidebarCollapsed);
          addToast(!isSidebarCollapsed ? "Sidebar closed. Full screen mode active." : "Sidebar expanded.");
        }}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* Main Area */}
      <div className="app-main">
        {/* Top Header */}
        <Header 
          currentScreen={currentScreen}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => {
            setIsSidebarCollapsed(!isSidebarCollapsed);
            addToast(!isSidebarCollapsed ? "Sidebar closed. Full screen mode active." : "Sidebar expanded.");
          }}
          onToggleMobile={() => setIsMobileOpen(!isMobileOpen)}
          onOpenQuickAction={() => setQuickActionOpen(true)}
          onSearch={handleGlobalSearch}
          searchQuery={searchQuery}
          onNavigate={setCurrentScreen}
        />

        {/* Dynamic Screen View */}
        <ErrorBoundary key={currentScreen}>
          {renderScreen()}
        </ErrorBoundary>
      </div>

      {/* Toast Notification Container */}
      <Toast toasts={toasts} />

      {/* Global Quick Action Modal */}
      <Modal
        isOpen={quickActionOpen}
        onClose={() => setQuickActionOpen(false)}
        title="GPS Spindle - Rapid Shop Floor Action"
        maxWidth="500px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {permittedQuickActions.map((action, idx) => (
            <div 
              key={idx}
              style={{
                padding: '12px 16px',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                transition: 'all 0.15s',
                backgroundColor: 'var(--bg-surface-subtle)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--primary)';
                e.currentTarget.style.backgroundColor = '#FAF0F3';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-color)';
                e.currentTarget.style.backgroundColor = 'var(--bg-surface-subtle)';
              }}
              onClick={() => {
                setQuickActionOpen(false);
                setCurrentScreen(action.screen);
                addToast(`Switched to ${action.label}`);
              }}
            >
              <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-main)' }}>{action.label}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{action.desc}</div>
            </div>
          ))}
          {permittedQuickActions.length === 0 && (
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', padding: '12px', textAlign: 'center' }}>
              No quick actions available for your current role.
            </div>
          )}
        </div>
      </Modal>

      {/* Controlled PWA Update Prompt */}
      <PWAUpdatePrompt />

      {/* Network Connectivity Monitor */}
      <PWAOfflineNotice />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
