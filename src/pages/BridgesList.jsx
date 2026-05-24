import { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { bridgesAPI } from '../api/bridges';
import { useAuth } from '../context/AuthContext';
import { MdAdd, MdAccountBalance, MdRefresh, MdErrorOutline, MdClose } from 'react-icons/md';
import BridgeSearch from '../components/bridges/BridgeSearch';
import BridgeTable  from '../components/bridges/BridgeTable';
import ConfirmDialog from '../components/ui/ConfirmDialog';

export default function BridgesList() {
  const { isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [bridges,     setBridges]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [deleteId,    setDeleteId]    = useState(null);
  const [deleting,    setDeleting]    = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const [search,     setSearch]     = useState(searchParams.get('search')     || '');
  const [condition,  setCondition]  = useState(searchParams.get('condition')  || '');
  const [dateFilter, setDateFilter] = useState(searchParams.get('dateFilter') || '');
  const [sortBy,     setSortBy]     = useState(searchParams.get('sortBy')     || 'created');

  const fetchBridges = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const { data } = await bridgesAPI.getAll(params);
      setBridges(data);
    } catch { setBridges([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchBridges({ search, condition, dateFilter, sortBy });
  }, []); // eslint-disable-line

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
    } catch { setDeleteError('Failed to delete bridge. Please try again.'); setDeleteId(null); }
    finally { setDeleting(false); }
  };

  const activeFilters = [search, condition, dateFilter].filter(Boolean).length;

  return (
    <div>
      {deleteError && (
        <div className="alert alert-error" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <MdErrorOutline />
          <span style={{ flex: 1 }}>{deleteError}</span>
          <button className="btn-close" onClick={() => setDeleteError('')}><MdClose size={18} /></button>
        </div>
      )}
      <div className="page-header">
        <div>
          <h2>Bridge Registry</h2>
          <p>
            {loading ? 'Loading...' : `${bridges.length} bridge(s) found`}
            {activeFilters > 0 && (
              <span style={{ marginLeft: 8, fontSize: 12, background: 'var(--primary-light)', color: 'var(--primary)', padding: '2px 8px', borderRadius: 99, fontWeight: 700 }}>
                {activeFilters} filter(s) active
              </span>
            )}
          </p>
        </div>
        <Link to="/bridges/new" className="btn btn-primary"><MdAdd /> Register Bridge</Link>
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
        <div className="loading-center"><div className="spinner" /><span>Loading bridges...</span></div>
      ) : bridges.length === 0 ? (
        <div className="card">
          <div className="empty-state" style={{ padding: '60px 24px' }}>
            <MdAccountBalance />
            <h3>No bridges found</h3>
            <p>{activeFilters > 0 ? 'Try adjusting your filters.' : 'No bridges registered yet.'}</p>
            {activeFilters > 0
              ? <button className="btn btn-secondary btn-sm" onClick={clearFilters}><MdRefresh /> Clear Filters</button>
              : <Link to="/bridges/new" className="btn btn-primary btn-sm"><MdAdd /> Register First Bridge</Link>
            }
          </div>
        </div>
      ) : (
        <BridgeTable bridges={bridges} isAdmin={isAdmin} onDelete={setDeleteId} />
      )}

      <ConfirmDialog
        open={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Bridge"
        message="Delete this bridge and all its inspections, photos, and history? This cannot be undone."
        confirmLabel="Delete Bridge"
        loading={deleting}
      />
    </div>
  );
}
