type FeatureCardProps = {
  icon: string;
  title: string;
  description: string;
};

export default function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div
      className="card-hover"
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: "14px",
        padding: "1.35rem 1.1rem",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <div style={{ fontSize: "1.5rem", marginBottom: "0.6rem" }}>
        {icon}
      </div>

      <h3
        style={{
          fontFamily: "'Syne', sans-serif",
          fontSize: "0.95rem",
          fontWeight: 700,
          color: "var(--foreground)",
          marginBottom: "0.35rem",
        }}
      >
        {title}
      </h3>

      <p
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: "0.78rem",
          lineHeight: 1.45,
          color: "var(--foreground)",
          opacity: 0.6,
        }}
      >
        {description}
      </p>
    </div>
  );
}