import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import {
  FiMapPin, FiCalendar, FiUser, FiExternalLink, FiRefreshCw, FiAlertTriangle,
} from 'react-icons/fi';
import { ConditionBadge } from '../ui/Badge';
import { fmtDate } from '../../utils/format';
import 'leaflet/dist/leaflet.css';

/* Pin colours must be literal — Leaflet paints to canvas/SVG, not CSS. */
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

const conditionOf = (b) => b.inspections?.[0]?.conditionStatus ?? 'UNINSPECTED';

/* Frame all pins on load without hard-coding a centre or zoom.
   Moving the map is a side effect, so it belongs in an effect, not a memo. */
function FitToPins({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) map.setView(points[0], 12);
    else map.fitBounds(points, { padding: [28, 28], maxZoom: 13 });
  }, [points, map]);
  return null;
}

export default function GisHub({ bridges = [], loading, error, onRetry, healthIndex }) {
  const located = bridges.filter((b) => b.northing && b.easting);
  const points  = located.map((b) => [Number(b.northing), Number(b.easting)]);

  const counts = bridges.reduce((acc, b) => {
    const c = conditionOf(b);
    acc[c] = (acc[c] ?? 0) + 1;
    return acc;
  }, {});

  const critical = bridges
    .filter((b) => conditionOf(b) === 'POOR')
    .slice(0, 6);

  return (
    <div className="gis-grid">

      {/* ── Viewport ─────────────────────────────────────── */}
      <section className="gis-hub" aria-label="Geospatial bridge tracking">
        <div className="gis-toolbar">
          <span className="card-title">Geospatial Asset Tracking</span>
          <span className="toolbar">
            <span className="chip">
              <span className="mono">{located.length}</span>&nbsp;/&nbsp;
              <span className="mono">{bridges.length}</span>&nbsp;located
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
          ) : located.length === 0 ? (
            <div className="empty-state" style={{ height: '100%' }}>
              <FiMapPin />
              <h3>No coordinates recorded</h3>
              <p>
                Add northing and easting values to bridge records to plot them on the
                tracking grid.
              </p>
              <Link to="/bridges" className="btn btn-secondary btn-sm">Open inventory</Link>
            </div>
          ) : (
            <MapContainer center={points[0]} zoom={10} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap contributors"
              />
              <FitToPins points={points} />
              {located.map((b) => {
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
                        {b.structureType && (
                          <div className="map-popup-row">
                            <span className="label-tech">Type</span>
                            <span>{b.structureType}</span>
                          </div>
                        )}
                        {ins?.inspectionDate && (
                          <div className="map-popup-row">
                            <FiCalendar size={11} />
                            <span>{fmtDate(ins.inspectionDate)}</span>
                          </div>
                        )}
                        {ins?.inspectorName && (
                          <div className="map-popup-row">
                            <FiUser size={11} />
                            <span>{ins.inspectorName}</span>
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

        <div className="gis-legend">
          {LEGEND.map(({ key, cls, label }) => (
            <span key={key} className="gis-legend-item">
              <span className={`gis-pin ${cls}`} />
              {label}
              <span className="gis-legend-count">{counts[key] ?? 0}</span>
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
              <span className="v">{counts.GOOD ?? 0}</span>
            </div>
            <div className="gis-stat-row">
              <span className="k"><span className="gis-pin watch" /> Needs inspection</span>
              <span className="v">{counts.FAIR ?? 0}</span>
            </div>
            <div className="gis-stat-row">
              <span className="k"><span className="gis-pin critical" /> Critical</span>
              <span className="v">{counts.POOR ?? 0}</span>
            </div>
            <div className="gis-stat-row">
              <span className="k"><span className="gis-pin unknown" /> Uninspected</span>
              <span className="v">{counts.UNINSPECTED ?? 0}</span>
            </div>
            <div className="gis-stat-row">
              <span className="k">Missing coordinates</span>
              <span className="v">{bridges.length - located.length}</span>
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
