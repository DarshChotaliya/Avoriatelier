import { useState } from 'react';
import PurchaseList from './components/PurchaseList';
import PurchaseForm from './components/PurchaseForm';
import './App.css';

function App() {
  // view: { name: 'list' } | { name: 'form', id?: number }
  const [view, setView] = useState({ name: 'list' });
  const showList = () => setView({ name: 'list' });

  return (
    <div className="app">
      <header className="app-header">
        <button type="button" className="brand" onClick={showList}>Purchase Management</button>
      </header>
      <main className="container">
        {view.name === 'list' ? (
          <PurchaseList onNew={() => setView({ name: 'form' })} onEdit={(id) => setView({ name: 'form', id })} />
        ) : (
          <PurchaseForm key={view.id ?? 'new'} purchaseId={view.id} onSaved={showList} onCancel={showList} />
        )}
      </main>
    </div>
  );
}

export default App;
