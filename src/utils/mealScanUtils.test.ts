import { updateMealScanComponent } from './mealScanUtils';
import type { AiMealScanResult } from './types/meal';

const createResult = (): AiMealScanResult => ({
  recognized: true,
  dishName: 'Cơm trứng',
  components: [
    {
      name: 'Cơm',
      estimatedAmount: '1 bát',
      estimatedWeightG: 150,
      estimatedQuantity: 1,
      quantityUnit: 'bát',
      nutrition: {
        caloriesKcal: 200,
        proteinG: 4,
        carbohydratesG: 45,
        fatG: 1,
        fiberG: 1,
      },
      confidence: 'MEDIUM',
    },
    {
      name: 'Trứng',
      estimatedAmount: '1 quả',
      estimatedWeightG: 50,
      estimatedQuantity: 1,
      quantityUnit: 'quả',
      nutrition: {
        caloriesKcal: 70,
        proteinG: 6,
        carbohydratesG: 1,
        fatG: 5,
        fiberG: 0,
      },
      confidence: 'HIGH',
    },
  ],
  totalNutrition: {
    caloriesKcal: 270,
    proteinG: 10,
    carbohydratesG: 46,
    fatG: 6,
    fiberG: 1,
  },
  notes: [],
});

describe('updateMealScanComponent', () => {
  it('scales component and total nutrition when weight changes', () => {
    const updated = updateMealScanComponent(createResult(), 0, {
      weightG: 160,
    });

    expect(updated.components[0]?.estimatedWeightG).toBe(160);
    expect(updated.components[0]?.nutrition.caloriesKcal).toBeCloseTo(
      200 * (160 / 150),
    );
    expect(updated.totalNutrition.caloriesKcal).toBeCloseTo(
      200 * (160 / 150) + 70,
    );
  });

  it('scales quantity, weight, description, and nutrition together', () => {
    const updated = updateMealScanComponent(createResult(), 1, {
      quantity: 2,
    });

    expect(updated.components[1]?.estimatedQuantity).toBe(2);
    expect(updated.components[1]?.estimatedAmount).toBe('1 quả');
    expect(updated.components[1]?.estimatedWeightG).toBe(100);
    expect(updated.components[1]?.nutrition.caloriesKcal).toBe(140);
    expect(updated.totalNutrition.caloriesKcal).toBe(340);
  });

  it('does not allow quantity or weight below the supported minimum', () => {
    const weightUpdated = updateMealScanComponent(createResult(), 0, {
      weightG: 0,
    });
    const quantityUpdated = updateMealScanComponent(createResult(), 0, {
      quantity: 0,
    });

    expect(weightUpdated.components[0]?.estimatedWeightG).toBe(10);
    expect(quantityUpdated.components[0]?.estimatedQuantity).toBe(1);
  });
});
