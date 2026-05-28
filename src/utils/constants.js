/**
 * Status labels, colors, and icons for deliveries.
 * Mirrors DeliveryStatus enum from Flutter.
 */
export const DELIVERY_STATUSES = {
  pending: {
    label: 'Aguardando',
    color: 'var(--status-pending)',
    bg: 'rgba(255, 184, 0, 0.12)',
    border: 'rgba(255, 184, 0, 0.25)',
  },
  accepted: {
    label: 'Aceito',
    color: 'var(--status-accepted)',
    bg: 'rgba(59, 158, 255, 0.12)',
    border: 'rgba(59, 158, 255, 0.25)',
  },
  in_progress: {
    label: 'Em rota',
    color: 'var(--status-in-progress)',
    bg: 'rgba(153, 235, 9, 0.12)',
    border: 'rgba(153, 235, 9, 0.25)',
  },
  completed: {
    label: 'Entregue',
    color: 'var(--status-completed)',
    bg: 'rgba(136, 210, 8, 0.12)',
    border: 'rgba(136, 210, 8, 0.25)',
  },
  cancelled: {
    label: 'Cancelado',
    color: 'var(--status-cancelled)',
    bg: 'rgba(255, 59, 59, 0.12)',
    border: 'rgba(255, 59, 59, 0.25)',
  },
};

export const PAYMENT_METHODS = {
  cash: 'Dinheiro',
  pix: 'PIX',
  card: 'Cartão',
};

export const VEHICLE_CATEGORIES = {
  motoboy: 'Moto Entregas',
  car: 'Carro',
  bike: 'Bike Entregas',
  mototaxi: 'Moto Táxi',
  van: 'Utilitario',
  truck: 'Caminhao',
};

export const VEHICLE_CATEGORY_OPTIONS = Object.entries(VEHICLE_CATEGORIES).map(([value, label]) => ({
  value,
  label,
}));

export const TRANSACTION_TYPES = {
  recharge: { label: 'Recarga', color: 'var(--success)' },
  commission_debit: { label: 'Comissão', color: 'var(--error)' },
  delivery_commission: { label: 'Comissão', color: 'var(--error)' },
  manual_adjustment: { label: 'Ajuste manual', color: 'var(--info)' },
};

export const COMMISSION_RATE = 0.25;

export function isDriverOnline(driver) {
  return Boolean(driver?.online ?? driver?.is_online);
}

export function getDriverBalance(driver) {
  return Number(driver?.wallet_balance ?? driver?.saldo ?? driver?.balance ?? 0);
}
