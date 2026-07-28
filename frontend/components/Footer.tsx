import Link from "next/link";
import { Zap } from "lucide-react";

export default function Footer() {
  return (
    <footer
      className="relative py-14 text-center"
      style={{
        background: "#09090b",
        borderTop: "1px solid rgba(255,69,0,0.1)",
      }}
    >
      {/* Orange glow at top */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(255,69,0,0.5), rgba(255,112,43,0.5), transparent)",
        }}
      />
      {/* Subtle radial behind brand */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 opacity-20 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse, rgba(255,69,0,0.3) 0%, transparent 70%)",
          filter: "blur(20px)",
        }}
      />

      <div className="page-container relative z-10">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 animate-bolt"
            style={{
              background: "rgba(255,69,0,0.08)",
              border: "1px solid rgba(255,69,0,0.3)",
              boxShadow: "0 0 20px rgba(255,69,0,0.25)",
            }}
          >
            <Zap size={22} style={{ color: "#ff4500" }} strokeWidth={2.5} />
          </div>
          <div className="flex flex-col text-left">
            <span className="font-display font-bold text-lg" style={{ color: "#f4f4f5" }}>
              Kaana
              <span style={{ color: "#ff4500" }}>Predictions</span>
            </span>
            <span
              className="text-[9px] tracking-widest uppercase"
              style={{ color: "#ff4500", opacity: 0.7, fontFamily: "'Sora', sans-serif" }}
            >
              Bet With Confidence
            </span>
          </div>
        </div>

        <p className="text-xs mb-6" style={{ color: "#27272a" }}>
          Premium football predictions for smart bettors
        </p>

        {/* Footer Nav Links */}
        <div className="flex items-center justify-center gap-5 mb-6 flex-wrap">
          {[
            { href: "/", label: "Home" },
            { href: "/history", label: "History" },
            { href: "/admin", label: "Admin" },
          ].map((link, i, arr) => (
            <span key={link.href} className="flex items-center gap-5">
              <Link
                href={link.href}
                className="text-xs font-medium transition-colors duration-200 hover:text-[#ff4500]"
                style={{
                  color: "#3f3f46",
                  fontFamily: "'Sora', sans-serif",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                {link.label}
              </Link>
              {i < arr.length - 1 && (
                <span style={{ color: "#27272a" }}>·</span>
              )}
            </span>
          ))}
        </div>

        <p className="text-xs" style={{ color: "#27272a" }}>
          © {new Date().getFullYear()} Kaana Predictions. All rights reserved.
        </p>
        <p className="text-xs mt-1" style={{ color: "#27272a" }}>
          Bet responsibly. 18+ only.
        </p>
      </div>
    </footer>
  );
}
