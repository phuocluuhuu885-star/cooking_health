import type { RootStackParamList } from './types/navigation';
import { CommonActions } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
let navigation: StackNavigationProp<RootStackParamList>;

export const onSetNavigation = (
  navi: StackNavigationProp<RootStackParamList>,
) => {
  navigation = navi;
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
