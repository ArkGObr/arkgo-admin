import { useState } from 'react';
import { Filter, Plus, RefreshCw } from 'lucide-react';
import DataTable from '../components/ui/DataTable';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { Select, Input } from '../components/ui/Input';
import { useSupabase } from '../hooks/useSupabase';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDateTime } from '../utils/formatDate';

const RECHARGE_STATUSES = {
  pending: { label: 'Pendente', color: 'var(--warning)', bg: 'rgba(255,184,0,0.1)', border: 'rgba(255,184,0,0.2)' },
  confirmed: { label: 'Confirmada', color: 'var(--success)', bg: 'rgba(153,235,9,0.1)', border: 'rgba(153,235,9,0.2)' },
  failed: { label: 'Falhou', color: 'var(--error)', bg: 'rgba(255,59,59,0.1)', border: 'rgba(255,59,59,0.2)' },
};

export default function Recharges() {
  const [statusFilter, setStatusFilter] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [rechargeDescription, setRechargeDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const filters = [];
  if (statusFilter) filters.push({ column: 'gateway_status', operator: 'eq', value: statusFilter });

  // Main query (corrected to use 'motoboys' instead of 'Motoboy')
  const { data, loading, refetch } = useSupabase('recharges', {
    select: '*, motoboys(users(name))',
    filters,
    order: { column: 'created_at', ascending: false },
  });

  // Drivers query for manual recharge selection (only runs when modal opens)
  const { data: drivers, loading: loadingDrivers } = useSupabase('motoboys', {
    select: '*, users(name, phone, status)',
    filters: [{ column: 'vehicle_category', operator: 'neq', value: 'deleted' }],
    order: { column: 'updated_at', ascending: false },
    enabled: isModalOpen,
  });

  const sortedDrivers = [...(drivers || [])].sort((a, b) => {
    const nameA = a.users?.name || '';
    const nameB = b.users?.name || '';
    return nameA.localeCompare(nameB);
  });

  const handleAddRecharge = async (e) => {
    e.preventDefault();
    if (!selectedDriverId) {
      setSubmitError('Selecione um motorista.');
      return;
    }
    const parsedAmount = parseFloat(rechargeAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setSubmitError('Informe um valor válido maior que zero.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      // 1. Fetch the driver's current wallet balance
      const { data: driverData, error: driverFetchError } = await supabase
        .from('motoboys')
        .select('wallet_balance')
        .eq('id', selectedDriverId)
        .single();
      
      if (driverFetchError) throw driverFetchError;

      const currentBalance = driverData.wallet_balance || 0;
      const newBalance = currentBalance + parsedAmount;

      // 2. Insert recharge log (gateway_status = confirmed)
      const rechargePayload = {
        motoboy_id: selectedDriverId,
        amount: parsedAmount,
        gateway_status: 'confirmed',
        gateway_id: 'manual_' + Math.random().toString(36).substr(2, 9),
        pix_code: 'Recarga Manual Admin',
        confirmed_at: new Date().toISOString(),
      };
      
      const { error: rechargeError } = await supabase
        .from('recharges')
        .insert([rechargePayload]);

      if (rechargeError) throw rechargeError;

      // 3. Update the driver's wallet balance
      const { error: driverUpdateError } = await supabase
        .from('motoboys')
        .update({ wallet_balance: newBalance })
        .eq('id', selectedDriverId);

      if (driverUpdateError) throw driverUpdateError;

      // 4. Insert transaction history log
      const transactionPayload = {
        motoboy_id: selectedDriverId,
        type: 'recharge',
        amount: parsedAmount,
        balance_after: newBalance,
        description: rechargeDescription || 'Recarga manual efetuada pelo administrador',
      };

      const { error: transactionError } = await supabase
        .from('transactions')
        .insert([transactionPayload]);

      if (transactionError) throw transactionError;

      // Clean up, close modal, and refetch
      setSelectedDriverId('');
      setRechargeAmount('');
      setRechargeDescription('');
      setIsModalOpen(false);
      refetch();
    } catch (err) {
      console.error('Error executing recharge:', err);
      setSubmitError(err.message || 'Erro ao processar a recarga no banco.');
    } finally {
      setSubmitting(false);
    }
  };

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

  const driverOptions = sortedDrivers.map(d => ({
    value: d.id,
    label: `${d.users?.name || 'Sem nome'} (Saldo: ${formatCurrency(d.wallet_balance || 0)})`
  }));

  const selectedDriver = sortedDrivers.find(d => d.id === selectedDriverId);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Recargas</h1>
          <p className="page-subtitle">Recargas PIX via gateway Asaas ou lançadas manualmente</p>
        </div>
        <div className="page-actions">
          <button
            className="btn btn-primary"
            onClick={() => {
              setSubmitError('');
              setIsModalOpen(true);
            }}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <Plus size={16} />
            <span>Nova Recarga</span>
          </button>
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

      {/* Manual Recharge Modal */}
      <Modal
        open={isModalOpen}
        onClose={() => !submitting && setIsModalOpen(false)}
        title="Nova Recarga Manual"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, width: '100%' }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setIsModalOpen(false)}
              disabled={submitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              form="manual-recharge-form"
              disabled={submitting}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              {submitting ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Processando...</span>
                </>
              ) : (
                <span>Confirmar Recarga</span>
              )}
            </button>
          </div>
        }
      >
        <form id="manual-recharge-form" onSubmit={handleAddRecharge} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {submitError && (
            <div style={{
              background: 'rgba(255,59,59,0.1)',
              border: '1px solid rgba(255,59,59,0.2)',
              color: 'var(--error)',
              padding: '12px var(--space-lg)',
              borderRadius: 'var(--radius-sm)',
              fontSize: 13,
            }}>
              {submitError}
            </div>
          )}

          <Select
            label="Motorista / Entregador"
            value={selectedDriverId}
            onChange={e => {
              setSelectedDriverId(e.target.value);
              setSubmitError('');
            }}
            placeholder={loadingDrivers ? "Carregando motoristas..." : "Selecione o motorista..."}
            options={driverOptions}
            disabled={submitting || loadingDrivers}
            required
          />

          {selectedDriver && (
            <div style={{
              background: 'var(--surface-high)',
              border: '1px solid var(--surface-border)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px var(--space-lg)',
              fontSize: 13,
              display: 'flex',
              justifyContent: 'space-between',
            }}>
              <span style={{ color: 'var(--text-secondary)' }}>Saldo Atual:</span>
              <strong style={{ color: 'var(--success)' }}>
                {formatCurrency(selectedDriver.wallet_balance || 0)}
              </strong>
            </div>
          )}

          <Input
            label="Valor do Crédito (R$)"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="Ex: 50.00"
            value={rechargeAmount}
            onChange={e => setRechargeAmount(e.target.value)}
            disabled={submitting}
            required
          />

          <Input
            label="Descrição / Justificativa"
            type="text"
            placeholder="Ex: Recarga Pix manual ou ajuste administrativo"
            value={rechargeDescription}
            onChange={e => setRechargeDescription(e.target.value)}
            disabled={submitting}
          />
        </form>
      </Modal>
    </div>
  );
}
