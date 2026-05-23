import { useEffect, useMemo, useState } from 'react';
import { Filter, Mail, Phone, Users } from 'lucide-react';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import DataTable from '../components/ui/DataTable';
import { Select } from '../components/ui/Input';
import { hasLandingSupabaseConfig, landingSupabase } from '../lib/landingSupabase';
import { formatDateTime, formatRelative } from '../utils/formatDate';
import './OperationsPages.css';

const INTEREST_META = {
  fila: { label: 'Fila', color: 'var(--warning)', bg: 'rgba(255,184,0,0.1)', border: 'rgba(255,184,0,0.2)' },
  duvida: { label: 'Duvida', color: 'var(--info)', bg: 'rgba(59,158,255,0.1)', border: 'rgba(59,158,255,0.2)' },
  parceria: { label: 'Parceria', color: 'var(--success)', bg: 'rgba(153,235,9,0.1)', border: 'rgba(153,235,9,0.2)' },
};

function Stat({ children, label, value }) {
  return (
    <Card className="ops-stat">
      <div className="ops-stat-icon">{children}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </Card>
  );
}

export default function LandingLeads() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [interestFilter, setInterestFilter] = useState('');

  useEffect(() => {
    let alive = true;

    async function fetchLeads() {
      if (!hasLandingSupabaseConfig) {
        setError('Credenciais da landing nao encontradas no .env.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      const { data: rows, error: queryError } = await landingSupabase
        .from('arkgo_leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (!alive) return;

      if (queryError) {
        setError(queryError.message);
        setData([]);
      } else {
        setData(rows || []);
      }

      setLoading(false);
    }

    fetchLeads();
    return () => { alive = false; };
  }, []);

  const filteredData = useMemo(() => {
    if (!interestFilter) return data;
    return data.filter(row => row.interest === interestFilter);
  }, [data, interestFilter]);

  const stats = useMemo(() => ({
    total: data.length,
    fila: data.filter(row => row.interest === 'fila').length,
    contatos: data.filter(row => row.phone || row.email).length,
  }), [data]);

  const columns = [
    {
      key: 'name',
      label: 'Nome',
      className: 'text-primary',
      sortKey: row => row.name,
    },
    {
      key: 'contact',
      label: 'Contato',
      render: row => (
        <div className="ops-contact">
          <span><Mail size={13} />{row.email}</span>
          {row.phone && <span><Phone size={13} />{row.phone}</span>}
        </div>
      ),
      sortKey: row => row.email,
    },
    {
      key: 'city',
      label: 'Cidade',
      render: row => row.city || '-',
    },
    {
      key: 'interest',
      label: 'Motivo',
      render: row => {
        const meta = INTEREST_META[row.interest] || INTEREST_META.fila;
        return <Badge label={meta.label} color={meta.color} bg={meta.bg} border={meta.border} />;
      },
      sortKey: row => row.interest,
    },
    {
      key: 'message',
      label: 'Mensagem',
      render: row => (
        <span className="ops-ellipsis">
          {row.message || '-'}
        </span>
      ),
    },
    {
      key: 'created_at',
      label: 'Entrada',
      render: row => (
        <div className="ops-date">
          <span>{formatDateTime(row.created_at)}</span>
          <small>{formatRelative(row.created_at)}</small>
        </div>
      ),
      sortKey: row => row.created_at,
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Fila da Landing</h1>
          <p className="page-subtitle">Leads interessados, duvidas e parcerias vindos da landing page</p>
        </div>
      </div>

      <div className="stats-grid">
        <Stat label="Total de leads" value={stats.total}><Users size={18} /></Stat>
        <Stat label="Na fila" value={stats.fila}><Filter size={18} /></Stat>
        <Stat label="Com contato" value={stats.contatos}><Phone size={18} /></Stat>
      </div>

      <div className="filters-row">
        <Filter size={16} style={{ color: 'var(--text-tertiary)' }} />
        <Select
          value={interestFilter}
          onChange={e => setInterestFilter(e.target.value)}
          placeholder="Todos os motivos"
          options={[
            { value: 'fila', label: 'Fila' },
            { value: 'duvida', label: 'Duvida' },
            { value: 'parceria', label: 'Parceria' },
          ]}
          style={{ width: 190 }}
        />
        {error && <span className="ops-error">{error}</span>}
      </div>

      <DataTable
        columns={columns}
        data={filteredData}
        loading={loading}
        searchKeys={['name', 'email', 'phone', 'city', 'message']}
        searchPlaceholder="Buscar por nome, email, telefone ou cidade..."
        emptyMessage="Nenhum lead encontrado"
      />
    </div>
  );
}
