import { memo, useCallback } from 'react';
import {
  KeyboardTypeOptions,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import Text from './text';
import TextInput from './inputBase';

type IProps = {
  title?: string;
  onTextChange: (value: string, key?: string) => void;
  inputKey?: string;
  value?: string;
  isRequire?: boolean;
  keyboardType?: KeyboardTypeOptions | undefined;
  isDisabled?: boolean;
  errMsg?: string;
  variant?: 'auth' | 'health';
  isPasswordVisible?: boolean;
  onTogglePasswordVisibility?: () => void;
};

const InputComponent = memo((props: IProps) => {
  const hasTitle = Boolean(props.title);
  const isError = Boolean(props.errMsg);
  const {
    inputKey,
    onTextChange: onTextChangeProp,
    onTogglePasswordVisibility: onTogglePasswordVisibilityProp,
  } = props;

  const onTextChange = useCallback((text: string) => {
    onTextChangeProp?.(text, inputKey);
  }, [inputKey, onTextChangeProp]);

  const onTogglePasswordVisibility = useCallback(() => {
    onTogglePasswordVisibilityProp?.();
  }, [onTogglePasswordVisibilityProp]);

  const hasPasswordToggle =
    inputKey === 'password' && Boolean(onTogglePasswordVisibilityProp);

  return (
    <View style={styles.formGroup}>
      {hasTitle ? (
        <Text
          style={[
            styles.label,
            props.variant === 'auth' && styles.authLabel,
            props.variant === 'health' && styles.healthLabel,
          ]}
        >
          {props.title}{' '}
          {props.isRequire ? <Text style={styles.required}>*</Text> : null}
        </Text>
      ) : null}
      <View style={styles.inputContainer}>
        <TextInput
          style={[
            styles.input,
            props.variant === 'auth' && styles.authInput,
            hasPasswordToggle && styles.passwordInput,
            props.isDisabled && styles.disabled,
            isError && styles.error,
            isError && props.variant === 'auth' && styles.authError,
          ]}
          onChangeText={onTextChange}
          value={props.value}
          keyboardType={props.keyboardType}
          autoCapitalize={props.inputKey === 'email' ? 'none' : 'sentences'}
          autoCorrect={props.inputKey !== 'email'}
          secureTextEntry={
            inputKey === 'password' && !props.isPasswordVisible
          }
          editable={!props.isDisabled}
        />
        {hasPasswordToggle ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={
              props.isPasswordVisible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'
            }
            accessibilityState={{ selected: Boolean(props.isPasswordVisible) }}
            disabled={props.isDisabled}
            onPress={onTogglePasswordVisibility}
            style={styles.passwordToggle}
            hitSlop={8}
          >
            <Svg width={21} height={21} viewBox="0 0 24 24">
              {props.isPasswordVisible ? (
                <>
                  <Path
                    d="M3 3l18 18M10.6 6.2A9.8 9.8 0 0 1 12 6c6.1 0 9.5 6 9.5 6a16.6 16.6 0 0 1-3.1 3.6M6.2 6.9C3.8 8.5 2.5 12 2.5 12s3.4 6 9.5 6c1.2 0 2.3-.2 3.2-.6M9.9 9.9a3 3 0 0 0 4.2 4.2"
                    fill="none"
                    stroke="#66766C"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.7}
                  />
                </>
              ) : (
                <>
                  <Path
                    d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z"
                    fill="none"
                    stroke="#66766C"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.7}
                  />
                  <Circle
                    cx={12}
                    cy={12}
                    r={2.7}
                    fill="none"
                    stroke="#66766C"
                    strokeWidth={1.7}
                  />
                </>
              )}
            </Svg>
          </TouchableOpacity>
        ) : null}
      </View>
      {isError ? <Text style={styles.err}>{props.errMsg}</Text> : null}
    </View>
  );
});

export default InputComponent;

const styles = StyleSheet.create({
  formGroup: {
    gap: 4,
  },
  inputContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  label: {
    fontSize: 18,
    fontWeight: '500',
    color: '#34404B',
  },
  required: {
    color: '#FF5040',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E1E8F1',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '500',
    color: '#34404B',
    backgroundColor: '#FFFFFF',
  },
  authLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#172B23',
  },
  healthLabel: {
    fontSize: 16,
  },
  authInput: {
    minHeight: 48,
    borderColor: '#E2EAE4',
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#172B23',
    backgroundColor: '#F9FBF9',
  },
  passwordInput: {
    paddingRight: 48,
  },
  passwordToggle: {
    position: 'absolute',
    right: 7,
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    backgroundColor: '#F0F5F9',
  },
  error: {
    borderColor: 'red',
  },
  authError: {
    borderColor: '#D84E44',
    backgroundColor: '#FFF8F7',
  },
  err: {
    color: 'red',
    fontSize: 14,
    marginTop: 2,
    marginHorizontal: 8,
  },
});
