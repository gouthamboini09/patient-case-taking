from io import BytesIO
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from .triage import bmi, bmi_category

LEVEL_COLORS = {"critical": colors.HexColor("#c62828"), "urgent": colors.HexColor("#ef6c00"),
                "routine": colors.HexColor("#2e7d32")}


def _join(items):
    return ", ".join(items) if items else "None reported"


def build_case_pdf(case) -> bytes:
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm,
                            topMargin=16 * mm, bottomMargin=16 * mm, title=f"Case #{case.id}")
    ss = getSampleStyleSheet()
    h1 = ParagraphStyle("h1", parent=ss["Title"], textColor=colors.HexColor("#0d47a1"), fontSize=20, alignment=0)
    h2 = ParagraphStyle("h2", parent=ss["Heading3"], textColor=colors.HexColor("#0d47a1"), spaceBefore=10)
    body = ss["BodyText"]
    p = case.patient

    story = [Paragraph("Patient Case Sheet", h1),
             Paragraph(f"Case #{case.id} &nbsp;|&nbsp; {case.created_at:%d %b %Y, %H:%M} &nbsp;|&nbsp; "
                       f"Attending: {case.doctor.full_name if case.doctor else '-'}", body), Spacer(1, 6)]

    # triage banner
    lvl = case.triage_level or "routine"
    banner = Table([[f"TRIAGE: {lvl.upper()}"]], colWidths=[174 * mm])
    banner.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), LEVEL_COLORS[lvl]),
                                ("TEXTCOLOR", (0, 0), (-1, -1), colors.white),
                                ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
                                ("ALIGN", (0, 0), (-1, -1), "CENTER"), ("PADDING", (0, 0), (-1, -1), 6)]))
    story += [banner, Spacer(1, 8)]

    demo = [["Name", p.name, "MRN", p.mrn],
            ["Age / Sex", f"{p.age} / {p.gender}", "Phone", p.phone or "-"],
            ["Blood group", p.blood_group or "-", "Emergency", p.emergency_contact or "-"]]
    t = Table(demo, colWidths=[28 * mm, 59 * mm, 28 * mm, 59 * mm])
    t.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), .4, colors.lightgrey),
                           ("BACKGROUND", (0, 0), (0, -1), colors.whitesmoke),
                           ("BACKGROUND", (2, 0), (2, -1), colors.whitesmoke),
                           ("FONTSIZE", (0, 0), (-1, -1), 9)]))
    story += [t, Paragraph("Presenting complaint", h2),
              Paragraph(f"<b>{case.chief_complaint}</b> ({case.duration or 'duration n/a'}, "
                        f"{case.onset or 'onset n/a'} onset, pain {case.pain_score}/10)", body),
              Paragraph(case.hpi or "", body)]

    if case.red_flags:
        story.append(Paragraph("Clinical alerts", h2))
        for f in case.red_flags:
            c = LEVEL_COLORS[f["level"]].hexval()[2:]
            story.append(Paragraph(f'<font color="#{c}"><b>[{f["level"].upper()}]</b></font> {f["message"]}', body))

    b = bmi(case.weight_kg, case.height_cm)
    vit = [["Temp", "Pulse", "BP", "Resp", "SpO2", "BMI"],
           [f"{case.temp_c or '-'} °C", case.pulse or "-", f"{case.bp_sys or '-'}/{case.bp_dia or '-'}",
            case.resp_rate or "-", f"{case.spo2 or '-'}%", f"{b or '-'} {bmi_category(b) or ''}"]]
    vt = Table(vit)
    vt.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), .4, colors.lightgrey),
                            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e3f2fd")),
                            ("ALIGN", (0, 0), (-1, -1), "CENTER"), ("FONTSIZE", (0, 0), (-1, -1), 9)]))
    story += [Paragraph("Vitals", h2), vt,
              Paragraph("History", h2),
              Paragraph(f"<b>Symptoms:</b> {_join(case.symptoms)}", body),
              Paragraph(f"<b>Past history:</b> {_join(case.past_history)}", body),
              Paragraph(f"<b>Family history:</b> {_join(case.family_history)}", body),
              Paragraph(f"<b>Allergies:</b> {_join(case.allergies)}", body),
              Paragraph(f"<b>Current medications:</b> {_join(case.medications)}", body),
              Paragraph("<b>Lifestyle:</b> " + (", ".join(f"{k}: {v}" for k, v in (case.lifestyle or {}).items() if v) or "n/a"), body),
              Paragraph("Examination", h2), Paragraph(case.examination or "Not recorded", body),
              Paragraph("Diagnosis & plan", h2),
              Paragraph(f"<b>Diagnosis:</b> {case.diagnosis or 'Pending'}", body),
              Paragraph(case.plan or "No plan recorded", body),
              Spacer(1, 18),
              Paragraph("<i>Alerts are decision-support only and do not replace clinical judgement.</i>",
                        ParagraphStyle("f", parent=body, fontSize=7, textColor=colors.grey))]
    doc.build(story)
    return buf.getvalue()
