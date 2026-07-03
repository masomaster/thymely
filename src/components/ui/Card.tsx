import { View, type ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  className?: string;
}

export function Card({ className = '', children, ...props }: CardProps) {
  return (
    <View
      className={[
        'bg-white rounded-2xl p-4 border border-leaf-100',
        'shadow-sm shadow-leaf-900/5',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </View>
  );
}
