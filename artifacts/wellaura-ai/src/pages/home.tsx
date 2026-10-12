import { Link } from 'wouter';
import { Activity, ArrowDown, ArrowRight, Heart, LockKeyhole, MessageCircle, Pill, Sparkles } from 'lucide-react';
import { Brand } from '@/components/brand';

const offerings = [
  { icon: Pill, title: 'Medicine reminders', text: 'Keep to the schedule your clinician prescribed, with gentle reminders and taken logs.', tone: 'lavender' },
  { icon: Activity, title: 'Everyday wellbeing', text: 'Notice your hydration, rest and movement patterns without pressure or judgment.', tone: 'mint' },
  { icon: Heart, title: 'Women’s health', text: 'A private place for cycle notes and thoughtful PCOS/PCOD education.', tone: 'rose' },
  { icon: MessageCircle, title: 'A calm guide', text: 'Explore trusted, plain-language health education in your preferred language.', tone: 'blue' },
];

export function HomePage() {
  return (
    <div className="min-h-[100dvh] overflow-hidden bg-[#faf8f3] text-[#342c48]">
      <header className="relative z-10 mx-auto flex max-w-[1260px] items-center justify-between px-5 py-5 sm:px-9">
        <Brand />
        <nav className="hidden items-center gap-8 text-sm font-semibold text-[#706a77] md:flex">
          <a className="app-link hover:text-[#654b82]" href="#care" data-testid="link-nav-care">What you can do</a>
          <a className="app-link hover:text-[#654b82]" href="#privacy" data-testid="link-nav-privacy">Privacy first</a>
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/sign-in" className="app-link rounded-full px-3 py-2 text-sm font-bold text-[#5d4b6b] hover:bg-[#f1ebf2]" data-testid="link-home-sign-in">Sign in</Link>
          <Link href="/sign-up" className="app-link btn btn-primary !px-4 !py-2.5 text-sm" data-testid="link-home-sign-up">Start here <ArrowRight size={15} /></Link>
        </div>
      </header>
      <main>
        <section className="relative mx-auto grid max-w-[1260px] items-center gap-8 px-5 pb-16 pt-10 sm:px-9 md:grid-cols-[1.08fr_.92fr] md:pb-24 md:pt-16">
          <div className="soft-enter relative z-[1]">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#e7dfeb] bg-white/75 px-4 py-2 text-xs font-bold text-[#715b82]">
              <Sparkles size={14} className="text-[#9a7ca0]" /> A little more supported, every day
            </div>
            <h1 className="serif max-w-[700px] text-[54px] leading-[.99] tracking-[-.04em] text-[#423452] sm:text-[74px] lg:text-[88px]" data-testid="text-home-headline">
              Your health,<br /><em className="font-normal text-[#795f91]">understood.</em>
              <br />Your wellbeing,<br />in your hands.
            </h1>
            <p className="mt-7 max-w-[520px] text-base leading-7 text-[#726d78] sm:text-lg">
              WellAura is a private companion for the everyday parts of caring for yourself — with gentle organization, clear education and room for the people you trust.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link href="/sign-up" className="app-link btn btn-primary !px-6 !py-3.5" data-testid="link-home-get-started">Create your private space <ArrowRight size={16} /></Link>
              <a className="app-link inline-flex items-center gap-2 px-2 py-3 text-sm font-bold text-[#756d79]" href="#care" data-testid="link-explore-features">Explore together <ArrowDown size={15} /></a>
            </div>
            <p className="mt-5 flex items-center gap-2 text-xs text-[#8c8490]"><LockKeyhole size={13} /> Private by design. Shared only with your permission.</p>
          </div>
          <div className="relative mx-auto w-full max-w-[530px] soft-enter [animation-delay:120ms]">
            <div className="absolute -right-7 top-2 h-64 w-64 rounded-full bg-[#e6f1e9] blur-3xl" />
            <div className="absolute -bottom-3 left-0 h-56 w-56 rounded-full bg-[#f7e7ed] blur-3xl" />
            <div className="relative overflow-hidden rounded-[42%_42%_28px_28px] border border-white/80 bg-[#eff6f0] p-5 shadow-[0_30px_90px_rgba(79,64,92,.12)] sm:p-8">
              <img src={`${import.meta.env.BASE_URL}wellaura-reference.jpeg`} alt="WellAura's gentle, pastel wellness companion visual" className="aspect-[.72] w-full rounded-[35%_35%_22px_22px] object-cover object-top" data-testid="img-wellaura-visual" />
              <div className="absolute bottom-9 left-1/2 w-[84%] -translate-x-1/2 rounded-2xl border border-white/80 bg-white/90 p-4 shadow-[0_14px_35px_rgba(58,45,71,.12)] backdrop-blur">
                <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#95899a]">A gentle check-in</p>
                <p className="serif mt-1 text-[23px] leading-tight text-[#514261]">Small steps count, too.</p>
                <p className="mt-1 text-xs text-[#7d7782]">Today, at your pace.</p>
              </div>
            </div>
            <div className="absolute -left-5 top-[22%] rounded-2xl border border-[#e8e5d9] bg-[#fffef9] px-4 py-3 shadow-lg shadow-[#4d42500d]">
              <span className="flex items-center gap-2 text-xs font-bold text-[#5b7665]"><span className="h-2 w-2 rounded-full bg-[#75b49c]" />Here for you</span>
            </div>
          </div>
        </section>

        <section className="border-y border-[#e9e8df] bg-[#f1f5ef] py-7">
          <div className="mx-auto grid max-w-[1100px] grid-cols-2 gap-5 px-5 text-center md:grid-cols-4">
            {[['01', 'Your own pace'], ['02', 'Your own language'], ['03', 'Your people, by consent'], ['04', 'Your data, your choice']].map(([number, label]) => (
              <div key={number} className="flex items-center justify-center gap-3">
                <span className="serif text-2xl text-[#aa8fae]">{number}</span><span className="text-xs font-bold text-[#696673] sm:text-sm">{label}</span>
              </div>
            ))}
          </div>
        </section>

        <section id="care" className="mx-auto max-w-[1260px] px-5 py-20 sm:px-9 sm:py-28">
          <div className="mb-12 max-w-[650px]">
            <p className="eyebrow">Care that fits real life</p>
            <h2 className="serif mt-3 text-5xl leading-[1.02] tracking-tight text-[#423452] sm:text-6xl">A softer place to<br />keep it all together.</h2>
            <p className="mt-5 max-w-[530px] text-[15px] leading-7 text-[#77717e]">Health can feel like a lot to hold. WellAura brings a few useful things into one calm, private space — without replacing the care you get from a professional.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {offerings.map(({ icon: Icon, title, text, tone }, index) => (
              <article key={title} className={`rounded-[24px] border border-[#e7e6df] p-6 transition-transform hover:-translate-y-1 ${tone === 'rose' ? 'bg-[#fcf0f3]' : tone === 'mint' ? 'bg-[#eef6ef]' : tone === 'blue' ? 'bg-[#edf4f4]' : 'bg-[#f1edf5]'}`} style={{ animationDelay: `${index * 70}ms` }} data-testid={`card-home-feature-${index}`}>
                <div className="mb-7 grid h-12 w-12 place-items-center rounded-2xl bg-white/85 text-[#755d8d] shadow-sm"><Icon size={21} strokeWidth={1.8} /></div>
                <h3 className="serif text-[25px] text-[#493a56]">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#77717d]">{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="privacy" className="mx-auto grid max-w-[1260px] items-center gap-12 px-5 pb-20 sm:px-9 sm:pb-28 md:grid-cols-[.9fr_1.1fr]">
          <div className="relative min-h-[350px] overflow-hidden rounded-[32px] bg-[#e9f1e9] p-8 sm:p-10">
            <div className="absolute -right-10 -top-14 h-60 w-60 rounded-full border-[1px] border-[#b9d1c0] opacity-60" />
            <div className="absolute -right-1 -top-5 h-48 w-48 rounded-full border-[1px] border-[#b9d1c0] opacity-70" />
            <div className="relative max-w-sm">
              <span className="eyebrow">Built around trust</span>
              <h2 className="serif mt-4 text-5xl leading-[1.04] text-[#3f5148]">Private means<br /><em>private.</em></h2>
              <p className="mt-5 text-sm leading-7 text-[#64746a]">Your information stays yours. A caregiver profile is only added after you confirm that person’s permission.</p>
              <div className="mt-7 flex items-center gap-3 rounded-2xl bg-white/75 p-4 text-sm font-semibold text-[#55685b]"><LockKeyhole size={18} /> You decide what to share.</div>
            </div>
          </div>
          <div>
            <p className="eyebrow">Support, never judgment</p>
            <h2 className="serif mt-3 text-5xl leading-[1.03] tracking-tight text-[#423452] sm:text-6xl">A helpful companion.<br /><em className="font-normal text-[#795f91]">Not your clinician.</em></h2>
            <div className="mt-8 space-y-5">
              {[
                ['Education, not diagnosis', 'WellAura helps explain common terms and build helpful routines. It cannot diagnose or replace professional advice.'],
                ['Prescriptions stay with your clinician', 'We help you remember the dose you were prescribed. Never start, stop or change a dose based on this app.'],
                ['Urgent concerns deserve urgent care', 'If you notice serious or rapidly worsening symptoms, contact a healthcare professional or emergency services.'],
              ].map(([title, text]) => (
                <div key={title} className="flex gap-4 border-b border-[#e9e7df] pb-5">
                  <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#91baa2]" />
                  <div><h3 className="font-bold text-[#51445f]">{title}</h3><p className="mt-1 text-sm leading-6 text-[#77717d]">{text}</p></div>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="bg-[#f5eaf0] px-5 py-16 text-center sm:py-20">
          <p className="eyebrow">Begin where you are</p>
          <h2 className="serif mx-auto mt-3 max-w-[740px] text-5xl leading-tight text-[#473750] sm:text-6xl">Your health matters.<br />So does how you feel along the way.</h2>
          <Link href="/sign-up" className="app-link btn btn-primary mt-7 !px-6 !py-3.5" data-testid="link-footer-sign-up">Make your private space <ArrowRight size={16} /></Link>
        </section>
      </main>
      <footer className="mx-auto flex max-w-[1260px] flex-col items-center justify-between gap-4 px-5 py-7 text-xs text-[#8a8490] sm:flex-row sm:px-9">
        <Brand compact />
        <span>WellAura AI · Caring, at your pace.</span>
        <span>English · తెలుగు · हिन्दी</span>
      </footer>
    </div>
  );
}
