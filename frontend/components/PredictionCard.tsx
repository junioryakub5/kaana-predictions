"use client";

import { useState, useEffect } from "react";
import React from "react";
import {
  Calendar, Lock, X, Loader2, Shield, Zap,
  CheckCircle, Copy, Check, Trophy, RefreshCcw, Mail, ExternalLink,
  CheckCircle2,
} from "lucide-react";
import { Prediction } from "@/lib/types";
import { initiatePayment, verifyPayment, getUnlockedPrediction, restoreAccess } from "@/lib/api";

// ── Bet slip image thumbnail + lightbox ────────────────────────────────────────
function BetSlipImage({ src, alt }: { src: string; alt: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="px-5 pt-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="relative w-full rounded-xl overflow-hidden group cursor-zoom-in"
          style={{ height: "120px", background: "#111117", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt} className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-110" />
          <div
            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{ background: "rgba(0,0,0,0.7)" }}
          >
            <span
              className="text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5"
              style={{ background: "#ff4500", color: "#ffffff" }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
              View Full Slip
            </span>
          </div>
        </button>
        <p className="text-center text-[10px] mt-1.5" style={{ color: "#52525b" }}>Tap to view full bet slip</p>
      </div>

      {/* Lightbox */}
      {open && (
        <div
          className="fixed inset-0 z-[9999] overflow-y-auto"
          style={{ background: "rgba(0,0,0,0.92)" }}
          onClick={() => setOpen(false)}
        >
          <button
            onClick={() => setOpen(false)}
            className="fixed top-4 right-4 text-white rounded-full w-10 h-10 flex items-center justify-center z-[10000]"
            style={{ background: "rgba(255,69,0,0.9)" }}
          >
            <X size={18} />
          </button>
          <div className="min-h-full flex items-center justify-center p-4 py-12" onClick={e => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={alt} className="rounded-2xl shadow-2xl" style={{ maxWidth: "100%", width: "auto", height: "auto" }} />
          </div>
        </div>
      )}
    </>
  );
}

// Paystack public key — must be set via NEXT_PUBLIC_PAYSTACK_KEY env var
const PAYSTACK_KEY = process.env.NEXT_PUBLIC_PAYSTACK_KEY;
if (!PAYSTACK_KEY) {
  console.error('[Kaana] NEXT_PUBLIC_PAYSTACK_KEY is not set. Payment will not work.');
}

// Load Paystack v2 inline.js dynamically
function loadPaystack(): Promise<void> {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).PaystackPop) return resolve();
    const SCRIPT_URL = "https://js.paystack.co/v2/inline.js";
    if (document.querySelector(`script[src="${SCRIPT_URL}"]`)) {
      const poll = setInterval(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((window as any).PaystackPop) { clearInterval(poll); resolve(); }
      }, 100);
      setTimeout(() => { clearInterval(poll); reject(new Error("Paystack timed out")); }, 10000);
      return;
    }
    const s = document.createElement("script");
    s.src = SCRIPT_URL;
    s.async = true;
    s.onerror = () => reject(new Error("Could not load Paystack script. Check your internet connection."));
    s.onload = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((window as any).PaystackPop) return resolve();
      const poll = setInterval(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((window as any).PaystackPop) { clearInterval(poll); resolve(); }
      }, 50);
      setTimeout(() => { clearInterval(poll); reject(new Error("PaystackPop not ready after load")); }, 6000);
    };
    document.head.appendChild(s);
  });
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface UnlockedData {
  content: string;
  bookingCode: string;
  tips: string[];
  imageUrl: string;
  proofImageUrl: string;
  reference: string;
}

interface Props {
  prediction: Prediction;
  animationDelay?: number;
}

// ── Accent colours per odds category ─────────────────────────────────────────
const ACCENT: Record<string, { bg: string; text: string; glow: string; border: string }> = {
  "2+":  { bg: "rgba(255,69,0,0.08)",    text: "#ff4500", glow: "rgba(255,69,0,0.2)",    border: "rgba(255,69,0,0.25)" },
  "5+":  { bg: "rgba(245,158,11,0.08)",  text: "#f59e0b", glow: "rgba(245,158,11,0.2)",  border: "rgba(245,158,11,0.25)" },
  "10+": { bg: "rgba(168,85,247,0.08)",  text: "#a855f7", glow: "rgba(168,85,247,0.2)",  border: "rgba(168,85,247,0.25)" },
  "20+": { bg: "rgba(239,68,68,0.08)",   text: "#ef4444", glow: "rgba(239,68,68,0.2)",   border: "rgba(239,68,68,0.25)" },
};

// ── Exchange rate: 1 GHS → NGN (update as needed) ────────────────────────────
const GHS_TO_NGN = 125;

// ── localStorage helpers ──────────────────────────────────────────────────────
const lsKey    = (id: string) => `bt_unlocked_${id}`;
const lsRefKey = (id: string) => `bt_ref_${id}`;

function saveUnlocked(predId: string, data: UnlockedData) {
  try {
    localStorage.setItem(lsRefKey(predId), data.reference);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { imageUrl: _img, ...rest } = data;
    localStorage.setItem(lsKey(predId), JSON.stringify(rest));
  } catch { /* quota exceeded */ }
}

function loadUnlocked(id: string): Omit<UnlockedData, "imageUrl"> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(lsKey(id));
    if (raw) return JSON.parse(raw) as Omit<UnlockedData, "imageUrl">;
    const ref = localStorage.getItem(lsRefKey(id));
    if (ref) return { content: "", bookingCode: "", tips: [], reference: ref, proofImageUrl: "" };
    return null;
  } catch { return null; }
}

// ── Country Select Modal ──────────────────────────────────────────────────────
function CountrySelectModal({
  prediction,
  onGhana,
  onNigeria,
  onClose,
}: {
  prediction: Prediction;
  onGhana: () => void;
  onNigeria: () => void;
  onClose: () => void;
}) {
  const acc = ACCENT[prediction.oddsCategory] || ACCENT["2+"];
  const ngn = Math.round(prediction.price * GHS_TO_NGN);

  useEffect(() => {
    const scrollY = window.scrollY;
    const body = document.body;
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.overflow = "hidden";
    return () => {
      body.style.position = "";
      body.style.top = "";
      body.style.left = "";
      body.style.right = "";
      body.style.overflow = "";
      window.scrollTo(0, scrollY);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      onClick={onClose}
      style={{ overscrollBehavior: "contain" }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 backdrop-blur-md" style={{ background: "rgba(0,0,0,0.7)" }} />

      {/* Modal card */}
      <div
        className="relative w-full max-w-sm overflow-hidden"
        style={{
          background: "#111117",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "20px",
          boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top accent line */}
        <div style={{ height: "3px", background: acc.text, width: "100%" }} />

        {/* Header */}
        <div
          className="px-6 pt-5 pb-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#111117" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-base" style={{ color: "#f4f4f5" }}>Choose your country</h2>
              <p className="text-xs mt-0.5" style={{ color: "#a1a1aa" }}>Select to continue with payment</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
              style={{ color: "#52525b", background: "rgba(255,255,255,0.04)" }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Options */}
        <div className="px-6 py-5 space-y-3">
          {/* Ghana */}
          <button
            onClick={onGhana}
            className="w-full flex items-center justify-between px-4 py-4 rounded-2xl transition-all duration-200 active:scale-[0.98]"
            style={{
              background: "#1a1a24",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
            onMouseLeave={e => (e.currentTarget.style.background = "#1a1a24")}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🇬🇭</span>
              <div className="text-left">
                <p className="font-semibold text-sm" style={{ color: "#f4f4f5" }}>Ghana</p>
                <p className="text-xs" style={{ color: "#a1a1aa" }}>GHS {prediction.price} — Mobile Money / Card</p>
              </div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#52525b" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
          </button>

          {/* Nigeria */}
          <button
            onClick={onNigeria}
            className="w-full flex items-center justify-between px-4 py-4 rounded-2xl transition-all duration-200 active:scale-[0.98]"
            style={{
              background: "#1a1a24",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
            onMouseLeave={e => (e.currentTarget.style.background = "#1a1a24")}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🇳🇬</span>
              <div className="text-left">
                <p className="font-semibold text-sm" style={{ color: "#f4f4f5" }}>Nigeria</p>
                <p className="text-xs" style={{ color: "#a1a1aa" }}>₦{ngn.toLocaleString()} — Telegram Payment</p>
              </div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#52525b" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>

        {/* Cancel */}
        <div className="px-6 pb-5">
          <button
            onClick={onClose}
            className="w-full py-3 text-sm font-medium rounded-2xl transition-all"
            style={{ background: "rgba(255,255,255,0.04)", color: "#52525b", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Payment Modal ─────────────────────────────────────────────────────────────
type ModalTab = "pay" | "restore";
type PayStep  = "idle" | "paying" | "verifying";

function PaymentModal({
  prediction,
  onSuccess,
  onClose,
}: {
  prediction: Prediction;
  onSuccess: (data: UnlockedData) => void;
  onClose: () => void;
}) {
  const [tab, setTab]       = useState<ModalTab>("pay");
  const [email, setEmail]   = useState("");
  const [step, setStep]     = useState<PayStep>("idle");
  const [error, setError]   = useState("");

  const [restoreEmail, setRestoreEmail] = useState("");
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreError, setRestoreError] = useState("");

  // Lock body scroll
  useEffect(() => {
    const scrollY = window.scrollY;
    const body = document.body;
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.overflow = 'hidden';
    return () => {
      body.style.position = '';
      body.style.top = '';
      body.style.left = '';
      body.style.right = '';
      body.style.overflow = '';
      window.scrollTo(0, scrollY);
    };
  }, []);

  const acc = ACCENT[prediction.oddsCategory] || ACCENT["2+"];

  const finalizeUnlock = async (reference: string) => {
    setStep("verifying");
    setError("");
    try {
      const unlock = await getUnlockedPrediction(reference);
      const data: UnlockedData = {
        content:      unlock.prediction.content     || "",
        bookingCode:  (unlock.prediction as {bookingCode?: string}).bookingCode || "",
        tips:         (unlock.prediction as {tips?: string[]}).tips        || [],
        imageUrl:     unlock.prediction.imageUrl    || "",
        proofImageUrl:(unlock.prediction as {proofImageUrl?: string}).proofImageUrl || "",
        reference,
      };
      saveUnlocked(prediction._id, data);
      onSuccess(data);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        "Verification failed. Please contact support.";
      setError(`${msg} (ref: ${reference})`);
      setStep("idle");
    }
  };

  const handlePay = async () => {
    if (!email || !email.includes("@")) { setError("Please enter a valid email address."); return; }
    setError("");
    setStep("paying");
    try {
      await loadPaystack();
      const initResult = await initiatePayment(email, prediction._id);
      const ref = initResult.reference;
      const accessCode = initResult.accessCode;

      if (!accessCode) throw new Error("Could not initialize payment. Please try again.");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const popup = new (window as any).PaystackPop();
      let settled = false;
      const timeout = setTimeout(() => {
        if (!settled) {
          settled = true;
          setStep("idle");
          setError("Paystack checkout couldn't load. Please check your internet connection and try again.");
        }
      }, 60000);

      popup.resumeTransaction(accessCode, {
        onSuccess: async (transaction: { reference: string }) => {
          settled = true;
          clearTimeout(timeout);
          try {
            await verifyPayment(ref, prediction._id, email);
            await finalizeUnlock(ref);
          } catch (err: unknown) {
            const msg =
              (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
              "Verification failed. Contact support.";
            setError(`${msg} (ref: ${ref})`);
            setStep("idle");
          }
        },
        onCancel: () => {
          settled = true;
          clearTimeout(timeout);
          setStep("idle");
        },
      });
    } catch (err: unknown) {
      const msg = (err as Error)?.message || "Failed to open payment. Please try again.";
      setError(msg);
      setStep("idle");
    }
  };

  const handleRestore = async () => {
    if (!restoreEmail || !restoreEmail.includes("@")) {
      setRestoreError("Please enter the email you used when you paid.");
      return;
    }
    setRestoreError("");
    setRestoreLoading(true);
    try {
      const unlock = await restoreAccess(restoreEmail, prediction._id);
      const data: UnlockedData = {
        content:      unlock.prediction.content     || "",
        bookingCode:  (unlock.prediction as {bookingCode?: string}).bookingCode || "",
        tips:         (unlock.prediction as {tips?: string[]}).tips        || [],
        imageUrl:     unlock.prediction.imageUrl    || "",
        proofImageUrl:(unlock.prediction as {proofImageUrl?: string}).proofImageUrl || "",
        reference:    unlock.payment.reference,
      };
      saveUnlocked(prediction._id, data);
      onSuccess(data);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        "No active payment found. Please complete your payment.";
      setRestoreError(msg);
    } finally {
      setRestoreLoading(false);
    }
  };

  // Verifying overlay
  if (step === "verifying") {
    return (
      <div
        className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        style={{ overscrollBehavior: "contain" }}
      >
        <div className="absolute inset-0 backdrop-blur-md" style={{ background: "rgba(0,0,0,0.7)" }} />
        <div
          className="relative w-full max-w-sm overflow-hidden flex flex-col items-center justify-center gap-5 py-14 px-8"
          style={{
            background: "#111117",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "20px",
            boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
          }}
        >
          <div style={{ height: "3px", background: acc.text, width: "100%", position: "absolute", top: 0, left: 0 }} />
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: acc.bg, border: `1px solid ${acc.border}` }}
          >
            <Loader2 size={28} style={{ color: acc.text }} className="animate-spin" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-base mb-1" style={{ color: "#f4f4f5" }}>Verifying Payment…</p>
            <p className="text-xs" style={{ color: "#a1a1aa" }}>Confirming with Paystack and unlocking your prediction</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      onClick={onClose}
      style={{ overscrollBehavior: "contain" }}
    >
      <div className="absolute inset-0 backdrop-blur-md" style={{ background: "rgba(0,0,0,0.7)" }} />

      <div
        className="relative w-full max-w-sm overflow-hidden"
        style={{
          background: "#111117",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "20px",
          boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top accent line */}
        <div style={{ height: "3px", background: acc.text, width: "100%" }} />

        {/* Header */}
        <div className="px-6 pt-5 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] mb-1" style={{ color: "#a1a1aa" }}>{prediction.match}</p>
              <p className="text-2xl font-bold" style={{ color: acc.text }}>GHS {prediction.price}</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors mt-0.5 flex-shrink-0"
              style={{ color: "#52525b", background: "rgba(255,255,255,0.04)" }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Pill tabs */}
        <div className="px-6 pt-4 pb-2 flex gap-2">
          {(["pay", "restore"] as ModalTab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(""); setRestoreError(""); }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold rounded-xl transition-all duration-200"
              style={{
                background: tab === t ? acc.text : "rgba(255,255,255,0.04)",
                color: tab === t ? "#ffffff" : "#a1a1aa",
                border: tab === t ? "none" : "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {t === "pay"
                ? <><Lock size={11} />Pay</>
                : <><RefreshCcw size={11} />Restore Access</>}
            </button>
          ))}
        </div>

        {tab === "pay" ? (
          <>
            {/* Perks */}
            <div className="px-6 pt-2 pb-3 flex gap-5">
              {[{ icon: <Shield size={12} />, label: "Secure payment" }, { icon: <Zap size={12} />, label: "Instant access" }]
                .map(f => (
                  <div key={f.label} className="flex items-center gap-1.5 text-xs" style={{ color: "#52525b" }}>{f.icon}{f.label}</div>
                ))}
            </div>

            {/* Form */}
            <div className="px-6 pb-6 space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "#a1a1aa" }}>Your email address</label>
                <input
                  type="email" placeholder="you@example.com" value={email} autoFocus
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handlePay()}
                  className="input-field"
                  disabled={step === "paying"}
                />
              </div>
              {error && <p className="text-red-400 text-xs leading-relaxed">{error}</p>}
              <button
                onClick={handlePay} disabled={step === "paying"}
                className="w-full flex items-center justify-center gap-2 font-bold text-sm py-3.5 rounded-2xl transition-all duration-300 active:scale-[0.97]"
                style={{
                  background: step === "paying" ? "rgba(255,69,0,0.4)" : "#ff4500",
                  color: "#ffffff",
                  boxShadow: step === "paying" ? "none" : "0 4px 20px rgba(255,69,0,0.35)",
                }}
              >
                {step === "paying"
                  ? (<><Loader2 size={16} className="animate-spin" />Opening Paystack…</>)
                  : (<><Lock size={15} />Pay &amp; Unlock — GHS {prediction.price}</>)}
              </button>
              <p className="text-center text-[11px]" style={{ color: "#52525b" }}>
                One-time payment · Powered by Paystack
              </p>
            </div>
          </>
        ) : (
          /* Restore Access tab */
          <div className="px-6 py-5 space-y-4">
            <div
              className="rounded-xl p-4 flex gap-3"
              style={{ background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.15)" }}
            >
              <Mail size={16} className="flex-shrink-0 mt-0.5" style={{ color: "#a855f7" }} />
              <p className="text-xs leading-relaxed" style={{ color: "#a1a1aa" }}>
                Already paid for this prediction? Enter the email you used and we&apos;ll restore your access instantly — no need to pay again.
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#a1a1aa" }}>Email used at payment</label>
              <input
                type="email" placeholder="you@example.com" value={restoreEmail} autoFocus
                onChange={(e) => setRestoreEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRestore()}
                className="input-field"
                disabled={restoreLoading}
              />
            </div>
            {restoreError && <p className="text-red-400 text-xs leading-relaxed">{restoreError}</p>}
            <button
              onClick={handleRestore} disabled={restoreLoading}
              className="w-full flex items-center justify-center gap-2 font-bold text-sm py-3.5 rounded-2xl transition-all duration-300 active:scale-[0.97]"
              style={{
                background: restoreLoading ? "rgba(168,85,247,0.4)" : "#a855f7",
                color: "#ffffff",
                boxShadow: restoreLoading ? "none" : "0 4px 20px rgba(168,85,247,0.3)",
              }}
            >
              {restoreLoading
                ? (<><Loader2 size={16} className="animate-spin" />Checking…</>)
                : (<><RefreshCcw size={15} />Restore My Access</>)}
            </button>
            <p className="text-center text-[11px]" style={{ color: "#52525b" }}>
              One-time payment — access never expires
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Nigeria Telegram Modal ─────────────────────────────────────────────────────
function NigeriaPaymentModal({
  prediction,
  onClose,
}: {
  prediction: Prediction;
  onClose: () => void;
}) {
  const acc = ACCENT[prediction.oddsCategory] || ACCENT["2+"];
  const ngn = Math.round(prediction.price * GHS_TO_NGN);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      onClick={onClose}
      style={{ overscrollBehavior: "contain" }}
    >
      <div className="absolute inset-0 backdrop-blur-md" style={{ background: "rgba(0,0,0,0.7)" }} />
      <div
        className="relative w-full max-w-sm overflow-hidden"
        style={{
          background: "#111117",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "20px",
          boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top accent line */}
        <div style={{ height: "3px", background: acc.text, width: "100%" }} />

        {/* Header */}
        <div className="px-6 pt-5 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">🇳🇬</span>
              <div>
                <h2 className="font-semibold text-sm" style={{ color: "#f4f4f5" }}>Pay via Transfer</h2>
                <p className="text-xs" style={{ color: "#a1a1aa" }}>Nigeria — Instant Access</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
              style={{ color: "#52525b", background: "rgba(255,255,255,0.04)" }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Info card */}
        <div className="px-6 pt-5">
          <div
            className="rounded-2xl px-5 py-4"
            style={{ background: "#1a1a24", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            {/* Amount row */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium" style={{ color: "#a1a1aa" }}>Amount to send</span>
              <span className="font-bold text-lg" style={{ color: "#f59e0b" }}>₦{ngn.toLocaleString()}</span>
            </div>
            <div className="h-px w-full mb-4" style={{ background: "rgba(255,255,255,0.06)" }} />
            {/* Bank details */}
            <div className="space-y-2.5">
              {([
                { label: "Bank", value: "Moniepoint MFB", highlight: false },
                { label: "Account Number", value: "7080706417", highlight: true },
                { label: "Account Name", value: "Atinuolaji Alakija", highlight: false },
              ] as { label: string; value: string; highlight: boolean }[]).map(({ label, value, highlight }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: "#52525b" }}>{label}</span>
                  <span
                    className="text-xs font-semibold"
                    style={{ color: highlight ? "#f59e0b" : "#f4f4f5", letterSpacing: highlight ? "0.06em" : undefined }}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Instruction */}
        <div className="px-6 pt-3">
          <p className="text-xs leading-relaxed text-center" style={{ color: "#52525b" }}>
            After sending, share your receipt on Telegram to get instant access.
          </p>
        </div>

        {/* Actions */}
        <div className="px-6 py-5 space-y-2.5">
          <a
            href="https://t.me/Tipster_kaana"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 font-bold text-sm py-3.5 rounded-2xl transition-all duration-300 active:scale-[0.97]"
            style={{
              background: "#10b981",
              color: "#ffffff",
              boxShadow: "0 4px 20px rgba(16,185,129,0.3)",
              display: "flex",
            }}
          >
            <ExternalLink size={15} />
            Send Receipt — @Tipster_kaana
          </a>
          <button
            onClick={onClose}
            className="w-full py-3 text-sm font-medium rounded-2xl transition-all"
            style={{
              background: "transparent",
              color: "#a1a1aa",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Unlocked card view ────────────────────────────────────────────────────────
function UnlockedCard({ prediction, unlocked }: { prediction: Prediction; unlocked: UnlockedData }) {
  const [copied, setCopied] = useState(false);
  const acc = ACCENT[prediction.oddsCategory] || ACCENT["2+"];

  const copyCode = () => {
    const text = unlocked.bookingCode || unlocked.content;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="card-glass overflow-hidden">
      {/* Unlocked success banner */}
      <div
        className="px-4 py-3 flex items-center gap-2.5"
        style={{
          background: "rgba(16,185,129,0.1)",
          borderBottom: "1px solid rgba(16,185,129,0.15)",
        }}
      >
        <CheckCircle size={15} className="flex-shrink-0" style={{ color: "#10b981" }} />
        <span className="text-xs font-bold tracking-wide" style={{ color: "#10b981" }}>
          Prediction Unlocked!
        </span>
        <span
          className="ml-auto text-[10px] font-bold px-2.5 py-0.5 rounded-lg"
          style={{ background: acc.bg, color: acc.text, border: `1px solid ${acc.border}` }}
        >
          {prediction.oddsCategory} ODDS
        </span>
      </div>

      {/* Bet-slip images: Before & After side by side */}
      {(unlocked.imageUrl || unlocked.proofImageUrl) && (
        <div className={`grid gap-1 ${
          unlocked.imageUrl && unlocked.proofImageUrl ? "grid-cols-2" : "grid-cols-1"
        }`}>
          {unlocked.imageUrl && (
            <div className="relative">
              {unlocked.proofImageUrl && (
                <span
                  className="absolute top-2 left-2 z-10 text-[10px] font-bold px-2 py-0.5 rounded-md"
                  style={{ background: "rgba(0,0,0,0.7)", color: "#fff" }}
                >
                  BEFORE
                </span>
              )}
              <BetSlipImage src={unlocked.imageUrl} alt={`Bet slip – ${prediction.match}`} />
            </div>
          )}
          {unlocked.proofImageUrl && (
            <div className="relative">
              {unlocked.imageUrl && (
                <span
                  className="absolute top-2 left-2 z-10 text-[10px] font-bold px-2 py-0.5 rounded-md"
                  style={{ background: "rgba(16,185,129,0.8)", color: "#fff" }}
                >
                  AFTER ✓
                </span>
              )}
              <BetSlipImage src={unlocked.proofImageUrl} alt={`Proof – ${prediction.match}`} />
            </div>
          )}
        </div>
      )}

      {/* Info */}
      <div className="px-5 pt-4">
        <h3 className="font-semibold text-base mb-0.5 line-clamp-1" style={{ color: "#f4f4f5" }}>{prediction.match}</h3>
        <p className="text-xs mb-4 flex items-center gap-1.5" style={{ color: "#a1a1aa" }}>
          <Calendar size={11} />
          {new Date(prediction.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
          {" · "}{prediction.league}
        </p>

        {/* Booking code */}
        {(unlocked.bookingCode || unlocked.content) && (
          <div
            className="rounded-xl mb-3 overflow-hidden"
            style={{ background: "#1a1a24", border: `1px solid ${acc.border}` }}
          >
            <div
              className="px-4 py-2.5 flex items-center justify-between"
              style={{ borderBottom: `1px solid ${acc.border}` }}
            >
              <div className="flex items-center gap-2">
                <Trophy size={13} style={{ color: acc.text }} />
                <span className="text-xs font-semibold" style={{ color: "#a1a1aa" }}>
                  {unlocked.bookingCode ? "Booking Code" : "Prediction Tip"}
                </span>
              </div>
              <button
                onClick={copyCode}
                className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-lg transition-all"
                style={{
                  background: copied ? "rgba(16,185,129,0.1)" : "rgba(255,255,255,0.04)",
                  color: copied ? "#10b981" : "#a1a1aa",
                  border: copied ? "1px solid rgba(16,185,129,0.2)" : "1px solid rgba(255,255,255,0.06)",
                }}
              >
                {copied ? <><Check size={11} />Copied!</> : <><Copy size={11} />Copy</>}
              </button>
            </div>
            <p
              className="font-bold text-xl tracking-widest text-center py-4 px-4"
              style={{ color: acc.text, fontFamily: "monospace", letterSpacing: "0.15em" }}
            >
              {unlocked.bookingCode || unlocked.content}
            </p>
          </div>
        )}

        {/* Tips list */}
        {unlocked.tips && unlocked.tips.length > 0 && (
          <div className="mb-4 space-y-1.5">
            <p className="text-xs font-medium mb-2" style={{ color: "#52525b" }}>What to bet:</p>
            {unlocked.tips.map((tip, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs"
                style={{
                  background: "#1a1a24",
                  border: "1px solid rgba(255,255,255,0.04)",
                  color: "#f4f4f5",
                }}
              >
                <CheckCircle2 size={12} style={{ color: "#10b981" }} className="flex-shrink-0" />
                {tip}
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pb-4">
          <div className="flex items-center gap-2 text-xs" style={{ color: "#52525b" }}>
            <Calendar size={11} />
            <span>{prediction.league}</span>
            <span>·</span>
            <span>Odds: <span style={{ color: acc.text, fontWeight: 700 }}>{prediction.odds}</span></span>
          </div>
          <p className="text-[10px] flex items-center gap-1" style={{ color: "#52525b" }}>
            <CheckCircle size={10} style={{ color: "#10b981" }} />
            Access never expires
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Locked card view ──────────────────────────────────────────────────────────
function LockedCard({
  prediction,
  animationDelay,
  onClickUnlock,
}: {
  prediction: Prediction;
  animationDelay: number;
  onClickUnlock: () => void;
}) {
  const acc = ACCENT[prediction.oddsCategory] || ACCENT["2+"];
  const hasImage = !!prediction.previewImageUrl;

  return (
    <div
      className="card-glass overflow-hidden opacity-0 animate-fadeInUp cursor-pointer group"
      style={{ animationDelay: `${animationDelay}ms`, animationFillMode: "forwards" }}
      onClick={onClickUnlock}
    >
      {/* Image / locked area */}
      <div
        className="relative h-52 overflow-hidden"
        style={{ background: "#0d0d12" }}
      >
        {hasImage ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={prediction.previewImageUrl!}
            alt="Prediction slip preview"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 md:group-hover:scale-110"
            style={{
              filter: "blur(14px) brightness(0.5)",
              transform: "scale(1.1)",
            }}
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, #111117 0%, #0d0d12 60%, ${acc.bg} 100%)`,
            }}
          >
            {/* Pattern overlay */}
            <div
              className="absolute inset-0 opacity-5"
              style={{
                backgroundImage: `repeating-linear-gradient(45deg, ${acc.text} 0, ${acc.text} 1px, transparent 0, transparent 50%)`,
                backgroundSize: "24px 24px",
              }}
            />
            <span
              className="relative z-10 text-4xl font-black opacity-10 select-none"
              style={{ color: acc.text, fontFamily: "monospace" }}
            >
              {prediction.oddsCategory}
            </span>
          </div>
        )}

        {/* Bottom gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(180deg, transparent 0%, rgba(9,9,11,0.85) 100%)",
          }}
        />

        {/* Odds badge */}
        <span
          className="absolute top-3 left-3 z-10 text-[10px] font-bold px-3 py-1 rounded-full shadow-sm"
          style={{
            background: acc.bg,
            color: acc.text,
            border: `1px solid ${acc.border}`,
          }}
        >
          {prediction.oddsCategory} ODDS
        </span>

        {/* Lock icon + CTA */}
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 md:group-hover:scale-110"
            style={{
              background: "rgba(9,9,11,0.7)",
              border: `1px solid rgba(255,255,255,0.1)`,
              boxShadow: `0 0 0 0 ${acc.glow}`,
            }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = `0 0 20px ${acc.glow}`)}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = `0 0 0 0 ${acc.glow}`)}
          >
            <Lock size={22} style={{ color: acc.text }} strokeWidth={2} />
          </div>
          <span
            className="text-xs font-semibold px-4 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0"
            style={{ background: acc.text, color: "#ffffff" }}
          >
            Click to unlock
          </span>
        </div>
      </div>

      {/* Card body */}
      <div className="px-5 py-4" style={{ background: "#111117" }}>
        <h3
          className="font-bold text-base mb-1 line-clamp-1"
          style={{ color: "#f4f4f5" }}
        >
          {prediction.match}
        </h3>
        <div className="flex items-center gap-1.5 text-xs mb-3" style={{ color: "#a1a1aa" }}>
          <Calendar size={12} />
          <span>
            {new Date(prediction.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
          </span>
          {prediction.league && (<><span className="mx-0.5">·</span><span className="truncate">{prediction.league}</span></>)}
        </div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs" style={{ color: "#a1a1aa" }}>Odds:</span>
            <span className="font-bold text-sm" style={{ color: acc.text }}>{prediction.odds}</span>
          </div>
          <span className="font-bold text-lg" style={{ color: acc.text }}>GHS {prediction.price}</span>
        </div>

        {/* CTA bar */}
        <div
          className="w-full text-center text-xs font-semibold py-3 rounded-xl transition-all duration-300 group-hover:shadow-lg"
          style={{
            background: acc.bg,
            border: `1px solid ${acc.border}`,
            color: acc.text,
          }}
        >
          🔒 Unlock — GHS {prediction.price}
        </div>
      </div>
    </div>
  );
}

// ── Root export ───────────────────────────────────────────────────────────────
export default function PredictionCard({ prediction, animationDelay = 0 }: Props) {
  const [unlocked, setUnlocked]           = useState<UnlockedData | null>(null);
  const [countryModalOpen, setCountryModalOpen] = useState(false);
  const [ghanaModalOpen, setGhanaModalOpen]     = useState(false);
  const [nigeriaModalOpen, setNigeriaModalOpen] = useState(false);

  useEffect(() => {
    const cached = loadUnlocked(prediction._id);
    if (!cached) return;
    setUnlocked({ imageUrl: "", ...cached });
    if (cached.reference) {
      getUnlockedPrediction(cached.reference).then(unlock => {
        const fresh: UnlockedData = {
          content:      unlock.prediction.content     || cached.content     || "",
          bookingCode:  (unlock.prediction as {bookingCode?: string}).bookingCode || cached.bookingCode || "",
          tips:         (unlock.prediction as {tips?: string[]}).tips        || cached.tips        || [],
          imageUrl:     unlock.prediction.imageUrl    || "",
          proofImageUrl:(unlock.prediction as {proofImageUrl?: string}).proofImageUrl || "",
          reference:    cached.reference,
        };
        saveUnlocked(prediction._id, fresh);
        setUnlocked(fresh);
      }).catch(() => { /* keep showing cached */ });
    }
  }, [prediction._id]);

  const handleSuccess = (data: UnlockedData) => {
    setUnlocked(data);
    setGhanaModalOpen(false);
  };

  if (unlocked) {
    return (
      <div
        className="opacity-0 animate-fadeInUp"
        style={{ animationDelay: `${animationDelay}ms`, animationFillMode: "forwards" }}
      >
        <UnlockedCard prediction={prediction} unlocked={unlocked} />
      </div>
    );
  }

  return (
    <>
      <LockedCard
        prediction={prediction}
        animationDelay={animationDelay}
        onClickUnlock={() => setCountryModalOpen(true)}
      />

      {/* Step 1 — Country selector */}
      {countryModalOpen && (
        <CountrySelectModal
          prediction={prediction}
          onGhana={() => { setCountryModalOpen(false); setGhanaModalOpen(true); }}
          onNigeria={() => { setCountryModalOpen(false); setNigeriaModalOpen(true); }}
          onClose={() => setCountryModalOpen(false)}
        />
      )}

      {/* Step 2a — Ghana: Paystack flow */}
      {ghanaModalOpen && (
        <PaymentModal
          prediction={prediction}
          onSuccess={handleSuccess}
          onClose={() => setGhanaModalOpen(false)}
        />
      )}

      {/* Step 2b — Nigeria: Telegram payment */}
      {nigeriaModalOpen && (
        <NigeriaPaymentModal
          prediction={prediction}
          onClose={() => setNigeriaModalOpen(false)}
        />
      )}
    </>
  );
}
