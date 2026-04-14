export default function Spinner({ size = 24, color = 'var(--primary)' }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        border: `2.5px solid color-mix(in srgb, ${color} 20%, transparent)`,
        borderTopColor: color,
        borderRadius: '50%',
        animation: 'spin 0.6s linear infinite',
      }}
    />
  );
}

export function PageSpinner() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '60vh',
        animation: 'fadeIn 0.3s ease',
      }}
    >
      <Spinner size={36} />
    </div>
  );
}
