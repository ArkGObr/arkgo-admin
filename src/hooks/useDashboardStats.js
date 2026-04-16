import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Hook for fetching aggregated dashboard statistics.
 */
export function useDashboardStats() {
  const [stats, setStats] = useState({
    totalDeliveries: 0,
    deliveriesToday: 0,
    activeDeliveries: 0,
    completedDeliveries: 0,
    cancelledDeliveries: 0,
    totalRevenue: 0,
    totalCommission: 0,
    totalClients: 0,
    totalMotoboys: 0,
    onlineMotoboys: 0,
    totalRecharges: 0,
    pendingRecharges: 0,
    avgTicket: 0,
    cancellationRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      // Parallel queries for performance
      const [
        deliveriesRes,
        deliveriesTodayRes,
        completedRes,
        clientsRes,
        motoboysRes,
        onlineRes,
        rechargesRes,
        pendingRechargesRes,
      ] = await Promise.all([
        supabase.from('deliveries').select('id, status, value, commission', { count: 'exact' }),
        supabase.from('deliveries').select('id', { count: 'exact' }).gte('created_at', todayISO),
        supabase.from('deliveries').select('value, commission').eq('status', 'completed'),
        supabase.from('users').select('id', { count: 'exact' }).eq('role', 'client'),
        supabase.from('users').select('id', { count: 'exact' }).eq('role', 'motoboy'),
        supabase.from('motoboys').select('id', { count: 'exact' }).eq('is_online', true),
        supabase.from('recharges').select('amount').eq('gateway_status', 'confirmed'),
        supabase.from('recharges').select('id', { count: 'exact' }).eq('gateway_status', 'pending'),
      ]);

      const allDeliveries = deliveriesRes.data || [];
      const completed = completedRes.data || [];
      const rechargesData = rechargesRes.data || [];

      const totalRevenue = completed.reduce((sum, d) => sum + (d.value || 0), 0);
      const totalCommission = completed.reduce((sum, d) => sum + (d.commission || 0), 0);
      const totalRecharges = rechargesData.reduce((sum, r) => sum + (r.amount || 0), 0);
      
      const active = allDeliveries.filter(
        d => ['pending', 'accepted', 'in_progress'].includes(d.status)
      ).length;
      const cancelled = allDeliveries.filter(d => d.status === 'cancelled').length;

      setStats({
        totalDeliveries: deliveriesRes.count || allDeliveries.length,
        deliveriesToday: deliveriesTodayRes.count || 0,
        activeDeliveries: active,
        completedDeliveries: completed.length,
        cancelledDeliveries: cancelled,
        totalRevenue,
        totalCommission,
        totalClients: clientsRes.count || 0,
        totalMotoboys: motoboysRes.count || 0,
        onlineMotoboys: onlineRes.count || 0,
        totalRecharges,
        pendingRecharges: pendingRechargesRes.count || 0,
        avgTicket: completed.length > 0 ? totalRevenue / completed.length : 0,
        cancellationRate:
          allDeliveries.length > 0
            ? (cancelled / allDeliveries.length) * 100
            : 0,
      });
    } catch (err) {
      console.error('Dashboard stats error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [todayISO]);

  useEffect(() => {
    fetchStats();

    const handleRefresh = () => {
      fetchStats();
    };

    window.addEventListener('app:refresh', handleRefresh);
    return () => {
      window.removeEventListener('app:refresh', handleRefresh);
    };
  }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
}
