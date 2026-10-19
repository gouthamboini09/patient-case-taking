"""Demo data loader, used by seed_demo.py and by the server when SEED_DEMO=true."""
import random
from datetime import datetime, timedelta
from . import models
from .triage import evaluate

PEOPLE = [("Ravi Kumar", 58, "Male", "B+"), ("Lakshmi Devi", 44, "Female", "O+"), ("Arjun Reddy", 29, "Male", "A+"),
          ("Sneha Patel", 34, "Female", "AB+"), ("Mohammed Irfan", 67, "Male", "O-"), ("Anitha Rao", 8, "Female", "B+"),
          ("Venkat Rao", 72, "Male", "A-"), ("Priya Sharma", 26, "Female", "O+")]

COMPLAINTS = [
    ("Chest pain for 2 hours", dict(spo2=91, bp_sys=165, bp_dia=100, pulse=112, pain_score=8, onset="sudden")),
    ("Fever and cough for 3 days", dict(temp_c=38.9, pulse=98, spo2=96, resp_rate=22)),
    ("Headache", dict(bp_sys=128, bp_dia=82, pulse=76, pain_score=4)),
    ("Abdominal pain", dict(pain_score=6, pulse=88, temp_c=37.4)),
    ("Shortness of breath", dict(spo2=88, resp_rate=28, pulse=118)),
    ("Back pain", dict(pain_score=5, bp_sys=122, bp_dia=80)),
    ("Skin rash", dict(temp_c=36.9, pulse=72)),
    ("Routine diabetes follow-up", dict(bp_sys=136, bp_dia=86, pulse=80)),
]


def load_demo(db) -> bool:
    """Insert demo patients/cases. Returns False if data already exists."""
    if db.query(models.Patient).count():
        return False
    rng = random.Random(7)
    doctor = db.query(models.User).filter_by(username="doctor").first()
    for i, (name, age, sex, bg) in enumerate(PEOPLE):
        p = models.Patient(name=name, age=age, gender=sex, blood_group=bg,
                           phone=f"98765{43210 + i}", mrn=f"MRN{100001 + i}")
        db.add(p)
        db.flush()
        for _ in range(rng.randint(1, 3)):
            cc, vit = rng.choice(COMPLAINTS)
            c = models.Case(
                patient_id=p.id, doctor_id=doctor.id if doctor else None, chief_complaint=cc, duration="2 days",
                hpi="Patient reports symptoms as described.",
                past_history=rng.sample(["Diabetes", "Hypertension", "Asthma"], k=rng.randint(0, 2)),
                allergies=rng.choice([[], [], ["Penicillin"]]), medications=[],
                weight_kg=rng.randint(50, 90), height_cm=rng.randint(150, 180),
                status=rng.choice(["open", "open", "review", "closed"]),
                created_at=datetime.utcnow() - timedelta(days=rng.randint(0, 13), hours=rng.randint(0, 20)), **vit)
            c.triage_level, c.red_flags = evaluate(c, age)
            db.add(c)
    db.commit()
    return True
