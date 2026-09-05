import { NavLink } from 'react-router-dom';
import {
  FiBarChart2,
  FiChevronLeft,
  FiFileText,
  FiGrid,
  FiHeadphones,
  FiLayers,
  FiPackage,
  FiSend,
} from 'react-icons/fi';
import BrandMark from '../common/BrandMark.jsx';
import { SUPPORT_PHONE_DISPLAY, SUPPORT_WHATSAPP_URL } from '../../constants/support.js';

const navigationGroups = [
  {
    label: 'General',
    items: [
      { to: '/app', end: true, label: 'Resumen', icon: FiGrid },
      { to: '/app/statistics', label: 'Ventas y estadísticas', icon: FiBarChart2 },
    ],
  },
  {
    label: 'Automatización',
    items: [
      { to: '/app/products', label: 'Publicaciones', icon: FiPackage },
      { to: '/app/automations', label: 'Flujos automáticos', icon: FiLayers },
      { to: '/app/templates', label: 'Plantillas', icon: FiFileText },
      { to: '/app/campaigns', label: 'Campañas', icon: FiSend },
    ],
  },
];

const NavBar = ({ collapsed, expandedForMobile, onCollapse, onNavigate }) => {
  const showLabels = !collapsed || expandedForMobile;
  const linkProps = (item) => ({
    to: item.to,
    end: item.end,
    className: ({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`,
    onClick: onNavigate,
  });

  return (
    <nav className="sidebar-nav" aria-label="Navegación principal">
      <div className="sidebar-brand">
        <BrandMark compact={!showLabels} light />
        <button
          type="button"
          className="sidebar-collapse"
          onClick={onCollapse}
          aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'}
        >
          <FiChevronLeft />
        </button>
      </div>

      <div className="sidebar-nav__content">
        {navigationGroups.map((group) => (
          <div className="sidebar-group" key={group.label}>
            {showLabels && <p className="sidebar-group__label">{group.label}</p>}
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink {...linkProps(item)} key={item.to} title={collapsed ? item.label : undefined}>
                  <Icon aria-hidden="true" />
                  {showLabels && <span>{item.label}</span>}
                </NavLink>
              );
            })}
          </div>
        ))}
      </div>

      <div className="sidebar-support">
        <a href={SUPPORT_WHATSAPP_URL} target="_blank" rel="noreferrer" title={collapsed ? 'Soporte por WhatsApp' : undefined}>
          <span className="sidebar-support__icon"><FiHeadphones /></span>
          {showLabels && (
            <span>
              <strong>¿Necesitás ayuda?</strong>
              <small>Escribinos por WhatsApp</small>
              <small>{SUPPORT_PHONE_DISPLAY}</small>
            </span>
          )}
        </a>
      </div>

      {showLabels && (
        <div className="sidebar-footer">
          <span className="status-dot" />
          Servicios conectados
        </div>
      )}
    </nav>
  );
};

export default NavBar;
