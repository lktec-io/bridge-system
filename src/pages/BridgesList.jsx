import { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  FiPlus, FiRefreshCw, FiAlertOctagon, FiDatabase, FiGrid, FiList,
} from 'react-icons/fi';
import { bridgesAPI } from '../api/bridges';
import { useAuth } from '../context/AuthContext';
import BridgeSearch  from '../components/bridges/BridgeSearch';
import BridgeTable   from '../components/bridges/BridgeTable';
import BridgeCard    from '../components/bridges/BridgeCard';
import ConfirmDialog from '../components/ui/ConfirmDialog';

export default function BridgesList() {
  const { isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [bridges,     setBridges]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [deleteId,    setDeleteId]    = useState(null);
  const [deleting,    setDeleting]    = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [view,        setView]        = useState('table');

  const [search,     setSearch]     = useState(searchParams.get('search')     || '');
  const [condition,  setCondition]  = useState(searchParams.get('condition')  || '');
  const [dateFilter, setDateFilter] = useState(searchParams.get('dateFilter') || '');
  const [sortBy,     setSortBy]     = useState(searchParams.get('sortBy')     || 'created');

  const fetchBridges = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const { data } = await bridgesAPI.getAll(params);
      setBridges(Array.isArray(data) ? data : (data.bridges ?? []));
    } catch {
      setBridges([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBridges({ search, condition, dateFilter, sortBy });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFilterChange = (key, value) => {
    if (key === 'search')     setSearch(value);
    if (key === 'condition')  setCondition(value);
    if (key === 'dateFilter') setDateFilter(value);
    if (key === 'sortBy')     setSortBy(value);
  };

  const applyFilters = () => {
    const params = {};
    if (search)     params.search     = search;
    if (condition)  params.condition  = condition;
    if (dateFilter) params.dateFilter = dateFilter;
    if (sortBy !== 'created') params.sortBy = sortBy;
    setSearchParams(params);
    fetchBridges(params);
  };

  const clearFilters = () => {
    setSearch(''); setCondition(''); setDateFilter(''); setSortBy('created');
    setSearchParams({});
    fetchBridges({});
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await bridgesAPI.delete(deleteId);
      setBridges((prev) => prev.filter((b) => b.id !== deleteId));
      setDeleteId(null);
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Failed to delete this structure. Please try again.');
      setDeleteId(null);
    } finally {
      setDeleting(false);
    }
  };

  const activeFilters = [search, condition, dateFilter].filter(Boolean).length;

  return (
    <div>
      {deleteError && (
        <div className="alert alert-error" style={{ marginBottom: 'var(--sp-4)' }}>
          <FiAlertOctagon size={15} />
          <span style={{ flex: 1 }}>{deleteError}</span>
          <button className="btn-close" onClick={() => setDeleteError('')}>×</button>
        </div>
      )}

      <div className="page-header">
        <div>
          <h2>Bridge Inventory</h2>
          <p>
            {loading ? 'Loading…' : `${bridges.length} structure(s) in scope`}
            {activeFilters > 0 && (
              <span className="chip chip-accent" style={{ marginLeft: 8 }}>
                {activeFilters} filter(s) active
              </span>
            )}
          </p>
        </div>
        <div className="toolbar no-print">
          <div className="seg">
            <button
              className={`seg-btn${view === 'table' ? ' active' : ''}`}
              onClick={() => setView('table')}
              title="Table view"
            >
              <FiList size={12} /> Table
            </button>
            <button
              className={`seg-btn${view === 'grid' ? ' active' : ''}`}
              onClick={() => setView('grid')}
              title="Card view"
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
        search={search}
        condition={condition}
        dateFilter={dateFilter}
        sortBy={sortBy}
        onChange={handleFilterChange}
        onApply={applyFilters}
        onClear={clearFilters}
      />

      {loading ? (
        <div className="loading-center">
          <div className="spinner" />
          <span>Loading inventory…</span>
        </div>
      ) : bridges.length === 0 ? (
        <div className="tile">
          <div className="empty-state">
            <FiDatabase />
            <h3>No structures found</h3>
            <p>
              {activeFilters > 0
                ? 'No structures match the current filters.'
                : 'No bridges have been registered in this system yet.'}
            </p>
            {activeFilters > 0
              ? (
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
      ) : view === 'table' ? (
        <BridgeTable bridges={bridges} isAdmin={isAdmin} onDelete={setDeleteId} />
      ) : (
        <div className="bridge-cards-grid">
          {bridges.map((b) => (
            <BridgeCard key={b.id} bridge={b} isAdmin={isAdmin} onDelete={setDeleteId} />
          ))}
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
