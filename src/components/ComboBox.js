import {
  useCallback, useEffect, useId, useMemo, useRef, useState,
} from 'react';
import { createPortal } from 'react-dom';
import './SelectBox.css';

const toItem = (o) => (typeof o === 'string' ? { value: o, label: o } : o);
const MAX_MENU = 264;
const MAX_ITEMS = 50;

/**
 * Text box with a styled suggestion list (replaces <input list> + <datalist>, whose list the browser draws in its
 * own dark style). Typing filters the list by value, label or hint; any other text can still be typed.
 * Options: strings or { value, label, hint } (e.g. a customer with the mobile number as hint).
 * Keyboard: ↓/↑ move, Enter picks, Esc closes only the list.
 */
function ComboBox({
  value, onChange, options, placeholder, maxLength, id, className = '', 'aria-label': ariaLabel, type = 'text',
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [pos, setPos] = useState(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const listId = `${useId()}-list`;

  const q = String(value ?? '').trim().toLowerCase();
  const items = useMemo(() => options.map(toItem)
    .filter((o) => !q || [o.value, o.label, o.hint].some((t) => String(t ?? '').toLowerCase().includes(q)))
    .slice(0, MAX_ITEMS), [options, q]);
  // Nothing to suggest when the text already is exactly one option.
  const show = open && items.length > 0 && !(items.length === 1 && items[0].value === value);

  const place = useCallback(() => {
    const r = inputRef.current.getBoundingClientRect();
    const below = window.innerHeight - r.bottom - 8;
    const up = below < 160 && r.top > below;
    setPos({
      left: r.left,
      width: Math.max(r.width, 200),
      ...(up ? { bottom: window.innerHeight - r.top + 4 } : { top: r.bottom + 4 }),
      maxHeight: Math.min(MAX_MENU, (up ? r.top : below) - 8),
    });
  }, []);

  const openList = () => {
    place();
    setOpen(true);
  };
  const close = useCallback(() => {
    setOpen(false);
    setActive(-1);
  }, []);

  const choose = (item) => {
    onChange(item.value);
    close();
  };

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!inputRef.current?.contains(e.target) && !listRef.current?.contains(e.target)) close();
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

  useEffect(() => {
    if (show && active >= 0) listRef.current?.children[active]?.scrollIntoView?.({ block: 'nearest' });
  }, [show, active]);

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) openList();
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setActive((a) => Math.min(items.length - 1, Math.max(0, a + step)));
    } else if (e.key === 'Enter' && show && active >= 0) {
      e.preventDefault();
      choose(items[active]);
    } else if (e.key === 'Escape' && show) {
      e.stopPropagation();
      close();
    } else if (e.key === 'Tab') {
      close();
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        id={id}
        type={type}
        className={className}
        value={value ?? ''}
        placeholder={placeholder}
        maxLength={maxLength}
        autoComplete="off"
        role="combobox"
        aria-expanded={show}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-label={ariaLabel}
        onFocus={openList}
        onClick={() => !open && openList()}
        onChange={(e) => {
          onChange(e.target.value);
          setActive(-1);
          if (!open) openList();
        }}
        onKeyDown={onKeyDown}
      />
      {show && pos && createPortal(
        <ul ref={listRef} id={listId} className="sb-menu cb-menu" role="listbox" style={pos} aria-label={ariaLabel}>
          {items.map((item, i) => (
            <li
              key={`${item.value}-${i}`}
              role="option"
              aria-selected={item.value === value}
              className={`sb-option${i === active ? ' active' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(item)}
            >
              <span>{item.label}</span>
              {item.hint && <small className="cb-hint">{item.hint}</small>}
            </li>
          ))}
        </ul>,
        document.body,
      )}
    </>
  );
}

export default ComboBox;
