import type {
  AiMealScanNutrition,
  AiMealScanResult,
} from './types/meal';

type MealScanComponent = AiMealScanResult['components'][number];

const scaleNutrition = (
  nutrition: AiMealScanNutrition,
  factor: number,
): AiMealScanNutrition => ({
  caloriesKcal: Math.max(0, nutrition.caloriesKcal * factor),
  proteinG: Math.max(0, nutrition.proteinG * factor),
  carbohydratesG: Math.max(0, nutrition.carbohydratesG * factor),
  fatG: Math.max(0, nutrition.fatG * factor),
  fiberG:
    nutrition.fiberG === null
      ? null
      : Math.max(0, nutrition.fiberG * factor),
});

const sumNutrition = (
  components: MealScanComponent[],
): AiMealScanNutrition => ({
  caloriesKcal: components.reduce(
    (total, component) => total + component.nutrition.caloriesKcal,
    0,
  ),
  proteinG: components.reduce(
    (total, component) => total + component.nutrition.proteinG,
    0,
  ),
  carbohydratesG: components.reduce(
    (total, component) => total + component.nutrition.carbohydratesG,
    0,
  ),
  fatG: components.reduce(
    (total, component) => total + component.nutrition.fatG,
    0,
  ),
  fiberG: components.some(component => component.nutrition.fiberG === null)
    ? null
    : components.reduce(
        (total, component) => total + (component.nutrition.fiberG ?? 0),
        0,
      ),
});

export const updateMealScanComponent = (
  result: AiMealScanResult,
  componentIndex: number,
  update: { weightG: number } | { quantity: number },
): AiMealScanResult => {
  const currentComponent = result.components[componentIndex];
  if (!currentComponent) return result;

  const updatedComponents = result.components.map((component, index) => {
    if (index !== componentIndex) return component;

    if ('weightG' in update) {
      const currentWeight = component.estimatedWeightG;
      if (currentWeight === null || currentWeight <= 0) return component;
      const weightG = Math.max(10, Math.round(update.weightG));
      const factor = weightG / currentWeight;
      return {
        ...component,
        estimatedWeightG: weightG,
        nutrition: scaleNutrition(component.nutrition, factor),
      };
    }

    const currentQuantity = component.estimatedQuantity;
    if (currentQuantity === null || currentQuantity <= 0) return component;
    const quantity = Math.max(1, update.quantity);
    const factor = quantity / currentQuantity;
    const estimatedWeightG =
      component.estimatedWeightG === null
        ? null
        : Math.max(10, Math.round(component.estimatedWeightG * factor));
    const nutritionFactor =
      estimatedWeightG !== null &&
      component.estimatedWeightG !== null &&
      component.estimatedWeightG > 0
        ? estimatedWeightG / component.estimatedWeightG
        : factor;

    return {
      ...component,
      estimatedQuantity: quantity,
      estimatedWeightG,
      nutrition: scaleNutrition(component.nutrition, nutritionFactor),
    };
  });

  return {
    ...result,
    components: updatedComponents,
    totalNutrition: sumNutrition(updatedComponents),
  };
};
