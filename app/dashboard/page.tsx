"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface Generation {
  id: string;
  address: string;
  style: string;
  image_url: string;
  created_at: string;
}

interface Profile {
  images_used: number;
  images_limit: number;
  trial_ends_at: string;
  plan: string;
}

const DownloadIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
  </svg>
);

export default function DashboardPage() {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setAuthToken(session.access_token);
    });
  }, []);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: gens }, { data: prof }] = await Promise.all([
        supabase
          .from("generations")
          .select("id, address, style, image_url, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("images_used, images_limit, trial_ends_at, plan")
          .eq("id", user.id)
          .single(),
      ]);

      if (gens) setGenerations(gens);
      if (prof) setProfile(prof);
      setLoading(false);
    }
    load();
  }, []);

  function handleDownload(imageUrl: string, address: string) {
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = `luxvision_${address.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.png`;
    a.target = "_blank";
    a.click();
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await fetch("/api/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
        body: JSON.stringify({ id }),
      });
      setGenerations((prev) => prev.filter((g) => g.id !== id));
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  }

  const trialDaysLeft = profile?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(profile.trial_ends_at).getTime() - Date.now()) / 86400000))
    : 0;

  const usagePercent = profile
    ? Math.min(100, Math.round((profile.images_used / profile.images_limit) * 100))
    : 0;

  return (
    <main className="min-h-screen" style={{ background: "#f7f4ef" }}>
      {/* Header */}
      <header className="border-b bg-white" style={{ borderColor: "#e4ddd0" }}>
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #d4a843, #9a7520)" }}>
              <span className="text-white font-semibold text-sm">L</span>
            </div>
            <div>
              <span className="font-light tracking-[0.15em] text-lg"
                style={{ fontFamily: "Cormorant Garamond, Georgia, serif", color: "#1a1a1a" }}>LUX</span>
              <span className="font-semibold tracking-[0.15em] text-lg"
                style={{ fontFamily: "Cormorant Garamond, Georgia, serif", color: "#b8902a" }}>VISION</span>
              <span className="ml-2 text-xs tracking-widest uppercase" style={{ color: "#bbb8b0" }}>AI</span>
            </div>
          </Link>
          <Link href="/" className="text-xs tracking-widest uppercase px-4 py-2 rounded-lg font-medium"
            style={{ color: "#b8902a", background: "rgba(184,144,42,0.08)", border: "1px solid rgba(184,144,42,0.2)" }}>
            ← Generate New
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Usage stats */}
        {profile && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
            <div className="rounded-2xl p-5 bg-white" style={{ border: "1px solid #e4ddd0" }}>
              <p className="text-[10px] tracking-widest uppercase mb-1" style={{ color: "#888880" }}>Images Generated</p>
              <p className="text-3xl font-light" style={{ color: "#1a1a1a" }}>
                {profile.images_used}
                <span className="text-sm ml-1" style={{ color: "#bbb8b0" }}>/ {profile.images_limit}</span>
              </p>
              {/* Progress bar */}
              <div className="mt-3 h-1.5 rounded-full" style={{ background: "#f0ece4" }}>
                <div className="h-1.5 rounded-full transition-all"
                  style={{ width: `${usagePercent}%`, background: usagePercent > 80 ? "#ef4444" : "linear-gradient(90deg, #d4a843, #9a7520)" }} />
              </div>
            </div>

            <div className="rounded-2xl p-5 bg-white" style={{ border: "1px solid #e4ddd0" }}>
              <p className="text-[10px] tracking-widest uppercase mb-1" style={{ color: "#888880" }}>Plan</p>
              <p className="text-xl font-light capitalize" style={{ color: "#1a1a1a" }}>{profile.plan}</p>
              {profile.plan === "trial" && (
                <p className="text-xs mt-1" style={{ color: trialDaysLeft <= 2 ? "#dc2626" : "#888880" }}>
                  {trialDaysLeft} day{trialDaysLeft !== 1 ? "s" : ""} remaining
                </p>
              )}
            </div>

            <div className="rounded-2xl p-5 bg-white" style={{ border: "1px solid #e4ddd0" }}>
              <p className="text-[10px] tracking-widest uppercase mb-1" style={{ color: "#888880" }}>Total Saved</p>
              <p className="text-3xl font-light" style={{ color: "#1a1a1a" }}>{generations.length}</p>
              <p className="text-xs mt-1" style={{ color: "#bbb8b0" }}>images in your history</p>
            </div>
          </div>
        )}

        {/* Generations grid */}
        <h2 className="text-xs tracking-widest uppercase mb-6" style={{ color: "#888880" }}>Your Generated Images</h2>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="aspect-square rounded-2xl shimmer" />
            ))}
          </div>
        ) : generations.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-sm font-light tracking-widest uppercase" style={{ color: "#bbb8b0" }}>
              No images yet — go generate your first one
            </p>
            <Link href="/" className="inline-block mt-4 px-6 py-2 rounded-xl text-xs tracking-widest uppercase"
              style={{ background: "linear-gradient(135deg, #d4a843, #9a7520)", color: "#fff" }}>
              Generate Image
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {generations.map((gen) => (
              <div key={gen.id} className="group relative rounded-2xl overflow-hidden bg-white"
                style={{ border: "1px solid #e4ddd0" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={gen.image_url} alt={gen.address}
                  className="w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  style={{ aspectRatio: "1/1" }} />

                {/* Hover overlay */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-3"
                  style={{ background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 55%)" }}>
                  <div className="flex justify-end">
                    {confirmDeleteId === gen.id ? (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleDelete(gen.id)}
                          disabled={deletingId === gen.id}
                          className="px-2 py-1 rounded-lg text-[10px] font-bold tracking-wide"
                          style={{ background: "#ef4444", color: "#fff" }}>
                          {deletingId === gen.id ? "..." : "Yes, delete"}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1 rounded-lg text-[10px]"
                          style={{ background: "rgba(255,255,255,0.2)", color: "#fff" }}>
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(gen.id)}
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ background: "rgba(239,68,68,0.8)", color: "#fff" }}>
                        <TrashIcon />
                      </button>
                    )}
                  </div>
                  <div>
                    <p className="text-white text-xs font-medium line-clamp-2 mb-1">{gen.address}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] px-2 py-0.5 rounded"
                        style={{ background: "rgba(212,168,67,0.25)", color: "#d4a843" }}>
                        {gen.style.replace("-", " ")}
                      </span>
                      <button onClick={() => handleDownload(gen.image_url, gen.address)}
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ background: "#d4a843", color: "#fff" }}>
                        <DownloadIcon />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
