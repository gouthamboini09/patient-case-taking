"""Load realistic demo data so the dashboard looks alive.  Run:  python seed_demo.py"""
from app.database import Base, engine, SessionLocal
from app.main import seed
from app.demo import load_demo

Base.metadata.create_all(bind=engine)
seed()
db = SessionLocal()
print("Seeded demo patients and cases." if load_demo(db) else "Demo data already present.")
db.close()
