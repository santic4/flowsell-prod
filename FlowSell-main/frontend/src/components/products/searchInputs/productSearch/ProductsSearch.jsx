import PropTypes from "prop-types";
import SearchField from '../../../common/SearchField.jsx';

const ProductSearch = ({ value, onChange, placeholder }) => {
  return <SearchField value={value} onChange={onChange} placeholder={placeholder} label="Buscar publicación" />;
};

ProductSearch.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
};

ProductSearch.defaultProps = {
  placeholder: "Buscar por nombre o ID...",
};

export default ProductSearch;
