import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { bridgesAPI } from '../api/bridges';
import { FiRefreshCw, FiMapPin } from 'react-icons/fi';
import { ConditionBadge } from '../components/ui/Badge';
import 'leaflet/dist/leaflet.css';

const COND_COLOR = {
  GOOD:        '#10b981',
  FAIR:        '#f59e0b',
  POOR:        '#ef4444',
  UNINSPECTED: '#94a3b8',
};

const LEGEND = [
  { label: 'Good',        color: '#10b981' },
  { label: 'Fair',        color: '#f59e0b' },
  { label: 'Poor',        color: '#ef4444' },
  { label: 'Uninspected', color: '#94a3b8' },
];

export default function MapView() {
  const [bridges, setBridges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const fetch = async () => {
    setLoading(true); setError('');
    try {
      const { data } = await bridgesAPI.getAll();
      setBridges(Array.isArray(data) ? data : (data.bridges ?? []));
    } catch {
      setError('Failed to load bridge data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  const withCoords = bridges.filter(b => b.northing && b.easting);
  const center = withCoords.length > 0
    ? [Number(withCoords[0].northing), Number(withCoords[0].easting)]
    : [0, 35]; // default: Africa centre

  const condOf = (b) => b.inspections?.[0]?.conditionStatus ?? 'UNINSPECTED';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header */}
      <div className="page-header">
        <div>
          <h2>Bridge Map</h2>
          <p>
            {withCoords.length} of {bridges.length} bridge(s) have GPS coordinates
          </p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={fetch} disabled={loading}>
          <FiRefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Legend */}
      <div className="map-legend-bar">
        <FiMapPin size={13} style={{ color: 'var(--text-muted)' }} />
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Condition:</span>
        {LEGEND.map(({ label, color }) => (
          <span key={label} className="map-legend-item">
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block' }} />
            {label}
          </span>
        ))}
      </div>

      {/* Map */}
      <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
        {loading ? (
          <div className="loading-center" style={{ height: 480 }}>
            <div className="spinner" />
            <span>Loading bridge locations…</span>
          </div>
        ) : error ? (
          <div className="empty-state" style={{ height: 480 }}>
            <p>{error}</p>
            <button className="btn btn-primary btn-sm" onClick={fetch}>Retry</button>
          </div>
        ) : withCoords.length === 0 ? (
          <div className="empty-state" style={{ height: 480 }}>
            <FiMapPin size={40} style={{ opacity: .3 }} />
            <h3>No GPS data available</h3>
            <p>Add northing and easting coordinates to bridge records to display them on the map.</p>
          </div>
        ) : (
          <MapContainer
            center={center}
            zoom={10}
            style={{ height: 540, width: '100%' }}
            scrollWheelZoom
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />
            {withCoords.map((b) => {
              const cond  = condOf(b);
              const color = COND_COLOR[cond] ?? COND_COLOR.UNINSPECTED;
              return (
                <CircleMarker
                  key={b.id}
                  center={[Number(b.northing), Number(b.easting)]}
                  radius={10}
                  pathOptions={{
                    color:       color,
                    fillColor:   color,
                    fillOpacity: 0.88,
                    weight:      2,
                  }}
                >
                  <Popup>
                    <div style={{ minWidth: 160 }}>
                      <strong style={{ fontSize: 14 }}>{b.serialNumber}</strong>
                      {b.section  && <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{b.section}</div>}
                      {b.chainage && <div style={{ fontSize: 12, color: '#666' }}>Km {Number(b.chainage).toFixed(3)}</div>}
                      <div style={{ marginTop: 6 }}>
                        <ConditionBadge status={cond} />
                      </div>
                      <Link
                        to={`/bridges/${b.id}`}
                        style={{ display: 'block', marginTop: 8, fontSize: 12, color: '#1a56db', fontWeight: 600 }}
                      >
                        View Details →
                      </Link>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        )}
      </div>

      {/* Bridge list below map */}
      {withCoords.length > 0 && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Bridges on Map</div>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{withCoords.length} located</span>
          </div>
          <div className="table-wrapper">
            <table className="table table-compact">
              <thead>
                <tr>
                  <th>Serial No.</th>
                  <th>Section</th>
                  <th>Chainage</th>
                  <th>Condition</th>
                  <th>Coordinates</th>
                </tr>
              </thead>
              <tbody>
                {withCoords.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <Link to={`/bridges/${b.id}`} style={{ color: 'var(--primary)', fontWeight: 700 }}>
                        {b.serialNumber}
                      </Link>
                    </td>
                    <td className="muted">{b.section ?? '—'}</td>
                    <td className="muted">{b.chainage ? `Km ${Number(b.chainage).toFixed(3)}` : '—'}</td>
                    <td><ConditionBadge status={condOf(b)} /></td>
                    <td className="muted" style={{ fontSize: 12 }}>
                      N {Number(b.northing).toFixed(5)}, E {Number(b.easting).toFixed(5)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
