import { memo } from 'react';
import { KeyboardTypeOptions, StyleSheet, View } from 'react-native';
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
  variant?: 'auth';
};

const InputComponent = memo((props: IProps) => {
  const hasTitle = Boolean(props.title);
  const isError = Boolean(props.errMsg);

  const onTextChange = (text: string) => {
    props.onTextChange?.(text, props.inputKey);
  };

  return (
    <View style={styles.formGroup}>
      {hasTitle ? (
        <Text
          style={[styles.label, props.variant === 'auth' && styles.authLabel]}
        >
          {props.title}{' '}
          {props.isRequire ? <Text style={styles.required}>*</Text> : null}
        </Text>
      ) : null}
      <TextInput
        style={[
          styles.input,
          props.variant === 'auth' && styles.authInput,
          props.isDisabled && styles.disabled,
          isError && styles.error,
          isError && props.variant === 'auth' && styles.authError,
        ]}
        onChangeText={onTextChange}
        value={props.value}
        keyboardType={props.keyboardType}
        autoCapitalize={props.inputKey === 'email' ? 'none' : 'sentences'}
        autoCorrect={props.inputKey !== 'email'}
        secureTextEntry={props.inputKey === 'password'}
        editable={!props.isDisabled}
      />
      {isError ? <Text style={styles.err}>{props.errMsg}</Text> : null}
    </View>
  );
});

export default InputComponent;

const styles = StyleSheet.create({
  formGroup: {
    gap: 4,
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
  authInput: {
    minHeight: 48,
    borderColor: '#E2EAE4',
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#172B23',
    backgroundColor: '#F9FBF9',
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
