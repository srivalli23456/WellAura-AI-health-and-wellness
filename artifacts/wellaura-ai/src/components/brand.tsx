import { Link } from 'wouter';

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/"
      className="app-link flex items-center gap-3"
      data-testid="link-wellaura-brand"
    >
      <img
        src={`${import.meta.env.BASE_URL}wellaura-logo.jpg`}
        alt="WellAura AI"
        className={compact ? 'h-10 w-14 rounded-lg object-cover' : 'h-12 w-[68px] rounded-xl object-cover'}
        data-testid="img-wellaura-logo"
      />
      {!compact && (
        <span className="leading-tight">
          <strong className="serif block text-[22px] tracking-tight text-[#45345d]">WellAura</strong>
          <small className="text-[10px] font-semibold tracking-[.18em] text-[#82768b]">YOUR WELLNESS, UNDERSTOOD</small>
        </span>
      )}
    </Link>
  );
}
