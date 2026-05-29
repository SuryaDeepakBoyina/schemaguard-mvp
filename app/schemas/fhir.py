"""FHIR resource and response schemas used by the backend API."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class FHIRBaseModel(BaseModel):
    model_config = ConfigDict(extra="ignore")


class Coding(FHIRBaseModel):
    system: str
    code: str
    display: str | None = None
    userSelected: bool | None = None


class CodeableConcept(FHIRBaseModel):
    coding: list[Coding] = Field(default_factory=list)
    text: str | None = None


class Quantity(FHIRBaseModel):
    value: float
    comparator: Literal["<", "<=", ">=", ">"] | None = None
    unit: str | None = None
    system: str | None = None
    code: str | None = None


class Reference(FHIRBaseModel):
    reference: str
    type: str | None = None
    display: str | None = None


class Period(FHIRBaseModel):
    start: str | None = None
    end: str | None = None


class Identifier(FHIRBaseModel):
    use: Literal["usual", "official", "temp", "secondary", "old"] | None = None
    type: CodeableConcept | None = None
    system: str
    value: str
    period: Period | None = None
    assigner: Reference | None = None


class HumanName(FHIRBaseModel):
    use: Literal["usual", "official", "temp", "nickname", "anonymous", "old", "maiden"] | None = None
    text: str | None = None
    family: str | None = None
    given: list[str] = Field(default_factory=list)
    prefix: list[str] = Field(default_factory=list)
    suffix: list[str] = Field(default_factory=list)
    period: Period | None = None


class ContactPoint(FHIRBaseModel):
    system: Literal["phone", "fax", "email", "pager", "url", "sms", "other"]
    value: str
    use: Literal["home", "work", "temp", "old", "mobile"] | None = None
    rank: int | None = None
    period: Period | None = None


class Address(FHIRBaseModel):
    use: Literal["home", "work", "temp", "old", "billing"] | None = None
    type: Literal["both", "physical", "postal"] | None = None
    text: str | None = None
    line: list[str] = Field(default_factory=list)
    city: str | None = None
    district: str | None = None
    state: str | None = None
    postalCode: str | None = None
    country: str | None = None
    period: Period | None = None


class Contact(FHIRBaseModel):
    relationship: list[CodeableConcept] = Field(default_factory=list)
    name: HumanName
    telecom: list[ContactPoint] = Field(default_factory=list)
    address: list[Address] = Field(default_factory=list)
    gender: Literal["male", "female", "other", "unknown"] | None = None
    organization: Reference | None = None
    period: Period | None = None


class Communication(FHIRBaseModel):
    language: CodeableConcept
    preferred: bool | None = None


class Meta(FHIRBaseModel):
    versionId: str | None = None
    lastUpdated: str | None = None
    profile: list[str] = Field(default_factory=list)
    tag: list[Coding] = Field(default_factory=list)


class Extension(FHIRBaseModel):
    url: str
    valueString: str | None = None
    valueBoolean: bool | None = None
    valueCode: str | None = None
    valueUri: str | None = None
    valueDate: str | None = None
    valueDateTime: str | None = None
    valueInteger: int | None = None
    valueDecimal: float | None = None
    valueQuantity: Quantity | None = None
    extension: list["Extension"] = Field(default_factory=list)


class PatientResource(FHIRBaseModel):
    resourceType: Literal["Patient"] = "Patient"
    id: str
    meta: Meta | None = None
    identifier: list[Identifier] = Field(default_factory=list)
    active: bool | None = None
    name: list[HumanName] = Field(default_factory=list)
    telecom: list[ContactPoint] = Field(default_factory=list)
    gender: Literal["male", "female", "other", "unknown"]
    birthDate: str | None = None
    deceasedBoolean: bool | None = None
    deceasedDateTime: str | None = None
    address: list[Address] = Field(default_factory=list)
    maritalStatus: CodeableConcept | None = None
    multipleBirthBoolean: bool | None = None
    contact: list[Contact] = Field(default_factory=list)
    communication: list[Communication] = Field(default_factory=list)
    extension: list[Extension] = Field(default_factory=list)


class ObservationComponent(FHIRBaseModel):
    code: CodeableConcept
    valueQuantity: Quantity | None = None
    valueString: str | None = None
    valueCodeableConcept: CodeableConcept | None = None


class ObservationResource(FHIRBaseModel):
    resourceType: Literal["Observation"] = "Observation"
    id: str
    status: Literal["registered", "preliminary", "final", "amended", "corrected", "cancelled", "entered-in-error", "unknown"]
    category: list[CodeableConcept] = Field(default_factory=list)
    code: CodeableConcept
    subject: Reference
    effectiveDateTime: str
    valueQuantity: Quantity | None = None
    valueString: str | None = None
    component: list[ObservationComponent] = Field(default_factory=list)
    extension: list[Extension] = Field(default_factory=list)


class BundleEntryRequest(FHIRBaseModel):
    method: Literal["GET", "POST", "PUT", "PATCH", "DELETE"]
    url: str


class BundleEntry(FHIRBaseModel):
    fullUrl: str | None = None
    resource: PatientResource | ObservationResource
    request: BundleEntryRequest | None = None


class BundleResource(FHIRBaseModel):
    resourceType: Literal["Bundle"] = "Bundle"
    id: str
    type: Literal[
        "document",
        "message",
        "transaction",
        "transaction-response",
        "batch",
        "batch-response",
        "history",
        "searchset",
        "collection",
    ]
    timestamp: str | None = None
    total: int | None = None
    entry: list[BundleEntry] = Field(default_factory=list)


class ValidationIssue(FHIRBaseModel):
    severity: Literal["error", "warning", "information"]
    location: str
    message: str
    element: str | None = None
    fhirUri: str | None = None


class SuggestionAction(FHIRBaseModel):
    type: Literal["add-identifier", "add-observation", "set-field"]
    target: str | None = None
    value: Any | None = None
    identifier: Identifier | None = None
    observation: ObservationResource | None = None


class SuggestionItem(FHIRBaseModel):
    field: str
    suggestion: str
    confidence: float = Field(ge=0.0, le=1.0)
    code_example: Any | None = None
    action: SuggestionAction | None = None
    original: Any | None = None
    suggested: Any | None = None
    reason: str | None = None
    needs_review: bool = False


class OpenMRSMapping(FHIRBaseModel):
    uuid: str
    identifiers: list[dict[str, Any]] = Field(default_factory=list)
    names: list[dict[str, Any]] = Field(default_factory=list)
    gender: Literal["male", "female", "other", "unknown"]
    birthdate: str | None = None
    address: str | None = None


class LegacyPatientRecord(FHIRBaseModel):
    id: str
    name: str
    age: int
    gender: Literal["male", "female", "other", "unknown"]
    vitals: dict[str, Any] = Field(default_factory=dict)
    diagnoses: list[str] = Field(default_factory=list)
    phone: str | None = None
    pregnant: bool | None = None


class FHIRValidationRequest(FHIRBaseModel):
    patient: PatientResource
    observations: list[ObservationResource] = Field(default_factory=list)
    bundle: BundleResource | None = None
    profile: str = "Base FHIR R4 Patient"


class ValidationResponse(FHIRBaseModel):
    quality_score: int = Field(ge=0, le=100)
    issues: list[ValidationIssue] = Field(default_factory=list)
    fhir_compliant: bool
    profile: str = "Base FHIR R4 Patient"
    patient: PatientResource | None = None
    observations: list[ObservationResource] = Field(default_factory=list)
    bundle: BundleResource | None = None
    openmrs_mapping: OpenMRSMapping | None = None
    suggestions: list[SuggestionItem] = Field(default_factory=list)


class FHIRCheckRequest(FHIRBaseModel):
    patient: PatientResource | None = None
    observations: list[ObservationResource] = Field(default_factory=list)
    bundle: BundleResource | None = None
    profile: str = "Base FHIR R4 Patient"
    record: dict[str, Any] = Field(default_factory=dict)
