import { Text, TextInput, View, type TextInputProps } from 'react-native';

interface TextFieldProps extends TextInputProps {
  label?: string;
  hint?: string;
  containerClassName?: string;
}

export function TextField({
  label,
  hint,
  containerClassName = '',
  className = '',
  ...props
}: TextFieldProps) {
  return (
    <View className={['gap-1.5', containerClassName].join(' ')}>
      {label ? <Text className="text-sm font-medium text-leaf-900">{label}</Text> : null}
      <TextInput
        placeholderTextColor="#9ca3af"
        className={[
          'border border-leaf-200 rounded-xl px-4 py-3 text-base text-leaf-900 bg-white',
          'focus:border-leaf-500',
          className,
        ].join(' ')}
        {...props}
      />
      {hint ? <Text className="text-xs text-leaf-500">{hint}</Text> : null}
    </View>
  );
}
