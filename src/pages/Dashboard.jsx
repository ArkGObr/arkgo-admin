import {
  Package,
  DollarSign,
  Percent,
  Users,
  Bike,
  Wifi,
  TrendingUp,
  BarChart3,
  Clock,
  CheckCircle,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import StatCard from '../components/charts/StatCard';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { PageSpinner } from '../components/ui/Spinner';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { useSupabase } from '../hooks/useSupabase';
import { useRealtime } from '../hooks/useRealtime';
import { formatCurrency } from '../utils/formatCurrency';
import { formatRelative } from '../utils/formatDate';
import { VEHICLE_CATEGORIES, PAYMENT_METHODS } from '../utils/constants';
import './Dashboard.css';

const CHART_COLORS = ['#99EB09', '#3B9EFF', '#FFB800', '#FF3B3B', '#88D208', '#A855F7'];

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--surface-border)',
        borderRadius: 'var(--radius-sm)',
        padding: '8px 12px',
        fontSize: 12,
      }}
    >
      <p style={{ color: 'var(--text-tertiary)', marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, fontWeight: 600 }}>
          {p.name}: {typeof p.value === 'number' && p.name.includes('R$')
            ? formatCurrency(p.value)
            : p.value}
        </p>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { stats, loading, refetch } = useDashboardStats();

  // Recent deliveries
  const { data: recentDeliveries, refetch: refetchRecent } = useSupabase('deliveries', {
    select: '*, users!deliveries_client_id_fkey(name)',
    order: { column: 'created_at', ascending: false },
    limit: 5,
  });

  // Deliveries by status for pie chart
  const { data: allDeliveries } = useSupabase('deliveries', {
    select: 'status, vehicle_category, payment_method, created_at, value',
  });

  // Realtime updates
  useRealtime('deliveries', {
    onInsert: () => { refetch(); refetchRecent(); },
    onUpdate: () => { refetch(); refetchRecent(); },
  });

  useRealtime('motoboys', {
    onUpdate: () => refetch(),
  });

  if (loading) return <PageSpinner />;

  // Build chart data
  const statusCounts = {};
  const paymentCounts = {};
  const dailyData = {};

  (allDeliveries || []).forEach(d => {
    // Status distribution
    statusCounts[d.status] = (statusCounts[d.status] || 0) + 1;

    // Payment distribution
    paymentCounts[d.payment_method] = (paymentCounts[d.payment_method] || 0) + 1;

    // Daily trend (last 14 days)
    const date = new Date(d.created_at);
    const key = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    if (!dailyData[key]) dailyData[key] = { date: key, entregas: 0, receita: 0 };
    dailyData[key].entregas++;
    if (d.status === 'completed') dailyData[key].receita += d.value || 0;
  });

  const dailyChartData = Object.values(dailyData).slice(-14);

  const paymentChartData = Object.entries(paymentCounts).map(([key, value]) => ({
    name: PAYMENT_METHODS[key] || key,
    value,
  }));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Visão geral da operação em tempo real</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="stats-grid">
        <StatCard
          label="Entregas Hoje"
          value={stats.deliveriesToday}
          icon={Package}
          color="var(--primary)"
          sub="novas entregas"
          delay={0}
        />
        <StatCard
          label="Entregas Ativas"
          value={stats.activeDeliveries}
          icon={Clock}
          color="var(--info)"
          sub="em andamento"
          delay={50}
        />
        <StatCard
          label="Faturamento Total"
          value={formatCurrency(stats.totalRevenue)}
          icon={DollarSign}
          color="var(--primary)"
          delay={100}
        />
        <StatCard
          label="Comissão Arrecadada"
          value={formatCurrency(stats.totalCommission)}
          icon={Percent}
          color="var(--warning)"
          delay={150}
        />
        <StatCard
          label="Clientes"
          value={stats.totalClients}
          icon={Users}
          color="var(--text-secondary)"
          delay={200}
        />
        <StatCard
          label="Motoboys Online"
          value={stats.onlineMotoboys}
          icon={Wifi}
          color="var(--success)"
          sub={`de ${stats.totalMotoboys} cadastrados`}
          delay={250}
        />
        <StatCard
          label="Ticket Médio"
          value={formatCurrency(stats.avgTicket)}
          icon={TrendingUp}
          color="var(--info)"
          delay={300}
        />
        <StatCard
          label="Cancelamentos"
          value={`${stats.cancellationRate.toFixed(1)}%`}
          icon={BarChart3}
          color="var(--error)"
          sub={`${stats.cancelledDeliveries} no total`}
          delay={350}
        />
      </div>

      {/* Charts */}
      <div className="dashboard-charts">
        <div className="chart-card animate-slide-up stagger-4">
          <div className="chart-card-header">
            <div>
              <p className="chart-card-title">Entregas por Dia</p>
              <p className="chart-card-subtitle">Últimos 14 dias</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={dailyChartData}>
              <defs>
                <linearGradient id="colorEntregas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#99EB09" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#99EB09" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-border)" />
              <XAxis dataKey="date" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="entregas"
                name="Entregas"
                stroke="#99EB09"
                fillOpacity={1}
                fill="url(#colorEntregas)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card animate-slide-up stagger-5">
          <div className="chart-card-header">
            <div>
              <p className="chart-card-title">Pagamentos</p>
              <p className="chart-card-subtitle">Distribuição por método</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={paymentChartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={4}
                dataKey="value"
                stroke="none"
              >
                {paymentChartData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 8 }}>
            {paymentChartData.map((item, i) => (
              <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: CHART_COLORS[i % CHART_COLORS.length] }} />
                <span style={{ color: 'var(--text-secondary)' }}>{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Deliveries */}
      <Card className="animate-slide-up stagger-6">
        <div className="recent-table-header">
          <h3 className="recent-table-title">Entregas Recentes</h3>
        </div>
        <table className="data-table" style={{ fontSize: 13 }}>
          <thead>
            <tr>
              <th>Status</th>
              <th>Cliente</th>
              <th>Origem</th>
              <th>Destino</th>
              <th>Valor</th>
              <th>Quando</th>
            </tr>
          </thead>
          <tbody>
            {(recentDeliveries || []).map(d => (
              <tr key={d.id}>
                <td><Badge status={d.status} /></td>
                <td className="text-primary">{d.users?.name || '—'}</td>
                <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {d.pickup_address}
                </td>
                <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {d.delivery_address}
                </td>
                <td className="text-numeric">{formatCurrency(d.value)}</td>
                <td>{formatRelative(d.created_at)}</td>
              </tr>
            ))}
            {(!recentDeliveries || recentDeliveries.length === 0) && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--text-tertiary)' }}>
                  Nenhuma entrega encontrada
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
