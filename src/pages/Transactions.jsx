import { useState } from 'react';
import { Filter } from 'lucide-react';
import DataTable from '../components/ui/DataTable';
import { Select } from '../components/ui/Input';
import { useSupabase } from '../hooks/useSupabase';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDateTime } from '../utils/formatDate';
import { TRANSACTION_TYPES } from '../utils/constants';

export default function Transactions() {
  const [typeFilter, setTypeFilter] = useState('');

  const filters = [];
  if (typeFilter) filters.push({ column: 'type', operator: 'eq', value: typeFilter });

  const { data, loading } = useSupabase('transactions', {
    select: '*, motoboys(users(name))',
    filters,
    order: { column: 'created_at', ascending: false },
  });

  // Totals
  const totals = (data || []).reduce(
    (acc, t) => {
      if (t.type === 'recharge') acc.recharges += t.amount;
      if (t.type === 'commission_debit') acc.commissions += Math.abs(t.amount);
      return acc;
    },
    { recharges: 0, commissions: 0 }
  );

  const columns = [
    {
      key: 'created_at',
      label: 'Data',
      render: row => formatDateTime(row.created_at),
      sortKey: row => row.created_at,
    },
    {
      key: 'motoboy',
      label: 'Motoboy',
      className: 'text-primary',
      render: row => row.motoboys?.users?.name || '—',
    },
    {
      key: 'type',
      label: 'Tipo',
      render: row => {
        const config = TRANSACTION_TYPES[row.type] || {};
        return (
          <span style={{ color: config.color, fontWeight: 600, fontSize: 13 }}>
            {config.label || row.type}
          </span>
        );
      },
    },
    {
      key: 'amount',
      label: 'Valor',
      render: row => (
        <span
          style={{
            color: row.type === 'recharge' ? 'var(--success)' : 'var(--error)',
            fontWeight: 700,
            fontFamily: 'var(--font-body)',
          }}
        >
          {row.type === 'recharge' ? '+' : '-'}{formatCurrency(Math.abs(row.amount))}
        </span>
      ),
      sortKey: row => row.amount,
    },
    {
      key: 'balance_after',
      label: 'Saldo Após',
      className: 'text-numeric',
      render: row => formatCurrency(row.balance_after),
    },
    {
      key: 'description',
      label: 'Descrição',
      render: row => row.description || '—',
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Transações</h1>
          <p className="page-subtitle">Histórico financeiro de recargas e comissões</p>
        </div>
        <div className="page-actions" style={{ gap: 16, fontSize: 13 }}>
          <div style={{ textAlign: 'right' }}>
            <span style={{ color: 'var(--text-tertiary)' }}>Recargas: </span>
            <span style={{ color: 'var(--success)', fontWeight: 700 }}>
              {formatCurrency(totals.recharges)}
            </span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ color: 'var(--text-tertiary)' }}>Comissões: </span>
            <span style={{ color: 'var(--error)', fontWeight: 700 }}>
              {formatCurrency(totals.commissions)}
            </span>
          </div>
        </div>
      </div>

      <div className="filters-row">
        <Filter size={16} style={{ color: 'var(--text-tertiary)' }} />
        <Select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          placeholder="Todos os tipos"
          options={Object.entries(TRANSACTION_TYPES).map(([k, v]) => ({
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
        searchKeys={['motoboys.users.name', 'description']}
        searchPlaceholder="Buscar por motoboy ou descrição..."
        emptyMessage="Nenhuma transação encontrada"
      />
    </div>
  );
}
