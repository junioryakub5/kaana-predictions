"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/history", label: "History" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        background: "rgba(9,9,11,0.92)",
        backdropFilter: "saturate(180%) blur(24px)",
        WebkitBackdropFilter: "saturate(180%) blur(24px)",
        borderBottom: "1px solid rgba(255,69,0,0.12)",
        boxShadow: "0 4px 32px rgba(0,0,0,0.6)",
      }}
    >
      <div className="page-container">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div
              className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 transition-all duration-300 group-hover:scale-110"
              style={{
                border: "1px solid rgba(255,69,0,0.35)",
                boxShadow: "0 0 18px rgba(255,69,0,0.3), 0 0 6px rgba(255,69,0,0.15)",
              }}
            >
              <Image src="/logo.png" alt="Kaana Predictions" width={36} height={36} className="w-full h-full object-cover" priority />
            </div>
            <div className="flex flex-col leading-none">
              <span
                className="font-display font-bold tracking-tight"
                style={{ fontSize: "1.05rem", letterSpacing: "-0.02em", color: "#f4f4f5" }}
              >
                Kaana
                <span style={{ color: "#ff4500" }}>Predictions</span>
              </span>
              <span
                className="text-[8px] tracking-widest uppercase"
                style={{ color: "#ff4500", opacity: 0.7, fontFamily: "'Sora', sans-serif" }}
              >
                Bet With Confidence
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-7">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`nav-link ${pathname === link.href ? "active" : ""}`}
              >
                {link.label}
              </Link>
            ))}

            {/* Admin CTA */}
            <Link
              href="/portal"
              className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 transition-all duration-200 hover:scale-105 active:scale-95"
              style={{
                background: "rgba(255,69,0,0.08)",
                color: "#ff4500",
                border: "1px solid rgba(255,69,0,0.35)",
                borderRadius: "10px",
                fontFamily: "'Sora', sans-serif",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                boxShadow: "0 0 12px rgba(255,69,0,0.15)",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>
              Admin
            </Link>
          </div>

          {/* Mobile Toggle */}
          <button
            className="md:hidden p-2 rounded-xl transition-all duration-200"
            style={{
              color: "#a1a1aa",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,69,0,0.15)",
            }}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`md:hidden transition-all duration-300 overflow-hidden ${
          mobileOpen ? "max-h-80 opacity-100" : "max-h-0 opacity-0"
        }`}
        style={{
          background: "rgba(9,9,11,0.98)",
          borderTop: "1px solid rgba(255,69,0,0.1)",
        }}
      >
        <div className="page-container py-4 flex flex-col gap-4">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-link text-base ${pathname === link.href ? "active" : ""}`}
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-1 pb-1">
            <Link
              href="/portal"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 text-sm font-bold px-4 py-3 transition-all duration-200"
              style={{
                background: "rgba(255,69,0,0.08)",
                color: "#ff4500",
                border: "1px solid rgba(255,69,0,0.25)",
                borderRadius: "12px",
                fontFamily: "'Sora', sans-serif",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>
              Admin
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
