import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Report {
  id: string;
  file_name: string;
  created_at: string;
  extracted_text: string;
}

interface ReportComparisonProps {
  userId: string;
}

export default function ReportComparison({ userId }: ReportComparisonProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport1, setSelectedReport1] = useState<string>('');
  const [selectedReport2, setSelectedReport2] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, [userId]);

  const fetchReports = async () => {
    try {
      const { data } = await supabase
        .from('reports')
        .select('id, file_name, created_at, extracted_text')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (data) {
        setReports(data);
        if (data.length >= 2) {
          setSelectedReport1(data[0].id);
          setSelectedReport2(data[1].id);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const extractMetrics = (text: string): Record<string, string | null> => {
    return {
      cholesterol: extractNumber(text, /cholesterol[:\s]*(\d+)/i),
      ldl: extractNumber(text, /ldl[:\s]*(\d+)/i),
      hdl: extractNumber(text, /hdl[:\s]*(\d+)/i),
      triglycerides: extractNumber(text, /triglycerides[:\s]*(\d+)/i),
      bloodPressure: extractNumber(text, /blood pressure[:\s]*(\d+\/\d+)/i),
      weight: extractNumber(text, /weight[:\s]*(\d+(?:\.\d+)?)/i),
      hba1c: extractNumber(text, /hba1c[:\s]*(\d+(?:\.\d+)?)/i),
    };
  };

  const extractNumber = (text: string, regex: RegExp): string | null => {
    const match = text.match(regex);
    return match ? match[1] : null;
  };

  const report1 = reports.find((r) => r.id === selectedReport1);
  const report2 = reports.find((r) => r.id === selectedReport2);

  const metrics1: Record<string, string | null> = report1 ? extractMetrics(report1.extracted_text) : {};
  const metrics2: Record<string, string | null> = report2 ? extractMetrics(report2.extracted_text) : {};

  const getChangeIndicator = (val1: string | null, val2: string | null): { direction: string; color: string; change: string } | null => {
    if (!val1 || !val2) return null;

    const num1 = parseFloat(val1);
    const num2 = parseFloat(val2);

    if (num2 < num1)
      return { direction: '↓', color: 'text-green-600', change: (num1 - num2).toFixed(1) };
    if (num2 > num1)
      return { direction: '↑', color: 'text-red-600', change: (num2 - num1).toFixed(1) };
    return { direction: '→', color: 'text-gray-600', change: '0' };
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (reports.length < 2) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
        <p className="text-gray-500">Upload at least 2 reports to compare</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Compare Reports</h2>

      {/* Report selectors */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Report 1
          </label>
          <select
            value={selectedReport1}
            onChange={(e) => setSelectedReport1(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {reports.map((r) => (
              <option key={r.id} value={r.id}>
                {r.file_name} ({new Date(r.created_at).toLocaleDateString()})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Report 2
          </label>
          <select
            value={selectedReport2}
            onChange={(e) => setSelectedReport2(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {reports.map((r) => (
              <option key={r.id} value={r.id}>
                {r.file_name} ({new Date(r.created_at).toLocaleDateString()})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Comparison table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 px-2 font-semibold text-gray-900">
                Metric
              </th>
              <th className="text-center py-2 px-2 font-semibold text-gray-900">
                Report 1
              </th>
              <th className="text-center py-2 px-2 font-semibold text-gray-900">
                Report 2
              </th>
              <th className="text-center py-2 px-2 font-semibold text-gray-900">
                Change
              </th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(metrics1).map(([key, val1]) => {
              const val2 = (metrics2 as Record<string, string | null>)[key];
              const change = getChangeIndicator(val1 as string | null, val2 as string | null);

              return (
                <tr key={key} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-2 font-medium text-gray-700 capitalize">
                    {key.replace(/([A-Z])/g, ' $1')}
                  </td>
                  <td className="py-3 px-2 text-center text-gray-600">
                    {val1 ? String(val1) : '—'}
                  </td>
                  <td className="py-3 px-2 text-center text-gray-600">
                    {val2 ? String(val2) : '—'}
                  </td>
                  <td className={`py-3 px-2 text-center font-semibold ${
                    change?.color || 'text-gray-600'
                  }`}>
                    {change ? `${change.direction} ${String(change.change)}` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}