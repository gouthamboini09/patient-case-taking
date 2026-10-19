from collections import Counter
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models
from ..auth import current_user, require_roles

router = APIRouter(prefix="/api", tags=["analytics"])


@router.get("/analytics/summary")
def summary(db: Session = Depends(get_db), user: models.User = Depends(current_user)):
    cases = db.query(models.Case).all()
    today = datetime.utcnow().date()
    days = [today - timedelta(days=i) for i in range(13, -1, -1)]
    per_day = Counter(c.created_at.date() for c in cases)
    complaints = Counter((c.chief_complaint or "").strip().lower() for c in cases)
    ages = [c.patient.age for c in cases if c.patient]
    buckets = {"0-17": 0, "18-39": 0, "40-59": 0, "60+": 0}
    for a in ages:
        buckets["0-17" if a < 18 else "18-39" if a < 40 else "40-59" if a < 60 else "60+"] += 1
    return {
        "total_patients": db.query(models.Patient).count(),
        "total_cases": len(cases),
        "cases_today": per_day.get(today, 0),
        "critical_open": sum(1 for c in cases if c.triage_level == "critical" and c.status != "closed"),
        "triage": dict(Counter(c.triage_level for c in cases)),
        "status": dict(Counter(c.status for c in cases)),
        "top_complaints": [{"name": k, "count": v} for k, v in complaints.most_common(6)],
        "cases_per_day": [{"date": d.strftime("%d %b"), "count": per_day.get(d, 0)} for d in days],
        "age_groups": buckets,
    }


@router.get("/audit")
def audit(limit: int = 100, db: Session = Depends(get_db), user=Depends(require_roles("admin"))):
    rows = db.query(models.AuditLog).order_by(models.AuditLog.at.desc()).limit(limit).all()
    return [{"id": r.id, "user": r.user, "action": r.action, "entity": r.entity,
             "entity_id": r.entity_id, "at": r.at} for r in rows]
