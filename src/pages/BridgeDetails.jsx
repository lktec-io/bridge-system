import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { bridgesAPI, inspectionsAPI, photosAPI } from '../api/bridges';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import {
  MdEdit, MdDelete, MdAdd, MdPhoto, MdHistory,
  MdFindInPage, MdMap, MdInfo, MdCloudUpload,
  MdErrorOutline, MdPrint, MdCheckCircle, MdWarning,
} from 'react-icons/md';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { ConditionBadge } from '../components/ui/Badge';
import InspectionCard from '../components/inspections/InspectionCard';
import InspectionHistory from '../components/inspections/InspectionHistory';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Modal from '../components/ui/Modal';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const condClass = (s) => ({ GOOD: 'good', FAIR: 'fair', POOR: 'poor' })[s] ?? 'none';
const photoUrl  = (p) => p?.photoUrl?.startsWith('http') ? p.photoUrl : `http://localhost:5000${p?.photoUrl}`;

export default function BridgeDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();

  const [bridge,       setBridge]       = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [tab,          setTab]          = useState('overview');
  const [deleteModal,  setDeleteModal]  = useState(false);
  const [deleting,     setDeleting]     = useState(false);
  const [resolving,    setResolving]    = useState(null);
  const [deleteInsId,  setDeleteInsId]  = useState(null);
  const [uploadType,   setUploadType]   = useState(null);
  const [uploadFile,   setUploadFile]   = useState(null);
  const [uploadLoading,setUploadLoading]= useState(false);
  const [uploadError,  setUploadError]  = useState('');

  const fetchBridge = async () => {
    setLoading(true);
    try {
      const { data } = await bridgesAPI.getById(id);
      setBridge(data);
    } catch {
      setBridge(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBridge(); }, [id]);

  const handleDeleteBridge = async () => {
    setDeleting(true);
    try { await bridgesAPI.delete(id); navigate('/bridges'); }
    catch { alert('Failed to delete bridge'); setDeleting(false); }
  };

  const handleResolve = async (insId) => {
    setResolving(insId);
    try {
      await inspectionsAPI.resolve(insId, user ? `${user.firstName} ${user.lastName}` : '');
      await fetchBridge();
    } catch { alert('Failed to mark as resolved'); }
    finally { setResolving(null); }
  };

  const handlePhotoUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile || !uploadType) return;
    setUploadLoading(true); setUploadError('');
    try {
      const fd = new FormData();
      fd.append('photo', uploadFile);
      fd.append('bridgeId', id);
      fd.append('photoType', uploadType);
      await photosAPI.upload(fd);
      await fetchBridge();
      setUploadType(null); setUploadFile(null);
    } catch (err) { setUploadError(err.response?.data?.message || 'Upload failed'); }
    finally { setUploadLoading(false); }
  };

  const handlePhotoDelete = async (photoId) => {
    if (!window.confirm('Delete this photo?')) return;
    try { await photosAPI.delete(photoId); await fetchBridge(); }
    catch { alert('Failed to delete photo'); }
  };

  const handleDeleteInspection = async () => {
    try { await inspectionsAPI.delete(deleteInsId); await fetchBridge(); setDeleteInsId(null); }
    catch { alert('Failed to delete inspection'); }
  };

  if (loading) return <div className="loading-center"><div className="spinner" /><span>Loading bridge profile...</span></div>;
  if (!bridge) return (
    <div className="empty-state">
      <MdErrorOutline />
      <h3>Bridge not found</h3>
      <Link to="/bridges" className="btn btn-primary btn-sm">Back to list</Link>
    </div>
  );

  const latestIns      = bridge.inspections?.[0];
  const photo1         = bridge.photos?.find((p) => p.photoType === 'PHOTO_1');
  const photo2         = bridge.photos?.find((p) => p.photoType === 'PHOTO_2');
  const hasCoords      = bridge.northing && bridge.easting;
  const unresolvedCount= bridge.inspections?.filter((i) => i.defectDescription && !i.isResolved).length ?? 0;

  return (
    <div style={{ maxWidth: 1020, margin: '0 auto' }}>

      {/* Breadcrumb */}
      <nav className="breadcrumb no-print">
        <Link to="/bridges">Bridges</Link>
        <span className="sep">/</span>
        <span className="current">{bridge.serialNumber}</span>
      </nav>

      {/* Profile Header */}
      <div className="bridge-profile-header">
        <div className={`condition-band ${condClass(latestIns?.conditionStatus)}`} />
        <div style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: 24, fontWeight: 800 }}>{bridge.serialNumber}</h2>
                {latestIns && <ConditionBadge status={latestIns.conditionStatus} />}
                {unresolvedCount > 0 && (
                  <span className="badge" style={{ background: '#fff7ed', color: '#ea580c' }}>
                    ⚠ {unresolvedCount} unresolved
                  </span>
                )}
              </div>
              <p style={{ color: 'var(--text-muted)', marginTop: 4, fontSize: 14 }}>
                {bridge.structureType}
                {bridge.section   && <> · <strong>{bridge.section}</strong></>}
                {bridge.chainage  && <> · Km {Number(bridge.chainage).toFixed(3)}</>}
              </p>
              <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: 'var(--text-light)' }}>
                  Registered {format(new Date(bridge.createdAt), 'dd MMM yyyy')}
                </span>
                {latestIns ? (
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Last inspected: <strong>{format(new Date(latestIns.inspectionDate), 'dd MMM yyyy')}</strong>
                    {' '}by {latestIns.inspectorName}
                  </span>
                ) : (
                  <span style={{ fontSize: 12, color: 'var(--warning)', fontWeight: 600 }}>⚠ Not yet inspected</span>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }} className="no-print">
              <button className="btn btn-ghost btn-sm" onClick={() => window.print()}><MdPrint /> Print</button>
              <Link to={`/bridges/${id}/edit`} className="btn btn-secondary btn-sm"><MdEdit /> Edit</Link>
              <Link to={`/bridges/${id}/inspections/new`} className="btn btn-primary btn-sm"><MdAdd /> Add Inspection</Link>
              {isAdmin && <button className="btn btn-danger btn-sm" onClick={() => setDeleteModal(true)}><MdDelete /></button>}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs no-print">
        {[
          { key: 'overview',    icon: <MdInfo />,       label: 'Overview' },
          { key: 'inspections', icon: <MdFindInPage />, label: `Inspections (${bridge.inspections?.length ?? 0})` },
          { key: 'photos',      icon: <MdPhoto />,      label: 'Photos' },
          ...(hasCoords ? [{ key: 'map', icon: <MdMap />, label: 'Map' }] : []),
          { key: 'history',     icon: <MdHistory />,    label: `History (${bridge.historyLogs?.length ?? 0})` },
        ].map(({ key, icon, label }) => (
          <button key={key} className={`tab-btn ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>
            {icon} {label}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ─────────────────────────────────── */}
      {tab === 'overview' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div className="card">
              <div className="card-header"><div className="card-title">Bridge Identity</div></div>
              <div className="card-body">
                {[
                  ['Serial Number',    bridge.serialNumber],
                  ['Structure Type',   bridge.structureType],
                  ['Section / Route',  bridge.section],
                  ['Chainage',         `${Number(bridge.chainage).toFixed(3)} Km`],
                  ['Number of Spans',  bridge.numberOfSpans ?? '—'],
                ].map(([k, v]) => (
                  <div key={k} className="detail-field"><dt>{k}</dt><dd>{v ?? '—'}</dd></div>
                ))}
              </div>
            </div>
            <div className="card">
              <div className="card-header"><div className="card-title">Physical Dimensions</div></div>
              <div className="card-body">
                {[
                  ['Length',   bridge.length   ? `${bridge.length} m`   : null],
                  ['Width',    bridge.width    ? `${bridge.width} m`    : null],
                  ['Height',   bridge.height   ? `${bridge.height} m`   : null],
                  ['Northing', bridge.northing ?? null],
                  ['Easting',  bridge.easting  ?? null],
                  ['Altitude', bridge.altitude ? `${bridge.altitude} m` : null],
                ].map(([k, v]) => (
                  <div key={k} className="detail-field"><dt>{k}</dt><dd>{v ?? '—'}</dd></div>
                ))}
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header"><div className="card-title">Current Condition Summary</div></div>
            <div className="card-body">
              {latestIns ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, color: 'var(--text-muted)', marginBottom: 8 }}>Condition</div>
                    <ConditionBadge status={latestIns.conditionStatus} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, color: 'var(--text-muted)', marginBottom: 8 }}>Last Inspection</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{format(new Date(latestIns.inspectionDate), 'dd MMM yyyy')}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>by {latestIns.inspectorName}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, color: 'var(--text-muted)', marginBottom: 8 }}>Defects Status</div>
                    {latestIns.defectDescription
                      ? latestIns.isResolved
                        ? <span className="resolve-status resolved"><MdCheckCircle size={13} /> Resolved</span>
                        : <span className="resolve-status unresolved"><MdWarning size={13} /> Unresolved</span>
                      : <span style={{ fontSize: 13, color: 'var(--success)' }}>✓ No defects reported</span>
                    }
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <MdWarning style={{ color: 'var(--warning)', fontSize: 24 }} />
                  <div>
                    <p style={{ fontWeight: 600 }}>No inspections recorded</p>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>This bridge has not been inspected yet.</p>
                  </div>
                  <Link to={`/bridges/${id}/inspections/new`} className="btn btn-primary btn-sm no-print" style={{ marginLeft: 'auto' }}>
                    <MdAdd /> Add First Inspection
                  </Link>
                </div>
              )}
            </div>
          </div>

          {(photo1 || photo2) && (
            <div className="card">
              <div className="card-header">
                <div className="card-title">Bridge Photos</div>
                <button className="btn btn-ghost btn-sm no-print" onClick={() => setTab('photos')}>Manage Photos</button>
              </div>
              <div className="card-body">
                <div className="photo-preview-grid">
                  {[{ type: 'PHOTO_1', label: 'Photo 1', photo: photo1 }, { type: 'PHOTO_2', label: 'Photo 2', photo: photo2 }].map(({ label, photo }) => (
                    <div key={label} className="photo-preview-box" style={{ minHeight: 160 }}>
                      {photo
                        ? <><img src={photoUrl(photo)} alt={label} /><span className="photo-label">{label}</span></>
                        : <div className="photo-placeholder"><MdPhoto /><span>{label} — not uploaded</span></div>
                      }
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {bridge.remark && (
            <div className="card" style={{ marginTop: 20 }}>
              <div className="card-header"><div className="card-title">Remarks</div></div>
              <div className="card-body">
                <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text)' }}>{bridge.remark}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Inspections Tab ──────────────────────────────── */}
      {tab === 'inspections' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }} className="no-print">
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {bridge.inspections?.length ?? 0} record(s) · {unresolvedCount} unresolved defect(s)
            </p>
            <Link to={`/bridges/${id}/inspections/new`} className="btn btn-primary btn-sm">
              <MdAdd /> Add Inspection
            </Link>
          </div>

          {bridge.inspections?.length === 0 ? (
            <div className="empty-state card" style={{ padding: '50px 24px' }}>
              <MdFindInPage />
              <h3>No inspections yet</h3>
              <p>Record the first inspection for this bridge.</p>
              <Link to={`/bridges/${id}/inspections/new`} className="btn btn-primary btn-sm no-print"><MdAdd /> Record Inspection</Link>
            </div>
          ) : (
            bridge.inspections.map((ins, idx) => (
              <InspectionCard
                key={ins.id}
                inspection={ins}
                bridgeId={id}
                isAdmin={isAdmin}
                isLatest={idx === 0}
                prevCondition={bridge.inspections[idx + 1]?.conditionStatus}
                onResolve={handleResolve}
                onDelete={setDeleteInsId}
                resolving={resolving === ins.id}
              />
            ))
          )}
        </div>
      )}

      {/* ── Photos Tab ───────────────────────────────────── */}
      {tab === 'photos' && (
        <div>
          <div className="photo-preview-grid" style={{ marginBottom: 20 }}>
            {[{ type: 'PHOTO_1', label: 'Photo 1', photo: photo1 }, { type: 'PHOTO_2', label: 'Photo 2', photo: photo2 }].map(({ type, label, photo }) => (
              <div key={type} className="photo-preview-box" style={{ minHeight: 220 }}>
                {photo ? (
                  <>
                    <img src={photoUrl(photo)} alt={label} />
                    <span className="photo-label">{label}</span>
                    <button className="photo-delete no-print" onClick={() => handlePhotoDelete(photo.id)} title="Delete photo">
                      ✕
                    </button>
                  </>
                ) : (
                  <div className="photo-placeholder" onClick={() => setUploadType(type)}>
                    <MdCloudUpload size={32} />
                    <span>{label}<br />Click to upload</span>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10 }} className="no-print">
            <button className="btn btn-ghost btn-sm" onClick={() => setUploadType('PHOTO_1')}><MdCloudUpload /> Replace Photo 1</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setUploadType('PHOTO_2')}><MdCloudUpload /> Replace Photo 2</button>
          </div>
        </div>
      )}

      {/* ── Map Tab ──────────────────────────────────────── */}
      {tab === 'map' && hasCoords && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Bridge Location</div>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>N: {bridge.northing} · E: {bridge.easting}</span>
          </div>
          <div style={{ borderRadius: '0 0 var(--radius) var(--radius)', overflow: 'hidden' }}>
            <MapContainer center={[bridge.northing, bridge.easting]} zoom={14} style={{ height: 420 }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
              <Marker position={[bridge.northing, bridge.easting]}>
                <Popup><strong>{bridge.serialNumber}</strong><br />{bridge.section}<br />Km {Number(bridge.chainage).toFixed(3)}</Popup>
              </Marker>
            </MapContainer>
          </div>
        </div>
      )}

      {/* ── History Tab ──────────────────────────────────── */}
      {tab === 'history' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Audit History</div>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{bridge.historyLogs?.length ?? 0} entries</span>
          </div>
          <div className="card-body">
            <InspectionHistory logs={bridge.historyLogs ?? []} />
          </div>
        </div>
      )}

      {/* ── Modals ───────────────────────────────────────── */}
      <Modal
        open={Boolean(uploadType)}
        onClose={() => { setUploadType(null); setUploadFile(null); setUploadError(''); }}
        title={`Upload ${uploadType === 'PHOTO_1' ? 'Photo 1' : 'Photo 2'}`}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => { setUploadType(null); setUploadFile(null); }}>Cancel</button>
            <button type="button" className="btn btn-primary" disabled={!uploadFile || uploadLoading} onClick={handlePhotoUpload}>
              {uploadLoading ? 'Uploading...' : 'Upload'}
            </button>
          </>
        }
      >
        {uploadError && <div className="alert alert-error"><MdErrorOutline />{uploadError}</div>}
        <div className="photo-upload-area" onClick={() => document.getElementById('pfi').click()}>
          <MdCloudUpload />
          <p>{uploadFile ? uploadFile.name : 'Click to select image'}</p>
          <span>JPG, PNG, WEBP · Max 5 MB</span>
          <input id="pfi" type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => setUploadFile(e.target.files[0] ?? null)} />
        </div>
        {uploadFile && <p style={{ fontSize: 12, color: 'var(--success)', marginTop: 8 }}>Selected: {uploadFile.name}</p>}
      </Modal>

      <ConfirmDialog
        open={deleteModal}
        onClose={() => setDeleteModal(false)}
        onConfirm={handleDeleteBridge}
        title="Delete Bridge"
        message={`Permanently delete ${bridge.serialNumber}? All inspections, photos, and history will be removed. This cannot be undone.`}
        confirmLabel="Delete Bridge"
        loading={deleting}
      />

      <ConfirmDialog
        open={Boolean(deleteInsId)}
        onClose={() => setDeleteInsId(null)}
        onConfirm={handleDeleteInspection}
        title="Delete Inspection"
        message="Delete this inspection record? This cannot be undone."
        confirmLabel="Delete Inspection"
      />
    </div>
  );
}
