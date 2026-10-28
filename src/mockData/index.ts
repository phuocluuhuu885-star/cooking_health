import type { Category, Recipe } from '../utils/types';

export const CATEGORIES: Category[] = [
  {
    id: 'all',
    title: 'All',
  },
  {
    id: 'eat-clean',
    title: 'Eat Clean',
  },
  {
    id: 'high-protein',
    title: 'High Protein',
  },
  {
    id: 'keto',
    title: 'Keto',
  },
  {
    id: 'vegan',
    title: 'Vegan',
  },
];

export const RECIPES: Recipe[] = [
  {
    id: '1',
    name: 'Pan-Seared Salmon with Lemon',
    image:
      'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=600&q=80',
    time: 20,
    calories: 450,
    protein: 35,
    carbs: 9,
    fat: 18,
    category: ['eat-clean', 'keto'],
  },
  {
    id: '2',
    name: 'Chicken Avocado Bowl',
    image:
      'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=600&q=80',
    time: 15,
    calories: 520,
    protein: 42,
    carbs: 12,
    fat: 22,
    category: ['high-protein', 'keto'],
  },
  {
    id: '3',
    name: 'Tofu Veggie Stir-Fry',
    image:
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80',
    time: 18,
    calories: 310,
    protein: 18,
    carbs: 28,
    fat: 10,
    category: ['eat-clean', 'vegan'],
  },
  {
    id: '4',
    name: 'Greek Yogurt Parfait',
    image:
      'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=600&q=80',
    time: 5,
    calories: 280,
    protein: 15,
    carbs: 32,
    fat: 6,
    category: ['eat-clean', 'high-protein'],
  },
  {
    id: '5',
    name: 'Grilled Chicken Salad',
    image:
      'https://images.unsplash.com/photo-1546793665-c74683f339c1?auto=format&fit=crop&w=600&q=80',
    time: 15,
    calories: 390,
    protein: 38,
    carbs: 14,
    fat: 16,
    category: ['eat-clean', 'high-protein'],
  },
  {
    id: '6',
    name: 'Avocado Egg Toast',
    image:
      'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=600&q=80',
    time: 10,
    calories: 340,
    protein: 18,
    carbs: 24,
    fat: 19,
    category: ['eat-clean', 'keto'],
  },
];
