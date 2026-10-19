from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, Text, JSON
from sqlalchemy.orm import relationship
from .database import Base


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    full_name = Column(String(120), nullable=False)
    hashed_password = Column(String(200), nullable=False)
    role = Column(String(20), default="doctor")  # admin | doctor | nurse


class Patient(Base):
    __tablename__ = "patients"
    id = Column(Integer, primary_key=True)
    mrn = Column(String(20), unique=True, index=True)  # medical record number
    name = Column(String(120), nullable=False, index=True)
    age = Column(Integer, nullable=False)
    gender = Column(String(20), nullable=False)
    phone = Column(String(20), index=True)
    blood_group = Column(String(5))
    address = Column(String(250))
    emergency_contact = Column(String(120))
    created_at = Column(DateTime, default=datetime.utcnow)
    cases = relationship("Case", back_populates="patient", cascade="all, delete-orphan",
                         order_by="Case.created_at.desc()")


class Case(Base):
    __tablename__ = "cases"
    id = Column(Integer, primary_key=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False, index=True)
    doctor_id = Column(Integer, ForeignKey("users.id"))
    chief_complaint = Column(String(250), nullable=False)
    duration = Column(String(60))
    onset = Column(String(30))  # sudden | gradual
    pain_score = Column(Integer, default=0)
    hpi = Column(Text)
    symptoms = Column(JSON, default=list)
    past_history = Column(JSON, default=list)
    family_history = Column(JSON, default=list)
    allergies = Column(JSON, default=list)
    medications = Column(JSON, default=list)
    lifestyle = Column(JSON, default=dict)
    systems_review = Column(JSON, default=dict)
    # vitals
    temp_c = Column(Float)
    pulse = Column(Integer)
    bp_sys = Column(Integer)
    bp_dia = Column(Integer)
    resp_rate = Column(Integer)
    spo2 = Column(Integer)
    weight_kg = Column(Float)
    height_cm = Column(Float)
    examination = Column(Text)
    diagnosis = Column(String(250))
    plan = Column(Text)
    # computed by triage engine
    triage_level = Column(String(12), default="routine")  # routine | urgent | critical
    red_flags = Column(JSON, default=list)
    status = Column(String(15), default="open")  # open | review | closed
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    patient = relationship("Patient", back_populates="cases")
    doctor = relationship("User")


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True)
    user = Column(String(50))
    action = Column(String(40))
    entity = Column(String(40))
    entity_id = Column(Integer)
    at = Column(DateTime, default=datetime.utcnow)
