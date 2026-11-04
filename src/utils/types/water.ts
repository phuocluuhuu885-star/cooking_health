export type WaterIntakeEntry = {
  id: string;
  amountMl: number;
  consumedAt: string;
};

export type WaterIntakeResponse = {
  success: boolean;
  message?: string;
  data?: {
    date: string;
    totalMl: number;
    entries: WaterIntakeEntry[];
    dailyTotals: Array<{ date: string; totalMl: number }>;
  };
};

export type AddWaterIntakeResponse = {
  success: boolean;
  message?: string;
  data?: {
    entry: WaterIntakeEntry;
    date: string;
  };
};
