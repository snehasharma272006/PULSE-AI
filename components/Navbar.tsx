import Link from "next/link";

const navLinks = [
  { label: "Home",      href: "/" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Timeline",  href: "/timeline" },
  { label: "AI Chat",   href: "/chat" },
];

export default function Navbar() {
  return (
    <nav
      style={{
        width: "100%",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "1.2rem 3rem",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(22px)",
        WebkitBackdropFilter: "blur(22px)",
        position: "sticky",
        top: 0,
        zIndex: 50,
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
            color: "#7dd3fc",
            whiteSpace: "nowrap",
            textShadow:
              "0 0 12px rgba(56,189,248,0.65), 0 0 30px rgba(56,189,248,0.3)",
          }}
        >
          PULSE AI
        </h1>
      </div>

      {/* Links + Login, grouped together on the right */}
      <div style={{ display: "flex", alignItems: "center", gap: "2.5rem" }}>
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
            border: "1px solid #38bdf8",
            color: "#7dd3fc",
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
    </nav>
  );
}