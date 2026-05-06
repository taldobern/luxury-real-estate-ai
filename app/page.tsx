"use client";

import { useState, useRef } from "react";
import { STYLE_CONFIGS, StyleKey } from "@/lib/prompts";
import type { GenerateResponse } from "@/app/api/generate/route";

// Max images kept in the history strip
const HISTORY_LIMIT = 3;

interface HistoryItem {
  id: string;
  imageBase64: string;
  address: string;
  style: string;
  timestamp: Date;
}

// ─── Icons (inline SVG — no extra dependency) ───────────────────────────────

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

// ─── Loading skeleton ────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="w-full aspect-square rounded-2xl overflow-hidden relative">
      <div className="shimmer w-full h-full" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
        {/* Animated ring */}
        <div className="relative w-16 h-16">
          <div
            className="absolute inset-0 rounded-full border-2 border-transparent"
            style={{
              borderTopColor: "#d4a843",
              borderRightColor: "#d4a84340",
              animation: "spin 1s linear infinite",
            }}
          />
          <div className="absolute inset-2 rounded-full border border-yellow-900/40" />
        </div>
        <div className="text-center">
          <p className="text-gold-400 font-light tracking-widest text-xs uppercase" style={{ color: "#d4a843" }}>
            Generating
          </p>
          <p className="text-gray-600 text-xs mt-1 tracking-wider">This may take 15–30 seconds</p>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── History thumbnail ───────────────────────────────────────────────────────

function HistoryCard({
  item,
  onSelect,
  isActive,
}: {
  item: HistoryItem;
  onSelect: () => void;
  isActive: boolean;
}) {
  return (
    <button
      onClick={onSelect}
      className="relative group flex-shrink-0 w-24 aspect-square rounded-lg overflow-hidden transition-all duration-200"
      style={{
        border: isActive ? "2px solid #d4a843" : "2px solid #1e1e1e",
        boxShadow: isActive ? "0 0 12px rgba(212, 168, 67, 0.3)" : "none",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.imageBase64}
        alt={item.address}
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
      />
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1">
        <span className="text-white text-[9px] leading-tight line-clamp-2 font-medium">
          {STYLE_CONFIGS[item.style as StyleKey]?.label ?? item.style}
        </span>
      </div>
    </button>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function Home() {
  const [address, setAddress] = useState("");
  const [style, setStyle] = useState<StyleKey>("aerial");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentImage, setCurrentImage] = useState<HistoryItem | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showPrompt, setShowPrompt] = useState(false);
  const [lastPrompt, setLastPrompt] = useState<string>("");

  const resultRef = useRef<HTMLDivElement>(null);

  async function handleGenerate() {
    if (!address.trim()) {
      setError("Please enter a property address.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: address.trim(), style }),
      });

      const data: GenerateResponse & { error?: string } = await res.json();

      if (!res.ok || data.error) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      const newItem: HistoryItem = {
        id: Date.now().toString(),
        imageBase64: data.imageBase64,
        address: address.trim(),
        style,
        timestamp: new Date(),
      };

      setCurrentImage(newItem);
      setLastPrompt(data.prompt);

      // Prepend to history, keep last HISTORY_LIMIT items
      setHistory((prev) => [newItem, ...prev].slice(0, HISTORY_LIMIT));

      // Scroll result into view
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleDownload() {
    if (!currentImage) return;
    const a = document.createElement("a");
    a.href = currentImage.imageBase64;
    const safeAddress = currentImage.address.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    a.download = `luxvision_${safeAddress}_${currentImage.style}.png`;
    a.click();
  }

  function handleRegenerate() {
    handleGenerate();
  }

  const styleKeys = Object.keys(STYLE_CONFIGS) as StyleKey[];

  return (
    <main className="min-h-screen" style={{ background: "#0a0a0a" }}>
      {/* ── Header ── */}
      <header className="border-b" style={{ borderColor: "#1a1a1a" }}>
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Logo mark */}
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #d4a843, #9a7520)" }}
            >
              <span className="text-black font-semibold text-sm">L</span>
            </div>
            <div>
              <span
                className="font-light tracking-[0.15em] text-lg"
                style={{ fontFamily: "Cormorant Garamond, Georgia, serif", color: "#e8e8e8" }}
              >
                LUX
              </span>
              <span
                className="font-semibold tracking-[0.15em] text-lg"
                style={{ fontFamily: "Cormorant Garamond, Georgia, serif", color: "#d4a843" }}
              >
                VISION
              </span>
              <span className="ml-2 text-xs tracking-widest uppercase" style={{ color: "#4a4a4a" }}>
                AI
              </span>
            </div>
          </div>
          <p className="hidden sm:block text-xs tracking-widest uppercase" style={{ color: "#3a3a3a" }}>
            Luxury Real Estate Imagery
          </p>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* ── Hero headline ── */}
        <div className="text-center mb-14 animate-fade-in">
          <h1
            className="text-4xl sm:text-5xl md:text-6xl font-light leading-tight mb-4"
            style={{ fontFamily: "Cormorant Garamond, Georgia, serif", color: "#e8e8e8" }}
          >
            Transform Any Address Into{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #f0d080 0%, #d4a843 50%, #b8902a 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Magazine Art
            </span>
          </h1>
          <p className="text-base font-light tracking-wide max-w-md mx-auto" style={{ color: "#555" }}>
            AI-generated luxury architectural photography. Ready in seconds.
          </p>
        </div>

        {/* ── Input card ── */}
        <div
          className="rounded-2xl p-8 mb-8 relative overflow-hidden"
          style={{
            background: "#111111",
            border: "1px solid #1e1e1e",
            boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
          }}
        >
          {/* Subtle gold glow top-left */}
          <div
            className="absolute top-0 left-0 w-64 h-32 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse at top left, rgba(212,168,67,0.06) 0%, transparent 70%)",
            }}
          />

          <div className="grid md:grid-cols-2 gap-6 relative z-10">
            {/* Address field */}
            <div className="md:col-span-2">
              <label className="block text-xs tracking-widest uppercase mb-3" style={{ color: "#555" }}>
                Property Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !loading && handleGenerate()}
                placeholder="e.g. 1600 Mulholland Drive, Los Angeles, CA"
                className="w-full px-5 py-4 rounded-xl text-sm font-light transition-all duration-200 placeholder:text-gray-700"
                style={{
                  background: "#0d0d0d",
                  border: "1px solid #2a2a2a",
                  color: "#e8e8e8",
                  boxShadow: address ? "0 0 0 1px rgba(212,168,67,0.3)" : "none",
                  borderColor: address ? "#3a3020" : "#2a2a2a",
                }}
              />
            </div>

            {/* Style selector */}
            <div>
              <label className="block text-xs tracking-widest uppercase mb-3" style={{ color: "#555" }}>
                Visual Style
              </label>
              <div className="relative">
                <select
                  value={style}
                  onChange={(e) => setStyle(e.target.value as StyleKey)}
                  className="w-full appearance-none px-5 py-4 rounded-xl text-sm font-light cursor-pointer transition-colors duration-200"
                  style={{
                    background: "#0d0d0d",
                    border: "1px solid #2a2a2a",
                    color: "#e8e8e8",
                    borderColor: "#2a2a2a",
                  }}
                >
                  {styleKeys.map((key) => (
                    <option key={key} value={key} style={{ background: "#111" }}>
                      {STYLE_CONFIGS[key].label}
                    </option>
                  ))}
                </select>
                {/* Custom chevron */}
                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 4l4 4 4-4" stroke="#d4a843" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Generate button */}
            <div className="flex items-end">
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full py-4 rounded-xl font-light text-sm tracking-widest uppercase flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: loading
                    ? "#1a1a1a"
                    : "linear-gradient(135deg, #d4a843 0%, #9a7520 100%)",
                  color: loading ? "#555" : "#000",
                  boxShadow: loading ? "none" : "0 8px 24px rgba(212,168,67,0.25)",
                  transform: loading ? "none" : undefined,
                }}
                onMouseEnter={(e) => {
                  if (!loading) (e.target as HTMLButtonElement).style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLButtonElement).style.transform = "translateY(0)";
                }}
              >
                {loading ? (
                  <>
                    <div
                      className="w-4 h-4 rounded-full border-2 border-transparent"
                      style={{
                        borderTopColor: "#d4a843",
                        animation: "spin 0.8s linear infinite",
                      }}
                    />
                    Generating...
                  </>
                ) : (
                  <>
                    <SparkleIcon />
                    Generate Image
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div
              className="mt-5 px-4 py-3 rounded-lg text-sm animate-slide-up"
              style={{
                background: "rgba(220,38,38,0.08)",
                border: "1px solid rgba(220,38,38,0.2)",
                color: "#f87171",
              }}
            >
              {error}
            </div>
          )}
        </div>

        {/* ── Result area ── */}
        <div ref={resultRef}>
          {(loading || currentImage) && (
            <div className="grid md:grid-cols-3 gap-6 animate-slide-up">
              {/* Main image panel */}
              <div
                className="md:col-span-2 rounded-2xl overflow-hidden"
                style={{ border: "1px solid #1e1e1e", background: "#111" }}
              >
                {loading ? (
                  <LoadingSkeleton />
                ) : currentImage ? (
                  <div className="relative group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={currentImage.imageBase64}
                      alt={`${currentImage.address} — ${currentImage.style}`}
                      className="w-full object-cover"
                      style={{ aspectRatio: "1/1" }}
                    />
                    {/* Hover overlay with action buttons */}
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-between p-5"
                      style={{
                        background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)",
                      }}
                    >
                      <div>
                        <p className="text-white font-light text-sm">{currentImage.address}</p>
                        <p className="text-xs mt-0.5" style={{ color: "#d4a843" }}>
                          {STYLE_CONFIGS[currentImage.style as StyleKey]?.label}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleRegenerate}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                          style={{ background: "rgba(255,255,255,0.1)", color: "#fff", backdropFilter: "blur(8px)" }}
                          title="Regenerate"
                        >
                          <RefreshIcon />
                        </button>
                        <button
                          onClick={handleDownload}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-colors"
                          style={{ background: "#d4a843", color: "#000" }}
                          title="Download PNG"
                        >
                          <DownloadIcon />
                          Save
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Side panel */}
              <div className="flex flex-col gap-4">
                {/* Image details card */}
                {currentImage && !loading && (
                  <div
                    className="rounded-2xl p-5 flex-1"
                    style={{ background: "#111", border: "1px solid #1e1e1e" }}
                  >
                    <h3 className="text-xs tracking-widest uppercase mb-4" style={{ color: "#555" }}>
                      Image Details
                    </h3>

                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] tracking-widest uppercase mb-1" style={{ color: "#3a3a3a" }}>
                          Address
                        </p>
                        <p className="text-sm font-light" style={{ color: "#e0e0e0" }}>
                          {currentImage.address}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] tracking-widest uppercase mb-1" style={{ color: "#3a3a3a" }}>
                          Style
                        </p>
                        <span
                          className="inline-block px-2 py-1 rounded text-xs"
                          style={{ background: "rgba(212,168,67,0.12)", color: "#d4a843" }}
                        >
                          {STYLE_CONFIGS[currentImage.style as StyleKey]?.label}
                        </span>
                      </div>
                      <div>
                        <p className="text-[10px] tracking-widest uppercase mb-1" style={{ color: "#3a3a3a" }}>
                          Resolution
                        </p>
                        <p className="text-sm font-light" style={{ color: "#666" }}>
                          1024 × 1024 px
                        </p>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="mt-6 space-y-2">
                      <button
                        onClick={handleDownload}
                        className="w-full py-2.5 rounded-xl text-xs tracking-widest uppercase flex items-center justify-center gap-2 font-medium transition-all"
                        style={{ background: "linear-gradient(135deg, #d4a843, #9a7520)", color: "#000" }}
                      >
                        <DownloadIcon />
                        Download PNG
                      </button>
                      <button
                        onClick={handleRegenerate}
                        disabled={loading}
                        className="w-full py-2.5 rounded-xl text-xs tracking-widest uppercase flex items-center justify-center gap-2 font-light transition-all disabled:opacity-40"
                        style={{ background: "#1a1a1a", color: "#888", border: "1px solid #2a2a2a" }}
                      >
                        <RefreshIcon />
                        Regenerate
                      </button>
                    </div>

                    {/* Prompt toggle */}
                    <button
                      onClick={() => setShowPrompt((p) => !p)}
                      className="mt-4 w-full text-[10px] tracking-widest uppercase text-center py-2 rounded transition-colors"
                      style={{ color: "#3a3a3a", border: "1px dashed #1e1e1e" }}
                    >
                      {showPrompt ? "Hide Prompt" : "View Prompt"}
                    </button>

                    {showPrompt && (
                      <div
                        className="mt-3 p-3 rounded-lg text-[11px] leading-relaxed font-light"
                        style={{ background: "#0d0d0d", color: "#555", border: "1px solid #1a1a1a" }}
                      >
                        {lastPrompt}
                      </div>
                    )}
                  </div>
                )}

                {/* History strip */}
                {history.length > 1 && (
                  <div
                    className="rounded-2xl p-4"
                    style={{ background: "#111", border: "1px solid #1e1e1e" }}
                  >
                    <h3 className="text-[10px] tracking-widest uppercase mb-3" style={{ color: "#3a3a3a" }}>
                      Recent — Last {HISTORY_LIMIT}
                    </h3>
                    <div className="flex gap-2 flex-wrap">
                      {history.map((item) => (
                        <HistoryCard
                          key={item.id}
                          item={item}
                          isActive={currentImage?.id === item.id}
                          onSelect={() => setCurrentImage(item)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!loading && !currentImage && (
            <div className="text-center py-24">
              <div
                className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center"
                style={{
                  background: "rgba(212,168,67,0.06)",
                  border: "1px solid rgba(212,168,67,0.12)",
                }}
              >
                <SparkleIcon />
              </div>
              <p className="text-sm font-light tracking-widest uppercase" style={{ color: "#2a2a2a" }}>
                Enter an address above to generate your first image
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="mt-20 border-t py-8 text-center" style={{ borderColor: "#141414" }}>
        <p className="text-xs tracking-widest uppercase" style={{ color: "#2a2a2a" }}>
          LuxVision AI · Powered by OpenAI · Images are AI-generated
        </p>
      </footer>
    </main>
  );
}
