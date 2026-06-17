import { ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { layout, radius, shadows, spacing, typography } from '@/constants/design';

type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  keyboardAvoiding?: boolean;
  bottomInset?: number;
  contentStyle?: StyleProp<ViewStyle>;
};

type HeaderProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
};

type CardProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
};

type ButtonProps = {
  title: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  tone?: 'primary' | 'secondary' | 'danger';
};

type BadgeProps = {
  label: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
};

type StateProps = {
  title?: string;
  message: string;
  action?: ReactNode;
};

export function AppScreen({
  children,
  scroll = true,
  keyboardAvoiding = false,
  bottomInset = 0,
  contentStyle,
}: ScreenProps) {
  const content = (
    <View style={[styles.content, { paddingBottom: spacing.xxxl + bottomInset }, contentStyle]}>
      {children}
    </View>
  );

  const body = (
    <SafeAreaView style={styles.safeArea}>
      {scroll ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );

  if (!keyboardAvoiding) {
    return body;
  }

  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoiding}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {body}
    </KeyboardAvoidingView>
  );
}

export function AppHeader({ eyebrow, title, subtitle, right }: HeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.headerCopy}>
        {!!eyebrow && <Text style={styles.eyebrow}>{eyebrow}</Text>}
        <Text style={styles.headerTitle}>{title}</Text>
        {!!subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
      </View>
      {right}
    </View>
  );
}

export function PremiumCard({ children, style, onPress }: CardProps) {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.card, pressed && styles.pressed, style]}>
        {children}
      </Pressable>
    );
  }

  return <View style={[styles.card, style]}>{children}</View>;
}

export const AppCard = PremiumCard;

export function StatCard({
  title,
  value,
  helper,
  icon,
  onPress,
}: {
  title: string;
  value: string;
  helper?: string;
  icon?: ReactNode;
  onPress?: () => void;
}) {
  return (
    <PremiumCard onPress={onPress} style={styles.statCard}>
      <View style={styles.statTop}>{icon}</View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
      {!!helper && <Text style={styles.statHelper}>{helper}</Text>}
    </PremiumCard>
  );
}

export function ActionCard({
  title,
  subtitle,
  icon,
  onPress,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  onPress: () => void;
}) {
  return (
    <PremiumCard onPress={onPress} style={styles.actionCard}>
      {!!icon && <View style={styles.actionIcon}>{icon}</View>}
      <View style={styles.actionCopy}>
        <Text style={styles.actionTitle}>{title}</Text>
        {!!subtitle && <Text style={styles.actionSubtitle}>{subtitle}</Text>}
      </View>
    </PremiumCard>
  );
}

export function StatusBadge({ label, tone = 'neutral' }: BadgeProps) {
  return (
    <View style={[styles.badge, badgeStyles[tone]]}>
      <Text style={[styles.badgeText, badgeTextStyles[tone]]}>{label}</Text>
    </View>
  );
}

export function PrimaryButton(props: ButtonProps) {
  return <AppButtonBase {...props} tone={props.tone ?? 'primary'} />;
}

export function SecondaryButton(props: ButtonProps) {
  return <AppButtonBase {...props} tone={props.tone ?? 'secondary'} />;
}

export function AppButton(props: ButtonProps) {
  return <AppButtonBase {...props} tone={props.tone ?? 'primary'} />;
}

function AppButtonBase({ title, onPress, loading, disabled, tone = 'primary' }: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        buttonStyles[tone],
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
      ]}>
      {loading ? (
        <ActivityIndicator color={tone === 'secondary' ? colors.primary : colors.white} />
      ) : (
        <Text style={[styles.buttonText, tone === 'secondary' && styles.buttonTextSecondary]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

export function FormInput(props: TextInputProps & { label?: string; error?: string }) {
  const { label, error, style, ...inputProps } = props;

  return (
    <View style={styles.inputWrap}>
      {!!label && <Text style={styles.inputLabel}>{label}</Text>}
      <TextInput
        placeholderTextColor={colors.mutedLight}
        {...inputProps}
        style={[styles.input, !!error && styles.inputError, style]}
      />
      {!!error && <Text style={styles.fieldError}>{error}</Text>}
    </View>
  );
}

export const AppInput = FormInput;

export function SectionTitle({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action}
    </View>
  );
}

export function EmptyState({ title = 'Aucune donnée', message, action }: StateProps) {
  return (
    <PremiumCard style={styles.stateCard}>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateMessage}>{message}</Text>
      {action}
    </PremiumCard>
  );
}

export function LoadingState({ message }: { message: string }) {
  return (
    <PremiumCard style={styles.stateCard}>
      <ActivityIndicator color={colors.primary} />
      <Text style={styles.stateMessage}>{message}</Text>
    </PremiumCard>
  );
}

export function ErrorState({ title = 'Une erreur est survenue', message, action }: StateProps) {
  return (
    <PremiumCard style={styles.stateCard}>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={[styles.stateMessage, styles.errorMessage]}>{message}</Text>
      {action}
    </PremiumCard>
  );
}

export function BalanceCard({
  label,
  amount,
  helper,
  status,
  action,
  tone = 'neutral',
}: {
  label: string;
  amount: string;
  helper?: string;
  status?: string;
  action?: ReactNode;
  tone?: 'neutral' | 'success' | 'danger';
}) {
  return (
    <PremiumCard style={[styles.balanceCard, balanceToneStyles[tone]]}>
      <Text style={[styles.balanceLabel, tone !== 'neutral' && styles.balanceTextOnTone]}>{label}</Text>
      <Text style={[styles.balanceAmount, tone !== 'neutral' && styles.balanceTextOnTone]}>{amount}</Text>
      {!!status && (
        <View style={[styles.balanceStatus, tone !== 'neutral' && styles.balanceStatusOnTone]}>
          <Text style={[styles.balanceStatusText, tone !== 'neutral' && styles.balanceStatusTextOnTone]}>
            {status}
          </Text>
        </View>
      )}
      {!!helper && (
        <Text style={[styles.balanceHelper, tone !== 'neutral' && styles.balanceTextOnTone]}>
          {helper}
        </Text>
      )}
      {action}
    </PremiumCard>
  );
}

export function AnnouncementCard({
  title,
  subtitle,
  meta,
  badge,
  urgent = false,
  onPress,
}: {
  title: string;
  subtitle?: string;
  meta?: string;
  badge?: string;
  urgent?: boolean;
  onPress?: () => void;
}) {
  return (
    <PremiumCard onPress={onPress} style={[styles.listCard, urgent && styles.urgentCard]}>
      <View style={styles.listCardHeader}>
        <View style={styles.listCardCopy}>
          {!!badge && <Text style={[styles.listCardBadge, urgent && styles.urgentText]}>{badge}</Text>}
          <Text style={styles.listCardTitle}>{title}</Text>
        </View>
        {urgent && <StatusBadge label="Urgent" tone="danger" />}
      </View>
      {!!subtitle && <Text style={styles.listCardBody} numberOfLines={2}>{subtitle}</Text>}
      {!!meta && <Text style={styles.listCardMeta}>{meta}</Text>}
    </PremiumCard>
  );
}

export function PaymentCard({
  title,
  subtitle,
  amount,
  status,
  tone = 'neutral',
  onPress,
}: {
  title: string;
  subtitle?: string;
  amount: string;
  status?: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
  onPress?: () => void;
}) {
  return (
    <PremiumCard onPress={onPress} style={styles.listCard}>
      <View style={styles.listCardHeader}>
        <View style={styles.listCardCopy}>
          <Text style={styles.listCardTitle}>{title}</Text>
          {!!subtitle && <Text style={styles.listCardMeta}>{subtitle}</Text>}
        </View>
        {!!status && <StatusBadge label={status} tone={tone === 'neutral' ? 'neutral' : tone} />}
      </View>
      <Text style={styles.paymentAmount}>{amount}</Text>
    </PremiumCard>
  );
}

export function ComplaintCard({
  title,
  subtitle,
  meta,
  status,
  tone = 'warning',
  onPress,
}: {
  title: string;
  subtitle?: string;
  meta?: string;
  status?: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
  onPress?: () => void;
}) {
  return (
    <PremiumCard onPress={onPress} style={styles.listCard}>
      <View style={styles.listCardHeader}>
        <View style={styles.listCardCopy}>
          <Text style={styles.listCardTitle}>{title}</Text>
          {!!subtitle && <Text style={styles.listCardMeta}>{subtitle}</Text>}
        </View>
        {!!status && <StatusBadge label={status} tone={tone} />}
      </View>
      {!!meta && <Text style={styles.listCardBody} numberOfLines={2}>{meta}</Text>}
    </PremiumCard>
  );
}

const buttonStyles = StyleSheet.create({
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.primaryLight, borderWidth: 1, borderColor: '#B7D9D3' },
  danger: { backgroundColor: colors.danger },
});

const badgeStyles = StyleSheet.create({
  neutral: { backgroundColor: colors.surfaceAlt },
  success: { backgroundColor: colors.successLight },
  warning: { backgroundColor: colors.warningLight },
  danger: { backgroundColor: colors.dangerLight },
  info: { backgroundColor: colors.blueLight },
});

const badgeTextStyles = StyleSheet.create({
  neutral: { color: colors.textSoft },
  success: { color: colors.success },
  warning: { color: '#B45309' },
  danger: { color: colors.danger },
  info: { color: colors.blue },
});

const balanceToneStyles = StyleSheet.create({
  neutral: {},
  success: { backgroundColor: colors.primary, borderColor: colors.primary },
  danger: { backgroundColor: '#FFF7F7', borderColor: '#FECACA' },
});

const styles = StyleSheet.create({
  keyboardAvoiding: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    width: '100%',
    maxWidth: layout.maxWidth,
    alignSelf: 'center',
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  header: {
    marginBottom: spacing.xl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.lg,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    ...typography.caption,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0,
    marginBottom: spacing.sm,
  },
  headerTitle: typography.h1,
  headerSubtitle: {
    ...typography.body,
    marginTop: spacing.sm,
    color: colors.muted,
  },
  card: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.xl,
    ...(shadows.card as object),
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  statCard: {
    minWidth: 165,
    flexGrow: 1,
    flexBasis: '30%',
  },
  statTop: {
    minHeight: 28,
  },
  statValue: {
    ...typography.h1,
    marginTop: spacing.md,
  },
  statTitle: {
    ...typography.caption,
    marginTop: spacing.xs,
    color: colors.text,
  },
  statHelper: {
    ...typography.caption,
    marginTop: spacing.xs,
    color: colors.muted,
  },
  actionCard: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCopy: {
    flex: 1,
    minWidth: 0,
  },
  actionTitle: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
  },
  actionSubtitle: {
    marginTop: spacing.xs,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  button: {
    minHeight: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  disabled: {
    opacity: 0.55,
  },
  buttonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '800',
  },
  buttonTextSecondary: {
    color: colors.primaryDark,
  },
  inputWrap: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    ...typography.caption,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  input: {
    minHeight: 54,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  inputError: {
    borderColor: colors.danger,
  },
  fieldError: {
    marginTop: spacing.sm,
    color: colors.danger,
    fontSize: 12,
    fontWeight: '700',
  },
  sectionHeader: {
    marginTop: spacing.xl,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  sectionTitle: typography.h2,
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  stateCard: {
    minHeight: 132,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  stateTitle: {
    ...typography.h2,
    textAlign: 'center',
  },
  stateMessage: {
    ...typography.body,
    color: colors.muted,
    textAlign: 'center',
  },
  errorMessage: {
    color: colors.danger,
    fontWeight: '700',
  },
  balanceCard: {
    gap: spacing.sm,
  },
  balanceLabel: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '700',
  },
  balanceAmount: {
    color: colors.text,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
  },
  balanceHelper: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  balanceTextOnTone: {
    color: colors.white,
  },
  balanceStatus: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  balanceStatusOnTone: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  balanceStatusText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  balanceStatusTextOnTone: {
    color: colors.white,
  },
  listCard: {
    padding: spacing.lg,
  },
  urgentCard: {
    borderColor: '#FECACA',
    backgroundColor: '#FFF7F7',
  },
  listCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  listCardCopy: {
    flex: 1,
    minWidth: 0,
  },
  listCardBadge: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  urgentText: {
    color: colors.danger,
  },
  listCardTitle: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '800',
  },
  listCardBody: {
    marginTop: spacing.sm,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  listCardMeta: {
    marginTop: spacing.xs,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
  paymentAmount: {
    marginTop: spacing.md,
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
});
