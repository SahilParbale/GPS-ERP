import { supabase, isConfigured } from '../supabase/supabaseClient';

/**
 * Supabase Realtime Service
 * Manages WebSocket event subscriptions for shop-floor activity, work order progress, and notifications.
 */
export const realtimeService = {
  /**
   * Subscribe to postgres_changes on a specific database table
   * @param {string} channelName
   * @param {string} table
   * @param {'*'|'INSERT'|'UPDATE'|'DELETE'} event
   * @param {function} callback
   * @returns {object} channel instance
   */
  subscribeToTable(channelName, table, event = '*', callback) {
    if (!isConfigured) {
      return { unsubscribe: () => {} };
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event, schema: 'public', table },
        (payload) => {
          if (typeof callback === 'function') {
            callback(payload);
          }
        }
      )
      .subscribe();

    return channel;
  },

  /**
   * Unsubscribe from a realtime channel
   * @param {object} channel
   */
  async unsubscribeChannel(channel) {
    if (!isConfigured || !channel) return;
    try {
      await supabase.removeChannel(channel);
    } catch (e) {
      console.warn('[GPS-ERP] Error removing realtime channel:', e);
    }
  },
};

export default realtimeService;
