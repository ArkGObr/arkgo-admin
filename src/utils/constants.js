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
  bike: 'Bike Entregas',
  motoboy: 'Moto Entregas',
  mototaxi: 'Moto Táxi',
  car: 'Carro',
  van: 'Utilitário',
  truck: 'Caminhão',
};

export const TRANSACTION_TYPES = {
  recharge: { label: 'Recarga', color: 'var(--success)' },
  commission_debit: { label: 'Comissão', color: 'var(--error)' },
};

export const COMMISSION_RATE = 0.25;
