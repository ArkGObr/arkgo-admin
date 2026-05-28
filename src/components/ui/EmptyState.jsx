import { Inbox } from 'lucide-react';

export default function EmptyState({
  icon = Inbox,
  title = 'Nenhum registro',
  description,
}) {
  const EmptyIcon = icon;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-6xl) var(--space-xl)',
        textAlign: 'center',
        animation: 'fadeIn var(--duration-slow) ease',
      }}
    >
      <EmptyIcon
        size={48}
        style={{ color: 'var(--text-tertiary)', opacity: 0.3, marginBottom: 'var(--space-lg)' }}
      />
      <p style={{ color: 'var(--text-secondary)', fontSize: 15, fontWeight: 500 }}>
        {title}
      </p>
      {description && (
        <p style={{ color: 'var(--text-tertiary)', fontSize: 13, marginTop: 'var(--space-xs)' }}>
          {description}
        </p>
      )}
    </div>
  );
}
