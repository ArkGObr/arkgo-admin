import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Truck,
  Users,
  Bike,
  ArrowLeftRight,
  RefreshCw,
  DollarSign,
  MapPin,
  LogOut,
  Car,
  Zap,
  Package,
  FileSearch,
  ClipboardList,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import './Sidebar.css';

const NAV_ITEMS = [
  { section: 'Principal' },
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/deliveries', label: 'Entregas', icon: Truck },
  { path: '/map', label: 'Mapa ao Vivo', icon: MapPin },
  { section: 'Gestão' },
  { path: '/users', label: 'Clientes', icon: Users },
  { path: '/landing-leads', label: 'Fila da Landing', icon: ClipboardList },
  { path: '/documents', label: 'Documentos IA', icon: FileSearch },
  { subsection: 'Entregadores' },
  { path: '/drivers/motoboy', label: 'Motoboy', icon: Bike, sub: true },
  { path: '/drivers/bikeboy', label: 'Bikeboy', icon: Bike, sub: true },
  { path: '/drivers/mototaxi', label: 'Mototáxi', icon: Zap, sub: true },
  { path: '/drivers/car', label: 'Carro', icon: Car, sub: true },
  { path: '/drivers/van', label: 'Utilitário', icon: Truck, sub: true },
  { path: '/drivers/truck', label: 'Caminhão', icon: Package, sub: true },
  { section: 'Financeiro' },
  { path: '/transactions', label: 'Transações', icon: ArrowLeftRight },
  { path: '/recharges', label: 'Recargas', icon: RefreshCw },
  { path: '/pricing', label: 'Preços', icon: DollarSign },
];

export default function Sidebar() {
  const { profile, signOut } = useAuth();

  const initials = profile?.name
    ? profile.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'AD';

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-mark">
          <img src="/favicon.png" alt="ArkGo" className="sidebar-favicon-img" />
        </div>
        <div className="sidebar-logo-text">
          <h1>ArkGo</h1>
          <span>Admin Panel</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item, i) => {
          if (item.section) {
            return (
              <div key={`section-${i}`} className="sidebar-section-label">
                {item.section}
              </div>
            );
          }
          if (item.subsection) {
            return (
              <div key={`subsection-${i}`} className="sidebar-subsection-label">
                {item.subsection}
              </div>
            );
          }
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `sidebar-link ${item.sub ? 'sidebar-link--sub' : ''} ${isActive ? 'active' : ''}`
              }
            >
              <Icon size={item.sub ? 15 : 18} />
              <span>{item.label}</span>
              {item.badge && (
                <span className="sidebar-link-badge">{item.badge}</span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{profile?.name || 'Admin'}</div>
            <div className="sidebar-user-role">Administrador</div>
          </div>
          <button
            className="btn btn-ghost btn-icon btn-sm"
            onClick={signOut}
            title="Sair"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
