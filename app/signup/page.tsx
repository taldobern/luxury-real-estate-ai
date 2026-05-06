"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Auto sign in after signup (if email confirmation is disabled)
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (!signInError) {
      router.push("/");
      router.refresh();
      return;
    }

    // Otherwise show confirmation message
    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4" style={{ background: "#f7f4ef" }}>
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ background: "rgba(184,144,42,0.1)", border: "1px solid rgba(184,144,42,0.3)" }}>
            <span style={{ color: "#b8902a" }}>✓</span>
          </div>
          <h2 className="text-xl font-light mb-2" style={{ color: "#1a1a1a" }}>Check your email</h2>
          <p className="text-sm font-light" style={{ color: "#888880" }}>
            We sent a confirmation link to <strong style={{ color: "#b8902a" }}>{email}</strong>.
            Click it to activate your account.
          </p>
          <Link href="/login" className="inline-block mt-6 text-xs tracking-widest uppercase underline" style={{ color: "#b8902a" }}>
            Back to login
          </Link>
        </div>
      </main>
    );
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
            Create your account
          </p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: "#888880" }}>Full Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
              placeholder="Jane Smith"
              className="w-full px-4 py-3 rounded-xl text-sm font-light"
              style={{ background: "#fff", border: "1px solid #e4ddd0", color: "#1a1a1a" }} />
          </div>

          <div>
            <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: "#888880" }}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              placeholder="you@example.com"
              className="w-full px-4 py-3 rounded-xl text-sm font-light"
              style={{ background: "#fff", border: "1px solid #e4ddd0", color: "#1a1a1a" }} />
          </div>

          <div>
            <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: "#888880" }}>Password</label>
            <div className="relative">
              <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required
                placeholder="Min. 8 characters" minLength={8}
                className="w-full px-4 py-3 pr-12 rounded-xl text-sm font-light"
                style={{ background: "#fff", border: "1px solid #e4ddd0", color: "#1a1a1a" }} />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                style={{ color: "#bbb8b0" }}>
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M1 1l22 22" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
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
            {loading ? "Creating account…" : "Create Account"}
          </button>
        </form>

        <p className="text-center text-xs mt-6" style={{ color: "#888880" }}>
          Already have an account?{" "}
          <Link href="/login" className="underline" style={{ color: "#b8902a" }}>Sign in</Link>
        </p>
      </div>
    </main>
  );
}
