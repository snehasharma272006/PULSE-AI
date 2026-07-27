"use client";

import { useEffect, useRef, useState } from "react";
import FeatureCard from "./FeatureCard";

type Props = {
  feature: { icon: string; title: string; description: string };
  index: number;
};

export default function AnimatedFeatureCard({ feature, index }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(20px)",
        transition: `opacity 0.55s ease ${index * 0.15}s, transform 0.55s ease ${index * 0.15}s`,
      }}
    >
      <FeatureCard {...feature} />
    </div>
  );
}