import { useId } from 'react';

/**
 * Labelled form input. Pass `options` for a <select>, or `suggestions` for a free-text
 * input with a datalist. `readOnly` fields render as calculated values.
 */
function Field({ label, value, onChange, type = 'text', options, suggestions, readOnly, required, step, ...rest }) {
  const id = useId();
  const listId = suggestions ? `${id}-list` : undefined;
  const handleChange = (e) => onChange?.(e.target.value);

  let control;
  if (options) {
    control = (
      <select value={value} onChange={handleChange} required={required} {...rest}>
        {!required && <option value="">-- Select --</option>}
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  } else if (type === 'textarea') {
    control = <textarea value={value} onChange={handleChange} rows={2} {...rest} />;
  } else {
    control = (
      <>
        <input
          type={type}
          value={value ?? ''}
          onChange={handleChange}
          readOnly={readOnly}
          required={required}
          step={step ?? (type === 'number' ? 'any' : undefined)}
          min={type === 'number' ? 0 : undefined}
          list={listId}
          className={readOnly ? 'calculated' : undefined}
          tabIndex={readOnly ? -1 : undefined}
          {...rest}
        />
        {suggestions && (
          <datalist id={listId}>
            {suggestions.map((s) => <option key={s} value={s} />)}
          </datalist>
        )}
      </>
    );
  }

  return (
    <label className={`field${type === 'textarea' ? ' field-wide' : ''}`}>
      <span>{label}{required && <em> *</em>}</span>
      {control}
    </label>
  );
}

export default Field;
