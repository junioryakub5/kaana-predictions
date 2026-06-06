"use client";

import { useEffect, useState } from "react";
import { TrendingUp, Calendar, CheckCircle2, XCircle, BarChart3, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getHistoryPredictions } from "@/lib/api";
import { Prediction } from "@/lib/types";

export default function HistoryPage() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "win" | "loss">("all");

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await getHistoryPredictions();
        setPredictions(data);
      } catch {
        setError("Failed to load history.");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const filtered = predictions.filter((p) => {
    if (filter === "all") return true;
    return p.result === filter;
  });

  const wins = predictions.filter((p) => p.result === "win").length;
  const losses = predictions.filter((p) => p.result === "loss").length;
  const winRate = predictions.length > 0 ? Math.round((wins / predictions.length) * 100) : 0;

  return (
    <>
      <Navbar />
      <main
        className="min-h-screen pt-24 pb-16 relative z-10"
        style={{ background: "var(--bg, #09090b)" }}
      >
        <div className="page-container">
          {/* Header */}
          <div className="mb-10">
            <h1
              className="font-brand text-4xl font-bold mb-2"
              style={{
                fontFamily: "'Sora', sans-serif",
                color: "#f4f4f5",
                letterSpacing: "-0.03em",
              }}
            >
              Past Results
            </h1>
            <p style={{ color: "#a1a1aa" }}>
              Our winning history and proven track record
            </p>
          </div>

          {/* Stats Banner */}
          {!loading && predictions.length > 0 && (
            <div
              className="rounded-2xl p-6 mb-8 flex flex-col md:flex-row items-center gap-6"
              style={{
                background: "#111117",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {/* Left: icon + text */}
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: "rgba(16,185,129,0.1)",
                    border: "1px solid rgba(16,185,129,0.2)",
                  }}
                >
                  <TrendingUp size={22} style={{ color: "#10b981" }} />
                </div>
                <div>
                  <h2
                    className="font-bold text-base"
                    style={{ color: "#f4f4f5" }}
                  >
                    Proven Track Record
                  </h2>
                  <p className="text-sm" style={{ color: "#a1a1aa" }}>
                    Expert tips with verified outcomes
                  </p>
                </div>
              </div>

              {/* Right: stat pills */}
              <div className="flex items-center gap-3 md:ml-auto flex-wrap justify-center">
                {/* Win Rate */}
                <div
                  className="flex flex-col items-center px-5 py-3 rounded-xl"
                  style={{
                    background: "rgba(16,185,129,0.08)",
                    border: "1px solid rgba(16,185,129,0.18)",
                  }}
                >
                  <span
                    className="text-2xl font-black"
                    style={{ color: "#10b981" }}
                  >
                    {winRate}%
                  </span>
                  <span className="text-[11px] font-semibold mt-0.5" style={{ color: "#a1a1aa" }}>
                    Win Rate
                  </span>
                </div>
                {/* Wins */}
                <div
                  className="flex flex-col items-center px-5 py-3 rounded-xl"
                  style={{
                    background: "rgba(16,185,129,0.08)",
                    border: "1px solid rgba(16,185,129,0.18)",
                  }}
                >
                  <span
                    className="text-2xl font-black"
                    style={{ color: "#10b981" }}
                  >
                    {wins}
                  </span>
                  <span className="text-[11px] font-semibold mt-0.5" style={{ color: "#a1a1aa" }}>
                    Wins
                  </span>
                </div>
                {/* Losses */}
                <div
                  className="flex flex-col items-center px-5 py-3 rounded-xl"
                  style={{
                    background: "rgba(239,68,68,0.08)",
                    border: "1px solid rgba(239,68,68,0.18)",
                  }}
                >
                  <span
                    className="text-2xl font-black"
                    style={{ color: "#ef4444" }}
                  >
                    {losses}
                  </span>
                  <span className="text-[11px] font-semibold mt-0.5" style={{ color: "#a1a1aa" }}>
                    Losses
                  </span>
                </div>
                {/* Total */}
                <div
                  className="flex flex-col items-center px-5 py-3 rounded-xl"
                  style={{
                    background: "rgba(255,69,0,0.08)",
                    border: "1px solid rgba(255,69,0,0.18)",
                  }}
                >
                  <span
                    className="text-2xl font-black"
                    style={{ color: "#ff4500" }}
                  >
                    {predictions.length}
                  </span>
                  <span className="text-[11px] font-semibold mt-0.5" style={{ color: "#a1a1aa" }}>
                    Total
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Filter Tabs */}
          <div
            className="flex items-center gap-2 mb-8 p-1.5 rounded-2xl w-fit"
            style={{
              background: "#111117",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {(["all", "win", "loss"] as const).map((f) => {
              const isActive = filter === f;
              const activeStyles =
                f === "win"
                  ? {
                      background: "rgba(16,185,129,0.15)",
                      color: "#10b981",
                      border: "1px solid rgba(16,185,129,0.3)",
                      boxShadow: "0 2px 8px rgba(16,185,129,0.12)",
                    }
                  : f === "loss"
                  ? {
                      background: "rgba(239,68,68,0.15)",
                      color: "#ef4444",
                      border: "1px solid rgba(239,68,68,0.3)",
                      boxShadow: "0 2px 8px rgba(239,68,68,0.12)",
                    }
                  : {
                      background: "rgba(255,69,0,0.15)",
                      color: "#ff4500",
                      border: "1px solid rgba(255,69,0,0.3)",
                      boxShadow: "0 2px 8px rgba(255,69,0,0.12)",
                    };
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className="text-sm font-semibold px-5 py-2 rounded-xl capitalize transition-all duration-200"
                  style={
                    isActive
                      ? activeStyles
                      : {
                          background: "transparent",
                          color: "#52525b",
                          border: "1px solid transparent",
                        }
                  }
                >
                  {f === "all" ? (
                    "All Results"
                  ) : f === "win" ? (
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="flex-shrink-0" />
                      Wins
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <XCircle size={13} className="flex-shrink-0" />
                      Losses
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Results */}
          {loading ? (
            <div className="flex flex-col items-center py-24 gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{
                  background: "rgba(255,69,0,0.07)",
                  border: "1px solid rgba(255,69,0,0.14)",
                }}
              >
                <Loader2
                  size={28}
                  style={{ color: "#ff4500" }}
                  className="animate-spin"
                />
              </div>
              <p className="text-sm" style={{ color: "#a1a1aa" }}>
                Loading history...
              </p>
            </div>
          ) : error ? (
            <div className="text-center py-24" style={{ color: "#ef4444" }}>
              {error}
            </div>
          ) : filtered.length === 0 ? (
            <div
              className="text-center py-24 rounded-2xl"
              style={{
                background: "#111117",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <BarChart3
                size={48}
                className="mx-auto mb-4"
                style={{ color: "#52525b" }}
              />
              <p className="text-lg mb-2" style={{ color: "#a1a1aa" }}>
                No results yet
              </p>
              <p className="text-sm" style={{ color: "#52525b" }}>
                Completed predictions will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {filtered.map((pred) => (
                <ResultCard key={pred._id} prediction={pred} />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

function ResultCard({ prediction }: { prediction: Prediction }) {
  const isWin    = prediction.result === "win";
  const hasBefore = !!prediction.imageUrl;
  const hasProof  = !!prediction.proofImageUrl;
  const hasImages = hasBefore || hasProof;

  return (
    <div className="card-glass overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 px-4 md:px-6 pt-4 md:pt-5 pb-4">
        <h3
          className="font-bold text-base md:text-lg"
          style={{ color: "#f4f4f5" }}
        >
          {prediction.match}
        </h3>
        <span
          className="text-xs font-bold px-3 py-1 rounded-lg"
          style={{
            background: "rgba(255,69,0,0.1)",
            color: "#ff4500",
            border: "1px solid rgba(255,69,0,0.2)",
          }}
        >
          {prediction.oddsCategory} ODDS
        </span>
        {prediction.result && (
          <span className={isWin ? "badge-win" : "badge-loss"}>
            {isWin ? (
              <span className="flex items-center gap-1">
                <CheckCircle2 size={11} />
                WON
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <XCircle size={11} />
                LOST
              </span>
            )}
          </span>
        )}
        <span
          className="text-sm ml-auto flex items-center gap-1"
          style={{ color: "#52525b" }}
        >
          <Calendar size={13} />
          {new Date(prediction.date).toLocaleDateString("en-GB", {
            weekday: "short",
            day: "numeric",
            month: "short",
          })}
        </span>
      </div>

      {/* Image evidence */}
      {hasImages ? (
        <div
          className={`grid gap-0 ${hasBefore && hasProof ? "grid-cols-2" : "grid-cols-1"}`}
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          {hasBefore && (
            <div
              className={`flex flex-col ${hasBefore && hasProof ? "border-r" : ""}`}
              style={{ borderColor: "rgba(255,255,255,0.06)" }}
            >
              <div
                className="flex items-center justify-between px-3 py-2"
                style={{
                  background: "#1a1a24",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <span
                  className="text-[11px] font-bold uppercase tracking-wide"
                  style={{ color: "#a1a1aa" }}
                >
                  Bet Slip
                </span>
                <span
                  className="text-[10px] uppercase tracking-widest"
                  style={{ color: "#52525b" }}
                >
                  Before
                </span>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={prediction.imageUrl!}
                alt={`Bet slip — ${prediction.match}`}
                className="w-full object-contain"
                style={{
                  background: "#0d0d10",
                  maxHeight: hasBefore && hasProof ? "280px" : "360px",
                  minHeight: "140px",
                }}
              />
            </div>
          )}
          {hasProof && (
            <div className="flex flex-col">
              <div
                className="flex items-center justify-between px-3 py-2"
                style={{
                  background: isWin
                    ? "rgba(16,185,129,0.08)"
                    : "rgba(239,68,68,0.08)",
                  borderBottom: `1px solid ${
                    isWin
                      ? "rgba(16,185,129,0.16)"
                      : "rgba(239,68,68,0.16)"
                  }`,
                }}
              >
                <span
                  className="text-[11px] font-bold uppercase tracking-wide"
                  style={{ color: isWin ? "#10b981" : "#ef4444" }}
                >
                  Result Proof
                </span>
                <span
                  className="text-[10px] uppercase tracking-widest"
                  style={{ color: "#52525b" }}
                >
                  After
                </span>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={prediction.proofImageUrl!}
                alt={`Result proof — ${prediction.match}`}
                className="w-full object-contain"
                style={{
                  background: "#0d0d10",
                  maxHeight: hasBefore && hasProof ? "280px" : "360px",
                  minHeight: "140px",
                }}
              />
            </div>
          )}
        </div>
      ) : (
        <div
          className="grid grid-cols-1 md:grid-cols-2 gap-5 px-4 md:px-6 pb-5"
          style={{
            borderTop: "1px solid rgba(255,255,255,0.06)",
            paddingTop: "1.25rem",
          }}
        >
          {/* Sportybet-style card */}
          <div>
            <p
              className="text-xs font-semibold text-center mb-3"
              style={{ color: "#a1a1aa" }}
            >
              Our Prediction
            </p>
            <div
              className="rounded-xl overflow-hidden"
              style={{ border: "1px solid rgba(255,255,255,0.08)" }}
            >
              {/* Header bar */}
              <div
                className="px-4 py-3 flex justify-between items-center"
                style={{ background: "#ff4500" }}
              >
                <span className="font-black text-sm tracking-wider text-white">
                  SportyBet
                </span>
                <div className="text-right text-xs text-white/80">
                  <div>Betslip</div>
                  <div>
                    {new Date(prediction.date).toLocaleDateString("en-GB")}
                  </div>
                </div>
              </div>
              {/* Body */}
              <div className="p-4" style={{ background: "#1a1a24" }}>
                <p
                  className="text-center text-xs mb-1"
                  style={{ color: "#52525b" }}
                >
                  Booking Code
                </p>
                <p
                  className="text-center font-black text-xl tracking-widest mb-4"
                  style={{ color: "#f59e0b" }}
                >
                  {prediction.content || "—"}
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span style={{ color: "#52525b" }}>Odds</span>
                    <span
                      className="font-bold"
                      style={{ color: "#ff4500" }}
                    >
                      {prediction.odds}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span style={{ color: "#52525b" }}>League</span>
                    <span
                      className="font-medium"
                      style={{ color: "#a1a1aa" }}
                    >
                      {prediction.league}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Result panel */}
          <div>
            <p
              className="text-xs font-semibold text-center mb-3"
              style={{ color: isWin ? "#10b981" : "#ef4444" }}
            >
              Actual Result:{" "}
              <span className="font-black">{isWin ? "WON" : "LOST"}</span>
            </p>
            <div
              className="rounded-xl h-full flex flex-col items-center justify-center py-8 px-4 text-center"
              style={{
                background: isWin
                  ? "rgba(16,185,129,0.07)"
                  : "rgba(239,68,68,0.07)",
                border: `1px solid ${
                  isWin
                    ? "rgba(16,185,129,0.18)"
                    : "rgba(239,68,68,0.18)"
                }`,
              }}
            >
              {isWin ? (
                <CheckCircle2
                  size={48}
                  className="mb-3"
                  style={{ color: "#10b981" }}
                />
              ) : (
                <XCircle
                  size={48}
                  className="mb-3"
                  style={{ color: "#ef4444" }}
                />
              )}
              <p
                className="font-black text-2xl mb-2"
                style={{ color: isWin ? "#10b981" : "#ef4444" }}
              >
                {isWin ? "Big Win!" : "Better luck next time"}
              </p>
              <p className="text-sm" style={{ color: "#52525b" }}>
                {prediction.match}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div
        className="flex items-center justify-between px-4 md:px-6 py-3"
        style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          background: "#111117",
        }}
      >
        <span className="text-xs" style={{ color: "#52525b" }}>
          {prediction.league}
        </span>
        <span
          className="text-xs font-semibold flex items-center gap-1"
          style={{ color: isWin ? "#10b981" : "#ef4444" }}
        >
          {isWin ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
          {isWin ? "Prediction correct" : "Prediction missed"}
        </span>
      </div>
    </div>
  );
}
