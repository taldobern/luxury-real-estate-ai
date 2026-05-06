"use client";

import { useState, useRef, useEffect } from "react";
import { STYLE_CONFIGS, StyleKey } from "@/lib/prompts";
import type { GenerateResponse } from "@/app/api/generate/route";
import type { StreetViewAngle, StreetViewResponse } from "@/app/api/streetview/route";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";

const HISTORY_LIMIT = 3;

interface HistoryItem {
  id: string;
  imageBase64: string;
  originalBase64: string;
  address: string;
  style: string;
  timestamp: Date;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const SparkleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
  </svg>
);

const DownloadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
  </svg>
);

const RefreshIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
  </svg>
);

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
  </svg>
);

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton({ label }: { label: string }) {
  return (
    <div className="w-full aspect-square rounded-2xl overflow-hidden relative">
      <div className="shimmer w-full h-full" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-2 border-transparent"
            style={{ borderTopColor: "#d4a843", borderRightColor: "#d4a84340", animation: "spin 1s linear infinite" }} />
          <div className="absolute inset-2 rounded-full border border-yellow-900/40" />
        </div>
        <div className="text-center">
          <p className="font-light tracking-widest text-xs uppercase" style={{ color: "#d4a843" }}>
            {label}
          </p>
          <p className="text-gray-600 text-xs mt-1 tracking-wider">Please wait…</p>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Angle picker ─────────────────────────────────────────────────────────────

function AnglePicker({
  angles,
  selected,
  onSelect,
}: {
  angles: StreetViewAngle[];
  selected: number;
  onSelect: (heading: number) => void;
}) {
  return (
    <div className="rounded-2xl p-5" style={{ background: "#111", border: "1px solid #1e1e1e" }}>
      <p className="text-xs tracking-widest uppercase mb-1" style={{ color: "#555" }}>
        Select Property View
      </p>
      <p className="text-xs mb-4" style={{ color: "#3a3a3a" }}>
        Pick the angle that shows the front of the house
      </p>
      <div className="grid grid-cols-2 gap-2">
        {angles.map((angle) => {
          const isSelected = angle.heading === selected;
          return (
            <button
              key={angle.heading}
              onClick={() => onSelect(angle.heading)}
              className="relative rounded-xl overflow-hidden transition-all duration-200"
              style={{
                border: isSelected ? "2px solid #d4a843" : "2px solid #1e1e1e",
                boxShadow: isSelected ? "0 0 16px rgba(212,168,67,0.3)" : "none",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={angle.imageBase64} alt={angle.label} className="w-full object-cover" style={{ aspectRatio: "1/1" }} />
              <div
                className="absolute bottom-0 inset-x-0 py-1.5 text-center text-[10px] tracking-widest uppercase"
                style={{
                  background: isSelected ? "rgba(212,168,67,0.85)" : "rgba(0,0,0,0.6)",
                  color: isSelected ? "#000" : "#888",
                  backdropFilter: "blur(4px)",
                }}
              >
                {angle.label}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Before / After ───────────────────────────────────────────────────────────

function BeforeAfter({ original, transformed }: { original: string; transformed: string }) {
  const [hover, setHover] = useState<"before" | "after" | null>(null);
  return (
    <div className="grid grid-cols-2 gap-3">
      <div
        className="relative rounded-xl overflow-hidden"
        style={{ border: `1px solid ${hover === "before" ? "#555" : "#1e1e1e"}`, transition: "border-color 0.2s" }}
        onMouseEnter={() => setHover("before")}
        onMouseLeave={() => setHover(null)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={original} alt="Street View original" className="w-full object-cover" style={{ aspectRatio: "1/1" }} />
        <div className="absolute bottom-0 inset-x-0 py-2 text-center text-xs tracking-widest uppercase"
          style={{ background: "rgba(0,0,0,0.6)", color: "#888", backdropFilter: "blur(4px)" }}>
          Before
        </div>
      </div>
      <div
        className="relative rounded-xl overflow-hidden"
        style={{ border: `1px solid ${hover === "after" ? "#d4a843" : "#2a2a1a"}`, transition: "border-color 0.2s", boxShadow: hover === "after" ? "0 0 16px rgba(212,168,67,0.2)" : "none" }}
        onMouseEnter={() => setHover("after")}
        onMouseLeave={() => setHover(null)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={transformed} alt="AI luxury result" className="w-full object-cover" style={{ aspectRatio: "1/1" }} />
        <div className="absolute bottom-0 inset-x-0 py-2 text-center text-xs tracking-widest uppercase"
          style={{ background: "rgba(0,0,0,0.6)", color: "#d4a843", backdropFilter: "blur(4px)" }}>
          After
        </div>
      </div>
    </div>
  );
}

// ─── History thumbnail ────────────────────────────────────────────────────────

function HistoryCard({ item, onSelect, isActive }: { item: HistoryItem; onSelect: () => void; isActive: boolean }) {
  return (
    <button onClick={onSelect} className="relative group flex-shrink-0 w-24 aspect-square rounded-lg overflow-hidden transition-all duration-200"
      style={{ border: isActive ? "2px solid #d4a843" : "2px solid #1e1e1e", boxShadow: isActive ? "0 0 12px rgba(212,168,67,0.3)" : "none" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={item.imageBase64} alt={item.address} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1">
        <span className="text-white text-[9px] leading-tight line-clamp-2 font-medium">
          {STYLE_CONFIGS[item.style as StyleKey]?.label ?? item.style}
        </span>
      </div>
    </button>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type Step = "input" | "picking-angle" | "generating" | "result";

export default function Home() {
  const [address, setAddress] = useState("");
  const [style, setStyle] = useState<StyleKey>("bright-clean");
  const [step, setStep] = useState<Step>("input");
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserEmail(user.email ?? null);
    });
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  // Angle picker state
  const [angles, setAngles] = useState<StreetViewAngle[]>([]);
  const [selectedHeading, setSelectedHeading] = useState(0);

  // Result state
  const [currentImage, setCurrentImage] = useState<HistoryItem | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showPrompt, setShowPrompt] = useState(false);
  const [lastPrompt, setLastPrompt] = useState("");

  const resultRef = useRef<HTMLDivElement>(null);

  // Step 1 — fetch all 4 Street View angles
  async function handleFetchAngles() {
    if (!address.trim()) { setError("Please enter a property address."); return; }
    setError(null);
    setStep("picking-angle");

    try {
      const res = await fetch("/api/streetview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: address.trim() }),
      });
      const data: StreetViewResponse & { error?: string } = await res.json();
      if (!res.ok || data.error) { setError(data.error ?? "Could not load Street View."); setStep("input"); return; }
      setAngles(data.angles);
      setSelectedHeading(0);
    } catch {
      setError("Network error. Please check your connection.");
      setStep("input");
    }
  }

  // Step 2 — generate with chosen angle
  async function handleGenerate(heading: number) {
    setError(null);
    setStep("generating");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: address.trim(), style, heading }),
      });
      const data: GenerateResponse & { error?: string } = await res.json();
      if (!res.ok || data.error) { setError(data.error ?? "Generation failed."); setStep("picking-angle"); return; }

      const newItem: HistoryItem = {
        id: Date.now().toString(),
        imageBase64: data.imageBase64,
        originalBase64: data.originalBase64,
        address: address.trim(),
        style,
        timestamp: new Date(),
      };

      setCurrentImage(newItem);
      setLastPrompt(data.prompt);
      setHistory((prev) => [newItem, ...prev].slice(0, HISTORY_LIMIT));
      setStep("result");
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch {
      setError("Network error. Please try again.");
      setStep("picking-angle");
    }
  }

  function handleDownload() {
    if (!currentImage) return;
    const a = document.createElement("a");
    a.href = currentImage.imageBase64;
    const safe = currentImage.address.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    a.download = `luxvision_${safe}_${currentImage.style}.png`;
    a.click();
  }

  function handleReset() {
    setStep("input");
    setAngles([]);
    setError(null);
  }

  const styleKeys = Object.keys(STYLE_CONFIGS) as StyleKey[];
  const isLoading = step === "picking-angle" && angles.length === 0;

  return (
    <main className="min-h-screen" style={{ background: "#0a0a0a" }}>
      {/* ── Header ── */}
      <header className="border-b" style={{ borderColor: "#1a1a1a" }}>
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #d4a843, #9a7520)" }}>
              <span className="text-black font-semibold text-sm">L</span>
            </div>
            <div>
              <span className="font-light tracking-[0.15em] text-lg" style={{ fontFamily: "Cormorant Garamond, Georgia, serif", color: "#e8e8e8" }}>LUX</span>
              <span className="font-semibold tracking-[0.15em] text-lg" style={{ fontFamily: "Cormorant Garamond, Georgia, serif", color: "#d4a843" }}>VISION</span>
              <span className="ml-2 text-xs tracking-widest uppercase" style={{ color: "#4a4a4a" }}>AI</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-xs tracking-widest uppercase px-3 py-1.5 rounded-lg transition-colors"
              style={{ color: "#888", border: "1px solid #1e1e1e" }}>
              History
            </Link>
            {userEmail && (
              <button onClick={handleSignOut} className="text-xs tracking-widest uppercase px-3 py-1.5 rounded-lg transition-colors"
                style={{ color: "#555", border: "1px solid #1e1e1e" }}>
                Sign Out
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* ── Hero ── */}
        <div className="text-center mb-14">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-light leading-tight mb-4"
            style={{ fontFamily: "Cormorant Garamond, Georgia, serif", color: "#e8e8e8" }}>
            Transform Any Address Into{" "}
            <span style={{ background: "linear-gradient(135deg, #f0d080 0%, #d4a843 50%, #b8902a 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              Magazine Art
            </span>
          </h1>
          <p className="text-base font-light tracking-wide max-w-lg mx-auto" style={{ color: "#555" }}>
            We pull the real Street View photo and transform it into a luxury listing image using AI.
          </p>
        </div>

        {/* ── Input card ── */}
        <div className="rounded-2xl p-8 mb-8 relative overflow-hidden"
          style={{ background: "#111111", border: "1px solid #1e1e1e", boxShadow: "0 24px 60px rgba(0,0,0,0.5)" }}>
          <div className="absolute top-0 left-0 w-64 h-32 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at top left, rgba(212,168,67,0.06) 0%, transparent 70%)" }} />

          <div className="grid md:grid-cols-2 gap-6 relative z-10">
            <div className="md:col-span-2">
              <label className="block text-xs tracking-widest uppercase mb-3" style={{ color: "#555" }}>Property Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => { setAddress(e.target.value); if (step !== "input") handleReset(); }}
                onKeyDown={(e) => e.key === "Enter" && step === "input" && handleFetchAngles()}
                placeholder="e.g. 1600 Mulholland Drive, Los Angeles, CA"
                className="w-full px-5 py-4 rounded-xl text-sm font-light transition-all duration-200 placeholder:text-gray-700"
                style={{ background: "#0d0d0d", border: "1px solid #2a2a2a", color: "#e8e8e8", boxShadow: address ? "0 0 0 1px rgba(212,168,67,0.3)" : "none", borderColor: address ? "#3a3020" : "#2a2a2a" }}
              />
            </div>

            <div>
              <label className="block text-xs tracking-widest uppercase mb-3" style={{ color: "#555" }}>Visual Style</label>
              <div className="relative">
                <select value={style} onChange={(e) => setStyle(e.target.value as StyleKey)}
                  className="w-full appearance-none px-5 py-4 rounded-xl text-sm font-light cursor-pointer"
                  style={{ background: "#0d0d0d", border: "1px solid #2a2a2a", color: "#e8e8e8" }}>
                  {styleKeys.map((key) => (
                    <option key={key} value={key} style={{ background: "#111" }}>{STYLE_CONFIGS[key].label}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 4l4 4 4-4" stroke="#d4a843" strokeWidth="1.5" strokeLinecap="round" /></svg>
                </div>
              </div>
            </div>

            <div className="flex items-end">
              <button
                onClick={handleFetchAngles}
                disabled={step === "generating" || isLoading}
                className="w-full py-4 rounded-xl font-light text-sm tracking-widest uppercase flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: (step === "generating" || isLoading) ? "#1a1a1a" : "linear-gradient(135deg, #d4a843 0%, #9a7520 100%)", color: (step === "generating" || isLoading) ? "#555" : "#000", boxShadow: (step === "generating" || isLoading) ? "none" : "0 8px 24px rgba(212,168,67,0.25)" }}
              >
                {isLoading ? (
                  <><div className="w-4 h-4 rounded-full border-2 border-transparent" style={{ borderTopColor: "#d4a843", animation: "spin 0.8s linear infinite" }} />Loading Views…</>
                ) : (
                  <><SearchIcon />Find Property</>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-5 px-4 py-3 rounded-lg text-sm"
              style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", color: "#f87171" }}>
              {error}
            </div>
          )}
        </div>

        {/* ── Angle picker ── */}
        {step === "picking-angle" && angles.length > 0 && (
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="md:col-span-2">
              <AnglePicker angles={angles} selected={selectedHeading} onSelect={setSelectedHeading} />
            </div>
            <div className="flex flex-col gap-4">
              <div className="rounded-2xl p-5" style={{ background: "#111", border: "1px solid #1e1e1e" }}>
                <p className="text-xs tracking-widest uppercase mb-3" style={{ color: "#555" }}>Ready to Generate</p>
                <p className="text-sm font-light mb-4" style={{ color: "#666" }}>
                  Pick the view that shows the front of the property, then generate.
                </p>
                <button
                  onClick={() => handleGenerate(selectedHeading)}
                  className="w-full py-3 rounded-xl font-light text-sm tracking-widest uppercase flex items-center justify-center gap-2"
                  style={{ background: "linear-gradient(135deg, #d4a843 0%, #9a7520 100%)", color: "#000", boxShadow: "0 8px 24px rgba(212,168,67,0.25)" }}
                >
                  <SparkleIcon />Generate Image
                </button>
                <button onClick={handleReset} className="mt-2 w-full py-2.5 rounded-xl text-xs tracking-widest uppercase text-center"
                  style={{ background: "#1a1a1a", color: "#555", border: "1px solid #2a2a2a" }}>
                  Change Address
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Generating ── */}
        {step === "generating" && (
          <div className="rounded-2xl overflow-hidden mb-8" style={{ border: "1px solid #1e1e1e", background: "#111" }}>
            <div className="p-4">
              <LoadingSkeleton label="Transforming with AI" />
            </div>
          </div>
        )}

        {/* ── Result ── */}
        <div ref={resultRef}>
          {step === "result" && currentImage && (
            <div className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-2 rounded-2xl overflow-hidden" style={{ border: "1px solid #1e1e1e", background: "#111" }}>
                <div className="p-4">
                  <BeforeAfter original={currentImage.originalBase64} transformed={currentImage.imageBase64} />
                  <div className="mt-4 flex gap-2">
                    <button onClick={handleDownload}
                      className="flex-1 py-2.5 rounded-xl text-xs tracking-widest uppercase flex items-center justify-center gap-2 font-medium"
                      style={{ background: "linear-gradient(135deg, #d4a843, #9a7520)", color: "#000" }}>
                      <DownloadIcon />Download AI Image
                    </button>
                    <button onClick={() => setStep("picking-angle")}
                      className="px-4 py-2.5 rounded-xl text-xs tracking-widest uppercase flex items-center justify-center gap-2 font-light"
                      style={{ background: "#1a1a1a", color: "#888", border: "1px solid #2a2a2a" }}>
                      <RefreshIcon />Redo
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="rounded-2xl p-5" style={{ background: "#111", border: "1px solid #1e1e1e" }}>
                  <h3 className="text-xs tracking-widest uppercase mb-4" style={{ color: "#555" }}>Image Details</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] tracking-widest uppercase mb-1" style={{ color: "#3a3a3a" }}>Address</p>
                      <p className="text-sm font-light" style={{ color: "#e0e0e0" }}>{currentImage.address}</p>
                    </div>
                    <div>
                      <p className="text-[10px] tracking-widest uppercase mb-1" style={{ color: "#3a3a3a" }}>Style</p>
                      <span className="inline-block px-2 py-1 rounded text-xs" style={{ background: "rgba(212,168,67,0.12)", color: "#d4a843" }}>
                        {STYLE_CONFIGS[currentImage.style as StyleKey]?.label}
                      </span>
                    </div>
                    <div>
                      <p className="text-[10px] tracking-widest uppercase mb-1" style={{ color: "#3a3a3a" }}>Source</p>
                      <p className="text-xs font-light" style={{ color: "#555" }}>Google Street View → OpenAI gpt-image-1</p>
                    </div>
                  </div>

                  <button onClick={() => setStep("picking-angle")}
                    className="mt-5 w-full py-2.5 rounded-xl text-xs tracking-widest uppercase flex items-center justify-center gap-2"
                    style={{ background: "#1a1a1a", color: "#666", border: "1px solid #2a2a2a" }}>
                    <RefreshIcon />Try Different Angle
                  </button>

                  <button onClick={() => setShowPrompt((p) => !p)}
                    className="mt-2 w-full text-[10px] tracking-widest uppercase text-center py-2 rounded transition-colors"
                    style={{ color: "#3a3a3a", border: "1px dashed #1e1e1e" }}>
                    {showPrompt ? "Hide Prompt" : "View Prompt"}
                  </button>

                  {showPrompt && (
                    <div className="mt-3 p-3 rounded-lg text-[11px] leading-relaxed font-light"
                      style={{ background: "#0d0d0d", color: "#555", border: "1px solid #1a1a1a" }}>
                      {lastPrompt}
                    </div>
                  )}
                </div>

                {history.length > 1 && (
                  <div className="rounded-2xl p-4" style={{ background: "#111", border: "1px solid #1e1e1e" }}>
                    <h3 className="text-[10px] tracking-widest uppercase mb-3" style={{ color: "#3a3a3a" }}>Recent</h3>
                    <div className="flex gap-2 flex-wrap">
                      {history.map((item) => (
                        <HistoryCard key={item.id} item={item} isActive={currentImage?.id === item.id} onSelect={() => setCurrentImage(item)} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === "input" && !currentImage && (
            <div className="text-center py-24">
              <div className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center"
                style={{ background: "rgba(212,168,67,0.06)", border: "1px solid rgba(212,168,67,0.12)" }}>
                <SparkleIcon />
              </div>
              <p className="text-sm font-light tracking-widest uppercase" style={{ color: "#2a2a2a" }}>
                Enter an address above to get started
              </p>
            </div>
          )}
        </div>
      </div>

      <footer className="mt-20 border-t py-8 text-center" style={{ borderColor: "#141414" }}>
        <p className="text-xs tracking-widest uppercase" style={{ color: "#2a2a2a" }}>
          LuxVision AI · Google Street View + OpenAI · Images are AI-enhanced
        </p>
      </footer>
    </main>
  );
}
