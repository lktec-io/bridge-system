import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { bridgesAPI } from '../api/bridges';
import { MdSave, MdArrowBack, MdErrorOutline } from 'react-icons/md';

const empty = {
  serialNumber: '', structureType: '', section: '', chainage: '',
  northing: '', easting: '', altitude: '',
  length: '', width: '', height: '', numberOfSpans: '', remark: '',
};

const structureTypes = [
  'Box Culvert', 'Pipe Culvert', 'Slab Bridge', 'Girder Bridge',
  'Arch Bridge', 'Suspension Bridge', 'Truss Bridge', 'Cable-Stayed Bridge', 'Other',
];

// Defined outside BridgeForm so React sees a stable component identity across renders.
// If defined inside, React creates a new component type on every render, unmounting and
// remounting the input, which loses keyboard focus after each keystroke.
function Field({ name, label, required, type = 'text', form, errors, onChange, ...props }) {
  return (
    <div className="form-group">
      <label className="form-label" htmlFor={name}>
        {label}{required && <span className="required"> *</span>}
      </label>
      <input
        id={name} name={name} type={type}
        className={`form-control${errors[name] ? ' error' : ''}`}
        value={form[name]} onChange={onChange}
        style={errors[name] ? { borderColor: 'var(--danger)' } : {}}
        {...props}
      />
      {errors[name] && <span className="form-error"><MdErrorOutline size={13} />{errors[name]}</span>}
    </div>
  );
}

export default function BridgeForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(isEdit);
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const { data } = await bridgesAPI.getById(id);
        setForm({
          serialNumber:  data.serialNumber  ?? '',
          structureType: data.structureType ?? '',
          section:       data.section       ?? '',
          chainage:      data.chainage      ?? '',
          northing:      data.northing      ?? '',
          easting:       data.easting       ?? '',
          altitude:      data.altitude      ?? '',
          length:        data.length        ?? '',
          width:         data.width         ?? '',
          height:        data.height        ?? '',
          numberOfSpans: data.numberOfSpans ?? '',
          remark:        data.remark        ?? '',
        });
      } catch {
        setServerError('Failed to load bridge data');
      } finally {
        setFetchLoading(false);
      }
    })();
  }, [id, isEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const errs = {};
    if (!form.serialNumber.trim()) errs.serialNumber = 'Serial number is required';
    if (!form.structureType)       errs.structureType = 'Structure type is required';
    if (!form.section.trim())      errs.section = 'Section is required';
    if (!form.chainage)            errs.chainage = 'Chainage is required';
    else if (isNaN(Number(form.chainage))) errs.chainage = 'Must be a number';
    if (form.northing      && isNaN(Number(form.northing)))      errs.northing = 'Must be a number';
    if (form.easting       && isNaN(Number(form.easting)))       errs.easting = 'Must be a number';
    if (form.altitude      && isNaN(Number(form.altitude)))      errs.altitude = 'Must be a number';
    if (form.length        && isNaN(Number(form.length)))        errs.length = 'Must be a number';
    if (form.width         && isNaN(Number(form.width)))         errs.width = 'Must be a number';
    if (form.height        && isNaN(Number(form.height)))        errs.height = 'Must be a number';
    if (form.numberOfSpans && isNaN(Number(form.numberOfSpans))) errs.numberOfSpans = 'Must be an integer';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setServerError('');
    setLoading(true);
    try {
      if (isEdit) {
        await bridgesAPI.update(id, form);
        navigate(`/bridges/${id}`);
      } else {
        const { data } = await bridgesAPI.create(form);
        navigate(`/bridges/${data.id}`);
      }
    } catch (err) {
      setServerError(err.response?.data?.message || 'Failed to save bridge');
    } finally {
      setLoading(false);
    }
  };

  // Shared props forwarded to every Field instance
  const fp = { form, errors, onChange: handleChange };

  if (fetchLoading) return <div className="loading-center"><div className="spinner" /><span>Loading bridge...</span></div>;

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>

      <nav className="breadcrumb">
        <Link to="/bridges">Bridges</Link>
        <span className="sep">/</span>
        <span className="current">{isEdit ? 'Edit Bridge' : 'Register Bridge'}</span>
      </nav>

      <form onSubmit={handleSubmit}>
        {serverError && (
          <div className="alert alert-error"><MdErrorOutline />{serverError}</div>
        )}

        {/* ── Bridge Identity ─────────────────────────────── */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <div>
              <div className="card-title">Bridge Identity</div>
              <div className="card-subtitle">Basic identification and classification</div>
            </div>
          </div>
          <div className="card-body">
            <div className="form-row">
              <Field {...fp} name="serialNumber" label="Serial Number" required placeholder="e.g. BRG-001" />
              <div className="form-group">
                <label className="form-label" htmlFor="structureType">
                  Type of Structure<span className="required"> *</span>
                </label>
                <select
                  id="structureType" name="structureType"
                  className="form-control"
                  style={errors.structureType ? { borderColor: 'var(--danger)' } : {}}
                  value={form.structureType} onChange={handleChange}
                >
                  <option value="">Select structure type...</option>
                  {structureTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                {errors.structureType && <span className="form-error"><MdErrorOutline size={13} />{errors.structureType}</span>}
              </div>
            </div>
            <div className="form-row">
              <Field {...fp} name="section"  label="Section / Route" required placeholder="e.g. A1 Northern Corridor" />
              <Field {...fp} name="chainage" label="Chainage (Km)"    required type="number" step="0.001" placeholder="e.g. 42.500" />
            </div>
          </div>
        </div>

        {/* ── GPS Coordinates ─────────────────────────────── */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <div>
              <div className="card-title">GPS Coordinates</div>
              <div className="card-subtitle">Location data for mapping (optional)</div>
            </div>
          </div>
          <div className="card-body">
            <div className="form-row-3">
              <Field {...fp} name="northing" label="Northing"     type="number" step="any" placeholder="e.g. 1234567.89" />
              <Field {...fp} name="easting"  label="Easting"      type="number" step="any" placeholder="e.g. 987654.32"  />
              <Field {...fp} name="altitude" label="Altitude (m)" type="number" step="any" placeholder="e.g. 1200.00"    />
            </div>
          </div>
        </div>

        {/* ── Physical Dimensions ─────────────────────────── */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <div>
              <div className="card-title">Physical Dimensions</div>
              <div className="card-subtitle">Structural measurements in metres</div>
            </div>
          </div>
          <div className="card-body">
            <div className="form-row-3">
              <Field {...fp} name="length" label="Length (m)" type="number" step="any" placeholder="e.g. 24.5" />
              <Field {...fp} name="width"  label="Width (m)"  type="number" step="any" placeholder="e.g. 7.2"  />
              <Field {...fp} name="height" label="Height (m)" type="number" step="any" placeholder="e.g. 3.8"  />
            </div>
            <div className="form-row" style={{ gridTemplateColumns: '1fr 2fr' }}>
              <Field {...fp} name="numberOfSpans" label="Number of Spans" type="number" min="1" placeholder="e.g. 3" />
              <div />
            </div>
          </div>
        </div>

        {/* ── Remarks ─────────────────────────────────────── */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <div className="card-title">Remarks</div>
          </div>
          <div className="card-body">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <textarea
                name="remark"
                className="form-control"
                rows={4}
                placeholder="Additional notes, historical context, or special conditions..."
                value={form.remark}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        {/* ── Actions ─────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <Link to={isEdit ? `/bridges/${id}` : '/bridges'} className="btn btn-secondary">
            <MdArrowBack /> Cancel
          </Link>
          <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
            {loading
              ? <><span className="spinner spinner-sm" /> Saving...</>
              : <><MdSave /> {isEdit ? 'Update Bridge' : 'Register Bridge'}</>
            }
          </button>
        </div>
      </form>
    </div>
  );
}
