import Link from "next/link";
import { Zap } from "lucide-react";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer
      className="relative py-12 text-center overflow-hidden"
      style={{
        background: "#09090b",
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Top radial glow */}
      <div
        className="pointer-events-none absolute top-0 left-0 right-0 h-40"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(255,69,0,0.06), transparent)",
        }}
        aria-hidden="true"
      />

      {/* Glow line at the top edge */}
      <div className="glow-line absolute top-0 left-0 right-0" aria-hidden="true" />

      <div className="page-container relative z-10">

        {/* Brand */}
        <div className="flex items-center justify-center gap-2.5 mb-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: "rgba(255,69,0,0.1)",
              border: "1px solid rgba(255,69,0,0.25)",
              boxShadow: "0 0 10px rgba(255,69,0,0.12)",
            }}
          >
            <Zap size={14} style={{ color: "#ff4500" }} strokeWidth={2.5} />
          </div>
          <span
            className="font-display font-bold tracking-tight leading-none"
            style={{ fontSize: "1.1rem", letterSpacing: "-0.02em", color: "#f4f4f5" }}
          >
            Kaana
            <span style={{ color: "#ff4500" }}>Predictions</span>
          </span>
        </div>

        {/* Tagline */}
        <p className="text-sm mb-6" style={{ color: "#a1a1aa" }}>
          Premium football predictions for smart bettors
        </p>

        {/* Nav links */}
        <div className="flex items-center justify-center gap-6 mb-6">
          <Link
            href="/"
            className="text-xs font-medium transition-colors duration-200 hover:text-[#ff4500]"
            style={{ color: "#52525b" }}
          >
            Home
          </Link>
          <Link
            href="/history"
            className="text-xs font-medium transition-colors duration-200 hover:text-[#ff4500]"
            style={{ color: "#52525b" }}
          >
            History
          </Link>
        </div>

        {/* Divider */}
        <div
          className="mx-auto mb-5"
          style={{
            width: "60px",
            height: "1px",
            background: "rgba(255,255,255,0.06)",
          }}
          aria-hidden="true"
        />

        {/* Copyright */}
        <p className="text-xs mb-1.5" style={{ color: "#52525b" }}>
          © {year} Kaana Predictions. All rights reserved.
        </p>

        {/* Disclaimer */}
        <p className="text-xs" style={{ color: "#52525b" }}>
          Bet responsibly.{" "}
          <span style={{ color: "#a1a1aa" }}>18+ only.</span>
        </p>
      </div>
    </footer>
  );
}
