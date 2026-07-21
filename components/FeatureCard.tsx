type FeatureCardProps = {
  icon: string;
  title: string;
  description: string;
};

export default function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: "16px",
        padding: "2rem",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        transition: "border-color 0.2s ease, background 0.2s ease",
      }}
    >
      <div
        style={{
          fontSize: "2rem",
          marginBottom: "1rem",
        }}
      >
        {icon}
      </div>

      <h3
        style={{
          fontFamily: "'Syne', sans-serif",
          fontSize: "1.1rem",
          fontWeight: 700,
          color: "#f8fafc",
          marginBottom: "0.6rem",
        }}
      >
        {title}
      </h3>

      <p
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: "0.9rem",
          lineHeight: 1.5,
          color: "rgba(248,250,252,0.5)",
        }}
      >
        {description}
      </p>
    </div>
  );
}