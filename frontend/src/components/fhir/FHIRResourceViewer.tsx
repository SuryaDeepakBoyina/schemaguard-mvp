import { BundleResource, ObservationResource, PatientResource } from '../../types/fhir';

interface FHIRResourceViewerProps {
  patient: PatientResource;
  observations: ObservationResource[];
  bundle: BundleResource;
}

export function FHIRResourceViewer({ patient, observations, bundle }: FHIRResourceViewerProps) {
  const entrySummaries = bundle.entry.map(entry => {
    const resource = entry.resource;
    return {
      id: resource.id,
      type: resource.resourceType,
      label:
        resource.resourceType === 'Patient'
          ? resource.name[0]?.family ?? resource.id
          : resource.code.text ?? resource.code.coding?.[0]?.display ?? resource.id,
      reference: entry.fullUrl ?? resource.id
    };
  });

  return (
    <section className="resource-viewer">
      <div className="resource-viewer__header">
        <h2>FHIR Resource Viewer</h2>
        <p>Patient, Observation, and Bundle details rendered as concise clinical summaries.</p>
      </div>

      <div className="resource-summary-grid">
        <article className="summary-card">
          <span className="summary-card__label">Patient</span>
          <strong>{patient.name[0]?.family ?? patient.id}</strong>
          <span>{patient.identifier.length} identifiers</span>
        </article>
        <article className="summary-card">
          <span className="summary-card__label">Observations</span>
          <strong>{observations.length}</strong>
          <span>Vital and custom clinical observations</span>
        </article>
        <article className="summary-card">
          <span className="summary-card__label">Bundle</span>
          <strong>{bundle.type}</strong>
          <span>{bundle.entry.length} bundled resources</span>
        </article>
      </div>

      <div className="array-card">
        <div className="section-heading">
          <h3>Bundle Contents</h3>
          <span className="hint">FHIR resource summary without raw JSON.</span>
        </div>
        <div className="resource-entry-list">
          {entrySummaries.map(entry => (
            <article key={entry.reference} className="summary-card summary-card--stacked">
              <span className="summary-card__label">{entry.type}</span>
              <strong>{entry.label}</strong>
              <span>{entry.id}</span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
