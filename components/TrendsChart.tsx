import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface HealthMetric {
  date: string;
  value: number;
  metric: string;
}

interface TrendsChartProps {
  userId: string;
}

// Typical normal reference ranges, used purely to flag values worth a second
// look. Not medical guidance — always confirm with a doctor.
const NORMAL_RANGES: Record<string, { min: number; max: number; unit: string }> = {
  cholesterol: { min: 0, max: 200, unit: "mg/dL" },
  "blood-pressure": { min: 90, max: 120, unit: "mmHg systolic" },
  weight: { min: 0, max: Infinity, unit: "kg" }, // no universal "abnormal" weight — never flagged
};

function isAbnormal(metric: string, value: number): boolean {
  const range = NORMAL_RANGES[metric];
  if (!range) return false;
  return value < range.min || value > range.max;
}

export default function TrendsChart({ userId }: TrendsChartProps) {
  const [metrics, setMetrics] = useState<HealthMetric[]>([]);
  const [selectedMetric, setSelectedMetric] = useState('cholesterol');
  const [isLoading, setIsLoading] = useState(true);

  const fetchMetrics = useCallback(async () => {
    try {
      // Query extracted text for metric values (simplified example)
      const { data: reports } = await supabase
        .from('reports')
        .select('created_at, extracted_text')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (!reports) return;

      // Parse metrics from extracted text (simplified)
      const parsedMetrics: HealthMetric[] = [];

      reports.forEach((report) => {
        const date = new Date(report.created_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });

        // Simple parsing - look for patterns in text
        if (selectedMetric === 'cholesterol') {
          const match = report.extracted_text?.match(
            /(?:cholesterol|ldl)[:\s]*(\d+)/i
          );
          if (match) {
            parsedMetrics.push({
              date,
              value: parseInt(match[1]),
              metric: 'cholesterol',
            });
          }
        } else if (selectedMetric === 'blood-pressure') {
          const match = report.extracted_text?.match(
            /blood pressure[:\s]*(\d+)\/(\d+)/i
          );
          if (match) {
            parsedMetrics.push({
              date,
              value: parseInt(match[1]),
              metric: 'blood-pressure',
            });
          }
        } else if (selectedMetric === 'weight') {
          const match = report.extracted_text?.match(
            /(?:weight|kg)[:\s]*(\d+(?:\.\d+)?)/i
          );
          if (match) {
            parsedMetrics.push({
              date,
              value: parseFloat(match[1]),
              metric: 'weight',
            });
          }
        }
      });

      setMetrics(parsedMetrics);
    } finally {
      setIsLoading(false);
    }
  }, [userId, selectedMetric]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // Simple ASCII chart
  const renderChart = () => {
    if (metrics.length === 0) {
      return (
        <div style={{ textAlign: "center", padding: "32px 0", fontSize: "14px", color: "rgba(27,35,51,0.35)" }}>
          No {selectedMetric} data found in your reports
        </div>
      );
    }

    const values = metrics.map((m) => m.value);
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    const range = maxValue - minValue || 1;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Chart visualization using bars — abnormal readings render in bold red */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", height: "160px", gap: "4px", padding: "0 8px" }}>
          {metrics.map((metric, idx) => {
            const normalizedValue = ((metric.value - minValue) / range) * 100;
            const abnormal = isAbnormal(metric.metric, metric.value);
            return (
              <div
                key={idx}
                style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}
              >
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: abnormal ? 700 : 400,
                    color: abnormal ? "#C0392B" : "rgba(27,35,51,0.5)",
                  }}
                >
                  {metric.value}
                </span>
                <div
                  style={{
                    width: "100%",
                    borderRadius: "6px 6px 0 0",
                    transition: "background 0.15s",
                    height: `${normalizedValue}%`,
                    minHeight: "2px",
                    background: abnormal ? "#C0392B" : "#5B8FC4",
                  }}
                  title={`${metric.metric}: ${metric.value}${abnormal ? " (outside normal range)" : ""}`}
                />
                <span
                  style={{
                    fontSize: "12px",
                    textAlign: "center",
                    fontWeight: abnormal ? 700 : 400,
                    color: abnormal ? "#C0392B" : "rgba(27,35,51,0.45)",
                  }}
                >
                  {metric.date}
                </span>
              </div>
            );
          })}
        </div>

        {NORMAL_RANGES[selectedMetric] && metrics.some((m) => isAbnormal(m.metric, m.value)) && (
          <div
            style={{
              borderRadius: "10px",
              padding: "10px 14px",
              background: "rgba(220,38,38,0.08)",
              border: "1px solid rgba(220,38,38,0.2)",
            }}
          >
            <p style={{ fontSize: "12px", fontWeight: 600, color: "#C0392B", textAlign: "center", margin: 0 }}>
              ⚠ One or more readings fall outside the typical range ({NORMAL_RANGES[selectedMetric].min}–
              {NORMAL_RANGES[selectedMetric].max === Infinity ? "∞" : NORMAL_RANGES[selectedMetric].max}{" "}
              {NORMAL_RANGES[selectedMetric].unit}). This is not a diagnosis — please check with your doctor.
            </p>
          </div>
        )}

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", textAlign: "center" }}>
          <div style={{ padding: "10px", borderRadius: "10px", background: "rgba(27,35,51,0.04)" }}>
            <p style={{ fontSize: "12px", color: "rgba(27,35,51,0.5)", margin: 0 }}>Latest</p>
            <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--foreground)", margin: "2px 0 0" }}>
              {metrics[metrics.length - 1]?.value}
            </p>
          </div>
          <div style={{ padding: "10px", borderRadius: "10px", background: "rgba(27,35,51,0.04)" }}>
            <p style={{ fontSize: "12px", color: "rgba(27,35,51,0.5)", margin: 0 }}>Average</p>
            <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--foreground)", margin: "2px 0 0" }}>
              {(values.reduce((a, b) => a + b) / values.length).toFixed(1)}
            </p>
          </div>
          <div style={{ padding: "10px", borderRadius: "10px", background: "rgba(27,35,51,0.04)" }}>
            <p style={{ fontSize: "12px", color: "rgba(27,35,51,0.5)", margin: 0 }}>Change</p>
            <p
              style={{
                fontSize: "14px",
                fontWeight: 600,
                margin: "2px 0 0",
                color: values[values.length - 1] < values[0] ? "#2FA37C" : "#C0392B",
              }}
            >
              {(values[values.length - 1] - values[0]).toFixed(1)}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        borderRadius: "16px",
        padding: "24px",
        background: "rgba(255,255,255,0.65)",
        border: "1px solid rgba(27,35,51,0.08)",
      }}
    >
      <h2
        style={{
          fontSize: "12px",
          fontWeight: 500,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          marginBottom: "20px",
          color: "rgba(27,35,51,0.45)",
        }}
      >
        Health Trends
      </h2>

      {/* Metric selector */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "24px", flexWrap: "wrap" }}>
        {[
          { value: 'cholesterol', label: 'Cholesterol' },
          { value: 'blood-pressure', label: 'Blood Pressure' },
          { value: 'weight', label: 'Weight' },
        ].map((option) => (
          <button
            key={option.value}
            onClick={() => setSelectedMetric(option.value)}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 500,
              border: "none",
              cursor: "pointer",
              transition: "background 0.15s",
              ...(selectedMetric === option.value
                ? { background: "#3D6FA0", color: "#ffffff" }
                : { background: "rgba(27,35,51,0.05)", color: "rgba(27,35,51,0.6)" }),
            }}
            onMouseEnter={(e) => {
              if (selectedMetric !== option.value) (e.currentTarget as HTMLButtonElement).style.background = "rgba(27,35,51,0.09)";
            }}
            onMouseLeave={(e) => {
              if (selectedMetric !== option.value) (e.currentTarget as HTMLButtonElement).style.background = "rgba(27,35,51,0.05)";
            }}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      {isLoading ? (
        <div
          className="animate-pulse"
          style={{ height: "160px", borderRadius: "12px", background: "rgba(27,35,51,0.05)" }}
        />
      ) : (
        renderChart()
      )}
    </div>
  );
}