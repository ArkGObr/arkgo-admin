import { TrendingUp, TrendingDown } from 'lucide-react';
import './StatCard.css';

export default function StatCard({
  label,
  value,
  icon: Icon,
  color = 'var(--primary)',
  sub,
  trend,
  trendDirection,
  className = '',
  delay = 0,
}) {
  return (
    <div
      className={`stat-card animate-slide-up ${className}`}
      style={{
        animationDelay: `${delay}ms`,
        '--stat-color': color,
      }}
    >
      <div
        className="stat-card-icon"
        style={{
          background: `color-mix(in srgb, ${color} 12%, transparent)`,
          color: color,
        }}
      >
        {Icon && <Icon size={22} />}
      </div>
      <div className="stat-card-content">
        <div className="stat-card-label">{label}</div>
        <div className="stat-card-value" style={{ color }}>
          {value}
        </div>
        {(sub || trend != null) && (
          <div className="stat-card-sub">
            {trend != null && (
              <span className={`stat-card-trend ${trendDirection || (trend >= 0 ? 'up' : 'down')}`}>
                {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {Math.abs(trend)}%
              </span>
            )}
            {sub && <span> {sub}</span>}
          </div>
        )}
      </div>
      <div
        className="stat-card-bg-circle"
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: color,
          opacity: 0.04,
          transform: 'translate(30%, -30%)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
