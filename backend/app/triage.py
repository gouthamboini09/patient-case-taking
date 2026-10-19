"""Rule-based clinical decision support.

Flags abnormal vitals, high-risk symptom patterns and allergy/medication
conflicts. This is an aid for the clinician, NOT a diagnosis.
"""

# (symptom keyword, message, level)
SYMPTOM_RULES = [
    (["chest pain", "chest tightness", "crushing chest"], "Chest pain: rule out acute coronary syndrome", "critical"),
    (["shortness of breath", "breathlessness", "difficulty breathing", "can't breathe"], "Respiratory distress reported", "critical"),
    (["slurred speech", "facial droop", "face drooping", "sudden weakness", "one-sided weakness"], "Possible stroke (FAST signs)", "critical"),
    (["loss of consciousness", "fainting", "syncope", "unconscious", "seizure"], "Altered consciousness / seizure", "critical"),
    (["vomiting blood", "blood in stool", "black stool", "coughing blood", "hematemesis"], "Possible internal bleeding", "critical"),
    (["suicidal", "self harm", "self-harm", "want to die"], "Suicide risk: urgent mental-health assessment", "critical"),
    (["severe headache", "worst headache", "neck stiffness"], "Severe headache / meningism: consider SAH or meningitis", "urgent"),
    (["high fever", "persistent fever", "fever with rash"], "Significant fever pattern", "urgent"),
    (["severe abdominal pain", "rigid abdomen"], "Acute abdomen possible", "urgent"),
    (["blurred vision", "vision loss"], "Visual disturbance", "urgent"),
    (["unexplained weight loss", "night sweats"], "Constitutional symptoms: investigate for chronic illness/malignancy", "urgent"),
    (["pregnant", "pregnancy"], "Pregnancy: review drug safety before prescribing", "urgent"),
]

# allergy keyword -> drugs that conflict with it
ALLERGY_CONFLICTS = {
    "penicillin": ["amoxicillin", "ampicillin", "penicillin", "augmentin", "piperacillin"],
    "sulfa": ["sulfamethoxazole", "cotrimoxazole", "bactrim", "sulfasalazine"],
    "aspirin": ["aspirin", "ibuprofen", "diclofenac", "naproxen", "nsaid"],
    "nsaid": ["aspirin", "ibuprofen", "diclofenac", "naproxen"],
    "cephalosporin": ["cefixime", "ceftriaxone", "cefuroxime", "cephalexin"],
}

RANK = {"routine": 0, "urgent": 1, "critical": 2}


def bmi(weight_kg, height_cm):
    if weight_kg and height_cm:
        return round(weight_kg / ((height_cm / 100) ** 2), 1)
    return None


def bmi_category(value):
    if value is None:
        return None
    if value < 18.5:
        return "Underweight"
    if value < 25:
        return "Normal"
    if value < 30:
        return "Overweight"
    return "Obese"


def evaluate(case, age: int) -> tuple[str, list[dict]]:
    flags: list[dict] = []

    def add(level, msg):
        flags.append({"level": level, "message": msg})

    # ---- vitals ----
    if case.spo2 is not None:
        if case.spo2 < 90:
            add("critical", f"SpO2 {case.spo2}% (severe hypoxia)")
        elif case.spo2 < 94:
            add("urgent", f"SpO2 {case.spo2}% (low)")
    if case.bp_sys is not None:
        if case.bp_sys >= 180 or (case.bp_dia or 0) >= 120:
            add("critical", f"BP {case.bp_sys}/{case.bp_dia} (hypertensive crisis)")
        elif case.bp_sys >= 140 or (case.bp_dia or 0) >= 90:
            add("urgent", f"BP {case.bp_sys}/{case.bp_dia} (hypertension)")
        elif case.bp_sys < 90:
            add("critical", f"BP {case.bp_sys}/{case.bp_dia} (hypotension / shock risk)")
    if case.pulse is not None:
        if case.pulse > 130 or case.pulse < 40:
            add("critical", f"Pulse {case.pulse} bpm (dangerous)")
        elif case.pulse > 100 or case.pulse < 50:
            add("urgent", f"Pulse {case.pulse} bpm (abnormal)")
    if case.temp_c is not None:
        if case.temp_c >= 39.5 or case.temp_c < 35:
            add("critical", f"Temperature {case.temp_c} °C (extreme)")
        elif case.temp_c >= 38:
            add("urgent", f"Temperature {case.temp_c} °C (fever)")
    if case.resp_rate is not None:
        if case.resp_rate > 30 or case.resp_rate < 8:
            add("critical", f"Respiratory rate {case.resp_rate}/min (dangerous)")
        elif case.resp_rate > 20:
            add("urgent", f"Respiratory rate {case.resp_rate}/min (tachypnoea)")

    # ---- symptom patterns ----
    text = " ".join([case.chief_complaint or "", case.hpi or "", *(case.symptoms or [])]).lower()
    for keywords, msg, level in SYMPTOM_RULES:
        if any(k in text for k in keywords):
            add(level, msg)

    if (case.pain_score or 0) >= 8:
        add("urgent", f"Severe pain reported ({case.pain_score}/10)")
    if age >= 65 and case.onset == "sudden":
        add("urgent", "Sudden onset in patient aged 65+")
    if age <= 2 and case.temp_c is not None and case.temp_c >= 38:
        add("critical", "Fever in infant: urgent paediatric review")

    # ---- allergy vs medication conflicts ----
    meds = " ".join(case.medications or []).lower()
    plan = (case.plan or "").lower()
    for allergy in (case.allergies or []):
        a = allergy.lower()
        for key, drugs in ALLERGY_CONFLICTS.items():
            if key in a:
                hit = [d for d in drugs if d in meds or d in plan]
                if hit:
                    add("critical", f"ALLERGY CONFLICT: allergic to {allergy}, but {', '.join(hit)} listed")

    # ---- risk context ----
    past = " ".join(case.past_history or []).lower()
    if "diabetes" in past and case.spo2 is not None and case.temp_c and case.temp_c >= 38:
        add("urgent", "Diabetic patient with fever: monitor glucose, infection risk")

    level = "routine"
    for f in flags:
        if RANK[f["level"]] > RANK[level]:
            level = f["level"]
    flags.sort(key=lambda f: -RANK[f["level"]])
    return level, flags
