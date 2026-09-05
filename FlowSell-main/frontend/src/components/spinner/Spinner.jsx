import PropTypes from 'prop-types';
import { ClipLoader } from 'react-spinners';

const Spinner = ({ loading, color = '#007bff', size = 50 }) => {
  if (!loading) return null;

  return (
    <div className="spinner-container" role="status" aria-label="Cargando">
      <ClipLoader color={color} size={size} />
    </div>
  );
};

Spinner.propTypes = {
  loading: PropTypes.bool,
  color: PropTypes.string,
  size: PropTypes.number,
};

Spinner.defaultProps = {
  loading: true,
};

export default Spinner;
