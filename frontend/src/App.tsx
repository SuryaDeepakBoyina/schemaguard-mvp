import { FormEvent, useMemo, useState } from 'react';
import { apiClient, ValidationRecord, ValidationResponse } from './services/api';

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
  const [result, setResult] = useState<ValidationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const qualityLabel = useMemo(() => {
    if (!result) return 'Awaiting validation';
    if (result.quality_score >= 80) return 'High quality';
    if (result.quality_score >= 50) return 'Needs review';
    return 'Low quality';
  }, [result]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.validateRecord(record);
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation request failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <p className="eyebrow">SchemaGuard Health AI</p>
        <h1>Validate patient records with clear, low-friction feedback.</h1>
        <p className="subtitle">
          React + TypeScript frontend for OpenMRS-style workflows. Submit a patient payload and inspect
          quality score, issues, and FHIR readiness.
        </p>
      </section>

      <section className="panel-grid">
        <form className="card form-card" onSubmit={handleSubmit}>
          <h2>Validation Form</h2>

          <label>
            Patient ID
            <input
              value={record.id}
              onChange={(event) => setRecord({ ...record, id: event.target.value })}
              required
            />
          </label>

          <label>
            Name
            <input
              value={record.name}
              onChange={(event) => setRecord({ ...record, name: event.target.value })}
              required
            />
          </label>

          <label>
            Age
            <input
              type="number"
              value={record.age}
              onChange={(event) => setRecord({ ...record, age: Number(event.target.value) })}
              min={0}
              max={150}
              required
            />
          </label>

          <label>
            Gender
            <select
              value={record.gender}
              onChange={(event) => setRecord({ ...record, gender: event.target.value as ValidationRecord['gender'] })}
            >
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
              <option value="unknown">Unknown</option>
            </select>
          </label>

          <label>
            Vitals JSON
            <textarea
              value={JSON.stringify(record.vitals, null, 2)}
              onChange={(event) => {
                try {
                  setRecord({ ...record, vitals: JSON.parse(event.target.value) as Record<string, unknown> });
                  setError(null);
                } catch {
                  setError('Vitals must be valid JSON');
                }
              }}
              rows={5}
            />
          </label>

          <label>
            Diagnoses (comma separated)
            <input
              value={record.diagnoses.join(', ')}
              onChange={(event) =>
                setRecord({
                  ...record,
                  diagnoses: event.target.value
                    .split(',')
                    .map((item) => item.trim())
                    .filter(Boolean)
                })
              }
            />
          </label>

          <button type="submit" disabled={loading}>
            {loading ? 'Validating...' : 'Validate Record'}
          </button>
        </form>

        <aside className="card results-card">
          <h2>Results</h2>
          <div className="badge-row">
            <span className="badge">{qualityLabel}</span>
            <span className={`badge ${result?.fhir_compliant ? 'success' : 'warning'}`}>
              {result ? (result.fhir_compliant ? 'FHIR compliant' : 'FHIR issues') : 'FHIR pending'}
            </span>
          </div>

          {error ? <p className="error">{error}</p> : null}

          {result ? (
            <>
              <p className="score">Quality score: {result.quality_score}/100</p>
              <ul className="issue-list">
                {result.issues.length === 0 ? <li>No issues found.</li> : null}
                {result.issues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            </>
          ) : (
            <p className="muted">Submit the form to see validation feedback.</p>
          )}
        </aside>
      </section>
    </main>
  );
}
