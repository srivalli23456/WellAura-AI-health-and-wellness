from datetime import date, datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field

Language = Literal["en", "te", "hi"]
TimeOfDay = Annotated[str, Field(pattern=r"^([01]\d|2[0-3]):[0-5]\d$")]


class InputModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ConsentInput(InputModel):
    healthDataConsent: bool
    optionalPersonalizationConsent: bool
    voiceProcessingConsent: bool
    language: Language


class ProfileInput(InputModel):
    displayName: str = Field(min_length=1, max_length=80)
    relationship: str = Field(min_length=1, max_length=40)
    consentConfirmed: bool


class ProfileUpdate(InputModel):
    displayName: str | None = Field(default=None, min_length=1, max_length=80)
    consentConfirmed: bool | None = None


class MedicineInput(InputModel):
    profileId: str
    name: str = Field(min_length=1, max_length=120)
    prescribedDose: str = Field(min_length=1, max_length=80)
    doseTimes: list[TimeOfDay]
    startDate: date | None
    endDate: date | None
    notes: str | None
    active: bool


class MedicineUpdate(InputModel):
    name: str = Field(min_length=1, max_length=120)
    doseTimes: list[TimeOfDay]
    startDate: date | None
    endDate: date | None
    notes: str | None
    active: bool


class DoseLogInput(InputModel):
    scheduledTime: TimeOfDay
    takenAt: datetime
    status: Literal["taken", "skipped"]


class HealthReportInput(InputModel):
    profileId: str
    testName: str = Field(min_length=1, max_length=120)
    resultValue: str = Field(min_length=1, max_length=80)
    unit: str | None
    referenceRange: str | None
    plainLanguageNote: str | None
    reportDate: date | None


class CycleRecordInput(InputModel):
    profileId: str
    cycleStartDate: date
    estimatedCycleDays: int | None = Field(default=None, ge=1, le=90)
    notes: str | None


class LifestyleLogInput(InputModel):
    profileId: str
    date: date
    waterMl: int = Field(ge=0, le=15000)
    sleepHours: float | None = Field(default=None, ge=0, le=24)
    activityMinutes: int = Field(ge=0, le=1440)


class AssistantMessageInput(InputModel):
    message: str = Field(min_length=1, max_length=2000)
    language: Language


class PlanInput(InputModel):
    plan: Literal["free", "plus"]
