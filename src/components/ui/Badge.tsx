import { Text, View } from 'react-native';

type Tone = 'leaf' | 'soil' | 'amber' | 'red' | 'gray';

const tones: Record<Tone, string> = {
  leaf: 'bg-leaf-100 text-leaf-800',
  soil: 'bg-soil-100 text-soil-800',
  amber: 'bg-amber-100 text-amber-800',
  red: 'bg-red-100 text-red-700',
  gray: 'bg-gray-100 text-gray-700',
};

export function Badge({ label, tone = 'leaf' }: { label: string; tone?: Tone }) {
  const [bg, text] = tones[tone].split(' ');
  return (
    <View className={['px-2.5 py-1 rounded-full self-start', bg].join(' ')}>
      <Text className={['text-xs font-medium', text].join(' ')}>{label}</Text>
    </View>
  );
}
