import DataTable from '../components/ui/DataTable';
import Badge from '../components/ui/Badge';
import { useSupabase } from '../hooks/useSupabase';
import { formatDate } from '../utils/formatDate';

export default function UsersPage() {
  const { data, loading } = useSupabase('users', {
    select: '*',
    filters: [{ column: 'role', operator: 'eq', value: 'client' }],
    order: { column: 'created_at', ascending: false },
  });

  const columns = [
    {
      key: 'name',
      label: 'Nome',
      className: 'text-primary',
      sortKey: row => row.name,
    },
    {
      key: 'email',
      label: 'Email',
      render: row => row.email || '—',
    },
    {
      key: 'phone',
      label: 'Telefone',
      className: 'text-mono',
    },
    {
      key: 'client_type',
      label: 'Tipo',
      render: row => {
        const type = row.client_type?.toUpperCase() || '—';
        return (
          <Badge
            label={type}
            color={row.client_type === 'cnpj' ? 'var(--info)' : 'var(--text-secondary)'}
            bg={row.client_type === 'cnpj' ? 'rgba(59,158,255,0.1)' : 'rgba(170,170,170,0.1)'}
            border={row.client_type === 'cnpj' ? 'rgba(59,158,255,0.2)' : 'rgba(170,170,170,0.2)'}
          />
        );
      },
    },
    {
      key: 'document',
      label: 'Documento',
      className: 'text-mono',
      render: row => row.document || '—',
    },
    {
      key: 'status',
      label: 'Status',
      render: row => (
        <Badge
          label={row.status === 'active' ? 'Ativo' : 'Inativo'}
          color={row.status === 'active' ? 'var(--success)' : 'var(--error)'}
          bg={row.status === 'active' ? 'rgba(153,235,9,0.1)' : 'rgba(255,59,59,0.1)'}
          border={row.status === 'active' ? 'rgba(153,235,9,0.2)' : 'rgba(255,59,59,0.2)'}
        />
      ),
    },
    {
      key: 'created_at',
      label: 'Cadastro',
      render: row => formatDate(row.created_at),
      sortKey: row => row.created_at,
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Clientes</h1>
          <p className="page-subtitle">Todos os clientes cadastrados na plataforma</p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        searchKeys={['name', 'email', 'phone', 'document']}
        searchPlaceholder="Buscar por nome, email ou documento..."
        emptyMessage="Nenhum cliente encontrado"
      />
    </div>
  );
}
