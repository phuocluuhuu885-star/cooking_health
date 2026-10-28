import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import configs from '../abase/constant/config';
import type { HouseholdChatMessage, MealPeriod } from './types';

type Acknowledge<T> = (
  response: { success: true; data: T } | { success: false; message: string },
) => void;

export type HouseholdMealReminder = {
  reminderId: string;
  householdId: string;
  mealPeriod: MealPeriod;
  title: string;
  body: string;
  startedAt: string;
};

type MealReminderResult =
  | { success: true }
  | { success: false; message: string };

type ServerToClientEvents = {
  'chat:ready': (payload: { householdId: string }) => void;
  'chat:message': (message: HouseholdChatMessage) => void;
  'chat:error': (error: { message: string }) => void;
  'meal:reminder:started': (reminder: HouseholdMealReminder) => void;
  'meal:reminder:state': (payload: {
    householdId: string;
    activeReminder: HouseholdMealReminder | null;
  }) => void;
  'meal:reminder:dismissed': (payload: {
    householdId: string;
    reminderId: string;
    acknowledgedBy: string | null;
  }) => void;
};

type ClientToServerEvents = {
  'chat:join': (
    payload: { householdId: string },
    acknowledge: Acknowledge<{ householdId: string }>,
  ) => void;
  'chat:leave': () => void;
  'chat:send': (
    payload: { content: string },
    acknowledge: Acknowledge<HouseholdChatMessage>,
  ) => void;
  'meal:reminder:subscribe': (
    payload: { householdId: string },
    acknowledge: Acknowledge<{ householdId: string }>,
  ) => void;
  'meal:reminder:start': (
    payload: { householdId: string; mealPeriod: MealPeriod },
    acknowledge: (response: MealReminderResult) => void,
  ) => void;
  'meal:reminder:acknowledge': (
    payload: { householdId: string; reminderId: string },
    acknowledge: (response: MealReminderResult) => void,
  ) => void;
};

export type ChatSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export const createHouseholdChatSocket = (token: string) =>
  io(configs.baseUrl, {
    autoConnect: false,
    auth: { token },
    reconnection: true,
    timeout: 10000,
  }) as ChatSocket;
