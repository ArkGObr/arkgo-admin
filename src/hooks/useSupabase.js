import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Generic hook for Supabase queries with loading/error state.
 * @param {string} table - Table name
 * @param {object} options - { select, filters, order, limit, single }
 */
export function useSupabase(table, options = {}) {
  const [data, setData] = useState(options.single ? null : []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const {
    select = '*',
    filters = [],
    order = { column: 'created_at', ascending: false },
    limit,
    single = false,
    enabled = true,
  } = options;

  const filtersKey = JSON.stringify(filters);
  const orderKey = JSON.stringify(order);

  const fetchData = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let query = supabase.from(table).select(select);

      // Apply filters
      for (const filter of filters) {
        const { column, operator, value } = filter;
        switch (operator) {
          case 'eq': query = query.eq(column, value); break;
          case 'neq': query = query.neq(column, value); break;
          case 'gt': query = query.gt(column, value); break;
          case 'gte': query = query.gte(column, value); break;
          case 'lt': query = query.lt(column, value); break;
          case 'lte': query = query.lte(column, value); break;
          case 'like': query = query.like(column, value); break;
          case 'ilike': query = query.ilike(column, value); break;
          case 'in': query = query.in(column, value); break;
          case 'is': query = query.is(column, value); break;
          default: query = query.eq(column, value);
        }
      }

      // Apply order
      if (order) {
        query = query.order(order.column, { ascending: order.ascending ?? false });
      }

      // Apply limit
      if (limit) {
        query = query.limit(limit);
      }

      // Single record
      if (single) {
        query = query.single();
      }

      const { data: result, error: queryError } = await query;

      if (queryError) throw queryError;
      setData(result);
    } catch (err) {
      console.error(`Error fetching ${table}:`, err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [table, select, filtersKey, orderKey, limit, single, enabled]);

  useEffect(() => {
    fetchData();

    const handleRefresh = () => {
      fetchData();
    };

    window.addEventListener('app:refresh', handleRefresh);
    return () => {
      window.removeEventListener('app:refresh', handleRefresh);
    };
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
