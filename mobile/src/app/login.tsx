import { router } from 'expo-router';
import { Building2, Home, ShieldCheck } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import {
  ActionCard,
  AppHeader,
  AppScreen,
  PremiumCard,
  StatusBadge,
} from '@/components/premium';
import { colors } from '@/constants/colors';
import { spacing, typography } from '@/constants/design';

export default function LoginScreen() {
  return (
    <AppScreen contentStyle={styles.content}>
      <View style={styles.brandMark}>
        <ShieldCheck size={28} color={colors.primary} strokeWidth={2.2} />
      </View>

      <AppHeader
        eyebrow="EasySyndic"
        title="Connexion"
        subtitle="Choisissez votre espace pour accéder à votre résidence en toute sécurité."
      />

      <PremiumCard style={styles.heroCard}>
        <Text style={styles.heroTitle}>Gestion de résidence simple, claire et fiable.</Text>
        <Text style={styles.heroText}>
          Paiements, réclamations, annonces et documents réunis dans une expérience mobile
          professionnelle.
        </Text>
        <StatusBadge label="Plateforme sécurisée" tone="success" />
      </PremiumCard>

      <View style={styles.choices}>
        <ActionCard
          title="Espace résident"
          subtitle="Connexion rapide par code SMS"
          icon={<Home size={21} color={colors.primary} strokeWidth={2.2} />}
          onPress={() => router.push('/resident-login')}
        />
        <ActionCard
          title="Espace syndic"
          subtitle="Connexion par email et mot de passe"
          icon={<Building2 size={21} color={colors.primary} strokeWidth={2.2} />}
          onPress={() => router.push('/syndic-login')}
        />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    justifyContent: 'center',
    flexGrow: 1,
  },
  brandMark: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  heroCard: {
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  heroTitle: {
    ...typography.h2,
  },
  heroText: {
    ...typography.body,
    color: colors.muted,
  },
  choices: {
    gap: spacing.md,
  },
});
