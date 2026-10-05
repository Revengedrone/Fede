import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Eye, EyeOff, Lock, User, Shield, ShieldCheck, Headphones, Smartphone, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { seedDemoUsers } from "@/lib/seed.functions";
import cityImg from "@/assets/girl.png";

export const Route = createFileRoute("/")({
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "Sign in â€” ScotiaBank" },
      { name: "description", content: "Securely sign in to your ScotiaBank accounts." },
    ],
  }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
});

function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img src="/logo.png" alt="Logo" className="h-12 w-12 shrink-0 object-contain sm:h-14 sm:w-14" />
      <span className="text-xl font-extrabold tracking-tight text-[#6A2C91]">ScotiaBank</span>
    </div>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const runSeed = useServerFn(seedDemoUsers);
  const [seedMsg, setSeedMsg] = useState<string | null>(null);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  function validateEmail(value: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value.trim()) return "Email is required.";
    if (!emailRegex.test(value.trim())) return "Please enter a valid email address.";
    return undefined;
  }

  function validatePassword(value: string) {
    if (!value) return "Password is required.";
    if (value.length < 8) return "Password must be at least 8 characters long.";
    if (!/[A-Z]/.test(value)) return "Password must include at least one uppercase letter.";
    if (!/[a-z]/.test(value)) return "Password must include at least one lowercase letter.";
    if (!/[0-9]/.test(value)) return "Password must include at least one number.";
    if (!/[^A-Za-z0-9]/.test(value)) return "Password must include at least one special character.";
    return undefined;
  }

  function toggleMode() {
    setError(null);
    setInfo(null);
    setFieldErrors({});
    setPassword("");
    setMode(prev => prev === "signin" ? "signup" : "signin");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const emailError = validateEmail(email);
    const passwordError = mode === "signup" ? validatePassword(password) : password ? undefined : "Password is required.";
    setFieldErrors({ email: emailError, password: passwordError });
    if (emailError || passwordError) return;

    setLoading(true);
    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) return setError(error.message);
      navigate({ to: "/dashboard" });
      return;
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      setLoading(false);
      return setError(error.message);
    }
    if (data.session) {
      setLoading(false);
      navigate({ to: "/dashboard" });
      return;
    }
    // Email confirmation required â€” try signing in immediately in case auto-confirm is on.
    const signIn = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signIn.error) {
      setInfo("Account created. Check your email to confirm, then sign in.");
      setMode("signin");
      return;
    }
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Top nav */}
      <header className="border-b border-slate-100 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Logo />
          <nav className="hidden gap-8 text-sm font-medium text-slate-700 md:flex">
            <a href="#">Personal</a><a href="#">Business</a><a href="#">Support</a><a href="#">Contact</a>
          </nav>
          <div className="flex items-center gap-1 text-sm text-slate-600">
            <Globe className="h-4 w-4" /> English
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <img src={cityImg} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-6 py-16 md:grid-cols-2 md:py-24">
          {/* Card */}
          <form onSubmit={onSubmit} className="mx-auto w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
            <div className="flex flex-col items-center">
              <img src="/logo.png" alt="ScotiaBank" className="h-28 w-28 object-contain" />
              {mode === "signin" ? (
                <>
                  <h3 className="mt-3 text-2xl font-bold text-slate-900">Welcome to</h3>
                  <h2 className="text-3xl font-extrabold text-[#6A2C91]">ScotiaBank</h2>
                </>
              ) : (
                <>
                  <h3 className="mt-3 text-2xl font-bold text-slate-900">Create your account</h3>
                  <p className="text-sm text-slate-500">Sign up to get started with ScotiaBank</p>
                </>
              )}
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Email or Username</label>
                <div className={`mt-1 flex items-center rounded-lg border px-3 focus-within:border-[#6A2C91] ${fieldErrors.email ? "border-red-400 bg-red-50/50" : "border-slate-200"}`}>
                  <User className="h-4 w-4 text-slate-400" />
                  <input
                    type="text" inputMode="email" autoComplete="email" value={email}
                    onChange={(e) => { setEmail(e.target.value); setFieldErrors(prev => ({ ...prev, email: undefined })); }}
                    placeholder="Enter your email or username"
                    className="w-full bg-transparent px-2 py-2.5 text-sm outline-none placeholder:text-slate-400"
                  />
                </div>
                {fieldErrors.email && <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>}
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Password</label>
                <div className={`mt-1 flex items-center rounded-lg border px-3 focus-within:border-[#6A2C91] ${fieldErrors.password ? "border-red-400 bg-red-50/50" : "border-slate-200"}`}>
                  <Lock className="h-4 w-4 text-slate-400" />
                  <input
                    type={showPw ? "text" : "password"} autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password}
                    onChange={(e) => { setPassword(e.target.value); setFieldErrors(prev => ({ ...prev, password: undefined })); }}
                    placeholder={mode === "signin" ? "Enter your password" : "Create a password (min 8 chars, mixed case, number, symbol)"}
                    className="w-full bg-transparent px-2 py-2.5 text-sm outline-none placeholder:text-slate-400"
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)} className="text-slate-400 hover:text-slate-600">
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {fieldErrors.password && <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>}
                {mode === "signup" && password && !validatePassword(password) && (
                  <p className="mt-1 text-xs text-emerald-600">Password meets all requirements.</p>
                )}
                {mode === "signup" && password && (
                  <ul className="mt-1 space-y-0.5 text-xs text-slate-500">
                    <li className={password.length >= 8 ? "text-emerald-600" : ""}>â€¢ At least 8 characters</li>
                    <li className={/[A-Z]/.test(password) ? "text-emerald-600" : ""}>â€¢ One uppercase letter</li>
                    <li className={/[a-z]/.test(password) ? "text-emerald-600" : ""}>â€¢ One lowercase letter</li>
                    <li className={/[0-9]/.test(password) ? "text-emerald-600" : ""}>â€¢ One number</li>
                    <li className={/[^A-Za-z0-9]/.test(password) ? "text-emerald-600" : ""}>â€¢ One special character</li>
                  </ul>
                )}
              </div>

              {mode === "signin" && (
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 text-slate-600">
                    <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
                    Remember Me
                  </label>
                  <a href="#" className="font-medium text-[#6A2C91] hover:underline">Forgot Password?</a>
                </div>
              )}

              {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
              {info && <p className="rounded bg-[#6A2C91]/10 px-3 py-2 text-sm text-[#6A2C91]">{info}</p>}

              <button type="submit" disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#6A2C91] py-3 text-sm font-semibold text-white shadow-lg shadow-[#6A2C91]/30 transition hover:bg-[#4A1F66] disabled:opacity-60">
                <Lock className="h-4 w-4" />
                {loading ? (mode === "signin" ? "Signing inâ€¦" : "Creating accountâ€¦") : (mode === "signin" ? "Sign In" : "Create Account")}
              </button>

              <div className="flex items-center gap-3 text-xs text-slate-400">
                <div className="h-px flex-1 bg-slate-200" />or<div className="h-px flex-1 bg-slate-200" />
              </div>

              <button
                type="button"
                onClick={toggleMode}
                className="w-full rounded-lg border border-[#6A2C91] py-3 text-sm font-semibold text-[#6A2C91] hover:bg-[#6A2C91]/5"
              >
                {mode === "signin" ? "Create Account" : "Back to Sign In"}
              </button>


              <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
                Demo: <code className="font-mono">Christucker@gmail.com</code> / <code className="font-mono">@12340</code>
                <button type="button"
                  onClick={async () => {
                    setSeedMsg("Seedingâ€¦");
                    try { const res = await runSeed(); setSeedMsg(res.results.map(r => `${r.email}: ${r.status}`).join(" Â· ")); }
                    catch (e) { setSeedMsg((e as Error).message); }
                  }}
                  className="mt-2 w-full rounded border border-slate-300 bg-white px-2 py-1 text-slate-600 hover:bg-slate-100">
                  Seed demo users
                </button>
                {seedMsg && <p className="mt-1">{seedMsg}</p>}
              </div>
            </div>
          </form>

          <div className="flex flex-col justify-center text-white">
            <h1 className="text-3xl font-light md:text-4xl">Welcome back to</h1>
            <h2 className="mt-1 text-4xl font-bold md:text-5xl">ScotiaBank</h2>
            <div className="mt-3 h-1 w-16 rounded bg-[#F58220]" />
            <p className="mt-6 max-w-md text-white/90">
              Securely access your accounts, transfer funds, pay bills, and manage your finances all in one place.
            </p>
            <div className="mt-10 hidden md:block">
              <Shield className="h-24 w-24 text-[#6A2C91]/70" strokeWidth={1.2} />
            </div>
          </div>
        </div>
      </section>

      {/* Feature strip */}
      <section className="border-t border-slate-100 bg-slate-50">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-6 py-8 md:grid-cols-4">
          {[
            { icon: ShieldCheck, title: "Bank with Confidence", desc: "Your security is our highest priority." },
            { icon: Lock, title: "Secure & Encrypted", desc: "256-bit SSL encryption keeps your data safe." },
            { icon: Headphones, title: "24/7 Support", desc: "Our support team is always here to help you." },
            { icon: Smartphone, title: "Bank Anywhere", desc: "Access your accounts anytime, anywhere on any device." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-3">
              <div className="rounded-full border border-[#6A2C91]/20 bg-white p-2 text-[#6A2C91]"><Icon className="h-5 w-5" /></div>
              <div>
                <div className="text-sm font-semibold text-slate-900">{title}</div>
                <div className="text-xs text-slate-500">{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-100 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-4 gap-y-2 px-6 py-4 text-xs text-slate-500">
          <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> SSL Secured</span>
          <span>|</span><span>Â© 2026 ScotiaBank. All rights reserved.</span>
          <span>|</span><a href="#" className="text-[#6A2C91]">Privacy Policy</a>
          <a href="#" className="text-[#6A2C91]">Terms of Use</a>
          <a href="#" className="text-[#6A2C91]">Security Center</a>
        </div>
      </footer>
    </div>
  );
}

