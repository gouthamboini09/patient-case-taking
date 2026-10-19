import os
os.environ["DATABASE_URL"] = "sqlite:///./test_casetaking.db"

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine
from app.triage import evaluate


class C:  # minimal case stub for triage unit tests
    def __init__(self, **kw):
        defaults = dict(chief_complaint="", hpi="", symptoms=[], pain_score=0, onset=None, spo2=None,
                        bp_sys=None, bp_dia=None, pulse=None, temp_c=None, resp_rate=None,
                        medications=[], allergies=[], plan="", past_history=[])
        defaults.update(kw)
        self.__dict__.update(defaults)


@pytest.fixture(scope="module")
def client():
    Base.metadata.drop_all(bind=engine)
    with TestClient(app) as c:
        yield c
    Base.metadata.drop_all(bind=engine)
    if os.path.exists("test_casetaking.db"):
        os.remove("test_casetaking.db")


@pytest.fixture(scope="module")
def headers(client):
    r = client.post("/api/auth/login", data={"username": "doctor", "password": "doctor123"})
    assert r.status_code == 200
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def test_triage_normal_is_routine():
    level, flags = evaluate(C(chief_complaint="cough", spo2=98, bp_sys=120, bp_dia=80, pulse=75, temp_c=36.8), 30)
    assert level == "routine" and flags == []


def test_triage_critical_vitals():
    level, flags = evaluate(C(spo2=85, bp_sys=190, bp_dia=125), 50)
    assert level == "critical"
    assert any("SpO2" in f["message"] for f in flags)


def test_triage_symptom_keyword():
    level, _ = evaluate(C(chief_complaint="Chest pain radiating to left arm"), 55)
    assert level == "critical"


def test_allergy_conflict_detected():
    level, flags = evaluate(C(allergies=["Penicillin"], medications=["Amoxicillin 500mg"]), 30)
    assert level == "critical"
    assert any("ALLERGY CONFLICT" in f["message"] for f in flags)


def test_login_fails_with_bad_password(client):
    assert client.post("/api/auth/login", data={"username": "doctor", "password": "x"}).status_code == 401


def test_requires_auth(client):
    assert client.get("/api/patients").status_code == 401


def test_full_flow(client, headers):
    p = client.post("/api/patients", headers=headers, json={
        "name": "Ravi Kumar", "age": 58, "gender": "Male", "phone": "9876543210", "blood_group": "B+"})
    assert p.status_code == 201
    pid = p.json()["id"]
    assert p.json()["mrn"].startswith("MRN")

    dup = client.post("/api/patients", headers=headers, json={
        "name": "Other", "age": 20, "gender": "Male", "phone": "9876543210"})
    assert dup.status_code == 409

    c = client.post("/api/cases", headers=headers, json={
        "patient_id": pid, "chief_complaint": "Chest pain for 2 hours", "pain_score": 8,
        "spo2": 91, "bp_sys": 150, "bp_dia": 95, "pulse": 110, "weight_kg": 80, "height_cm": 175})
    assert c.status_code == 201
    body = c.json()
    assert body["triage_level"] == "critical"
    assert body["bmi"] == 26.1

    assert client.get(f"/api/cases/{body['id']}", headers=headers).status_code == 200
    pdf = client.get(f"/api/cases/{body['id']}/pdf", headers=headers)
    assert pdf.status_code == 200 and pdf.content.startswith(b"%PDF")

    detail = client.get(f"/api/patients/{pid}", headers=headers).json()
    assert len(detail["cases"]) == 1

    found = client.get("/api/patients?q=ravi", headers=headers).json()
    assert len(found) == 1

    s = client.get("/api/analytics/summary", headers=headers).json()
    assert s["total_cases"] == 1 and s["critical_open"] == 1


def test_role_restrictions(client):
    r = client.post("/api/auth/login", data={"username": "nurse", "password": "nurse123"})
    nh = {"Authorization": f"Bearer {r.json()['access_token']}"}
    assert client.delete("/api/cases/1", headers=nh).status_code == 403
    assert client.get("/api/audit", headers=nh).status_code == 403
