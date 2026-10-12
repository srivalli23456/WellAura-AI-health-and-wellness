import { useState, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { useClerk } from '@clerk/react';
import {
  Activity,
  BookHeart,
  ChevronDown,
  FileText,
  Heart,
  LayoutDashboard,
  LockKeyhole,
  Menu,
  MessageCircle,
  Pill,
  Settings,
  UsersRound,
  X,
} from 'lucide-react';
import { Brand } from './brand';
import { LocalizedCopy } from '@/lib/localize';

const nav = [
  { href: '/dashboard', label: 'Overview', te: 'అవలోకనం', hi: 'अवलोकन', icon: LayoutDashboard },
  { href: '/medicines', label: 'Medicines', te: 'మందులు', hi: 'दवाइयाँ', icon: Pill },
  { href: '/reports', label: 'Health reports', te: 'ఆరోగ్య నివేదికలు', hi: 'स्वास्थ्य रिपोर्ट', icon: FileText },
  { href: '/lifestyle', label: 'Lifestyle', te: 'జీవనశైలి', hi: 'जीवनशैली', icon: Activity },
  { href: '/women-health', label: 'Women’s health', te: 'మహిళల ఆరోగ్యం', hi: 'महिला स्वास्थ्य', icon: Heart },
  { href: '/assistant', label: 'Wellness guide', te: 'ఆరోగ్య మార్గదర్శి', hi: 'स्वास्थ्य मार्गदर्शक', icon: MessageCircle },
  { href: '/profiles', label: 'People & access', te: 'వ్యక్తులు & యాక్సెస్', hi: 'लोग और पहुँच', icon: UsersRound },
];

export function AppShell({
  children,
  profileName,
  selectedProfile,
  profiles,
  onProfileChange,
  language,
  onLanguageChange,
}: {
  children: ReactNode;
  profileName: string;
  selectedProfile: string;
  profiles: { id: string; displayName: string; relationship: string }[];
  onProfileChange: (id: string) => void;
  language: string;
  onLanguageChange: (language: string) => void;
}) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { signOut } = useClerk();
  const sidebar = (
    <>
      <div className="px-6 pb-6 pt-7">
        <Brand />
      </div>
      <div className="px-4 pb-5">
        <label className="eyebrow mb-2 block px-2" htmlFor="profile-switcher">{language === 'te' ? 'ఆరోగ్య ప్రొఫైల్' : language === 'hi' ? 'स्वास्थ्य प्रोफ़ाइल' : 'Wellness profile'}</label>
        <div className="relative">
          <select
            id="profile-switcher"
            value={selectedProfile}
            onChange={(event) => onProfileChange(event.target.value)}
            className="field appearance-none pr-9 text-sm font-semibold"
            data-testid="select-active-profile"
          >
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>{profile.displayName}</option>
            ))}
          </select>
          <ChevronDown size={15} className="pointer-events-none absolute right-3 top-3.5 text-[#887d90]" />
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3" aria-label="Main navigation">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = location === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`app-link flex items-center gap-3 rounded-[13px] px-3.5 py-3 text-[14px] font-semibold transition-colors ${active ? 'bg-white text-[#654b82] shadow-sm' : 'text-[#716c78] hover:bg-white/70'}`}
              data-testid={`nav-${item.href.slice(1)}`}
            >
              <Icon size={18} strokeWidth={active ? 2.1 : 1.7} />
              {language === 'te' ? item.te : language === 'hi' ? item.hi : item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mx-4 mb-4 rounded-2xl border border-[#e4e9e0] bg-white/75 p-4">
        <div className="mb-2 flex items-center gap-2 text-[#657968]">
          <LockKeyhole size={15} />
          <span className="text-xs font-bold">{language === 'te' ? 'మీ స్థలం, మీ ఎంపిక' : language === 'hi' ? 'आपकी जगह, आपकी पसंद' : 'Your space, your choice'}</span>
        </div>
        <p className="text-[11px] leading-relaxed text-[#7d7881]">{language === 'te' ? 'మీ ఆరోగ్య సమాచారం గోప్యంగా ఉంటుంది; మీ అనుమతి ఉన్నవారితో మాత్రమే పంచబడుతుంది.' : language === 'hi' ? 'आपकी स्वास्थ्य जानकारी निजी है और केवल आपकी अनुमति से साझा होती है।' : 'Your wellness information is private and only shared with people you authorize.'}</p>
      </div>
      <div className="border-t border-[#dce6dd] px-5 py-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-[#e9dfea] text-sm font-bold text-[#634b79]">{profileName.slice(0, 1).toUpperCase()}</div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-[#40364c]" data-testid="text-account-name">{profileName}</p>
            <p className="text-[11px] text-[#8a8390]">{language === 'te' ? 'గోప్యమైన ఖాతా' : language === 'hi' ? 'निजी खाता' : 'Private account'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/settings" className="app-link btn btn-quiet flex-1 !justify-start !px-2 !py-2 text-xs" data-testid="nav-settings"><Settings size={15} /> {language === 'te' ? 'సెట్టింగ్‌లు' : language === 'hi' ? 'सेटिंग्स' : 'Settings'}</Link>
          <button type="button" onClick={() => signOut({ redirectUrl: import.meta.env.BASE_URL || '/' })} className="btn btn-quiet !px-2 !py-2 text-xs" data-testid="button-sign-out">{language === 'te' ? 'సైన్ అవుట్' : language === 'hi' ? 'साइन आउट' : 'Sign out'}</button>
        </div>
      </div>
    </>
  );
  return (
    <div className="min-h-[100dvh] bg-[#faf8f3] text-[#342c48]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[262px] flex-col border-r border-[#dce6dd] bg-[#edf4ef] lg:flex">
        {sidebar}
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 bg-[#31283b]/35 lg:hidden" onClick={() => setMobileOpen(false)}>
          <aside className="flex h-full w-[min(86vw,300px)] flex-col bg-[#edf4ef] shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex justify-end px-3 pt-3">
              <button type="button" className="btn btn-quiet !p-2" onClick={() => setMobileOpen(false)} aria-label="Close navigation" data-testid="button-close-menu"><X size={18} /></button>
            </div>
            {sidebar}
          </aside>
        </div>
      )}
      <div className="lg:pl-[262px]">
        <header className="sticky top-0 z-20 flex h-[70px] items-center justify-between border-b border-[#e7e8df] bg-[#faf8f3]/90 px-4 backdrop-blur-xl sm:px-7">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button type="button" className="btn btn-quiet !p-2 lg:hidden" aria-label="Open navigation" onClick={() => setMobileOpen(true)} data-testid="button-open-menu"><Menu size={19} /></button>
            <span className="hidden text-sm text-[#77717e] sm:inline">{language === 'te' ? 'మీ ఆరోగ్యాన్ని సున్నితంగా చూసుకునే మార్గం' : language === 'hi' ? 'अपनी सेहत की देखभाल का सहज तरीका' : 'A gentler way to care for yourself'}</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor="language-switcher">Language</label>
            <select id="language-switcher" value={language} onChange={(event) => onLanguageChange(event.target.value)} className="field !w-auto !rounded-full !py-2 !pl-3 !pr-7 text-xs font-bold" data-testid="select-language">
              <option value="en">English</option>
              <option value="te">తెలుగు</option>
              <option value="hi">हिन्दी</option>
            </select>
            <Link href="/assistant" className="app-link btn btn-soft !px-3 !py-2 text-xs" data-testid="link-wellness-guide"><BookHeart size={15} /><span className="hidden sm:inline">{language === 'te' ? 'ఆరోగ్య మార్గదర్శిని అడగండి' : language === 'hi' ? 'स्वास्थ्य मार्गदर्शक से पूछें' : 'Ask your wellness guide'}</span><span className="sm:hidden">{language === 'te' ? 'మార్గదర్శి' : language === 'hi' ? 'मार्गदर्शक' : 'Guide'}</span></Link>
          </div>
        </header>
        <main className="mx-auto max-w-[1280px] px-4 pb-20 pt-7 sm:px-7 lg:px-10">
          <LocalizedCopy language={language}>{children}</LocalizedCopy>
          <footer className="mt-14 border-t border-[#e5e8df] py-6 text-center text-[11px] leading-relaxed text-[#8b8590]" data-testid="text-safety-footer">
            {language === 'te' ? 'WellAura AI విద్య మరియు సమాచార నిర్వహణ కోసం మాత్రమే; వ్యాధి నిర్ధారణకు కాదు. వైద్యుడి సలహా లేకుండా సూచించిన మోతాదును మార్చవద్దు.' : language === 'hi' ? 'WellAura AI शिक्षा और जानकारी व्यवस्थित करने के लिए है, निदान के लिए नहीं। चिकित्सक की सलाह के बिना दवा की खुराक न बदलें।' : 'WellAura AI is for education and organization, not diagnosis. Never change prescribed doses without your clinician.'}
            <br />{language === 'te' ? 'తక్షణ ప్రమాద సూచనలు ఉంటే వైద్య నిపుణుడిని లేదా అత్యవసర సేవలను సంప్రదించండి.' : language === 'hi' ? 'तत्काल चेतावनी संकेत हों तो चिकित्सा विशेषज्ञ या आपातकालीन सेवा से संपर्क करें।' : 'Urgent warning signs need professional or emergency care.'}
          </footer>
        </main>
      </div>
    </div>
  );
}
