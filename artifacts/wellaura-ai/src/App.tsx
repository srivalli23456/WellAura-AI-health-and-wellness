import { useEffect, useRef, type ReactNode } from 'react';
import { ClerkProvider, RedirectToSignIn, Show, SignIn, SignUp, useClerk, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { HomePage } from '@/pages/home';
import { WellnessApp } from '@/pages/wellness-app';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || '/'
    : path;
}

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: '#745b91',
    colorForeground: '#423750',
    colorMutedForeground: '#827987',
    colorDanger: '#b75d58',
    colorBackground: '#fffefa',
    colorInput: '#fffefa',
    colorInputForeground: '#423750',
    colorNeutral: '#dce5de',
    fontFamily: 'DM Sans, sans-serif',
    borderRadius: '1rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-[#fffefa] rounded-[28px] w-[440px] max-w-full overflow-hidden border border-[#e4e9e2] shadow-[0_22px_70px_rgba(62,49,72,.11)]',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-[#443650] font-semibold',
    headerSubtitle: 'text-[#7c7580]',
    socialButtonsBlockButtonText: 'text-[#51465b] font-semibold',
    formFieldLabel: 'text-[#62586a] font-semibold',
    footerActionLink: 'text-[#745b91] font-semibold',
    footerActionText: 'text-[#817987]',
    dividerText: 'text-[#8b8490]',
    identityPreviewEditButton: 'text-[#745b91]',
    formFieldSuccessText: 'text-[#4f8062]',
    alertText: 'text-[#76514e]',
    logoBox: 'rounded-xl overflow-hidden',
    logoImage: 'rounded-lg',
    socialButtonsBlockButton: 'rounded-xl border-[#e5e6e0] bg-white hover:bg-[#f8f6f2]',
    formButtonPrimary: 'rounded-full bg-[#745b91] text-white hover:bg-[#624a7a]',
    formFieldInput: 'rounded-xl border-[#dce5de] bg-white text-[#423750]',
    footerAction: 'text-[#817987]',
    dividerLine: 'bg-[#e8e5e9]',
    alert: 'rounded-xl border-[#f0d9d5] bg-[#fff4f1]',
    otpCodeFieldInput: 'rounded-xl border-[#dce5de]',
    formFieldRow: 'gap-2',
    main: 'text-[#423750]',
  },
};

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <SignedInRedirect />
      </Show>
      <Show when="signed-out">
        <HomePage />
      </Show>
    </>
  );
}

function SignedInRedirect() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation('/dashboard', { replace: true });
  }, [setLocation]);
  return <div className="min-h-[100dvh] bg-[#faf8f3]" data-testid="status-auth-redirect" />;
}

function SignedInApp() {
  const { user } = useUser();
  return (
    <>
      <Show when="signed-in">
        <WellnessApp userName={user?.firstName || 'Friend'} />
      </Show>
      <Show when="signed-out">
        <RedirectToSignIn />
      </Show>
    </>
  );
}

function SignInPage() {
  return (
    <AuthFrame>
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </AuthFrame>
  );
}

function SignUpPage() {
  return (
    <AuthFrame>
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </AuthFrame>
  );
}

function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <div className="app-grain flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-[#f8f6f1] px-4 py-7">
      <div className="absolute -left-28 top-10 h-72 w-72 rounded-full bg-[#e7f0e8] blur-3xl" />
      <div className="absolute -right-20 bottom-5 h-72 w-72 rounded-full bg-[#f6e7ed] blur-3xl" />
      <div className="relative z-[1] mb-5 text-center">
        <a href={`${basePath || ''}/`} className="app-link" data-testid="link-auth-brand">
          <img src={`${basePath}/wellaura-logo.jpg`} alt="WellAura AI" className="mx-auto h-[96px] w-[130px] rounded-2xl object-cover shadow-sm" data-testid="img-auth-logo" />
        </a>
        <p className="serif mt-2 text-[27px] text-[#4a3a59]">A kinder space for your wellbeing.</p>
        <p className="mt-1 text-xs text-[#827b86]">Private, thoughtful support — at your pace.</p>
      </div>
      <div className="relative z-[1] w-full max-w-[440px]">{children}</div>
      <p className="relative z-[1] mt-5 text-center text-[11px] text-[#89828d]">WellAura AI is not a substitute for professional medical care.</p>
    </div>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const currentClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        currentClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, currentClient]);
  return null;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function RouterRoutes() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={HomeRedirect} />
        <Route path="/sign-in/*?" component={SignInPage} />
        <Route path="/sign-up/*?" component={SignUpPage} />
        <Route path="/dashboard" component={SignedInApp} />
        <Route path="/medicines" component={SignedInApp} />
        <Route path="/reports" component={SignedInApp} />
        <Route path="/lifestyle" component={SignedInApp} />
        <Route path="/women-health" component={SignedInApp} />
        <Route path="/assistant" component={SignedInApp} />
        <Route path="/profiles" component={SignedInApp} />
        <Route path="/plans" component={SignedInApp} />
        <Route path="/settings" component={SignedInApp} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: { start: { title: 'Welcome back', subtitle: 'Your wellbeing space is right here.' } },
        signUp: { start: { title: 'A caring start', subtitle: 'Create your private WellAura account.' } },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ClerkQueryClientCacheInvalidator />
          <RouterRoutes />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
