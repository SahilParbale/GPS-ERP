import React, { useState, useEffect } from 'react';
import Sidebar from './components/common/Sidebar';
import Header from './components/common/Header';
import Toast from './components/common/Toast';
import Modal from './components/common/Modal';

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
import SuppliersScreen from './screens/SuppliersScreen';
import InvoicesScreen from './screens/InvoicesScreen';
import ReportsScreen from './screens/ReportsScreen';
import SettingsScreen from './screens/SettingsScreen';

import { WORK_ORDERS, SPINDLES } from './data/mockData';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('dashboard');
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

  const handleGlobalSearch = (query) => {
    setSearchQuery(query);
    const q = query.toLowerCase().trim();
    if (!q) return;

    if (q.includes('wo-') || q.includes('work order') || q.includes('prod')) {
      setCurrentScreen('production');
    } else if (q.includes('gps-20') || q.includes('spindle') || q.includes('twin')) {
      setCurrentScreen('spindles');
    } else if (q.includes('sr-') || q.includes('repair') || q.includes('service')) {
      setCurrentScreen('service');
    } else if (q.includes('inv-') || q.includes('bill') || q.includes('tax')) {
      setCurrentScreen('invoices');
    } else if (q.includes('qc') || q.includes('runout') || q.includes('balance')) {
      setCurrentScreen('quality');
    } else if (q.includes('stock') || q.includes('bearing') || q.includes('mat-')) {
      setCurrentScreen('inventory');
    } else if (q.includes('staff') || q.includes('workforce') || q.includes('worker') || q.includes('operator') || q.includes('emp-')) {
      setCurrentScreen('workforce');
    }
  };

  const renderScreen = () => {
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
        />

        {/* Dynamic Screen View */}
        {renderScreen()}
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
          {[
            { label: 'Launch New Work Order', desc: 'Initialize traveler for CNC machining & grinding', screen: 'production' },
            { label: 'Register Spindle Serial Asset', desc: 'Add new manufactured unit to digital fleet registry', screen: 'spindles' },
            { label: 'Log Inward Service / Overhaul', desc: 'Create inspection ticket for customer rebuild', screen: 'service' },
            { label: 'Draft Precision Quotation', desc: 'Prepare proposal with 18% GST and terms', screen: 'sales' },
            { label: 'Raise Purchase Requisition (PO)', desc: 'Procure FAG bearings, bar stock, or stators', screen: 'inventory' },
            { label: 'Final QC Air Gauge Inspection', desc: 'Perform micron dial test indicator sign-off', screen: 'quality' },
          ].map((action, idx) => (
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
                e.currentTarget.style.backgroundColor = '#f0f9ff';
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
        </div>
      </Modal>
    </div>
  );
}
