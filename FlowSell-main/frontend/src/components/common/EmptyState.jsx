const EmptyState = ({ icon: Icon, title, description, action }) => (
  <div className="empty-state">
    {Icon && (
      <span className="empty-state__icon" aria-hidden="true">
        <Icon />
      </span>
    )}
    <h3>{title}</h3>
    {description && <p>{description}</p>}
    {action}
  </div>
);

export default EmptyState;
