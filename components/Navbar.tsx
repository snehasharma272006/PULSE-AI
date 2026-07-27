"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

const navLinks = [
  { label: "Home",      href: "/" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Timeline",  href: "/timeline" },
  { label: "AI Chat",   href: "/chat" },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY.current && currentScrollY > 80) {
        // scrolling down, past a small threshold
        setHidden(true);
      } else {
        // scrolling up
        setHidden(false);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      style={{
        width: "100%",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "1.2rem 3rem",
        borderBottom: "1px solid rgba(27,35,51,0.06)",
        background: "rgba(250,249,245,0.75)",
        backdropFilter: "blur(22px)",
        WebkitBackdropFilter: "blur(22px)",
        position: "sticky",
        top: 0,
        zIndex: 50,
        flexWrap: "wrap",
        transform: hidden ? "translateY(-100%)" : "translateY(0)",
        transition: "transform 0.3s ease",
      }}
    >
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <span className="logo-dot" />
        <h1
          style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: "1.1rem",
            fontWeight: 700,
            letterSpacing: "0.2em",
            color: "#3D6FA0",
            whiteSpace: "nowrap",
          }}
        >
          PULSE AI
        </h1>
      </div>

      {/* Links + Login, grouped together on the right (desktop) */}
      <div className="navbar-desktop-group" style={{ display: "flex", alignItems: "center", gap: "2.5rem" }}>
        <ul
          style={{
            display: "flex",
            gap: "2rem",
            listStyle: "none",
            margin: 0,
            padding: 0,
          }}
        >
          {navLinks.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="nav-link">
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        <Link
          href="/login"
          style={{
            padding: "0.5rem 1.3rem",
            borderRadius: "8px",
            border: "1px solid #5B8FC4",
            color: "#3D6FA0",
            fontSize: "0.9rem",
            fontWeight: 600,
            textDecoration: "none",
            whiteSpace: "nowrap",
            transition: "all 0.2s ease",
          }}
        >
          Login
        </Link>
      </div>

      {/* Hamburger button (mobile only) */}
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="navbar-hamburger"
        aria-label="Toggle menu"
        style={{
          display: "none",
          background: "transparent",
          border: "1px solid rgba(91,143,196,0.4)",
          borderRadius: "8px",
          width: "36px",
          height: "36px",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "4px",
          cursor: "pointer",
        }}
      >
        <span style={{ width: "16px", height: "2px", background: "#3D6FA0", display: "block" }} />
        <span style={{ width: "16px", height: "2px", background: "#3D6FA0", display: "block" }} />
        <span style={{ width: "16px", height: "2px", background: "#3D6FA0", display: "block" }} />
      </button>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div
          className="navbar-mobile-menu"
          style={{
            display: "none",
            width: "100%",
            flexDirection: "column",
            gap: "1rem",
            marginTop: "1rem",
            paddingTop: "1rem",
            borderTop: "1px solid rgba(27,35,51,0.07)",
          }}
        >
          <ul style={{ display: "flex", flexDirection: "column", gap: "1rem", listStyle: "none", margin: 0, padding: 0 }}>
            {navLinks.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="nav-link" onClick={() => setMenuOpen(false)}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/login"
            onClick={() => setMenuOpen(false)}
            style={{
              padding: "0.5rem 1.3rem",
              borderRadius: "8px",
              border: "1px solid #5B8FC4",
              color: "#3D6FA0",
              fontSize: "0.9rem",
              fontWeight: 600,
              textDecoration: "none",
              textAlign: "center",
            }}
          >
            Login
          </Link>
        </div>
      )}
    </nav>
  );
}

