/**
 * PriceHistoryChart — gráfico de linha do histórico de preço (Recharts).
 * Últimos 30 dias por padrão. Empty state amigável quando sem dados.
 */
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatFuelPrice } from '@abastece/utils/price';

export interface PricePoint {
  /** Data ISO do ponto. */
  date: string;
  price: number;
}

interface PriceHistoryChartProps {
  data: PricePoint[];
  height?: number;
}

/** Formata data ISO como "dd/mm" para o eixo X. */
function shortDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function PriceHistoryChart({ data, height = 200 }: PriceHistoryChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-md bg-surface text-sm text-text-muted">
        Ainda não há histórico de preço para este posto.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis
          dataKey="date"
          tickFormatter={shortDate}
          tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
        />
        <YAxis
          domain={['auto', 'auto']}
          tickFormatter={(v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`}
          tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
          width={64}
        />
        <Tooltip
          formatter={(value: number) => [formatFuelPrice(value), 'Preço']}
          labelFormatter={(label: string) => shortDate(label)}
        />
        <Line
          type="monotone"
          dataKey="price"
          stroke="var(--color-primary-bright)"
          strokeWidth={3}
          dot={{ r: 3, fill: 'var(--color-primary)' }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
