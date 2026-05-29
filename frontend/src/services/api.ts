export interface ValidationRecord {
  id: string;
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other' | 'unknown';
  vitals: Record<string, unknown>;
  diagnoses: string[];
}

export interface ValidationResponse {
  quality_score: number;
  issues: string[];
  fhir_compliant: boolean;
}

export interface Suggestion {
  field: string;
  original: any;
  suggested: any;
  reason: string;
  confidence: number;
  needs_review: boolean;
}

export interface SuggestionResponse {
  suggestions: Suggestion[];
}

export interface FHIRCheckResponse {
  valid: boolean;
  resource_type: string;
  resource: Record<string, any>;
  errors?: string[];
}

async function requestWithRetry<T>(url: string, options: RequestInit, retries = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        let errorMsg = `Request failed with ${response.status}`;
        try {
          const detail = await response.json();
          if (detail.detail) errorMsg = detail.detail;
        } catch { /* ignore */ }
        throw new Error(errorMsg);
      }
      return (await response.json()) as T;
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Request failed');
}

export const apiClient = {
  validateRecord(record: ValidationRecord) {
    return requestWithRetry<ValidationResponse>('/validate-record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    });
  },
  suggestFixes(record: ValidationRecord, issues: string[]) {
    return requestWithRetry<SuggestionResponse>('/suggest-fixes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ record, issues })
    });
  },
  fhirCheck(record: ValidationRecord) {
    return requestWithRetry<FHIRCheckResponse>('/fhir-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ record })
    });
  }
};
