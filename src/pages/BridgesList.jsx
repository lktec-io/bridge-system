import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  FiPlus, FiRefreshCw, FiAlertOctagon, FiDatabase, FiGrid, FiList,
} from 'react-icons/fi';
import { bridgesAPI } from '../api/bridges';
import { useAuth } from '../context/AuthContext';
import usePaginatedQuery from '../hooks/usePaginatedQuery';
import BridgeSearch  from '../components/bridges/BridgeSearch';
import BridgeTable   from '../components/bridges/BridgeTable';
import BridgeCard    from '../components/bridges/BridgeCard';
import Pagination    from '../components/ui/Pagination';
import ConfirmDialog from '../components/ui/ConfirmDialog';

const DEFAULTS = {
  page: 1, limit: 25, search: '', condition: '', dateFilter: '',
  sortBy: 'created', sortDir: 'desc',
};

/* Only non-default values go in the URL, so a shared link stays readable. */
function paramsToSearch(params) {
  const out = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== '' && v !== null && v !== undefined && String(v) !== String(DEFAULTS[k])) out[k] = String(v);
  }
  return out;
}

function searchToParams(searchParams) {
  const next = { ...DEFAULTS };
  for (const key of Object.keys(DEFAULTS)) {
    const raw = searchParams.get(key);
    if (raw === null) continue;
    next[key] = key === 'page' || key === 'limit' ? Number(raw) || DEFAULTS[key] : raw;
  }
  return next;
}

export default function BridgesList() {
  const { isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [params, setParams] = useState(() => searchToParams(searchParams));
  const [view, setView] = useState('table');

  const [deleteId,    setDeleteId]    = useState(null);
  const [deleting,    setDeleting]    = useState(false);
  const [deleteError, setDeleteError] = useState('');

  /* Server does the filtering, sorting and paging; the hook debounces typing
     and aborts superseded requests. */
  const { rows, total, page, pages, limit, loading, error, refetch } =
    usePaginatedQuery(bridgesAPI.getAll, params);

  // Keep the URL in step so the view is shareable and survives a reload
  useEffect(() => {
    setSearchParams(paramsToSearch(params), { replace: true });
  }, [params, setSearchParams]);

  // Any filter change resets to page 1 — staying on page 7 of a new result set
  // would show an empty table.
  const patch = useCallback((changes) => {
    setParams((prev) => ({ ...prev, ...changes, page: 'page' in changes ? changes.page : 1 }));
  }, []);

  const clearFilters = useCallback(() => setParams(DEFAULTS), []);

  const handleSort = useCallback((sortBy, sortDir) => patch({ sortBy, sortDir }), [patch]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await bridgesAPI.delete(deleteId);
      setDeleteId(null);
      refetch();
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Failed to delete this structure.');
      setDeleteId(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      {(deleteError || error) && (
        <div className="alert alert-error" style={{ marginBottom: 'var(--sp-4)' }}>
          <FiAlertOctagon size={15} />
          <span style={{ flex: 1 }}>{deleteError || error}</span>
          <button className="btn-close" onClick={() => setDeleteError('')}>×</button>
        </div>
      )}

      <div className="page-header">
        <div>
          <h2>Bridge Inventory</h2>
          <p>
            {loading && total === 0
              ? 'Querying…'
              : `${total} structure(s) · page ${page} of ${pages}`}
          </p>
        </div>
        <div className="toolbar no-print">
          <div className="seg">
            <button
              className={`seg-btn${view === 'table' ? ' active' : ''}`}
              onClick={() => setView('table')}
            >
              <FiList size={12} /> Table
            </button>
            <button
              className={`seg-btn${view === 'grid' ? ' active' : ''}`}
              onClick={() => setView('grid')}
            >
              <FiGrid size={12} /> Cards
            </button>
          </div>
          <Link to="/bridges/new" className="btn btn-primary btn-sm">
            <FiPlus size={13} /> Register structure
          </Link>
        </div>
      </div>

      <BridgeSearch
        values={params}
        onChange={patch}
        onClear={clearFilters}
        resultCount={total}
        loading={loading}
      />

      {loading && rows.length === 0 ? (
        <div className="loading-center">
          <div className="spinner" />
          <span>Querying inventory…</span>
        </div>
      ) : rows.length === 0 ? (
        <div className="tile">
          <div className="empty-state">
            <FiDatabase />
            <h3>No structures found</h3>
            <p>
              {params.search || params.condition || params.dateFilter
                ? 'No structures match the current filters.'
                : 'No bridges have been registered in this system yet.'}
            </p>
            {params.search || params.condition || params.dateFilter ? (
              <button className="btn btn-secondary btn-sm" onClick={clearFilters}>
                <FiRefreshCw size={12} /> Clear filters
              </button>
            ) : (
              <Link to="/bridges/new" className="btn btn-primary btn-sm">
                <FiPlus size={13} /> Register first structure
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div style={{ opacity: loading ? 0.6 : 1, transition: 'opacity 120ms' }}>
          {view === 'table' ? (
            <BridgeTable
              bridges={rows}
              isAdmin={isAdmin}
              onDelete={setDeleteId}
              sortBy={params.sortBy}
              sortDir={params.sortDir}
              onSort={handleSort}
            />
          ) : (
            <div className="bridge-cards-grid">
              {rows.map((b) => (
                <BridgeCard key={b.id} bridge={b} isAdmin={isAdmin} onDelete={setDeleteId} />
              ))}
            </div>
          )}

          <Pagination
            page={page}
            pages={pages}
            total={total}
            limit={limit}
            loading={loading}
            unit="structure"
            onPage={(p) => patch({ page: p })}
            onLimit={(l) => patch({ limit: l })}
          />
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Hard delete structure"
        message="Delete this structure together with every inspection, photograph, maintenance record and history entry attached to it? This is a hard delete and cannot be undone."
        confirmLabel="Hard delete"
        loading={deleting}
      />
    </div>
  );
}
