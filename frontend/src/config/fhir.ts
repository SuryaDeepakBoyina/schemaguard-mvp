export type FhirServerOption = {
  key: string;
  label: string;
  url: string;
};

export const FHIR_SERVER_OPTIONS: FhirServerOption[] = [
  {
    key: 'HAPI_R4',
    label: 'HAPI FHIR Public Test',
    url: 'https://hapi.fhir.org/baseR4'
  },
  {
    key: 'OPENMRS_DEMO',
    label: 'OpenMRS Official Demo',
    url: 'https://openmrs-spa.org/openmrs/ws/fhir2/R4'
  },
  {
    key: 'SMART_SANDBOX',
    label: 'SMART on FHIR Sandbox',
    url: 'https://fhir.smarthealthit.org'
  }
] as const;

export const DEFAULT_FHIR_URL = import.meta.env.VITE_FHIR_SERVER_URL?.trim() || FHIR_SERVER_OPTIONS[0].url;

export function validateFhirServerUrl(url: string): { valid: boolean; message?: string } {
  const trimmedUrl = url.trim();

  if (!trimmedUrl) {
    return { valid: false, message: 'FHIR server URL is required.' };
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(trimmedUrl);
  } catch {
    return { valid: false, message: 'Enter a valid HTTPS FHIR server URL.' };
  }

  if (parsedUrl.protocol !== 'https:') {
    return { valid: false, message: 'FHIR servers must use HTTPS.' };
  }

  if (
    import.meta.env.PROD &&
    (parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1' || parsedUrl.hostname === '0.0.0.0')
  ) {
    return { valid: false, message: 'Localhost URLs are blocked in production builds.' };
  }

  const normalizedPath = parsedUrl.pathname.replace(/\/+$/, '');
  if (!/(\/fhir2\/R4|\/fhir|\/baseR4)$/.test(normalizedPath)) {
    return {
      valid: false,
      message: 'Use a FHIR base URL such as /fhir, /fhir2/R4, or /baseR4.'
    };
  }

  return { valid: true };
}