import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { isDriverOnline } from '../utils/constants';

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
    totalMotoboy: 0,
    onlineMotoboy: 0,
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
        rechargesRes,
      ] = await Promise.all([
        supabase.from('deliveries').select('id, status, value, commission', { count: 'exact' }),
        supabase.from('deliveries').select('id', { count: 'exact' }).gte('created_at', todayISO),
        supabase.from('deliveries').select('value, commission').eq('status', 'completed'),
        supabase.from('users').select('id', { count: 'exact' }).eq('role', 'client'),
        supabase.from('motoboys').select('*', { count: 'exact' }),
        supabase.from('recharges').select('*'),
      ]);

      const allDeliveries = deliveriesRes.data || [];
      const completed = completedRes.data || [];
      const motoboys = motoboysRes.data || [];
      const rechargesData = rechargesRes.data || [];

      const totalRevenue = completed.reduce((sum, d) => sum + (d.value || 0), 0);
      const totalCommission = completed.reduce((sum, d) => sum + (d.commission || 0), 0);
      const confirmedRecharges = rechargesData.filter(r => (r.gateway_status ?? r.status) === 'confirmed');
      const totalRecharges = confirmedRecharges.reduce((sum, r) => sum + (r.amount || 0), 0);
      const pendingRecharges = rechargesData.filter(r => (r.gateway_status ?? r.status) === 'pending').length;

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
        totalMotoboy: motoboysRes.count || motoboys.length,
        onlineMotoboy: motoboys.filter(isDriverOnline).length,
        totalRecharges,
        pendingRecharges,
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
    queueMicrotask(fetchStats);

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
