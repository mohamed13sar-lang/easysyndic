import { PrimaryButton } from '@/components/premium';

type AppButtonProps = {
  title: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
};

export function AppButton({ title, onPress, loading = false, disabled = false }: AppButtonProps) {
  return <PrimaryButton title={title} onPress={onPress} loading={loading} disabled={disabled} />;
}
