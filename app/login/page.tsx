"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset`,
    });

    setLoading(false);
    if (error) { setError(error.message); return; }
    setResetSent(true);
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4" style={{ background: "#f7f4ef" }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #d4a843, #9a7520)" }}>
            <span className="text-white font-bold text-lg">L</span>
          </div>
          <h1 className="text-2xl font-light tracking-[0.2em]"
            style={{ fontFamily: "Cormorant Garamond, Georgia, serif", color: "#1a1a1a" }}>
            LUXVISION <span style={{ color: "#b8902a" }}>AI</span>
          </h1>
          <p className="text-xs tracking-widest uppercase mt-1" style={{ color: "#888880" }}>
            {showReset ? "Reset your password" : "Sign in to your account"}
          </p>
        </div>

        {showReset ? (
          resetSent ? (
            <div className="text-center">
              <div className="w-10 h-10 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{ background: "rgba(184,144,42,0.1)", border: "1px solid rgba(184,144,42,0.3)" }}>
                <span style={{ color: "#b8902a" }}>✓</span>
              </div>
              <p className="text-sm font-light mb-4" style={{ color: "#1a1a1a" }}>Check your email for the reset link.</p>
              <button onClick={() => { setShowReset(false); setResetSent(false); }}
                className="text-xs tracking-widest uppercase underline" style={{ color: "#b8902a" }}>
                Back to sign in
              </button>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: "#888880" }}>Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 rounded-xl text-sm font-light"
                  style={{ background: "#fff", border: "1px solid #e4ddd0", color: "#1a1a1a" }} />
              </div>
              {error && (
                <div className="px-4 py-3 rounded-lg text-sm"
                  style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)", color: "#dc2626" }}>
                  {error}
                </div>
              )}
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl text-sm tracking-widest uppercase font-medium transition-all disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #d4a843, #9a7520)", color: "#fff", boxShadow: "0 8px 24px rgba(184,144,42,0.25)" }}>
                {loading ? "Sending…" : "Send Reset Link"}
              </button>
              <button type="button" onClick={() => setShowReset(false)}
                className="w-full text-center text-xs tracking-widest uppercase" style={{ color: "#888880" }}>
                Back to sign in
              </button>
            </form>
          )
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: "#888880" }}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl text-sm font-light"
                style={{ background: "#fff", border: "1px solid #e4ddd0", color: "#1a1a1a" }} />
            </div>
            <div>
              <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: "#888880" }}>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl text-sm font-light"
                style={{ background: "#fff", border: "1px solid #e4ddd0", color: "#1a1a1a" }} />
            </div>
            {error && (
              <div className="px-4 py-3 rounded-lg text-sm"
                style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)", color: "#dc2626" }}>
                {error}
              </div>
            )}
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl text-sm tracking-widest uppercase font-medium transition-all disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #d4a843, #9a7520)", color: "#fff", boxShadow: "0 8px 24px rgba(184,144,42,0.25)" }}>
              {loading ? "Signing in…" : "Sign In"}
            </button>
            <p className="text-center text-xs" style={{ color: "#bbb8b0" }}>
              <button type="button" onClick={() => setShowReset(true)}
                className="underline" style={{ color: "#b8902a" }}>
                Forgot password?
              </button>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
