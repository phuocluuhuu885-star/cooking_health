import type { EstimatedPriceRange } from './types';

const formatVnd = (amount: number) =>
  `${Math.round(amount).toLocaleString('vi-VN')}đ`;

export const formatEstimatedPrice = (price?: EstimatedPriceRange | null) => {
  if (!price || (price.minVnd === 0 && price.maxVnd === 0)) {
    return 'Chưa có ước tính giá';
  }
  return `Khoảng ${formatVnd(price.minVnd)}–${formatVnd(price.maxVnd)}`;
};

export const scaleEstimatedPrice = (
  price: EstimatedPriceRange | undefined,
  servings: number,
): EstimatedPriceRange | null => {
  if (!price) return null;
  return {
    minVnd: Math.round(price.minVnd * servings),
    maxVnd: Math.round(price.maxVnd * servings),
  };
};

export const sumEstimatedPrices = (
  prices: Array<EstimatedPriceRange | undefined>,
): EstimatedPriceRange => {
  return prices.reduce<EstimatedPriceRange>(
    (total, price) => ({
      minVnd: total.minVnd + (price?.minVnd ?? 0),
      maxVnd: total.maxVnd + (price?.maxVnd ?? 0),
    }),
    { minVnd: 0, maxVnd: 0 },
  );
};
