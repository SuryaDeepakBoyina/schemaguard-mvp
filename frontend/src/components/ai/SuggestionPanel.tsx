import { Suggestion } from '../../types/fhir';

interface SuggestionPanelProps {
  suggestions: Suggestion[];
  onApply: (suggestion: Suggestion) => void;
}

export function SuggestionPanel({ suggestions, onApply }: SuggestionPanelProps) {
  const describeCodeExample = (value: unknown): string[] => {
    if (value === null || value === undefined) {
      return [];
    }

    if (typeof value !== 'object') {
      return [String(value)];
    }

    if (Array.isArray(value)) {
      return value.slice(0, 4).map(item => String(item));
    }

    return Object.entries(value as Record<string, unknown>).map(([key, entry]) => {
      if (entry === null || entry === undefined) {
        return `${key}: -`;
      }

      if (typeof entry !== 'object') {
        return `${key}: ${String(entry)}`;
      }

      if (Array.isArray(entry)) {
        return `${key}: ${entry.slice(0, 3).map(item => String(item)).join(', ')}`;
      }

      const nested = Object.entries(entry as Record<string, unknown>)
        .map(([nestedKey, nestedValue]) => `${nestedKey}: ${String(nestedValue)}`)
        .join(' • ');

      return `${key}: ${nested}`;
    });
  };

  if (suggestions.length === 0) {
    return (
      <div className="empty-state">
        <strong>No AI suggestions yet.</strong>
        <span>Validate the record to generate profile-aware fixups.</span>
      </div>
    );
  }

  return (
    <div className="suggestion-list">
      {suggestions.map((suggestion, index) => (
        <article key={`${suggestion.field}-${index}`} className="suggestion-card">
          <div className="suggestion-card__header">
            <strong>{suggestion.field}</strong>
            <span>{Math.round(suggestion.confidence * 100)}% confidence</span>
          </div>
          <p>{suggestion.suggestion}</p>
          {suggestion.code_example !== undefined && (
            <div className="example-card">
              <span className="summary-card__label">Example</span>
              <ul className="example-card__list">
                {describeCodeExample(suggestion.code_example).map(line => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          )}
          <button type="button" className="secondary-button" onClick={() => onApply(suggestion)}>
            Apply
          </button>
        </article>
      ))}
    </div>
  );
}
