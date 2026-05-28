import { Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DataTable from '../components/ui/DataTable';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { useSupabase } from '../hooks/useSupabase';
import { VEHICLE_CATEGORIES, VEHICLE_CATEGORY_OPTIONS } from '../utils/constants';
import { formatDateTime } from '../utils/formatDate';

function formatRuleWindow(rule) {
  const start = String(rule.start_hour ?? 0).padStart(2, '0');
  const end = String(rule.end_hour ?? 24).padStart(2, '0');
  if (rule.rule_type === 'specific_date') return `${rule.days} das ${start}:00 as ${end}:00`;
  return `Dias ${rule.days || '-'} das ${start}:00 as ${end}:00`;
}

function formatMultiplier(value) {
  if (value === undefined || value === null) return '-';
  return `+${Math.round(Number(value) * 100)}%`;
}

export default function Pricing() {
  const navigate = useNavigate();
  const { data, loading } = useSupabase('pricing_rules', {
    order: { column: 'created_at', ascending: false },
  });

  const columns = [
    {
      key: 'is_active',
      label: 'Status',
      width: '120px',
      render: row => (
        <Badge
          label={row.is_active ? 'Ativa' : 'Inativa'}
          color={row.is_active ? 'var(--success)' : 'var(--error)'}
          bg={row.is_active ? 'rgba(153,235,9,0.1)' : 'rgba(255,59,59,0.1)'}
          border={row.is_active ? 'rgba(153,235,9,0.2)' : 'rgba(255,59,59,0.2)'}
        />
      ),
      sortKey: row => (row.is_active ? 1 : 0),
    },
    {
      key: 'name',
      label: 'Regra',
      className: 'text-primary',
      sortKey: row => row.name,
    },
    {
      key: 'rule_type',
      label: 'Tipo',
      render: row => row.rule_type === 'specific_date' ? 'Data especifica' : 'Recorrente',
    },
    {
      key: 'window',
      label: 'Validade',
      render: row => formatRuleWindow(row),
    },
    ...VEHICLE_CATEGORY_OPTIONS.map(({ value, label }) => ({
      key: `multiplier_${value}`,
      label,
      className: 'text-numeric',
      render: row => formatMultiplier(row.multipliers?.[value]),
      sortKey: row => Number(row.multipliers?.[value] ?? 0),
    })),
    {
      key: 'updated_at',
      label: 'Atualizada',
      render: row => formatDateTime(row.updated_at ?? row.created_at),
      sortKey: row => row.updated_at ?? row.created_at,
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Regras de Precos</h1>
          <p className="page-subtitle">
            Tabela sincronizada com pricing_rules, a fonte remota consumida pelo app
          </p>
        </div>
        <div className="page-actions">
          <Button icon={Settings} onClick={() => navigate('/settings')}>
            Configurar regras
          </Button>
        </div>
      </div>

      <div className="filters-row" style={{ flexWrap: 'wrap' }}>
        {VEHICLE_CATEGORY_OPTIONS.map(({ value, label }) => (
          <Badge
            key={value}
            label={`${value}: ${VEHICLE_CATEGORIES[value] || label}`}
            color="var(--text-secondary)"
            bg="rgba(170,170,170,0.08)"
            border="rgba(170,170,170,0.15)"
          />
        ))}
      </div>

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        searchKeys={['name', 'rule_type', 'days']}
        searchPlaceholder="Buscar por regra, tipo ou validade..."
        emptyMessage="Nenhuma regra de preco cadastrada"
        onRowClick={row => navigate('/settings', { state: { ruleId: row.id } })}
      />
    </div>
  );
}
