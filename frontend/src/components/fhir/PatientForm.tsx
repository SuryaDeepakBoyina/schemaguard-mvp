import { ChangeEvent } from 'react';
import {
  Address,
  Communication,
  Contact,
  ContactPoint,
  FHIR_SYSTEMS,
  HumanName,
  Identifier,
  PatientResource,
  pathToDomId
} from '../../types/fhir';

interface PatientFormProps {
  value: PatientResource;
  onChange: (next: PatientResource) => void;
  activeLocation?: string | null;
}

function updateArrayItem<T>(items: T[], index: number, updater: (item: T) => T): T[] {
  return items.map((item, currentIndex) => (currentIndex === index ? updater(item) : item));
}

function addIdentifier(): Identifier {
  return {
    use: 'official',
    type: {
      coding: [
        { system: FHIR_SYSTEMS.identifierType, code: 'MR', display: 'Medical record number' }
      ],
      text: 'Medical record number'
    },
    system: FHIR_SYSTEMS.hospitalIdentifier,
    value: ''
  };
}

function addName(): HumanName {
  return { use: 'official', family: '', given: [''] };
}

function addTelecom(): ContactPoint {
  return { system: 'phone', value: '', use: 'mobile' };
}

function addAddress(): Address {
  return { use: 'home', type: 'physical', line: [''], city: '', state: '', country: 'IN' };
}

function addContact(): Contact {
  return {
    relationship: [
      {
        coding: [{ system: FHIR_SYSTEMS.snomed, code: '103495007', display: 'Emergency contact' }],
        text: 'Emergency contact'
      }
    ],
    name: { family: '', given: [''] },
    telecom: [{ system: 'phone', value: '', use: 'mobile' }],
    address: [{ line: [''], city: '' }]
  };
}

function addCommunication(): Communication {
  return {
    language: {
      coding: [{ system: 'urn:ietf:bcp:47', code: 'en', display: 'English' }],
      text: 'English'
    },
    preferred: true
  };
}

export function PatientForm({ value, onChange, activeLocation }: PatientFormProps) {
  const isActive = (location: string) => pathToDomId(location) === activeLocation;

  const updateValue = (patch: Partial<PatientResource>) => onChange({ ...value, ...patch });

  const handleInput = (field: keyof PatientResource) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    updateValue({ [field]: event.target.value } as Partial<PatientResource>);
  };

  return (
    <div className="fhir-form">
      <header className="section-header">
        <div>
          <h2>FHIR Patient Builder</h2>
          <p>Capture identifiers, names, telecoms, addresses, and contacts as FHIR R4 objects.</p>
        </div>
        <span className="profile-pill">Resource: Patient</span>
      </header>

      <div className="field-grid field-grid--two">
        <label className={isActive('Patient.id') ? 'field field--active' : 'field'}>
          Patient ID
          <input
            id={pathToDomId('Patient.id')}
            value={value.id}
            onChange={handleInput('id')}
            placeholder="pat-001"
          />
        </label>

        <label className={isActive('Patient.gender') ? 'field field--active' : 'field'}>
          Gender
          <select
            id={pathToDomId('Patient.gender')}
            value={value.gender}
            onChange={event => updateValue({ gender: event.target.value as PatientResource['gender'] })}
          >
            <option value="female">female</option>
            <option value="male">male</option>
            <option value="other">other</option>
            <option value="unknown">unknown</option>
          </select>
        </label>
      </div>

      <div className="field-grid field-grid--two">
        <label className="field">
          Birth Date
          <input
            id={pathToDomId('Patient.birthDate')}
            value={value.birthDate ?? ''}
            onChange={event => updateValue({ birthDate: event.target.value })}
            placeholder="YYYY-MM-DD"
          />
        </label>
        <label className="field">
          Marital Status
          <input
            id={pathToDomId('Patient.maritalStatus.text')}
            value={value.maritalStatus?.text ?? ''}
            onChange={event =>
              updateValue({
                maritalStatus: {
                  ...value.maritalStatus,
                  text: event.target.value
                }
              })
            }
            placeholder="Married, Single, etc."
          />
        </label>
      </div>

      <section className="array-section">
        <div className="section-heading">
          <h3>Identifiers</h3>
          <button type="button" className="ghost-button" onClick={() => onChange({ ...value, identifier: [...value.identifier, addIdentifier()] })}>
            Add Identifier
          </button>
        </div>
        {value.identifier.map((identifier, index) => (
          <article key={`identifier-${index}`} className="array-card">
            <div className="array-card__header">
              <strong>Identifier {index + 1}</strong>
              <button
                type="button"
                className="text-button"
                onClick={() => onChange({ ...value, identifier: value.identifier.filter((_, current) => current !== index) })}
              >
                Remove
              </button>
            </div>
            <div className="field-grid field-grid--three">
              <label className="field">
                Use
                <select
                  id={pathToDomId(`Patient.identifier[${index}].use`)}
                  value={identifier.use ?? 'official'}
                  onChange={event =>
                    onChange({
                      ...value,
                      identifier: updateArrayItem(value.identifier, index, item => ({ ...item, use: event.target.value as Identifier['use'] }))
                    })
                  }
                >
                  <option value="official">official</option>
                  <option value="usual">usual</option>
                  <option value="temp">temp</option>
                  <option value="secondary">secondary</option>
                  <option value="old">old</option>
                </select>
              </label>
              <label className="field">
                System URI
                <input
                  id={pathToDomId(`Patient.identifier[${index}].system`)}
                  value={identifier.system}
                  onChange={event =>
                    onChange({
                      ...value,
                      identifier: updateArrayItem(value.identifier, index, item => ({ ...item, system: event.target.value }))
                    })
                  }
                  placeholder="http://hospital.example.org/mrn"
                />
              </label>
              <label className="field">
                Value
                <input
                  id={pathToDomId(`Patient.identifier[${index}].value`)}
                  value={identifier.value}
                  onChange={event =>
                    onChange({
                      ...value,
                      identifier: updateArrayItem(value.identifier, index, item => ({ ...item, value: event.target.value }))
                    })
                  }
                  placeholder="12345"
                />
              </label>
            </div>
          </article>
        ))}
      </section>

      <section className="array-section">
        <div className="section-heading">
          <h3>Names</h3>
          <button type="button" className="ghost-button" onClick={() => onChange({ ...value, name: [...value.name, addName()] })}>
            Add Name
          </button>
        </div>
        {value.name.map((name, index) => (
          <article key={`name-${index}`} className="array-card">
            <div className="array-card__header">
              <strong>Name {index + 1}</strong>
              <button
                type="button"
                className="text-button"
                onClick={() => onChange({ ...value, name: value.name.filter((_, current) => current !== index) })}
              >
                Remove
              </button>
            </div>
            <div className="field-grid field-grid--three">
              <label className="field">
                Use
                <select
                  id={pathToDomId(`Patient.name[${index}].use`)}
                  value={name.use ?? 'official'}
                  onChange={event =>
                    onChange({
                      ...value,
                      name: updateArrayItem(value.name, index, item => ({ ...item, use: event.target.value as HumanName['use'] }))
                    })
                  }
                >
                  <option value="official">official</option>
                  <option value="usual">usual</option>
                  <option value="temp">temp</option>
                  <option value="nickname">nickname</option>
                  <option value="anonymous">anonymous</option>
                  <option value="old">old</option>
                </select>
              </label>
              <label className="field">
                Family
                <input
                  id={pathToDomId(`Patient.name[${index}].family`)}
                  value={name.family ?? ''}
                  onChange={event =>
                    onChange({
                      ...value,
                      name: updateArrayItem(value.name, index, item => ({ ...item, family: event.target.value }))
                    })
                  }
                  placeholder="Devi"
                />
              </label>
              <label className="field">
                Given
                <input
                  id={pathToDomId(`Patient.name[${index}].given`)}
                  value={(name.given ?? []).join(' ')}
                  onChange={event =>
                    onChange({
                      ...value,
                      name: updateArrayItem(value.name, index, item => ({ ...item, given: event.target.value.split(/\s+/).filter(Boolean) }))
                    })
                  }
                  placeholder="Asha"
                />
              </label>
            </div>
          </article>
        ))}
      </section>

      <section className="array-section">
        <div className="section-heading">
          <h3>Telecom</h3>
          <button type="button" className="ghost-button" onClick={() => onChange({ ...value, telecom: [...value.telecom, addTelecom()] })}>
            Add Telecom
          </button>
        </div>
        {value.telecom.map((telecom, index) => (
          <article key={`telecom-${index}`} className="array-card">
            <div className="array-card__header">
              <strong>Contact Point {index + 1}</strong>
              <button
                type="button"
                className="text-button"
                onClick={() => onChange({ ...value, telecom: value.telecom.filter((_, current) => current !== index) })}
              >
                Remove
              </button>
            </div>
            <div className="field-grid field-grid--three">
              <label className="field">
                System
                <select
                  id={pathToDomId(`Patient.telecom[${index}].system`)}
                  value={telecom.system}
                  onChange={event =>
                    onChange({
                      ...value,
                      telecom: updateArrayItem(value.telecom, index, item => ({ ...item, system: event.target.value as ContactPoint['system'] }))
                    })
                  }
                >
                  <option value="phone">phone</option>
                  <option value="fax">fax</option>
                  <option value="email">email</option>
                  <option value="pager">pager</option>
                  <option value="url">url</option>
                  <option value="sms">sms</option>
                  <option value="other">other</option>
                </select>
              </label>
              <label className="field">
                Value
                <input
                  id={pathToDomId(`Patient.telecom[${index}].value`)}
                  value={telecom.value}
                  onChange={event =>
                    onChange({
                      ...value,
                      telecom: updateArrayItem(value.telecom, index, item => ({ ...item, value: event.target.value }))
                    })
                  }
                  placeholder="+91-9876543210"
                />
              </label>
              <label className="field">
                Use
                <select
                  id={pathToDomId(`Patient.telecom[${index}].use`)}
                  value={telecom.use ?? 'mobile'}
                  onChange={event =>
                    onChange({
                      ...value,
                      telecom: updateArrayItem(value.telecom, index, item => ({ ...item, use: event.target.value as ContactPoint['use'] }))
                    })
                  }
                >
                  <option value="home">home</option>
                  <option value="work">work</option>
                  <option value="temp">temp</option>
                  <option value="old">old</option>
                  <option value="mobile">mobile</option>
                </select>
              </label>
            </div>
          </article>
        ))}
      </section>

      <section className="array-section">
        <div className="section-heading">
          <h3>Addresses</h3>
          <button type="button" className="ghost-button" onClick={() => onChange({ ...value, address: [...value.address, addAddress()] })}>
            Add Address
          </button>
        </div>
        {value.address.map((address, index) => (
          <article key={`address-${index}`} className="array-card">
            <div className="array-card__header">
              <strong>Address {index + 1}</strong>
              <button
                type="button"
                className="text-button"
                onClick={() => onChange({ ...value, address: value.address.filter((_, current) => current !== index) })}
              >
                Remove
              </button>
            </div>
            <div className="field-grid field-grid--two">
              <label className="field">
                City
                <input
                  id={pathToDomId(`Patient.address[${index}].city`)}
                  value={address.city ?? ''}
                  onChange={event =>
                    onChange({
                      ...value,
                      address: updateArrayItem(value.address, index, item => ({ ...item, city: event.target.value }))
                    })
                  }
                />
              </label>
              <label className="field">
                State
                <input
                  id={pathToDomId(`Patient.address[${index}].state`)}
                  value={address.state ?? ''}
                  onChange={event =>
                    onChange({
                      ...value,
                      address: updateArrayItem(value.address, index, item => ({ ...item, state: event.target.value }))
                    })
                  }
                />
              </label>
            </div>
            <div className="field-grid field-grid--three">
              <label className="field">
                Line 1
                <input
                  id={pathToDomId(`Patient.address[${index}].line[0]`)}
                  value={address.line[0] ?? ''}
                  onChange={event =>
                    onChange({
                      ...value,
                      address: updateArrayItem(value.address, index, item => ({
                        ...item,
                        line: [event.target.value, ...(item.line.slice(1) ?? [])]
                      }))
                    })
                  }
                />
              </label>
              <label className="field">
                Postal Code
                <input
                  id={pathToDomId(`Patient.address[${index}].postalCode`)}
                  value={address.postalCode ?? ''}
                  onChange={event =>
                    onChange({
                      ...value,
                      address: updateArrayItem(value.address, index, item => ({ ...item, postalCode: event.target.value }))
                    })
                  }
                />
              </label>
              <label className="field">
                Country
                <input
                  id={pathToDomId(`Patient.address[${index}].country`)}
                  value={address.country ?? ''}
                  onChange={event =>
                    onChange({
                      ...value,
                      address: updateArrayItem(value.address, index, item => ({ ...item, country: event.target.value }))
                    })
                  }
                />
              </label>
            </div>
          </article>
        ))}
      </section>

      <section className="array-section">
        <div className="section-heading">
          <h3>Emergency Contacts</h3>
          <button type="button" className="ghost-button" onClick={() => onChange({ ...value, contact: [...value.contact, addContact()] })}>
            Add Contact
          </button>
        </div>
        {value.contact.map((contact, index) => (
          <article key={`contact-${index}`} className="array-card">
            <div className="array-card__header">
              <strong>Contact {index + 1}</strong>
              <button
                type="button"
                className="text-button"
                onClick={() => onChange({ ...value, contact: value.contact.filter((_, current) => current !== index) })}
              >
                Remove
              </button>
            </div>
            <div className="field-grid field-grid--two">
              <label className="field">
                Family
                <input
                  value={contact.name.family ?? ''}
                  onChange={event =>
                    onChange({
                      ...value,
                      contact: updateArrayItem(value.contact, index, item => ({
                        ...item,
                        name: { ...item.name, family: event.target.value }
                      }))
                    })
                  }
                />
              </label>
              <label className="field">
                Given
                <input
                  value={(contact.name.given ?? []).join(' ')}
                  onChange={event =>
                    onChange({
                      ...value,
                      contact: updateArrayItem(value.contact, index, item => ({
                        ...item,
                        name: { ...item.name, given: event.target.value.split(/\s+/).filter(Boolean) }
                      }))
                    })
                  }
                />
              </label>
            </div>
          </article>
        ))}
      </section>

      <section className="array-section">
        <div className="section-heading">
          <h3>Language Communication</h3>
          <button type="button" className="ghost-button" onClick={() => onChange({ ...value, communication: [...value.communication, addCommunication()] })}>
            Add Language
          </button>
        </div>
        {value.communication.map((communication, index) => (
          <article key={`communication-${index}`} className="array-card">
            <div className="array-card__header">
              <strong>Communication {index + 1}</strong>
              <button
                type="button"
                className="text-button"
                onClick={() => onChange({ ...value, communication: value.communication.filter((_, current) => current !== index) })}
              >
                Remove
              </button>
            </div>
            <div className="field-grid field-grid--two">
              <label className="field">
                Language
                <input
                  value={communication.language.text ?? communication.language.coding?.[0]?.display ?? ''}
                  onChange={event =>
                    onChange({
                      ...value,
                      communication: updateArrayItem(value.communication, index, item => ({
                        ...item,
                        language: {
                          ...item.language,
                          text: event.target.value
                        }
                      }))
                    })
                  }
                />
              </label>
              <label className="field">
                Preferred
                <select
                  value={communication.preferred ? 'true' : 'false'}
                  onChange={event =>
                    onChange({
                      ...value,
                      communication: updateArrayItem(value.communication, index, item => ({
                        ...item,
                        preferred: event.target.value === 'true'
                      }))
                    })
                  }
                >
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
              </label>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
