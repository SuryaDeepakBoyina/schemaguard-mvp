import { FormEvent, useMemo, useState } from 'react';
import {
  apiClient,
  ValidationRecord,
  ValidationResponse,
  SuggestionResponse,
  FHIRCheckResponse
} from './services/api';

const initialRecord: ValidationRecord = {
  id: 'pat-001',
  name: 'Asha Devi',
  age: 42,
  gender: 'female',
  vitals: { bp: '120/80' },
  diagnoses: ['hypertension']
};

export default function App() {
  const [record, setRecord] = useState<ValidationRecord>(initialRecord);
  const [validation, setValidation] = useState<ValidationResponse | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestionResponse | null>(null);
  const [fhir, setFhir] = useState<FHIRCheckResponse | null>(null);

  const [loading, setLoading] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [fhirLoading, setFhirLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const qualityLabel = useMemo(() => {
    if (!validation) return 'Awaiting validation';
    const score = validation.quality_score;
    if (score >= 80) return 'High Quality';
    if (score >= 50) return 'Needs Review';
    return 'Low Quality';
  }, [validation]);

  const scoreColor = useMemo(() => {
    if (!validation) return 'var(--text-muted)';
    const score = validation.quality_score;
    if (score >= 80) return 'var(--accent-success)';
    if (score >= 50) return 'var(--accent-warning)';
    return 'var(--accent-danger)';
  }, [validation]);

  async function handleValidate(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setValidation(null);
    setSuggestions(null);
    setFhir(null);
    setError(null);

    try {
      const res = await apiClient.validateRecord(record);
      setValidation(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleGetSuggestions() {
    if (!validation) return;
    setSuggesting(true);
    try {
      const res = await apiClient.suggestFixes(record, validation.issues);
      setSuggestions(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Suggestions failed');
    } finally {
      setSuggesting(false);
    }
  }

  async function handleFhirCheck() {
    setFhirLoading(true);
    try {
      const res = await apiClient.fhirCheck(record);
      setFhir(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'FHIR check failed');
    } finally {
      setFhirLoading(false);
    }
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <p className="eyebrow">SchemaGuard Health AI</p>
        <h1>Ensuring Data Integrity for Better Health.</h1>
        <p className="subtitle">
          AI-assisted validation, FHIR compatibility checks, and intelligent record enrichment
          designed for low-resource clinical environments.
        </p>
      </header>

      <div className="panel-grid">
        <form className="card form-card" onSubmit={handleValidate}>
          <h2>Patient Record</h2>

          <label>
            Identifier
            <input
              value={record.id}
              onChange={e => setRecord({ ...record, id: e.target.value })}
              required
            />
          </label>

          <label>
            Full Name
            <input
              value={record.name}
              onChange={e => setRecord({ ...record, name: e.target.value })}
              required
              placeholder="e.g. John Doe"
            />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <label>
              Age
              <input
                type="number"
                value={record.age === 0 ? '' : record.age}
                onChange={e => {
                  const val = e.target.value;
                  setRecord({ ...record, age: val === '' ? 0 : Number(val) });
                }}
                required
                min="0"
                max="120"
                placeholder="0-120"
              />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Range: 0-120</span>
            </label>
            <label>
              Gender
              <select
                value={record.gender}
                onChange={e => setRecord({ ...record, gender: e.target.value as any })}
              >
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
                <option value="unknown">Unknown</option>
              </select>
            </label>
          </div>

          <label>
            Vitals (JSON)
            <textarea
              rows={4}
              value={JSON.stringify(record.vitals, null, 2)}
              onChange={e => {
                try {
                  setRecord({ ...record, vitals: JSON.parse(e.target.value) });
                } catch { /* wait for valid json */ }
              }}
            />
          </label>

          <button type="submit" disabled={loading}>
            {loading ? 'Validating...' : 'Validate Record'}
          </button>

          {validation && (
            <button
              type="button"
              className="secondary-button"
              onClick={handleFhirCheck}
              disabled={fhirLoading}
            >
              {fhirLoading ? 'Mapping...' : 'Generate FHIR Resource'}
            </button>
          )}
        </form>

        <section className="results-pane">
          <div className="card">
            <h2>Analysis Summary</h2>
            <div className="badge-row">
              <span className="badge" style={{ color: scoreColor }}>{qualityLabel}</span>
              {validation?.fhir_compliant && <span className="badge success">FHIR Ready</span>}
              {fhir?.valid && <span className="badge success">R4 Validated</span>}
            </div>

            {error && <div className="error">{error}</div>}

            {validation ? (
              <>
                <p className="score" style={{ color: scoreColor }}>
                  {validation.quality_score}<span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/100</span>
                </p>

                <ul className="issue-list">
                  {validation.issues.length === 0 ? (
                    <li style={{ borderColor: 'var(--accent-success)' }}>No data quality issues detected.</li>
                  ) : (
                    validation.issues.map((msg, i) => <li key={i}>{msg}</li>)
                  )}
                </ul>

                {validation.issues.length > 0 && !suggestions && (
                  <button
                    onClick={handleGetSuggestions}
                    className="secondary-button"
                    disabled={suggesting}
                    style={{ marginTop: '2rem' }}
                  >
                    {suggesting ? 'Generating AI fixes...' : 'Ask AI for Fixes'}
                  </button>
                )}
              </>
            ) : (
              <p className="muted">Enter record details and click Validate to begin.</p>
            )}

            {suggestions && (
              <div className="suggestion-section">
                <h3>AI Suggestions</h3>
                {suggestions.suggestions.map((s, i) => (
                  <div key={i} className="suggestion-card">
                    <div className="field-name">{s.field}</div>
                    <div className="diff">
                      <span className="old">{String(s.original)}</span>
                      <span style={{ color: 'var(--text-muted)' }}>→</span>
                      <span className="new">{String(s.suggested)}</span>
                    </div>
                    <p className="reason">{s.reason}</p>
                  </div>
                ))}
              </div>
            )}

            {fhir && (
              <div className="suggestion-section">
                <h3>FHIR Resource (Patient)</h3>
                <pre className="fhir-preview">
                  {JSON.stringify(fhir.resource, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
