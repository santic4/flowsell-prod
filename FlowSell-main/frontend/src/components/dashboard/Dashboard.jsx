import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { FiMessageCircle } from 'react-icons/fi';
import { ToastContainer } from 'react-toastify';
import NavBar from '../navbar/NavBar.jsx';
import Header from '../header/Header.jsx';
import { SUPPORT_WHATSAPP_URL } from '../../constants/support.js';

const Dashboard = ({ onLogout }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname]);

  return (
    <div className={`app-shell ${sidebarCollapsed ? 'app-shell--collapsed' : ''}`}>
      <aside className={`app-sidebar ${sidebarOpen ? 'app-sidebar--open' : ''}`}>
        <NavBar
          collapsed={sidebarCollapsed}
          expandedForMobile={sidebarOpen}
          onCollapse={() => setSidebarCollapsed((current) => !current)}
          onNavigate={() => setSidebarOpen(false)}
        />
      </aside>

      {sidebarOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Cerrar menú"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="app-workspace">
        <Header onMenuToggle={() => setSidebarOpen((current) => !current)} onLogout={onLogout} />
        <main className="app-main">
          <Outlet />
        </main>
      </div>

      <a
        className="support-fab"
        href={SUPPORT_WHATSAPP_URL}
        target="_blank"
        rel="noreferrer"
        aria-label="Abrir soporte por WhatsApp"
      >
        <FiMessageCircle />
        <span>Soporte</span>
      </a>

      <ToastContainer
        position="top-right"
        autoClose={3200}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        theme="light"
      />
    </div>
  );
};

export default Dashboard;
