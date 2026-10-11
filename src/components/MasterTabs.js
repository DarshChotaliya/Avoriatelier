import Icon from './Icon';
import { MASTER_TABS } from './Sidebar';
import './MasterPage.css';

/** Tab bar shown on every master page; one tab per master. */
function MasterTabs({ page, onSelect }) {
  return (
    <nav className="mt-tabs" aria-label="Masters">
      {MASTER_TABS.map((t) => (
        <button key={t.page} type="button" className={page === t.page ? 'active' : ''}
          aria-current={page === t.page ? 'page' : undefined} onClick={() => onSelect(t.page)}>
          <Icon name={t.icon} size={15} />
          {t.label}
        </button>
      ))}
    </nav>
  );
}

export default MasterTabs;
