import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { FiChevronDown, FiHeadphones, FiMenu, FiUser } from 'react-icons/fi';
import useUserProfile from '../../hooks/useUserProfile.js';
import LogoutButton from '../login/Logout.jsx';
import { SUPPORT_WHATSAPP_URL } from '../../constants/support.js';

const getPageMeta = (pathname) => {
  if (pathname.includes('/statistics')) return { eyebrow: 'Rendimiento', title: 'Ventas y estadísticas' };
  if (pathname.includes('/products')) return { eyebrow: 'Catálogo', title: 'Publicaciones' };
  if (pathname.includes('/automations') || pathname.includes('/saved')) return { eyebrow: 'Automatización', title: 'Flujos automáticos' };
  if (pathname.includes('/templates')) return { eyebrow: 'Contenido', title: 'Plantillas' };
  if (pathname.includes('/massive-status')) return { eyebrow: 'Campañas', title: 'Estado del envío' };
  if (pathname.includes('/campaigns') || pathname.includes('/tracking')) return { eyebrow: 'Audiencias', title: 'Campañas' };
  return { eyebrow: 'Panel de control', title: 'Resumen' };
};

const Header = ({ onMenuToggle, onLogout }) => {
  const { user, loading, error } = useUserProfile();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const location = useLocation();
  const page = getPageMeta(location.pathname);

  useEffect(() => {
    const closeMenu = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', closeMenu);
    return () => document.removeEventListener('mousedown', closeMenu);
  }, []);

  const initial = user?.nickname?.charAt(0)?.toUpperCase() || 'U';

  return (
    <header className="topbar">
      <div className="topbar__page">
        <button type="button" className="topbar__menu-button" onClick={onMenuToggle} aria-label="Abrir menú">
          <FiMenu />
        </button>
        <div>
          <span>{page.eyebrow}</span>
          <h2>{page.title}</h2>
        </div>
      </div>

      <div className="topbar__actions">
        <a className="topbar__support" href={SUPPORT_WHATSAPP_URL} target="_blank" rel="noreferrer">
          <FiHeadphones />
          <span>Soporte</span>
        </a>

        <div className="profile-menu" ref={menuRef}>
          <button
            type="button"
            className="profile-trigger"
            onClick={() => setMenuOpen((current) => !current)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <span className="profile-avatar">
              {user?.picture ? <img src={user.picture} alt="" /> : initial}
            </span>
            <span className="profile-trigger__copy">
              <strong>{loading ? 'Cargando…' : user?.nickname || 'Mi cuenta'}</strong>
              <small><span className="status-dot" /> Mercado Libre conectado</small>
            </span>
            <FiChevronDown className={menuOpen ? 'profile-trigger__chevron--open' : ''} />
          </button>

          {menuOpen && (
            <div className="profile-dropdown" role="menu">
              <div className="profile-dropdown__identity">
                <span className="profile-avatar profile-avatar--large">
                  {user?.picture ? <img src={user.picture} alt="" /> : initial}
                </span>
                <div>
                  <strong>{user?.nickname || 'Cuenta de vendedor'}</strong>
                  <span>{user?.email || (error ? 'No se pudo cargar el perfil' : 'Cuenta Mercado Libre')}</span>
                  {user?.meliId && <small>ID de vendedor: {user.meliId}</small>}
                </div>
              </div>
              <a className="profile-dropdown__item" href={SUPPORT_WHATSAPP_URL} target="_blank" rel="noreferrer" role="menuitem">
                <FiHeadphones /> Contactar a soporte
              </a>
              <div className="profile-dropdown__item profile-dropdown__item--muted">
                <FiUser /> Sesión protegida
              </div>
              <LogoutButton onLogout={onLogout} />
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
