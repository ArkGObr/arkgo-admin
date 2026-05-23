import { useLocation } from 'react-router-dom';
import { RefreshCw, Menu } from 'lucide-react';
import './TopBar.css';

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/deliveries': 'Entregas',
  '/users': 'Clientes',
  '/Motoboy': 'Motoboy',
  '/drivers/motoboy': 'Motoboy',
  '/drivers/bikeboy': 'Bikeboy',
  '/drivers/mototaxi': 'Mototáxi',
  '/drivers/car': 'Carros',
  '/drivers/van': 'Utilitários',
  '/drivers/truck': 'Caminhões',
  '/transactions': 'Transações',
  '/recharges': 'Recargas',
  '/pricing': 'Preços',
  '/map': 'Mapa ao Vivo',
  '/documents': 'Documentos IA',
  '/landing-leads': 'Fila da Landing',
  '/settings': 'Configurações',
};

export default function TopBar({ onMenuToggle }) {
  const { pathname } = useLocation();
  const title = PAGE_TITLES[pathname] || 'Painel';

  return (
    <header className="topbar">
      <div className="topbar-left">
        {/* Hamburger — only visible on mobile */}
        <button
          className="topbar-hamburger btn btn-ghost btn-icon btn-sm"
          onClick={onMenuToggle}
          title="Menu"
          aria-label="Abrir menu"
        >
          <Menu size={20} />
        </button>

        <div className="topbar-breadcrumb">
          <span>ArkGo Admin</span>
          <span style={{ color: 'var(--text-tertiary)' }}>/</span>
          <strong>{title}</strong>
        </div>
      </div>

      <div className="topbar-right">
        <button
          className="btn btn-ghost btn-icon btn-sm"
          onClick={() => window.dispatchEvent(new CustomEvent('app:refresh'))}
          title="Atualizar"
        >
          <RefreshCw size={16} />
        </button>
      </div>
    </header>
  );
}
