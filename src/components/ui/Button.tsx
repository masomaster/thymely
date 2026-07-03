import { ActivityIndicator, Pressable, Text, type PressableProps } from 'react-native';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<PressableProps, 'children'> {
  title: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

const containerVariant: Record<Variant, string> = {
  primary: 'bg-leaf-600 active:bg-leaf-700',
  secondary: 'bg-leaf-100 active:bg-leaf-200',
  ghost: 'bg-transparent active:bg-leaf-50',
  danger: 'bg-red-500 active:bg-red-600',
};

const textVariant: Record<Variant, string> = {
  primary: 'text-white',
  secondary: 'text-leaf-800',
  ghost: 'text-leaf-700',
  danger: 'text-white',
};

const sizeContainer: Record<Size, string> = {
  sm: 'px-3 py-2 rounded-lg',
  md: 'px-4 py-3 rounded-xl',
  lg: 'px-5 py-4 rounded-2xl',
};

const sizeText: Record<Size, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
};

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  disabled,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      className={[
        'flex-row items-center justify-center gap-2',
        sizeContainer[size],
        containerVariant[variant],
        fullWidth ? 'w-full' : '',
        isDisabled ? 'opacity-50' : '',
      ].join(' ')}
      {...props}
    >
      {loading ? <ActivityIndicator size="small" color={variant === 'primary' || variant === 'danger' ? '#fff' : '#365d21'} /> : null}
      <Text className={['font-semibold text-center', sizeText[size], textVariant[variant]].join(' ')}>
        {title}
      </Text>
    </Pressable>
  );
}
