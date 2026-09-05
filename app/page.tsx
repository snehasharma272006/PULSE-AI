import Hero from "@/components/Hero";
import AnimatedFeatureCard from "@/components/AnimatedFeatureCard";

const features = [
  {
    icon: "📅",
    title: "Medical Timeline",
    description:
      "Automatically organize years of health records into a single, coherent timeline no manual sorting needed.",
  },
  {
    icon: "🧠",
    title: "AI Insights",
    description:
      "Identify trends, changes, and key medical events instantly. Let the AI surface what actually matters.",
  },
  {
    icon: "💬",
    title: "Health Chat",
    description:
      "Ask natural language questions about your records and get clear answers not complex medical jargon.",
  },
];

export default function Home() {
  return (
    <main style={{ width: "100%", minHeight: "100vh", position: "relative", zIndex: 10 }}>
      <Hero />

      <section
        style={{
          width: "100%",
          maxWidth: "1000px",
          margin: "0 auto",
          padding: "1.5rem 2rem 3rem",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <p className="section-eyebrow">WHAT WE OFFER</p>

        <h2
          style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: "clamp(1.4rem, 3vw, 1.9rem)",
            fontWeight: 700,
            color: "var(--foreground)",
            textAlign: "center",
            marginBottom: "0.4rem",
          }}
        >
          Core Features
        </h2>

        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "0.82rem",
            color: "var(--foreground)",
            opacity: 0.5,
            textAlign: "center",
            marginBottom: "1.75rem",
          }}
        >
          Everything you need to understand your health, at a glance.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "0.9rem",
            width: "100%",
          }}
        >
          {features.map((feature, i) => (
            <AnimatedFeatureCard key={feature.title} feature={feature} index={i} />
          ))}
        </div>
      </section>
    </main>
  );
}