"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
            Sign in to your account
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: "#888880" }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full px-4 py-3 rounded-xl text-sm font-light"
              style={{ background: "#fff", border: "1px solid #e4ddd0", color: "#1a1a1a" }}
            />
          </div>

          <div>
            <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: "#888880" }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl text-sm font-light"
              style={{ background: "#fff", border: "1px solid #e4ddd0", color: "#1a1a1a" }}
            />
          </div>

          {error && (
            <div className="px-4 py-3 rounded-lg text-sm"
              style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)", color: "#dc2626" }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-sm tracking-widest uppercase font-medium transition-all disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #d4a843, #9a7520)", color: "#fff", boxShadow: "0 8px 24px rgba(184,144,42,0.25)" }}
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p className="text-center text-xs mt-6" style={{ color: "#888880" }}>
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="underline" style={{ color: "#b8902a" }}>
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
