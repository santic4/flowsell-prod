import { FiZap } from 'react-icons/fi';

const BrandMark = ({ compact = false, light = false }) => (
  <div className={`brand-mark ${compact ? 'brand-mark--compact' : ''} ${light ? 'brand-mark--light' : ''}`}>
    <span className="brand-mark__symbol" aria-hidden="true">
      <FiZap />
    </span>
    {!compact && (
      <span className="brand-mark__name">
        Flow <strong>Sell</strong>
      </span>
    )}
  </div>
);

export default BrandMark;
