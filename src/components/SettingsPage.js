import { useState } from 'react';
import Icon from './Icon';
import './PurchaseInvoice.css';
import './PurchaseInvoices.css';
import './MasterPage.css';

const SECTIONS = [
  {
    title: 'Company',
    fields: [
      { key: 'companyName', label: 'Company Name', wide: true },
      { key: 'gstNo', label: 'GST No' },
      { key: 'panNo', label: 'PAN No' },
      { key: 'contactNo', label: 'Contact No', type: 'tel' },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'state', label: 'State' },
      { key: 'address', label: 'Address', type: 'textarea', wide: true },
    ],
  },
  {
    title: 'Bank',
    fields: [
      { key: 'bankName', label: 'Bank Name' },
      { key: 'accountName', label: 'Account Name' },
      { key: 'accountNo', label: 'Account No' },
      { key: 'ifsc', label: 'IFSC' },
      { key: 'upiId', label: 'UPI ID' },
    ],
  },
  {
    title: 'Default Rates (used for new purchase items)',
    fields: [
      { key: 'defaultGstPercent', label: 'GST %', type: 'number' },
      { key: 'labourRatePerGram', label: 'Labour ₹ / gram', type: 'number' },
      { key: 'labourMinimum', label: 'Labour Minimum ₹', type: 'number' },
      { key: 'hallmarkCharge', label: 'Hallmark ₹ / piece', type: 'number' },
    ],
  },
];

function SettingsPage({ settings, onSave }) {
  const [values, setValues] = useState(settings);
  const [status, setStatus] = useState('');

  const set = (k) => (e) => {
    setValues((v) => ({ ...v, [k]: e.target.value }));
    setStatus('');
  };

  const submit = (e) => {
    e.preventDefault();
    const numbers = SECTIONS.flatMap((s) => s.fields).filter((f) => f.type === 'number');
    try {
      onSave({ ...values, ...Object.fromEntries(numbers.map((f) => [f.key, Number(values[f.key]) || 0])) });
      setStatus('Saved');
    } catch (err) {
      setStatus(err.message);
    }
  };

  return (
    <form className="pi-page" onSubmit={submit}>
      <div className="pi-top">
        <div>
          <h1>Bank &amp; Settings</h1>
          <p className="page-subtitle">Company details, bank account and default rates</p>
        </div>
      </div>

      {SECTIONS.map((section) => (
        <section key={section.title} className="inv-card st-section">
          <h3 className="inv-section-title">{section.title}</h3>
          <div className="st-grid">
            {section.fields.map((f) => (
              <label key={f.key} className={`inv-cell${f.wide ? ' st-wide' : ''}`}>
                <span>{f.label}</span>
                {f.type === 'textarea' ? (
                  <textarea rows={3} value={values[f.key]} onChange={set(f.key)} maxLength={500} />
                ) : (
                  <input type={f.type ?? 'text'} min={f.type === 'number' ? 0 : undefined} step="any"
                    className={f.type === 'number' ? 'inv-num' : undefined} value={values[f.key]}
                    onChange={set(f.key)} maxLength={f.type === 'number' ? undefined : 200} />
                )}
              </label>
            ))}
          </div>
        </section>
      ))}

      <div className="st-actions">
        {status && <span className="st-saved">{status}</span>}
        <button type="submit" className="pi-btn-gold">
          <Icon name="save" size={16} />
          Save Settings
        </button>
      </div>
    </form>
  );
}

export default SettingsPage;
