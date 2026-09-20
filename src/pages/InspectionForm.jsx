import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  FiSave, FiArrowLeft, FiAlertCircle, FiInfo, FiAlertTriangle,
} from 'react-icons/fi';
import { inspectionsAPI, bridgesAPI } from '../api/bridges';
import { useAuth } from '../context/AuthContext';
import { ConditionBadge } from '../components/ui/Badge';
import { fmtDate } from '../utils/format';

const empty = {
  inspectorName: '', inspectionDate: '', defectDescription: '',
  remedy: '', conditionStatus: '', lastVisitDate: '',
};

export default function InspectionForm() {
  const { bridgeId, inspectionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEdit = Boolean(inspectionId);

  const [bridge, setBridge] = useState(null);
  const [form, setForm] = useState({
    ...empty,
    inspectorName: user ? `${user.firstName} ${user.lastName}` : '',
    inspectionDate: new Date().toISOString().split('T')[0],
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const { data: b } = await bridgesAPI.getById(bridgeId);
        setBridge(b);

        if (isEdit) {
          const { data: ins } = await inspectionsAPI.getById(inspectionId);
          setForm({
            inspectorName:     ins.inspectorName ?? '',
            inspectionDate:    ins.inspectionDate?.split('T')[0] ?? '',
            defectDescription: ins.defectDescription ?? '',
            remedy:            ins.remedy ?? '',
            conditionStatus:   ins.conditionStatus ?? '',
            lastVisitDate:     ins.lastVisitDate?.split('T')[0] ?? '',
          });
        }
      } catch {
        setServerError('Failed to load inspection context');
      } finally {
        setFetchLoading(false);
      }
    };
    load();
  }, [bridgeId, inspectionId, isEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const errs = {};
    if (!form.inspectorName.trim()) errs.inspectorName = 'Inspector name is required';
    if (!form.inspectionDate)       errs.inspectionDate = 'Inspection date is required';
    if (!form.conditionStatus)      errs.conditionStatus = 'Condition rating is required';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setLoading(true); setServerError('');
    try {
      if (isEdit) {
        await inspectionsAPI.update(inspectionId, form);
      } else {
        await inspectionsAPI.create({ ...form, bridgeId: Number(bridgeId) });
      }
      navigate(`/bridges/${bridgeId}`);
    } catch (err) {
      setServerError(err.response?.data?.message || 'Failed to save this inspection');
    } finally {
      setLoading(false);
    }
  };

  const errBorder = (name) => (errors[name] ? { borderColor: 'var(--poor)' } : undefined);
  const latestIns = bridge?.inspections?.[0];

  if (fetchLoading) {
    return <div className="loading-center"><div className="spinner" /><span>Loading…</span></div>;
  }

  return (
    <div style={{ maxWidth: 820, margin: '0 auto' }}>

      <nav className="breadcrumb">
        <Link to="/bridges">Bridge Inventory</Link>
        <span>/</span>
        <Link to={`/bridges/${bridgeId}`}>{bridge?.serialNumber ?? `#${bridgeId}`}</Link>
        <span>/</span>
        <span>{isEdit ? 'Edit inspection' : 'New inspection'}</span>
      </nav>

      {/* Structure context */}
      {bridge && (
        <div className="bridge-profile-header" style={{ marginBottom: 'var(--sp-4)' }}>
          <div style={{ minWidth: 0 }}>
            <div className="command-strip-label">Filing inspection against</div>
            <h2>{bridge.serialNumber}</h2>
            <p>
              {[bridge.bridgeName, bridge.structureType, bridge.section,
                bridge.chainage != null ? `Km ${Number(bridge.chainage).toFixed(3)}` : null]
                .filter(Boolean).join('  ·  ')}
            </p>
          </div>
          <div style={{ flexShrink: 0, textAlign: 'right' }}>
            <div className="command-strip-label">Previous inspection</div>
            {latestIns ? (
              <>
                <div className="mono" style={{ color: '#fff', fontSize: 'var(--fs-sm)', marginTop: 3 }}>
                  {fmtDate(latestIns.inspectionDate)}
                </div>
                <div style={{ marginTop: 4 }}>
                  <ConditionBadge status={latestIns.conditionStatus} />
                </div>
              </>
            ) : (
              <div style={{ color: 'var(--accent)', fontSize: 'var(--fs-xs)', fontWeight: 650, marginTop: 4 }}>
                First inspection on record
              </div>
            )}
          </div>
        </div>
      )}

      {!isEdit && (
        <div className="workflow-banner">
          <FiInfo size={15} style={{ flexShrink: 0 }} />
          <span>
            Inspection records are permanent and appear in the structure's audit trail.
            A POOR rating raises a critical alert and a system notification immediately.
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {serverError && (
          <div className="alert alert-error" style={{ marginBottom: 'var(--sp-4)' }}>
            <FiAlertCircle size={15} />
            <span style={{ flex: 1 }}>{serverError}</span>
          </div>
        )}

        <div className="tile" style={{ marginBottom: 'var(--sp-4)' }}>
          <div className="card-header">
            <div>
              <div className="card-title">Inspection Record</div>
              <div className="card-subtitle">Who inspected, when, and the resulting rating</div>
            </div>
          </div>
          <div className="card-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="inspectorName">
                  Inspector<span style={{ color: 'var(--accent-dark)' }}> *</span>
                </label>
                <input
                  id="inspectorName" name="inspectorName" className="form-control"
                  style={errBorder('inspectorName')}
                  placeholder="Full name of inspecting engineer"
                  value={form.inspectorName} onChange={handleChange}
                />
                {errors.inspectorName && (
                  <span className="form-error"><FiAlertCircle size={12} />{errors.inspectorName}</span>
                )}
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="inspectionDate">
                  Inspection date<span style={{ color: 'var(--accent-dark)' }}> *</span>
                </label>
                <input
                  id="inspectionDate" name="inspectionDate" type="date"
                  className="form-control mono" style={errBorder('inspectionDate')}
                  value={form.inspectionDate} onChange={handleChange}
                />
                {errors.inspectionDate && (
                  <span className="form-error"><FiAlertCircle size={12} />{errors.inspectionDate}</span>
                )}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="conditionStatus">
                  Condition rating<span style={{ color: 'var(--accent-dark)' }}> *</span>
                </label>
                <select
                  id="conditionStatus" name="conditionStatus" className="form-control"
                  style={errBorder('conditionStatus')}
                  value={form.conditionStatus} onChange={handleChange}
                >
                  <option value="">Select rating…</option>
                  <option value="GOOD">GOOD — no significant defects</option>
                  <option value="FAIR">FAIR — minor defects, monitor</option>
                  <option value="POOR">POOR — major defects, urgent action</option>
                </select>
                {errors.conditionStatus && (
                  <span className="form-error"><FiAlertCircle size={12} />{errors.conditionStatus}</span>
                )}
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="lastVisitDate">Previous site visit</label>
                <input
                  id="lastVisitDate" name="lastVisitDate" type="date"
                  className="form-control mono"
                  value={form.lastVisitDate} onChange={handleChange}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="tile" style={{ marginBottom: 'var(--sp-4)' }}>
          <div className="card-header">
            <div>
              <div className="card-title">Defects & Remedy</div>
              <div className="card-subtitle">
                A defect recorded here stays open until it is approved and signed off
              </div>
            </div>
          </div>
          <div className="card-body">
            <div className="form-group">
              <label className="form-label" htmlFor="defectDescription">Defect description</label>
              <textarea
                id="defectDescription" name="defectDescription"
                className="form-control" rows={5}
                placeholder={'Cracking — location, length, width\nCorrosion / section loss\nScour or settlement\nBearing and joint condition'}
                value={form.defectDescription} onChange={handleChange}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="remedy">Recommended remedy</label>
              <textarea
                id="remedy" name="remedy" className="form-control" rows={3}
                placeholder="Repair works, load restrictions, interim protective measures…"
                value={form.remedy} onChange={handleChange}
              />
            </div>
          </div>
        </div>

        {form.conditionStatus === 'POOR' && (
          <div className="alert alert-error" style={{ marginBottom: 'var(--sp-4)' }}>
            <FiAlertTriangle size={15} />
            <span>
              <strong>POOR rating.</strong> This structure will be flagged as critical on the
              dashboard and in Structural Health Alerts. Complete the defect description and
              remedy before saving.
            </span>
          </div>
        )}
        {form.conditionStatus === 'FAIR' && (
          <div className="alert alert-warning" style={{ marginBottom: 'var(--sp-4)' }}>
            <FiAlertTriangle size={15} />
            <span><strong>FAIR rating.</strong> Schedule a follow-up inspection within 6 months.</span>
          </div>
        )}

        <div className="toolbar" style={{ justifyContent: 'flex-end' }}>
          <Link to={`/bridges/${bridgeId}`} className="btn btn-secondary">
            <FiArrowLeft size={13} /> Cancel
          </Link>
          <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
            {loading
              ? <><span className="spinner spinner-sm" /> Saving…</>
              : <><FiSave size={14} /> {isEdit ? 'Update inspection' : 'File inspection'}</>}
          </button>
        </div>
      </form>
    </div>
  );
}
