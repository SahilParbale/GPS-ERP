import { baseService } from './baseService';
import { supabase, isConfigured } from '../supabase/supabaseClient';

/**
 * ERP Notification & Alert Domain Service
 * Manages persistent notifications, header alert bell, shop floor push alerts,
 * and Supabase Realtime event subscriptions.
 */
export const notificationService = {
  /**
   * Fetch notifications with optional filters
   * @param {object} [options]
   */
  async getNotifications(options = {}) {
    return await baseService.select('notifications', {
      select: `
        id,
        recipient_id,
        notification_type,
        title,
        message,
        priority,
        is_read,
        read_at,
        related_module,
        related_record_id,
        reference_url,
        created_at,
        recipient:employees(id, first_name, last_name, employee_code, email)
      `,
      orderBy: options.orderBy || 'created_at',
      ascending: options.ascending ?? false,
      ...options
    });
  },

  /**
   * Fetch unread notification count
   * @param {string} [recipientId]
   */
  async getUnreadCount(recipientId = null) {
    if (!isConfigured) return { count: 0, error: null };

    try {
      let query = supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('is_read', false);

      if (recipientId) {
        query = query.eq('recipient_id', recipientId);
      }

      const { count, error } = await query;
      return { count: count || 0, error };
    } catch (err) {
      return { count: 0, error: err };
    }
  },

  /**
   * Mark a single notification as read
   * @param {string} notificationId
   */
  async markAsRead(notificationId) {
    return await baseService.update('notifications', notificationId, {
      is_read: true,
      read_at: new Date().toISOString()
    });
  },

  /**
   * Mark all notifications as read for current user
   * @param {string} [recipientId]
   */
  async markAllAsRead(recipientId = null) {
    if (!isConfigured) return { error: null };

    try {
      let query = supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('is_read', false);

      if (recipientId) {
        query = query.eq('recipient_id', recipientId);
      }

      const { data, error } = await query;
      return { data, error };
    } catch (err) {
      return { data: null, error: err };
    }
  },

  /**
   * Create a new persistent ERP notification
   * @param {object} data
   */
  async createNotification({
    recipientId = null,
    notificationType = 'System',
    title,
    message,
    priority = 'Normal',
    relatedModule = 'Manufacturing',
    relatedRecordId = null,
    referenceUrl = null
  }) {
    const payload = {
      recipient_id: recipientId,
      notification_type: notificationType,
      title,
      message,
      priority,
      is_read: false,
      related_module: relatedModule,
      related_record_id: relatedRecordId,
      reference_url: referenceUrl,
      created_at: new Date().toISOString()
    };

    return await baseService.insert('notifications', payload);
  },

  /**
   * Delete a notification
   * @param {string} notificationId
   */
  async deleteNotification(notificationId) {
    return await baseService.delete('notifications', notificationId);
  },

  /**
   * Subscribe to live Realtime changes on notifications table
   * @param {function} onNotificationChange
   * @returns {object} Subscription object with unsubscribe method
   */
  subscribe(onNotificationChange) {
    if (!isConfigured || !supabase?.channel) {
      return { unsubscribe: () => {} };
    }

    const channelName = `realtime-notifications-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        (payload) => {
          if (typeof onNotificationChange === 'function') {
            onNotificationChange(payload);
          }
        }
      )
      .subscribe();

    return {
      unsubscribe: () => {
        supabase.removeChannel(channel);
      }
    };
  },

  /**
   * Compute live shop floor alerts from live tables (low inventory, overdue work orders, active service requests)
   */
  async getLiveShopFloorAlerts() {
    if (!isConfigured) return { alerts: [], error: null };

    try {
      const alerts = [];

      // 1. Low stock items (quantity_on_hand <= reorder_level)
      const { data: stockItems } = await supabase
        .from('inventory_items')
        .select('id, item_code, item_name, quantity_on_hand, reorder_level')
        .limit(20);

      if (stockItems) {
        stockItems.forEach(item => {
          if (item.quantity_on_hand !== null && item.reorder_level !== null && item.quantity_on_hand <= item.reorder_level) {
            alerts.push({
              id: `stock-${item.id}`,
              type: 'Low Stock Alert',
              severity: 'Urgent',
              module: 'Inventory',
              title: `Low Stock: ${item.item_code}`,
              message: `${item.item_name} has dropped to ${item.quantity_on_hand} units (Reorder level: ${item.reorder_level}).`,
              time: 'Active Alert'
            });
          }
        });
      }

      // 2. Active or urgent work orders
      const { data: workOrders } = await supabase
        .from('work_orders')
        .select('id, work_order_no, current_stage, progress_percentage, priority, status')
        .in('status', ['IN_PROGRESS', 'PENDING'])
        .eq('priority', 'URGENT')
        .limit(5);

      if (workOrders) {
        workOrders.forEach(wo => {
          alerts.push({
            id: `wo-${wo.id}`,
            type: 'Overdue Work Order',
            severity: 'Urgent',
            module: 'Manufacturing',
            title: `Urgent Work Order: ${wo.work_order_no}`,
            message: `Work Order ${wo.work_order_no} at stage ${wo.current_stage || 'Assembly'} (${wo.progress_percentage || 0}% progress).`,
            time: 'Ongoing'
          });
        });
      }

      // 3. Pending service requests
      const { data: serviceReqs } = await supabase
        .from('service_requests')
        .select('id, sr_number, customer_name, spindle_model, status')
        .eq('status', 'PENDING')
        .limit(5);

      if (serviceReqs) {
        serviceReqs.forEach(sr => {
          alerts.push({
            id: `sr-${sr.id}`,
            type: 'Task Assigned',
            severity: 'Normal',
            module: 'Service',
            title: `Pending Inward: ${sr.sr_number}`,
            message: `Customer ${sr.customer_name} spindle ${sr.spindle_model} awaiting teardown assessment.`,
            time: 'Pending'
          });
        });
      }

      return { alerts, error: null };
    } catch (err) {
      return { alerts: [], error: err };
    }
  }
};

export default notificationService;
