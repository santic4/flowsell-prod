import { useState } from 'react';
import { FiLogOut } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { apiRequest } from '../../api/api.js';

const LogoutButton = ({ onLogout }) => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: '¿Cerrar sesión?',
      text: 'Podés volver a ingresar con tu cuenta de Mercado Libre cuando quieras.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Cerrar sesión',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#e5484d',
      cancelButtonColor: '#64748b',
    });

    if (!result.isConfirmed) return;

    setLoading(true);
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
      onLogout?.();
      navigate('/login', { replace: true });
    } catch (error) {
      Swal.fire('No pudimos cerrar la sesión', error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button type="button" className="profile-dropdown__item profile-dropdown__item--danger" onClick={handleLogout} disabled={loading} role="menuitem">
      <FiLogOut /> {loading ? 'Cerrando sesión…' : 'Cerrar sesión'}
    </button>
  );
};

export default LogoutButton;
