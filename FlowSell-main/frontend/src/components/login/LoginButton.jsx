import { useEffect } from "react";
import { REACT_APP_HOST_HOOKS } from "../../config/config.js";
import { useNavigate } from 'react-router-dom';
import { FiArrowRight, FiBarChart2, FiCheck, FiMessageCircle, FiPackage, FiShield, FiZap } from 'react-icons/fi';
import BrandMark from '../common/BrandMark.jsx';
import { SUPPORT_WHATSAPP_URL } from '../../constants/support.js';

const LoginButton = ({ isAuthenticated }) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/app', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = () => {
    window.location.href = `${REACT_APP_HOST_HOOKS}/api/auth/login`;
  };

  return (
    <main className="login-page">
      <section className="login-showcase">
        <div className="login-showcase__glow login-showcase__glow--one" />
        <div className="login-showcase__glow login-showcase__glow--two" />

        <div className="login-showcase__content">
          <BrandMark light />
          <div className="login-showcase__headline">
            <span className="login-kicker"><FiZap /> Operaciones que avanzan solas</span>
            <h1>Más control sobre cada venta. Menos trabajo repetitivo.</h1>
            <p>Centralizá publicaciones, mensajes posventa, campañas y métricas de Mercado Libre en un único espacio.</p>
          </div>

          <div className="login-benefits">
            <div><FiMessageCircle /><span><strong>Mensajes automáticos</strong><small>Configurados por publicación</small></span></div>
            <div><FiBarChart2 /><span><strong>Ventas visibles</strong><small>Indicadores claros por período</small></span></div>
            <div><FiPackage /><span><strong>Catálogo ordenado</strong><small>Todo sincronizado con tu cuenta</small></span></div>
          </div>

          <div className="login-preview" aria-hidden="true">
            <div className="login-preview__top"><span /><span /><span /></div>
            <div className="login-preview__body">
              <div className="login-preview__metric"><small>Ventas del período</small><strong>$ 1.284.500</strong><span>+12,8%</span></div>
              <div className="login-preview__bars"><i /><i /><i /><i /><i /><i /><i /></div>
              <div className="login-preview__activity"><span><FiCheck /></span><div><strong>Automatización activa</strong><small>Mensaje posventa enviado</small></div><b>Ahora</b></div>
            </div>
          </div>
        </div>
      </section>

      <section className="login-access">
        <div className="login-access__inner">
          <div className="login-mobile-brand"><BrandMark /></div>
          <span className="login-access__eyebrow">Bienvenido a tu panel</span>
          <h2>Ingresá a Flow Sell</h2>
          <p className="login-access__description">Conectá la cuenta que usás para vender y empezá a gestionar tu operación.</p>

          <button className="meli-login-button" onClick={handleLogin} type="button">
            <span className="meli-login-button__handshake">ML</span>
            <span>Continuar con Mercado Libre</span>
            <FiArrowRight />
          </button>

          <div className="login-security">
            <FiShield />
            <p><strong>Acceso protegido</strong><span>La autorización se realiza directamente con Mercado Libre. Flow Sell no solicita tu contraseña.</span></p>
          </div>

          <div className="login-divider"><span>¿Necesitás ayuda para ingresar?</span></div>
          <a className="login-support-link" href={SUPPORT_WHATSAPP_URL} target="_blank" rel="noreferrer">
            <FiMessageCircle /> Hablar con soporte por WhatsApp
          </a>

          <footer className="login-footer">© {new Date().getFullYear()} Flow Sell · Gestión inteligente para vendedores</footer>
        </div>
      </section>
    </main>
  );
};

export default LoginButton;
