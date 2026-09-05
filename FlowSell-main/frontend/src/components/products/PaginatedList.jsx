import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

const PaginatedList = ({ items, searchTerm, itemsPerPage, renderItem, filterBy, emptyState }) => {
  const [currentPage, setCurrentPage] = useState(1);

  const filteredItems = useMemo(() => {
    const term = String(searchTerm || '').trim().toLowerCase();
    return items.filter((item) => {
      if (!term) return true;
      return filterBy.some((key) => String(item?.[key] ?? '').toLowerCase().includes(term));
    });
  }, [filterBy, items, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage));

  useEffect(() => {
    setCurrentPage(1);
  }, [items, searchTerm]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [currentPage, filteredItems, itemsPerPage]);

  const visiblePages = Array.from({ length: totalPages }, (_, index) => index + 1)
    .filter((page) => totalPages <= 7 || page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1);

  if (!filteredItems.length) return emptyState || null;

  return (
    <>
      <div className="paginated-grid">{currentItems.map((item) => renderItem(item))}</div>
      {totalPages > 1 && (
        <nav className="pagination" aria-label="Paginación">
          <button type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1} aria-label="Página anterior"><FiChevronLeft /></button>
          {visiblePages.map((page, index) => {
            const previousPage = visiblePages[index - 1];
            return (
              <span className="pagination__slot" key={page}>
                {previousPage && page - previousPage > 1 && <span className="pagination__ellipsis">…</span>}
                <button type="button" onClick={() => setCurrentPage(page)} className={currentPage === page ? 'pagination__active' : ''} aria-current={currentPage === page ? 'page' : undefined}>{page}</button>
              </span>
            );
          })}
          <button type="button" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={currentPage === totalPages} aria-label="Página siguiente"><FiChevronRight /></button>
          <span className="pagination__summary">{filteredItems.length} resultados</span>
        </nav>
      )}
    </>
  );
};

PaginatedList.propTypes = {
  items: PropTypes.array.isRequired,
  searchTerm: PropTypes.string,
  itemsPerPage: PropTypes.number,
  renderItem: PropTypes.func.isRequired,
  filterBy: PropTypes.arrayOf(PropTypes.string),
  emptyState: PropTypes.node,
};

PaginatedList.defaultProps = {
  searchTerm: '',
  itemsPerPage: 10,
  filterBy: ['title', 'id'],
  emptyState: null,
};

export default PaginatedList;
