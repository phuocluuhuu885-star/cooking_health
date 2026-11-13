import type { RootStackParamList } from './types/navigation';
import { CommonActions } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
let navigation: StackNavigationProp<RootStackParamList>;
const pendingNavigationActions: Array<() => void> = [];

export const onSetNavigation = (
  navi: StackNavigationProp<RootStackParamList>,
) => {
  navigation = navi;
  pendingNavigationActions.splice(0).forEach(action => action());
};

type NavigateArgs<RouteName extends keyof RootStackParamList> =
  undefined extends RootStackParamList[RouteName]
    ? [params?: RootStackParamList[RouteName], isNewScreen?: boolean]
    : [params: RootStackParamList[RouteName], isNewScreen?: boolean];

export const navigate = <RouteName extends keyof RootStackParamList>(
  screenKey: RouteName,
  ...args: NavigateArgs<RouteName>
) => {
  const [params, isNewScreen] = args;
  if (isNewScreen) {
    navigation.dispatch({
      type: 'PUSH',
      payload: { name: screenKey, params },
    });
  } else {
    navigation.dispatch(CommonActions.navigate(screenKey, params));
  }
};

export const navigateWhenReady = <RouteName extends keyof RootStackParamList>(
  screenKey: RouteName,
  ...args: NavigateArgs<RouteName>
) => {
  const action = () => navigate(screenKey, ...args);
  if (navigation) {
    action();
    return;
  }
  pendingNavigationActions.push(action);
};

export const resetTo = (screenKey: string, params?: any) => {
  navigation.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [
        {
          name: screenKey,
          params: params,
        },
      ],
    }),
  );
};

export const replace = (screenKey: any, params?: any) => {
  navigation.replace(screenKey, params);
};

export const goBack = () => {
  navigation.goBack();
};

export type OptionRequest = {
  type?: 'ADD_NEWS';
  screenPercent?: 35 | 50 | 70 | 95;
  options?: {
    ID: string;
    Name: string;
    Icon?: any;
  }[];
  Title?: string;
};
