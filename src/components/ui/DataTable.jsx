import { useState, useMemo } from 'react';
import { Search, ChevronUp, ChevronDown, ChevronsUpDown, Inbox, ChevronLeft, ChevronRight } from 'lucide-react';
import './DataTable.css';

const PAGE_SIZE = 15;

export default function DataTable({
  title,
  columns,
  data = [],
  searchPlaceholder = 'Buscar...',
  searchKeys = [],
  actions,
  loading = false,
  emptyMessage = 'Nenhum registro encontrado',
  onRowClick,
}) {
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(0);

  // Filter
  const filtered = useMemo(() => {
    if (!search.trim() || searchKeys.length === 0) return data;
    const term = search.toLowerCase();
    return data.filter(row =>
      searchKeys.some(key => {
        const val = key.split('.').reduce((o, k) => o?.[k], row);
        return val?.toString().toLowerCase().includes(term);
      })
    );
  }, [data, search, searchKeys]);

  // Sort
  const sorted = useMemo(() => {
    if (!sortCol) return filtered;
    const col = columns.find(c => c.key === sortCol);
    return [...filtered].sort((a, b) => {
      let va = col?.sortKey ? col.sortKey(a) : a[sortCol];
      let vb = col?.sortKey ? col.sortKey(b) : b[sortCol];
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortAsc ? -1 : 1;
      if (va > vb) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [filtered, sortCol, sortAsc, columns]);

  // Paginate
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function handleSort(key) {
    if (sortCol === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortCol(key);
      setSortAsc(true);
    }
  }

  function SortIcon({ colKey }) {
    if (sortCol !== colKey) return <ChevronsUpDown size={12} />;
    return sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  }

  return (
    <div className="data-table-wrapper animate-slide-up">
      <div className="data-table-header">
        {title && <h3 className="data-table-title">{title}</h3>}
        <div className="data-table-actions">
          {searchKeys.length > 0 && (
            <div className="data-table-search">
              <Search size={14} />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(0); }}
              />
            </div>
          )}
          {actions}
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  className={sortCol === col.key ? 'sorted' : ''}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                  style={col.width ? { width: col.width } : {}}
                >
                  {col.label}
                  {col.sortable !== false && (
                    <span className="sort-icon">
                      <SortIcon colKey={col.key} />
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {columns.map((col, j) => (
                    <td key={j}>
                      <div
                        style={{
                          height: 14,
                          borderRadius: 4,
                          background: `linear-gradient(90deg, var(--shimmer-1) 25%, var(--shimmer-2) 50%, var(--shimmer-1) 75%)`,
                          backgroundSize: '200% 100%',
                          animation: 'shimmer 1.5s ease infinite',
                          width: `${60 + Math.random() * 40}%`,
                        }}
                      />
                    </td>
                  ))}
                </tr>
              ))
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <div className="data-table-empty">
                    <Inbox size={40} />
                    <p>{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginated.map((row, i) => (
                <tr
                  key={row.id || i}
                  onClick={() => onRowClick?.(row)}
                  style={onRowClick ? { cursor: 'pointer' } : {}}
                >
                  {columns.map(col => (
                    <td key={col.key} className={col.className || ''}>
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="data-table-footer">
          <span>
            {sorted.length} registro{sorted.length !== 1 ? 's' : ''} · Página{' '}
            {page + 1} de {totalPages}
          </span>
          <div className="data-table-pagination">
            <button
              className="data-table-page-btn"
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
            >
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i;
              } else if (page < 3) {
                pageNum = i;
              } else if (page > totalPages - 4) {
                pageNum = totalPages - 5 + i;
              } else {
                pageNum = page - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  className={`data-table-page-btn ${page === pageNum ? 'active' : ''}`}
                  onClick={() => setPage(pageNum)}
                >
                  {pageNum + 1}
                </button>
              );
            })}
            <button
              className="data-table-page-btn"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => p + 1)}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
