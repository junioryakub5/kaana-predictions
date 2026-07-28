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

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    completed: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    failed: "bg-red-500/10 text-red-400 border-red-500/20",
    win: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    loss: "bg-red-500/10 text-red-400 border-red-500/20",
  };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${colors[status] ?? "bg-stone-500/10 text-stone-400 border-stone-500/20"}`}
      style={{ fontFamily: "'Sora', sans-serif", letterSpacing: "0.06em", textTransform: "uppercase", fontSize: "0.6rem" }}>
      {status}
    </span>
  );
}

function OddsBadge({ cat }: { cat: string }) {
  const colors: Record<string, string> = {
    "2+": "text-amber-400", "5+": "text-amber-300",
    "10+": "text-violet-400", "20+": "text-red-400",
  };
  return <span className={`font-bold ${colors[cat] ?? "text-amber-400"}`}>{cat}</span>;
}

function Pagination({ page, pages, onPage }: { page: number; pages: number; onPage: (n: number) => void }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-3 mt-6">
      <button onClick={() => onPage(page - 1)} disabled={page <= 1}
        className="admin-btn-ghost flex items-center gap-1 disabled:opacity-40">
        <ChevronLeft size={15} /> Previous
      </button>
      <span className="text-sm" style={{ color: "#52525b" }}>Page {page} of {pages}</span>
      <button onClick={() => onPage(page + 1)} disabled={page >= pages}
        className="admin-btn-ghost flex items-center gap-1 disabled:opacity-40">
        Next <ChevronRight size={15} />
      </button>
    </div>
  );
}

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
      sessionStorage.setItem("kp_admin_token", token.trim());
      onLogin(token.trim());
    } catch {
      setError("Invalid admin token. Access denied.");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#09090b" }}>
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-[0.03] pointer-events-none"
        style={{ background: "radial-gradient(circle, #c9a84c 0%, transparent 70%)" }} />
      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-10">
          <div className="w-14 h-14 flex items-center justify-center mx-auto mb-4" style={{ background: "#ff4500", borderRadius: "6px" }}>
            <Zap size={24} style={{ color: "#09090b" }} strokeWidth={2.5} />
          </div>
          <h1 className="font-display font-bold text-2xl mb-1" style={{ color: "#f4f4f5", letterSpacing: "-0.02em" }}>
            Admin <span className="italic" style={{ color: "#ff4500" }}>Access</span>
          </h1>
          <p className="text-xs" style={{ color: "#52525b" }}>Enter your admin token to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6" style={{ background: "rgba(17,17,23,0.9)", border: "1px solid rgba(255,69,0,0.08)", borderRadius: "6px" }}>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "rgba(255,69,0,0.5)", fontFamily: "'Sora', sans-serif", fontSize: "0.6rem" }}>Admin Token</label>
            <div className="relative">
              <input type={show ? "text" : "password"} value={token} onChange={e => setToken(e.target.value)} placeholder="Enter admin token..." autoFocus className="admin-input pr-10" />
              <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors" style={{ color: "#52525b" }}>
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          {error && <p className="text-red-400 text-sm flex items-center gap-1.5"><XCircle size={14} /> {error}</p>}
          <button type="submit" disabled={loading} className="w-full admin-btn-primary flex items-center justify-center gap-2 py-3.5"
            style={{ opacity: loading ? 0.6 : 1 }}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            {loading ? "Verifying…" : "Access Dashboard"}
          </button>
        </form>
        <p className="text-center text-xs mt-6" style={{ color: "#27272a" }}>Kaana Predictions · Admin Portal</p>
      </div>
    </div>
  );
}

function OverviewSection({ token }: { token: string }) {
  const [stats, setStats] = useState<{
    totalSlips: number; activeSlips: number; completedSlips: number;
    totalRevenue: number; totalSales: number; recentActivity: RecentActivity[];
    ghanaRevenue: number; nigeriaRevenue: number; ghanaSales: number; nigeriaSales: number;
    todayRevenue?: number; todayGhanaRevenue?: number; todayNigeriaRevenue?: number; todaySales?: number;
    weekRevenue?: number; weekSales?: number; monthRevenue?: number; monthSales?: number;
    totalWins?: number; totalLosses?: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminGetStats(token)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(data => setStats(data as any))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 size={28} className="animate-spin" style={{ color: "#ff4500" }} /></div>;
  if (!stats) return <div className="py-24 text-center" style={{ color: "#52525b" }}>Failed to load stats.</div>;

  const totalWins   = stats.totalWins   ?? 0;
  const totalLosses = stats.totalLosses ?? 0;
  const winTotal    = totalWins + totalLosses;
  const winPct      = winTotal > 0 ? Math.round((totalWins / winTotal) * 100) : 0;

  const todayRevenue        = stats.todayRevenue        ?? 0;
  const todayGhanaRevenue   = stats.todayGhanaRevenue   ?? 0;
  const todayNigeriaRevenue = stats.todayNigeriaRevenue ?? 0;
  const todaySales          = stats.todaySales          ?? 0;
  const weekRevenue         = stats.weekRevenue         ?? 0;
  const weekSales           = stats.weekSales           ?? 0;
  const monthRevenue        = stats.monthRevenue        ?? 0;
  const monthSales          = stats.monthSales          ?? 0;

  const fmtTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) +
      " · " + d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <div className="space-y-4">

      {/* ── Row 1: Today Income (hero) + Week + Month ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Today Income — HERO */}
        <div
          className="md:col-span-1 rounded-2xl p-5 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(255,69,0,0.16) 0%, rgba(255,69,0,0.07) 100%)",
            border: "1px solid rgba(255,69,0,0.3)",
            boxShadow: "0 0 40px rgba(255,69,0,0.07)",
          }}
        >
          <div style={{
            position: "absolute", top: "-30%", right: "-20%",
            width: "180px", height: "180px", borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,69,0,0.2), transparent 70%)",
            pointerEvents: "none",
          }} />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <div style={{
                width: 32, height: 32, borderRadius: 10,
                background: "rgba(255,69,0,0.15)", border: "1px solid rgba(255,69,0,0.35)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <DollarSign size={16} style={{ color: "#ff4500" }} />
              </div>
              <p style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,69,0,0.8)" }}>Income Today</p>
            </div>
            <div style={{ fontWeight: 900, fontSize: "2rem", color: "#ff4500", lineHeight: 1, marginBottom: 6 }}>
              GHS {todayRevenue.toFixed(2)}
            </div>
            <p style={{ fontSize: "0.72rem", color: "#52525b", marginBottom: 14 }}>
              {todaySales} sale{todaySales !== 1 ? "s" : ""} today
            </p>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span style={{ fontSize: "0.7rem", color: "#52525b" }}>🇬🇭 Ghana (Paystack)</span>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#22c55e" }}>GHS {todayGhanaRevenue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span style={{ fontSize: "0.7rem", color: "#52525b" }}>🇳🇬 Nigeria (Flutterwave)</span>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#ff4500" }}>₦{todayNigeriaRevenue.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* This Week */}
        <div className="rounded-2xl p-5" style={{ background: "rgba(28,25,23,0.9)", border: "1px solid rgba(255,69,0,0.12)", backdropFilter: "blur(10px)" }}>
          <div className="flex items-center gap-2 mb-4">
            <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(255,69,0,0.08)", border: "1px solid rgba(255,69,0,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <TrendingUp size={16} style={{ color: "#ff4500" }} />
            </div>
            <p style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,69,0,0.7)" }}>This Week</p>
          </div>
          <div style={{ fontWeight: 800, fontSize: "1.7rem", color: "#ff5722", lineHeight: 1, marginBottom: 6 }}>
            GHS {weekRevenue.toFixed(2)}
          </div>
          <p style={{ fontSize: "0.72rem", color: "#52525b" }}>{weekSales} sales · last 7 days</p>
          <div style={{ marginTop: 16, height: 3, borderRadius: 4, background: "rgba(255,69,0,0.1)" }}>
            <div style={{
              height: "100%", borderRadius: 4,
              background: "linear-gradient(90deg, #c9a84c, #d4a844)",
              width: stats.totalRevenue > 0 ? `${Math.min(100, (weekRevenue / stats.totalRevenue) * 100)}%` : "0%",
              transition: "width 0.6s ease",
            }} />
          </div>
          <p style={{ fontSize: "0.65rem", color: "#3f3f46", marginTop: 4 }}>
            {stats.totalRevenue > 0 ? Math.round((weekRevenue / stats.totalRevenue) * 100) : 0}% of all-time
          </p>
        </div>

        {/* This Month */}
        <div className="rounded-2xl p-5" style={{ background: "rgba(28,25,23,0.9)", border: "1px solid rgba(255,69,0,0.12)", backdropFilter: "blur(10px)" }}>
          <div className="flex items-center gap-2 mb-4">
            <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(255,69,0,0.08)", border: "1px solid rgba(255,69,0,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <BarChart2 size={16} style={{ color: "#ff4500" }} />
            </div>
            <p style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,69,0,0.7)" }}>This Month</p>
          </div>
          <div style={{ fontWeight: 800, fontSize: "1.7rem", color: "#ff5722", lineHeight: 1, marginBottom: 6 }}>
            GHS {monthRevenue.toFixed(2)}
          </div>
          <p style={{ fontSize: "0.72rem", color: "#52525b" }}>{monthSales} sales · current month</p>
          <div style={{ marginTop: 16, height: 3, borderRadius: 4, background: "rgba(255,69,0,0.1)" }}>
            <div style={{
              height: "100%", borderRadius: 4,
              background: "linear-gradient(90deg, #c9a84c, #d4a844)",
              width: stats.totalRevenue > 0 ? `${Math.min(100, (monthRevenue / stats.totalRevenue) * 100)}%` : "0%",
              transition: "width 0.6s ease",
            }} />
          </div>
          <p style={{ fontSize: "0.65rem", color: "#3f3f46", marginTop: 4 }}>
            {stats.totalRevenue > 0 ? Math.round((monthRevenue / stats.totalRevenue) * 100) : 0}% of all-time
          </p>
        </div>
      </div>

      {/* ── Row 2: Stat chips ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: "Total Revenue", value: `GHS ${(stats.ghanaRevenue ?? 0).toFixed(2)}`,
            sub: `${stats.totalSales} total sales`, color: "#22c55e",
            bg: "rgba(34,197,94,0.08)", border: "rgba(34,197,94,0.2)", Icon: DollarSign,
          },
          {
            label: "Total Predictions", value: stats.totalSlips,
            sub: `${stats.activeSlips} active · ${stats.completedSlips} done`, color: "#ff4500",
            bg: "rgba(255,69,0,0.08)", border: "rgba(255,69,0,0.2)", Icon: FileText,
          },
          {
            label: "Win Rate", value: `${winPct}%`,
            sub: `${totalWins}W · ${totalLosses}L · ${winTotal} total`,
            color: winPct >= 50 ? "#22c55e" : "#ef4444",
            bg: winPct >= 50 ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.06)",
            border: winPct >= 50 ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.18)", Icon: TrendingUp,
          },
          {
            label: "Active Slips", value: stats.activeSlips,
            sub: `${stats.completedSlips} completed`, color: "#ff4500",
            bg: "rgba(255,69,0,0.08)", border: "rgba(255,69,0,0.2)", Icon: Activity,
          },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: "rgba(28,25,23,0.9)", border: `1px solid ${s.border}`,
              borderRadius: 16, padding: "1rem 1.25rem",
              backdropFilter: "blur(10px)", transition: "transform 0.2s, box-shadow 0.2s",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
              (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 28px ${s.bg}`;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
              (e.currentTarget as HTMLElement).style.boxShadow = "none";
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div style={{ width: 34, height: 34, borderRadius: 10, background: s.bg, border: `1px solid ${s.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <s.Icon size={16} style={{ color: s.color }} />
              </div>
            </div>
            <div style={{ fontWeight: 800, fontSize: "1.45rem", color: s.color, lineHeight: 1, marginBottom: 4 }}>{s.value}</div>
            <div style={{ fontSize: "0.68rem", color: "#52525b", fontWeight: 600, letterSpacing: "0.02em" }}>{s.label}</div>
            <div style={{ fontSize: "0.62rem", color: "#27272a", marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Row 3: Win/Loss + Ghana + Nigeria ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Win / Loss Record */}
        <div style={{ background: "rgba(28,25,23,0.9)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "1.25rem", backdropFilter: "blur(10px)" }}>
          <div className="flex items-center gap-2 mb-4">
            <div style={{ width: 30, height: 30, borderRadius: 9, background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CheckCircle size={14} style={{ color: "#22c55e" }} />
            </div>
            <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "#a8a29e" }}>Win / Loss Record</p>
          </div>
          <div style={{ height: 8, borderRadius: 8, background: "rgba(239,68,68,0.18)", overflow: "hidden", marginBottom: 10 }}>
            <div style={{ height: "100%", borderRadius: 8, background: "linear-gradient(90deg, #22c55e, #16a34a)", width: `${winPct}%`, transition: "width 0.8s ease" }} />
          </div>
          <div className="flex justify-between">
            <div className="text-center">
              <div style={{ fontWeight: 800, fontSize: "1.4rem", color: "#22c55e" }}>{totalWins}</div>
              <div style={{ fontSize: "0.62rem", color: "#3f3f46", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>Wins</div>
            </div>
            <div className="text-center">
              <div style={{ fontWeight: 800, fontSize: "1.4rem", color: winPct >= 50 ? "#22c55e" : "#ff4500" }}>{winPct}%</div>
              <div style={{ fontSize: "0.62rem", color: "#3f3f46", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>Rate</div>
            </div>
            <div className="text-center">
              <div style={{ fontWeight: 800, fontSize: "1.4rem", color: "#ef4444" }}>{totalLosses}</div>
              <div style={{ fontSize: "0.62rem", color: "#3f3f46", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>Losses</div>
            </div>
          </div>
        </div>

        {/* Ghana */}
        <div style={{ background: "rgba(28,25,23,0.9)", border: "1px solid rgba(34,197,94,0.15)", borderRadius: 16, padding: "1.25rem", backdropFilter: "blur(10px)" }}>
          <div className="flex items-center gap-2 mb-3">
            <div style={{ width: 30, height: 30, borderRadius: 9, background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Globe2 size={14} style={{ color: "#22c55e" }} />
            </div>
            <h3 style={{ color: "#f4f4f5", fontWeight: 700, fontSize: "0.85rem" }}>🇬🇭 Ghana (Paystack)</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-baseline">
              <span style={{ fontSize: "0.68rem", color: "#3f3f46" }}>All-time</span>
              <span style={{ fontWeight: 800, color: "#22c55e", fontSize: "1rem" }}>GHS {(stats.ghanaRevenue ?? 0).toFixed(2)}</span>
            </div>
            <div style={{ height: "1px", background: "rgba(255,255,255,0.04)" }} />
            <div className="flex justify-between items-baseline">
              <span style={{ fontSize: "0.68rem", color: "#3f3f46" }}>Today</span>
              <span style={{ fontWeight: 700, color: "#22c55e", fontSize: "0.9rem" }}>GHS {todayGhanaRevenue.toFixed(2)}</span>
            </div>
            <div style={{ height: "1px", background: "rgba(255,255,255,0.04)" }} />
            <div className="flex justify-between">
              <span style={{ fontSize: "0.68rem", color: "#3f3f46" }}>Total sales</span>
              <span style={{ fontWeight: 700, color: "#f4f4f5", fontSize: "0.85rem" }}>{stats.ghanaSales}</span>
            </div>
          </div>
        </div>

        {/* Nigeria */}
        <div style={{ background: "rgba(28,25,23,0.9)", border: "1px solid rgba(255,69,0,0.15)", borderRadius: 16, padding: "1.25rem", backdropFilter: "blur(10px)" }}>
          <div className="flex items-center gap-2 mb-3">
            <div style={{ width: 30, height: 30, borderRadius: 9, background: "rgba(255,69,0,0.1)", border: "1px solid rgba(255,69,0,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Globe2 size={14} style={{ color: "#ff4500" }} />
            </div>
            <h3 style={{ color: "#f4f4f5", fontWeight: 700, fontSize: "0.85rem" }}>🇳🇬 Nigeria (Flutterwave)</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-baseline">
              <span style={{ fontSize: "0.68rem", color: "#3f3f46" }}>All-time</span>
              <span style={{ fontWeight: 800, color: "#ff4500", fontSize: "1rem" }}>₦{(stats.nigeriaRevenue ?? 0).toLocaleString()}</span>
            </div>
            <div style={{ height: "1px", background: "rgba(255,255,255,0.04)" }} />
            <div className="flex justify-between items-baseline">
              <span style={{ fontSize: "0.68rem", color: "#3f3f46" }}>Today</span>
              <span style={{ fontWeight: 700, color: "#ff4500", fontSize: "0.9rem" }}>₦{todayNigeriaRevenue.toLocaleString()}</span>
            </div>
            <div style={{ height: "1px", background: "rgba(255,255,255,0.04)" }} />
            <div className="flex justify-between">
              <span style={{ fontSize: "0.68rem", color: "#3f3f46" }}>Total sales</span>
              <span style={{ fontWeight: 700, color: "#f4f4f5", fontSize: "0.85rem" }}>{stats.nigeriaSales}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Recent Payments ── */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(28,25,23,0.95)", border: "1px solid rgba(255,69,0,0.08)" }}>
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,69,0,0.06)" }}>
          <h3 className="font-semibold" style={{ color: "#f4f4f5" }}>Recent Payments</h3>
          {stats.recentActivity.length > 0 && (
            <span style={{ fontSize: "0.65rem", color: "#3f3f46", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              {stats.recentActivity.length} shown
            </span>
          )}
        </div>
        {stats.recentActivity.length === 0 ? (
          <div className="py-12 text-center text-sm" style={{ color: "#3f3f46" }}>No payment activity yet.</div>
        ) : (
          <div>
            {stats.recentActivity.map((act) => (
              <div
                key={act._id}
                className="flex items-center justify-between px-5 py-3.5 transition-colors"
                style={{ borderBottom: "1px solid rgba(255,69,0,0.04)" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(255,69,0,0.02)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: "rgba(255,69,0,0.1)", color: "#ff4500", border: "1px solid rgba(255,69,0,0.2)" }}>
                    {act.email[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "#a8a29e", maxWidth: 180 }}>{act.email}</p>
                    <p className="text-xs truncate" style={{ color: "#3f3f46", maxWidth: 180 }}>{act.predictionTitle}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                  <span style={{ fontSize: "0.65rem", background: act.provider === "flutterwave" ? "rgba(255,69,0,0.1)" : "rgba(34,197,94,0.1)", color: act.provider === "flutterwave" ? "#ff4500" : "#22c55e", border: `1px solid ${act.provider === "flutterwave" ? "rgba(255,69,0,0.25)" : "rgba(34,197,94,0.25)"}`, borderRadius: 6, padding: "2px 6px", fontWeight: 700 }}>
                    {act.provider === "flutterwave" ? "🇳🇬" : "🇬🇭"}
                  </span>
                  <div className="text-right">
                    <p className="text-sm font-bold" style={{ color: act.status === "success" ? "#22c55e" : "#ef4444" }}>
                      {act.currency} {act.amount}
                    </p>
                    <p className="text-xs" style={{ color: "#27272a" }}>{fmtTime(act.createdAt)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


function SlipModal({ editing, initial, onSave, onClose, saving, token }: {
  editing: Prediction | null; initial: typeof EMPTY_FORM; onSave: (data: typeof EMPTY_FORM) => void; onClose: () => void; saving: boolean; token: string;
}) {
  const [form, setForm] = useState(initial);
  const [imgPreview, setImgPreview] = useState(initial.imageUrl || "");
  const [proofPreview, setProofPreview] = useState(initial.proofImageUrl || "");
  const [uploading, setUploading] = useState(false);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const proofFileRef = useRef<HTMLInputElement>(null);
  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: name === "price" ? Number(value) : value }));
  };
  const [imgUploadError, setImgUploadError] = useState("");
  const [proofUploadError, setProofUploadError] = useState("");

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setImgUploadError(""); setImgPreview(URL.createObjectURL(file)); setUploading(true);
    try { const cdnUrl = await adminUploadImage(token, file); setImgPreview(cdnUrl); setForm(prev => ({ ...prev, imageUrl: cdnUrl })); }
    catch (err: unknown) { const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || (err as Error)?.message || "Upload failed"; setImgUploadError(msg); setImgPreview(""); setForm(prev => ({ ...prev, imageUrl: "" })); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const onProofFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setProofUploadError(""); setProofPreview(URL.createObjectURL(file)); setUploadingProof(true);
    try { const cdnUrl = await adminUploadImage(token, file); setProofPreview(cdnUrl); setForm(prev => ({ ...prev, proofImageUrl: cdnUrl })); }
    catch (err: unknown) { const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || (err as Error)?.message || "Upload failed"; setProofUploadError(msg); setProofPreview(""); setForm(prev => ({ ...prev, proofImageUrl: "" })); }
    finally { setUploadingProof(false); if (proofFileRef.current) proofFileRef.current.value = ""; }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "rgba(20,18,17,0.85)" }} />
      <div className="relative w-full max-w-xl overflow-y-auto max-h-[90vh] shadow-2xl" style={{ background: "rgba(17,17,23,0.9)", border: "1px solid rgba(255,69,0,0.1)", borderRadius: "6px" }} onClick={e => e.stopPropagation()}>
        <div className="h-px w-full" style={{ background: "linear-gradient(90deg, transparent, #c9a84c, transparent)" }} />
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid rgba(255,69,0,0.06)" }}>
          <h2 style={{ color: "#f4f4f5" }} className="font-semibold">{editing ? "Edit Slip" : "Add New Slip"}</h2>
          <button onClick={onClose} style={{ color: "#52525b" }}><X size={20} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="p-6 space-y-4">
          <div><label className="admin-label">Title *</label><input name="match" value={form.match} onChange={onChange} placeholder="e.g. Arsenal vs Chelsea" className="admin-input" required /></div>
          <div><label className="admin-label">Odds Category</label><select name="oddsCategory" value={ODDS_CATEGORIES.find(c => ODDS_VALUES[c] === form.oddsCategory) || "2+ ODDS"} onChange={e => setForm(prev => ({ ...prev, oddsCategory: ODDS_VALUES[e.target.value] }))} className="admin-select">{ODDS_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
          <div><label className="admin-label">Price (GHS)</label><input name="price" type="number" value={form.price} onChange={onChange} min={1} className="admin-input" required /></div>
          <div className="grid grid-cols-2 gap-3"><div><label className="admin-label">League</label><input name="league" value={form.league} onChange={onChange} placeholder="Premier League" className="admin-input" /></div><div><label className="admin-label">Odds (display)</label><input name="odds" value={form.odds} onChange={onChange} placeholder="7.50" className="admin-input" /></div></div>
          <div className="grid grid-cols-2 gap-3"><div><label className="admin-label">Start Day</label><input name="startDay" value={form.startDay} onChange={onChange} placeholder="e.g. Saturday" className="admin-input" /></div><div><label className="admin-label">End Day</label><input name="endDay" value={form.endDay} onChange={onChange} placeholder="e.g. Sunday" className="admin-input" /></div></div>
          <div><label className="admin-label">Date *</label><input name="date" type="date" value={form.date} onChange={onChange} className="admin-input" required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="admin-label">Status</label><select name="status" value={form.status} onChange={onChange} className="admin-select"><option value="active">Active</option><option value="completed">Completed</option></select></div>
            {form.status === "completed" && (<div><label className="admin-label">Result</label><select name="result" value={form.result ?? ""} onChange={e => setForm(prev => ({ ...prev, result: e.target.value as "win" | "loss" | null || null }))} className="admin-select"><option value="">— Not set —</option><option value="win">Win</option><option value="loss">Loss</option></select></div>)}
          </div>
          <div><label className="admin-label">Prediction / Booking Code</label><textarea name="content" value={form.content} onChange={onChange} rows={2} placeholder="Short summary" className="admin-input resize-y min-h-[60px]" /></div>
          <div><label className="admin-label">Betting Code</label><input name="bookingCode" value={form.bookingCode} onChange={onChange} placeholder="e.g. ARS-CHE-8821" className="admin-input font-mono" /></div>
          <div><label className="admin-label">Tips (one per line)</label><textarea name="tips" value={form.tips} onChange={onChange} rows={3} placeholder={"Arsenal to win\nBoth teams to score"} className="admin-input resize-y min-h-[80px] text-xs" /></div>
          <div>
            <label className="admin-label">Bet Slip Image</label>
            <div className="flex items-center gap-3 mb-3">
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="admin-btn-primary flex items-center gap-2 text-sm disabled:opacity-60"><Upload size={14} /> {uploading ? "Uploading…" : imgPreview && !imgUploadError ? "Replace Image" : "Choose Image"}</button>
              <span className="text-xs" style={{ color: "#52525b" }}>{uploading ? "Uploading…" : imgPreview && !imgUploadError ? "✅ Uploaded" : "No image"}</span>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={onFile} />
            </div>
            {imgUploadError && <p className="text-red-400 text-xs">❌ {imgUploadError}</p>}
            {imgPreview && !imgUploadError && (
              <div className="relative rounded-md overflow-hidden" style={{ border: "1px solid rgba(255,69,0,0.15)", background: "rgba(0,0,0,0.3)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imgPreview} alt="Bet Slip Preview" className="w-full object-contain max-h-64 cursor-zoom-in" onClick={() => setLightbox(imgPreview)} />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity pointer-events-none" style={{ background: "rgba(0,0,0,0.4)" }}>
                  <span className="text-white text-xs font-semibold px-3 py-1 rounded-full" style={{ background: "rgba(255,69,0,0.8)" }}>Click to expand</span>
                </div>
                <button type="button" onClick={() => { setImgPreview(""); setImgUploadError(""); setForm(p => ({ ...p, imageUrl: "" })); }} className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-lg"><X size={12} /></button>
              </div>
            )}
          </div>
          {form.status === "completed" && (
            <div className="p-4 space-y-3" style={{ background: "rgba(34,197,94,0.03)", border: "1px solid rgba(34,197,94,0.1)", borderRadius: "6px" }}>
              <label className="admin-label flex items-center gap-2" style={{ color: "#22c55e" }}><CheckCircle size={14} /> Proof Image</label>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => proofFileRef.current?.click()} disabled={uploadingProof} className="flex items-center gap-2 text-xs px-3 py-1.5 font-semibold disabled:opacity-60" style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", color: "#22c55e", borderRadius: "50px" }}><Upload size={14} /> {uploadingProof ? "Uploading…" : "Upload Proof"}</button>
                <span className="text-xs" style={{ color: "#52525b" }}>{uploadingProof ? "Uploading…" : proofPreview && !proofUploadError ? "✅ Uploaded" : "No proof"}</span>
                <input ref={proofFileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={onProofFile} />
              </div>
              {proofUploadError && <p className="text-red-400 text-xs">❌ {proofUploadError}</p>}
              {proofPreview && !proofUploadError && (
                <div className="relative rounded-md overflow-hidden mt-2" style={{ border: "1px solid rgba(34,197,94,0.2)", background: "rgba(0,0,0,0.3)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={proofPreview} alt="Proof Preview" className="w-full object-contain max-h-52 cursor-zoom-in" onClick={() => setLightbox(proofPreview)} />
                  <button type="button" onClick={() => { setProofPreview(""); setProofUploadError(""); setForm(p => ({ ...p, proofImageUrl: "" })); }} className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-lg"><X size={12} /></button>
                </div>
              )}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="admin-btn-primary flex-1 flex items-center justify-center gap-2">{saving ? <Loader2 size={15} className="animate-spin" /> : null}{saving ? "Saving…" : editing ? "Update Slip" : "Create Slip"}</button>
            <button type="button" onClick={onClose} className="admin-btn-ghost flex-none px-6">Cancel</button>
          </div>
        </form>
      </div>
      {lightbox && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={() => setLightbox(null)} style={{ background: "rgba(0,0,0,0.92)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="Full preview" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" style={{ maxWidth: "90vw", maxHeight: "90vh" }} />
          <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white rounded-full w-10 h-10 flex items-center justify-center transition-colors"><X size={20} /></button>
        </div>
      )}
    </div>
  );
}

function ManageSlipsSection({ token }: { token: string }) {
  const [slips, setSlips] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Prediction | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const showToast = (type: "ok" | "err", msg: string) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3000); };
  const load = useCallback(async () => { setLoading(true); try { setSlips(await adminGetPredictions(token)); } catch { showToast("err", "Failed to load slips."); } finally { setLoading(false); } }, [token]);
  useEffect(() => { load(); }, [load]);

  const filtered = slips.filter(s => s.match.toLowerCase().includes(search.toLowerCase()) || (s.league || "").toLowerCase().includes(search.toLowerCase()));
  const pages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSave = async (form: typeof EMPTY_FORM) => {
    setSaving(true);
    try {
      const payload: Partial<Prediction> = { match: form.match, league: form.league, odds: form.odds, oddsCategory: form.oddsCategory as "2+" | "5+" | "10+" | "20+", price: form.price, content: form.content, bookingCode: form.bookingCode, tips: form.tips ? (form.tips as string).split("\n").map((t: string) => t.trim()).filter(Boolean) : [], imageUrl: form.imageUrl, proofImageUrl: form.proofImageUrl, date: form.date, status: form.status, result: form.result, startDay: form.startDay, endDay: form.endDay };
      if (editing) { await adminUpdatePrediction(token, editing._id, payload); showToast("ok", "Slip updated!"); }
      else { await adminCreatePrediction(token, payload); showToast("ok", "Slip created!"); }
      setShowModal(false); setEditing(null); await load();
    } catch (err: unknown) { const serverMsg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error; showToast("err", serverMsg || "Failed to save."); console.error("Save error:", err); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => { setSaving(true); try { await adminDeletePrediction(token, id); showToast("ok", "Slip deleted."); setDeleteId(null); await load(); } catch { showToast("err", "Failed to delete."); } finally { setSaving(false); } };

  return (
    <>
      {toast && (<div className={`fixed top-4 right-4 z-[100] flex items-center gap-2.5 px-4 py-3 shadow-lg text-sm font-medium ${toast.type === "ok" ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300" : "bg-red-500/20 border border-red-500/40 text-red-300"}`} style={{ borderRadius: "50px" }}>{toast.type === "ok" ? <CheckCircle size={16} /> : <XCircle size={16} />}{toast.msg}</div>)}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="relative flex-1 max-w-xs"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#52525b" }} /><input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search slips…" className="admin-input pl-9 text-sm" /></div>
        <button onClick={() => { setEditing(null); setShowModal(true); }} className="admin-btn-primary flex items-center gap-2"><Plus size={16} /> Add New Slip</button>
      </div>
      <div className="admin-card overflow-hidden">
        {loading ? (<div className="flex items-center justify-center py-24"><Loader2 size={28} className="animate-spin" style={{ color: "#ff4500" }} /></div>
        ) : paginated.length === 0 ? (
          <div className="py-16 text-center"><Inbox size={22} className="mx-auto mb-3" style={{ color: "#52525b" }} /><p className="text-sm" style={{ color: "#52525b" }}>No slips found.</p><button onClick={() => { setEditing(null); setShowModal(true); }} className="admin-btn-primary mt-4">Create First Slip</button></div>
        ) : (
          <>
            <div className="md:hidden divide-y" style={{ borderColor: "rgba(255,69,0,0.04)" }}>
              {paginated.map(slip => (
                <div key={slip._id} className="px-4 py-4 flex items-center gap-3">
                  <div className="flex-1 min-w-0"><p style={{ color: "#f4f4f5" }} className="text-sm font-semibold truncate">{slip.match}</p><div className="flex items-center gap-2 mt-1 flex-wrap"><OddsBadge cat={slip.oddsCategory} /><span className="text-xs" style={{ color: "#52525b" }}>GHS {slip.price}</span><StatusBadge status={slip.status} /></div></div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => { setEditing(slip); setShowModal(true); }} className="p-2 transition-colors" style={{ color: "#52525b" }}><Pencil size={15} /></button>
                    {deleteId === slip._id ? (<div className="flex items-center gap-1"><button onClick={() => handleDelete(slip._id)} disabled={saving} className="text-xs text-red-400 border border-red-500/40 px-2 py-1 rounded-lg">{saving ? "…" : "Del"}</button><button onClick={() => setDeleteId(null)} className="p-1.5" style={{ color: "#52525b" }}><X size={13} /></button></div>) : (<button onClick={() => setDeleteId(slip._id)} className="p-2 transition-colors" style={{ color: "#52525b" }}><Trash2 size={15} /></button>)}
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead><tr style={{ borderBottom: "1px solid rgba(255,69,0,0.06)" }}>{["Title", "Odds", "Price", "Status", "Purchases", "Actions"].map(h => (<th key={h} className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-widest" style={{ color: "#52525b", fontFamily: "'Sora', sans-serif", fontSize: "0.6rem" }}>{h}</th>))}</tr></thead>
                <tbody className="divide-y" style={{ borderColor: "rgba(255,69,0,0.04)" }}>
                  {paginated.map(slip => (
                    <tr key={slip._id} className="transition-colors hover:bg-white/[0.01]">
                      <td className="px-5 py-4 text-sm font-medium max-w-[220px] truncate" style={{ color: "#f4f4f5" }}>{slip.match}</td>
                      <td className="px-5 py-4"><OddsBadge cat={slip.oddsCategory} /></td>
                      <td className="px-5 py-4 text-sm" style={{ color: "#a8a29e" }}>GHS {slip.price}</td>
                      <td className="px-5 py-4"><StatusBadge status={slip.status} /></td>
                      <td className="px-5 py-4 text-sm" style={{ color: "#52525b" }}>{(slip as { purchaseCount?: number }).purchaseCount ?? 0}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1">
                          <button onClick={() => { setEditing(slip); setShowModal(true); }} className="p-1.5 transition-colors" style={{ color: "#52525b" }}><Pencil size={15} /></button>
                          {deleteId === slip._id ? (<div className="flex items-center gap-1"><button onClick={() => handleDelete(slip._id)} disabled={saving} className="text-xs text-red-400 border border-red-500/40 px-2 py-1 rounded-lg">{saving ? "…" : "Confirm"}</button><button onClick={() => setDeleteId(null)} className="p-1.5" style={{ color: "#52525b" }}><X size={13} /></button></div>) : (<button onClick={() => setDeleteId(slip._id)} className="p-1.5 transition-colors" style={{ color: "#52525b" }}><Trash2 size={15} /></button>)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 md:px-5 py-3 text-xs" style={{ borderTop: "1px solid rgba(255,69,0,0.06)", color: "#3f3f46" }}>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} slips</div>
          </>
        )}
      </div>
      <Pagination page={page} pages={pages} onPage={setPage} />
      {showModal && (<SlipModal editing={editing} initial={editing ? { match: editing.match, league: editing.league || "", odds: editing.odds, oddsCategory: editing.oddsCategory, price: editing.price, content: editing.content || "", bookingCode: (editing as {bookingCode?: string}).bookingCode || "", tips: ((editing as {tips?: string[]}).tips || []).join("\n"), imageUrl: editing.imageUrl || "", proofImageUrl: editing.proofImageUrl || "", date: new Date(editing.date).toISOString().split("T")[0], status: editing.status, result: editing.result, startDay: "", endDay: "" } : EMPTY_FORM} onSave={handleSave} onClose={() => { setShowModal(false); setEditing(null); }} saving={saving} token={token} />)}
    </>
  );
}

function ProviderBadge({ provider }: { provider?: string }) {
  const isFlw = provider === "flutterwave";
  return (
    <span
      className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 uppercase tracking-wider"
      style={{
        background: isFlw ? "rgba(255,69,0,0.08)" : "rgba(34,197,94,0.08)",
        color: isFlw ? "#ff4500" : "#22c55e",
        border: `1px solid ${isFlw ? "rgba(255,69,0,0.2)" : "rgba(34,197,94,0.2)"}`,
        borderRadius: "6px",
        fontFamily: "'Sora', sans-serif",
      }}
    >
      {isFlw ? "🇳🇬 FLW" : "🇬🇭 PSK"}
    </span>
  );
}

function PaymentsSection({ token }: { token: string }) {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const load = useCallback(async (p: number) => { setLoading(true); try { const res = await adminGetPayments(token, p); setPayments(res.data); setTotal(res.total); setPages(res.pages); } catch { console.error("Failed to load payments"); } finally { setLoading(false); } }, [token]);
  useEffect(() => { load(page); }, [load, page]);
  const filtered = payments.filter(p => p.email.toLowerCase().includes(search.toLowerCase()) || p.reference.toLowerCase().includes(search.toLowerCase()) || p.predictionTitle.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-xs"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#52525b" }} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search payments…" className="admin-input pl-9 text-sm" /></div>
        <div className="text-sm" style={{ color: "#52525b" }}>{total} total transactions</div>
      </div>
      <div className="admin-card overflow-hidden">
        {loading ? (<div className="flex items-center justify-center py-24"><Loader2 size={28} className="animate-spin" style={{ color: "#ff4500" }} /></div>
        ) : filtered.length === 0 ? (<div className="py-16 text-center text-sm" style={{ color: "#52525b" }}>No payments found.</div>
        ) : (
          <>
            {/* Mobile list */}
            <div className="md:hidden divide-y" style={{ borderColor: "rgba(255,69,0,0.04)" }}>
              {filtered.map(pmt => (
                <div key={pmt._id} className="px-4 py-4">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "rgba(255,69,0,0.1)", color: "#ff4500" }}>{pmt.email[0].toUpperCase()}</div>
                      <span className="text-sm truncate max-w-[140px]" style={{ color: "#a8a29e" }}>{pmt.email}</span>
                    </div>
                    <span className={`font-bold text-sm ${pmt.status === "success" ? "text-emerald-400" : "text-red-400"}`}>{pmt.currency} {pmt.amount}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 ml-9">
                    <ProviderBadge provider={pmt.provider} />
                    <StatusBadge status={pmt.status} />
                    <span className="text-xs truncate" style={{ color: "#3f3f46" }}>{pmt.predictionTitle}</span>
                    <span className="text-xs ml-auto" style={{ color: "#3f3f46" }}>{new Date(pmt.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead><tr style={{ borderBottom: "1px solid rgba(255,69,0,0.06)" }}>{["Customer", "Slip", "Provider", "Reference", "Amount", "Status", "Date"].map(h => (<th key={h} className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-widest" style={{ color: "#52525b", fontFamily: "'Sora', sans-serif", fontSize: "0.6rem" }}>{h}</th>))}</tr></thead>
                <tbody className="divide-y" style={{ borderColor: "rgba(255,69,0,0.04)" }}>
                  {filtered.map(pmt => (
                    <tr key={pmt._id} className="transition-colors hover:bg-white/[0.01]">
                      <td className="px-5 py-4"><div className="flex items-center gap-2.5"><div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "rgba(255,69,0,0.1)", color: "#ff4500" }}>{pmt.email[0].toUpperCase()}</div><span className="text-sm" style={{ color: "#a8a29e" }}>{pmt.email}</span></div></td>
                      <td className="px-5 py-4 text-sm max-w-[140px] truncate" style={{ color: "#a8a29e" }}>{pmt.predictionTitle}</td>
                      <td className="px-5 py-4"><ProviderBadge provider={pmt.provider} /></td>
                      <td className="px-5 py-4 text-xs font-mono" style={{ color: "#3f3f46" }}>{pmt.reference}</td>
                      <td className="px-5 py-4"><span className={`font-bold text-sm ${pmt.status === "success" ? "text-emerald-400" : "text-red-400"}`}>{pmt.currency} {pmt.amount}</span></td>
                      <td className="px-5 py-4"><StatusBadge status={pmt.status} /></td>
                      <td className="px-5 py-4 text-xs" style={{ color: "#3f3f46" }}>{new Date(pmt.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 md:px-5 py-3 text-xs" style={{ borderTop: "1px solid rgba(255,69,0,0.06)", color: "#3f3f46" }}>{total} total payments</div>
          </>
        )}
      </div>
      <Pagination page={page} pages={pages} onPage={p => { setPage(p); load(p); }} />
    </div>
  );
}

function Dashboard({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [section, setSection] = useState<Section>("overview");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navItems = [
    { id: "overview" as Section, label: "Overview", icon: LayoutDashboard },
    { id: "slips" as Section, label: "Manage Slips", icon: BookOpen },
    { id: "payments" as Section, label: "Payments", icon: CreditCard },
  ];
  const sectionTitle: Record<Section, string> = { overview: "Dashboard Overview", slips: "Manage Slips", payments: "Payments" };
  const goTo = (id: Section) => { setSection(id); setDrawerOpen(false); };

  const SidebarContent = () => (
    <>
      <div className="px-5 py-5 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,69,0,0.06)" }}>
        <div>
          <div className="font-display font-bold text-base" style={{ color: "#f4f4f5", letterSpacing: "-0.01em" }}>Kaana<span style={{color:'#ff4500'}}>Predictions</span></div>
          <div className="text-[10px] mt-0.5 tracking-widest uppercase" style={{ color: "#52525b", fontFamily: "'Sora', sans-serif" }}>Admin Panel</div>
        </div>
        <button className="md:hidden p-1.5" style={{ color: "#52525b" }} onClick={() => setDrawerOpen(false)}><X size={20} /></button>
      </div>
      <nav className="flex-1 py-4 space-y-0.5 px-2">
        {navItems.map(item => (
          <button key={item.id} onClick={() => goTo(item.id)} className="w-full flex items-center gap-3 px-4 py-3 text-xs font-semibold transition-all duration-150"
            style={section === item.id ? { background: "rgba(255,69,0,0.06)", color: "#ff4500", border: "1px solid rgba(255,69,0,0.1)", borderRadius: "6px", fontFamily: "'Sora', sans-serif", letterSpacing: "0.06em", textTransform: "uppercase" as const } : { color: "#52525b", border: "1px solid transparent", borderRadius: "6px", fontFamily: "'Sora', sans-serif", letterSpacing: "0.06em", textTransform: "uppercase" as const }}>
            <item.icon size={17} />{item.label}
          </button>
        ))}
      </nav>
      <div className="px-2 py-4" style={{ borderTop: "1px solid rgba(255,69,0,0.06)" }}>
        <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold transition-all" style={{ color: "#52525b", border: "1px solid transparent", borderRadius: "6px", fontFamily: "'Sora', sans-serif", letterSpacing: "0.06em", textTransform: "uppercase" }}><LogOut size={17} />Logout</button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row" style={{ background: "#09090b" }}>
      {drawerOpen && <div className="fixed inset-0 z-40 md:hidden" style={{ background: "rgba(20,18,17,0.85)" }} onClick={() => setDrawerOpen(false)} />}
      <div className={`fixed top-0 left-0 h-full z-50 flex flex-col w-64 transition-transform duration-300 md:hidden ${drawerOpen ? "translate-x-0" : "-translate-x-full"}`} style={{ background: "rgba(17,17,23,0.9)", borderRight: "1px solid rgba(255,69,0,0.06)" }}><SidebarContent /></div>
      <aside className="hidden md:flex w-56 flex-shrink-0 flex-col" style={{ background: "rgba(17,17,23,0.9)", borderRight: "1px solid rgba(255,69,0,0.06)" }}><SidebarContent /></aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between px-4 py-3 sticky top-0 z-30" style={{ background: "rgba(20,18,17,0.97)", borderBottom: "1px solid rgba(255,69,0,0.06)" }}>
          <button onClick={() => setDrawerOpen(true)} className="p-2" style={{ color: "#52525b" }}><Menu size={20} /></button>
          <div className="font-display font-bold text-sm" style={{ color: "#f4f4f5" }}>Kaana<span style={{color:'#ff4500'}}>Predictions</span></div>
          <button onClick={onLogout} className="p-2" style={{ color: "#52525b" }}><LogOut size={18} /></button>
        </header>
        <main className="flex-1 overflow-y-auto pb-24 md:pb-0">
          <div className="px-4 md:px-8 py-5 md:py-7 max-w-6xl">
            <h1 className="font-display font-bold mb-5 md:mb-6" style={{ fontSize: "clamp(1.3rem,4vw,1.8rem)", letterSpacing: "-0.02em", color: "#f4f4f5" }}>{sectionTitle[section]}</h1>
            {section === "overview" && <OverviewSection token={token} />}
            {section === "slips" && <ManageSlipsSection token={token} />}
            {section === "payments" && <PaymentsSection token={token} />}
          </div>
        </main>
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex" style={{ background: "rgba(20,18,17,0.97)", borderTop: "1px solid rgba(255,69,0,0.06)" }}>
          {navItems.map(item => (
            <button key={item.id} onClick={() => goTo(item.id)} className="flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors relative" style={{ color: section === item.id ? "#ff4500" : "#52525b" }}>
              <item.icon size={20} />
              <span style={{ fontSize: "10px", fontFamily: "'Sora', sans-serif", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>{item.label === "Manage Slips" ? "Slips" : item.label}</span>
              {section === item.id && <div className="absolute bottom-0 h-0.5 w-10 rounded-full" style={{ background: "#ff4500" }} />}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [ready, setReady] = useState(false);
  useEffect(() => { const saved = sessionStorage.getItem("kp_admin_token"); if (saved) setToken(saved); setReady(true); }, []);
  if (!ready) return <div className="min-h-screen" style={{ background: "#09090b" }} />;
  if (!token) return <LoginScreen onLogin={t => setToken(t)} />;
  return <Dashboard token={token} onLogout={() => { setToken(""); sessionStorage.removeItem("kp_admin_token"); window.location.href = "/"; }} />;
}
