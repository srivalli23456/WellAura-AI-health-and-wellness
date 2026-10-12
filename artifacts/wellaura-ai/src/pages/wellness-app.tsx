import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import {
  getGetLifestyleLogQueryKey,
  getGetWellnessConsentQueryKey,
  getGetWellnessDashboardQueryKey,
  getGetWellnessPlanQueryKey,
  getListCycleRecordsQueryKey,
  getListHealthReportsQueryKey,
  getListMedicinesQueryKey,
  getListWellnessProfilesQueryKey,
  useCreateCycleRecord,
  useCreateHealthReport,
  useCreateMedicine,
  useCreateWellnessProfile,
  useDeleteCycleRecord,
  useDeleteHealthReport,
  useDeleteMedicine,
  useDeleteWellnessData,
  useDeleteWellnessProfile,
  useGetLifestyleLog,
  useGetWellnessConsent,
  useGetWellnessDashboard,
  useGetWellnessPlan,
  useHealthCheck,
  useListCycleRecords,
  useListHealthReports,
  useListMedicines,
  useListWellnessProfiles,
  useLogMedicineTaken,
  useSaveLifestyleLog,
  useSelectWellnessPlan,
  useSendWellnessMessage,
  useUpdateWellnessConsent,
  useUpdateWellnessProfile,
  useUpdateMedicine,
  type AssistantReply,
  type ConsentInputLanguage,
  type CycleRecord,
  type HealthReport,
  type Medicine,
  type WellnessProfile,
} from '@workspace/api-client-react';
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowRight,
  Bell,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Clock3,
  Droplets,
  FileText,
  Heart,
  Info,
  LoaderCircle,
  LockKeyhole,
  MessageCircle,
  Moon,
  Plus,
  Pill,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  UsersRound,
  X,
} from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { localize } from '@/lib/localize';

const today = () => {
  const current = new Date();
  const month = String(current.getMonth() + 1).padStart(2, '0');
  const day = String(current.getDate()).padStart(2, '0');
  return `${current.getFullYear()}-${month}-${day}`;
};

const nearestDoseTime = (times: string[]) => {
  const validTimes = times.filter((time) => /^([01]\d|2[0-3]):[0-5]\d$/.test(time));
  if (!validTimes.length) return `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`;
  const currentMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  return validTimes.reduce((nearest, candidate) => {
    const [hours, minutes] = candidate.split(':').map(Number);
    const [nearestHours, nearestMinutes] = nearest.split(':').map(Number);
    const candidateDelta = Math.abs(currentMinutes - (hours * 60 + minutes));
    const nearestDelta = Math.abs(currentMinutes - (nearestHours * 60 + nearestMinutes));
    return Math.min(candidateDelta, 1440 - candidateDelta) < Math.min(nearestDelta, 1440 - nearestDelta) ? candidate : nearest;
  });
};
const languageNames: Record<string, string> = { en: 'English', te: 'తెలుగు', hi: 'हिन्दी' };

function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="serif mt-2 text-[43px] leading-[1.02] tracking-tight text-[#423452] sm:text-[52px]" data-testid="text-page-title">{title}</h1>
        <p className="mt-2 max-w-[680px] text-sm leading-6 text-[#77717d]" data-testid="text-page-description">{description}</p>
      </div>
      {action}
    </div>
  );
}

function LoadingCard({ label = 'Loading your private information' }: { label?: string }) {
  return (
    <div className="panel animate-pulse p-6" role="status" data-testid="status-loading">
      <div className="h-4 w-32 rounded bg-[#e9eee8]" />
      <div className="mt-4 h-8 w-52 rounded bg-[#e9eee8]" />
      <p className="mt-4 text-xs text-[#817b86]">{label}</p>
    </div>
  );
}

function EmptyState({ icon: Icon = CircleHelp, title, text, action }: { icon?: typeof CircleHelp; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="rounded-[20px] border border-dashed border-[#d8e2d9] bg-[#f8faf5] px-6 py-10 text-center" data-testid="state-empty">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white text-[#789482] shadow-sm"><Icon size={20} /></div>
      <h3 className="mt-4 font-bold text-[#4a4152]">{title}</h3>
      <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-[#817b85]">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

function Notice({ tone = 'mint', children, testId = 'notice-info' }: { tone?: 'mint' | 'rose' | 'lavender'; children: ReactNode; testId?: string }) {
  const color = tone === 'rose' ? 'border-[#f0d9de] bg-[#fcf0f1] text-[#755660]' : tone === 'lavender' ? 'border-[#e5dced] bg-[#f5f1f7] text-[#655278]' : 'border-[#dce9df] bg-[#eef6ef] text-[#536c5b]';
  return <div className={`flex gap-3 rounded-2xl border p-4 text-sm leading-6 ${color}`} data-testid={testId}><Info size={17} className="mt-1 shrink-0" /><div>{children}</div></div>;
}

function Modal({ title, description, onClose, children }: { title: string; description?: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-[#30273b]/40 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
      <section className="my-auto w-full max-w-[520px] rounded-[26px] border border-white/80 bg-[#fffefa] p-6 shadow-[0_30px_100px_rgba(44,32,57,.25)] sm:p-8" role="dialog" aria-modal="true" aria-labelledby="dialog-title" data-testid="dialog-form">
        <div className="flex items-start justify-between gap-3">
          <div><h2 id="dialog-title" className="serif text-3xl text-[#443650]">{title}</h2>{description && <p className="mt-1 text-sm leading-6 text-[#7a7480]">{description}</p>}</div>
          <button type="button" className="btn btn-quiet !p-2" aria-label="Close dialog" onClick={onClose} data-testid="button-close-dialog"><X size={18} /></button>
        </div>
        <div className="mt-6">{children}</div>
      </section>
    </div>
  );
}

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <label className="block space-y-1.5"><span className="text-xs font-bold text-[#61586a]">{label}</span>{children}{hint && <span className="block text-[11px] leading-5 text-[#88818b]">{hint}</span>}</label>;
}

function ApiError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-[#f0d9d5] bg-[#fff4f1] p-5" role="alert" data-testid="status-load-error">
      <div className="flex items-start gap-3"><AlertCircle size={18} className="mt-1 text-[#ae665d]" /><div><p className="font-bold text-[#76514e]">We couldn’t load this just now.</p><p className="mt-1 text-sm text-[#897371]">Your information is still private. Please try again in a moment.</p><button type="button" className="btn btn-soft mt-3 !py-2 text-xs" onClick={onRetry} data-testid="button-retry">Try again</button></div></div>
    </div>
  );
}

function Dashboard({ profileId, profileName, summary, loading, error, onRetry, medicines, reports, cycles }: {
  profileId: string; profileName: string; summary: any; loading: boolean; error: boolean; onRetry: () => void;
  medicines: Medicine[]; reports: HealthReport[]; cycles: CycleRecord[];
}) {
  if (loading) return <LoadingCard label="Gathering your wellness overview" />;
  if (error) return <ApiError onRetry={onRetry} />;
  const upcoming = summary?.upcomingDoses ?? [];
  return (
    <div className="soft-enter">
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Your private wellness space</p>
          <h1 className="serif mt-2 text-[43px] leading-[1.02] tracking-tight text-[#423452] sm:text-[54px]" data-testid="text-page-title">Hello, {profileName}.</h1>
          <p className="mt-2 text-sm text-[#77717d]">One day at a time is more than enough.</p>
        </div>
        <div className="pill !px-3 !py-2"><Sparkles size={14} /> A gentle check-in</div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.35fr_.8fr]">
        <section className="relative overflow-hidden rounded-[28px] bg-[#eaf3ec] p-6 sm:p-8">
          <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full border border-[#c8ddce]" />
          <div className="absolute -right-1 -top-4 h-36 w-36 rounded-full border border-[#c8ddce]" />
          <div className="relative max-w-[570px]">
            <p className="eyebrow !text-[#64816d]">Today, gently</p>
            <h2 className="serif mt-3 text-4xl leading-tight text-[#43584b]">Your wellbeing is a journey,<br className="hidden sm:block" /> not a checklist.</h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-[#6f7e72]">There is no perfect day to measure up to. Notice what helps you feel a little more cared for.</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link className="app-link btn btn-primary !px-4 !py-2.5 text-xs" href="/lifestyle" data-testid="link-dashboard-lifestyle">Add a small check-in <ArrowRight size={14} /></Link>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-xs font-semibold text-[#657568]"><ShieldCheck size={14} /> Just for you</span>
            </div>
          </div>
        </section>
        <section className="panel flex flex-col justify-between p-6">
          <div>
            <span className="eyebrow">Next reminder</span>
            {summary?.nextDose ? <><p className="serif mt-3 text-4xl text-[#463852]" data-testid="text-next-dose-time">{summary.nextDose}</p><p className="mt-1 text-sm text-[#79727f]" data-testid="text-next-dose-medicine">{summary.nextDoseMedicine || 'Scheduled medicine'}</p></> : <p className="mt-5 text-sm text-[#817b85]">No reminder is coming up just now.</p>}
          </div>
          <Link href="/medicines" className="app-link mt-6 inline-flex items-center gap-2 text-sm font-bold text-[#725b86]" data-testid="link-dashboard-medicines">View medicine schedule <ChevronRight size={16} /></Link>
        </section>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Active reminders', value: summary?.activeMedicineCount ?? medicines.filter((item) => item.active).length, suffix: 'medicines', icon: Clock3, tone: 'lavender' },
          { label: 'Reports saved', value: summary?.reportsCount ?? reports.length, suffix: 'notes', icon: FileText, tone: 'rose' },
          { label: 'Water today', value: summary?.waterMlToday ?? 0, suffix: 'ml logged', icon: Droplets, tone: 'mint' },
          { label: 'Cycle notes', value: summary?.cyclesCount ?? cycles.length, suffix: 'records', icon: Heart, tone: 'blue' },
        ].map((item) => {
          const Icon = item.icon;
          return <article key={item.label} className="panel p-5" data-testid={`card-summary-${item.label.toLowerCase().replaceAll(' ', '-')}`}><div className="flex items-center justify-between"><span className="text-xs font-semibold text-[#7c7581]">{item.label}</span><span className={`grid h-9 w-9 place-items-center rounded-xl ${item.tone === 'rose' ? 'bg-[#faebef] text-[#a27487]' : item.tone === 'mint' ? 'bg-[#e7f2e9] text-[#689077]' : item.tone === 'blue' ? 'bg-[#e8f1f1] text-[#678990]' : 'bg-[#f0eaf4] text-[#806998]'}`}><Icon size={17} /></span></div><p className="serif mt-5 text-[38px] leading-none text-[#43374f]" data-testid={`value-summary-${item.label.toLowerCase().replaceAll(' ', '-')}`}>{item.value}<small className="ml-2 font-sans text-xs font-medium text-[#8b8490]">{item.suffix}</small></p></article>;
        })}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
        <section className="panel p-6">
          <div className="flex items-center justify-between"><div><p className="eyebrow">Small supports</p><h2 className="serif mt-1 text-3xl text-[#493b55]">Your reminders</h2></div><Link href="/medicines" className="app-link text-xs font-bold text-[#765f89]" data-testid="link-see-reminders">See all</Link></div>
          {upcoming.length ? <div className="mt-4 divide-y divide-[#edf0e9]">{upcoming.slice(0, 3).map((dose: any, index: number) => <div key={`${dose.medicineId}-${dose.scheduledTime}-${index}`} className="flex items-center justify-between gap-4 py-3" data-testid={`row-upcoming-dose-${index}`}><div><p className="text-sm font-bold text-[#51465a]">{dose.medicineName}</p><p className="mt-1 text-xs text-[#8a8390]">{dose.prescribedDose} · {dose.scheduledTime}</p></div><span className={dose.taken ? 'pill' : 'rounded-full bg-[#f6efe6] px-3 py-1 text-[11px] font-bold text-[#8e7048]'}>{dose.taken ? 'Logged' : 'Coming up'}</span></div>)}</div> : medicines.length ? <div className="mt-4 rounded-xl bg-[#f7f8f3] p-4 text-sm text-[#827b86]">Your schedule is ready. View it to log a prescribed dose.</div> : <div className="mt-4"><EmptyState icon={Clock3} title="No reminders yet" text="Add the schedule exactly as prescribed, whenever you’re ready." action={<Link href="/medicines" className="app-link btn btn-soft !py-2 text-xs" data-testid="link-add-medicine-empty">Set a reminder <ArrowRight size={14} /></Link>} /></div>}
        </section>
        <section className="rounded-[22px] border border-[#f0dfe3] bg-[#fcf2f3] p-6">
          <span className="pill !bg-white/70 !text-[#8c6675]"><Heart size={13} /> A kind reminder</span>
          <h2 className="serif mt-4 text-3xl leading-tight text-[#594451]">You deserve care<br />without pressure.</h2>
          <p className="mt-2 text-sm leading-6 text-[#806d78]">Rest, asking for help, or taking one small step all count as caring for yourself.</p>
          <Link href="/assistant" className="app-link mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#865e74]" data-testid="link-dashboard-chat">Talk something through <ArrowRight size={15} /></Link>
        </section>
      </div>
    </div>
  );
}

function MedicinesPage({ profileId, items, loading, error, retry, logTaken, createMedicine, updateMedicine, deleteMedicine, working }: any) {
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Medicine | null>(null);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const times = String(form.get('times') || '').split(',').map((time) => time.trim()).filter(Boolean);
    const data = {
      profileId,
      name: String(form.get('name') || '').trim(),
      prescribedDose: String(form.get('dose') || '').trim(),
      doseTimes: times,
      startDate: String(form.get('startDate') || '') || null,
      endDate: String(form.get('endDate') || '') || null,
      notes: String(form.get('notes') || '').trim() || null,
      active: true,
    };
    if (editing) {
      updateMedicine({ id: editing.id, data: { name: data.name, doseTimes: data.doseTimes, startDate: data.startDate, endDate: data.endDate, notes: data.notes, active: true } });
    } else {
      createMedicine({ data });
    }
    setModal(false);
    setEditing(null);
  };
  return (
    <div className="soft-enter">
      <PageHeading eyebrow="Medicine reminders" title="A little help remembering." description="Record the medicine and timing your clinician prescribed. WellAura never changes doses or tells you to start or stop a medicine." action={<button type="button" className="btn btn-primary" onClick={() => { setEditing(null); setModal(true); }} data-testid="button-add-medicine"><Plus size={16} /> Add medicine</button>} />
      <Notice tone="lavender"><strong>Your prescription comes first.</strong> Use these reminders to remember your clinician’s instructions. If you have a question about a dose, check with your clinician or pharmacist.</Notice>
      <section className="panel mt-5 p-5 sm:p-7">
        <div className="mb-4 flex items-center justify-between"><div><p className="eyebrow">Your schedule</p><h2 className="serif mt-1 text-3xl text-[#493b55]">Prescribed medicines</h2></div><span className="pill">{items.length} saved</span></div>
        {loading ? <LoadingCard /> : error ? <ApiError onRetry={retry} /> : items.length === 0 ? <EmptyState icon={Pill} title="No medicines saved yet" text="Add a reminder with the exact instructions from your prescription." action={<button className="btn btn-soft !py-2 text-xs" onClick={() => setModal(true)} data-testid="button-add-first-medicine"><Plus size={14} /> Add a medicine</button>} /> : <div className="space-y-3">{items.map((medicine: Medicine) => <article key={medicine.id} className="rounded-2xl border border-[#e8ece5] bg-[#fffefa] p-4 sm:p-5" data-testid={`card-medicine-${medicine.id}`}><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#f0eaf4] text-[#765b8b]"><Pill size={19} /></span><div><h3 className="font-bold text-[#4c4057]">{medicine.name}</h3><p className="mt-1 text-sm text-[#79737d]">Prescribed: {medicine.prescribedDose}</p><p className="mt-1 text-xs text-[#948c96]">Reminder times: {medicine.doseTimes.join(', ') || 'Not set'}</p>{medicine.notes && <p className="mt-2 text-xs text-[#827986]">{medicine.notes}</p>}</div></div><div className="flex flex-wrap gap-2"><button type="button" className="btn btn-soft !py-2 text-xs" disabled={working} onClick={() => logTaken(medicine)} data-testid={`button-log-taken-${medicine.id}`}><Check size={14} /> Mark taken</button><button type="button" className="btn btn-quiet !py-2 text-xs" onClick={() => { setEditing(medicine); setModal(true); }} data-testid={`button-edit-medicine-${medicine.id}`}>Edit reminder</button><button type="button" className="btn btn-quiet !px-2 !py-2 text-xs text-[#9a6a68]" onClick={() => { if (window.confirm(`Remove ${medicine.name} from reminders?`)) deleteMedicine(medicine.id); }} data-testid={`button-delete-medicine-${medicine.id}`} aria-label={`Remove ${medicine.name}`}><Trash2 size={15} /></button></div></div></article>)}</div>}
      </section>
      {modal && <Modal title={editing ? 'Adjust reminder details' : 'Add a medicine reminder'} description="Copy the instructions from your current prescription." onClose={() => setModal(false)}><form className="space-y-4" onSubmit={submit}><Field label="Medicine name"><input required name="name" defaultValue={editing?.name} className="field" placeholder="As written on your prescription" data-testid="input-medicine-name" /></Field><Field label="Prescribed dose" hint="Enter the prescribed dose exactly. This app will not recommend changes."><input required name="dose" defaultValue={editing?.prescribedDose} className="field" placeholder="For example, 1 tablet" disabled={!!editing} data-testid="input-medicine-dose" /></Field><Field label="Reminder times" hint="Use 24-hour time, separated by commas. Example: 08:00, 20:00"><input required name="times" defaultValue={editing?.doseTimes.join(', ')} className="field" placeholder="08:00, 20:00" data-testid="input-medicine-times" /></Field><div className="grid gap-3 sm:grid-cols-2"><Field label="Start date"><input type="date" name="startDate" defaultValue={editing?.startDate || ''} className="field" data-testid="input-medicine-start" /></Field><Field label="End date"><input type="date" name="endDate" defaultValue={editing?.endDate || ''} className="field" data-testid="input-medicine-end" /></Field></div><Field label="Notes (optional)"><textarea name="notes" defaultValue={editing?.notes || ''} className="field min-h-20 resize-y" placeholder="Any personal reminder for yourself" data-testid="input-medicine-notes" /></Field><button className="btn btn-primary w-full" type="submit" disabled={working} data-testid="button-save-medicine">{working ? 'Saving…' : 'Save reminder'}</button></form></Modal>}
    </div>
  );
}

function ReportsPage({ profileId, items, loading, error, retry, addReport, deleteReport, working }: any) {
  const [open, setOpen] = useState(false);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    addReport({ data: { profileId, testName: String(form.get('name')), resultValue: String(form.get('result')), unit: String(form.get('unit') || '') || null, referenceRange: String(form.get('range') || '') || null, plainLanguageNote: String(form.get('note') || '') || null, reportDate: String(form.get('date') || '') || null } });
    setOpen(false);
  };
  return (
    <div className="soft-enter">
      <PageHeading eyebrow="Your health notes" title="Reports, in plain language." description="Save a result and a simple note to help you remember what to ask at your next appointment." action={<button className="btn btn-primary" type="button" onClick={() => setOpen(true)} data-testid="button-add-report"><Plus size={16} /> Add a result</button>} />
      <Notice><strong>A note, not a diagnosis.</strong> WellAura does not interpret results as medical advice. Reference ranges can vary; ask your clinician to review your report and explain what it means for you.</Notice>
      <section className="panel mt-5 p-5 sm:p-6" data-testid="section-report-glossary">
        <div className="mb-4">
          <p className="eyebrow">Common report terms</p>
          <h2 className="serif mt-1 text-3xl text-[#493b55]">A small glossary.</h2>
          <p className="mt-2 text-sm text-[#7c7580]">A tiny glossary for understanding the term, not interpreting your result.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ['Hemoglobin', 'A protein in red blood cells that carries oxygen through the body.'],
            ['Glucose', 'A type of sugar in the blood that the body uses for energy.'],
            ['Cholesterol', 'A waxy substance the body uses to build cells and make hormones.'],
            ['White blood cells', 'Cells that are part of the body’s immune system.'],
            ['Platelets', 'Small blood components that help form clots and stop bleeding.'],
            ['TSH', 'Thyroid-stimulating hormone, a signal involved in regulating thyroid activity.'],
            ['Vitamin D', 'A nutrient and hormone that supports calcium use and bone health.'],
            ['HbA1c', 'A blood test that reflects average blood glucose over roughly the past two to three months.'],
            ['Creatinine', 'A waste product from muscle activity that is filtered from the blood by the kidneys.'],
          ].map(([term, definition]) => (
            <article key={term} className="rounded-2xl bg-[#f7f6f2] p-4" data-testid={`glossary-term-${term.toLowerCase().replaceAll(' ', '-')}`}>
              <h3 className="font-bold text-[#51465b]">{term}</h3>
              <p className="mt-1 text-xs leading-5 text-[#7d7782]">{definition}</p>
            </article>
          ))}
        </div>
        <p className="mt-4 rounded-xl bg-[#f5f0f6] p-3 text-xs leading-5 text-[#6f617c]" data-testid="notice-glossary-safety">These definitions explain terms only. They do not interpret your personal result, reference range, or health. Ask a clinician to review your report.</p>
      </section>
      <div className="mt-5">
        {loading ? <LoadingCard /> : error ? <ApiError onRetry={retry} /> : items.length === 0 ? <EmptyState icon={FileText} title="A clear page for now" text="Keep a simple record of a result or question for your next clinician visit." action={<button type="button" className="btn btn-soft !py-2 text-xs" onClick={() => setOpen(true)} data-testid="button-add-first-report"><Plus size={14} /> Save a report note</button>} /> : <div className="grid gap-4 md:grid-cols-2">{items.map((report: HealthReport) => <article key={report.id} className="panel p-5" data-testid={`card-report-${report.id}`}><div className="flex items-start justify-between gap-3"><div><p className="eyebrow">{report.reportDate || 'Date not provided'}</p><h2 className="serif mt-2 text-2xl text-[#493b55]">{report.testName}</h2></div><button className="btn btn-quiet !p-2 text-[#9b7473]" type="button" aria-label={`Delete ${report.testName}`} onClick={() => { if (window.confirm('Delete this saved report note?')) deleteReport(report.id); }} data-testid={`button-delete-report-${report.id}`}><Trash2 size={16} /></button></div><div className="mt-4 rounded-xl bg-[#f5f3f7] p-4"><p className="text-[11px] font-bold uppercase tracking-[.12em] text-[#887c91]">Saved value</p><p className="serif mt-1 text-3xl text-[#4e4059]" data-testid={`value-report-${report.id}`}>{report.resultValue}<small className="ml-2 font-sans text-sm text-[#837b89]">{report.unit}</small></p>{report.referenceRange && <p className="mt-1 text-xs text-[#827b87]">Reference range noted: {report.referenceRange}</p>}</div>{report.plainLanguageNote && <p className="mt-4 text-sm leading-6 text-[#706b76]">{report.plainLanguageNote}</p>}<p className="mt-4 flex items-center gap-2 border-t border-[#ecebe5] pt-3 text-xs text-[#837c88]"><Info size={14} /> Bring this to your clinician for review.</p></article>)}</div>}
      </div>
      {open && <Modal title="Save a report note" description="Enter what is printed on your report; no file upload is needed." onClose={() => setOpen(false)}><form className="space-y-4" onSubmit={submit}><Field label="Test or report name"><input required name="name" className="field" placeholder="As shown on the report" data-testid="input-report-name" /></Field><div className="grid gap-3 sm:grid-cols-2"><Field label="Result value"><input required name="result" className="field" placeholder="Value shown" data-testid="input-report-value" /></Field><Field label="Unit (optional)"><input name="unit" className="field" placeholder="For example, mg/dL" data-testid="input-report-unit" /></Field></div><div className="grid gap-3 sm:grid-cols-2"><Field label="Reference range (optional)"><input name="range" className="field" placeholder="As shown" data-testid="input-report-range" /></Field><Field label="Report date"><input type="date" name="date" className="field" data-testid="input-report-date" /></Field></div><Field label="Your note (optional)" hint="A question or explanation to discuss with a clinician."><textarea name="note" className="field min-h-20 resize-y" placeholder="What would you like to ask?" data-testid="input-report-note" /></Field><button className="btn btn-primary w-full" type="submit" disabled={working} data-testid="button-save-report">Save note</button></form></Modal>}
    </div>
  );
}

function LifestylePage({ log, loading, error, retry, profileId, save, working }: any) {
  const [water, setWater] = useState(0);
  const [sleep, setSleep] = useState('');
  const [activity, setActivity] = useState(0);
  useEffect(() => {
    if (!log) return;
    setWater(log.waterMl);
    setSleep(log.sleepHours === null ? '' : String(log.sleepHours));
    setActivity(log.activityMinutes);
  }, [log]);
  const saveNow = () => save({ data: { profileId, date: today(), waterMl: Number(water), sleepHours: sleep ? Number(sleep) : null, activityMinutes: Number(activity) } });
  return (
    <div className="soft-enter">
      <PageHeading eyebrow="Small things, noticed" title="Your everyday rhythm." description="Track a few wellbeing details without turning them into a score. Choose what feels useful today." />
      {error && <ApiError onRetry={retry} />}
      {loading ? <LoadingCard /> : <div className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
        <section className="panel p-6 sm:p-8">
          <div className="flex items-start justify-between"><div><p className="eyebrow">Today’s gentle check-in</p><h2 className="serif mt-2 text-3xl text-[#493b55]">Just notice, no pressure.</h2></div><span className="pill">{today()}</span></div>
          <div className="mt-7 space-y-7">
            <div><div className="flex items-center justify-between"><label htmlFor="water-amount" className="flex items-center gap-2 text-sm font-bold text-[#55495f]"><Droplets size={17} className="text-[#74a6a0]" /> Water</label><span className="font-semibold text-[#706779]" data-testid="value-water-ml">{water.toLocaleString()} ml</span></div><input id="water-amount" type="range" min="0" max="4000" step="100" value={water} onChange={(event) => setWater(Number(event.target.value))} className="mt-3 w-full accent-[#6d9f91]" data-testid="input-water-range" /><div className="flex justify-between text-[10px] text-[#99919b]"><span>0 ml</span><span>4,000 ml</span></div></div>
            <div><label htmlFor="sleep-hours" className="mb-2 flex items-center gap-2 text-sm font-bold text-[#55495f]"><Moon size={17} className="text-[#8b77a5]" /> Sleep (hours)</label><input id="sleep-hours" type="number" min="0" max="24" step=".25" value={sleep} onChange={(event) => setSleep(event.target.value)} placeholder="Leave blank if you prefer" className="field" data-testid="input-sleep-hours" /></div>
            <div><div className="flex items-center justify-between"><label htmlFor="activity-minutes" className="flex items-center gap-2 text-sm font-bold text-[#55495f]"><Activity size={17} className="text-[#b7909f]" /> Movement you enjoyed</label><span className="font-semibold text-[#706779]" data-testid="value-activity-minutes">{activity} min</span></div><input id="activity-minutes" type="range" min="0" max="180" step="5" value={activity} onChange={(event) => setActivity(Number(event.target.value))} className="mt-3 w-full accent-[#a88294]" data-testid="input-activity-range" /><div className="flex justify-between text-[10px] text-[#99919b]"><span>0 min</span><span>180 min</span></div></div>
          </div>
          <button type="button" className="btn btn-primary mt-7 w-full sm:w-auto" onClick={saveNow} disabled={working || loading} data-testid="button-save-lifestyle">{working ? 'Saving…' : 'Save today’s check-in'} <Check size={15} /></button>
        </section>
        <div className="space-y-4">
          <section className="rounded-[24px] bg-[#eaf3ec] p-6"><Droplets size={20} className="text-[#6b988e]" /><h3 className="serif mt-4 text-3xl text-[#4d6456]">A sip is a start.</h3><p className="mt-2 text-sm leading-6 text-[#758378]">Your needs change from day to day. Follow the guidance that’s right for you.</p></section>
          <Notice tone="rose"><strong>Kindness over targets.</strong> These are personal notes, not a score or medical recommendation. If a health condition affects your hydration or activity, follow your clinician’s advice.</Notice>
        </div>
      </div>}
      {!loading && <section className="panel mt-5 p-5 sm:p-6" data-testid="section-lifestyle-ideas">
        <div className="mb-4">
          <p className="eyebrow">Ideas to make today easier</p>
          <h2 className="serif mt-1 text-3xl text-[#493b55]">Gentle ideas, not rules.</h2>
          <p className="mt-2 text-sm text-[#7c7580]">Choose what fits your life. These general ideas are not a treatment plan.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl bg-[#f5f0f6] p-4">
            <h3 className="font-bold text-[#51465b]">Simple meal ideas</h3>
            <ul className="mt-2 space-y-2 text-xs leading-5 text-[#7d7782]">
              <li>Rice or whole-grain roti with dal, vegetables and curd.</li>
              <li>Idli or oats with fruit, plus an egg, nuts or another protein you enjoy.</li>
              <li>Chickpeas, beans or paneer with vegetables and a grain you like.</li>
              <li>A fruit, unsalted nuts, or plain yoghurt can be an easy snack.</li>
            </ul>
            <p className="mt-3 border-t border-[#e5ddea] pt-3 text-[11px] leading-5 text-[#82778b]">Food needs vary. Adapt these ideas to your preferences, access, allergies and clinician guidance.</p>
          </article>
          <article className="rounded-2xl bg-[#edf5ef] p-4">
            <h3 className="font-bold text-[#4c6654]">Water reminders</h3>
            <ul className="mt-2 space-y-2 text-xs leading-5 text-[#758378]">
              <li>Keep water visible and take a sip when you naturally pause.</li>
              <li>Pair a drink with a routine, like waking up or a meal.</li>
              <li>Follow any fluid limits or advice from your care team.</li>
            </ul>
          </article>
          <article className="rounded-2xl bg-[#f7eff2] p-4">
            <h3 className="font-bold text-[#6a4f5d]">A gentle sleep routine</h3>
            <ul className="mt-2 space-y-2 text-xs leading-5 text-[#81727a]">
              <li>Try a regular wake time, softer lights and a quieter wind-down.</li>
              <li>A calming book, gentle stretch or slow breathing may help you settle.</li>
              <li>If sleep problems persist or affect your day, ask a health professional for support.</li>
            </ul>
          </article>
          <article className="rounded-2xl bg-[#edf3f4] p-4">
            <h3 className="font-bold text-[#4e6268]">Movement, your way</h3>
            <ul className="mt-2 space-y-2 text-xs leading-5 text-[#758187]">
              <li>A relaxed walk, chair stretches, easy dancing or a few mobility breaks are options.</li>
              <li>Choose something comfortable for your body and surroundings.</li>
              <li>Stop if you feel unwell; follow advice for your health conditions.</li>
            </ul>
          </article>
        </div>
      </section>}
    </div>
  );
}

function WomenHealthPage({ profileId, cycles, loading, error, retry, addCycle, removeCycle, working }: any) {
  const [open, setOpen] = useState(false);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const days = String(form.get('days') || '');
    addCycle({ data: { profileId, cycleStartDate: String(form.get('date')), estimatedCycleDays: days ? Number(days) : null, notes: String(form.get('note') || '') || null } });
    setOpen(false);
  };
  return (
    <div className="soft-enter">
      <PageHeading eyebrow="Your body, your notes" title="Women’s health, with care." description="Keep cycle records in a private place and explore general PCOS/PCOD education. Everyone’s experience is different." action={<button className="btn btn-primary" type="button" onClick={() => setOpen(true)} data-testid="button-add-cycle"><Plus size={16} /> Add cycle note</button>} />
      <div className="grid gap-4 lg:grid-cols-[1.08fr_.92fr]">
        <section className="panel p-6 sm:p-7">
          <div><p className="eyebrow">Private cycle notes</p><h2 className="serif mt-1 text-3xl text-[#493b55]">Your cycle log</h2></div>
          <p className="mt-2 text-sm text-[#817a85]">Only add what feels comfortable. Cycle patterns vary and these notes cannot diagnose a condition.</p>
          <div className="mt-5">
            {loading ? <LoadingCard /> : error ? <ApiError onRetry={retry} /> : cycles.length === 0 ? <EmptyState icon={Heart} title="Your log starts when you do" text="Add a cycle start date and optional note whenever it feels useful." action={<button className="btn btn-soft !py-2 text-xs" onClick={() => setOpen(true)} data-testid="button-add-first-cycle"><Plus size={14} /> Add a cycle note</button>} /> : <div className="space-y-3">{cycles.map((cycle: CycleRecord) => <article key={cycle.id} className="rounded-2xl border border-[#eee3e8] bg-[#fffafa] p-4" data-testid={`card-cycle-${cycle.id}`}><div className="flex items-start justify-between gap-4"><div><span className="eyebrow !tracking-[.1em]">Cycle start</span><p className="serif mt-1 text-2xl text-[#634b5e]">{cycle.cycleStartDate}</p><p className="mt-1 text-xs text-[#8b7b85]">{cycle.estimatedCycleDays ? `Estimated cycle length: ${cycle.estimatedCycleDays} days` : 'No estimated length saved'}</p>{cycle.notes && <p className="mt-2 text-sm text-[#766d77]">{cycle.notes}</p>}</div><button className="btn btn-quiet !p-2 text-[#a47682]" type="button" aria-label="Delete cycle note" onClick={() => { if (window.confirm('Delete this cycle note?')) removeCycle(cycle.id); }} data-testid={`button-delete-cycle-${cycle.id}`}><Trash2 size={15} /></button></div></article>)}</div>}
          </div>
        </section>
        <section className="rounded-[24px] border border-[#f0dfe5] bg-[#fcf0f4] p-6 sm:p-7">
          <span className="pill !bg-white/70 !text-[#90677a]">A learning moment</span>
          <h2 className="serif mt-4 text-4xl leading-tight text-[#583f50]">PCOS & PCOD,<br />without the noise.</h2>
          <p className="mt-4 text-sm leading-6 text-[#776b76]">Polycystic ovary syndrome (PCOS) is a common hormone-related condition that can affect periods, skin, hair growth and metabolism. The term PCOD is also used in some settings.</p>
          <div className="mt-5 space-y-3">
            <div className="rounded-2xl bg-white/75 p-4"><h3 className="text-sm font-bold text-[#654d5d]">It can look different for everyone</h3><p className="mt-1 text-xs leading-5 text-[#807580]">Symptoms and care plans vary. A clinician can assess your health and discuss options.</p></div>
            <div className="rounded-2xl bg-white/75 p-4"><h3 className="text-sm font-bold text-[#654d5d]">A cycle log is not a test</h3><p className="mt-1 text-xs leading-5 text-[#807580]">Irregular periods can have many causes. Bring concerns to a qualified healthcare professional.</p></div>
          </div>
          <Notice tone="rose"><strong>Need an assessment?</strong> WellAura cannot diagnose PCOS/PCOD or recommend treatment. Talk with a clinician about your symptoms and questions.</Notice>
        </section>
      </div>
      {open && <Modal title="Add a cycle note" description="This is private and optional. Record only what you want to remember." onClose={() => setOpen(false)}><form onSubmit={submit} className="space-y-4"><Field label="Cycle start date"><input type="date" name="date" required className="field" data-testid="input-cycle-date" /></Field><Field label="Estimated cycle length (optional)" hint="Personal estimate only, not a prediction."><input type="number" min="1" max="90" name="days" className="field" placeholder="Days" data-testid="input-cycle-days" /></Field><Field label="Note (optional)"><textarea name="note" className="field min-h-20 resize-y" placeholder="Anything you want to remember" data-testid="input-cycle-note" /></Field><button type="submit" className="btn btn-primary w-full" disabled={working} data-testid="button-save-cycle">Save cycle note</button></form></Modal>}
    </div>
  );
}

function AssistantPage({ send, working, language }: { send: (message: string) => Promise<AssistantReply | undefined>; working: boolean; language: string }) {
  const [message, setMessage] = useState('');
  const [conversation, setConversation] = useState<{ from: 'you' | 'guide'; text: string; urgent?: boolean }[]>([]);
  const ask = async (text: string) => {
    if (!text.trim() || working) return;
    setConversation((current) => [...current, { from: 'you', text }]);
    setMessage('');
    const reply = await send(text);
    if (reply) setConversation((current) => [...current, { from: 'guide', text: `${reply.answer}\n\n${reply.safetyNote}`, urgent: reply.urgent }]);
  };
  return (
    <div className="soft-enter">
      <PageHeading eyebrow="A thoughtful guide" title="Ask, learn, take a breath." description={`Educational support in ${languageNames[language] || 'English'}. Your guide can explain general health concepts, but cannot diagnose or replace a professional.`} />
      <div className="mb-4">
        <Notice tone="lavender"><strong>Limited educational guide.</strong> Replies come from a small set of deterministic educational templates. Generative AI is not enabled. This guide cannot diagnose or replace a clinician.</Notice>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_310px]">
        <section className="panel flex min-h-[560px] flex-col p-5 sm:p-7">
          <div className="flex items-center gap-3 border-b border-[#ecece5] pb-4"><div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#efe9f3] text-[#755c8c]"><Sparkles size={19} /></div><div><h2 className="font-bold text-[#4f435a]">WellAura guide</h2><p className="text-xs text-[#8a8390]">Educational support · {languageNames[language] || 'English'}</p></div><span className="ml-auto pill">Not medical advice</span></div>
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto py-5" aria-live="polite">
            <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-[#edf4ee] p-4 text-sm leading-6 text-[#59695e]" data-testid="message-assistant-welcome">Hello. I can help explain common wellness topics or help you think of questions for your clinician. What’s on your mind?</div>
            {conversation.map((entry, index) => <div key={`${entry.from}-${index}`} className={`max-w-[88%] whitespace-pre-wrap rounded-2xl p-4 text-sm leading-6 ${entry.from === 'you' ? 'ml-auto rounded-tr-sm bg-[#eee8f2] text-[#574665]' : entry.urgent ? 'rounded-tl-sm border border-[#eed6d1] bg-[#fff1ed] text-[#72544e]' : 'rounded-tl-sm bg-[#edf4ee] text-[#59695e]'}`} data-testid={`message-${entry.from}-${index}`}>{entry.text}</div>)}
          </div>
          <div className="border-t border-[#ecece5] pt-4">
            <div className="mb-3 flex flex-wrap gap-2">{['What is a reference range?', 'How can I prepare for an appointment?', 'Tell me about hydration'].map((suggestion, index) => <button type="button" key={suggestion} className="rounded-full border border-[#e5e0e8] bg-white px-3 py-2 text-[11px] font-semibold text-[#766a7e] hover:bg-[#f5f0f6]" onClick={() => ask(suggestion)} data-testid={`button-suggestion-${index}`}>{suggestion}</button>)}</div>
            <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); void ask(message); }}><input value={message} onChange={(event) => setMessage(event.target.value)} className="field" placeholder="Ask a general wellness question…" maxLength={2000} data-testid="input-assistant-message" /><button className="btn btn-primary !px-4" type="submit" disabled={!message.trim() || working} aria-label="Send message" data-testid="button-send-message">{working ? <LoaderCircle className="animate-spin" size={17} /> : <Send size={16} />}</button></form>
            <p className="mt-2 text-[10px] text-[#938c96]">Please don’t share identifying information or use this chat for emergencies.</p>
          </div>
        </section>
        <aside className="space-y-4">
          <section className="rounded-[22px] border border-[#e5dced] bg-[#f4eff7] p-5"><MessageCircle size={19} className="text-[#806998]" /><h3 className="serif mt-3 text-2xl text-[#50425f]">Voice is not available</h3><p className="mt-2 text-sm leading-6 text-[#776d80]">This experience is text-only. Voice is inactive and unavailable. No microphone is requested and no microphone recordings are stored.</p></section>
          <Notice tone="rose"><strong>Not for urgent help.</strong> If you may be in danger or have severe or rapidly worsening symptoms, contact local emergency services or a healthcare professional now.</Notice>
          <div className="panel p-5"><h3 className="flex items-center gap-2 text-sm font-bold text-[#574a61]"><LockKeyhole size={15} /> A private conversation</h3><p className="mt-2 text-xs leading-5 text-[#817a85]">Share only what is necessary. Your guide may not have your complete health history.</p></div>
        </aside>
      </div>
    </div>
  );
}

function ProfilesPage({ profiles, loading, error, retry, add, update, remove, working }: any) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<WellnessProfile | null>(null);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const displayName = String(form.get('name')).trim();
    if (editing) update({ id: editing.id, data: { displayName } });
    else add({ data: { displayName, relationship: String(form.get('relationship')), consentConfirmed: form.get('permission') === 'yes' } });
    setOpen(false);
  };
  return (
    <div className="soft-enter">
      <PageHeading eyebrow="People & permission" title="Care, shared on your terms." description="Keep your own profile and, only with their permission, add a person you help care for." action={<button className="btn btn-primary" type="button" onClick={() => { setEditing(null); setOpen(true); }} data-testid="button-add-caregiver"><Plus size={16} /> Add caregiver profile</button>} />
      <Notice tone="lavender"><strong>Permission comes first.</strong> Only add someone else if they have clearly agreed to having their wellness information kept here. Confirm their permission below.</Notice>
      <section className="panel mt-5 p-5 sm:p-7">
        <div className="mb-5"><p className="eyebrow">Your people</p><h2 className="serif mt-1 text-3xl text-[#493b55]">Profiles with access</h2></div>
        {loading ? <LoadingCard /> : error ? <ApiError onRetry={retry} /> : profiles.length === 0 ? <EmptyState icon={UsersRound} title="Your profile will appear here" text="Once your account’s wellness profile is ready, you can choose it from the profile switcher." /> : <div className="space-y-3">{profiles.map((profile: WellnessProfile) => <article key={profile.id} className="flex flex-col justify-between gap-4 rounded-2xl border border-[#e7ebe4] bg-[#fffefa] p-4 sm:flex-row sm:items-center" data-testid={`card-profile-${profile.id}`}><div className="flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#eaf2ec] text-lg font-bold text-[#64816d]">{profile.displayName.slice(0, 1).toUpperCase()}</div><div><h3 className="font-bold text-[#50435a]">{profile.displayName}</h3><p className="mt-1 text-xs text-[#837c88]">{profile.isSelf ? 'Your personal profile' : profile.relationship}</p></div></div><div className="flex items-center gap-3">{!profile.isSelf && <span className="pill"><CheckCircle2 size={13} /> Permission confirmed</span>}<button className="btn btn-quiet !py-2 text-xs" type="button" onClick={() => { setEditing(profile); setOpen(true); }} data-testid={`button-edit-profile-${profile.id}`}>Edit name</button>{!profile.isSelf && <button className="btn btn-quiet !p-2 text-[#9b6d6c]" type="button" aria-label={`Delete profile ${profile.displayName}`} onClick={() => { if (window.confirm(`Delete ${profile.displayName} and their wellness records?`)) remove(profile.id); }} data-testid={`button-delete-profile-${profile.id}`}><Trash2 size={15} /></button>}</div></article>)}</div>}
      </section>
      {open && <Modal title={editing ? 'Update profile name' : 'Add a caregiver profile'} description={editing ? 'Make a small correction to this profile.' : 'Please confirm permission before saving another person’s profile.'} onClose={() => setOpen(false)}><form className="space-y-4" onSubmit={submit}><Field label="Name"><input required maxLength={80} name="name" defaultValue={editing?.displayName} className="field" placeholder="Name they use" data-testid="input-profile-name" /></Field>{!editing && <><Field label="Relationship"><input required maxLength={40} name="relationship" className="field" placeholder="For example, parent or partner" data-testid="input-profile-relationship" /></Field><label className="flex items-start gap-3 rounded-2xl border border-[#e8e4eb] bg-[#f8f5f9] p-4 text-sm leading-6 text-[#675a70]"><input required type="checkbox" name="permission" value="yes" className="mt-1 accent-[#745b91]" data-testid="checkbox-profile-permission" /><span>I confirm this person has given permission for me to keep their wellness information in this account.</span></label></>}<button type="submit" className="btn btn-primary w-full" disabled={working} data-testid="button-save-profile">{editing ? 'Save name' : 'Confirm and add profile'}</button></form></Modal>}
    </div>
  );
}

function PlansPage({ plan, loading, select, working }: any) {
  return (
    <div className="soft-enter">
      <PageHeading eyebrow="Choices, without pressure" title="A plan preview, not a purchase." description="Explore what a future plan could look like. Choosing an option here only updates a preview state—there is no billing or charge." />
      {loading ? <LoadingCard /> : <div className="grid gap-5 md:grid-cols-2">
        <section className={`panel p-6 sm:p-8 ${plan?.plan === 'free' ? 'ring-2 ring-[#93b59c]' : ''}`}><span className="pill">Current choice {plan?.plan === 'free' ? '· selected' : ''}</span><h2 className="serif mt-5 text-4xl text-[#493b55]">A steady start</h2><p className="mt-2 text-sm text-[#79737d]">The essentials for your everyday wellness space.</p><p className="serif mt-6 text-5xl text-[#493b55]">Free</p><ul className="mt-6 space-y-3 text-sm text-[#696271]">{['Private wellness profile', 'Medicine reminders and taken logs', 'Lifestyle and cycle notes', 'Educational wellness guide'].map((text) => <li key={text} className="flex items-center gap-2"><CheckCircle2 size={16} className="text-[#74a184]" />{text}</li>)}</ul><button className="btn btn-soft mt-8 w-full" type="button" disabled={working || plan?.plan === 'free'} onClick={() => select({ data: { plan: 'free' } })} data-testid="button-select-free">Keep the free preview</button></section>
        <section className={`relative overflow-hidden rounded-[26px] border border-[#e6d9e9] bg-[#f3edf5] p-6 sm:p-8 ${plan?.plan === 'plus' ? 'ring-2 ring-[#aa91b7]' : ''}`}><div className="absolute -right-8 -top-10 h-44 w-44 rounded-full border border-[#dfcde3]" /><span className="pill !bg-white/80">Preview only · no charge</span><h2 className="serif mt-5 text-4xl text-[#493b55]">A little more room</h2><p className="mt-2 text-sm text-[#79737d]">A concept for additional organization and reflection.</p><p className="serif mt-6 text-5xl text-[#493b55]">Plus <small className="font-sans text-sm font-medium text-[#887d8d]">preview</small></p><ul className="mt-6 space-y-3 text-sm text-[#696271]">{['Everything in the free plan', 'Expanded private history', 'More space for personal notes', 'No payment details collected here'].map((text) => <li key={text} className="flex items-center gap-2"><CheckCircle2 size={16} className="text-[#806996]" />{text}</li>)}</ul><button className="btn btn-primary mt-8 w-full" type="button" disabled={working || plan?.plan === 'plus'} onClick={() => select({ data: { plan: 'plus' } })} data-testid="button-select-plus">{plan?.plan === 'plus' ? 'Preview selected' : 'Preview this plan'} <ArrowRight size={15} /></button></section>
      </div>}
      <div className="mt-5"><Notice tone="rose"><strong>No payment happens here.</strong> Plan selection is a non-billing preview only. No charge will be made and no payment information is collected.</Notice></div>
    </div>
  );
}

function SettingsPage({ consent, loading, updateConsent, deleteData, working, language, onLanguageChange, notificationPrefs, notificationMessage, onEnableNotifications, onDisableNotifications }: any) {
  const [checked, setChecked] = useState({ healthDataConsent: false, optionalPersonalizationConsent: false, voiceProcessingConsent: false });
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!consent) return;
    setChecked({ healthDataConsent: consent.healthDataConsent, optionalPersonalizationConsent: consent.optionalPersonalizationConsent, voiceProcessingConsent: consent.voiceProcessingConsent });
    setSelectedLanguage(consent.language);
    setLoaded(true);
  }, [consent]);
  const toggle = (key: keyof typeof checked) => setChecked((current) => ({ ...current, [key]: !current[key] }));
  const save = () => updateConsent({ data: { ...checked, language: selectedLanguage as ConsentInputLanguage } });
  return (
    <div className="soft-enter">
      <PageHeading eyebrow="Your choices" title="Privacy, language & control." description="Your information belongs to you. Choose how you use WellAura and review your preferences at any time." />
      {loading ? <LoadingCard /> : <div className="grid gap-4 lg:grid-cols-[1fr_330px]">
        <div className="space-y-4">
          <section className="panel p-6">
            <div className="flex gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#eaf2ec] text-[#64816d]"><LockKeyhole size={18} /></div><div><p className="eyebrow">Consent & data</p><h2 className="serif mt-1 text-3xl text-[#493b55]">Your information, your say.</h2><p className="mt-1 text-sm leading-6 text-[#7c7580]">You can update these preferences whenever you like.</p></div></div>
            <div className="mt-5 space-y-3">{[
              { key: 'healthDataConsent' as const, title: 'Use my wellness data for this account', detail: 'Allows you to save and view the health notes you choose to add.' },
              { key: 'optionalPersonalizationConsent' as const, title: 'Allow optional personalization', detail: 'Use your saved preferences to make the in-app experience feel more relevant.' },
              { key: 'voiceProcessingConsent' as const, title: 'Voice processing permission', detail: 'No voice feature is currently available. Recordings are not stored. This choice does not activate voice.' },
            ].map((choice) => <label key={choice.key} className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-[#e9ece5] bg-[#fffefa] p-4" data-testid={`row-consent-${choice.key}`}><span><span className="block text-sm font-bold text-[#51465b]">{choice.title}</span><span className="mt-1 block text-xs leading-5 text-[#837c86]">{choice.detail}</span></span><input type="checkbox" checked={checked[choice.key]} onChange={() => toggle(choice.key)} className="mt-1 h-4 w-4 accent-[#745b91]" data-testid={`checkbox-consent-${choice.key}`} /></label>)}</div>
            <button type="button" className="btn btn-primary mt-5" onClick={save} disabled={working} data-testid="button-save-consent">{working ? 'Saving…' : 'Save privacy choices'} <Check size={15} /></button>
          </section>
          <section className="panel p-6">
            <p className="eyebrow">Your language</p><h2 className="serif mt-1 text-3xl text-[#493b55]">Feel at home here.</h2><p className="mt-1 text-sm text-[#7c7580]">Choose the language you’d like WellAura to use.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">{[['en', 'English'], ['te', 'తెలుగు'], ['hi', 'हिन्दी']].map(([code, label]) => <button key={code} type="button" className={`rounded-2xl border px-4 py-3 text-sm font-bold transition-colors ${selectedLanguage === code ? 'border-[#b8a3c3] bg-[#f3edf5] text-[#614b75]' : 'border-[#e6e8e1] bg-white text-[#77717c]'}`} onClick={() => { setSelectedLanguage(code); onLanguageChange(code); }} data-testid={`button-language-${code}`}>{label}</button>)}</div>
            <button type="button" className="btn btn-soft mt-4 !py-2 text-xs" onClick={save} disabled={working || !loaded} data-testid="button-save-language">Save language preference</button>
          </section>
          <section className="panel p-6">
            <p className="eyebrow">Optional browser alerts</p>
            <h2 className="serif mt-1 text-3xl text-[#493b55]">Gentle reminders, while you’re here.</h2>
            <p className="mt-2 text-sm leading-6 text-[#7c7580]">These reminders work only while WellAura is open. They use generic wording and never include medicine names or sensitive health information. No microphone access is requested.</p>
            {notificationMessage && <p className="mt-3 rounded-xl bg-[#eef5ef] p-3 text-xs text-[#5b735f]" role="status" data-testid="status-notifications">{notificationMessage}</p>}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-[#e8ece5] bg-[#fffefa] p-4">
                <div className="flex items-center gap-2 text-sm font-bold text-[#51465b]"><Bell size={16} /> Medicine times</div>
                <p className="mt-1 text-xs leading-5 text-[#827b86]">A private reminder at the times you entered for active medicines.</p>
                <button type="button" className={`btn mt-3 w-full !py-2 text-xs ${notificationPrefs.medicine ? 'btn-quiet' : 'btn-soft'}`} onClick={() => notificationPrefs.medicine ? onDisableNotifications('medicine') : onEnableNotifications('medicine')} data-testid="button-notify-medicine">{notificationPrefs.medicine ? 'Turn off medicine reminders' : 'Allow medicine reminders'}</button>
              </div>
              <div className="rounded-2xl border border-[#e8ece5] bg-[#fffefa] p-4">
                <div className="flex items-center gap-2 text-sm font-bold text-[#51465b]"><Droplets size={16} /> Hydration pause</div>
                <p className="mt-1 text-xs leading-5 text-[#827b86]">An occasional generic nudge to pause for a drink.</p>
                <button type="button" className={`btn mt-3 w-full !py-2 text-xs ${notificationPrefs.hydration ? 'btn-quiet' : 'btn-soft'}`} onClick={() => notificationPrefs.hydration ? onDisableNotifications('hydration') : onEnableNotifications('hydration')} data-testid="button-notify-hydration">{notificationPrefs.hydration ? 'Turn off hydration reminders' : 'Allow hydration reminders'}</button>
              </div>
            </div>
          </section>
        </div>
        <aside className="space-y-4">
          <section className="rounded-[24px] bg-[#eaf3ec] p-6"><ShieldCheck size={20} className="text-[#6a9275]" /><h3 className="serif mt-4 text-3xl text-[#49604e]">Privacy is personal.</h3><p className="mt-2 text-sm leading-6 text-[#728175]">You can use profiles to control who you care for. Another person’s profile needs their confirmed permission.</p></section>
          <section className="rounded-[22px] border border-[#efd8d5] bg-[#fff5f2] p-5"><h3 className="font-bold text-[#765551]">Delete wellness data</h3><p className="mt-2 text-xs leading-5 text-[#8c716d]">Permanently remove your wellness records from this account. This cannot be undone.</p><button type="button" className="btn btn-danger mt-4 w-full !py-2.5 text-xs" disabled={working} onClick={() => { if (window.confirm('Permanently delete all of your wellness data? This cannot be undone.')) deleteData(); }} data-testid="button-delete-wellness-data"><Trash2 size={14} /> Permanently delete my data</button></section>
          <div className="panel p-5"><p className="text-xs leading-5 text-[#817b85]">Language selection is saved with your privacy choices. Wellness guide responses are provided only when the service is available.</p></div>
        </aside>
      </div>}
    </div>
  );
}

export function WellnessApp({ userName }: { userName: string }) {
  const queryClient = useQueryClient();
  const [location, setLocation] = useLocation();
  const [selectedId, setSelectedId] = useState('');
  const [activeLanguage, setActiveLanguage] = useState('en');
  const [notificationPrefs, setNotificationPrefs] = useState({ medicine: false, hydration: false });
  const [notificationMessage, setNotificationMessage] = useState('');
  const notifiedEvents = useRef(new Set<string>());
  const consentQuery = useGetWellnessConsent();
  const consent = consentQuery.data;
  useEffect(() => {
    if (consent?.language) setActiveLanguage(consent.language);
  }, [consent?.language]);
  useEffect(() => {
    try {
      setNotificationPrefs({
        medicine: localStorage.getItem('wellaura-notify-medicine') === 'true',
        hydration: localStorage.getItem('wellaura-notify-hydration') === 'true',
      });
    } catch {
      setNotificationPrefs({ medicine: false, hydration: false });
    }
  }, []);
  const profilesQuery = useListWellnessProfiles({
    query: {
      enabled: !!consent?.healthDataConsent,
      queryKey: getListWellnessProfilesQueryKey(),
    },
  });
  const profiles = profilesQuery.data ?? [];
  useEffect(() => {
    if (!profiles.length) return;
    if (!selectedId || !profiles.some((profile) => profile.id === selectedId)) {
      setSelectedId(profiles.find((profile) => profile.isSelf)?.id ?? profiles[0].id);
    }
  }, [profiles, selectedId]);
  const activeProfile = profiles.find((profile) => profile.id === selectedId) ?? profiles.find((profile) => profile.isSelf);
  const profileId = activeProfile?.id ?? '';
  const profileName = activeProfile?.displayName ?? userName;
  const profileParams = { profileId };
  const todayParams = { profileId, date: today() };
  const enabledQuery = { enabled: !!profileId, queryKey: getGetWellnessDashboardQueryKey(profileParams) };
  const health = useHealthCheck();
  const dashboardQuery = useGetWellnessDashboard(profileParams, { query: enabledQuery });
  const medicinesQuery = useListMedicines(profileParams, { query: { enabled: !!profileId, queryKey: getListMedicinesQueryKey(profileParams) } });
  const reportsQuery = useListHealthReports(profileParams, { query: { enabled: !!profileId, queryKey: getListHealthReportsQueryKey(profileParams) } });
  const cyclesQuery = useListCycleRecords(profileParams, { query: { enabled: !!profileId, queryKey: getListCycleRecordsQueryKey(profileParams) } });
  const lifestyleQuery = useGetLifestyleLog(todayParams, { query: { enabled: !!profileId, queryKey: getGetLifestyleLogQueryKey(todayParams) } });
  const planQuery = useGetWellnessPlan();

  const createProfile = useCreateWellnessProfile();
  const updateProfile = useUpdateWellnessProfile();
  const deleteProfile = useDeleteWellnessProfile();
  const createMedicine = useCreateMedicine();
  const updateMedicine = useUpdateMedicine();
  const deleteMedicine = useDeleteMedicine();
  const logMedicineTaken = useLogMedicineTaken();
  const createReport = useCreateHealthReport();
  const deleteReport = useDeleteHealthReport();
  const createCycle = useCreateCycleRecord();
  const deleteCycle = useDeleteCycleRecord();
  const saveLifestyle = useSaveLifestyleLog();
  const sendMessage = useSendWellnessMessage();
  const updateConsent = useUpdateWellnessConsent();
  const deleteWellnessData = useDeleteWellnessData();
  const selectPlan = useSelectWellnessPlan();

  const invalidate = (...keys: readonly (readonly unknown[])[]) => Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
  const profileKeys = [getListWellnessProfilesQueryKey()];
  const medicineKeys = [getListMedicinesQueryKey(profileParams), getGetWellnessDashboardQueryKey(profileParams)];
  const reportKeys = [getListHealthReportsQueryKey(profileParams), getGetWellnessDashboardQueryKey(profileParams)];
  const cycleKeys = [getListCycleRecordsQueryKey(profileParams), getGetWellnessDashboardQueryKey(profileParams)];
  const lifestyleKeys = [getGetLifestyleLogQueryKey(todayParams), getGetWellnessDashboardQueryKey(profileParams)];
  const mutationsPending = createMedicine.isPending || updateMedicine.isPending || deleteMedicine.isPending || logMedicineTaken.isPending;
  const pageLanguage = activeLanguage || consent?.language || 'en';
  const activeMedicines = useMemo(() => medicinesQuery.data ?? [], [medicinesQuery.data]);
  const setNotificationPreference = (kind: 'medicine' | 'hydration', enabled: boolean) => {
    setNotificationPrefs((current) => ({ ...current, [kind]: enabled }));
    try {
      localStorage.setItem(`wellaura-notify-${kind}`, String(enabled));
    } catch {
      setNotificationMessage('Browser storage is unavailable. Reminders will not be remembered after this session.');
    }
  };
  const enableNotifications = async (kind: 'medicine' | 'hydration') => {
    if (typeof Notification === 'undefined') {
      setNotificationMessage('Notifications are not supported in this browser.');
      return;
    }
    try {
      const permission = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
      if (permission !== 'granted') {
        setNotificationMessage(permission === 'denied' ? 'Notifications are blocked. Allow them in your browser settings to use reminders.' : 'Permission was denied. Change your browser notification settings to allow reminders.');
        return;
      }
      setNotificationPreference(kind, true);
      setNotificationMessage(kind === 'medicine' ? 'Medicine notifications are available only while this app is open.' : 'Hydration notifications are available only while this app is open.');
    } catch {
      setNotificationMessage('Notifications are not supported in this browser.');
    }
  };
  const disableNotifications = (kind: 'medicine' | 'hydration') => {
    setNotificationPreference(kind, false);
    setNotificationMessage(kind === 'medicine' ? 'Medicine reminders are off.' : 'Hydration reminders are off.');
  };
  const changeLanguage = (language: string) => {
    setActiveLanguage(language);
    if (!consent) return;
    updateConsent.mutate(
      {
        data: {
          healthDataConsent: consent.healthDataConsent,
          optionalPersonalizationConsent: consent.optionalPersonalizationConsent,
          voiceProcessingConsent: consent.voiceProcessingConsent,
          language: language as ConsentInputLanguage,
        },
      },
      {
        onError: () => setActiveLanguage(consent.language),
        onSuccess: (savedConsent) => {
          queryClient.setQueryData(getGetWellnessConsentQueryKey(), savedConsent);
          void invalidate(getGetWellnessConsentQueryKey(), getListWellnessProfilesQueryKey());
        },
      },
    );
  };
  const saveConsent = (variables: any) => updateConsent.mutate(variables, {
    onSuccess: (savedConsent) => {
      if (consent?.healthDataConsent && !savedConsent.healthDataConsent) {
        queryClient.clear();
      }
      queryClient.setQueryData(getGetWellnessConsentQueryKey(), savedConsent);
      void invalidate(getGetWellnessConsentQueryKey(), getListWellnessProfilesQueryKey());
    },
  });
  useEffect(() => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    const checkNotifications = () => {
      const current = new Date();
      const localDate = today();
      const hour = String(current.getHours()).padStart(2, '0');
      const minute = String(current.getMinutes()).padStart(2, '0');
      const currentTime = `${hour}:${minute}`;
      if (notificationPrefs.medicine) {
        activeMedicines.filter((medicine) => medicine.active && medicine.doseTimes.includes(currentTime)).forEach((medicine) => {
          const key = `medicine:${localDate}:${medicine.id}:${currentTime}`;
          if (notifiedEvents.current.has(key)) return;
          notifiedEvents.current.add(key);
          new Notification('WellAura', { body: localize(pageLanguage, 'A private routine reminder is ready.') });
        });
      }
      if (notificationPrefs.hydration && current.getMinutes() === 0) {
        const key = `hydration:${localDate}:${hour}`;
        if (notifiedEvents.current.has(key)) return;
        notifiedEvents.current.add(key);
        new Notification('WellAura', { body: localize(pageLanguage, 'A private routine reminder is ready.') });
      }
    };
    checkNotifications();
    const timer = window.setInterval(checkNotifications, 30_000);
    return () => window.clearInterval(timer);
  }, [activeMedicines, notificationPrefs, pageLanguage]);
  const assistantSend = async (message: string) => {
    try {
      return await sendMessage.mutateAsync({ data: { message, language: pageLanguage as ConsentInputLanguage } });
    } catch {
      return {
        answer: 'I can’t reach the wellness guide just now. Please try again shortly, or contact a qualified healthcare professional for personal medical advice.',
        safetyNote: 'If this may be urgent, contact local emergency services or a healthcare professional now.',
        urgent: false,
        sourceType: 'educational' as const,
      };
    }
  };
  const requireHealthConsent = () => {
    if (consent?.healthDataConsent) return true;
    setLocation('/settings');
    return false;
  };

  const content = useMemo(() => {
    if (!profileId && profilesQuery.isLoading) return <LoadingCard label="Finding your wellness profile" />;
    if (!profileId && profilesQuery.isError) return <ApiError onRetry={() => void profilesQuery.refetch()} />;
    if (!profileId && location === '/settings') return <SettingsPage consent={consent} loading={consentQuery.isLoading} language={pageLanguage} working={updateConsent.isPending || deleteWellnessData.isPending} updateConsent={saveConsent} deleteData={() => deleteWellnessData.mutate(undefined, { onSuccess: () => { queryClient.clear(); void queryClient.invalidateQueries(); } })} onLanguageChange={changeLanguage} notificationPrefs={notificationPrefs} notificationMessage={notificationMessage} onEnableNotifications={enableNotifications} onDisableNotifications={disableNotifications} />;
    if (!profileId) return <div className="panel p-8"><EmptyState icon={UsersRound} title={consent?.healthDataConsent ? 'Your wellness profile is getting ready' : 'Choose your wellness data preference'} text={consent?.healthDataConsent ? 'Please check back shortly. Your personal profile will appear here when your account is set up.' : 'Review and save your privacy choice before viewing or adding wellness information.'} action={!consent?.healthDataConsent ? <Link href="/settings" className="app-link btn btn-primary" data-testid="link-enable-health-consent">Review privacy settings <ArrowRight size={15} /></Link> : undefined} /></div>;
    if (location === '/dashboard') return <Dashboard profileId={profileId} profileName={profileName} summary={dashboardQuery.data} loading={dashboardQuery.isLoading} error={dashboardQuery.isError} onRetry={() => void dashboardQuery.refetch()} medicines={medicinesQuery.data ?? []} reports={reportsQuery.data ?? []} cycles={cyclesQuery.data ?? []} />;
    if (location === '/medicines') return <MedicinesPage profileId={profileId} items={medicinesQuery.data ?? []} loading={medicinesQuery.isLoading} error={medicinesQuery.isError} retry={() => void medicinesQuery.refetch()} working={mutationsPending} createMedicine={(variables: any) => { if (requireHealthConsent()) createMedicine.mutate(variables, { onSuccess: () => void invalidate(...medicineKeys) }); }} updateMedicine={(variables: any) => { if (requireHealthConsent()) updateMedicine.mutate(variables, { onSuccess: () => void invalidate(...medicineKeys) }); }} deleteMedicine={(id: string) => { if (requireHealthConsent()) deleteMedicine.mutate({ id }, { onSuccess: () => void invalidate(...medicineKeys) }); }} logTaken={(medicine: Medicine) => { if (requireHealthConsent()) logMedicineTaken.mutate({ id: medicine.id, data: { scheduledTime: nearestDoseTime(medicine.doseTimes), takenAt: new Date().toISOString(), status: 'taken' } }, { onSuccess: () => void invalidate(...medicineKeys) }); }} />;
    if (location === '/reports') return <ReportsPage profileId={profileId} items={reportsQuery.data ?? []} loading={reportsQuery.isLoading} error={reportsQuery.isError} retry={() => void reportsQuery.refetch()} working={createReport.isPending} addReport={(variables: any) => { if (requireHealthConsent()) createReport.mutate(variables, { onSuccess: () => void invalidate(...reportKeys) }); }} deleteReport={(id: string) => { if (requireHealthConsent()) deleteReport.mutate({ id }, { onSuccess: () => void invalidate(...reportKeys) }); }} />;
    if (location === '/lifestyle') return <LifestylePage profileId={profileId} log={lifestyleQuery.data} loading={lifestyleQuery.isLoading} error={lifestyleQuery.isError} retry={() => void lifestyleQuery.refetch()} working={saveLifestyle.isPending} save={(variables: any) => { if (requireHealthConsent()) saveLifestyle.mutate(variables, { onSuccess: () => void invalidate(...lifestyleKeys) }); }} />;
    if (location === '/women-health') return <WomenHealthPage profileId={profileId} cycles={cyclesQuery.data ?? []} loading={cyclesQuery.isLoading} error={cyclesQuery.isError} retry={() => void cyclesQuery.refetch()} working={createCycle.isPending} addCycle={(variables: any) => { if (requireHealthConsent()) createCycle.mutate(variables, { onSuccess: () => void invalidate(...cycleKeys) }); }} removeCycle={(id: string) => { if (requireHealthConsent()) deleteCycle.mutate({ id }, { onSuccess: () => void invalidate(...cycleKeys) }); }} />;
    if (location === '/assistant') return <AssistantPage send={assistantSend} working={sendMessage.isPending} language={pageLanguage} />;
    if (location === '/profiles') return <ProfilesPage profiles={profiles} loading={profilesQuery.isLoading} error={profilesQuery.isError} retry={() => void profilesQuery.refetch()} working={createProfile.isPending || updateProfile.isPending || deleteProfile.isPending} add={(variables: any) => createProfile.mutate(variables, { onSuccess: () => void invalidate(...profileKeys) })} update={(variables: any) => updateProfile.mutate(variables, { onSuccess: () => void invalidate(...profileKeys) })} remove={(id: string) => deleteProfile.mutate({ id }, { onSuccess: () => void invalidate(...profileKeys, getListMedicinesQueryKey({ profileId: id }), getListHealthReportsQueryKey({ profileId: id }), getListCycleRecordsQueryKey({ profileId: id }), getGetLifestyleLogQueryKey({ profileId: id, date: today() }), getGetWellnessDashboardQueryKey({ profileId: id })) })} />;
    if (location === '/plans') return <PlansPage plan={planQuery.data} loading={planQuery.isLoading} working={selectPlan.isPending} select={(variables: any) => selectPlan.mutate(variables, { onSuccess: () => void invalidate(getGetWellnessPlanQueryKey()) })} />;
    if (location === '/settings') return <SettingsPage consent={consent} loading={consentQuery.isLoading} language={pageLanguage} working={updateConsent.isPending || deleteWellnessData.isPending} updateConsent={saveConsent} deleteData={() => deleteWellnessData.mutate(undefined, { onSuccess: () => { queryClient.clear(); void queryClient.invalidateQueries(); } })} onLanguageChange={changeLanguage} notificationPrefs={notificationPrefs} notificationMessage={notificationMessage} onEnableNotifications={enableNotifications} onDisableNotifications={disableNotifications} />;
    return <Dashboard profileId={profileId} profileName={profileName} summary={dashboardQuery.data} loading={dashboardQuery.isLoading} error={dashboardQuery.isError} onRetry={() => void dashboardQuery.refetch()} medicines={medicinesQuery.data ?? []} reports={reportsQuery.data ?? []} cycles={cyclesQuery.data ?? []} />;
  }, [location, profileId, profileName, profiles, profilesQuery.isLoading, profilesQuery.isError, profilesQuery.data, dashboardQuery.data, dashboardQuery.isLoading, dashboardQuery.isError, medicinesQuery.data, medicinesQuery.isLoading, medicinesQuery.isError, reportsQuery.data, reportsQuery.isLoading, reportsQuery.isError, cyclesQuery.data, cyclesQuery.isLoading, cyclesQuery.isError, lifestyleQuery.data, lifestyleQuery.isLoading, lifestyleQuery.isError, planQuery.data, planQuery.isLoading, consent, consentQuery.isLoading, pageLanguage, mutationsPending, createMedicine.isPending, updateMedicine.isPending, deleteMedicine.isPending, logMedicineTaken.isPending, createReport.isPending, createCycle.isPending, saveLifestyle.isPending, sendMessage.isPending, createProfile.isPending, updateProfile.isPending, deleteProfile.isPending, selectPlan.isPending, updateConsent.isPending, deleteWellnessData.isPending]);

  const nameFromProfile = profileName || 'there';
  return (
    <AppShell
      profileName={nameFromProfile}
      profiles={profiles}
      selectedProfile={profileId}
      onProfileChange={setSelectedId}
      language={pageLanguage}
      onLanguageChange={changeLanguage}
    >
      {profileId && !consent?.healthDataConsent && !consentQuery.isLoading && (
        <div className="mb-5 rounded-2xl border border-[#eadfbf] bg-[#fff8e8] p-4 text-sm leading-6 text-[#796b4d]" data-testid="notice-consent-needed">
          <strong>Set your wellness data choice.</strong> Visit settings to review consent before adding personal health notes.
          <Link href="/settings" className="app-link ml-2 font-bold underline" data-testid="link-consent-settings">Review settings</Link>
        </div>
      )}
      {content}
      <span className="sr-only" data-testid="status-service-health">{health.data?.status ?? (health.isLoading ? 'Checking service' : 'Service status unavailable')}</span>
      <div className="fixed bottom-5 right-5 z-10 hidden rounded-full border border-[#e0e9e1] bg-white/90 px-3 py-2 text-[10px] font-semibold text-[#708175] shadow-sm md:flex md:items-center md:gap-2" data-testid="status-private"><span className="h-1.5 w-1.5 rounded-full bg-[#79aa8b]" />Your wellness space is private</div>
    </AppShell>
  );
}
