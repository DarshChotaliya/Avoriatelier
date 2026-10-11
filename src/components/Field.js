import SelectBox from './SelectBox';

/**
 * Labelled form input. Pass `options` (strings or { value, label }) or `suggestions` for a styled dropdown
 * (an existing value that is not in the list still shows). `readOnly` fields render as calculated values.
 */
function Field({ label, value, onChange, type = 'text', options, suggestions, readOnly, required, step, ...rest }) {
  const handleChange = (e) => onChange?.(e.target.value);

  let control;
  const list = options ?? suggestions;
  if (list) {
    control = (
      <SelectBox value={value ?? ''} onChange={(v) => onChange?.(v)} options={list} aria-label={label}
        allowEmpty={!required} placeholder="— Select —" />
    );
  } else if (type === 'textarea') {
    control = <textarea value={value} onChange={handleChange} rows={2} {...rest} />;
  } else {
    control = (
      <input
        type={type}
        value={value ?? ''}
        onChange={handleChange}
        readOnly={readOnly}
        required={required}
        step={step ?? (type === 'number' ? 'any' : undefined)}
        min={type === 'number' ? 0 : undefined}
        className={readOnly ? 'calculated' : undefined}
        tabIndex={readOnly ? -1 : undefined}
        {...rest}
      />
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
