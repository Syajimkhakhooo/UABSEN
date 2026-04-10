import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Pilih opsi',
  disabled = false,
  className = '',
  menuClassName = '',
  menuPlacement = 'bottom',
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value],
  );

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function handlePointerDown(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={['relative', className].join(' ').trim()}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={[
          'custom-field custom-select-trigger text-left',
          open ? 'custom-field-active' : '',
          disabled ? 'cursor-not-allowed opacity-60' : '',
        ]
          .join(' ')
          .trim()}
      >
        <span className={['min-w-0 flex-1 truncate', selectedOption ? 'text-slate-700' : 'text-slate-400'].join(' ')}>
          {selectedOption?.label ?? placeholder}
        </span>
        <ChevronDown
          size={18}
          className={['shrink-0 text-slate-400 transition-transform duration-200', open ? 'rotate-180' : ''].join(' ')}
        />
      </button>

      {open && (
        <div
          className={[
            'custom-popover absolute left-0 right-0 z-50 max-h-72 overflow-y-auto p-2',
            menuPlacement === 'top' ? 'bottom-[calc(100%+0.55rem)]' : 'top-[calc(100%+0.55rem)]',
            menuClassName,
          ]
            .join(' ')
            .trim()}
          role="listbox"
        >
          {options.map((option) => {
            const isSelected = option.value === value;

            return (
              <button
                key={option.value || option.label}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={[
                  'custom-option',
                  isSelected ? 'custom-option-active' : 'custom-option-idle',
                ]
                  .join(' ')
                  .trim()}
              >
                <span>{option.label}</span>
                {isSelected && <Check size={16} className="shrink-0 text-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
