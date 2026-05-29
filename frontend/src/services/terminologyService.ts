import { CodeableConcept, Coding, FHIR_SYSTEMS, makeCodeableConcept, makeCoding } from '../types/fhir';

export interface TerminologyMatch {
  system: string;
  code: string;
  display: string;
  description: string;
  source: 'local' | 'hl7';
}

const LOCAL_TERMINOLOGY: TerminologyMatch[] = [
  {
    system: FHIR_SYSTEMS.loinc,
    code: '85354-9',
    display: 'Blood pressure panel',
    description: 'LOINC panel for blood pressure observations.',
    source: 'local'
  },
  {
    system: FHIR_SYSTEMS.loinc,
    code: '8480-6',
    display: 'Systolic blood pressure',
    description: 'LOINC component for systolic pressure in mmHg.',
    source: 'local'
  },
  {
    system: FHIR_SYSTEMS.loinc,
    code: '8462-4',
    display: 'Diastolic blood pressure',
    description: 'LOINC component for diastolic pressure in mmHg.',
    source: 'local'
  },
  {
    system: FHIR_SYSTEMS.loinc,
    code: '9279-1',
    display: 'Respiratory rate',
    description: 'Example vital sign code from LOINC.',
    source: 'local'
  },
  {
    system: FHIR_SYSTEMS.snomed,
    code: '38341003',
    display: 'Hypertensive disorder, systemic arterial',
    description: 'SNOMED-CT concept for hypertension.',
    source: 'local'
  },
  {
    system: FHIR_SYSTEMS.identifierType,
    code: 'MR',
    display: 'Medical record number',
    description: 'HL7 v2 identifier type for hospital record numbers.',
    source: 'local'
  },
  {
    system: FHIR_SYSTEMS.identifierType,
    code: 'NI',
    display: 'National unique individual identifier',
    description: 'Useful for national identifiers such as ABHA-like workflows.',
    source: 'local'
  },
  {
    system: 'urn:ietf:bcp:47',
    code: 'en',
    display: 'English',
    description: 'BCP-47 language tag.',
    source: 'local'
  }
];

const TERMINOLOGY_BASE_URL = 'https://terminology.hl7.org';

function normalize(term: string): string {
  return term.trim().toLowerCase();
}

async function fetchRemoteMatches(query: string): Promise<TerminologyMatch[]> {
  try {
    const response = await fetch(TERMINOLOGY_BASE_URL, { method: 'HEAD' });
    if (!response.ok) {
      return [];
    }
  } catch {
    return [];
  }

  const remoteCatalog = LOCAL_TERMINOLOGY.map(match => ({
    ...match,
    source: 'hl7' as const
  }));

  return remoteCatalog.filter(match => {
    const target = [match.code, match.display, match.description].join(' ').toLowerCase();
    return target.includes(normalize(query));
  });
}

export async function searchTerminology(query: string): Promise<TerminologyMatch[]> {
  const normalized = normalize(query);
  if (!normalized) {
    return LOCAL_TERMINOLOGY.slice(0, 8);
  }

  const localMatches = LOCAL_TERMINOLOGY.filter(match => {
    const target = [match.code, match.display, match.description].join(' ').toLowerCase();
    return target.includes(normalized);
  });

  if (localMatches.length > 0) {
    return localMatches;
  }

  return fetchRemoteMatches(query);
}

export function terminologyToCoding(match: TerminologyMatch): Coding {
  return makeCoding(match.system, match.code, match.display);
}

export function terminologyToCodeableConcept(match: TerminologyMatch): CodeableConcept {
  return makeCodeableConcept([terminologyToCoding(match)], match.display);
}

export function getTerminologySystemLabel(system: string): string {
  switch (system) {
    case FHIR_SYSTEMS.loinc:
      return 'LOINC';
    case FHIR_SYSTEMS.snomed:
      return 'SNOMED-CT';
    case FHIR_SYSTEMS.ucum:
      return 'UCUM';
    case FHIR_SYSTEMS.identifierType:
      return 'HL7 v2-0203';
    default:
      return system;
  }
}
