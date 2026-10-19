from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas
from ..auth import current_user, require_roles
from ..triage import evaluate, bmi
from ..pdf import build_case_pdf

router = APIRouter(prefix="/api/cases", tags=["cases"])


def to_out(case: models.Case) -> schemas.CaseOut:
    out = schemas.CaseOut.model_validate(case)
    out.bmi = bmi(case.weight_kg, case.height_cm)
    return out


def _apply_triage(case: models.Case, age: int):
    case.triage_level, case.red_flags = evaluate(case, age)


@router.post("", response_model=schemas.CaseOut, status_code=201)
def create_case(data: schemas.CaseIn, db: Session = Depends(get_db),
                user: models.User = Depends(require_roles("admin", "doctor", "nurse"))):
    patient = db.get(models.Patient, data.patient_id)
    if not patient:
        raise HTTPException(404, "Patient not found")
    case = models.Case(**data.model_dump(), doctor_id=user.id)
    _apply_triage(case, patient.age)
    db.add(case)
    db.flush()
    db.add(models.AuditLog(user=user.username, action="create", entity="case", entity_id=case.id))
    db.commit()
    db.refresh(case)
    return to_out(case)


@router.get("", response_model=list[schemas.CaseOut])
def list_cases(triage: str | None = None, status: str | None = None, limit: int = 100,
               db: Session = Depends(get_db), user: models.User = Depends(current_user)):
    q = db.query(models.Case)
    if triage:
        q = q.filter(models.Case.triage_level == triage)
    if status:
        q = q.filter(models.Case.status == status)
    return [to_out(c) for c in q.order_by(models.Case.created_at.desc()).limit(limit).all()]


@router.get("/{cid}", response_model=schemas.CaseOut)
def get_case(cid: int, db: Session = Depends(get_db), user: models.User = Depends(current_user)):
    case = db.get(models.Case, cid)
    if not case:
        raise HTTPException(404, "Case not found")
    db.add(models.AuditLog(user=user.username, action="view", entity="case", entity_id=cid))
    db.commit()
    return to_out(case)


@router.put("/{cid}", response_model=schemas.CaseOut)
def update_case(cid: int, data: schemas.CaseIn, db: Session = Depends(get_db),
                user: models.User = Depends(require_roles("admin", "doctor"))):
    case = db.get(models.Case, cid)
    if not case:
        raise HTTPException(404, "Case not found")
    for k, v in data.model_dump().items():
        setattr(case, k, v)
    _apply_triage(case, case.patient.age)
    db.add(models.AuditLog(user=user.username, action="update", entity="case", entity_id=cid))
    db.commit()
    db.refresh(case)
    return to_out(case)


@router.delete("/{cid}", status_code=204)
def delete_case(cid: int, db: Session = Depends(get_db),
                user: models.User = Depends(require_roles("admin"))):
    case = db.get(models.Case, cid)
    if not case:
        raise HTTPException(404, "Case not found")
    db.delete(case)
    db.add(models.AuditLog(user=user.username, action="delete", entity="case", entity_id=cid))
    db.commit()


@router.get("/{cid}/pdf")
def case_pdf(cid: int, db: Session = Depends(get_db), user: models.User = Depends(current_user)):
    case = db.get(models.Case, cid)
    if not case:
        raise HTTPException(404, "Case not found")
    return Response(build_case_pdf(case), media_type="application/pdf",
                    headers={"Content-Disposition": f'inline; filename="case-{cid}.pdf"'})
