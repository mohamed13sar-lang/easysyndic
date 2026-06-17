import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Clock, Phone } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { AppButton } from '@/components/AppButton';
import { BrandLogo } from '@/components/BrandLogo';
import { AppScreen } from '@/components/premium';
import { colors } from '@/constants/colors';
import { radius, shadows, spacing, typography } from '@/constants/design';
import { useAuth } from '@/hooks/use-auth';
import { ApiError } from '@/lib/api/client';
import { sendOtp, verifyOtp } from '@/services/auth-service';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 45;

export default function OtpScreen() {
  const params = useLocalSearchParams<{ phone?: string }>();
  const phone = typeof params.phone === 'string' ? params.phone : '';
  const { signIn } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendIn, setResendIn] = useState(RESEND_SECONDS);
  const inputRef = useRef<TextInput>(null);
  const { width } = useWindowDimensions();
  const otpBoxSize = Math.min(46, Math.floor((width - 96) / OTP_LENGTH));

  useEffect(() => {
    if (!phone) {
      router.replace('/login');
    }
  }, [phone]);

  useEffect(() => {
    if (resendIn <= 0) {
      return;
    }

    const timer = setTimeout(() => {
      setResendIn((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => clearTimeout(timer);
  }, [resendIn]);

  const handleChangeCode = (value: string) => {
    const digitsOnly = value.replace(/\D/g, '').slice(0, OTP_LENGTH);
    setCode(digitsOnly);
    if (error) {
      setError('');
    }
  };

  const handleConfirm = async () => {
    if (code.length < OTP_LENGTH) {
      setError('Veuillez saisir le code complet.');
      return;
    }

    if (!phone) {
      setError('Numéro de téléphone manquant.');
      return;
    }

    setError('');
    setIsVerifying(true);

    try {
      const session = await verifyOtp(phone, code);
      await signIn(session);
      router.replace('/residence');
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : 'Code invalide ou expiré.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!phone || resendIn > 0 || isResending) {
      return;
    }

    setError('');
    setIsResending(true);

    try {
      await sendOtp(phone);
      setCode('');
      setResendIn(RESEND_SECONDS);
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : 'Impossible de renvoyer le code.');
    } finally {
      setIsResending(false);
    }
  };

  const focusInput = () => {
    inputRef.current?.focus();
  };

  const renderOtpBox = (_: unknown, index: number) => {
    const char = code[index] ?? '';
    const isFilled = !!char;
    const isCurrent = index === code.length && code.length < OTP_LENGTH;

    return (
      <Pressable
        key={index}
        onPress={focusInput}
        style={[
          styles.otpBox,
          { width: otpBoxSize, height: Math.max(50, otpBoxSize + 8) },
          isFilled && styles.otpBoxFilled,
          !isFilled && styles.otpBoxEmpty,
          isCurrent && styles.otpBoxCurrent,
        ]}>
        <Text style={styles.otpChar}>{char}</Text>
      </Pressable>
    );
  };

  return (
    <AppScreen keyboardAvoiding contentStyle={styles.content}>
        <Pressable style={styles.backRow} onPress={() => router.replace('/resident-login')}>
          <ChevronLeft size={18} color={colors.text} />
          <Text style={styles.backText}>Retour</Text>
        </Pressable>

        <BrandLogo containerStyle={styles.logoWrap} />

        <View style={styles.card}>
          <View style={styles.iconBox}>
            <Phone size={28} color={colors.primary} />
          </View>

          <Text style={styles.title}>Vérification</Text>
          <Text style={styles.subtitle}>Entrez le code reçu par SMS au {phone}</Text>

          <Pressable style={styles.otpRow} onPress={focusInput}>
            {Array.from({ length: OTP_LENGTH }).map(renderOtpBox)}
          </Pressable>

          <TextInput
            ref={inputRef}
            value={code}
            onChangeText={handleChangeCode}
            keyboardType="number-pad"
            maxLength={OTP_LENGTH}
            style={styles.hiddenInput}
            autoFocus
          />

          {!!error && <Text style={styles.errorText}>{error}</Text>}

          <View style={styles.buttonWrap}>
            <AppButton
              title="Confirmer"
              onPress={handleConfirm}
              loading={isVerifying}
              disabled={isVerifying}
            />
            <Pressable
              style={[styles.resendRow, (resendIn > 0 || isResending) && styles.resendDisabled]}
              disabled={resendIn > 0 || isResending}
              onPress={handleResend}>
              <Clock size={14} color={colors.muted} />
              {resendIn > 0 ? (
                <Text style={styles.resendText}>
                  Renvoyer le code dans <Text style={styles.resendTime}>{resendIn}s</Text>
                </Text>
              ) : (
                <Text style={styles.resendText}>
                  {isResending ? 'Renvoi en cours...' : 'Renvoyer le code'}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: spacing.xl,
  },
  backText: {
    marginLeft: 2,
    color: colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
  logoWrap: {
    marginBottom: spacing.lg,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.xl,
    ...(shadows.card as object),
  },
  title: {
    marginTop: 20,
    ...typography.h1,
  },
  subtitle: {
    marginTop: 12,
    color: colors.muted,
    fontSize: 15,
    lineHeight: 24,
    maxWidth: 360,
  },
  otpRow: {
    marginTop: 32,
    flexDirection: 'row',
    gap: 8,
  },
  otpBox: {
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  otpBoxEmpty: {
    borderColor: colors.border,
    backgroundColor: '#F3F4F6',
  },
  otpBoxCurrent: {
    borderColor: colors.primary,
  },
  otpChar: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 0,
    width: 0,
  },
  errorText: {
    marginTop: 12,
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '500',
  },
  buttonWrap: {
    marginTop: 32,
  },
  resendRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  resendDisabled: {
    opacity: 0.8,
  },
  resendText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '500',
  },
  resendTime: {
    color: colors.primary,
    fontWeight: '700',
  },
});
