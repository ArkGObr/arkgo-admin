import './Button.css';

export default function Button({
  children,
  variant = 'primary',
  size,
  icon: Icon,
  iconOnly = false,
  loading = false,
  className = '',
  ...props
}) {
  const classes = [
    'btn',
    `btn-${variant}`,
    size && `btn-${size}`,
    iconOnly && 'btn-icon',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button className={classes} disabled={loading || props.disabled} {...props}>
      {loading ? (
        <span className="btn-spinner" />
      ) : (
        <>
          {Icon && <Icon size={iconOnly ? 18 : 16} />}
          {!iconOnly && children}
        </>
      )}
    </button>
  );
}
