import { useState } from 'react';
import { Save, Plus, Trash2, Edit } from 'lucide-react';
import DataTable from '../components/ui/DataTable';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { useSupabase } from '../hooks/useSupabase';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../utils/formatCurrency';

export default function Pricing() {
  const { data, loading, refetch } = useSupabase('vehicle_pricing', {
    order: { column: 'category', ascending: true },
  });

  const [editRow, setEditRow] = useState(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!editRow) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('vehicle_pricing')
        .update({
          name: editRow.name,
          base_rate: parseFloat(editRow.base_rate),
          per_km_rate: parseFloat(editRow.per_km_rate),
          min_fare: parseFloat(editRow.min_fare),
          commission_rate: parseFloat(editRow.commission_rate),
          is_active: editRow.is_active,
        })
        .eq('id', editRow.id);

      if (error) throw error;
      setEditRow(null);
      refetch();
    } catch (err) {
      alert('Erro ao salvar: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  const columns = [
    {
      key: 'category',
      label: 'Categoria',
      className: 'text-mono',
    },
    {
      key: 'name',
      label: 'Nome',
      className: 'text-primary',
    },
    {
      key: 'base_rate',
      label: 'Taxa Base',
      className: 'text-numeric',
      render: row => formatCurrency(row.base_rate),
    },
    {
      key: 'per_km_rate',
      label: 'R$/km',
      className: 'text-numeric',
      render: row => formatCurrency(row.per_km_rate),
    },
    {
      key: 'min_fare',
      label: 'Mínimo',
      className: 'text-numeric',
      render: row => formatCurrency(row.min_fare),
    },
    {
      key: 'commission_rate',
      label: 'Comissão',
      render: row => (
        <span style={{ color: 'var(--warning)', fontWeight: 600 }}>
          {((row.commission_rate || 0.25) * 100).toFixed(0)}%
        </span>
      ),
    },
    {
      key: 'is_active',
      label: 'Ativo',
      render: row => (
        <Badge
          label={row.is_active ? 'Ativo' : 'Inativo'}
          color={row.is_active ? 'var(--success)' : 'var(--error)'}
          bg={row.is_active ? 'rgba(153,235,9,0.1)' : 'rgba(255,59,59,0.1)'}
          border={row.is_active ? 'rgba(153,235,9,0.2)' : 'rgba(255,59,59,0.2)'}
        />
      ),
    },
    {
      key: 'actions',
      label: '',
      sortable: false,
      width: '60px',
      render: row => (
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          icon={Edit}
          onClick={e => { e.stopPropagation(); setEditRow({ ...row }); }}
        />
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Tabela de Preços</h1>
          <p className="page-subtitle">Preços por categoria de veículo</p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        emptyMessage="Nenhuma categoria de preço configurada"
      />

      {/* Edit Modal */}
      <Modal
        open={!!editRow}
        onClose={() => setEditRow(null)}
        title={`Editar ${editRow?.name || ''}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditRow(null)}>
              Cancelar
            </Button>
            <Button icon={Save} loading={saving} onClick={handleSave}>
              Salvar
            </Button>
          </>
        }
      >
        {editRow && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
            <Input
              label="Nome"
              value={editRow.name}
              onChange={e => setEditRow({ ...editRow, name: e.target.value })}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
              <Input
                label="Taxa Base (R$)"
                type="number"
                step="0.01"
                value={editRow.base_rate}
                onChange={e => setEditRow({ ...editRow, base_rate: e.target.value })}
              />
              <Input
                label="R$ por KM"
                type="number"
                step="0.01"
                value={editRow.per_km_rate}
                onChange={e => setEditRow({ ...editRow, per_km_rate: e.target.value })}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
              <Input
                label="Tarifa Mínima (R$)"
                type="number"
                step="0.01"
                value={editRow.min_fare}
                onChange={e => setEditRow({ ...editRow, min_fare: e.target.value })}
              />
              <Input
                label="Comissão (%)"
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={editRow.commission_rate}
                onChange={e => setEditRow({ ...editRow, commission_rate: e.target.value })}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              <input
                type="checkbox"
                id="is_active"
                checked={editRow.is_active}
                onChange={e => setEditRow({ ...editRow, is_active: e.target.checked })}
                style={{ accentColor: 'var(--primary)' }}
              />
              <label htmlFor="is_active" style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                Categoria ativa
              </label>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
