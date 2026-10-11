import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';
import './SelectBox.css';

const toItem = (o) => (typeof o === 'string' ? { value: o, label: o } : o);
const MAX_MENU = 264;

/**
 * Styled replacement for <select>: same value/options idea, onChange receives the new value.
 * The list is rendered in a portal with fixed position so dialogs and rounded panels never clip it.
 * Keyboard: ↑/↓ move, Enter/Space choose, Esc closes (without closing the surrounding dialog), Tab leaves.
 */
function SelectBox({
  value, onChange, options, placeholder = '— Select —', allowEmpty = false, disabled = false, className = '',
  'aria-label': ariaLabel,
}) {
  const items = useMemo(() => [
    ...(allowEmpty ? [{ value: '', label: placeholder, empty: true }] : []),
    ...options.map(toItem),
  ], [options, allowEmpty, placeholder]);

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);
  const listRef = useRef(null);

  const selected = items.find((i) => i.value === value && !i.empty)
    // A stored value that is no longer an option still shows instead of looking empty.
    ?? (value ? { value, label: value } : null);

  const close = useCallback(() => setOpen(false), []);

  const openMenu = () => {
    if (disabled) return;
    const r = btnRef.current.getBoundingClientRect();
    const below = window.innerHeight - r.bottom - 8;
    const wanted = Math.min(MAX_MENU, items.length * 36 + 10);
    const up = below < wanted && r.top > below;
    setPos({
      left: r.left,
      width: Math.max(r.width, 160),
      ...(up ? { bottom: window.innerHeight - r.top + 4 } : { top: r.bottom + 4 }),
      maxHeight: Math.min(MAX_MENU, (up ? r.top : below) - 8),
    });
    setActive(Math.max(0, items.findIndex((i) => i.value === value)));
    setOpen(true);
  };

  const choose = (item) => {
    if (!item) return;
    onChange(item.value);
    close();
    btnRef.current?.focus();
  };

  // Close on a click elsewhere, or when the page / dialog scrolls or resizes (the list is fixed-position).
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!btnRef.current?.contains(e.target) && !listRef.current?.contains(e.target)) close();
    };
    const onScroll = (e) => {
      if (!listRef.current?.contains(e.target)) close();
    };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', close);
    };
  }, [open, close]);

  // Keep the highlighted option visible while moving with the keyboard.
  useEffect(() => {
    if (open) listRef.current?.children[active]?.scrollIntoView?.({ block: 'nearest' });
  }, [open, active]);

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) {
        openMenu();
        return;
      }
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setActive((a) => Math.min(items.length - 1, Math.max(0, a + step)));
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (open) choose(items[active]);
      else openMenu();
    } else if (e.key === 'Escape' && open) {
      // Only close the list, not the dialog around it.
      e.stopPropagation();
      close();
    } else if (e.key === 'Tab') {
      close();
    }
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={`sb-btn${open ? ' open' : ''}${selected ? '' : ' empty'} ${className}`}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={onKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        <span className="sb-value">{selected ? selected.label : placeholder}</span>
        <Icon name="chevronDown" size={15} className="sb-caret" />
      </button>
      {open && pos && createPortal(
        <ul ref={listRef} className="sb-menu" role="listbox" style={pos} aria-label={ariaLabel}>
          {items.map((item, i) => {
            const isSelected = item.value === value && (item.empty ? !value : true);
            return (
              <li
                key={`${item.value}-${i}`}
                role="option"
                aria-selected={isSelected}
                className={`sb-option${i === active ? ' active' : ''}${isSelected ? ' selected' : ''}${item.empty ? ' sb-empty' : ''}`}
                // Keep focus on the button so the keyboard keeps working.
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(item)}
              >
                <span>{item.label}</span>
                {isSelected && <Icon name="check" size={14} />}
              </li>
            );
          })}
        </ul>,
        document.body,
      )}
    </>
  );
}

export default SelectBox;
