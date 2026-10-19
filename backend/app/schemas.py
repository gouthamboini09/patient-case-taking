from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    full_name: str
    role: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    username: str
    full_name: str
    role: str


class PatientIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    age: int = Field(ge=0, le=120)
    gender: str
    phone: Optional[str] = None
    blood_group: Optional[str] = None
    address: Optional[str] = None
    emergency_contact: Optional[str] = None


class PatientOut(PatientIn):
    model_config = ConfigDict(from_attributes=True)
    id: int
    mrn: str
    created_at: datetime


class CaseIn(BaseModel):
    patient_id: int
    chief_complaint: str = Field(min_length=2, max_length=250)
    duration: Optional[str] = None
    onset: Optional[str] = None
    pain_score: int = Field(default=0, ge=0, le=10)
    hpi: Optional[str] = None
    symptoms: list[str] = []
    past_history: list[str] = []
    family_history: list[str] = []
    allergies: list[str] = []
    medications: list[str] = []
    lifestyle: dict = {}
    systems_review: dict = {}
    temp_c: Optional[float] = Field(default=None, ge=25, le=45)
    pulse: Optional[int] = Field(default=None, ge=0, le=300)
    bp_sys: Optional[int] = Field(default=None, ge=0, le=300)
    bp_dia: Optional[int] = Field(default=None, ge=0, le=200)
    resp_rate: Optional[int] = Field(default=None, ge=0, le=80)
    spo2: Optional[int] = Field(default=None, ge=0, le=100)
    weight_kg: Optional[float] = Field(default=None, ge=0, le=400)
    height_cm: Optional[float] = Field(default=None, ge=0, le=260)
    examination: Optional[str] = None
    diagnosis: Optional[str] = None
    plan: Optional[str] = None
    status: str = "open"


class CaseOut(CaseIn):
    model_config = ConfigDict(from_attributes=True)
    id: int
    triage_level: str
    red_flags: list = []
    created_at: datetime
    updated_at: Optional[datetime] = None
    patient: Optional[PatientOut] = None
    bmi: Optional[float] = None


class PatientDetail(PatientOut):
    cases: list[CaseOut] = []
