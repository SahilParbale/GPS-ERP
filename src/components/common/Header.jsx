import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Menu, Search, Bell, Plus, ChevronRight, User, 
  Layers, CheckSquare, Factory, PanelLeftClose, PanelLeftOpen,
  ArrowRight, FileText, ShoppingCart, Receipt, Truck,
  LogOut, KeyRound, Shield, Check, X, Sparkles, CornerDownLeft, Filter,
  Zap, AlertTriangle, Info, ArrowLeft
} from 'lucide-react';
import { universalSearchService, SEARCH_CATEGORIES } from '../../services/universalSearchService';
import { useAuth } from '../../context/AuthContext';
import { notificationService } from '../../services/database/notificationService';
import UserProfileModal from '../auth/UserProfileModal';
import ChangePasswordModal from '../auth/ChangePasswordModal';
import InstallAppPrompt from '../pwa/InstallAppPrompt';
import { isCleanSlateMode, toggleCleanSlateMode } from '../../utils/dataMode';

export default function Header({ 
  currentScreen, 
  isSidebarCollapsed,
  onToggleCollapse, 
  onToggleMobile, 
  onOpenQuickAction, 
  onSearch, 
  searchQuery,
  onNavigate,
  onNotify
}) {
  const { profile, employee, role, roleLabel, signOut, canAccessScreen } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [liveNotifications, setLiveNotifications] = useState([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [activeSearchCategory, setActiveSearchCategory] = useState('all');
  const [selectedResultIndex, setSelectedResultIndex] = useState(-1);
  const [cleanSlate] = useState(() => isCleanSlateMode());
  const searchContainerRef = useRef(null);
  const searchInputRef = useRef(null);
  const mobileSearchContainerRef = useRef(null);
  const mobileSearchInputRef = useRef(null);
  const notificationsRef = useRef(null);
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

  // Global shortcut for universal search (⌘K or Ctrl+K)
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (window.innerWidth <= 768) {
          setIsMobileSearchOpen(true);
          setIsSearchFocused(true);
          setTimeout(() => {
            if (mobileSearchInputRef.current) mobileSearchInputRef.current.focus();
          }, 50);
        } else {
          setIsSearchFocused(true);
          if (searchInputRef.current) searchInputRef.current.focus();
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Close user dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Close notifications dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notificationsRef.current && !notificationsRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Friendly title mapping for breadcrumb
  const breadcrumbMap = {
    'dashboard': 'Dashboard',
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
    'customers': 'Client Directory',
    'contacts': 'Client Directory',
    'suppliers': 'Precision Vendors',
    'invoices': 'Invoices & GST Billing',
    'documents': 'Engineering Documents & Vault',
    'notifications': 'Plant Notifications & Alerts',
    'email-activity': 'Email Transmission Register (Outlook 365)',
    'reports': 'Plant Analytics & Reports',
    'settings': 'System Settings'
  };

  // Close search dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      const inDesktop = searchContainerRef.current && searchContainerRef.current.contains(e.target);
      const inMobile = mobileSearchContainerRef.current && mobileSearchContainerRef.current.contains(e.target);
      if (!inDesktop && !inMobile) {
        setIsSearchFocused(false);
        if (isMobileSearchOpen && !searchQuery) {
          setIsMobileSearchOpen(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isMobileSearchOpen, searchQuery]);

  // Universal multi-module full-software search
  const { results: searchResults, totalCount, isSuggestion, categoryCounts } = useMemo(() => {
    return universalSearchService.search(searchQuery, activeSearchCategory, 30);
  }, [searchQuery, activeSearchCategory]);

  const handleSelectResult = (res) => {
    if (res.targetScreen && canAccessScreen && !canAccessScreen(res.targetScreen)) {
      if (onNotify) {
        onNotify(`Access Denied: Your assigned role (${roleLabel || role}) cannot access "${res.docType || res.targetScreen}".`);
      }
      setIsSearchFocused(false);
      return;
    }
    if (onNavigate) {
      onNavigate(res.targetScreen, res);
    }
    if (onSearch) {
      onSearch('');
    }
    setIsSearchFocused(false);
    setIsMobileSearchOpen(false);
    setSelectedResultIndex(-1);
  };

  const handleSearchKeyDown = (e) => {
    if (!isSearchFocused) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (searchResults.length > 0) {
        setSelectedResultIndex((prev) => (prev + 1) % searchResults.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (searchResults.length > 0) {
        setSelectedResultIndex((prev) => (prev <= 0 ? searchResults.length - 1 : prev - 1));
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = selectedResultIndex >= 0 ? searchResults[selectedResultIndex] : searchResults[0];
      if (target) {
        handleSelectResult(target);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsSearchFocused(false);
      setIsMobileSearchOpen(false);
      setSelectedResultIndex(-1);
      if (searchInputRef.current) searchInputRef.current.blur();
      if (mobileSearchInputRef.current) mobileSearchInputRef.current.blur();
    }
  };

  // Universal Search Dropdown Component
  const renderSearchDropdown = (isMobile = false) => {
    if (!isSearchFocused && !isMobile) return null;

    return (
      <div 
        className={`universal-search-dropdown ${isMobile ? 'mobile-search-results-overlay' : ''}`}
        style={isMobile ? {
          position: 'fixed',
          top: 'var(--header-height)',
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: 'calc(100dvh - var(--header-height))',
          background: '#ffffff',
          borderTop: '1px solid var(--border-color)',
          zIndex: 1050,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeIn 0.15s ease-out'
        } : {
          position: 'absolute',
          top: '38px',
          right: '0',
          width: 'min(680px, calc(100vw - 16px))',
          maxWidth: 'calc(100vw - 16px)',
          maxHeight: 'min(580px, 80vh)',
          background: '#ffffff',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 20px 45px -10px rgba(0,0,0,0.2), 0 8px 16px -6px rgba(0,0,0,0.1)',
          zIndex: 1050,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeIn 0.15s ease-out'
        }}
      >
        {/* Category Filter Pills Bar */}
        <div style={{
          padding: '8px 12px',
          background: 'var(--bg-surface-subtle)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
          flexShrink: 0
        }}>
          <button
            type="button"
            onClick={() => { setActiveSearchCategory('all'); setSelectedResultIndex(-1); }}
            style={{
              padding: isMobile ? '5px 12px' : '3px 10px',
              borderRadius: '9999px',
              fontSize: isMobile ? '12px' : '11px',
              fontWeight: 600,
              border: '1px solid',
              borderColor: activeSearchCategory === 'all' ? 'var(--primary)' : 'var(--border-color)',
              background: activeSearchCategory === 'all' ? 'var(--primary)' : '#ffffff',
              color: activeSearchCategory === 'all' ? '#ffffff' : 'var(--text-secondary)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.12s'
            }}
          >
            All Modules ({totalCount})
          </button>

          {SEARCH_CATEGORIES.filter(c => c.id !== 'all').map(cat => {
            const count = categoryCounts[cat.id] || 0;
            if (!isSuggestion && count === 0 && activeSearchCategory !== cat.id) return null;
            const isActive = activeSearchCategory === cat.id;
            const CatIcon = cat.icon;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => { setActiveSearchCategory(cat.id); setSelectedResultIndex(-1); }}
                style={{
                  padding: isMobile ? '5px 11px' : '3px 9px',
                  borderRadius: '9999px',
                  fontSize: isMobile ? '12px' : '11px',
                  fontWeight: 600,
                  border: '1px solid',
                  borderColor: isActive ? cat.color : 'var(--border-color)',
                  background: isActive ? cat.bg : '#ffffff',
                  color: isActive ? cat.color : 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.12s'
                }}
              >
                <CatIcon size={isMobile ? 12 : 11} color={isActive ? cat.color : 'var(--text-muted)'} />
                <span>{cat.label}</span>
                {!isSuggestion && count > 0 && (
                  <span style={{
                    fontSize: isMobile ? '10px' : '9.5px',
                    background: isActive ? cat.color : 'var(--border-subtle)',
                    color: isActive ? '#ffffff' : 'var(--text-muted)',
                    padding: '0 4px',
                    borderRadius: '8px',
                    marginLeft: '2px'
                  }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Status Header */}
        <div style={{
          padding: '6px 14px',
          background: '#fafafa',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '10.5px',
          fontWeight: 700,
          color: 'var(--text-muted)',
          letterSpacing: '0.03em',
          textTransform: 'uppercase',
          flexShrink: 0
        }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            {isSuggestion ? (
              <>
                <Zap size={11} color="#f59e0b" />
                <span>Quick Shortcuts & Priority Software Records</span>
              </>
            ) : (
              <span>{`Matching ${searchResults.length} ${searchResults.length === 1 ? 'record' : 'records'} across software`}</span>
            )}
          </span>
          {searchQuery && (
            <button
              type="button"
              onClick={() => { onSearch && onSearch(''); setActiveSearchCategory('all'); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontSize: '10.5px', fontWeight: 600 }}
            >
              Clear Filter
            </button>
          )}
        </div>

        {/* Scrollable Results List */}
        <div style={{
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          flex: isMobile ? 1 : 'none',
          maxHeight: isMobile ? 'none' : '380px',
          padding: isMobile ? '8px' : '6px',
          display: 'flex',
          flexDirection: 'column',
          gap: isMobile ? '4px' : '2px'
        }}>
          {searchResults.length === 0 ? (
            <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Search size={28} style={{ margin: '0 auto 8px', color: '#94a3b8' }} />
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                No matches found for "{searchQuery}"
              </div>
              <div style={{ fontSize: '11px', maxWidth: '380px', margin: '0 auto', color: 'var(--text-muted)' }}>
                Try searching by Work Order # (WO-2026-104), Serial (GPS-0842), Quote (QTN-294), Customer (Linamar, Tata), Vendor (Schaeffler), or Item (HC7008).
              </div>
            </div>
          ) : (
            searchResults.map((res, idx) => {
              const IconComponent = res.icon || Factory;
              const isSelected = idx === selectedResultIndex;

              return (
                <div
                  key={`${res.category}-${res.id}-${idx}`}
                  onClick={() => handleSelectResult(res)}
                  style={{
                    padding: isMobile ? '12px 14px' : '9px 12px',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    transition: 'all 0.12s ease',
                    fontSize: isMobile ? '13px' : '12px',
                    background: isSelected ? '#FAF0F3' : '#ffffff',
                    borderLeft: isSelected ? '3px solid var(--primary)' : '3px solid transparent',
                    borderBottom: isMobile ? '1px solid var(--border-subtle)' : 'none',
                    minHeight: isMobile ? '56px' : 'auto'
                  }}
                  onMouseEnter={() => !isMobile && setSelectedResultIndex(idx)}
                  onMouseLeave={() => {
                    if (!isMobile && !isSelected) setSelectedResultIndex(-1);
                  }}
                >
                  {/* Left: Module Icon & Text details */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '12px' : '10px', minWidth: 0, flex: 1 }}>
                    <div style={{
                      width: isMobile ? '36px' : '32px',
                      height: isMobile ? '36px' : '32px',
                      borderRadius: '6px',
                      background: res.badgeBg || '#F5E8ED',
                      color: res.badgeColor || '#7A1F3D',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <IconComponent size={isMobile ? 18 : 16} />
                    </div>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span className="mono" style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: isMobile ? '13px' : '12px' }}>
                          {res.docNumber || res.id}
                        </span>
                        <span style={{
                          fontSize: '9.5px',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '4px',
                          background: res.badgeBg || 'var(--status-neutral-bg)',
                          color: res.badgeColor || 'var(--text-muted)'
                        }}>
                          {res.docType}
                        </span>
                        {res.status && (
                          <span style={{
                            fontSize: '9.5px',
                            padding: '1px 5px',
                            borderRadius: '3px',
                            background: 'var(--border-subtle)',
                            color: 'var(--text-secondary)'
                          }}>
                            {res.status}
                          </span>
                        )}
                      </div>

                      <div style={{
                        fontSize: isMobile ? '12px' : '11px',
                        color: 'var(--text-muted)',
                        marginTop: '2px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {res.subtitle || res.title}
                      </div>
                    </div>
                  </div>

                  {/* Right: Key metrics & Jump Action */}
                  <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div>
                      {res.metaPrimary && (
                        <div className="mono" style={{ fontWeight: 700, color: res.badgeColor || 'var(--text-main)', fontSize: isMobile ? '12px' : '11.5px' }}>
                          {res.metaPrimary}
                        </div>
                      )}
                      {res.metaSecondary && (
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          {res.metaSecondary}
                        </div>
                      )}
                    </div>
                    <div style={{
                      width: isMobile ? '26px' : '22px',
                      height: isMobile ? '26px' : '22px',
                      borderRadius: '50%',
                      background: isSelected ? 'var(--primary)' : 'var(--bg-surface-subtle)',
                      color: isSelected ? '#ffffff' : 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.12s'
                    }}>
                      <ArrowRight size={isMobile ? 14 : 12} />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Keyboard shortcuts footer (desktop only) */}
        {!isMobile && (
          <div style={{
            padding: '6px 12px',
            background: 'var(--bg-surface-subtle)',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '10px',
            color: 'var(--text-muted)',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <span><kbd style={{ padding: '1px 4px', background: '#fff', border: '1px solid var(--border-color)', borderRadius: '3px' }}>↑</kbd> <kbd style={{ padding: '1px 4px', background: '#fff', border: '1px solid var(--border-color)', borderRadius: '3px' }}>↓</kbd> Navigate</span>
              <span><kbd style={{ padding: '1px 4px', background: '#fff', border: '1px solid var(--border-color)', borderRadius: '3px' }}>↵</kbd> Select</span>
              <span><kbd style={{ padding: '1px 4px', background: '#fff', border: '1px solid var(--border-color)', borderRadius: '3px' }}>Esc</kbd> Close</span>
            </div>
            <span style={{ fontWeight: 600, color: 'var(--primary)' }}>Universal GPS ERP Search</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <header className="app-header">
      {/* Mobile Search Active Mode: Full Header takeover */}
      {isMobileSearchOpen ? (
        <div className="mobile-search-bar-active" ref={mobileSearchContainerRef}>
          <button 
            type="button" 
            className="mobile-search-back-btn" 
            onClick={() => {
              setIsMobileSearchOpen(false);
              setIsSearchFocused(false);
              if (onSearch) onSearch('');
            }}
            aria-label="Back to main header"
          >
            <ArrowLeft size={18} />
          </button>
          
          <div className="mobile-search-input-box">
            <Search size={15} className="mobile-search-field-icon" />
            <input
              ref={mobileSearchInputRef}
              type="text"
              className="mobile-search-field"
              placeholder="Search ERP (WOs, Quotes, POs, Items...)"
              value={searchQuery || ''}
              onChange={(e) => {
                if (onSearch) onSearch(e.target.value);
                setSelectedResultIndex(-1);
              }}
              onFocus={() => setIsSearchFocused(true)}
              onKeyDown={handleSearchKeyDown}
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                className="mobile-search-clear-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onSearch) onSearch('');
                  setSelectedResultIndex(-1);
                  setActiveSearchCategory('all');
                  if (mobileSearchInputRef.current) mobileSearchInputRef.current.focus();
                }}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
          
          {renderSearchDropdown(true)}
        </div>
      ) : (
        <>
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
            {/* Desktop Universal Search (Hidden on mobile via CSS) */}
            <div className="global-search desktop-only-search" ref={searchContainerRef} style={{ position: 'relative' }}>
              <Search size={15} className="global-search-icon" />
              <input 
                ref={searchInputRef}
                type="text" 
                placeholder="Search full ERP (WOs, Quotes, Invoices, Spindles, POs, Spares...)"
                value={searchQuery || ''}
                onChange={(e) => {
                  if (onSearch) onSearch(e.target.value);
                  setSelectedResultIndex(-1);
                }}
                onFocus={() => setIsSearchFocused(true)}
                onKeyDown={handleSearchKeyDown}
                style={{ 
                  width: isSearchFocused ? 'clamp(260px, 32vw, 360px)' : '240px',
                  paddingRight: searchQuery ? '28px' : '36px'
                }}
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onSearch) onSearch('');
                    setSelectedResultIndex(-1);
                    setActiveSearchCategory('all');
                    if (searchInputRef.current) searchInputRef.current.focus();
                  }}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title="Clear search"
                >
                  <X size={13} />
                </button>
              ) : (
                <span className="search-shortcut">⌘K</span>
              )}

              {renderSearchDropdown(false)}
            </div>

            {/* Mobile Search Trigger Button (Shown only on <= 768px via CSS) */}
            <button
              type="button"
              className="header-icon-btn mobile-search-trigger-btn"
              onClick={() => {
                setIsMobileSearchOpen(true);
                setIsSearchFocused(true);
                setTimeout(() => {
                  if (mobileSearchInputRef.current) mobileSearchInputRef.current.focus();
                }, 50);
              }}
              aria-label="Search ERP"
              title="Search ERP records"
            >
              <Search size={17} />
            </button>

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
              <Plus size={15} />
              <span className="header-quick-text">New Entry</span>
            </button>

            {/* Notification Bell */}
            <div style={{ position: 'relative' }} ref={notificationsRef}>
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
                  className="header-notifications-dropdown"
                  style={{
                    position: 'absolute',
                    top: '44px',
                    right: '0',
                    width: 'min(320px, calc(100vw - 20px))',
                    maxWidth: 'calc(100vw - 16px)',
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
                    <div style={{ fontWeight: 600, color: notif.priority === 'Critical' || notif.priority === 'Urgent' ? '#b91c1c' : 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      {notif.priority === 'Critical' || notif.priority === 'Urgent' ? (
                        <AlertTriangle size={13} color="#b91c1c" />
                      ) : (
                        <Info size={13} color="var(--primary)" />
                      )}
                      <span>{notif.title}</span>
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
              className="header-user-dropdown"
              style={{
                position: 'absolute',
                top: '48px',
                right: '0',
                width: 'min(270px, calc(100vw - 20px))',
                maxWidth: 'calc(100vw - 16px)',
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
    </>
  )}

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
