import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import './Input.css';

export function Input({ label, error, className = '', ...props }) {
  return (
    <div className={`form-field ${className}`}>
      {label && <label className="form-label">{label}</label>}
      <input className={`form-input ${error ? 'error' : ''}`} {...props} />
      {error && <span className="form-error">{error}</span>}
    </div>
  );
}

export function Select({ label, error, options = [], placeholder, className = '', style, value, onChange, ...props }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => String(opt.value) === String(value));
  const displayLabel = selectedOption ? selectedOption.label : (placeholder || 'Selecione...');

  const handleSelect = (optValue) => {
    if (onChange) {
      onChange({
        target: {
          value: optValue,
          name: props.name
        }
      });
    }
    setOpen(false);
  };

  return (
    <div className={`form-field ${className}`} style={style} ref={containerRef}>
      {label && <label className="form-label">{label}</label>}
      <div className="custom-select-container">
        <button
          type="button"
          className={`custom-select-trigger ${open ? 'open' : ''} ${error ? 'error' : ''}`}
          onClick={() => setOpen(o => !o)}
          {...props}
        >
          <span className={`custom-select-value ${!selectedOption && placeholder ? 'placeholder' : ''}`}>
            {displayLabel}
          </span>
          <ChevronDown size={16} className={`custom-select-chevron ${open ? 'rotated' : ''}`} />
        </button>

        {open && (
          <div className="custom-select-dropdown animate-scale-in">
            {placeholder && (
              <button
                type="button"
                className={`custom-select-option ${value === '' || !value ? 'selected' : ''}`}
                onClick={() => handleSelect('')}
              >
                {placeholder}
              </button>
            )}
            {options.map(opt => (
              <button
                key={opt.value}
                type="button"
                className={`custom-select-option ${String(value) === String(opt.value) ? 'selected' : ''}`}
                onClick={() => handleSelect(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
      {error && <span className="form-error">{error}</span>}
    </div>
  );
}

