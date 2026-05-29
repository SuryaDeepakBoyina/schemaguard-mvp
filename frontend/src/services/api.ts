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

async function requestWithRetry<T>(url: string, options: RequestInit, retries = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`Request failed with ${response.status}`);
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
  }
};
