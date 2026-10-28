export const formatNumberWithOptionalDecimal = (value: number) =>
  Number.isInteger(value) ? `${value}` : value.toFixed(1);

export const formatLocalizedNumber = (value: number) =>
  Number.isInteger(value)
    ? value.toLocaleString('vi-VN')
    : value.toLocaleString('vi-VN', { maximumFractionDigits: 1 });

export const formatLocalizedWeight = (amountG: number) =>
  amountG >= 1000
    ? `${formatLocalizedNumber(amountG / 1000)} kg`
    : `${formatLocalizedNumber(amountG)} g`;

export const getConsumptionDayLabel = (
  date: string,
  period: 'WEEK' | 'MONTH',
  index: number,
) =>
  period === 'WEEK'
    ? ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'][index]
    : date.slice(8, 10);
