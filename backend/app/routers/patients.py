import random
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas
from ..auth import current_user

router = APIRouter(prefix="/api/patients", tags=["patients"])


def _new_mrn(db: Session) -> str:
    while True:
        mrn = f"MRN{random.randint(100000, 999999)}"
        if not db.query(models.Patient).filter_by(mrn=mrn).first():
            return mrn


def _audit(db, user, action, pid):
    db.add(models.AuditLog(user=user.username, action=action, entity="patient", entity_id=pid))


@router.post("", response_model=schemas.PatientOut, status_code=201)
def create_patient(data: schemas.PatientIn, db: Session = Depends(get_db),
                   user: models.User = Depends(current_user)):
    if data.phone and db.query(models.Patient).filter_by(phone=data.phone).first():
        raise HTTPException(409, "A patient with this phone number already exists")
    patient = models.Patient(**data.model_dump(), mrn=_new_mrn(db))
    db.add(patient)
    db.flush()
    _audit(db, user, "create", patient.id)
    db.commit()
    db.refresh(patient)
    return patient


@router.get("", response_model=list[schemas.PatientOut])
def list_patients(q: str = Query("", description="search by name, phone or MRN"),
                  limit: int = 100, db: Session = Depends(get_db),
                  user: models.User = Depends(current_user)):
    query = db.query(models.Patient)
    if q:
        like = f"%{q}%"
        query = query.filter(or_(models.Patient.name.ilike(like), models.Patient.phone.ilike(like),
                                 models.Patient.mrn.ilike(like)))
    return query.order_by(models.Patient.created_at.desc()).limit(limit).all()


@router.get("/{pid}", response_model=schemas.PatientDetail)
def get_patient(pid: int, db: Session = Depends(get_db), user: models.User = Depends(current_user)):
    patient = db.get(models.Patient, pid)
    if not patient:
        raise HTTPException(404, "Patient not found")
    _audit(db, user, "view", pid)
    db.commit()
    from .cases import to_out
    out = schemas.PatientDetail.model_validate(patient)
    out.cases = [to_out(c) for c in patient.cases]
    return out


@router.put("/{pid}", response_model=schemas.PatientOut)
def update_patient(pid: int, data: schemas.PatientIn, db: Session = Depends(get_db),
                   user: models.User = Depends(current_user)):
    patient = db.get(models.Patient, pid)
    if not patient:
        raise HTTPException(404, "Patient not found")
    for k, v in data.model_dump().items():
        setattr(patient, k, v)
    _audit(db, user, "update", pid)
    db.commit()
    db.refresh(patient)
    return patient
