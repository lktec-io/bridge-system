import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import {
  FiRefreshCw, FiMapPin, FiCalendar, FiUser, FiExternalLink, FiAlertTriangle,
} from 'react-icons/fi';
import { bridgesAPI } from '../api/bridges';
import { ConditionBadge } from '../components/ui/Badge';
import { fmtDate } from '../utils/format';
import 'leaflet/dist/leaflet.css';

const PIN = {
  GOOD:        '#16A34A',
  FAIR:        '#EAB308',
  POOR:        '#DC2626',
  UNINSPECTED: '#94A3B8',
};

const LEGEND = [
  { key: 'GOOD', cls: 'safe',     label: 'Safe' },
  { key: 'FAIR', cls: 'watch',    label: 'Needs inspection' },
  { key: 'POOR', cls: 'critical', label: 'Critical' },
  { key: 'UNINSPECTED', cls: 'unknown', label: 'Uninspected' },
];

const conditionOf = (b) => b.inspections?.[0]?.conditionStatus ?? 'UNINSPECTED';

function FitToPins({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) map.setView(points[0], 12);
    else map.fitBounds(points, { padding: [30, 30], maxZoom: 13 });
  }, [points, map]);
  return null;
}

export default function MapView() {
  const [bridges, setBridges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [filter,  setFilter]  = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const { data } = await bridgesAPI.getAll();
      setBridges(Array.isArray(data) ? data : (data.bridges ?? []));
    } catch {
      setError('Failed to load structure positions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const located = bridges.filter((b) => b.northing && b.easting);
  const shown   = filter ? located.filter((b) => conditionOf(b) === filter) : located;
  const points  = shown.map((b) => [Number(b.northing), Number(b.easting)]);

  const counts = bridges.reduce((acc, b) => {
    const c = conditionOf(b);
    acc[c] = (acc[c] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>GIS Bridge Map</h2>
          <p>
            {loading
              ? 'Loading…'
              : `${located.length} of ${bridges.length} structure(s) carry GPS coordinates`}
          </p>
        </div>
        <button className="btn btn-ghost btn-sm no-print" onClick={load} disabled={loading}>
          <FiRefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Legend acts as a condition filter */}
      <div className="map-legend-bar" style={{ marginBottom: 'var(--sp-3)' }}>
        <FiMapPin size={13} style={{ color: 'var(--text-muted)' }} />
        <span className="label-tech">Condition</span>
        <div className="seg">
          <button className={`seg-btn${filter === '' ? ' active' : ''}`} onClick={() => setFilter('')}>
            All ({located.length})
          </button>
          {LEGEND.map(({ key, label }) => (
            <button
              key={key}
              className={`seg-btn${filter === key ? ' active' : ''}`}
              onClick={() => setFilter(key)}
            >
              {label} ({counts[key] ?? 0})
            </button>
          ))}
        </div>
        <span className="toolbar-spacer" />
        {LEGEND.map(({ key, cls, label }) => (
          <span key={key} className="gis-legend-item">
            <span className={`gis-pin ${cls}`} /> {label}
          </span>
        ))}
      </div>

      {/* Viewport */}
      <div className="gis-hub" style={{ marginBottom: 'var(--sp-4)' }}>
        <div className="gis-viewport" style={{ height: 'clamp(340px, 58vh, 620px)' }}>
          {loading ? (
            <div className="loading-center" style={{ height: '100%' }}>
              <div className="spinner" /><span>Acquiring positions…</span>
            </div>
          ) : error ? (
            <div className="empty-state" style={{ height: '100%' }}>
              <FiAlertTriangle />
              <h3>Position data unavailable</h3>
              <p>{error}</p>
              <button className="btn btn-primary btn-sm" onClick={load}>Retry</button>
            </div>
          ) : shown.length === 0 ? (
            <div className="empty-state" style={{ height: '100%' }}>
              <FiMapPin />
              <h3>{located.length === 0 ? 'No GPS data recorded' : 'No structures in this condition'}</h3>
              <p>
                {located.length === 0
                  ? 'Add northing and easting values to structure records to plot them here.'
                  : 'Clear the condition filter to see the full network.'}
              </p>
              {located.length > 0 && (
                <button className="btn btn-secondary btn-sm" onClick={() => setFilter('')}>Show all</button>
              )}
            </div>
          ) : (
            <MapContainer center={points[0]} zoom={10} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap contributors"
              />
              <FitToPins points={points} />
              {shown.map((b) => {
                const cond  = conditionOf(b);
                const color = PIN[cond] ?? PIN.UNINSPECTED;
                const ins   = b.inspections?.[0];
                return (
                  <CircleMarker
                    key={b.id}
                    center={[Number(b.northing), Number(b.easting)]}
                    radius={cond === 'POOR' ? 11 : 9}
                    pathOptions={{ color, fillColor: color, fillOpacity: .85, weight: 2 }}
                  >
                    <Popup minWidth={210}>
                      <div className="map-popup">
                        <div className="map-popup-header">
                          <span className="map-popup-serial">{b.serialNumber}</span>
                          <ConditionBadge status={cond} />
                        </div>
                        {b.section && (
                          <div className="map-popup-row">
                            <FiMapPin size={11} />
                            <span>
                              {b.section}
                              {b.chainage != null ? ` — Km ${Number(b.chainage).toFixed(3)}` : ''}
                            </span>
                          </div>
                        )}
                        {ins?.inspectionDate && (
                          <div className="map-popup-row">
                            <FiCalendar size={11} /><span>{fmtDate(ins.inspectionDate)}</span>
                          </div>
                        )}
                        {ins?.inspectorName && (
                          <div className="map-popup-row">
                            <FiUser size={11} /><span>{ins.inspectorName}</span>
                          </div>
                        )}
                        <Link to={`/bridges/${b.id}`} className="map-popup-link">
                          <FiExternalLink size={11} /> Open structure profile
                        </Link>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          )}
        </div>
      </div>

      {/* Coordinate register */}
      {shown.length > 0 && (
        <section className="ops-panel">
          <div className="ops-head">
            <span className="ops-title">
              <FiMapPin size={14} /> Coordinate Register
              <span className="ops-count">{shown.length}</span>
            </span>
          </div>
          <div className="ops-scroll">
            <table className="table table-compact ops-table">
              <thead>
                <tr>
                  <th>Bridge ID</th>
                  <th>Region / Location</th>
                  <th className="num">Chainage</th>
                  <th>Condition</th>
                  <th className="num">Northing</th>
                  <th className="num">Easting</th>
                  <th className="num">Altitude</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((b) => (
                  <tr key={b.id} className={conditionOf(b) === 'POOR' ? 'row-poor' : ''}>
                    <td>
                      <Link to={`/bridges/${b.id}`} className="serial-link">{b.serialNumber}</Link>
                    </td>
                    <td className="muted">{b.section ?? '—'}</td>
                    <td className="num">{b.chainage != null ? `Km ${Number(b.chainage).toFixed(3)}` : '—'}</td>
                    <td><ConditionBadge status={conditionOf(b)} /></td>
                    <td className="num coord">{Number(b.northing).toFixed(6)}</td>
                    <td className="num coord">{Number(b.easting).toFixed(6)}</td>
                    <td className="num coord">{b.altitude != null ? `${Number(b.altitude).toFixed(2)} m` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
