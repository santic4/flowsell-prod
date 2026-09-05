const PageHeader = ({ eyebrow, title, description, actions }) => (
  <header className="page-heading">
    <div className="page-heading__copy">
      {eyebrow && <span className="page-heading__eyebrow">{eyebrow}</span>}
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </div>
    {actions && <div className="page-heading__actions">{actions}</div>}
  </header>
);

export default PageHeader;
