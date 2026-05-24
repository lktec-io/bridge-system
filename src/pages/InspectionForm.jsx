import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { inspectionsAPI, bridgesAPI } from '../api/bridges';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { MdSave, MdArrowBack, MdErrorOutline, MdInfo, MdWarning } from 'react-icons/md';

const safeDate = (d, fmt) => {
  if (!d) return '—';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? '—' : format(dt, fmt);
};

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
        // Always load the bridge context
        const { data: b } = await bridgesAPI.getById(bridgeId);
        setBridge(b);

        if (isEdit) {
          const { data: ins } = await inspectionsAPI.getById(inspectionId);
          setForm({
            inspectorName: ins.inspectorName ?? '',
            inspectionDate: ins.inspectionDate?.split('T')[0] ?? '',
            defectDescription: ins.defectDescription ?? '',
            remedy: ins.remedy ?? '',
            conditionStatus: ins.conditionStatus ?? '',
            lastVisitDate: ins.lastVisitDate?.split('T')[0] ?? '',
          });
        }
      } catch {
        setServerError('Failed to load data');
      } finally {
        setFetchLoading(false);
      }
    };
    load();
  }, [bridgeId, inspectionId, isEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((e) => ({ ...e, [name]: '' }));
  };

  const validate = () => {
    const errs = {};
    if (!form.inspectorName.trim()) errs.inspectorName = 'Inspector name is required';
    if (!form.inspectionDate) errs.inspectionDate = 'Inspection date is required';
    if (!form.conditionStatus) errs.conditionStatus = 'Condition status is required';
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
      setServerError(err.response?.data?.message || 'Failed to save inspection');
    } finally {
      setLoading(false);
    }
  };

  const errBorder = (name) => errors[name] ? { borderColor: 'var(--danger)' } : {};
  const latestIns = bridge?.inspections?.[0];

  if (fetchLoading) return <div className="loading-center"><div className="spinner" /><span>Loading...</span></div>;

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>

      {/* Breadcrumb */}
      <nav className="breadcrumb">
        <Link to="/bridges">Bridges</Link>
        <span className="sep">/</span>
        <Link to={`/bridges/${bridgeId}`}>{bridge?.serialNumber ?? `Bridge #${bridgeId}`}</Link>
        <span className="sep">/</span>
        <span className="current">{isEdit ? 'Edit Inspection' : 'New Inspection'}</span>
      </nav>

      {/* Workflow guidance */}
      {!isEdit && (
        <div className="workflow-banner">
          <MdInfo size={20} />
          <div>
            <h4>Inspection Workflow</h4>
            <p>You are recording a new inspection for an existing bridge. Fill in the condition, defects, and remedy below. All records are stored permanently in the bridge history.</p>
          </div>
        </div>
      )}

      {/* Bridge context card */}
      {bridge && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-body" style={{ padding: '14px 20px' }}>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, color: 'var(--text-muted)', marginBottom: 4 }}>
                  Inspecting Bridge
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{bridge.serialNumber}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  {bridge.structureType} · {bridge.section} · Km {Number(bridge.chainage || 0).toFixed(3)}
                </div>
              </div>
              {latestIns && (
                <div style={{ flexShrink: 0, textAlign: 'right' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, color: 'var(--text-muted)', marginBottom: 4 }}>Previous Inspection</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{safeDate(latestIns.inspectionDate, 'dd MMM yyyy')}</div>
                  <div style={{ marginTop: 2 }}>
                    <span className={`badge ${latestIns.conditionStatus === 'GOOD' ? 'badge-good' : latestIns.conditionStatus === 'FAIR' ? 'badge-fair' : 'badge-poor'}`}>
                      {latestIns.conditionStatus}
                    </span>
                  </div>
                </div>
              )}
              {!latestIns && (
                <div style={{ flexShrink: 0 }}>
                  <span style={{ fontSize: 12, color: 'var(--warning)', fontWeight: 600 }}>
                    <MdWarning size={14} style={{ verticalAlign: 'middle' }} /> First inspection
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {serverError && <div className="alert alert-error"><MdErrorOutline />{serverError}</div>}

        {/* Inspector & Date */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <div className="card-title">Inspection Details</div>
            <div className="card-subtitle">Who conducted this inspection and when</div>
          </div>
          <div className="card-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="inspectorName">
                  Inspector Name <span className="required">*</span>
                </label>
                <input
                  id="inspectorName" name="inspectorName"
                  className="form-control" style={errBorder('inspectorName')}
                  placeholder="Full name of the inspector"
                  value={form.inspectorName} onChange={handleChange}
                />
                {errors.inspectorName && <span className="form-error"><MdErrorOutline size={13} />{errors.inspectorName}</span>}
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="inspectionDate">
                  Date of Inspection <span className="required">*</span>
                </label>
                <input
                  id="inspectionDate" name="inspectionDate" type="date"
                  className="form-control" style={errBorder('inspectionDate')}
                  value={form.inspectionDate} onChange={handleChange}
                />
                {errors.inspectionDate && <span className="form-error"><MdErrorOutline size={13} />{errors.inspectionDate}</span>}
              </div>
            </div>
            <div className="form-row">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="conditionStatus">
                  Overall Condition <span className="required">*</span>
                </label>
                <select
                  id="conditionStatus" name="conditionStatus"
                  className="form-control" style={errBorder('conditionStatus')}
                  value={form.conditionStatus} onChange={handleChange}
                >
                  <option value="">Select the overall bridge condition...</option>
                  <option value="GOOD">Good — no significant issues found</option>
                  <option value="FAIR">Fair — minor defects, requires monitoring</option>
                  <option value="POOR">Poor — major defects, urgent action required</option>
                </select>
                {errors.conditionStatus && <span className="form-error"><MdErrorOutline size={13} />{errors.conditionStatus}</span>}
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="lastVisitDate">Last Visit Date</label>
                <input id="lastVisitDate" name="lastVisitDate" type="date" className="form-control" value={form.lastVisitDate} onChange={handleChange} />
              </div>
            </div>
          </div>
        </div>

        {/* Defects & Remedy */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <div className="card-title">Defects & Remedy</div>
            <div className="card-subtitle">Describe any observed defects and recommended actions</div>
          </div>
          <div className="card-body">
            <div className="form-group">
              <label className="form-label" htmlFor="defectDescription">Defect Description</label>
              <textarea
                id="defectDescription" name="defectDescription"
                className="form-control" rows={4}
                placeholder="Describe all observed defects in detail:&#10;— Cracks (location, length, width)&#10;— Corrosion / scour&#10;— Settlement / deformation&#10;— Damaged components"
                value={form.defectDescription} onChange={handleChange}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="remedy">Recommended Remedy / Maintenance Action</label>
              <textarea
                id="remedy" name="remedy"
                className="form-control" rows={3}
                placeholder="Specify recommended repair works, maintenance schedule, or interim protective measures..."
                value={form.remedy} onChange={handleChange}
              />
            </div>
          </div>
        </div>

        {/* Condition alert */}
        {form.conditionStatus === 'POOR' && (
          <div className="alert alert-error" style={{ marginBottom: 16 }}>
            <MdWarning size={18} />
            <span>
              <strong>POOR condition flagged.</strong> This bridge will appear in the urgent attention list on the dashboard. Ensure defect description and remedy are completed.
            </span>
          </div>
        )}
        {form.conditionStatus === 'FAIR' && (
          <div className="alert alert-warning" style={{ marginBottom: 16 }}>
            <MdWarning size={18} />
            <span><strong>FAIR condition noted.</strong> Schedule a follow-up inspection within 6 months.</span>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <Link to={`/bridges/${bridgeId}`} className="btn btn-secondary"><MdArrowBack /> Cancel</Link>
          <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
            {loading ? 'Saving...' : <><MdSave /> {isEdit ? 'Update Inspection' : 'Save Inspection'}</>}
          </button>
        </div>
      </form>
    </div>
  );
}
