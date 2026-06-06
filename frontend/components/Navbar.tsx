"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, Zap } from "lucide-react";

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
        background: "rgba(9,9,11,0.85)",
        backdropFilter: "saturate(180%) blur(24px)",
        WebkitBackdropFilter: "saturate(180%) blur(24px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="page-container">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110"
              style={{
                background: "rgba(255,69,0,0.1)",
                border: "1px solid rgba(255,69,0,0.25)",
                boxShadow: "0 0 12px rgba(255,69,0,0.15)",
              }}
            >
              <Zap size={17} style={{ color: "#ff4500" }} strokeWidth={2.5} />
            </div>
            <span
              className="font-display font-bold tracking-tight leading-none"
              style={{ fontSize: "1.15rem", letterSpacing: "-0.02em", color: "#f4f4f5" }}
            >
              Kaana
              <span style={{ color: "#ff4500" }}>Predictions</span>
            </span>
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

            {/* Admin CTA pill */}
            <Link
              href="/portal"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold tracking-wide transition-all duration-300 hover:scale-105 hover:shadow-lg"
              style={{
                background: "#ff4500",
                color: "#ffffff",
                boxShadow: "0 4px 14px rgba(255,69,0,0.3)",
                letterSpacing: "0.04em",
              }}
            >
              Admin
            </Link>
          </div>

          {/* Mobile Toggle */}
          <button
            className="md:hidden p-2 rounded-xl transition-all duration-200"
            style={{
              color: "#a1a1aa",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
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
          mobileOpen ? "max-h-72 opacity-100" : "max-h-0 opacity-0"
        }`}
        style={{
          background: "#0d0d11",
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="page-container py-5 flex flex-col gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-link text-base py-2 ${pathname === link.href ? "active" : ""}`}
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-3 pb-1">
            <Link
              href="/portal"
              onClick={() => setMobileOpen(false)}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-bold tracking-wide transition-all duration-200"
              style={{
                background: "#ff4500",
                color: "#ffffff",
                boxShadow: "0 4px 14px rgba(255,69,0,0.25)",
                letterSpacing: "0.04em",
              }}
            >
              Admin
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
