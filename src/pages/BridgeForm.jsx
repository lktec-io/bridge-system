import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { FiSave, FiArrowLeft, FiAlertCircle } from 'react-icons/fi';
import { bridgesAPI } from '../api/bridges';

const empty = {
  serialNumber: '', bridgeName: '', structureType: '', section: '', chainage: '',
  northing: '', easting: '', altitude: '',
  length: '', width: '', height: '', numberOfSpans: '',
  constructionYear: '', remark: '',
};

const structureTypes = [
  'Box Culvert', 'Pipe Culvert', 'Corrugated Steel Pipe Culvert',
  'Slab Bridge', 'Reinforced Concrete Slab Bridge', 'Concrete Beam Bridge',
  'Pre-stressed Concrete Bridge', 'Girder Bridge', 'Steel Truss Bridge',
  'Arch Bridge', 'Suspension Bridge', 'Cable-Stayed Bridge', 'Other',
];

/* Declared outside the page component so React keeps a stable component
   identity across renders — defining it inline remounts the input on every
   keystroke and loses focus. */
function Field({ name, label, required, type = 'text', form, errors, onChange, hint, mono, ...props }) {
  return (
    <div className="form-group">
      <label className="form-label" htmlFor={name}>
        {label}{required && <span style={{ color: 'var(--accent-dark)' }}> *</span>}
      </label>
      <input
        id={name} name={name} type={type}
        className={`form-control${mono ? ' mono' : ''}`}
        value={form[name]} onChange={onChange}
        style={errors[name] ? { borderColor: 'var(--poor)' } : undefined}
        {...props}
      />
      {hint && !errors[name] && <div className="form-hint">{hint}</div>}
      {errors[name] && (
        <span className="form-error"><FiAlertCircle size={12} />{errors[name]}</span>
      )}
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
          serialNumber:     data.serialNumber     ?? '',
          bridgeName:       data.bridgeName       ?? '',
          structureType:    data.structureType    ?? '',
          section:          data.section          ?? '',
          chainage:         data.chainage         ?? '',
          northing:         data.northing         ?? '',
          easting:          data.easting          ?? '',
          altitude:         data.altitude         ?? '',
          length:           data.length           ?? '',
          width:            data.width            ?? '',
          height:           data.height           ?? '',
          numberOfSpans:    data.numberOfSpans    ?? '',
          constructionYear: data.constructionYear ?? '',
          remark:           data.remark           ?? '',
        });
      } catch {
        setServerError('Failed to load this structure record');
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
    if (!String(form.serialNumber).trim()) errs.serialNumber = 'Bridge ID is required';
    if (!form.structureType)               errs.structureType = 'Material / structure type is required';
    if (!String(form.section).trim())       errs.section = 'Region / location is required';
    if (form.chainage === '')               errs.chainage = 'Chainage is required';
    else if (isNaN(Number(form.chainage)))  errs.chainage = 'Must be a number';

    for (const key of ['northing', 'easting', 'altitude', 'length', 'width', 'height', 'numberOfSpans']) {
      if (form[key] !== '' && isNaN(Number(form[key]))) errs[key] = 'Must be a number';
    }
    if (form.constructionYear !== '' &&
        (isNaN(Number(form.constructionYear)) ||
         Number(form.constructionYear) < 1800 ||
         Number(form.constructionYear) > new Date().getFullYear() + 5)) {
      errs.constructionYear = 'Enter a valid year';
    }
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
      setServerError(err.response?.data?.message || 'Failed to save this structure');
    } finally {
      setLoading(false);
    }
  };

  const fp = { form, errors, onChange: handleChange };

  if (fetchLoading) {
    return <div className="loading-center"><div className="spinner" /><span>Loading structure record…</span></div>;
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>

      <nav className="breadcrumb">
        <Link to="/bridges">Bridge Inventory</Link>
        <span>/</span>
        <span>{isEdit ? 'Edit structure' : 'Register structure'}</span>
      </nav>

      <div className="page-header">
        <div>
          <h2>{isEdit ? 'Edit Structure Record' : 'Register New Structure'}</h2>
          <p>Asset identity, geospatial position and structural geometry</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {serverError && (
          <div className="alert alert-error" style={{ marginBottom: 'var(--sp-4)' }}>
            <FiAlertCircle size={15} />
            <span style={{ flex: 1 }}>{serverError}</span>
          </div>
        )}

        {/* Identity */}
        <div className="tile" style={{ marginBottom: 'var(--sp-4)' }}>
          <div className="card-header">
            <div>
              <div className="card-title">Asset Identity</div>
              <div className="card-subtitle">Identification and material classification</div>
            </div>
          </div>
          <div className="card-body">
            <div className="form-row">
              <Field {...fp} name="serialNumber" label="Bridge ID" required mono placeholder="BRG-001" />
              <Field {...fp} name="bridgeName" label="Bridge name" placeholder="Kafue River Crossing"
                     hint="Optional descriptive name shown alongside the ID" />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="structureType">
                  Material / structure type<span style={{ color: 'var(--accent-dark)' }}> *</span>
                </label>
                <select
                  id="structureType" name="structureType" className="form-control"
                  style={errors.structureType ? { borderColor: 'var(--poor)' } : undefined}
                  value={form.structureType} onChange={handleChange}
                >
                  <option value="">Select type…</option>
                  {structureTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                {errors.structureType && (
                  <span className="form-error"><FiAlertCircle size={12} />{errors.structureType}</span>
                )}
              </div>
              <Field {...fp} name="constructionYear" label="Year built" type="number" mono
                     min="1800" max={new Date().getFullYear() + 5} placeholder="1998" />
            </div>

            <div className="form-row">
              <Field {...fp} name="section" label="Region / location" required
                     placeholder="T2 Great North Road" />
              <Field {...fp} name="chainage" label="Chainage (km)" required type="number" mono
                     step="0.001" placeholder="45.500" />
            </div>
          </div>
        </div>

        {/* Position */}
        <div className="tile" style={{ marginBottom: 'var(--sp-4)' }}>
          <div className="card-header">
            <div>
              <div className="card-title">Geospatial Position</div>
              <div className="card-subtitle">
                Decimal degrees — required for the structure to appear on the GIS tracking grid
              </div>
            </div>
          </div>
          <div className="card-body">
            <div className="form-row-3">
              <Field {...fp} name="northing" label="Northing / latitude" type="number" mono
                     step="any" placeholder="-15.416389" />
              <Field {...fp} name="easting" label="Easting / longitude" type="number" mono
                     step="any" placeholder="28.282778" />
              <Field {...fp} name="altitude" label="Altitude (m)" type="number" mono
                     step="any" placeholder="1025.50" />
            </div>
          </div>
        </div>

        {/* Geometry */}
        <div className="tile" style={{ marginBottom: 'var(--sp-4)' }}>
          <div className="card-header">
            <div>
              <div className="card-title">Structural Geometry</div>
              <div className="card-subtitle">Measurements in metres</div>
            </div>
          </div>
          <div className="card-body">
            <div className="form-row-3">
              <Field {...fp} name="length" label="Length (m)" type="number" mono step="any" placeholder="85.00" />
              <Field {...fp} name="width"  label="Deck width (m)" type="number" mono step="any" placeholder="9.50" />
              <Field {...fp} name="height" label="Height (m)" type="number" mono step="any" placeholder="7.20" />
            </div>
            <div className="form-row">
              <Field {...fp} name="numberOfSpans" label="Number of spans" type="number" mono min="1" placeholder="5" />
              <div />
            </div>
          </div>
        </div>

        {/* Remarks */}
        <div className="tile" style={{ marginBottom: 'var(--sp-5)' }}>
          <div className="card-header">
            <div>
              <div className="card-title">Engineering Remarks</div>
              <div className="card-subtitle">Monitoring requirements, history or site constraints</div>
            </div>
          </div>
          <div className="card-body">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <textarea
                name="remark" className="form-control" rows={4}
                placeholder="Periodic scour monitoring required during wet season…"
                value={form.remark} onChange={handleChange}
              />
            </div>
          </div>
        </div>

        <div className="toolbar" style={{ justifyContent: 'flex-end' }}>
          <Link to={isEdit ? `/bridges/${id}` : '/bridges'} className="btn btn-secondary">
            <FiArrowLeft size={13} /> Cancel
          </Link>
          <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
            {loading
              ? <><span className="spinner spinner-sm" /> Saving…</>
              : <><FiSave size={14} /> {isEdit ? 'Update structure' : 'Register structure'}</>}
          </button>
        </div>
      </form>
    </div>
  );
}
