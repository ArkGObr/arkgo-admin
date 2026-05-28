import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Subscribe to Supabase Realtime changes on a table.
 * @param {string} table - Table name to listen on
 * @param {function} onInsert - Callback for INSERT events
 * @param {function} onUpdate - Callback for UPDATE events
 * @param {function} onDelete - Callback for DELETE events
 * @param {string} filter - Optional filter expression (e.g. 'status=eq.pending')
 */
export function useRealtime(table, { onInsert, onUpdate, onDelete, filter } = {}) {
  const channelRef = useRef(null);

  useEffect(() => {
    const channelName = `admin-${table}-${Date.now()}`;
    
    const channelConfig = {
      event: '*',
      schema: 'public',
      table,
    };

    if (filter) {
      channelConfig.filter = filter;
    }

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', channelConfig, (payload) => {
        switch (payload.eventType) {
          case 'INSERT':
            onInsert?.(payload.new);
            break;
          case 'UPDATE':
            onUpdate?.(payload.new, payload.old);
            break;
          case 'DELETE':
            onDelete?.(payload.old);
            break;
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [table, filter, onInsert, onUpdate, onDelete]);
}
