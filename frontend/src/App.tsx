import { useMemo, useState } from 'react';
import { FHIRPathErrorTree } from './components/fhir/FHIRPathErrorTree';
import { FHIRResourceViewer } from './components/fhir/FHIRResourceViewer';
import { ObservationBuilder } from './components/fhir/ObservationBuilder';
import { PatientForm } from './components/fhir/PatientForm';
import { QualityScoreGauge } from './components/validation/QualityScoreGauge';
import { SuggestionPanel } from './components/ai/SuggestionPanel';
import { DEFAULT_FHIR_URL, FHIR_SERVER_OPTIONS, validateFhirServerUrl } from './config/fhir';
import {
  BundleResource,
  FHIR_SYSTEMS,
  ObservationResource,
  OpenMRSMapping,
  PatientResource,
  Suggestion,
  ValidationError,
  createBundleResource,
  createBloodPressureObservation,
  createOpenMRSMapping,
  createPatientResource,
  pathToDomId
} from './types/fhir';

type ValidationProfile = 'Base FHIR R4 Patient' | 'India ABDM Patient Profile' | 'OpenMRS O3 Patient Profile' | 'Custom Profile';
type BundleMode = BundleResource['type'];

interface ValidationSnapshot {
  score: number;
  issues: ValidationError[];
  suggestions: Suggestion[];
}

const initialPatient = createPatientResource('pat-001');
const initialObservations = [createBloodPressureObservation('Patient/pat-001', 120, 80, '2026-05-30T10:30:00Z')];

function toInitialBundleType(type: ValidationProfile): BundleMode {
  return type === 'OpenMRS O3 Patient Profile' ? 'transaction' : 'collection';
}

function buildValidationSnapshot(
  patient: PatientResource,
  observations: ObservationResource[],
  profile: ValidationProfile
): ValidationSnapshot {
  const issues: ValidationError[] = [];
  const suggestions: Suggestion[] = [];

  const addIssue = (issue: ValidationError) => issues.push(issue);
  const addSuggestion = (suggestion: Suggestion) => suggestions.push(suggestion);

  if (patient.identifier.length === 0) {
    addIssue({
      severity: 'warning',
      location: 'Patient.identifier',
      message: 'At least one identifier is recommended for longitudinal interoperability.',
      element: 'Patient.identifier',
      fhirUri: 'https://hl7.org/fhir/R4/patient.html#Patient.identifier'
    });
    addSuggestion({
      field: 'identifier',
      suggestion: 'Add a Medical Record Number or ABHA identifier for patient reconciliation.',
      confidence: 0.95,
      code_example: {
        system: FHIR_SYSTEMS.abhaIdentifier,
        value: '12-3456-7890-1234'
      },
      action: {
        type: 'add-identifier',
        identifier: {
          use: 'official',
          type: {
            coding: [{ system: FHIR_SYSTEMS.identifierType, code: 'MR', display: 'Medical record number' }],
            text: 'Medical record number'
          },
          system: FHIR_SYSTEMS.abhaIdentifier,
          value: '12-3456-7890-1234'
        }
      }
    });
  }

  if (patient.name.length === 0) {
    addIssue({
      severity: 'error',
      location: 'Patient.name',
      message: 'Patient.name should be populated for a usable clinical record.',
      element: 'HumanName',
      fhirUri: 'https://hl7.org/fhir/R4/datatypes.html#HumanName'
    });
  }

  if (!patient.birthDate) {
    addIssue({
      severity: 'warning',
      location: 'Patient.birthDate',
      message: 'Birth date improves demographic matching and age-based validation.',
      element: 'date',
      fhirUri: 'https://hl7.org/fhir/R4/datatypes.html#date'
    });
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(patient.birthDate)) {
    addIssue({
      severity: 'error',
      location: 'Patient.birthDate',
      message: 'birthDate must use FHIR date format YYYY-MM-DD.',
      element: 'Patient.birthDate',
      fhirUri: 'https://hl7.org/fhir/R4/datatypes.html#date'
    });
  }

  if (patient.telecom.length === 0) {
    addIssue({
      severity: 'warning',
      location: 'Patient.telecom',
      message: 'A mobile phone or email improves follow-up and communication.',
      element: 'ContactPoint',
      fhirUri: 'https://hl7.org/fhir/R4/patient.html#Patient.telecom'
    });
    addSuggestion({
      field: 'telecom',
      suggestion: 'Add a mobile contact point in FHIR ContactPoint format.',
      confidence: 0.86,
      code_example: { system: 'phone', value: '+91-9876543210', use: 'mobile' }
    });
  }

  const hasAbhaIdentifier = patient.identifier.some(identifier => identifier.system === FHIR_SYSTEMS.abhaIdentifier);
  if (profile === 'India ABDM Patient Profile' && !hasAbhaIdentifier) {
    addIssue({
      severity: 'error',
      location: 'Patient.identifier',
      message: 'ABDM profile requires an ABHA identifier system.',
      element: 'Identifier.system',
      fhirUri: 'http://abdm.gov.in/fhir/StructureDefinition'
    });
    addSuggestion({
      field: 'identifier',
      suggestion: "Add an ABHA identifier using system 'http://abdm.gov.in/fhir/NamingSystem/abha'.",
      confidence: 0.96,
      code_example: {
        system: FHIR_SYSTEMS.abhaIdentifier,
        value: '12-3456-7890-1234'
      },
      action: {
        type: 'add-identifier',
        identifier: {
          use: 'official',
          type: {
            coding: [{ system: FHIR_SYSTEMS.identifierType, code: 'NI', display: 'National identifier' }],
            text: 'ABHA identifier'
          },
          system: FHIR_SYSTEMS.abhaIdentifier,
          value: '12-3456-7890-1234'
        }
      }
    });
  }

  const bloodPressure = observations.find(observation => observation.code.coding?.[0]?.code === '85354-9');
  if (!bloodPressure) {
    addIssue({
      severity: 'information',
      location: 'Observation[BloodPressure]',
      message: 'Add a blood pressure Observation resource with LOINC 85354-9 for vitals coverage.',
      element: 'Observation',
      fhirUri: 'https://hl7.org/fhir/R4/observation.html'
    });
    addSuggestion({
      field: 'observations',
      suggestion: 'Create a blood pressure Observation with systolic and diastolic components.',
      confidence: 0.92,
      code_example: {
        code: { system: FHIR_SYSTEMS.loinc, code: '85354-9', display: 'Blood pressure panel' }
      },
      action: {
        type: 'add-observation',
        observation: createBloodPressureObservation(`Patient/${patient.id}`, 120, 80)
      }
    });
  } else {
    const systolic = bloodPressure.component.find(component => component.code.coding?.[0]?.code === '8480-6');
    const diastolic = bloodPressure.component.find(component => component.code.coding?.[0]?.code === '8462-4');

    if (!systolic || !diastolic) {
      addIssue({
        severity: 'error',
        location: 'Observation.component',
        message: 'Blood pressure Observation must include systolic and diastolic components.',
        element: 'Observation.component',
        fhirUri: 'https://hl7.org/fhir/R4/observation.html'
      });
    }
  }

  observations.forEach((observation, index) => {
    if (observation.subject.reference !== `Patient/${patient.id}`) {
      addIssue({
        severity: 'warning',
        location: `Observation[${index}].subject`,
        message: 'Observation.subject should reference the current Patient resource.',
        element: 'Reference',
        fhirUri: 'https://hl7.org/fhir/R4/references.html'
      });
    }
    if (!observation.code.coding?.length) {
      addIssue({
        severity: 'error',
        location: `Observation[${index}].code`,
        message: 'Every Observation needs a coded concept, ideally from LOINC or SNOMED.',
        element: 'CodeableConcept',
        fhirUri: 'https://hl7.org/fhir/R4/datatypes.html#CodeableConcept'
      });
    }
  });

  const score = Math.max(0, 100 - issues.filter(issue => issue.severity === 'error').length * 15 - issues.filter(issue => issue.severity === 'warning').length * 5);

  return {
    score,
    issues,
    suggestions
  };
}

function buildOpenMRSPreview(patient: PatientResource): OpenMRSMapping {
  return createOpenMRSMapping(patient);
}

export default function App() {
  const [patient, setPatient] = useState<PatientResource>(initialPatient);
  const [observations, setObservations] = useState<ObservationResource[]>(initialObservations);
  const [profile, setProfile] = useState<ValidationProfile>('India ABDM Patient Profile');
  const [bundleType, setBundleType] = useState<BundleMode>(toInitialBundleType('India ABDM Patient Profile'));
  const [fhirServerUrl, setFhirServerUrl] = useState(DEFAULT_FHIR_URL);
  const [activeLocation, setActiveLocation] = useState<string | null>(null);

  const validation = useMemo(() => buildValidationSnapshot(patient, observations, profile), [patient, observations, profile]);
  const bundle = useMemo(() => createBundleResource(patient, observations, bundleType), [patient, observations, bundleType]);
  const openMRSPreview = useMemo(() => buildOpenMRSPreview(patient), [patient]);
  const fhirServerValidation = useMemo(() => validateFhirServerUrl(fhirServerUrl), [fhirServerUrl]);
  const selectedServerKey = useMemo(
    () => FHIR_SERVER_OPTIONS.find(option => option.url === fhirServerUrl)?.key ?? 'CUSTOM',
    [fhirServerUrl]
  );

  const qualityLabel = validation.score >= 85 ? 'FHIR-ready' : validation.score >= 65 ? 'Needs review' : 'High risk';

  const handleSelectLocation = (location: string) => {
    setActiveLocation(location);
    const element = document.getElementById(pathToDomId(location));
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if ('focus' in element) {
        (element as HTMLElement).focus();
      }
    }
  };

  const handleApplySuggestion = (suggestion: Suggestion) => {
    const action = suggestion.action;
    if (!action) {
      return;
    }

    if (action.type === 'add-identifier' && action.identifier) {
      setPatient(current => ({ ...current, identifier: [...current.identifier, action.identifier as never] }));
    }

    if (action.type === 'add-observation' && action.observation) {
      setObservations(current => [...current, action.observation as never]);
    }
  };

  return (
    <main className="app-shell">
      <header className="hero hero--split">
        <div>
          <p className="eyebrow">SchemaGuard Health AI</p>
          <h1>FHIR-native patient validation for OpenMRS workflows.</h1>
          <p className="subtitle">
            Build standards-compliant Patient, Observation, and Bundle resources with profile-aware validation,
            terminology search, and OpenMRS mapping previews.
          </p>
        </div>

        <div className="hero-meta">
          <div className="hero-meta__field">
            <label>FHIR Profile</label>
            <select value={profile} onChange={event => setProfile(event.target.value as ValidationProfile)}>
              <option value="Base FHIR R4 Patient">Base FHIR R4 Patient</option>
              <option value="India ABDM Patient Profile">India ABDM Patient Profile</option>
              <option value="OpenMRS O3 Patient Profile">OpenMRS O3 Patient Profile</option>
              <option value="Custom Profile">Custom Profile</option>
            </select>
          </div>

          <div className="hero-meta__field">
            <label title="FHIR servers require HTTPS + proper CORS. Default uses the HAPI public test instance.">
              FHIR Server
            </label>
            <select
              value={selectedServerKey}
              onChange={event => {
                const selectedOption = FHIR_SERVER_OPTIONS.find(option => option.key === event.target.value);
                if (selectedOption) {
                  setFhirServerUrl(selectedOption.url);
                }
              }}
            >
              {FHIR_SERVER_OPTIONS.map(option => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
              <option value="CUSTOM">Custom URL</option>
            </select>
            <input value={fhirServerUrl} onChange={event => setFhirServerUrl(event.target.value)} />
            <small className="hint">
              {fhirServerValidation.valid
                ? 'FHIR servers require HTTPS + proper CORS. Default uses the HAPI public test instance.'
                : fhirServerValidation.message}
            </small>
          </div>

          <div className="hero-meta__field">
            <label>Bundle Type</label>
            <select value={bundleType} onChange={event => setBundleType(event.target.value as BundleMode)}>
              <option value="collection">collection</option>
              <option value="transaction">transaction</option>
              <option value="batch">batch</option>
              <option value="searchset">searchset</option>
            </select>
          </div>
        </div>
      </header>

      <section className="stats-grid">
        <article className="stat-card">
          <span>FHIR quality score</span>
          <strong>{validation.score}</strong>
          <small>{qualityLabel}</small>
        </article>
        <article className="stat-card">
          <span>Patient resource</span>
          <strong>{patient.id}</strong>
          <small>{patient.identifier.length} identifiers</small>
        </article>
        <article className="stat-card">
          <span>Observations</span>
          <strong>{observations.length}</strong>
          <small>Blood pressure and custom codes</small>
        </article>
        <article className="stat-card">
          <span>Bundle entries</span>
          <strong>{bundle.entry.length}</strong>
          <small>{bundle.type} bundle</small>
        </article>
      </section>

      <div className="workspace-grid">
        <section className="surface surface--stacked">
          <PatientForm value={patient} onChange={setPatient} activeLocation={activeLocation} />
          <ObservationBuilder
            patientReference={`Patient/${patient.id}`}
            observations={observations}
            onChange={setObservations}
            activeLocation={activeLocation}
          />
        </section>

        <aside className="surface surface--sidebar">
          <QualityScoreGauge score={validation.score} label={qualityLabel} />

          <section className="sidebar-card">
            <h2>FHIRPath Validation</h2>
            <p className="hint">Click an issue to jump to the corresponding form field.</p>
            <FHIRPathErrorTree issues={validation.issues} onSelectLocation={handleSelectLocation} />
          </section>

          <section className="sidebar-card">
            <h2>AI Suggestions</h2>
            <SuggestionPanel suggestions={validation.suggestions} onApply={handleApplySuggestion} />
          </section>

          <section className="sidebar-card">
            <h2>OpenMRS Mapping Preview</h2>
            <div className="example-card">
              <span className="summary-card__label">Mapping summary</span>
              <ul className="example-card__list">
                <li>UUID: {openMRSPreview.uuid}</li>
                <li>Identifiers: {openMRSPreview.identifiers.length}</li>
                <li>Names: {openMRSPreview.names.length}</li>
                <li>Gender: {openMRSPreview.gender}</li>
                <li>Birthdate: {openMRSPreview.birthdate ?? 'Not set'}</li>
                <li>Address: {openMRSPreview.address ?? 'Not set'}</li>
              </ul>
            </div>
          </section>

          <section className="sidebar-card">
            <h2>FHIR Resource Viewer</h2>
            <FHIRResourceViewer patient={patient} observations={observations} bundle={bundle} />
          </section>

          <section className="sidebar-card">
            <h2>FHIR Server Target</h2>
            <p className="hint">Configured for OpenMRS and other FHIR endpoints.</p>
            <code>{fhirServerUrl}</code>
            {!fhirServerValidation.valid && <p className="hint">{fhirServerValidation.message}</p>}
          </section>
        </aside>
      </div>
    </main>
  );
}
