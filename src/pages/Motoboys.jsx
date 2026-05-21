import DataTable from '../components/ui/DataTable';
import Badge from '../components/ui/Badge';
import { useSupabase } from '../hooks/useSupabase';
import { useRealtime } from '../hooks/useRealtime';
import { formatCurrency } from '../utils/formatCurrency';
import { VEHICLE_CATEGORIES } from '../utils/constants';

export default function Motoboy() {
  const { data, loading, refetch } = useSupabase('Motoboy', {
    select: '*, users!Motoboy_id_fkey(name, phone, email, status)',
    order: { column: 'updated_at', ascending: false },
  });

  useRealtime('Motoboy', {
    onUpdate: () => refetch(),
  });

  const columns = [
    {
      key: 'name',
      label: 'Nome',
      className: 'text-primary',
      render: row => row.users?.name || '—',
      sortKey: row => row.users?.name,
    },
    {
      key: 'phone',
      label: 'Telefone',
      className: 'text-mono',
      render: row => row.users?.phone || '—',
    },
    {
      key: 'is_online',
      label: 'Status',
      width: '120px',
      render: row => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: row.is_online ? 'var(--success)' : 'var(--text-tertiary)',
              animation: row.is_online ? 'pulse 2s ease-in-out infinite' : 'none',
            }}
          />
          <span style={{ color: row.is_online ? 'var(--success)' : 'var(--text-tertiary)', fontWeight: 600, fontSize: 12 }}>
            {row.is_online ? 'Online' : 'Offline'}
          </span>
        </div>
      ),
      sortKey: row => (row.is_online ? 1 : 0),
    },
    {
      key: 'vehicle_category',
      label: 'Veículo',
      render: row => (
        <Badge
          label={VEHICLE_CATEGORIES[row.vehicle_category] || row.vehicle_category || '—'}
          color="var(--text-secondary)"
          bg="rgba(170,170,170,0.08)"
          border="rgba(170,170,170,0.15)"
        />
      ),
    },
    {
      key: 'vehicle_plate',
      label: 'Placa',
      className: 'text-mono',
      render: row => row.vehicle_plate || '—',
    },
    {
      key: 'vehicle_model',
      label: 'Modelo',
      render: row => row.vehicle_model || '—',
    },
    {
      key: 'wallet_balance',
      label: 'Saldo',
      className: 'text-numeric',
      render: row => formatCurrency(row.wallet_balance),
      sortKey: row => row.wallet_balance,
    },
    {
      key: 'user_status',
      label: 'Conta',
      render: row => (
        <Badge
          label={row.users?.status === 'active' ? 'Ativo' : 'Inativo'}
          color={row.users?.status === 'active' ? 'var(--success)' : 'var(--error)'}
          bg={row.users?.status === 'active' ? 'rgba(153,235,9,0.1)' : 'rgba(255,59,59,0.1)'}
          border={row.users?.status === 'active' ? 'rgba(153,235,9,0.2)' : 'rgba(255,59,59,0.2)'}
        />
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Motoboy</h1>
          <p className="page-subtitle">Entregadores cadastrados e seus status em tempo real</p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        searchKeys={['users.name', 'users.phone', 'vehicle_plate', 'vehicle_model']}
        searchPlaceholder="Buscar por nome, telefone ou placa..."
        emptyMessage="Nenhum motoboy encontrado"
      />
    </div>
  );
}
