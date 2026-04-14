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
  { path: '/motoboys', label: 'Motoboys', icon: Bike },
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
          <span>U</span>
        </div>
        <div className="sidebar-logo-text">
          <h1>UrbGo</h1>
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
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''}`
              }
            >
              <Icon size={18} />
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
