import PropTypes from 'prop-types';
import { FiPackage, FiX } from 'react-icons/fi';

const SelectedItemsList = ({ items, onRemove }) => (
  <div className="selected-products">
    <div className="selected-products__heading"><span><FiPackage /> Seleccionadas</span><strong>{items.length}</strong></div>
    {items.length > 0 && (
      <div className="selected-products__chips">
        {items.map((item) => (
          <span key={item.id}>{item.title}<button type="button" onClick={() => onRemove(item.id)} aria-label={`Quitar ${item.title}`}><FiX /></button></span>
        ))}
      </div>
    )}
  </div>
);

SelectedItemsList.propTypes = {
  items: PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.string.isRequired, title: PropTypes.string })).isRequired,
  onRemove: PropTypes.func.isRequired,
};

export default SelectedItemsList;
