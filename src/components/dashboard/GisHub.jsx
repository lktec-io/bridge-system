import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import {
  FiMapPin, FiExternalLink, FiRefreshCw, FiAlertTriangle,
} from 'react-icons/fi';
import { ConditionBadge } from '../ui/Badge';
import { fmtDate } from '../../utils/format';
import 'leaflet/dist/leaflet.css';

/* Pin colours must be literal — Leaflet paints to SVG, not through CSS. */
const PIN = {
  GOOD:        '#16A34A',   // safe
  FAIR:        '#EAB308',   // needs inspection
  POOR:        '#DC2626',   // critical / structural weakness
  UNINSPECTED: '#94A3B8',
};

const LEGEND = [
  { key: 'GOOD',        cls: 'safe',     label: 'Safe' },
  { key: 'FAIR',        cls: 'watch',    label: 'Needs inspection' },
  { key: 'POOR',        cls: 'critical', label: 'Critical' },
  { key: 'UNINSPECTED', cls: 'unknown',  label: 'Uninspected' },
];

/* Frame all pins without hard-coding a centre or zoom. Moving the map is a
   side effect, so it belongs in an effect. */
function FitToPins({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) map.setView(points[0], 12);
    else map.fitBounds(points, { padding: [28, 28], maxZoom: 13 });
  }, [points, map]);
  return null;
}

/**
 * Section B — geospatial tracking.
 *
 * Consumes `/api/bridges/positions`: eight columns per located structure
 * instead of the full inventory record set. Portfolio counts come from the
 * dashboard aggregate, so they cover every structure — including those with no
 * coordinates, which by definition cannot appear on the map.
 */
export default function GisHub({
  positions = [], conditionCounts = {}, poorBridges = [], totalBridges = 0,
  healthIndex, loading, error, onRetry,
}) {
  const points = positions.map((p) => [Number(p.northing), Number(p.easting)]);
  const missingCoords = Math.max(totalBridges - positions.length, 0);
  const critical = poorBridges.slice(0, 6);

  return (
    <div className="gis-grid">

      {/* ── Viewport ─────────────────────────────────────── */}
      <section className="gis-hub" aria-label="Geospatial bridge tracking">
        <div className="gis-toolbar">
          <span className="card-title">Geospatial Asset Tracking</span>
          <span className="toolbar">
            <span className="chip">
              <span className="mono">{positions.length}</span>&nbsp;/&nbsp;
              <span className="mono">{totalBridges}</span>&nbsp;located
            </span>
            {onRetry && (
              <button className="btn btn-ghost btn-sm no-print" onClick={onRetry} disabled={loading}>
                <FiRefreshCw size={12} /> Sync
              </button>
            )}
          </span>
        </div>

        <div className="gis-viewport">
          {loading ? (
            <div className="loading-center" style={{ height: '100%' }}>
              <div className="spinner" />
              <span>Acquiring asset positions…</span>
            </div>
          ) : error ? (
            <div className="empty-state" style={{ height: '100%' }}>
              <FiAlertTriangle />
              <h3>Position data unavailable</h3>
              <p>{error}</p>
              {onRetry && <button className="btn btn-primary btn-sm" onClick={onRetry}>Retry</button>}
            </div>
          ) : positions.length === 0 ? (
            <div className="empty-state" style={{ height: '100%' }}>
              <FiMapPin />
              <h3>No coordinates recorded</h3>
              <p>Add northing and easting values to structure records to plot them on the tracking grid.</p>
              <Link to="/bridges" className="btn btn-secondary btn-sm">Open inventory</Link>
            </div>
          ) : (
            <MapContainer center={points[0]} zoom={10} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap contributors"
              />
              <FitToPins points={points} />
              {positions.map((p) => {
                const color = PIN[p.condition] ?? PIN.UNINSPECTED;
                return (
                  <CircleMarker
                    key={p.id}
                    center={[Number(p.northing), Number(p.easting)]}
                    radius={p.condition === 'POOR' ? 11 : 9}
                    pathOptions={{ color, fillColor: color, fillOpacity: .85, weight: 2 }}
                  >
                    <Popup minWidth={210}>
                      <div className="map-popup">
                        <div className="map-popup-header">
                          <span className="map-popup-serial">{p.serialNumber}</span>
                          <ConditionBadge status={p.condition} />
                        </div>
                        {p.bridgeName && (
                          <div className="map-popup-row"><span>{p.bridgeName}</span></div>
                        )}
                        {p.section && (
                          <div className="map-popup-row">
                            <FiMapPin size={11} />
                            <span>
                              {p.section}
                              {p.chainage != null ? ` — Km ${Number(p.chainage).toFixed(3)}` : ''}
                            </span>
                          </div>
                        )}
                        {p.structureType && (
                          <div className="map-popup-row"><span className="muted">{p.structureType}</span></div>
                        )}
                        <Link to={`/bridges/${p.id}`} className="map-popup-link">
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

        <div className="gis-legend">
          {LEGEND.map(({ key, cls, label }) => (
            <span key={key} className="gis-legend-item">
              <span className={`gis-pin ${cls}`} />
              {label}
              <span className="gis-legend-count">{conditionCounts[key] ?? 0}</span>
            </span>
          ))}
        </div>
      </section>

      {/* ── Side rail ────────────────────────────────────── */}
      <aside className="gis-side">
        <div className="tile">
          <div className="card-header">
            <span className="card-title">Portfolio State</span>
          </div>
          <div className="gis-stat-list">
            <div className="gis-stat-row">
              <span className="k">Structural health index</span>
              <span className="v">{healthIndex ?? '—'}{healthIndex != null ? '%' : ''}</span>
            </div>
            <div className="gis-stat-row">
              <span className="k"><span className="gis-pin safe" /> Safe</span>
              <span className="v">{conditionCounts.GOOD ?? 0}</span>
            </div>
            <div className="gis-stat-row">
              <span className="k"><span className="gis-pin watch" /> Needs inspection</span>
              <span className="v">{conditionCounts.FAIR ?? 0}</span>
            </div>
            <div className="gis-stat-row">
              <span className="k"><span className="gis-pin critical" /> Critical</span>
              <span className="v">{conditionCounts.POOR ?? 0}</span>
            </div>
            <div className="gis-stat-row">
              <span className="k"><span className="gis-pin unknown" /> Uninspected</span>
              <span className="v">{conditionCounts.UNINSPECTED ?? 0}</span>
            </div>
            <div className="gis-stat-row">
              <span className="k">Missing coordinates</span>
              <span className="v">{missingCoords}</span>
            </div>
          </div>
        </div>

        <div className="tile" style={{ flex: 1, minHeight: 0 }}>
          <div className="card-header">
            <span className="card-title">Critical Watchlist</span>
            <Link to="/bridges?condition=POOR" className="btn btn-ghost btn-sm no-print">All</Link>
          </div>
          {critical.length === 0 ? (
            <div className="empty-state" style={{ padding: 'var(--sp-5)' }}>
              <p>No structures in critical condition.</p>
            </div>
          ) : (
            <div className="watchlist">
              {critical.map((b) => (
                <Link key={b.id} to={`/bridges/${b.id}`} className="watch-item">
                  <span className="watch-rule" aria-hidden="true" />
                  <span className="watch-body">
                    <span className="watch-serial">{b.serialNumber}</span>
                    <span className="watch-meta">
                      {b.section ?? '—'}
                      {b.inspections?.[0]?.inspectionDate ? ` · ${fmtDate(b.inspections[0].inspectionDate)}` : ''}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
