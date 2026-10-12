import hashlib
import uuid
from datetime import date, datetime
from typing import Any
from zoneinfo import ZoneInfo

from fastapi import Depends, FastAPI, Header, HTTPException, Query, status

from . import db
from .schemas import (
    AssistantMessageInput,
    ConsentInput,
    CycleRecordInput,
    DoseLogInput,
    HealthReportInput,
    LifestyleLogInput,
    MedicineInput,
    MedicineUpdate,
    PlanInput,
    ProfileInput,
    ProfileUpdate,
)
from .security import decrypt_payload, encrypt_payload

app = FastAPI(
    title="WellAura Private Wellness API",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)
INDIA_TZ = ZoneInfo("Asia/Kolkata")
ACCOUNT_PROFILE_ID = "__account__"


@app.on_event("startup")
async def startup() -> None:
    await db.connect()


@app.on_event("shutdown")
async def shutdown() -> None:
    await db.disconnect()


async def owner_id_from_proxy(
    owner_id: str | None = Header(default=None, alias="x-wellaura-user-id"),
) -> str:
    if not owner_id or len(owner_id) < 3 or len(owner_id) > 200:
        raise HTTPException(status_code=401, detail="Sign in to access private wellness data.")
    return owner_id


def _setting_id(owner_id: str, kind: str) -> str:
    digest = hashlib.sha256(owner_id.encode("utf-8")).hexdigest()[:40]
    return f"account-{kind}-{digest}"


def _self_id(owner_id: str) -> str:
    digest = hashlib.sha256(owner_id.encode("utf-8")).hexdigest()[:40]
    return f"self-{digest}"


def _iso(value: Any) -> str:
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return str(value)


def _public_record(row: dict[str, Any]) -> dict[str, Any]:
    result = decrypt_payload(row["encrypted_payload"])
    result["id"] = row["profile_id"] if row["kind"] == "profile" else row["id"]
    result["profileId"] = row["profile_id"]
    result["createdAt"] = _iso(row["created_at"])
    return result


async def _put_account_record(
    owner_id: str,
    kind: str,
    payload: dict[str, Any],
) -> dict[str, Any]:
    record_id = _setting_id(owner_id, kind)
    current = await db.get_record(owner_id, record_id, kind)
    encrypted = encrypt_payload(payload)
    if current:
        row = await db.update_record(owner_id, record_id, kind, encrypted)
    else:
        row = await db.insert_record(
            owner_id,
            ACCOUNT_PROFILE_ID,
            kind,
            record_id,
            encrypted,
        )
    if not row:
        raise HTTPException(status_code=500, detail="Could not save your preferences.")
    return _public_record(row)


async def _consent(owner_id: str) -> dict[str, Any]:
    row = await db.get_record(owner_id, _setting_id(owner_id, "consent"), "consent")
    if not row:
        return {
            "healthDataConsent": False,
            "optionalPersonalizationConsent": False,
            "voiceProcessingConsent": False,
            "language": "en",
            "savedAt": None,
        }
    payload = decrypt_payload(row["encrypted_payload"])
    return {
        **payload,
        "savedAt": _iso(row["updated_at"]),
    }


async def _require_consent(owner_id: str) -> None:
    current = await _consent(owner_id)
    if not current["healthDataConsent"]:
        raise HTTPException(
            status_code=403,
            detail="Review and accept the health data notice before using private health features.",
        )


async def _profile_row(owner_id: str, profile_id: str) -> dict[str, Any]:
    rows = await db.list_records(owner_id, "profile")
    for row in rows:
        if row["profile_id"] == profile_id:
            return row
    raise HTTPException(status_code=404, detail="This profile is not available to your account.")


async def _profile(owner_id: str, profile_id: str) -> dict[str, Any]:
    return _public_record(await _profile_row(owner_id, profile_id))


async def _ensure_self_profile(owner_id: str) -> dict[str, Any]:
    record_id = _self_id(owner_id)
    row = await db.get_record(owner_id, record_id, "profile")
    if row:
        return _public_record(row)
    row = await db.insert_record(
        owner_id,
        "self",
        "profile",
        record_id,
        encrypt_payload(
            {
                "displayName": "Me",
                "relationship": "Self",
                "consentConfirmed": True,
                "isSelf": True,
            }
        ),
    )
    return _public_record(row)


async def _save_record(
    owner_id: str,
    profile_id: str,
    kind: str,
    payload: dict[str, Any],
    record_id: str | None = None,
    parent_id: str | None = None,
) -> dict[str, Any]:
    await _profile(owner_id, profile_id)
    record_id = record_id or str(uuid.uuid4())
    row = await db.insert_record(
        owner_id,
        profile_id,
        kind,
        record_id,
        encrypt_payload(payload),
        parent_id,
    )
    return _public_record(row)


async def _list_public(
    owner_id: str,
    kind: str,
    profile_id: str,
) -> list[dict[str, Any]]:
    await _profile(owner_id, profile_id)
    rows = await db.list_records(owner_id, kind, profile_id)
    return [_public_record(row) for row in rows]


def _delete_result(deleted: bool) -> dict[str, bool]:
    if not deleted:
        raise HTTPException(status_code=404, detail="This record was not found.")
    return {"deleted": True}


@app.get("/healthz")
async def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/wellness/consent")
async def get_wellness_consent(owner_id: str = Depends(owner_id_from_proxy)) -> dict[str, Any]:
    return await _consent(owner_id)


@app.put("/wellness/consent")
async def update_wellness_consent(
    body: ConsentInput,
    owner_id: str = Depends(owner_id_from_proxy),
) -> dict[str, Any]:
    if not body.healthDataConsent:
        await db.delete_user_records(owner_id)
        return {
            **body.model_dump(mode="json"),
            "savedAt": None,
        }
    row = await _put_account_record(
        owner_id,
        "consent",
        body.model_dump(mode="json"),
    )
    return {
        **body.model_dump(mode="json"),
        "savedAt": _iso(row["updated_at"]),
    }


@app.get("/wellness/profiles")
async def list_profiles(owner_id: str = Depends(owner_id_from_proxy)) -> list[dict[str, Any]]:
    await _require_consent(owner_id)
    extra_rows = await db.list_records(owner_id, "profile")
    profiles = [_public_record(row) for row in extra_rows]
    if not any(profile["isSelf"] for profile in profiles):
        profiles.insert(0, await _ensure_self_profile(owner_id))
    return profiles


@app.post("/wellness/profiles", status_code=status.HTTP_201_CREATED)
async def create_profile(
    body: ProfileInput,
    owner_id: str = Depends(owner_id_from_proxy),
) -> dict[str, Any]:
    await _require_consent(owner_id)
    if not body.consentConfirmed:
        raise HTTPException(status_code=400, detail="Confirm that this person has given permission.")
    profile_id = str(uuid.uuid4())
    return await _save_record(
        owner_id,
        profile_id,
        "profile",
        {
            **body.model_dump(),
            "isSelf": False,
        },
        record_id=profile_id,
    )


@app.patch("/wellness/profiles/{profile_id}")
async def update_profile(
    profile_id: str,
    body: ProfileUpdate,
    owner_id: str = Depends(owner_id_from_proxy),
) -> dict[str, Any]:
    await _require_consent(owner_id)
    current = await _profile(owner_id, profile_id)
    changes = body.model_dump(exclude_unset=True)
    if "consentConfirmed" in changes and not changes["consentConfirmed"]:
        raise HTTPException(
            status_code=400,
            detail="Delete this caregiver profile to revoke access and remove its records.",
        )
    current.update(changes)
    profile_row = await _profile_row(owner_id, profile_id)
    row = await db.update_record(
        owner_id,
        profile_row["id"],
        "profile",
        encrypt_payload(
            {
                key: value
                for key, value in current.items()
                if key not in {"id", "profileId", "createdAt"}
            }
        ),
    )
    if not row:
        raise HTTPException(status_code=404, detail="This profile is not available.")
    return _public_record(row)


@app.delete("/wellness/profiles/{profile_id}")
async def delete_profile(
    profile_id: str,
    owner_id: str = Depends(owner_id_from_proxy),
) -> dict[str, bool]:
    await _require_consent(owner_id)
    profile = await _profile(owner_id, profile_id)
    if profile["isSelf"]:
        raise HTTPException(status_code=403, detail="The self profile cannot be deleted.")
    await db.delete_profile_records(owner_id, profile_id)
    return {"deleted": True}


@app.get("/wellness/medicines")
async def list_medicines(
    profile_id: str = Query(alias="profileId"),
    owner_id: str = Depends(owner_id_from_proxy),
) -> list[dict[str, Any]]:
    await _require_consent(owner_id)
    return await _list_public(owner_id, "medicine", profile_id)


@app.post("/wellness/medicines", status_code=status.HTTP_201_CREATED)
async def create_medicine(
    body: MedicineInput,
    owner_id: str = Depends(owner_id_from_proxy),
) -> dict[str, Any]:
    await _require_consent(owner_id)
    return await _save_record(
        owner_id,
        body.profileId,
        "medicine",
        body.model_dump(mode="json"),
    )


@app.patch("/wellness/medicines/{record_id}")
async def update_medicine(
    record_id: str,
    body: MedicineUpdate,
    owner_id: str = Depends(owner_id_from_proxy),
) -> dict[str, Any]:
    await _require_consent(owner_id)
    existing = await db.get_record(owner_id, record_id, "medicine")
    if not existing:
        raise HTTPException(status_code=404, detail="Medicine reminder was not found.")
    old = decrypt_payload(existing["encrypted_payload"])
    # The prescribed dose is intentionally immutable through reminder updates.
    old.update(body.model_dump(mode="json"))
    row = await db.update_record(
        owner_id,
        record_id,
        "medicine",
        encrypt_payload(old),
    )
    return _public_record(row)


@app.delete("/wellness/medicines/{record_id}")
async def delete_medicine(
    record_id: str,
    owner_id: str = Depends(owner_id_from_proxy),
) -> dict[str, bool]:
    await _require_consent(owner_id)
    await db.delete_children(owner_id, record_id)
    return _delete_result(await db.delete_record(owner_id, record_id, "medicine"))


@app.post("/wellness/medicines/{record_id}/taken", status_code=status.HTTP_201_CREATED)
async def log_medicine_taken(
    record_id: str,
    body: DoseLogInput,
    owner_id: str = Depends(owner_id_from_proxy),
) -> dict[str, Any]:
    await _require_consent(owner_id)
    medicine = await db.get_record(owner_id, record_id, "medicine")
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine reminder was not found.")
    medicine_payload = decrypt_payload(medicine["encrypted_payload"])
    return await _save_record(
        owner_id,
        medicine["profile_id"],
        "dose-log",
        {
            **body.model_dump(mode="json"),
            "medicineId": record_id,
        },
        parent_id=record_id,
    )


@app.get("/wellness/reports")
async def list_reports(
    profile_id: str = Query(alias="profileId"),
    owner_id: str = Depends(owner_id_from_proxy),
) -> list[dict[str, Any]]:
    await _require_consent(owner_id)
    return await _list_public(owner_id, "report", profile_id)


@app.post("/wellness/reports", status_code=status.HTTP_201_CREATED)
async def create_report(
    body: HealthReportInput,
    owner_id: str = Depends(owner_id_from_proxy),
) -> dict[str, Any]:
    await _require_consent(owner_id)
    return await _save_record(
        owner_id,
        body.profileId,
        "report",
        body.model_dump(mode="json"),
    )


@app.delete("/wellness/reports/{record_id}")
async def delete_report(
    record_id: str,
    owner_id: str = Depends(owner_id_from_proxy),
) -> dict[str, bool]:
    await _require_consent(owner_id)
    return _delete_result(await db.delete_record(owner_id, record_id, "report"))


@app.get("/wellness/cycles")
async def list_cycles(
    profile_id: str = Query(alias="profileId"),
    owner_id: str = Depends(owner_id_from_proxy),
) -> list[dict[str, Any]]:
    await _require_consent(owner_id)
    return await _list_public(owner_id, "cycle", profile_id)


@app.post("/wellness/cycles", status_code=status.HTTP_201_CREATED)
async def create_cycle(
    body: CycleRecordInput,
    owner_id: str = Depends(owner_id_from_proxy),
) -> dict[str, Any]:
    await _require_consent(owner_id)
    return await _save_record(
        owner_id,
        body.profileId,
        "cycle",
        body.model_dump(mode="json"),
    )


@app.delete("/wellness/cycles/{record_id}")
async def delete_cycle(
    record_id: str,
    owner_id: str = Depends(owner_id_from_proxy),
) -> dict[str, bool]:
    await _require_consent(owner_id)
    return _delete_result(await db.delete_record(owner_id, record_id, "cycle"))


@app.get("/wellness/lifestyle")
async def get_lifestyle(
    profile_id: str = Query(alias="profileId"),
    log_date: date = Query(alias="date"),
    owner_id: str = Depends(owner_id_from_proxy),
) -> dict[str, Any]:
    await _require_consent(owner_id)
    await _profile(owner_id, profile_id)
    rows = await db.list_records(owner_id, "lifestyle", profile_id)
    for row in rows:
        payload = decrypt_payload(row["encrypted_payload"])
        if payload["date"] == log_date.isoformat():
            return _public_record(row)
    return {
        "id": f"today:{profile_id}:{log_date.isoformat()}",
        "profileId": profile_id,
        "date": log_date.isoformat(),
        "waterMl": 0,
        "sleepHours": None,
        "activityMinutes": 0,
        "createdAt": datetime.now(INDIA_TZ).isoformat(),
    }


@app.post("/wellness/lifestyle")
async def save_lifestyle(
    body: LifestyleLogInput,
    owner_id: str = Depends(owner_id_from_proxy),
) -> dict[str, Any]:
    await _require_consent(owner_id)
    await _profile(owner_id, body.profileId)
    record_id = f"lifestyle:{body.profileId}:{body.date.isoformat()}"
    existing = await db.get_record(owner_id, record_id, "lifestyle")
    encrypted = encrypt_payload(body.model_dump(mode="json"))
    if existing:
        row = await db.update_record(owner_id, record_id, "lifestyle", encrypted)
    else:
        row = await db.insert_record(
            owner_id,
            body.profileId,
            "lifestyle",
            record_id,
            encrypted,
        )
    return _public_record(row)


@app.get("/wellness/dashboard")
async def get_dashboard(
    profile_id: str = Query(alias="profileId"),
    owner_id: str = Depends(owner_id_from_proxy),
) -> dict[str, Any]:
    await _require_consent(owner_id)
    profile = await _profile(owner_id, profile_id)
    medicines = await _list_public(owner_id, "medicine", profile_id)
    reports = await db.list_records(owner_id, "report", profile_id)
    cycles = await db.list_records(owner_id, "cycle", profile_id)
    lifestyle = await get_lifestyle(
        profile_id=profile_id,
        log_date=datetime.now(INDIA_TZ).date(),
        owner_id=owner_id,
    )
    dose_rows = await db.list_records(owner_id, "dose-log", profile_id)
    dose_logs = [_public_record(row) for row in dose_rows]
    today = datetime.now(INDIA_TZ)
    taken_keys = {
        (item["medicineId"], item["scheduledTime"])
        for item in dose_logs
        if item.get("status") == "taken"
        and datetime.fromisoformat(
            item.get("takenAt", "").replace("Z", "+00:00")
        )
        .astimezone(INDIA_TZ)
        .date()
        == today.date()
    }
    upcoming: list[dict[str, Any]] = []
    for medicine in medicines:
        if not medicine["active"] or (
            medicine.get("endDate")
            and date.fromisoformat(medicine["endDate"]) < today.date()
        ):
            continue
        for scheduled in medicine["doseTimes"]:
            upcoming.append(
                {
                    "medicineId": medicine["id"],
                    "medicineName": medicine["name"],
                    "prescribedDose": medicine["prescribedDose"],
                    "scheduledTime": scheduled,
                    "taken": (medicine["id"], scheduled) in taken_keys,
                }
            )
    upcoming.sort(key=lambda item: item["scheduledTime"])
    current_time = today.strftime("%H:%M")
    future = [item for item in upcoming if item["scheduledTime"] >= current_time and not item["taken"]]
    next_dose = future[0] if future else (upcoming[0] if upcoming else None)
    return {
        "profileId": profile_id,
        "profileName": profile["displayName"],
        "activeMedicineCount": sum(1 for item in medicines if item["active"]),
        "nextDose": next_dose["scheduledTime"] if next_dose else None,
        "nextDoseMedicine": next_dose["medicineName"] if next_dose else None,
        "reportsCount": len(reports),
        "cyclesCount": len(cycles),
        "waterMlToday": lifestyle["waterMl"],
        "sleepHoursLastLogged": lifestyle["sleepHours"],
        "activityMinutesToday": lifestyle["activityMinutes"],
        "upcomingDoses": upcoming[:5],
    }


@app.post("/wellness/assistant/messages")
async def send_wellness_message(
    body: AssistantMessageInput,
    owner_id: str = Depends(owner_id_from_proxy),
) -> dict[str, Any]:
    await _require_consent(owner_id)
    message = body.message.casefold()
    urgent_terms = (
        "chest pain",
        "can't breathe",
        "cannot breathe",
        "trouble breathing",
        "difficulty breathing",
        "severe bleeding",
        "unconscious",
        "stroke",
        "suicid",
        "స్పృహ కోల్పో",
        "శ్వాస తీసుకోలేక",
        "గుండె నొప్పి",
        "आत्महत्या",
        "सांस नहीं",
        "बेहोश",
        "सीने में दर्द",
    )
    if any(term in message for term in urgent_terms):
        urgent_answers = {
            "en": "This may need urgent attention. Contact your local emergency number or go to emergency care now. Do not wait for an online reply.",
            "te": "ఇది అత్యవసర పరిస్థితి కావచ్చు. వెంటనే మీ స్థానిక అత్యవసర సేవలకు కాల్ చేయండి లేదా అత్యవసర వైద్య సేవలను పొందండి. ఆన్‌లైన్ సమాధానం కోసం వేచి ఉండకండి.",
            "hi": "यह आपात स्थिति हो सकती है। तुरंत अपने स्थानीय आपातकालीन नंबर पर कॉल करें या आपातकालीन देखभाल लें। ऑनलाइन जवाब का इंतज़ार न करें।",
        }
        return {
            "answer": urgent_answers[body.language],
            "safetyNote": "WellAura AI does not diagnose or replace emergency care.",
            "urgent": True,
            "sourceType": "urgent",
        }
    if any(word in message for word in ("dose", "dosage", "medicine", "medication", "मात्रा", "दवा", "మోతాదు", "మందు")):
        answers = {
            "en": "Follow the dose and timing on your prescription or medicine label. I cannot recommend a dose change. Ask your prescriber or pharmacist if you are unsure or missed a dose.",
            "te": "మీ ప్రిస్క్రిప్షన్ లేదా మందు లేబుల్‌లో ఉన్న మోతాదు, సమయాన్ని అనుసరించండి. మోతాదు మార్పును నేను సూచించలేను. సందేహం ఉంటే వైద్యుడు లేదా ఫార్మసిస్ట్‌ను అడగండి.",
            "hi": "अपने पर्चे या दवा के लेबल पर लिखी मात्रा और समय का पालन करें। मैं खुराक बदलने की सलाह नहीं दे सकता। संदेह हो तो डॉक्टर या फार्मासिस्ट से पूछें।",
        }
    elif any(word in message for word in ("pcos", "pcod", "period", "cycle", "పిసిఒఎస్", "పీరియడ్", "पीरियड", "पीसीओएस")):
        answers = {
            "en": "PCOS/PCOD are terms used for a common hormone-related condition that can affect menstrual cycles and other aspects of health. Symptoms vary, and only a qualified clinician can assess your situation. Tracking dates can help you prepare for an appointment.",
            "te": "PCOS/PCOD అనేవి హార్మోన్లకు సంబంధించిన సాధారణ పరిస్థితిని సూచించే పదాలు. ఇవి నెలసరి చక్రాలను, ఇతర ఆరోగ్య అంశాలను ప్రభావితం చేయవచ్చు. లక్షణాలు వ్యక్తులవారీగా మారుతాయి; మీ పరిస్థితిని వైద్య నిపుణుడే అంచనా వేయగలరు.",
            "hi": "PCOS/PCOD हार्मोन से जुड़ी एक आम स्थिति के लिए इस्तेमाल होने वाले शब्द हैं, जो मासिक चक्र और स्वास्थ्य के अन्य पहलुओं को प्रभावित कर सकते हैं। लक्षण अलग-अलग होते हैं; आपका आकलन केवल योग्य चिकित्सक कर सकते हैं।",
        }
    else:
        answers = {
            "en": "I can share general health education, but a symptom or test value alone cannot confirm a cause. For severe, worsening, or persistent concerns, contact a qualified clinician. What would you like to learn about?",
            "te": "నేను సాధారణ ఆరోగ్య సమాచారాన్ని పంచుకోగలను. అయితే ఒక లక్షణం లేదా పరీక్ష విలువతోనే కారణాన్ని నిర్ధారించలేం. సమస్య తీవ్రంగా ఉన్నా, పెరుగుతున్నా లేదా కొనసాగుతున్నా వైద్య నిపుణుడిని సంప్రదించండి.",
            "hi": "मैं सामान्य स्वास्थ्य जानकारी दे सकता हूँ, लेकिन केवल लक्षण या जाँच के परिणाम से कारण की पुष्टि नहीं की जा सकती। परेशानी गंभीर, बढ़ती हुई या लगातार हो तो योग्य चिकित्सक से संपर्क करें।",
        }
    return {
        "answer": answers[body.language],
        "safetyNote": "Educational information only; not a diagnosis or a substitute for a clinician's advice.",
        "urgent": False,
        "sourceType": "educational",
    }


@app.delete("/wellness/privacy/data")
async def delete_wellness_data(
    owner_id: str = Depends(owner_id_from_proxy),
) -> dict[str, bool]:
    await db.delete_user_records(owner_id)
    return {"deleted": True}


@app.get("/wellness/plan")
async def get_plan(owner_id: str = Depends(owner_id_from_proxy)) -> dict[str, Any]:
    row = await db.get_record(owner_id, _setting_id(owner_id, "plan"), "plan")
    if not row:
        return {"plan": "free", "previewOnly": True, "updatedAt": None}
    payload = decrypt_payload(row["encrypted_payload"])
    return {
        "plan": payload["plan"],
        "previewOnly": True,
        "updatedAt": _iso(row["updated_at"]),
    }


@app.put("/wellness/plan")
async def select_plan(
    body: PlanInput,
    owner_id: str = Depends(owner_id_from_proxy),
) -> dict[str, Any]:
    row = await _put_account_record(owner_id, "plan", body.model_dump())
    return {
        "plan": body.plan,
        "previewOnly": True,
        "updatedAt": _iso(row["updated_at"]),
    }
