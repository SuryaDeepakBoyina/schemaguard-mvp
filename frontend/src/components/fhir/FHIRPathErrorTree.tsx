import { ValidationError } from '../../types/fhir';

interface FHIRPathErrorTreeProps {
  issues: ValidationError[];
  onSelectLocation: (location: string) => void;
}

export function FHIRPathErrorTree({ issues, onSelectLocation }: FHIRPathErrorTreeProps) {
  if (issues.length === 0) {
    return (
      <div className="empty-state">
        <strong>No blocking FHIR issues found.</strong>
        <span>The resource tree is internally consistent for the selected profile.</span>
      </div>
    );
  }

  return (
    <ul className="issue-tree" aria-label="FHIR validation issues">
      {issues.map((issue, index) => (
        <li key={`${issue.location}-${index}`} className={`issue issue--${issue.severity}`}>
          <button type="button" className="issue__button" onClick={() => onSelectLocation(issue.location)}>
            <span className="issue__severity">{issue.severity}</span>
            <span className="issue__location">{issue.location}</span>
            <span className="issue__message">{issue.message}</span>
            {issue.fhirUri && <span className="issue__uri">{issue.fhirUri}</span>}
          </button>
        </li>
      ))}
    </ul>
  );
}
