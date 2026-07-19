import React, { useState, useEffect } from 'react';
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

export default function TrendsChart({ userId }: TrendsChartProps) {
  const [metrics, setMetrics] = useState<HealthMetric[]>([]);
  const [selectedMetric, setSelectedMetric] = useState('cholesterol');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, [userId, selectedMetric]);

  const fetchMetrics = async () => {
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
  };

  // Simple ASCII chart
  const renderChart = () => {
    if (metrics.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          No {selectedMetric} data found in your reports
        </div>
      );
    }

    const values = metrics.map((m) => m.value);
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    const range = maxValue - minValue || 1;

    return (
      <div className="space-y-4">
        {/* Chart visualization using bars */}
        <div className="flex items-end justify-between h-40 gap-1 px-2">
          {metrics.map((metric, idx) => {
            const normalizedValue = ((metric.value - minValue) / range) * 100;
            return (
              <div
                key={idx}
                className="flex-1 flex flex-col items-center gap-2"
              >
                <div
                  className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-600"
                  style={{ height: `${normalizedValue}%`, minHeight: '2px' }}
                  title={`${metric.metric}: ${metric.value}`}
                />
                <span className="text-xs text-gray-600 text-center">
                  {metric.date}
                </span>
              </div>
            );
          })}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div className="p-2 bg-gray-50 rounded">
            <p className="text-gray-600">Latest</p>
            <p className="font-semibold text-gray-900">
              {metrics[metrics.length - 1]?.value}
            </p>
          </div>
          <div className="p-2 bg-gray-50 rounded">
            <p className="text-gray-600">Average</p>
            <p className="font-semibold text-gray-900">
              {(values.reduce((a, b) => a + b) / values.length).toFixed(1)}
            </p>
          </div>
          <div className="p-2 bg-gray-50 rounded">
            <p className="text-gray-600">Change</p>
            <p className={`font-semibold ${
              values[values.length - 1] < values[0]
                ? 'text-green-600'
                : 'text-red-600'
            }`}>
              {(values[values.length - 1] - values[0]).toFixed(1)}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Health Trends</h2>

      {/* Metric selector */}
      <div className="flex gap-2 mb-6">
        {[
          { value: 'cholesterol', label: 'Cholesterol' },
          { value: 'blood-pressure', label: 'Blood Pressure' },
          { value: 'weight', label: 'Weight' },
        ].map((option) => (
          <button
            key={option.value}
            onClick={() => setSelectedMetric(option.value)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedMetric === option.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      {isLoading ? (
        <div className="animate-pulse h-40 bg-gray-100 rounded" />
      ) : (
        renderChart()
      )}
    </div>
  );
}