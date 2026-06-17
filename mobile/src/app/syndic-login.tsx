import { router } from 'expo-router';
import { Building2, ChevronLeft, LockKeyhole } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BrandLogo } from '@/components/BrandLogo';
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
import { useAuth } from '@/hooks/use-auth';
import { ApiError } from '@/lib/api/client';
import { loginWithPassword } from '@/services/auth-service';

export default function SyndicLoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('mohamed.syndic.test@easysyndic.ma');
  const [password, setPassword] = useState('Syndic@2026');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async () => {
    if (!email.trim()) {
      setError('Veuillez saisir votre email.');
      return;
    }
    if (!password) {
      setError('Veuillez saisir votre mot de passe.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const session = await loginWithPassword(email.trim(), password);
      if (session.user.role !== 'SYNDIC') {
        setError("Ce compte ne peut pas accéder à l'espace syndic.");
        return;
      }

      await signIn(session);
      router.replace('/syndic/dashboard');
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : 'Connexion impossible.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppScreen keyboardAvoiding contentStyle={styles.content}>
      <Pressable style={styles.backRow} onPress={() => router.replace('/login')}>
        <ChevronLeft size={18} color={colors.text} />
        <Text style={styles.backText}>Retour</Text>
      </Pressable>

      <BrandLogo containerStyle={styles.logoWrap} />

      <View style={styles.iconBox}>
        <Building2 size={28} color={colors.primary} strokeWidth={2.2} />
      </View>

      <AppHeader
        eyebrow="Espace syndic"
        title="Connexion professionnelle"
        subtitle="Pilotez vos résidences, paiements et réclamations depuis un espace sécurisé."
      />

      <PremiumCard style={styles.formCard}>
        <StatusBadge label="Accès administrateur" tone="success" />
        <Text style={styles.cardTitle}>Identifiants syndic</Text>
        <FormInput
          label="Email"
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            if (error) setError('');
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="email@exemple.ma"
        />
        <FormInput
          label="Mot de passe"
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            if (error) setError('');
          }}
          secureTextEntry
          placeholder="Mot de passe"
          error={error}
        />
        <PrimaryButton
          title={isSubmitting ? 'Connexion en cours...' : 'Se connecter'}
          loading={isSubmitting}
          disabled={isSubmitting}
          onPress={handleLogin}
        />
        <View style={styles.securityRow}>
          <LockKeyhole size={14} color={colors.muted} />
          <Text style={styles.securityText}>Session protégée par jeton sécurisé.</Text>
        </View>
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
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginBottom: spacing.xl,
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
  logoWrap: {
    marginBottom: spacing.lg,
  },
  formCard: {
    gap: spacing.md,
  },
  cardTitle: {
    ...typography.h2,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  securityText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
});
