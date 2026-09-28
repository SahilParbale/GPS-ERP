import React, { useState, useEffect } from 'react';
import PageHeader from '../components/common/PageHeader';
import CustomSelect from '../components/common/CustomSelect';
import { NotificationsScreenSkeleton } from '../components/common/Skeleton';
import { 
  Bell, Check, CheckCheck, Trash2, Filter, AlertTriangle, 
  CheckCircle2, Info, AlertOctagon, RefreshCw, ExternalLink,
  Layers, ShieldAlert, Clock
} from 'lucide-react';
import { notificationService } from '../services/database/notificationService';
import { useAuth } from '../context/AuthContext';

export default function NotificationsScreen({ onNavigate, onNotify }) {
  const { employee } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterPriority, setFilterPriority] = useState('ALL');
  const [filterModule, setFilterModule] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL'); // 'ALL' | 'UNREAD'

  // Load notifications from live Supabase
  const loadNotifications = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await notificationService.getNotifications();
      if (res.error) {
        setError(res.error.message || 'Failed to load notifications from database');
        setNotifications([]);
      } else {
        setNotifications(res.data || []);
      }
    } catch (err) {
      setError(err.message || 'Error connecting to notifications service');
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();

    // Subscribe to live Realtime alerts
    const sub = notificationService.subscribe((payload) => {
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        loadNotifications();
      }
    });

    return () => {
      sub.unsubscribe();
    };
  }, []);

  // Mark single notification as read
  const handleMarkAsRead = async (id) => {
    try {
      const res = await notificationService.markAsRead(id);
      if (!res.error) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n));
        if (onNotify) onNotify('Notification marked as read');
      }
    } catch (err) {
      if (onNotify) onNotify('Failed to update notification', 'error');
    }
  };

  // Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    try {
      const res = await notificationService.markAllAsRead();
      if (!res.error) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() })));
        if (onNotify) onNotify('All notifications marked as read');
      }
    } catch (err) {
      if (onNotify) onNotify('Failed to mark all as read', 'error');
    }
  };

  // Delete notification
  const handleDelete = async (id) => {
    try {
      const res = await notificationService.deleteNotification(id);
      if (!res.error) {
        setNotifications(prev => prev.filter(n => n.id !== id));
        if (onNotify) onNotify('Notification dismissed');
      }
    } catch (err) {
      if (onNotify) onNotify('Failed to dismiss notification', 'error');
    }
  };

  // Navigate to related record
  const handleNavigateToRecord = (notif) => {
    if (notif.related_module && onNavigate) {
      const screenMap = {
        'Manufacturing': 'production',
        'Commercial': 'sales',
        'Procurement': 'purchase-orders',
        'Inventory': 'inventory',
        'Quality': 'quality',
        'Service': 'service',
        'Workforce': 'workforce'
      };
      const targetScreen = screenMap[notif.related_module] || 'dashboard';
      onNavigate(targetScreen);
    }
  };

  // Get badge icon & color for priority
  const getPriorityBadge = (priority) => {
    switch ((priority || '').toUpperCase()) {
      case 'CRITICAL':
        return {
          icon: AlertOctagon,
          bg: '#fee2e2',
          color: '#991b1b',
          label: 'Critical'
        };
      case 'URGENT':
        return {
          icon: AlertTriangle,
          bg: '#ffedd5',
          color: '#c2410c',
          label: 'Urgent'
        };
      case 'NORMAL':
        return {
          icon: Info,
          bg: '#eff6ff',
          color: '#1d4ed8',
          label: 'Normal'
        };
      case 'LOW':
      default:
        return {
          icon: CheckCircle2,
          bg: '#f1f5f9',
          color: '#475569',
          label: 'Low'
        };
    }
  };

  // Filter list
  const filteredNotifications = notifications.filter(notif => {
    const matchesPriority = filterPriority === 'ALL' || (notif.priority || '').toUpperCase() === filterPriority.toUpperCase();
    const matchesModule = filterModule === 'ALL' || notif.related_module === filterModule;
    const matchesStatus = filterStatus === 'ALL' || (filterStatus === 'UNREAD' && !notif.is_read);
    return matchesPriority && matchesModule && matchesStatus;
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const criticalCount = notifications.filter(n => n.priority === 'Critical' || n.priority === 'Urgent').length;

  if (isLoading) {
    return <NotificationsScreenSkeleton />;
  }

  return (
    <div className="content-area">
      <PageHeader 
        title="Plant Notifications & Realtime Alerts" 
        subtitle="Live shop floor warnings, inventory reorder prompts, QC milestones, and task assignments"
        badge={`${unreadCount} Unread Alerts`}
      >
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={loadNotifications}
            disabled={isLoading}
          >
            <RefreshCw size={14} className={isLoading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>

          {unreadCount > 0 && (
            <button 
              type="button" 
              className="btn btn-primary"
              onClick={handleMarkAllAsRead}
            >
              <CheckCheck size={14} />
              <span>Mark All Read</span>
            </button>
          )}
        </div>
      </PageHeader>

      {/* Metrics Summary Strip */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-label">Unread Notifications</span>
            <div className="metric-icon-wrap"><Bell size={16} /></div>
          </div>
          <div className="metric-value">{unreadCount} Alerts</div>
          <div className="metric-footer" style={{ color: unreadCount > 0 ? '#b91c1c' : '#059669' }}>
            {unreadCount > 0 ? 'Requires attention' : 'All clear'}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-label">High Priority / Urgent</span>
            <div className="metric-icon-wrap" style={{ color: '#c2410c' }}><ShieldAlert size={16} /></div>
          </div>
          <div className="metric-value" style={{ color: criticalCount > 0 ? '#c2410c' : 'inherit' }}>
            {criticalCount} Critical
          </div>
          <div className="metric-footer">Shop floor safety & delays</div>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-label">Total Archival Logs</span>
            <div className="metric-icon-wrap"><Layers size={16} /></div>
          </div>
          <div className="metric-value">{notifications.length} Total</div>
          <div className="metric-footer">Realtime Supabase Channel</div>
        </div>
      </div>

      {/* Filter and Notification List */}
      <div className="section-card">
        <div className="filter-bar" style={{ padding: '12px 20px' }}>
          <div className="filter-group" style={{ gap: '12px', flexWrap: 'wrap' }}>
            <CustomSelect 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ minWidth: '160px' }}
              options={[
                { value: 'ALL', label: `All Alerts (${notifications.length})` },
                { value: 'UNREAD', label: `Unread Only (${unreadCount})` }
              ]}
            />

            <CustomSelect 
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              style={{ minWidth: '160px' }}
              options={[
                { value: 'ALL', label: 'All Priorities' },
                { value: 'CRITICAL', label: 'Critical' },
                { value: 'URGENT', label: 'Urgent' },
                { value: 'NORMAL', label: 'Normal' },
                { value: 'LOW', label: 'Low' }
              ]}
            />

            <CustomSelect 
              value={filterModule}
              onChange={(e) => setFilterModule(e.target.value)}
              style={{ minWidth: '180px' }}
              options={[
                { value: 'ALL', label: 'All Modules' },
                { value: 'Manufacturing', label: 'Manufacturing' },
                { value: 'Commercial', label: 'Commercial' },
                { value: 'Procurement', label: 'Procurement' },
                { value: 'Inventory', label: 'Inventory' },
                { value: 'Quality', label: 'Quality' },
                { value: 'Service', label: 'Service' },
                { value: 'Workforce', label: 'Workforce' }
              ]}
            />
          </div>

          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Showing <strong>{filteredNotifications.length}</strong> alerts
          </div>
        </div>

        {/* Error Banner with Retry */}
        {error && (
          <div style={{ margin: '16px 20px', padding: '12px 16px', borderRadius: 'var(--radius-md)', background: '#fef2f2', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#991b1b', fontSize: '13px' }}>
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
            <button 
              type="button" 
              className="btn btn-secondary btn-sm"
              onClick={loadNotifications}
            >
              <RefreshCw size={12} />
              <span>Retry</span>
            </button>
          </div>
        )}



        {/* Notification Cards List */}
        {!isLoading && !error && (
          <div style={{ padding: '8px 20px 20px' }}>
            {filteredNotifications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                <CheckCheck size={36} style={{ marginBottom: '12px', opacity: 0.4, color: '#059669' }} />
                <div style={{ fontWeight: 600, fontSize: '14px' }}>No alerts matching selected filters</div>
                <div style={{ fontSize: '12px', marginTop: '4px' }}>You are completely caught up with plant operations.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {filteredNotifications.map((notif) => {
                  const badge = getPriorityBadge(notif.priority);
                  const Icon = badge.icon;
                  return (
                    <div 
                      key={notif.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        padding: '14px 16px',
                        borderRadius: 'var(--radius-md)',
                        border: notif.is_read ? '1px solid var(--border-color)' : '1px solid #7A1F3D',
                        background: notif.is_read ? 'var(--bg-surface)' : '#fdf2f4',
                        transition: 'background 0.2s',
                        gap: '16px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flex: 1 }}>
                        <div 
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            background: badge.bg,
                            color: badge.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            marginTop: '2px'
                          }}
                        >
                          <Icon size={18} />
                        </div>

                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                            <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-main)' }}>
                              {notif.title}
                            </span>
                            <span 
                              style={{ 
                                fontSize: '10px', 
                                fontWeight: 700, 
                                padding: '1px 6px', 
                                borderRadius: '4px', 
                                background: badge.bg, 
                                color: badge.color 
                              }}
                            >
                              {badge.label}
                            </span>
                            {notif.related_module && (
                              <span style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '4px', background: '#f1f5f9', color: '#475569' }}>
                                {notif.related_module}
                              </span>
                            )}
                            {!notif.is_read && (
                              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#7A1F3D' }} />
                            )}
                          </div>

                          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                            {notif.message}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Clock size={12} />
                              {notif.created_at ? new Date(notif.created_at).toLocaleString('en-GB') : 'Just now'}
                            </span>
                            {notif.related_record_id && (
                              <span className="mono">ID: {notif.related_record_id}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {notif.related_module && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleNavigateToRecord(notif)}
                            title={`Open ${notif.related_module}`}
                            style={{ padding: '4px 8px' }}
                          >
                            <ExternalLink size={13} />
                          </button>
                        )}

                        {!notif.is_read && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleMarkAsRead(notif.id)}
                            title="Mark as Read"
                            style={{ padding: '4px 8px' }}
                          >
                            <Check size={13} />
                          </button>
                        )}

                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleDelete(notif.id)}
                          title="Dismiss Notification"
                          style={{ padding: '4px 8px', color: '#94a3b8' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
