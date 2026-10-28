import type { Dispatch, SetStateAction } from 'react';

const isStateUpdater = <Value,>(
  value: SetStateAction<Value>,
): value is (previousValue: Value) => Value => typeof value === 'function';

export const createStateSetter = <
  State extends object,
  Key extends keyof State,
>(
  setState: Dispatch<SetStateAction<State>>,
  key: Key,
): Dispatch<SetStateAction<State[Key]>> => value =>
  setState(previous => ({
    ...previous,
    [key]:
      isStateUpdater(value) ? value(previous[key]) : value,
  }));
