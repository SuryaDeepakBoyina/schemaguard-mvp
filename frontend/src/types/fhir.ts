export type AdministrativeGender = 'male' | 'female' | 'other' | 'unknown';
export type ContactPointSystem = 'phone' | 'fax' | 'email' | 'pager' | 'url' | 'sms' | 'other';
export type ContactPointUse = 'home' | 'work' | 'temp' | 'old' | 'mobile';
export type AddressUse = 'home' | 'work' | 'temp' | 'old' | 'billing';
export type AddressType = 'both' | 'physical' | 'postal';
export type BundleType = 'document' | 'message' | 'transaction' | 'transaction-response' | 'batch' | 'batch-response' | 'history' | 'searchset' | 'collection';
export type ObservationStatus = 'registered' | 'preliminary' | 'final' | 'amended' | 'corrected' | 'cancelled' | 'entered-in-error' | 'unknown';

export interface Coding {
  system: string;
  code: string;
  display?: string;
  userSelected?: boolean;
}

export interface CodeableConcept {
  coding?: Coding[];
  text?: string;
}

export interface Quantity {
  value: number;
  comparator?: '<' | '<=' | '>=' | '>';
  unit?: string;
  system?: string;
  code?: string;
}

export interface Reference {
  reference: string;
  type?: 'Patient' | 'Observation' | 'Condition' | 'Bundle' | 'Practitioner';
  display?: string;
}

export interface Identifier {
  use?: 'usual' | 'official' | 'temp' | 'secondary' | 'old';
  type?: CodeableConcept;
  system: string;
  value: string;
  period?: Period;
  assigner?: Reference;
}

export interface HumanName {
  use?: 'usual' | 'official' | 'temp' | 'nickname' | 'anonymous' | 'old' | 'maiden';
  text?: string;
  family?: string;
  given?: string[];
  prefix?: string[];
  suffix?: string[];
  period?: Period;
}

export interface ContactPoint {
  system: ContactPointSystem;
  value: string;
  use?: ContactPointUse;
  rank?: number;
  period?: Period;
}

export interface Address {
  use?: AddressUse;
  type?: AddressType;
  text?: string;
  line: string[];
  city?: string;
  district?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  period?: Period;
}

export interface Period {
  start?: string;
  end?: string;
}

export interface Contact {
  relationship: CodeableConcept[];
  name: HumanName;
  telecom: ContactPoint[];
  address: Address[];
  gender?: AdministrativeGender;
  organization?: Reference;
  period?: Period;
}

export interface Communication {
  language: CodeableConcept;
  preferred?: boolean;
}

export interface Extension {
  url: string;
  valueString?: string;
  valueBoolean?: boolean;
  valueCode?: string;
  valueUri?: string;
  valueDate?: string;
  valueDateTime?: string;
  valueInteger?: number;
  valueDecimal?: number;
  valueQuantity?: Quantity;
  extension?: Extension[];
}

export interface Meta {
  versionId?: string;
  lastUpdated?: string;
  profile?: string[];
  tag?: Coding[];
}

export interface PatientResource {
  resourceType: 'Patient';
  id: string;
  meta?: Meta;
  identifier: Identifier[];
  active?: boolean;
  name: HumanName[];
  telecom: ContactPoint[];
  gender: AdministrativeGender;
  birthDate?: string;
  deceasedBoolean?: boolean;
  deceasedDateTime?: string;
  address: Address[];
  maritalStatus?: CodeableConcept;
  multipleBirthBoolean?: boolean;
  contact: Contact[];
  communication: Communication[];
  extension?: Extension[];
}

export interface ObservationComponent {
  code: CodeableConcept;
  valueQuantity?: Quantity;
  valueString?: string;
  valueCodeableConcept?: CodeableConcept;
}

export interface ObservationResource {
  resourceType: 'Observation';
  id: string;
  status: ObservationStatus;
  category: CodeableConcept[];
  code: CodeableConcept;
  subject: Reference;
  effectiveDateTime: string;
  valueQuantity?: Quantity;
  valueString?: string;
  component: ObservationComponent[];
  extension?: Extension[];
}

export interface BundleEntry {
  fullUrl?: string;
  resource: PatientResource | ObservationResource;
  request?: {
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    url: string;
  };
}

export interface BundleResource {
  resourceType: 'Bundle';
  id: string;
  type: BundleType;
  timestamp?: string;
  total?: number;
  entry: BundleEntry[];
}

export interface ValidationError {
  severity: 'error' | 'warning' | 'information';
  location: string;
  message: string;
  element?: string;
  fhirUri?: string;
}

export interface SuggestionAction {
  type: 'add-identifier' | 'add-observation' | 'set-field';
  target?: string;
  value?: unknown;
  identifier?: Identifier;
  observation?: ObservationResource;
}

export interface Suggestion {
  field: string;
  suggestion: string;
  confidence: number;
  code_example?: unknown;
  action?: SuggestionAction;
}

export interface OpenMRSMapping {
  uuid: string;
  identifiers: Array<{ system: string; value: string; type?: string }>;
  names: Array<{ given: string[]; family?: string; use?: string }>;
  gender: AdministrativeGender;
  birthdate?: string;
  address?: string;
}

export const FHIR_SYSTEMS = {
  identifierType: 'http://terminology.hl7.org/CodeSystem/v2-0203',
  observationCategory: 'http://terminology.hl7.org/CodeSystem/observation-category',
  loinc: 'http://loinc.org',
  snomed: 'http://snomed.info/sct',
  ucum: 'http://unitsofmeasure.org',
  administrativeGender: 'http://hl7.org/fhir/ValueSet/administrative-gender',
  abhaIdentifier: 'http://abdm.gov.in/fhir/NamingSystem/abha',
  hospitalIdentifier: 'http://hospital.example.org/mrn'
} as const;

export function pathToDomId(path: string): string {
  return path.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
}

export function makeCoding(system: string, code: string, display?: string): Coding {
  return { system, code, display };
}

export function makeCodeableConcept(coding: Coding[], text?: string): CodeableConcept {
  return { coding, text };
}

export function createPatientResource(id = 'pat-001'): PatientResource {
  return {
    resourceType: 'Patient',
    id,
    meta: {
      profile: ['http://hl7.org/fhir/StructureDefinition/Patient']
    },
    identifier: [
      {
        use: 'official',
        type: makeCodeableConcept([
          makeCoding(FHIR_SYSTEMS.identifierType, 'MR', 'Medical record number')
        ], 'Medical Record Number'),
        system: FHIR_SYSTEMS.hospitalIdentifier,
        value: '12345'
      }
    ],
    active: true,
    name: [
      {
        use: 'official',
        family: 'Devi',
        given: ['Asha'],
        prefix: ['Ms.']
      }
    ],
    telecom: [
      { system: 'phone', value: '+91-9876543210', use: 'mobile' }
    ],
    gender: 'female',
    birthDate: '2020-01-15',
    address: [
      {
        use: 'home',
        type: 'physical',
        line: ['Village Ramnagar'],
        city: 'Shimla',
        state: 'Himachal Pradesh',
        postalCode: '171001',
        country: 'IN'
      }
    ],
    maritalStatus: makeCodeableConcept([
      makeCoding(FHIR_SYSTEMS.snomed, '365581002', 'Married')
    ], 'Married'),
    multipleBirthBoolean: false,
    contact: [
      {
        relationship: [makeCodeableConcept([
          makeCoding(FHIR_SYSTEMS.snomed, '103495007', 'Emergency contact')
        ], 'Emergency contact')],
        name: {
          family: 'Kumar',
          given: ['Ravi']
        },
        telecom: [{ system: 'phone', value: '+91-9000000000', use: 'mobile' }],
        address: [{ line: ['Village Ramnagar'], city: 'Shimla', country: 'IN' }]
      }
    ],
    communication: [
      {
        language: makeCodeableConcept([
          makeCoding('urn:ietf:bcp:47', 'en', 'English')
        ], 'English'),
        preferred: true
      }
    ]
  };
}

export function createBloodPressureObservation(
  subjectReference: string,
  systolic = 120,
  diastolic = 80,
  effectiveDateTime = new Date().toISOString()
): ObservationResource {
  return {
    resourceType: 'Observation',
    id: `obs-${Math.random().toString(36).slice(2, 10)}`,
    status: 'final',
    category: [
      makeCodeableConcept([
        makeCoding(FHIR_SYSTEMS.observationCategory, 'vital-signs', 'Vital Signs')
      ], 'Vital Signs')
    ],
    code: makeCodeableConcept([
      makeCoding(FHIR_SYSTEMS.loinc, '85354-9', 'Blood pressure panel')
    ], 'Blood pressure panel'),
    subject: {
      reference: subjectReference,
      type: 'Patient'
    },
    effectiveDateTime,
    component: [
      {
        code: makeCodeableConcept([
          makeCoding(FHIR_SYSTEMS.loinc, '8480-6', 'Systolic blood pressure')
        ], 'Systolic blood pressure'),
        valueQuantity: {
          value: systolic,
          unit: 'mmHg',
          system: FHIR_SYSTEMS.ucum,
          code: 'mm[Hg]'
        }
      },
      {
        code: makeCodeableConcept([
          makeCoding(FHIR_SYSTEMS.loinc, '8462-4', 'Diastolic blood pressure')
        ], 'Diastolic blood pressure'),
        valueQuantity: {
          value: diastolic,
          unit: 'mmHg',
          system: FHIR_SYSTEMS.ucum,
          code: 'mm[Hg]'
        }
      }
    ]
  };
}

export function createCustomObservation(
  subjectReference: string,
  coding: Coding,
  value: number,
  unit: string,
  effectiveDateTime = new Date().toISOString()
): ObservationResource {
  return {
    resourceType: 'Observation',
    id: `obs-${Math.random().toString(36).slice(2, 10)}`,
    status: 'final',
    category: [
      makeCodeableConcept([
        makeCoding(FHIR_SYSTEMS.observationCategory, 'vital-signs', 'Vital Signs')
      ], 'Vital Signs')
    ],
    code: makeCodeableConcept([coding], coding.display),
    subject: {
      reference: subjectReference,
      type: 'Patient'
    },
    effectiveDateTime,
    valueQuantity: {
      value,
      unit,
      system: FHIR_SYSTEMS.ucum,
      code: unit
    },
    component: []
  };
}

export function createBundleResource(
  patient: PatientResource,
  observations: ObservationResource[],
  type: BundleType = 'collection'
): BundleResource {
  const entries: BundleEntry[] = [
    {
      fullUrl: `urn:uuid:${patient.id}`,
      resource: patient
    },
    ...observations.map(observation => ({
      fullUrl: `urn:uuid:${observation.id}`,
      resource: observation
    }))
  ];

  return {
    resourceType: 'Bundle',
    id: `bundle-${Math.random().toString(36).slice(2, 10)}`,
    type,
    timestamp: new Date().toISOString(),
    total: entries.length,
    entry: entries
  };
}

export function createOpenMRSMapping(patient: PatientResource): OpenMRSMapping {
  const displayName = patient.name[0];
  return {
    uuid: patient.id,
    identifiers: patient.identifier.map(identifier => ({
      system: identifier.system,
      value: identifier.value,
      type: identifier.type?.text ?? identifier.type?.coding?.[0]?.code
    })),
    names: patient.name.map(name => ({
      given: name.given ?? [],
      family: name.family,
      use: name.use
    })),
    gender: patient.gender,
    birthdate: patient.birthDate,
    address: displayName ? patient.address[0]?.line?.join(', ') : undefined
  };
}
