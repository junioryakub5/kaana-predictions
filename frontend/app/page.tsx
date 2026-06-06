"use client";

import { useState, useEffect } from "react";
import {
  Filter,
  TrendingUp,
  Shield,
  Loader2,
  CalendarX2,
  BarChart2,
  ShieldCheck,
  Zap,
  Sparkles,
  Trophy,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PredictionCard from "@/components/PredictionCard";
import { getActivePredictions } from "@/lib/api";
import { Prediction } from "@/lib/types";

const FILTER_TABS = [
  { label: "All", value: "all" },
  { label: "2+ ODDS", value: "2+" },
  { label: "5+ ODDS", value: "5+" },
  { label: "10+ ODDS", value: "10+" },
  { label: "20+ ODDS", value: "20+" },
];

export default function HomePage() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchPredictions("all");
  }, []);

  const fetchPredictions = async (category: string) => {
    setLoading(true);
    setError("");
    try {
      const data = await getActivePredictions(category === "all" ? undefined : category);
      setPredictions(data);
    } catch {
      setError("Failed to load predictions. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = (value: string) => {
    setActiveFilter(value);
    fetchPredictions(value);
  };

  return (
    <>
      <Navbar />

      <main className="min-h-screen" style={{ background: "var(--bg, #09090b)" }}>

        {/* ── Hero ── */}
        <section
          className="pt-28 pb-14 relative overflow-hidden"
          style={{ background: "#09090b" }}
        >
          {/* Decorative orbs */}
          <div
            className="pointer-events-none absolute"
            style={{
              top: "-120px",
              right: "-160px",
              width: "520px",
              height: "520px",
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(255,69,0,0.12) 0%, rgba(255,69,0,0.04) 45%, transparent 70%)",
              filter: "blur(40px)",
            }}
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute"
            style={{
              bottom: "-140px",
              left: "-120px",
              width: "480px",
              height: "480px",
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(168,85,247,0.1) 0%, rgba(59,130,246,0.06) 45%, transparent 70%)",
              filter: "blur(40px)",
            }}
            aria-hidden="true"
          />

          <div className="page-container text-center relative z-10">

            {/* Badge */}
            <div className="flex justify-center mb-6 animate-fadeInUp">
              <div
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold"
                style={{
                  background: "rgba(255,69,0,0.1)",
                  border: "1px solid rgba(255,69,0,0.25)",
                  color: "#ff4500",
                }}
              >
                <Sparkles size={12} />
                Premium Football Predictions
              </div>
            </div>

            {/* Headline */}
            <h1 className="section-title mb-4 animate-fadeInUp">
              This Week&apos;s
              <br />
              <span className="gradient-text">Featured Tips</span>
            </h1>

            <p
              className="text-base md:text-lg max-w-lg mx-auto mb-12 leading-relaxed animate-fadeInUp"
              style={{ color: "#a1a1aa" }}
            >
              Unlock premium predictions with guaranteed odds.
            </p>

            {/* Stats row */}
            <div className="flex items-center justify-center gap-4 md:gap-6 mb-14 animate-fadeInUp">
              {[
                { icon: <Trophy size={18} />, label: "Win Rate", value: "87%", color: "#10b981" },
                { icon: <TrendingUp size={18} />, label: "Predictions", value: "500+", color: "#ff4500" },
                { icon: <Shield size={18} />, label: "Verified", value: "100%", color: "#f59e0b" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="flex flex-col items-center gap-1 px-5 py-4 rounded-2xl transition-all duration-300 hover:scale-105"
                  style={{
                    background: "#111117",
                    border: "1px solid rgba(255,255,255,0.06)",
                    minWidth: "100px",
                  }}
                >
                  <div style={{ color: stat.color }}>{stat.icon}</div>
                  <span
                    className="font-display font-bold"
                    style={{ fontSize: "1.5rem", color: stat.color }}
                  >
                    {stat.value}
                  </span>
                  <span
                    className="text-[10px] font-semibold tracking-wider uppercase"
                    style={{ color: "#52525b" }}
                  >
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Filter bar label */}
            <div
              className="flex items-center justify-center gap-2 text-sm mb-4"
              style={{ color: "#52525b" }}
            >
              <Filter size={14} />
              <span className="font-medium">Filter by odds</span>
            </div>

            {/* Filter pills */}
            <div className="relative">
              <div
                className="pointer-events-none absolute right-0 top-0 h-full w-10 z-10 md:hidden"
                style={{
                  background: "linear-gradient(to right, transparent, #09090b)",
                }}
                aria-hidden="true"
              />
              <div
                className="flex items-center gap-2 overflow-x-auto md:flex-wrap md:justify-center md:overflow-visible
                  px-1 pb-1 scroll-smooth scrollbar-none [&::-webkit-scrollbar]:hidden"
                style={{ WebkitOverflowScrolling: "touch" }}
              >
                {FILTER_TABS.map((tab) => (
                  <button
                    key={tab.value}
                    onClick={() => handleFilter(tab.value)}
                    className="flex-shrink-0 text-sm font-semibold px-5 py-2 rounded-xl border transition-all duration-300"
                    style={
                      activeFilter === tab.value
                        ? {
                            background: "#ff4500",
                            color: "#ffffff",
                            borderColor: "#ff4500",
                            boxShadow: "0 4px 16px rgba(255,69,0,0.35)",
                          }
                        : {
                            background: "#111117",
                            color: "#a1a1aa",
                            borderColor: "rgba(255,255,255,0.06)",
                          }
                    }
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Cards Grid ── */}
        <section
          className="pb-20 relative z-10"
          style={{ background: "#09090b" }}
        >
          <div className="page-container pt-10">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{
                    background: "rgba(255,69,0,0.08)",
                    border: "1px solid rgba(255,69,0,0.18)",
                  }}
                >
                  <Loader2 size={28} style={{ color: "#ff4500" }} className="animate-spin" />
                </div>
                <p style={{ color: "#52525b" }} className="text-sm">
                  Loading predictions...
                </p>
              </div>
            ) : error ? (
              <div className="text-center py-24">
                <p className="text-red-500 mb-4">{error}</p>
                <button
                  onClick={() => fetchPredictions(activeFilter)}
                  className="btn-outline-gold"
                >
                  Try Again
                </button>
              </div>
            ) : predictions.length === 0 ? (
              <div className="text-center py-24">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
                  style={{
                    background: "#111117",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <CalendarX2 size={28} style={{ color: "#52525b" }} />
                </div>
                <p
                  className="text-lg mb-2 font-display font-semibold"
                  style={{ color: "#a1a1aa" }}
                >
                  No predictions available
                </p>
                <p className="text-sm" style={{ color: "#52525b" }}>
                  Check back soon — new tips are being prepared.
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {predictions.map((pred, idx) => (
                    <PredictionCard
                      key={pred._id}
                      prediction={pred}
                      animationDelay={idx * 100}
                    />
                  ))}
                </div>

                {/* View History CTA */}
                <div className="text-center mt-14">
                  <a href="/history" className="btn-outline-gold">
                    View Past Results
                  </a>
                </div>
              </>
            )}
          </div>
        </section>

        {/* ── Trust Section ── */}
        <section
          className="py-10 md:py-20 relative z-10"
          style={{ background: "#09090b" }}
        >
          {/* Glow line divider */}
          <div className="glow-line mb-10 md:mb-16" aria-hidden="true" />

          <div className="page-container text-center">
            <h2
              className="font-display font-bold mb-2 md:mb-3"
              style={{
                fontSize: "clamp(1.4rem,5vw,2.8rem)",
                letterSpacing: "-0.03em",
                color: "#f4f4f5",
              }}
            >
              Why Trust{" "}
              <span className="gradient-text">Kaana Predictions?</span>
            </h2>
            <p
              className="text-xs md:text-sm max-w-md mx-auto mb-6 md:mb-14 leading-relaxed"
              style={{ color: "#a1a1aa" }}
            >
              Expert-verified predictions. Secure payments via Paystack. Instant access.
            </p>

            {/* 3-col grid */}
            <div className="grid grid-cols-3 gap-2 md:gap-5 max-w-4xl mx-auto">
              {[
                {
                  icon: <BarChart2 size={20} />,
                  title: "Expert Analysis",
                  desc: "Statistic-driven predictions backed by deep match research",
                  color: "#ff4500",
                  iconBg: "rgba(255,69,0,0.1)",
                  iconBorder: "rgba(255,69,0,0.18)",
                },
                {
                  icon: <ShieldCheck size={20} />,
                  title: "Secure Payments",
                  desc: "Paystack-powered payments — safe and instant",
                  color: "#10b981",
                  iconBg: "rgba(16,185,129,0.1)",
                  iconBorder: "rgba(16,185,129,0.18)",
                },
                {
                  icon: <Zap size={20} />,
                  title: "Instant Access",
                  desc: "Unlock your prediction immediately after payment",
                  color: "#f59e0b",
                  iconBg: "rgba(245,158,11,0.1)",
                  iconBorder: "rgba(245,158,11,0.18)",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex flex-col items-center text-center p-3 md:p-7 rounded-xl md:rounded-2xl
                    transition-all duration-300 hover:-translate-y-1 md:hover:-translate-y-2 group"
                  style={{
                    background: "#111117",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <div
                    className="w-10 h-10 md:w-14 md:h-14 rounded-xl flex items-center justify-center mb-2 md:mb-4
                      transition-all duration-300 group-hover:scale-110"
                    style={{
                      background: item.iconBg,
                      border: `1px solid ${item.iconBorder}`,
                      color: item.color,
                    }}
                  >
                    {item.icon}
                  </div>
                  <div className="min-w-0">
                    <h3
                      className="font-display font-bold text-[11px] md:text-sm mb-0.5 md:mb-2 tracking-wide"
                      style={{ color: "#f4f4f5" }}
                    >
                      {item.title}
                    </h3>
                    <p
                      className="text-[10px] md:text-xs leading-relaxed hidden md:block"
                      style={{ color: "#a1a1aa" }}
                    >
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
