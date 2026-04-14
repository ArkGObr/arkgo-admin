import { useLocation } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import './TopBar.css';

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/deliveries': 'Entregas',
  '/users': 'Clientes',
  '/motoboys': 'Motoboys',
  '/transactions': 'Transações',
  '/recharges': 'Recargas',
  '/pricing': 'Preços',
  '/map': 'Mapa ao Vivo',
};

export default function TopBar() {
  const { pathname } = useLocation();
  const title = PAGE_TITLES[pathname] || 'Painel';

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="topbar-breadcrumb">
          <span>UrbGo Admin</span>
          <span style={{ color: 'var(--text-tertiary)' }}>/</span>
          <strong>{title}</strong>
        </div>
      </div>
      <div className="topbar-right">
        <div className="topbar-live">
          <span className="topbar-live-dot" />
          Ao vivo
        </div>
        <button
          className="btn btn-ghost btn-icon btn-sm"
          onClick={() => window.location.reload()}
          title="Atualizar"
        >
          <RefreshCw size={16} />
        </button>
      </div>
    </header>
  );
}
