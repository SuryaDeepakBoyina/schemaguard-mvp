import { useEffect, useMemo, useState } from 'react';
import {
  Coding,
  ObservationResource,
  createBloodPressureObservation,
  createCustomObservation,
  pathToDomId
} from '../../types/fhir';
import { searchTerminology, terminologyToCoding, TerminologyMatch } from '../../services/terminologyService';

interface ObservationBuilderProps {
  patientReference: string;
  observations: ObservationResource[];
  onChange: (next: ObservationResource[]) => void;
  activeLocation?: string | null;
}

export function ObservationBuilder({
  patientReference,
  observations,
  onChange,
  activeLocation
}: ObservationBuilderProps) {
  const [systolic, setSystolic] = useState(120);
  const [diastolic, setDiastolic] = useState(80);
  const [effectiveDateTime, setEffectiveDateTime] = useState(new Date().toISOString().slice(0, 16));
  const [query, setQuery] = useState('blood pressure');
  const [matches, setMatches] = useState<TerminologyMatch[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<TerminologyMatch | null>(null);
  const [customValue, setCustomValue] = useState('98');
  const [customUnit, setCustomUnit] = useState('mmHg');

  useEffect(() => {
    let cancelled = false;
    searchTerminology(query).then(results => {
      if (!cancelled) {
        setMatches(results);
        setSelectedMatch(previous => previous ?? results[0] ?? null);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [query]);

  const customCoding: Coding | null = useMemo(() => {
    if (!selectedMatch) {
      return null;
    }

    return terminologyToCoding(selectedMatch);
  }, [selectedMatch]);

  const selectedCodingSummary = customCoding
    ? [`${customCoding.system}`, customCoding.code, customCoding.display ?? 'No display label']
    : ['No code selected'];

  const addBloodPressureObservation = () => {
    onChange([
      ...observations,
      createBloodPressureObservation(patientReference, systolic, diastolic, new Date().toISOString())
    ]);
  };

  const addCustomObservation = () => {
    if (!customCoding) {
      return;
    }
    const numericValue = Number(customValue);
    if (Number.isNaN(numericValue)) {
      return;
    }

    onChange([
      ...observations,
      createCustomObservation(patientReference, customCoding, numericValue, customUnit, new Date().toISOString())
    ]);
  };

  const removeObservation = (index: number) => {
    onChange(observations.filter((_, current) => current !== index));
  };

  const isActive = (location: string) => pathToDomId(location) === activeLocation;

  return (
    <div className="observation-builder">
      <header className="section-header">
        <div>
          <h2>Observation Builder</h2>
          <p>Generate FHIR Observation resources using LOINC, SNOMED, and UCUM aligned structures.</p>
        </div>
        <span className="profile-pill">Resource: Observation</span>
      </header>

      <section className="array-card">
        <div className="section-heading">
          <h3>Blood Pressure Panel</h3>
          <button type="button" className="ghost-button" onClick={addBloodPressureObservation}>
            Add BP Observation
          </button>
        </div>
        <div className="field-grid field-grid--three">
          <label className={isActive('Observation.bp.systolic') ? 'field field--active' : 'field'}>
            Systolic (8480-6)
            <input
              id={pathToDomId('Observation.bp.systolic')}
              type="number"
              value={systolic}
              onChange={event => setSystolic(Number(event.target.value))}
            />
          </label>
          <label className={isActive('Observation.bp.diastolic') ? 'field field--active' : 'field'}>
            Diastolic (8462-4)
            <input
              id={pathToDomId('Observation.bp.diastolic')}
              type="number"
              value={diastolic}
              onChange={event => setDiastolic(Number(event.target.value))}
            />
          </label>
          <label className="field">
            Effective DateTime
            <input
              id={pathToDomId('Observation.effectiveDateTime')}
              value={effectiveDateTime}
              onChange={event => setEffectiveDateTime(event.target.value)}
              placeholder="YYYY-MM-DDTHH:mm"
            />
          </label>
        </div>
      </section>

      <section className="array-card">
        <div className="section-heading">
          <h3>Terminology Search</h3>
          <span className="hint">Local HL7 code catalog with best-effort remote lookup.</span>
        </div>
        <div className="field-grid field-grid--two">
          <label className="field">
            Code search
            <input
              id={pathToDomId('Observation.code.search')}
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="blood pressure, hypertension, temperature"
            />
          </label>
          <label className="field">
            Selected unit
            <input
              id={pathToDomId('Observation.unit')}
              value={customUnit}
              onChange={event => setCustomUnit(event.target.value)}
              placeholder="mmHg"
            />
          </label>
        </div>
        <div className="match-list">
          {matches.map(match => (
            <button
              key={`${match.system}:${match.code}`}
              type="button"
              className={selectedMatch?.code === match.code ? 'match-pill match-pill--selected' : 'match-pill'}
              onClick={() => setSelectedMatch(match)}
            >
              <strong>{match.code}</strong>
              <span>{match.display}</span>
              <small>{match.system}</small>
            </button>
          ))}
        </div>
        <div className="field-grid field-grid--two">
          <label className="field">
            Observation value
            <input
              id={pathToDomId('Observation.value')}
              value={customValue}
              onChange={event => setCustomValue(event.target.value)}
              placeholder="98"
            />
          </label>
          <div className="field field--inline">
            <span>FHIR code preview</span>
            <ul className="example-card__list">
              {selectedCodingSummary.map(line => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        </div>
        <button type="button" onClick={addCustomObservation} disabled={!customCoding}>
          Add Custom Observation
        </button>
      </section>

      <section className="array-section">
        <div className="section-heading">
          <h3>Observation List</h3>
          <span className="hint">{observations.length} resource(s) in the current bundle.</span>
        </div>
        {observations.length === 0 ? (
          <div className="empty-state">No Observation resources yet.</div>
        ) : (
          observations.map((observation, index) => (
            <article key={observation.id} className="array-card observation-card">
              <div className="array-card__header">
                <strong>{observation.code.text ?? observation.code.coding?.[0]?.display ?? observation.id}</strong>
                <button type="button" className="text-button" onClick={() => removeObservation(index)}>
                  Remove
                </button>
              </div>
              <div className="observation-card__meta">
                <span>{observation.code.coding?.[0]?.system}</span>
                <span>{observation.code.coding?.[0]?.code}</span>
                <span>{observation.subject.reference}</span>
              </div>
              <div className="example-card">
                <span className="summary-card__label">Observation summary</span>
                <ul className="example-card__list">
                  <li>Status: {observation.status}</li>
                  <li>Code: {observation.code.text ?? observation.code.coding?.[0]?.display ?? observation.id}</li>
                  <li>Effective: {observation.effectiveDateTime}</li>
                  <li>
                    Value:{' '}
                    {observation.valueQuantity
                      ? `${observation.valueQuantity.value} ${observation.valueQuantity.unit ?? ''}`.trim()
                      : 'See components'}
                  </li>
                </ul>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
