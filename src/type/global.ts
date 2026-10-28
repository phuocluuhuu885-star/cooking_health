import type { UserState } from './user';
import type { AppDataState } from '../utils/types';

export type GlobalState = {
  user: UserState;
  appData: AppDataState;
};
