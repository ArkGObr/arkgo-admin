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

  // Keep latest callbacks in a ref to avoid re-subscribing on inline callback reference changes
  const callbacksRef = useRef({ onInsert, onUpdate, onDelete });

  useEffect(() => {
    callbacksRef.current = { onInsert, onUpdate, onDelete };
  }, [onInsert, onUpdate, onDelete]);

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
        const { onInsert: currentInsert, onUpdate: currentUpdate, onDelete: currentDelete } = callbacksRef.current;
        switch (payload.eventType) {
          case 'INSERT':
            currentInsert?.(payload.new);
            break;
          case 'UPDATE':
            currentUpdate?.(payload.new, payload.old);
            break;
          case 'DELETE':
            currentDelete?.(payload.old);
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
  }, [table, filter]);
}
