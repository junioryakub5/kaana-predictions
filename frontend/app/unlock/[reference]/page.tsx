"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle, Calendar, Copy, Check, XCircle, Loader2, Zap, ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getUnlockedPrediction } from "@/lib/api";
import { UnlockData } from "@/lib/types";

export default function UnlockPage() {
  const params    = useParams();
  const router    = useRouter();
  const reference = params.reference as string;

  const [data, setData]       = useState<UnlockData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [copied, setCopied]   = useState(false);

  useEffect(() => {
    if (!reference) return;
    const fetchData = async () => {
      try {
        const result = await getUnlockedPrediction(reference);
        setData(result);
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          "Access denied. Payment reference not found or expired.";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [reference]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-24 pb-16 relative z-10" style={{ background: "#09090b" }}>

        {/* Decorative orbs */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
          <div
            className="absolute -top-40 right-0 w-96 h-96 rounded-full opacity-20"
            style={{ background: "radial-gradient(circle, rgba(255,69,0,0.3) 0%, transparent 70%)", filter: "blur(60px)" }}
          />
          <div
            className="absolute bottom-0 left-0 w-80 h-80 rounded-full opacity-10"
            style={{ background: "radial-gradient(circle, rgba(168,85,247,0.4) 0%, transparent 70%)", filter: "blur(60px)" }}
          />
        </div>

        <div className="page-container max-w-2xl mx-auto relative z-10">

          {/* Back button */}
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 mb-8 text-sm transition-colors"
            style={{ color: "#52525b" }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#a1a1aa"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#52525b"}
          >
            <ArrowLeft size={16} />
            Back to predictions
          </button>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(255,69,0,0.1)", border: "1px solid rgba(255,69,0,0.2)" }}
              >
                <Loader2 size={28} style={{ color: "#ff4500" }} className="animate-spin" />
              </div>
              <p style={{ color: "#a1a1aa" }} className="text-sm">Unlocking your prediction...</p>
            </div>
          ) : error ? (
            <div className="text-center py-32">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
              >
                <XCircle size={40} style={{ color: "#ef4444" }} />
              </div>
              <h1 className="font-brand text-2xl font-bold mb-3" style={{ color: "#ef4444" }}>
                Access Denied
              </h1>
              <p className="mb-8 max-w-sm mx-auto text-sm" style={{ color: "#a1a1aa" }}>{error}</p>
              <button onClick={() => router.push("/")} className="btn-primary">
                Go Back Home
              </button>
            </div>
          ) : data ? (
            <div className="animate-fadeInUp">

              {/* Success Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center mb-5 relative">
                  <div
                    className="absolute inset-0 rounded-full animate-ping opacity-20"
                    style={{ background: "#ff4500", animationDuration: "2s" }}
                  />
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center relative"
                    style={{ background: "linear-gradient(135deg, #ff4500, #ff7043)" }}
                  >
                    <CheckCircle size={36} className="text-white" />
                  </div>
                </div>
                <h1 className="font-brand text-3xl font-bold mb-2" style={{ color: "#f4f4f5" }}>
                  Prediction{" "}
                  <span className="gradient-text">Unlocked!</span>
                </h1>
                <p className="text-sm" style={{ color: "#a1a1aa" }}>
                  Payment verified — your premium tip is ready below
                </p>
              </div>

              {/* Access Info Banner */}
              <div
                className="rounded-2xl p-4 mb-6 flex items-center gap-4"
                style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)" }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.2)" }}
                >
                  <Zap size={17} style={{ color: "#10b981" }} />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "#10b981" }}>
                    Permanent Access Granted
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "#52525b" }}>
                    Purchased by {data.payment.email}
                  </p>
                </div>
              </div>

              {/* Main Prediction Card */}
              <div className="card-glass overflow-hidden mb-6">

                {/* Card Header */}
                <div
                  className="px-6 py-5"
                  style={{
                    background: "rgba(255,69,0,0.04)",
                    borderBottom: "1px solid rgba(255,69,0,0.1)",
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="font-bold text-xl mb-1.5" style={{ color: "#f4f4f5" }}>
                        {data.prediction.match}
                      </h2>
                      <div className="flex items-center gap-3 text-sm" style={{ color: "#52525b" }}>
                        <span className="flex items-center gap-1.5">
                          <Calendar size={13} />
                          {new Date(data.prediction.date).toLocaleDateString("en-GB", {
                            weekday: "long", day: "numeric", month: "long",
                          })}
                        </span>
                        <span>·</span>
                        <span>{data.prediction.league}</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <span
                        className="text-xs font-black px-3 py-1.5 rounded-lg inline-block mb-1"
                        style={{ background: "rgba(255,69,0,0.12)", color: "#ff4500", border: "1px solid rgba(255,69,0,0.25)" }}
                      >
                        {data.prediction.oddsCategory} ODDS
                      </span>
                      <p className="text-xs" style={{ color: "#52525b" }}>
                        Total: <strong style={{ color: "#ff4500" }}>{data.prediction.odds}</strong>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="px-6 py-6">
                  {/* Prediction content box */}
                  <div
                    className="rounded-xl p-5 mb-4"
                    style={{ background: "#1a1a24", border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#52525b" }}>
                        Prediction Content
                      </p>
                      <button
                        onClick={() => copyToClipboard(data.prediction.content || "")}
                        className="flex items-center gap-1.5 text-xs transition-colors px-3 py-1.5 rounded-lg"
                        style={{
                          color: copied ? "#10b981" : "#a1a1aa",
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.06)",
                        }}
                      >
                        {copied ? (
                          <><Check size={12} /> Copied!</>
                        ) : (
                          <><Copy size={12} /> Copy</>
                        )}
                      </button>
                    </div>
                    <p className="leading-relaxed whitespace-pre-wrap text-sm" style={{ color: "#d4d4d8" }}>
                      {data.prediction.content || "No content provided."}
                    </p>
                  </div>

                  {/* Bet Slip Image */}
                  {data.prediction.imageUrl && (
                    <div className="rounded-xl overflow-hidden mt-4" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={data.prediction.imageUrl}
                        alt={`Bet slip for ${data.prediction.match}`}
                        className="w-full object-cover"
                      />
                    </div>
                  )}
                </div>

                {/* Card Footer */}
                <div
                  className="px-6 py-3 flex items-center justify-between"
                  style={{ borderTop: "1px solid rgba(255,255,255,0.06)", background: "#0d0d11" }}
                >
                  <span className="text-xs font-mono" style={{ color: "#52525b" }}>
                    ref: {reference}
                  </span>
                  <span className="text-xs font-semibold" style={{ color: "#a1a1aa" }}>
                    GHS {data.payment.amount} paid
                  </span>
                </div>
              </div>

              {/* CTA buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={() => router.push("/")} className="btn-outline-gold flex-1">
                  View More Tips
                </button>
                <button onClick={() => router.push("/history")} className="btn-outline flex-1">
                  Past Results
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </main>
      <Footer />
    </>
  );
}
