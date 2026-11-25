import { useEffect, useRef } from 'react';
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  DoughnutController,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';
import { formatCompactRupiah, formatRupiah } from '../utils/finance';

Chart.register(
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  DoughnutController,
  ArcElement,
  Tooltip,
  Legend
);

interface GroupedBarChartProps {
  labels: string[];
  income: number[];
  rabTarget: number[];
  expense: number[];
  mode: 'period' | 'category';
  chartKind?: 'bar' | 'line';
}

export function ComparisonGroupedBarChart({
  labels,
  income,
  rabTarget,
  expense,
  mode,
  chartKind = 'bar',
}: GroupedBarChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const shortLabels = labels.map((l) =>
      l.length > 18 ? `${l.slice(0, 16)}…` : l
    );

    const isLine = chartKind === 'line';

    chartRef.current = new Chart(canvas, {
      type: isLine ? 'line' : 'bar',
      data: {
        labels: shortLabels,
        datasets: [
          {
            label: mode === 'period' ? 'Pemasukan' : 'Proporsi Pemasukan',
            data: income,
            backgroundColor: '#16A34A',
            borderColor: '#16A34A',
            borderWidth: isLine ? 2.5 : 0,
            tension: 0.28,
            pointRadius: isLine ? 4 : 0,
            pointHoverRadius: isLine ? 6 : 0,
            borderRadius: isLine ? 0 : 4,
            barPercentage: 0.78,
            categoryPercentage: 0.72,
          },
          {
            label: 'Jatah Anggaran',
            data: rabTarget,
            backgroundColor: '#2563EB',
            borderColor: '#2563EB',
            borderWidth: isLine ? 2.5 : 0,
            borderDash: isLine ? [5, 4] : undefined,
            tension: 0.28,
            pointRadius: isLine ? 4 : 0,
            pointHoverRadius: isLine ? 6 : 0,
            borderRadius: isLine ? 0 : 4,
            barPercentage: 0.78,
            categoryPercentage: 0.72,
          },
          {
            label: 'Terpakai',
            data: expense,
            backgroundColor: '#DC2626',
            borderColor: '#DC2626',
            borderWidth: isLine ? 2.5 : 0,
            tension: 0.28,
            pointRadius: isLine ? 4 : 0,
            pointHoverRadius: isLine ? 6 : 0,
            borderRadius: isLine ? 0 : 4,
            barPercentage: 0.78,
            categoryPercentage: 0.72,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: {
              usePointStyle: true,
              pointStyle: isLine ? 'circle' : 'rectRounded',
              boxWidth: 10,
              boxHeight: 10,
              padding: 14,
              color: '#334155',
              font: {
                family: '"DM Sans", sans-serif',
                size: 12,
                weight: 500,
              },
            },
          },
          tooltip: {
            backgroundColor: '#0F172A',
            titleColor: '#F8FAFC',
            bodyColor: '#E2E8F0',
            padding: 12,
            cornerRadius: 8,
            titleFont: {
              family: '"Plus Jakarta Sans", sans-serif',
              size: 12,
              weight: 600,
            },
            bodyFont: {
              family: '"JetBrains Mono", monospace',
              size: 12,
            },
            callbacks: {
              title: (items) => {
                const idx = items[0]?.dataIndex ?? 0;
                return labels[idx] ?? '';
              },
              label: (ctx) => {
                const val = typeof ctx.parsed.y === 'number' ? ctx.parsed.y : 0;
                return ` ${ctx.dataset.label}: ${formatRupiah(val)}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
            border: {
              color: '#E2E8F0',
            },
            ticks: {
              color: '#475569',
              font: {
                family: '"DM Sans", sans-serif',
                size: 11,
              },
            },
          },
          y: {
            beginAtZero: true,
            border: {
              display: false,
            },
            grid: {
              color: '#F1F5F9',
            },
            ticks: {
              color: '#64748B',
              font: {
                family: '"JetBrains Mono", monospace',
                size: 11,
              },
              callback: (value) => formatCompactRupiah(Number(value)),
            },
          },
        },
      },
    });

    const observer = new ResizeObserver(() => {
      chartRef.current?.resize();
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [labels, income, rabTarget, expense, mode, chartKind]);

  return (
    <div ref={containerRef} className="relative h-72 w-full">
      <canvas ref={canvasRef} className="!h-full !w-full" data-testid="grouped-bar-chart" />
    </div>
  );
}

export const DOUGHNUT_COLORS = [
  '#2563EB',
  '#0F172A',
  '#16A34A',
  '#D97706',
  '#DC2626',
  '#0284C7',
  '#7C3AED',
  '#475569',
];

interface ExpenseDoughnutChartProps {
  labels: string[];
  values: number[];
}

export function ExpenseDoughnutChart({ labels, values }: ExpenseDoughnutChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const total = values.reduce((s, v) => s + v, 0);

    chartRef.current = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: labels.map((_, idx) => DOUGHNUT_COLORS[idx % DOUGHNUT_COLORS.length]),
            borderColor: '#FFFFFF',
            borderWidth: 2,
            hoverOffset: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '66%',
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: '#0F172A',
            padding: 12,
            cornerRadius: 8,
            bodyFont: {
              family: '"JetBrains Mono", monospace',
              size: 12,
            },
            callbacks: {
              label: (ctx) => {
                const val = typeof ctx.parsed === 'number' ? ctx.parsed : 0;
                const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0.0';
                return ` ${formatRupiah(val)} (${pct}%)`;
              },
            },
          },
        },
      },
    });

    const observer = new ResizeObserver(() => {
      chartRef.current?.resize();
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [labels, values]);

  return (
    <div ref={containerRef} className="relative h-52 w-full">
      <canvas ref={canvasRef} className="!h-full !w-full" data-testid="expense-doughnut-chart" />
    </div>
  );
}

export const INCOME_DOUGHNUT_COLORS = [
  '#059669',
  '#0D9488',
  '#2563EB',
  '#0284C7',
  '#65A30D',
  '#0F172A',
  '#475569',
];

export function IncomeDoughnutChart({ labels, values }: ExpenseDoughnutChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const total = values.reduce((s, v) => s + v, 0);

    chartRef.current = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: labels.map(
              (_, idx) => INCOME_DOUGHNUT_COLORS[idx % INCOME_DOUGHNUT_COLORS.length]
            ),
            borderColor: '#FFFFFF',
            borderWidth: 2,
            hoverOffset: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '66%',
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: '#0F172A',
            padding: 12,
            cornerRadius: 8,
            bodyFont: {
              family: '"JetBrains Mono", monospace',
              size: 12,
            },
            callbacks: {
              label: (ctx) => {
                const val = typeof ctx.parsed === 'number' ? ctx.parsed : 0;
                const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0.0';
                return ` ${formatRupiah(val)} (${pct}%)`;
              },
            },
          },
        },
      },
    });

    const observer = new ResizeObserver(() => {
      chartRef.current?.resize();
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [labels, values]);

  return (
    <div ref={containerRef} className="relative h-52 w-full">
      <canvas ref={canvasRef} className="!h-full !w-full" data-testid="income-doughnut-chart" />
    </div>
  );
}
