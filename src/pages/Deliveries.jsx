import { useState } from 'react';
import { Filter } from 'lucide-react';
import DataTable from '../components/ui/DataTable';
import Badge from '../components/ui/Badge';
import { Select } from '../components/ui/Input';
import { useSupabase } from '../hooks/useSupabase';
import { useRealtime } from '../hooks/useRealtime';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDateTime } from '../utils/formatDate';
import { DELIVERY_STATUSES, VEHICLE_CATEGORIES, PAYMENT_METHODS } from '../utils/constants';

export default function Deliveries() {
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const filters = [];
  if (statusFilter) filters.push({ column: 'status', operator: 'eq', value: statusFilter });
  if (categoryFilter) filters.push({ column: 'vehicle_category', operator: 'eq', value: categoryFilter });

  const { data, loading, refetch } = useSupabase('deliveries', {
    select: '*, users!deliveries_client_id_fkey(name, phone)',
    filters,
    order: { column: 'created_at', ascending: false },
  });

  useRealtime('deliveries', {
    onInsert: () => refetch(),
    onUpdate: () => refetch(),
  });

  const columns = [
    {
      key: 'status',
      label: 'Status',
      width: '140px',
      render: row => <Badge status={row.status} />,
      sortKey: row => row.status,
    },
    {
      key: 'client',
      label: 'Cliente',
      render: row => (
        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
          {row.users?.name || '—'}
        </span>
      ),
      sortKey: row => row.users?.name,
    },
    {
      key: 'pickup_address',
      label: 'Origem',
      render: row => (
        <span style={{ maxWidth: 200, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {row.pickup_address}
        </span>
      ),
    },
    {
      key: 'delivery_address',
      label: 'Destino',
      render: row => (
        <span style={{ maxWidth: 200, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {row.delivery_address}
        </span>
      ),
    },
    {
      key: 'vehicle_category',
      label: 'Veículo',
      render: row => (
        <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
          {VEHICLE_CATEGORIES[row.vehicle_category] || row.vehicle_category}
        </span>
      ),
    },
    {
      key: 'value',
      label: 'Valor',
      className: 'text-numeric',
      render: row => formatCurrency(row.value),
      sortKey: row => row.value,
    },
    {
      key: 'commission',
      label: 'Comissão',
      render: row => (
        <span style={{ color: 'var(--warning)', fontWeight: 600, fontSize: 13 }}>
          {formatCurrency(row.commission)}
        </span>
      ),
      sortKey: row => row.commission,
    },
    {
      key: 'payment_method',
      label: 'Pagamento',
      render: row => PAYMENT_METHODS[row.payment_method] || row.payment_method,
    },
    {
      key: 'created_at',
      label: 'Data',
      render: row => formatDateTime(row.created_at),
      sortKey: row => row.created_at,
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Entregas</h1>
          <p className="page-subtitle">Gerenciar todas as entregas da plataforma</p>
        </div>
      </div>

      <div className="filters-row">
        <Filter size={16} style={{ color: 'var(--text-tertiary)' }} />
        <Select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          placeholder="Todos os status"
          options={Object.entries(DELIVERY_STATUSES).map(([k, v]) => ({
            value: k,
            label: v.label,
          }))}
          style={{ width: 180 }}
        />
        <Select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          placeholder="Todas as categorias"
          options={Object.entries(VEHICLE_CATEGORIES).map(([k, v]) => ({
            value: k,
            label: v,
          }))}
          style={{ width: 200 }}
        />
      </div>

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        searchKeys={['pickup_address', 'delivery_address', 'users.name']}
        searchPlaceholder="Buscar por endereço ou cliente..."
        emptyMessage="Nenhuma entrega encontrada"
      />
    </div>
  );
}
