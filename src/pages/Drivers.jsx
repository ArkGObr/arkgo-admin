import { useParams } from 'react-router-dom';
import DataTable from '../components/ui/DataTable';
import Badge from '../components/ui/Badge';
import { useSupabase } from '../hooks/useSupabase';
import { useRealtime } from '../hooks/useRealtime';
import { formatCurrency } from '../utils/formatCurrency';
import { getDriverBalance, isDriverOnline } from '../utils/constants';

/**
 * Maps URL :category param to database vehicle_category value and display config.
 */
const CATEGORY_CONFIG = {
  motoboy: {
    label: 'Motoboy',
    subtitle: 'Entregadores de moto cadastrados e seus status em tempo real',
    dbValue: 'motoboy',
  },
  bikeboy: {
    label: 'Bikeboy',
    subtitle: 'Entregadores de bicicleta cadastrados e seus status em tempo real',
    dbValue: 'bike',
  },
  mototaxi: {
    label: 'Mototáxi',
    subtitle: 'Motoristas de mototáxi cadastrados e seus status em tempo real',
    dbValue: 'mototaxi',
  },
  car: {
    label: 'Carros',
    subtitle: 'Motoristas de carro cadastrados e seus status em tempo real',
    dbValue: 'car',
  },
  van: {
    label: 'Utilitários',
    subtitle: 'Motoristas de utilitário cadastrados e seus status em tempo real',
    dbValue: 'van',
  },
  truck: {
    label: 'Caminhões',
    subtitle: 'Motoristas de caminhão cadastrados e seus status em tempo real',
    dbValue: 'truck',
  },
};

export default function Drivers() {
  const { category } = useParams();
  const config = CATEGORY_CONFIG[category] ?? {
    label: 'Entregadores',
    subtitle: 'Lista de entregadores',
    dbValue: category,
  };

  const { data, loading, refetch } = useSupabase('motoboys', {
    select: '*, users(name, phone, email, status)',
    filters: [{ column: 'vehicle_category', operator: 'eq', value: config.dbValue }],
    order: { column: 'updated_at', ascending: false },
  });

  useRealtime('motoboys', {
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
      key: 'online',
      label: 'Status',
      width: '130px',
      render: row => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: isDriverOnline(row) ? 'var(--success)' : 'var(--text-tertiary)',
              animation: isDriverOnline(row) ? 'pulse 2s ease-in-out infinite' : 'none',
            }}
          />
          <span style={{
            color: isDriverOnline(row) ? 'var(--success)' : 'var(--text-tertiary)',
            fontWeight: 600,
            fontSize: 12,
          }}>
            {isDriverOnline(row) ? 'Online' : 'Offline'}
          </span>
        </div>
      ),
      sortKey: row => (isDriverOnline(row) ? 1 : 0),
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
      render: row => formatCurrency(getDriverBalance(row)),
      sortKey: row => getDriverBalance(row),
    },
    {
      key: 'user_status',
      label: 'Conta',
      render: row => (
        <Badge
          label={row.users?.status === 'active' ? 'Ativo' : 'Inativo'}
          color={row.users?.status === 'active' ? 'var(--success)' : 'var(--error)'}
          bg={row.users?.status === 'active' ? 'rgba(102,235,0,0.1)' : 'rgba(255,59,59,0.1)'}
          border={row.users?.status === 'active' ? 'rgba(102,235,0,0.2)' : 'rgba(255,59,59,0.2)'}
        />
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{config.label}</h1>
          <p className="page-subtitle">{config.subtitle}</p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        searchKeys={['users.name', 'users.phone', 'vehicle_plate', 'vehicle_model']}
        searchPlaceholder="Buscar por nome, telefone ou placa..."
        emptyMessage={`Nenhum(a) ${config.label.toLowerCase()} encontrado(a)`}
      />
    </div>
  );
}
