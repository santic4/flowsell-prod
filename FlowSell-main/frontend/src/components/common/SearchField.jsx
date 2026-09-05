import { FiSearch, FiX } from 'react-icons/fi';

const SearchField = ({ value, onChange, placeholder = 'Buscar…', label = 'Buscar' }) => (
  <label className="search-field">
    <span className="sr-only">{label}</span>
    <FiSearch aria-hidden="true" />
    <input value={value} onChange={onChange} placeholder={placeholder} type="search" />
    {value && (
      <button type="button" onClick={() => onChange({ target: { value: '' } })} aria-label="Limpiar búsqueda">
        <FiX />
      </button>
    )}
  </label>
);

export default SearchField;
