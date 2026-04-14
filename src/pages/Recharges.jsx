import { useState } from 'react';
import { Filter } from 'lucide-react';
import DataTable from '../components/ui/DataTable';
import Badge from '../components/ui/Badge';
import { Select } from '../components/ui/Input';
import { useSupabase } from '../hooks/useSupabase';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDateTime } from '../utils/formatDate';

const RECHARGE_STATUSES = {
  pending: { label: 'Pendente', color: 'var(--warning)', bg: 'rgba(255,184,0,0.1)', border: 'rgba(255,184,0,0.2)' },
  confirmed: { label: 'Confirmada', color: 'var(--success)', bg: 'rgba(153,235,9,0.1)', border: 'rgba(153,235,9,0.2)' },
  failed: { label: 'Falhou', color: 'var(--error)', bg: 'rgba(255,59,59,0.1)', border: 'rgba(255,59,59,0.2)' },
};

export default function Recharges() {
  const [statusFilter, setStatusFilter] = useState('');

  const filters = [];
  if (statusFilter) filters.push({ column: 'gateway_status', operator: 'eq', value: statusFilter });

  const { data, loading } = useSupabase('recharges', {
    select: '*, motoboys!recharges_motoboy_id_fkey(users!motoboys_id_fkey(name))',
    filters,
    order: { column: 'created_at', ascending: false },
  });

  const columns = [
    {
      key: 'gateway_status',
      label: 'Status',
      width: '130px',
      render: row => {
        const s = RECHARGE_STATUSES[row.gateway_status] || {};
        return <Badge label={s.label || row.gateway_status} color={s.color} bg={s.bg} border={s.border} />;
      },
    },
    {
      key: 'motoboy',
      label: 'Motoboy',
      className: 'text-primary',
      render: row => row.motoboys?.users?.name || '—',
    },
    {
      key: 'amount',
      label: 'Valor',
      className: 'text-numeric',
      render: row => formatCurrency(row.amount),
      sortKey: row => row.amount,
    },
    {
      key: 'gateway_id',
      label: 'Gateway ID',
      className: 'text-mono',
      render: row => row.gateway_id || '—',
    },
    {
      key: 'pix_code',
      label: 'PIX Code',
      render: row => row.pix_code ? (
        <span
          className="text-mono"
          style={{
            maxWidth: 200,
            display: 'block',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontSize: 11,
          }}
        >
          {row.pix_code}
        </span>
      ) : '—',
    },
    {
      key: 'created_at',
      label: 'Criada em',
      render: row => formatDateTime(row.created_at),
      sortKey: row => row.created_at,
    },
    {
      key: 'confirmed_at',
      label: 'Confirmada em',
      render: row => formatDateTime(row.confirmed_at),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Recargas</h1>
          <p className="page-subtitle">Recargas PIX via gateway Asaas</p>
        </div>
      </div>

      <div className="filters-row">
        <Filter size={16} style={{ color: 'var(--text-tertiary)' }} />
        <Select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          placeholder="Todos os status"
          options={Object.entries(RECHARGE_STATUSES).map(([k, v]) => ({
            value: k,
            label: v.label,
          }))}
          style={{ width: 180 }}
        />
      </div>

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        searchKeys={['motoboys.users.name', 'gateway_id', 'pix_code']}
        searchPlaceholder="Buscar por motoboy ou gateway ID..."
        emptyMessage="Nenhuma recarga encontrada"
      />
    </div>
  );
}
