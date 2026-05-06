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
    <div className="w-full aspect-square rounded-2xl overflow-hidden relative" style={{ background: "#f0ece4" }}>
      <div className="shimmer w-full h-full" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-2 border-transparent"
            style={{ borderTopColor: "#b8902a", borderRightColor: "#b8902a40", animation: "spin 1s linear infinite" }} />
          <div className="absolute inset-2 rounded-full border" style={{ borderColor: "#e4ddd0" }} />
        </div>
        <div className="text-center">
          <p className="font-light tracking-widest text-xs uppercase" style={{ color: "#b8902a" }}>
            {label}
          </p>
          <p className="text-xs mt-1 tracking-wider" style={{ color: "#888880" }}>Please wait…</p>
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
  isAerial,
}: {
  angles: StreetViewAngle[];
  selected: number;
  onSelect: (heading: number) => void;
  isAerial: boolean;
}) {
  return (
    <div className="rounded-2xl p-5 bg-white" style={{ border: "1px solid #e4ddd0" }}>
      <p className="text-xs tracking-widest uppercase mb-1" style={{ color: "#888880" }}>
        Select Property View
      </p>
      <p className="text-xs mb-4" style={{ color: "#bbb8b0" }}>
        {isAerial
          ? "Pick the angle closest to the front — satellite + this view will be combined"
          : "Pick the angle that shows the front of the house"}
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
                border: isSelected ? "2px solid #b8902a" : "2px solid #e4ddd0",
                boxShadow: isSelected ? "0 0 16px rgba(184,144,42,0.25)" : "none",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={angle.imageBase64} alt={angle.label} className="w-full object-cover" style={{ aspectRatio: "1/1" }} />
              <div
                className="absolute bottom-0 inset-x-0 py-1.5 text-center text-[10px] tracking-widest uppercase"
                style={{
                  background: isSelected ? "rgba(184,144,42,0.9)" : "rgba(0,0,0,0.55)",
                  color: isSelected ? "#fff" : "#ccc",
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
        style={{ border: `1px solid ${hover === "before" ? "#c8c0b4" : "#e4ddd0"}`, transition: "border-color 0.2s" }}
        onMouseEnter={() => setHover("before")}
        onMouseLeave={() => setHover(null)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={original} alt="Street View original" className="w-full object-cover" style={{ aspectRatio: "1/1" }} />
        <div className="absolute bottom-0 inset-x-0 py-2 text-center text-xs tracking-widest uppercase"
          style={{ background: "rgba(0,0,0,0.55)", color: "#ccc", backdropFilter: "blur(4px)" }}>
          Before
        </div>
      </div>
      <div
        className="relative rounded-xl overflow-hidden"
        style={{ border: `1px solid ${hover === "after" ? "#b8902a" : "#e4ddd0"}`, transition: "border-color 0.2s", boxShadow: hover === "after" ? "0 0 16px rgba(184,144,42,0.2)" : "none" }}
        onMouseEnter={() => setHover("after")}
        onMouseLeave={() => setHover(null)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={transformed} alt="AI luxury result" className="w-full object-cover" style={{ aspectRatio: "1/1" }} />
        <div className="absolute bottom-0 inset-x-0 py-2 text-center text-xs tracking-widest uppercase"
          style={{ background: "rgba(0,0,0,0.55)", color: "#d4a843", backdropFilter: "blur(4px)" }}>
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
      style={{ border: isActive ? "2px solid #b8902a" : "2px solid #e4ddd0", boxShadow: isActive ? "0 0 12px rgba(184,144,42,0.3)" : "none" }}>
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
  const [authToken, setAuthToken] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUserEmail(session.user.email ?? null);
        setAuthToken(session.access_token);
      }
    });
    // Keep token fresh on session changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthToken(session?.access_token ?? null);
      setUserEmail(session?.user.email ?? null);
    });
    return () => subscription.unsubscribe();
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

  // Aerial upload state
  const [aerialUpload, setAerialUpload] = useState<string | null>(null);

  // Result state
  const [currentImage, setCurrentImage] = useState<HistoryItem | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showPrompt, setShowPrompt] = useState(false);
  const [lastPrompt, setLastPrompt] = useState("");

  const resultRef = useRef<HTMLDivElement>(null);

  function handleAerialFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setAerialUpload(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  // Step 1 — for aerial: go straight to picking-angle (no Street View fetch needed)
  //           for others: fetch 4 Street View angles
  async function handleFetchAngles() {
    if (!address.trim()) { setError("Please enter a property address."); return; }
    setError(null);
    setAerialUpload(null);

    if (style === "aerial") {
      setStep("picking-angle");
      return;
    }

    setStep("picking-angle");
    try {
      const res = await fetch("/api/streetview", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
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

  // Step 2 — generate
  async function handleGenerate(heading: number) {
    setError(null);
    setStep("generating");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
        body: JSON.stringify({
          address: address.trim(),
          style,
          heading,
          ...(style === "aerial" && aerialUpload ? { uploadedImageBase64: aerialUpload } : {}),
        }),
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
    setAerialUpload(null);
    setError(null);
  }

  const styleKeys = Object.keys(STYLE_CONFIGS) as StyleKey[];
  const isLoading = step === "picking-angle" && angles.length === 0 && style !== "aerial";

  return (
    <main className="min-h-screen" style={{ background: "#f7f4ef" }}>
      {/* ── Header ── */}
      <header className="border-b bg-white" style={{ borderColor: "#e4ddd0" }}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
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
          </div>
          <div className="flex items-center gap-2">
            {userEmail && (
              <span className="hidden sm:block text-xs mr-2" style={{ color: "#888880" }}>{userEmail}</span>
            )}
            <Link href="/dashboard"
              className="text-xs tracking-widest uppercase px-3 py-1.5 rounded-lg font-medium transition-colors"
              style={{ color: "#b8902a", background: "rgba(184,144,42,0.08)", border: "1px solid rgba(184,144,42,0.2)" }}>
              History
            </Link>
            {userEmail && (
              <button onClick={handleSignOut}
                className="text-xs tracking-widest uppercase px-3 py-1.5 rounded-lg transition-colors"
                style={{ color: "#888880", border: "1px solid #e4ddd0", background: "#fff" }}>
                Sign Out
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* ── Hero ── */}
        <div className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-light leading-tight mb-3"
            style={{ fontFamily: "Cormorant Garamond, Georgia, serif", color: "#1a1a1a" }}>
            Transform Any Address Into{" "}
            <span style={{ background: "linear-gradient(135deg, #d4a843 0%, #b8902a 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              Magazine Art
            </span>
          </h1>
          <p className="text-base font-light max-w-lg mx-auto" style={{ color: "#888880" }}>
            We pull the real Street View photo and transform it into a luxury listing image using AI.
          </p>
        </div>

        {/* ── Input card ── */}
        <div className="rounded-2xl p-7 mb-6 bg-white" style={{ border: "1px solid #e4ddd0", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
          <div className="grid md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className="block text-xs tracking-widest uppercase mb-2 font-medium" style={{ color: "#888880" }}>
                Property Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => { setAddress(e.target.value); if (step !== "input") handleReset(); }}
                onKeyDown={(e) => e.key === "Enter" && step === "input" && handleFetchAngles()}
                placeholder="e.g. 1600 Mulholland Drive, Los Angeles, CA"
                className="w-full px-5 py-3.5 rounded-xl text-sm transition-all duration-200"
                style={{
                  background: "#f7f4ef",
                  border: `1px solid ${address ? "#d4a843" : "#ddd8ce"}`,
                  color: "#1a1a1a",
                  boxShadow: address ? "0 0 0 3px rgba(184,144,42,0.1)" : "none",
                }}
              />
            </div>

            <div>
              <label className="block text-xs tracking-widest uppercase mb-2 font-medium" style={{ color: "#888880" }}>
                Visual Style
              </label>
              <div className="relative">
                <select value={style} onChange={(e) => setStyle(e.target.value as StyleKey)}
                  className="w-full appearance-none px-5 py-3.5 rounded-xl text-sm cursor-pointer"
                  style={{ background: "#f7f4ef", border: "1px solid #ddd8ce", color: "#1a1a1a" }}>
                  {styleKeys.map((key) => (
                    <option key={key} value={key}>{STYLE_CONFIGS[key].label}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 4l4 4 4-4" stroke="#b8902a" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="flex items-end">
              <button
                onClick={handleFetchAngles}
                disabled={step === "generating" || isLoading}
                className="w-full py-3.5 rounded-xl text-sm tracking-widest uppercase flex items-center justify-center gap-2 font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: (step === "generating" || isLoading) ? "#e4ddd0" : "linear-gradient(135deg, #d4a843, #9a7520)",
                  color: (step === "generating" || isLoading) ? "#888880" : "#fff",
                  boxShadow: (step === "generating" || isLoading) ? "none" : "0 4px 16px rgba(184,144,42,0.35)",
                }}
              >
                {isLoading ? (
                  <><div className="w-4 h-4 rounded-full border-2 border-transparent"
                    style={{ borderTopColor: "#b8902a", animation: "spin 0.8s linear infinite" }} />Loading Views…</>
                ) : (
                  <><SearchIcon />Find Property</>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-4 px-4 py-3 rounded-xl text-sm"
              style={{ background: "#fff0f0", border: "1px solid #fcc", color: "#cc3333" }}>
              {error}
            </div>
          )}
        </div>

        {/* ── Angle picker ── */}
        {step === "picking-angle" && (style === "aerial" || angles.length > 0) && (
          <div className="grid md:grid-cols-3 gap-5 mb-6">
            <div className="md:col-span-2">
              {style === "aerial" ? (
                /* ── Aerial: Google Earth upload panel ── */
                <div className="rounded-2xl p-5 bg-white" style={{ border: "1px solid #e4ddd0" }}>
                  <p className="text-xs tracking-widest uppercase mb-1" style={{ color: "#888880" }}>Aerial / Drone View</p>
                  <p className="text-xs mb-5" style={{ color: "#bbb8b0" }}>
                    Open Google Earth, find the 3D view of the property, screenshot it, then upload below.
                  </p>

                  {/* Google Earth link */}
                  <a
                    href={`https://earth.google.com/web/search/${address.trim().replace(/\s+/g, "+")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-xs tracking-widest uppercase font-medium mb-4 transition-all"
                    style={{ background: "#f0ece4", border: "1px solid #e4ddd0", color: "#b8902a" }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/>
                    </svg>
                    Open in Google Earth →
                  </a>

                  {/* Upload area */}
                  <label className="flex flex-col items-center justify-center w-full rounded-xl cursor-pointer transition-all"
                    style={{
                      border: aerialUpload ? "2px solid #b8902a" : "2px dashed #e4ddd0",
                      background: aerialUpload ? "#fff" : "#faf8f5",
                      minHeight: "180px",
                    }}>
                    {aerialUpload ? (
                      <div className="relative w-full">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={aerialUpload} alt="Uploaded Google Earth screenshot" className="w-full rounded-xl object-cover" style={{ maxHeight: "260px" }} />
                        <div className="absolute top-2 right-2 px-2 py-1 rounded-lg text-[10px] tracking-widest uppercase font-bold"
                          style={{ background: "rgba(184,144,42,0.9)", color: "#fff" }}>
                          ✓ Ready
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3 p-8">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#bbb8b0" strokeWidth="1.5">
                          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                        </svg>
                        <p className="text-sm font-light" style={{ color: "#888880" }}>Upload Google Earth screenshot</p>
                        <p className="text-xs" style={{ color: "#bbb8b0" }}>PNG, JPG, WEBP</p>
                      </div>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={handleAerialFileChange} />
                  </label>
                </div>
              ) : (
                /* ── Street-level: angle picker ── */
                <AnglePicker angles={angles} selected={selectedHeading} onSelect={setSelectedHeading} isAerial={false} />
              )}
            </div>

            <div className="flex flex-col gap-4">
              <div className="rounded-2xl p-5 bg-white" style={{ border: "1px solid #e4ddd0" }}>
                <p className="text-xs tracking-widest uppercase mb-2 font-medium" style={{ color: "#888880" }}>
                  Ready to Generate
                </p>
                <p className="text-sm mb-4" style={{ color: "#888880" }}>
                  {style === "aerial"
                    ? aerialUpload ? "Screenshot uploaded. Hit generate!" : "Upload your Google Earth screenshot first."
                    : "Pick the view showing the front of the property, then generate."}
                </p>
                <button
                  onClick={() => handleGenerate(selectedHeading)}
                  disabled={style === "aerial" && !aerialUpload}
                  className="w-full py-3 rounded-xl text-sm tracking-widest uppercase flex items-center justify-center gap-2 font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: "linear-gradient(135deg, #d4a843, #9a7520)", color: "#fff", boxShadow: "0 4px 16px rgba(184,144,42,0.3)" }}>
                  <SparkleIcon />Generate Image
                </button>
                <button onClick={handleReset}
                  className="mt-2 w-full py-2.5 rounded-xl text-xs tracking-widest uppercase text-center"
                  style={{ background: "#f7f4ef", color: "#888880", border: "1px solid #e4ddd0" }}>
                  Change Address
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Generating ── */}
        {step === "generating" && (
          <div className="rounded-2xl overflow-hidden mb-6 bg-white" style={{ border: "1px solid #e4ddd0" }}>
            <div className="p-4">
              <LoadingSkeleton label="Transforming with AI" />
            </div>
          </div>
        )}

        {/* ── Result ── */}
        <div ref={resultRef}>
          {step === "result" && currentImage && (
            <div className="grid md:grid-cols-3 gap-5">
              <div className="md:col-span-2 rounded-2xl overflow-hidden bg-white" style={{ border: "1px solid #e4ddd0" }}>
                <div className="p-4">
                  <BeforeAfter original={currentImage.originalBase64} transformed={currentImage.imageBase64} />
                  <div className="mt-4 flex gap-2">
                    <button onClick={handleDownload}
                      className="flex-1 py-2.5 rounded-xl text-xs tracking-widest uppercase flex items-center justify-center gap-2 font-medium"
                      style={{ background: "linear-gradient(135deg, #d4a843, #9a7520)", color: "#fff" }}>
                      <DownloadIcon />Download AI Image
                    </button>
                    <button onClick={() => setStep("picking-angle")}
                      className="px-4 py-2.5 rounded-xl text-xs tracking-widest uppercase flex items-center justify-center gap-2"
                      style={{ background: "#f7f4ef", color: "#888880", border: "1px solid #e4ddd0" }}>
                      <RefreshIcon />Redo
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="rounded-2xl p-5 bg-white" style={{ border: "1px solid #e4ddd0" }}>
                  <h3 className="text-xs tracking-widest uppercase mb-4 font-medium" style={{ color: "#888880" }}>
                    Image Details
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] tracking-widest uppercase mb-1" style={{ color: "#bbb8b0" }}>Address</p>
                      <p className="text-sm font-medium" style={{ color: "#1a1a1a" }}>{currentImage.address}</p>
                    </div>
                    <div>
                      <p className="text-[10px] tracking-widest uppercase mb-1" style={{ color: "#bbb8b0" }}>Style</p>
                      <span className="inline-block px-2 py-1 rounded-lg text-xs font-medium"
                        style={{ background: "rgba(184,144,42,0.1)", color: "#b8902a" }}>
                        {STYLE_CONFIGS[currentImage.style as StyleKey]?.label}
                      </span>
                    </div>
                    <div>
                      <p className="text-[10px] tracking-widest uppercase mb-1" style={{ color: "#bbb8b0" }}>Source</p>
                      <p className="text-xs" style={{ color: "#888880" }}>Google Street View → OpenAI</p>
                    </div>
                  </div>

                  <button onClick={() => setStep("picking-angle")}
                    className="mt-5 w-full py-2.5 rounded-xl text-xs tracking-widest uppercase flex items-center justify-center gap-2"
                    style={{ background: "#f7f4ef", color: "#888880", border: "1px solid #e4ddd0" }}>
                    <RefreshIcon />Try Different Angle
                  </button>

                </div>

                {history.length > 1 && (
                  <div className="rounded-2xl p-4 bg-white" style={{ border: "1px solid #e4ddd0" }}>
                    <h3 className="text-[10px] tracking-widest uppercase mb-3 font-medium" style={{ color: "#bbb8b0" }}>
                      Recent
                    </h3>
                    <div className="flex gap-2 flex-wrap">
                      {history.map((item) => (
                        <HistoryCard key={item.id} item={item} isActive={currentImage?.id === item.id}
                          onSelect={() => setCurrentImage(item)} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === "input" && !currentImage && (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-full mx-auto mb-5 flex items-center justify-center"
                style={{ background: "rgba(184,144,42,0.08)", border: "1px solid rgba(184,144,42,0.15)" }}>
                <SparkleIcon />
              </div>
              <p className="text-sm tracking-widest uppercase" style={{ color: "#bbb8b0" }}>
                Enter an address above to get started
              </p>
            </div>
          )}
        </div>
      </div>

      <footer className="mt-16 border-t py-6 text-center bg-white" style={{ borderColor: "#e4ddd0" }}>
        <p className="text-xs tracking-widest uppercase" style={{ color: "#bbb8b0" }}>
          LuxVision AI · Google Street View + OpenAI · Images are AI-enhanced
        </p>
      </footer>
    </main>
  );
}
