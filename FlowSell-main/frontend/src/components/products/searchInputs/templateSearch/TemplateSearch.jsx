import PropTypes from "prop-types";
import SearchField from '../../../common/SearchField.jsx';

const TemplateSearch = ({ value, onChange, placeholder }) => {
  return <SearchField value={value} onChange={onChange} placeholder={placeholder} label="Buscar plantilla" />;
};

TemplateSearch.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
};

TemplateSearch.defaultProps = {
  placeholder: "Buscar por nombre...",
};

export default TemplateSearch;
