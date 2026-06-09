import { router } from 'expo-router';
import { ChevronLeft, MessageSquareText } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  AppHeader,
  AppScreen,
  FormInput,
  PremiumCard,
  PrimaryButton,
  StatusBadge,
} from '@/components/premium';
import { colors } from '@/constants/colors';
import { spacing, typography } from '@/constants/design';
import { ApiError } from '@/lib/api/client';
import { sendOtp } from '@/services/auth-service';

export default function ResidentLoginScreen() {
  const [phone, setPhone] = useState('+212707704133');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const normalizedPhone = phone.replace(/\s/g, '');

  const handleSendOtp = async () => {
    if (!/^\+212[67]\d{8}$/.test(normalizedPhone)) {
      setError('Saisissez un numéro marocain valide : +2126XXXXXXXX.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      await sendOtp(normalizedPhone);
      router.push({ pathname: '/otp', params: { phone: normalizedPhone } });
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Impossible d'envoyer le code.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppScreen contentStyle={styles.content}>
      <Pressable style={styles.backRow} onPress={() => router.replace('/login')}>
        <ChevronLeft size={18} color={colors.text} />
        <Text style={styles.backText}>Retour</Text>
      </Pressable>

      <View style={styles.iconBox}>
        <MessageSquareText size={28} color={colors.primary} strokeWidth={2.2} />
      </View>

      <AppHeader
        eyebrow="Espace résident"
        title="Connexion par SMS"
        subtitle="Recevez un code sécurisé pour accéder à votre résidence."
      />

      <PremiumCard style={styles.formCard}>
        <StatusBadge label="Code à usage unique" tone="info" />
        <Text style={styles.cardTitle}>Votre numéro de téléphone</Text>
        <FormInput
          value={phone}
          onChangeText={(value) => {
            setPhone(value);
            if (error) setError('');
          }}
          keyboardType="phone-pad"
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="+2126XXXXXXXX"
          error={error}
        />
        <PrimaryButton
          title={isSubmitting ? 'Envoi en cours...' : 'Recevoir le code'}
          loading={isSubmitting}
          disabled={isSubmitting}
          onPress={handleSendOtp}
        />
      </PremiumCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    justifyContent: 'center',
    flexGrow: 1,
  },
  backRow: {
    position: 'absolute',
    top: spacing.xl,
    left: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  backText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  iconBox: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  formCard: {
    gap: spacing.md,
  },
  cardTitle: {
    ...typography.h2,
  },
});
