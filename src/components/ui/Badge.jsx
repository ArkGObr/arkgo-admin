import { Clock, Truck, Navigation, CheckCircle, XCircle } from 'lucide-react';
import { DELIVERY_STATUSES } from '../../utils/constants';
import './Badge.css';

const STATUS_ICONS = {
  pending: Clock,
  accepted: Truck,
  in_progress: Navigation,
  completed: CheckCircle,
  cancelled: XCircle,
};

export default function Badge({ status, label, color, bg, border }) {
  // If a delivery status is provided, use predefined values
  const statusConfig = status ? DELIVERY_STATUSES[status] : null;
  const displayLabel = label || statusConfig?.label || status;
  const displayColor = color || statusConfig?.color;
  const displayBg = bg || statusConfig?.bg;
  const displayBorder = border || statusConfig?.border;
  const Icon = status ? STATUS_ICONS[status] : null;

  return (
    <span
      className="badge"
      style={{
        color: displayColor,
        backgroundColor: displayBg,
        borderColor: displayBorder,
      }}
    >
      {Icon && <Icon size={11} />}
      {displayLabel}
    </span>
  );
}
