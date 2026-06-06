"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  LayoutDashboard, BookOpen, CreditCard, LogOut, Plus, Pencil, Trash2,
  Eye, EyeOff, Loader2, CheckCircle, XCircle, TrendingUp, DollarSign,
  FileText, Activity, ChevronLeft, ChevronRight, X, Upload, Search,
  Zap, Globe2, BarChart2, Inbox, Menu,
} from "lucide-react";
import {
  adminGetPredictions, adminCreatePrediction, adminUpdatePrediction,
  adminDeletePrediction, adminGetStats, adminGetPayments, adminUploadImage,
} from "@/lib/api";
import { Prediction, RecentActivity, PaymentRecord } from "@/lib/types";

// ─── Constants ────────────────────────────────────────────────────────────────
const ODDS_CATEGORIES = ["2+ ODDS", "5+ ODDS", "10+ ODDS", "20+ ODDS"] as const;
const ODDS_VALUES: Record<string, string> = {
  "2+ ODDS": "2+", "5+ ODDS": "5+", "10+ ODDS": "10+", "20+ ODDS": "20+",
};
const PAGE_SIZE = 10;

const EMPTY_FORM = {
  match: "", league: "", odds: "", oddsCategory: "2+",
  price: 25, content: "", bookingCode: "", tips: "", imageUrl: "", proofImageUrl: "",
  date: new Date().toISOString().split("T")[0],
  status: "active" as "active" | "completed", result: null as "win" | "loss" | null,
  startDay: "", endDay: "",
};

type Section = "overview" | "slips" | "payments";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, React.CSSProperties> = {
    active: { background: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.25)" },
    completed: { background: "rgba(99,102,241,0.12)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.25)" },
    success: { background: "rgba(16,185,129,0.12)", color: "#10b981", border: "1px solid rgba(16,185,129,0.25)" },
    pending: { background: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.25)" },
    failed: { background: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.25)" },
    win: { background: "rgba(16,185,129,0.12)", color: "#10b981", border: "1px solid rgba(16,185,129,0.25)" },
    loss: { background: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.25)" },
  };
  const fallback: React.CSSProperties = {
    background: "rgba(255,255,255,0.06)", color: "#a1a1aa", border: "1px solid rgba(255,255,255,0.1)",
  };
  return (
    <span
      className="text-xs font-semibold px-2.5 py-1 rounded-full"
      style={styles[status] ?? fallback}
    >
      {status}
    </span>
  );
}

function OddsBadge({ cat }: { cat: string }) {
  const colors: Record<string, string> = {
    "2+": "#ff4500", "5+": "#f59e0b",
    "10+": "#a78bfa", "20+": "#ef4444",
  };
  return (
    <span className="font-bold text-xs" style={{ color: colors[cat] ?? "#ff4500" }}>
      {cat}
    </span>
  );
}

function Pagination({ page, pages, onPage }: { page: number; pages: number; onPage: (n: number) => void }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button
        onClick={() => onPage(page - 1)}
        disabled={page <= 1}
        className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-40"
        style={{ background: "#1a1a24", color: "#a1a1aa", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        <ChevronLeft size={15} /> Previous
      </button>
      <div className="flex items-center gap-1">
        {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            onClick={() => onPage(n)}
            className="w-9 h-9 rounded-xl text-sm font-semibold transition-colors"
            style={
              n === page
                ? { background: "#ff4500", color: "#ffffff", border: "1px solid #ff4500" }
                : { background: "#1a1a24", color: "#52525b", border: "1px solid rgba(255,255,255,0.07)" }
            }
          >
            {n}
          </button>
        ))}
      </div>
      <button
        onClick={() => onPage(page + 1)}
        disabled={page >= pages}
        className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-40"
        style={{ background: "#1a1a24", color: "#a1a1aa", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        Next <ChevronRight size={15} />
      </button>
    </div>
  );
}

// ─── Login Screen ─────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: (token: string) => void }) {
  const [token, setToken] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) { setError("Please enter the admin token."); return; }
    setLoading(true); setError("");
    try {
      await adminGetPredictions(token.trim());
      sessionStorage.setItem("bt_admin_token", token.trim());
      onLogin(token.trim());
    } catch {
      setError("Invalid admin token. Access denied.");
    } finally { setLoading(false); }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: "#09090b" }}
    >
      <div className="w-full max-w-sm">
        {/* Card */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: "#111117",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {/* Top accent bar */}
          <div style={{ height: "3px", background: "#ff4500" }} />

          <div className="p-8">
            {/* Logo area */}
            <div className="flex flex-col items-center mb-8">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                style={{
                  background: "rgba(255,69,0,0.1)",
                  border: "1px solid rgba(255,69,0,0.2)",
                }}
              >
                <Zap size={26} style={{ color: "#ff4500" }} strokeWidth={2.2} />
              </div>
              <div className="text-center">
                <div
                  className="text-2xl font-bold leading-none"
                  style={{ fontFamily: "'Sora', sans-serif", letterSpacing: "-0.03em" }}
                >
                  <span style={{ color: "#f4f4f5" }}>Kaana</span>
                  <span style={{ color: "#ff4500" }}> Predictions</span>
                </div>
                <div
                  className="text-xs mt-1.5 font-medium tracking-widest uppercase"
                  style={{ color: "#52525b" }}
                >
                  Admin Portal
                </div>
              </div>
            </div>

            {/* Form heading */}
            <div className="mb-6">
              <h1
                className="text-xl font-bold mb-1"
                style={{ color: "#f4f4f5", fontFamily: "'Sora', sans-serif" }}
              >
                Admin Access
              </h1>
              <p className="text-sm" style={{ color: "#a1a1aa" }}>
                Enter your admin token to continue
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  className="block text-xs font-bold uppercase tracking-widest mb-2"
                  style={{ color: "rgba(255,69,0,0.7)" }}
                >
                  Admin Token
                </label>
                <div className="relative">
                  <input
                    type={show ? "text" : "password"}
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Enter admin token..."
                    autoFocus
                    className="input-field w-full pr-10"
                    style={{ paddingRight: "2.5rem" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShow(!show)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: "#52525b" }}
                    onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "#ff4500")}
                    onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "#52525b")}
                  >
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-sm flex items-center gap-1.5" style={{ color: "#f87171" }}>
                  <XCircle size={14} /> {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                {loading ? "Verifying..." : "Access Dashboard"}
              </button>
            </form>
          </div>
        </div>

        <p
          className="text-center text-xs mt-6"
          style={{ color: "#52525b" }}
        >
          Kaana Predictions · Admin Portal
        </p>
      </div>
    </div>
  );
}

// ─── Overview Section ─────────────────────────────────────────────────────────
function OverviewSection({ token }: { token: string }) {
  const [stats, setStats] = useState<{
    totalSlips: number; activeSlips: number; completedSlips: number;
    totalRevenue: number; totalSales: number; recentActivity: RecentActivity[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminGetStats(token).then(setStats).catch(console.error).finally(() => setLoading(false));
  }, [token]);

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 size={32} className="animate-spin" style={{ color: "#ff4500" }} />
    </div>
  );
  if (!stats) return (
    <div className="text-center py-24" style={{ color: "#a1a1aa" }}>
      Failed to load stats.
    </div>
  );

  const statCards = [
    { label: "Total Predictions", value: stats.totalSlips, icon: FileText, iconColor: "#ff4500", iconBg: "rgba(255,69,0,0.1)", iconBorder: "rgba(255,69,0,0.2)" },
    { label: "Active Slips", value: stats.activeSlips, icon: Activity, iconColor: "#10b981", iconBg: "rgba(16,185,129,0.1)", iconBorder: "rgba(16,185,129,0.2)" },
    { label: "Total Revenue", value: `GHS ${stats.totalRevenue.toFixed(2)}`, icon: DollarSign, iconColor: "#10b981", iconBg: "rgba(16,185,129,0.1)", iconBorder: "rgba(16,185,129,0.2)" },
    { label: "Win Rate", value: `${stats.totalSales > 0 ? Math.round((stats.completedSlips / stats.totalSlips) * 100) : 0}%`, icon: TrendingUp, iconColor: "#10b981", iconBg: "rgba(16,185,129,0.1)", iconBorder: "rgba(16,185,129,0.2)" },
  ];

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="card-glass p-5">
            <div className="flex items-center justify-between mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: s.iconBg, border: `1px solid ${s.iconBorder}` }}
              >
                <s.icon size={18} style={{ color: s.iconColor }} />
              </div>
            </div>
            <div
              className="text-2xl font-bold mb-1"
              style={{ color: "#f4f4f5" }}
            >
              {s.value}
            </div>
            <div className="text-sm" style={{ color: "#a1a1aa" }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Revenue + Slip overview row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Ghana Payments */}
        <div className="card-glass p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Globe2 size={18} style={{ color: "#10b981" }} />
              <h3 className="font-semibold" style={{ color: "#f4f4f5" }}>
                Ghana Payments
              </h3>
            </div>
            <DollarSign size={18} style={{ color: "#10b981" }} />
          </div>
          <div className="flex justify-between text-sm mb-2.5">
            <span style={{ color: "#a1a1aa" }}>Revenue:</span>
            <span className="font-bold" style={{ color: "#10b981" }}>
              GHS {stats.totalRevenue.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span style={{ color: "#a1a1aa" }}>Sales:</span>
            <span className="font-semibold" style={{ color: "#f4f4f5" }}>
              {stats.totalSales}
            </span>
          </div>
        </div>

        {/* Slip Overview */}
        <div className="card-glass p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart2 size={18} style={{ color: "#ff4500" }} />
              <h3 className="font-semibold" style={{ color: "#f4f4f5" }}>
                Slip Overview
              </h3>
            </div>
            <FileText size={18} style={{ color: "#ff4500" }} />
          </div>
          <div className="flex justify-between text-sm mb-2.5">
            <span style={{ color: "#a1a1aa" }}>Active:</span>
            <span className="font-bold" style={{ color: "#ff4500" }}>
              {stats.activeSlips}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span style={{ color: "#a1a1aa" }}>Completed:</span>
            <span className="font-semibold" style={{ color: "#a1a1aa" }}>
              {stats.completedSlips}
            </span>
          </div>
        </div>
      </div>

      {/* Recent Payments */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "#111117",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div
          className="px-5 py-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <h3 className="font-semibold" style={{ color: "#f4f4f5" }}>
            Recent Payments
          </h3>
        </div>
        {stats.recentActivity.length === 0 ? (
          <div
            className="py-12 text-center text-sm"
            style={{ color: "#52525b" }}
          >
            No payment activity yet.
          </div>
        ) : (
          <div>
            {stats.recentActivity.map((act) => (
              <div
                key={act._id}
                className="flex items-center justify-between px-5 py-3.5 transition-colors"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{
                      background: "rgba(255,69,0,0.15)",
                      color: "#ff4500",
                      border: "1px solid rgba(255,69,0,0.25)",
                    }}
                  >
                    {act.email[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: "#a1a1aa" }}>
                      {act.email}
                    </p>
                    <p className="text-xs" style={{ color: "#52525b" }}>
                      {act.predictionTitle}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className="text-sm font-bold"
                    style={{ color: act.status === "success" ? "#10b981" : "#ef4444" }}
                  >
                    {act.currency} {act.amount}
                  </p>
                  <p className="text-xs" style={{ color: "#52525b" }}>
                    {act.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Slip Form Modal ──────────────────────────────────────────────────────────
function SlipModal({
  editing, initial, onSave, onClose, saving, token,
}: {
  editing: Prediction | null;
  initial: typeof EMPTY_FORM;
  onSave: (data: typeof EMPTY_FORM) => void;
  onClose: () => void;
  saving: boolean;
  token: string;
}) {
  const [form, setForm] = useState(initial);
  const [imgPreview, setImgPreview]       = useState(initial.imageUrl || "");
  const [proofPreview, setProofPreview]   = useState(initial.proofImageUrl || "");
  const [uploading, setUploading]         = useState(false);
  const [uploadingProof, setUploadingProof] = useState(false);
  const fileRef      = useRef<HTMLInputElement>(null);
  const proofFileRef = useRef<HTMLInputElement>(null);

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: name === "price" ? Number(value) : value }));
  };

  const [imgUploadError, setImgUploadError]     = useState("");
  const [proofUploadError, setProofUploadError] = useState("");

  // Upload slip image to Supabase storage
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgUploadError("");
    const localUrl = URL.createObjectURL(file);
    setImgPreview(localUrl);
    setUploading(true);
    try {
      const cdnUrl = await adminUploadImage(token, file);
      setImgPreview(cdnUrl);
      setForm((prev) => ({ ...prev, imageUrl: cdnUrl }));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || (err as Error)?.message || "Upload failed";
      setImgUploadError(msg);
      setImgPreview("");
      setForm((prev) => ({ ...prev, imageUrl: "" }));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  // Upload proof image to Supabase storage
  const onProofFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProofUploadError("");
    const localUrl = URL.createObjectURL(file);
    setProofPreview(localUrl);
    setUploadingProof(true);
    try {
      const cdnUrl = await adminUploadImage(token, file);
      setProofPreview(cdnUrl);
      setForm((prev) => ({ ...prev, proofImageUrl: cdnUrl }));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || (err as Error)?.message || "Upload failed";
      setProofUploadError(msg);
      setProofPreview("");
      setForm((prev) => ({ ...prev, proofImageUrl: "" }));
    } finally {
      setUploadingProof(false);
      if (proofFileRef.current) proofFileRef.current.value = "";
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{ background: "rgba(0,0,0,0.75)" }}
      />
      {/* Modal card */}
      <div
        className="relative w-full max-w-2xl rounded-2xl overflow-y-auto max-h-[90vh]"
        style={{
          background: "#111117",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 sticky top-0 z-10"
          style={{
            background: "#111117",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <h2
            className="font-bold text-lg"
            style={{ color: "#f4f4f5", fontFamily: "'Sora', sans-serif" }}
          >
            {editing ? "Edit Slip" : "Create Slip"}
          </h2>
          <button
            onClick={onClose}
            className="transition-colors p-1.5 rounded-lg"
            style={{ color: "#52525b" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#f4f4f5")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#52525b")}
          >
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); onSave(form); }}
          className="p-6 space-y-5"
        >
          {/* Title */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#52525b" }}>
              Match Details
            </p>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#a1a1aa" }}>
              Title *
            </label>
            <input
              name="match"
              value={form.match}
              onChange={onChange}
              placeholder="e.g. Arsenal vs Chelsea"
              className="admin-input w-full"
              required
            />
          </div>

          {/* Odds Category */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#a1a1aa" }}>
              Odds Category
            </label>
            <select
              name="oddsCategory"
              value={ODDS_CATEGORIES.find((c) => ODDS_VALUES[c] === form.oddsCategory) || "2+ ODDS"}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, oddsCategory: ODDS_VALUES[e.target.value] }))
              }
              className="admin-input w-full"
            >
              {ODDS_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Price */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#a1a1aa" }}>
              Price (GHS)
            </label>
            <input
              name="price"
              type="number"
              value={form.price}
              onChange={onChange}
              min={1}
              className="admin-input w-full"
              required
            />
          </div>

          {/* League + Odds */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#52525b" }}>
              League & Odds
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "#a1a1aa" }}>
                  League
                </label>
                <input
                  name="league"
                  value={form.league}
                  onChange={onChange}
                  placeholder="Premier League"
                  className="admin-input w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "#a1a1aa" }}>
                  Odds (display)
                </label>
                <input
                  name="odds"
                  value={form.odds}
                  onChange={onChange}
                  placeholder="7.50"
                  className="admin-input w-full"
                />
              </div>
            </div>
          </div>

          {/* Start / End Day */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#a1a1aa" }}>
                Start Day
              </label>
              <input
                name="startDay"
                value={form.startDay}
                onChange={onChange}
                placeholder="e.g. Saturday"
                className="admin-input w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#a1a1aa" }}>
                End Day
              </label>
              <input
                name="endDay"
                value={form.endDay}
                onChange={onChange}
                placeholder="e.g. Sunday"
                className="admin-input w-full"
              />
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#a1a1aa" }}>
              Date *
            </label>
            <input
              name="date"
              type="date"
              value={form.date}
              onChange={onChange}
              className="admin-input w-full"
              required
            />
          </div>

          {/* Status + Result */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#52525b" }}>
              Status
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "#a1a1aa" }}>
                  Status
                </label>
                <select
                  name="status"
                  value={form.status}
                  onChange={onChange}
                  className="admin-input w-full"
                >
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              {form.status === "completed" && (
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "#a1a1aa" }}>
                    Result
                  </label>
                  <select
                    name="result"
                    value={form.result ?? ""}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        result: (e.target.value as "win" | "loss" | null) || null,
                      }))
                    }
                    className="admin-input w-full"
                  >
                    <option value="">— Not set —</option>
                    <option value="win">Win</option>
                    <option value="loss">Loss</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Booking content */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#52525b" }}>
              Prediction Content
            </p>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#a1a1aa" }}>
              Prediction / Booking Code
            </label>
            <textarea
              name="content"
              value={form.content}
              onChange={onChange}
              rows={2}
              placeholder="Short summary: Arsenal to Win & Over 2.5 Goals"
              className="admin-input w-full resize-y min-h-[60px]"
            />
          </div>

          {/* Booking code */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#a1a1aa" }}>
              Betting Code{" "}
              <span style={{ color: "#52525b", fontWeight: 400 }}>(shown prominently when unlocked)</span>
            </label>
            <input
              name="bookingCode"
              value={form.bookingCode}
              onChange={onChange}
              placeholder="e.g. ARS-CHE-8821"
              className="admin-input w-full font-mono"
            />
          </div>

          {/* Tips list */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#a1a1aa" }}>
              Tips (one per line)
            </label>
            <textarea
              name="tips"
              value={form.tips}
              onChange={onChange}
              rows={3}
              placeholder={"Arsenal to win\nBoth teams to score\nOver 2.5 goals total"}
              className="admin-input w-full resize-y min-h-[80px] text-xs"
            />
          </div>

          {/* Bet Slip Image */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#52525b" }}>
              Images
            </p>
            <label className="block text-xs font-medium mb-2" style={{ color: "#a1a1aa" }}>
              Bet Slip Image{" "}
              <span style={{ color: "#52525b", fontWeight: 400 }}>(shown blurred before payment)</span>
            </label>
            <div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "2px dashed rgba(255,255,255,0.12)",
                  color: "#a1a1aa",
                  width: "100%",
                  justifyContent: "center",
                }}
              >
                <Upload size={15} />
                {uploading ? "Uploading…" : imgPreview && !imgUploadError ? "Replace Image" : "Choose Image"}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={onFile}
              />
            </div>
            {imgUploadError && (
              <p className="mt-2 text-xs" style={{ color: "#ef4444" }}>
                ❌ Upload failed: {imgUploadError}
              </p>
            )}
            {imgPreview && !imgUploadError && (
              <div className="mt-3 relative inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imgPreview}
                  alt="Slip preview"
                  className="h-28 rounded-xl object-cover"
                  style={{ border: "1px solid rgba(255,255,255,0.1)", background: "#0d0d10" }}
                />
                <button
                  type="button"
                  onClick={() => { setImgPreview(""); setImgUploadError(""); setForm((p) => ({ ...p, imageUrl: "" })); }}
                  className="absolute -top-2 -right-2 rounded-full w-5 h-5 flex items-center justify-center text-xs"
                  style={{ background: "#ef4444", color: "#ffffff" }}
                >
                  <X size={10} />
                </button>
              </div>
            )}
          </div>

          {/* Proof Image — only shown when marking completed */}
          {form.status === "completed" && (
            <div
              className="rounded-xl p-4 space-y-3"
              style={{
                background: "rgba(16,185,129,0.05)",
                border: "1px solid rgba(16,185,129,0.18)",
              }}
            >
              <label
                className="flex items-center gap-2 text-xs font-semibold"
                style={{ color: "#10b981" }}
              >
                <CheckCircle size={14} style={{ color: "#10b981" }} />
                Proof Image{" "}
                <span style={{ color: "#52525b", fontWeight: 400 }}>(result screenshot shown in History)</span>
              </label>
              <div>
                <button
                  type="button"
                  onClick={() => proofFileRef.current?.click()}
                  disabled={uploadingProof}
                  className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg font-semibold transition-colors disabled:opacity-60 w-full justify-center"
                  style={{
                    background: "rgba(16,185,129,0.12)",
                    border: "1px solid rgba(16,185,129,0.25)",
                    color: "#34d399",
                  }}
                >
                  <Upload size={14} />
                  {uploadingProof ? "Uploading…" : "Upload Proof Image"}
                </button>
                <input
                  ref={proofFileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={onProofFile}
                />
              </div>
              {!proofPreview && !proofUploadError && (
                <p className="text-xs" style={{ color: "#52525b" }}>
                  No proof image yet
                </p>
              )}
              {proofPreview && !proofUploadError && (
                <p className="text-xs" style={{ color: "#10b981" }}>
                  ✅ Uploaded
                </p>
              )}
              {proofUploadError && (
                <p className="text-xs" style={{ color: "#ef4444" }}>
                  ❌ Upload failed: {proofUploadError}
                </p>
              )}
              {proofPreview && !proofUploadError && (
                <div className="relative inline-block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={proofPreview}
                    alt="Proof preview"
                    className="h-28 rounded-xl object-cover"
                    style={{ border: "1px solid rgba(16,185,129,0.3)", background: "#0d0d10" }}
                  />
                  <button
                    type="button"
                    onClick={() => { setProofPreview(""); setProofUploadError(""); setForm((p) => ({ ...p, proofImageUrl: "" })); }}
                    className="absolute -top-2 -right-2 rounded-full w-5 h-5 flex items-center justify-center text-xs"
                    style={{ background: "#ef4444", color: "#ffffff" }}
                  >
                    <X size={10} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : null}
              {saving ? "Saving..." : editing ? "Update Slip" : "Create Slip"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn-outline flex-none px-6"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Manage Slips Section ─────────────────────────────────────────────────────
function ManageSlipsSection({ token }: { token: string }) {
  const [slips, setSlips] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "completed">("all");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Prediction | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const showToast = (type: "ok" | "err", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try { setSlips(await adminGetPredictions(token)); }
    catch { showToast("err", "Failed to load slips."); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const filtered = slips.filter((s) => {
    const matchesSearch =
      s.match.toLowerCase().includes(search.toLowerCase()) ||
      (s.league || "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ? true : s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  const pages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSave = async (form: typeof EMPTY_FORM) => {
    setSaving(true);
    try {
      const payload: Partial<Prediction> = {
        match: form.match, league: form.league, odds: form.odds,
        oddsCategory: form.oddsCategory as "2+" | "5+" | "10+" | "20+",
        price: form.price,
        content: form.content,
        bookingCode: form.bookingCode,
        tips: form.tips ? (form.tips as string).split("\n").map((t: string) => t.trim()).filter(Boolean) : [],
        imageUrl: form.imageUrl,
        proofImageUrl: form.proofImageUrl,
        date: form.date,
        status: form.status, result: form.result,
        startDay: form.startDay, endDay: form.endDay,
      };
      if (editing) { await adminUpdatePrediction(token, editing._id, payload); showToast("ok", "Slip updated!"); }
      else { await adminCreatePrediction(token, payload); showToast("ok", "Slip created!"); }
      setShowModal(false); setEditing(null);
      await load();
    } catch (err: unknown) {
      const serverMsg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      showToast("err", serverMsg || "Failed to save. Check console for details.");
      console.error("Save prediction error:", err);
    }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    setSaving(true);
    try {
      await adminDeletePrediction(token, id);
      showToast("ok", "Slip deleted.");
      setDeleteId(null);
      await load();
    } catch { showToast("err", "Failed to delete."); }
    finally { setSaving(false); }
  };

  const openEdit = (slip: Prediction) => {
    setEditing(slip);
    setShowModal(true);
  };

  const openCreate = () => {
    setEditing(null);
    setShowModal(true);
  };

  return (
    <>
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-medium`}
          style={
            toast.type === "ok"
              ? { background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", color: "#10b981" }
              : { background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444" }
          }
        >
          {toast.type === "ok" ? <CheckCircle size={16} /> : <XCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: "#52525b" }}
            />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search slips..."
              className="admin-input pl-9 text-sm"
              style={{ minWidth: "220px" }}
            />
          </div>
          {/* Filter pills */}
          <div
            className="flex items-center gap-1 p-1 rounded-xl"
            style={{ background: "#1a1a24", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            {(["all", "active", "completed"] as const).map((f) => (
              <button
                key={f}
                onClick={() => { setStatusFilter(f); setPage(1); }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors"
                style={
                  statusFilter === f
                    ? { background: "#ff4500", color: "#ffffff" }
                    : { background: "transparent", color: "#52525b" }
                }
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add New Slip
        </button>
      </div>

      {/* Table / Cards */}
      <div
        className="admin-card overflow-hidden"
        style={{
          background: "#111117",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: "16px",
        }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={28} className="animate-spin" style={{ color: "#ff4500" }} />
          </div>
        ) : paginated.length === 0 ? (
          <div className="py-16 text-center">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <Inbox size={22} style={{ color: "#52525b" }} />
            </div>
            <p className="text-sm" style={{ color: "#52525b" }}>
              No slips found.
            </p>
            <button onClick={openCreate} className="btn-primary mt-4">
              Create First Slip
            </button>
          </div>
        ) : (
          <>
            {/* Mobile card list */}
            <div className="md:hidden">
              {paginated.map((slip, idx) => (
                <div
                  key={slip._id}
                  className="px-4 py-4 flex items-center gap-3"
                  style={{
                    background: idx % 2 === 0 ? "#111117" : "#131318",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-semibold truncate"
                      style={{ color: "#f4f4f5" }}
                    >
                      {slip.match}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <OddsBadge cat={slip.oddsCategory} />
                      <span className="text-xs" style={{ color: "#52525b" }}>
                        GHS {slip.price}
                      </span>
                      <StatusBadge status={slip.status} />
                      {slip.result && <StatusBadge status={slip.result} />}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => openEdit(slip)}
                      title="Edit"
                      className="p-2 rounded-lg transition-colors"
                      style={{ color: "#52525b" }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#ff4500")}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#52525b")}
                    >
                      <Pencil size={15} />
                    </button>
                    {deleteId === slip._id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(slip._id)}
                          disabled={saving}
                          className="text-xs px-2 py-1 rounded-lg"
                          style={{
                            color: "#ef4444",
                            border: "1px solid rgba(239,68,68,0.3)",
                            background: "rgba(239,68,68,0.08)",
                          }}
                        >
                          {saving ? "..." : "Del"}
                        </button>
                        <button
                          onClick={() => setDeleteId(null)}
                          className="p-1.5 rounded-lg"
                          style={{ color: "#52525b" }}
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteId(slip._id)}
                        title="Delete"
                        className="p-2 rounded-lg transition-colors"
                        style={{ color: "#52525b" }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#ef4444")}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#52525b")}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ background: "#1a1a24", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                    {["Title", "Odds", "Price", "Status", "Result", "Actions"].map((h) => (
                      <th
                        key={h}
                        className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide"
                        style={{ color: "#52525b" }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((slip, idx) => (
                    <tr
                      key={slip._id}
                      style={{
                        background: idx % 2 === 0 ? "#111117" : "#131318",
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                      }}
                    >
                      <td
                        className="px-5 py-4 text-sm font-medium max-w-[220px] truncate"
                        style={{ color: "#f4f4f5" }}
                      >
                        {slip.match}
                      </td>
                      <td className="px-5 py-4">
                        <OddsBadge cat={slip.oddsCategory} />
                      </td>
                      <td className="px-5 py-4 text-sm" style={{ color: "#a1a1aa" }}>
                        GHS {slip.price}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={slip.status} />
                      </td>
                      <td className="px-5 py-4">
                        {slip.result ? <StatusBadge status={slip.result} /> : (
                          <span style={{ color: "#52525b", fontSize: "12px" }}>—</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEdit(slip)}
                            title="Edit"
                            className="p-1.5 rounded-lg transition-colors"
                            style={{ color: "#52525b" }}
                            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#ff4500")}
                            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#52525b")}
                          >
                            <Pencil size={15} />
                          </button>
                          {deleteId === slip._id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDelete(slip._id)}
                                disabled={saving}
                                className="text-xs px-2 py-1 rounded-lg transition-colors"
                                style={{
                                  color: "#ef4444",
                                  border: "1px solid rgba(239,68,68,0.3)",
                                  background: "rgba(239,68,68,0.08)",
                                }}
                              >
                                {saving ? "..." : "Confirm"}
                              </button>
                              <button
                                onClick={() => setDeleteId(null)}
                                className="p-1.5 rounded-lg"
                                style={{ color: "#52525b" }}
                              >
                                <X size={13} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteId(slip._id)}
                              title="Delete"
                              className="p-1.5 rounded-lg transition-colors"
                              style={{ color: "#52525b" }}
                              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#ef4444")}
                              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#52525b")}
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer count */}
            <div
              className="px-5 py-3 text-xs"
              style={{
                borderTop: "1px solid rgba(255,255,255,0.06)",
                color: "#52525b",
              }}
            >
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} slips
            </div>
          </>
        )}
      </div>

      <Pagination page={page} pages={pages} onPage={setPage} />

      {/* Modal */}
      {showModal && (
        <SlipModal
          editing={editing}
          initial={
            editing
              ? {
                  match: editing.match, league: editing.league || "", odds: editing.odds,
                  oddsCategory: editing.oddsCategory, price: editing.price,
                  content: editing.content || "",
                  bookingCode: (editing as { bookingCode?: string }).bookingCode || "",
                  tips: ((editing as { tips?: string[] }).tips || []).join("\n"),
                  imageUrl: editing.imageUrl || "",
                  proofImageUrl: editing.proofImageUrl || "",
                  date: new Date(editing.date).toISOString().split("T")[0],
                  status: editing.status, result: editing.result,
                  startDay: "", endDay: "",
                }
              : EMPTY_FORM
          }
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditing(null); }}
          saving={saving}
          token={token}
        />
      )}
    </>
  );
}

// ─── Payments Section ─────────────────────────────────────────────────────────
function PaymentsSection({ token }: { token: string }) {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await adminGetPayments(token, p);
      setPayments(res.data); setTotal(res.total); setPages(res.pages);
    } catch { console.error("Failed to load payments"); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(page); }, [load, page]);

  const filtered = payments.filter((p) =>
    p.email.toLowerCase().includes(search.toLowerCase()) ||
    p.reference.toLowerCase().includes(search.toLowerCase()) ||
    p.predictionTitle.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "#52525b" }}
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search payments..."
            className="admin-input pl-9 text-sm w-full"
          />
        </div>
        <div className="text-sm" style={{ color: "#52525b" }}>
          {total} total transactions
        </div>
      </div>

      <div
        className="admin-card overflow-hidden"
        style={{
          background: "#111117",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: "16px",
        }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={28} className="animate-spin" style={{ color: "#ff4500" }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm" style={{ color: "#52525b" }}>
            No payments found.
          </div>
        ) : (
          <>
            {/* Mobile card list */}
            <div className="md:hidden">
              {filtered.map((pmt, idx) => (
                <div
                  key={pmt._id}
                  className="px-4 py-4"
                  style={{
                    background: idx % 2 === 0 ? "#111117" : "#131318",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                  }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{
                          background: "rgba(255,69,0,0.15)",
                          color: "#ff4500",
                          border: "1px solid rgba(255,69,0,0.25)",
                        }}
                      >
                        {pmt.email[0].toUpperCase()}
                      </div>
                      <span
                        className="text-sm truncate max-w-[160px]"
                        style={{ color: "#a1a1aa" }}
                      >
                        {pmt.email}
                      </span>
                    </div>
                    <span
                      className="font-bold text-sm"
                      style={{ color: pmt.status === "success" ? "#10b981" : "#ef4444" }}
                    >
                      {pmt.currency} {pmt.amount}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 ml-9 flex-wrap">
                    <StatusBadge status={pmt.status} />
                    <span className="text-xs truncate" style={{ color: "#52525b" }}>
                      {pmt.predictionTitle}
                    </span>
                    <span className="text-xs ml-auto" style={{ color: "#52525b" }}>
                      {new Date(pmt.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ background: "#1a1a24", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                    {["Customer", "Slip", "Reference", "Amount", "Status", "Date"].map((h) => (
                      <th
                        key={h}
                        className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide"
                        style={{ color: "#52525b" }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((pmt, idx) => (
                    <tr
                      key={pmt._id}
                      style={{
                        background: idx % 2 === 0 ? "#111117" : "#131318",
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                      }}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                            style={{
                              background: "rgba(255,69,0,0.15)",
                              color: "#ff4500",
                              border: "1px solid rgba(255,69,0,0.25)",
                            }}
                          >
                            {pmt.email[0].toUpperCase()}
                          </div>
                          <span className="text-sm" style={{ color: "#a1a1aa" }}>
                            {pmt.email}
                          </span>
                        </div>
                      </td>
                      <td
                        className="px-5 py-4 text-sm max-w-[160px] truncate"
                        style={{ color: "#52525b" }}
                      >
                        {pmt.predictionTitle}
                      </td>
                      <td
                        className="px-5 py-4 text-xs font-mono"
                        style={{ color: "#52525b" }}
                      >
                        {pmt.reference}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className="font-bold text-sm"
                          style={{ color: pmt.status === "success" ? "#10b981" : "#ef4444" }}
                        >
                          {pmt.currency} {pmt.amount}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={pmt.status} />
                      </td>
                      <td className="px-5 py-4 text-xs" style={{ color: "#52525b" }}>
                        {new Date(pmt.createdAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer count */}
            <div
              className="px-5 py-3 text-xs"
              style={{
                borderTop: "1px solid rgba(255,255,255,0.06)",
                color: "#52525b",
              }}
            >
              {total} total payments
            </div>
          </>
        )}
      </div>

      <Pagination
        page={page}
        pages={pages}
        onPage={(p) => { setPage(p); load(p); }}
      />
    </div>
  );
}

// ─── Dashboard Shell ──────────────────────────────────────────────────────────
function Dashboard({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [section, setSection] = useState<Section>("overview");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const navItems = [
    { id: "overview" as Section, label: "Overview", icon: LayoutDashboard },
    { id: "slips"    as Section, label: "Manage Slips", icon: BookOpen },
    { id: "payments" as Section, label: "Payments", icon: CreditCard },
  ];

  const sectionTitle: Record<Section, string> = {
    overview: "Dashboard Overview",
    slips: "Manage Slips",
    payments: "Payments",
  };

  const goTo = (id: Section) => { setSection(id); setDrawerOpen(false); };

  // Sidebar nav content — shared between desktop sidebar and mobile drawer
  const SidebarContent = () => (
    <>
      {/* Brand */}
      <div
        className="px-5 py-5 flex items-center justify-between"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(255,69,0,0.12)", border: "1px solid rgba(255,69,0,0.2)" }}
          >
            <Zap size={16} style={{ color: "#ff4500" }} strokeWidth={2.5} />
          </div>
          <div>
            <div
              style={{
                fontFamily: "'Sora', sans-serif",
                fontWeight: 700,
                fontSize: "0.95rem",
                letterSpacing: "-0.02em",
                color: "#f4f4f5",
              }}
            >
              Kaana{" "}
              <span style={{ color: "#ff4500" }}>Predictions</span>
            </div>
            <div
              className="text-[10px] mt-0.5"
              style={{
                color: "#52525b",
                fontFamily: "'Sora', sans-serif",
                fontWeight: 500,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Admin Panel
            </div>
          </div>
        </div>
        {/* Close button — only visible in drawer */}
        <button
          className="md:hidden p-1.5 transition-colors rounded-lg"
          style={{ color: "#52525b" }}
          onClick={() => setDrawerOpen(false)}
        >
          <X size={20} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-0.5 px-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => goTo(item.id)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150"
            style={
              section === item.id
                ? {
                    background: "rgba(255,69,0,0.1)",
                    color: "#ff4500",
                    border: "1px solid rgba(255,69,0,0.2)",
                    fontFamily: "'Sora', sans-serif",
                    fontWeight: 600,
                    letterSpacing: "0.02em",
                  }
                : {
                    color: "#52525b",
                    border: "1px solid transparent",
                    fontFamily: "'Sora', sans-serif",
                    fontWeight: 600,
                    letterSpacing: "0.02em",
                  }
            }
          >
            <item.icon size={17} />
            {item.label}
          </button>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-2 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all"
          style={{
            color: "#52525b",
            fontFamily: "'Sora', sans-serif",
            fontWeight: 600,
            letterSpacing: "0.02em",
            border: "1px solid transparent",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = "#f87171";
            (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.08)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = "#52525b";
            (e.currentTarget as HTMLElement).style.background = "transparent";
          }}
        >
          <LogOut size={17} />
          Logout
        </button>
      </div>
    </>
  );

  return (
    <div
      className="min-h-screen flex flex-col md:flex-row"
      style={{ background: "#09090b" }}
    >
      {/* ── Mobile drawer overlay ── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 backdrop-blur-sm md:hidden"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* ── Mobile drawer ── */}
      <div
        className={`fixed top-0 left-0 h-full z-50 flex flex-col w-72 transition-transform duration-300 md:hidden ${drawerOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{
          background: "#111117",
          borderRight: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <SidebarContent />
      </div>

      {/* ── Desktop sidebar ── */}
      <aside
        className="hidden md:flex flex-shrink-0 flex-col"
        style={{
          background: "#111117",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          width: "224px",
        }}
      >
        <SidebarContent />
      </aside>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Mobile top header */}
        <header
          className="md:hidden flex items-center justify-between px-4 py-3 sticky top-0 z-30"
          style={{
            background: "rgba(9,9,11,0.9)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            backdropFilter: "saturate(180%) blur(20px)",
          }}
        >
          <button
            onClick={() => setDrawerOpen(true)}
            className="p-2 rounded-xl transition-colors"
            style={{
              color: "#52525b",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <Menu size={20} />
          </button>
          <div
            style={{
              fontFamily: "'Sora', sans-serif",
              fontWeight: 700,
              fontSize: "1rem",
              letterSpacing: "-0.02em",
              color: "#f4f4f5",
            }}
          >
            Kaana <span style={{ color: "#ff4500" }}>Predictions</span>
          </div>
          <button
            onClick={onLogout}
            className="p-2 rounded-xl transition-colors"
            style={{
              color: "#52525b",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#f87171")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#52525b")}
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto pb-24 md:pb-0">
          <div className="px-4 md:px-8 py-5 md:py-7 max-w-6xl">
            <h1
              className="mb-5 md:mb-6"
              style={{
                fontFamily: "'Sora', sans-serif",
                fontWeight: 700,
                fontSize: "clamp(1.3rem,4vw,1.8rem)",
                letterSpacing: "-0.03em",
                color: "#f4f4f5",
              }}
            >
              {sectionTitle[section]}
            </h1>
            {section === "overview"  && <OverviewSection token={token} />}
            {section === "slips"     && <ManageSlipsSection token={token} />}
            {section === "payments"  && <PaymentsSection token={token} />}
          </div>
        </main>

        {/* ── Mobile bottom tab bar ── */}
        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex"
          style={{
            background: "#111117",
            borderTop: "1px solid rgba(255,255,255,0.07)",
            backdropFilter: "saturate(180%) blur(20px)",
          }}
        >
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => goTo(item.id)}
              className="flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors relative"
              style={{ color: section === item.id ? "#ff4500" : "#52525b" }}
            >
              <item.icon size={20} />
              <span
                style={{
                  fontSize: "10px",
                  fontFamily: "'Sora', sans-serif",
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                {item.label === "Manage Slips" ? "Slips" : item.label}
              </span>
              {section === item.id && (
                <div
                  className="absolute top-0 h-0.5 w-10 rounded-full"
                  style={{ background: "#ff4500" }}
                />
              )}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}


// ─── Page Root ────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [token, setToken] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem("bt_admin_token");
    if (saved) setToken(saved);
    setReady(true);
  }, []);

  if (!ready) return (
    <div
      className="min-h-screen"
      style={{ background: "#09090b" }}
    />
  );

  const handleLogin = (t: string) => setToken(t);
  const handleLogout = () => {
    setToken("");
    sessionStorage.removeItem("bt_admin_token");
    window.location.href = "/";
  };

  if (!token) return <LoginScreen onLogin={handleLogin} />;
  return <Dashboard token={token} onLogout={handleLogout} />;
}
