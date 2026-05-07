"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const router = useRouter();

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    setLoading(false);
    if (error) { setError(error.message); return; }
    setDone(true);
    setTimeout(() => router.push("/"), 2000);
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4" style={{ background: "#f7f4ef" }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #d4a843, #9a7520)" }}>
            <span className="text-white font-bold text-lg">L</span>
          </div>
          <h1 className="text-2xl font-light tracking-[0.2em]"
            style={{ fontFamily: "Cormorant Garamond, Georgia, serif", color: "#1a1a1a" }}>
            LUXVISION <span style={{ color: "#b8902a" }}>AI</span>
          </h1>
          <p className="text-xs tracking-widest uppercase mt-1" style={{ color: "#888880" }}>Set new password</p>
        </div>

        {done ? (
          <div className="text-center">
            <p className="text-sm font-light" style={{ color: "#1a1a1a" }}>Password updated. Redirecting…</p>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: "#888880" }}>New Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                placeholder="Min. 8 characters" minLength={8}
                className="w-full px-4 py-3 rounded-xl text-sm font-light"
                style={{ background: "#fff", border: "1px solid #e4ddd0", color: "#1a1a1a" }} />
            </div>
            <div>
              <label className="block text-xs tracking-widest uppercase mb-2" style={{ color: "#888880" }}>Confirm Password</label>
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required
                placeholder="Repeat password"
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
              className="w-full py-3 rounded-xl text-sm tracking-widest uppercase font-medium disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #d4a843, #9a7520)", color: "#fff", boxShadow: "0 8px 24px rgba(184,144,42,0.25)" }}>
              {loading ? "Updating…" : "Set New Password"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
