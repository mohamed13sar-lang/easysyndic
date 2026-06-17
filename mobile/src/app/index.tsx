import { router } from 'expo-router';
import { Building2, CheckCircle2, CreditCard, Megaphone } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton } from '@/components/AppButton';
import { colors } from '@/constants/colors';
import { radius, shadows, spacing, typography } from '@/constants/design';

export default function HomeScreen() {
  const { height } = useWindowDimensions();

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <View />
          <TouchableOpacity onPress={() => router.push('/login')}>
            <Text style={styles.skipText}>Passer</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.illustrationCard, { height: Math.min(360, Math.max(260, height * 0.42)) }]}>
          <View style={styles.floatingCardLeft}>
            <CreditCard size={18} color={colors.primary} />
            <Text style={styles.floatLabel}>Paiements</Text>
          </View>

          <View style={styles.floatingCardRight}>
            <Megaphone size={18} color={colors.blue} />
            <Text style={styles.floatLabel}>Annonces</Text>
          </View>

          <View style={styles.building}>
            <View style={styles.roof}>
              <Building2 size={30} color={colors.white} />
            </View>
            <View style={styles.windowsGrid}>
              {Array.from({ length: 12 }).map((_, index) => (
                <View key={index} style={styles.window} />
              ))}
            </View>
            <View style={styles.door} />
          </View>
          <View style={styles.trustPill}>
            <CheckCircle2 size={15} color={colors.success} />
            <Text style={styles.trustText}>Gestion sécurisée</Text>
          </View>
        </View>

        <View style={styles.dotsRow}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>

        <View style={styles.textBlock}>
          <Text style={styles.title}>Gérez votre résidence avec sérénité</Text>
          <Text style={styles.description}>
            Recevez les annonces, suivez vos paiements et envoyez vos réclamations en quelques
            instants.
          </Text>
        </View>

        <View style={styles.bottomArea}>
          <AppButton title="Suivant" onPress={() => router.push('/login')} />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 24,
  },
  topBar: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skipText: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: '500',
  },
  illustrationCard: {
    marginTop: 12,
    borderRadius: radius.xxl,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#D4E8E3',
    ...(shadows.soft as object),
  },
  floatingCardLeft: {
    position: 'absolute',
    left: 24,
    top: 86,
    width: 112,
    height: 56,
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    justifyContent: 'center',
    gap: 3,
  },
  floatingCardRight: {
    position: 'absolute',
    right: 24,
    top: 132,
    width: 110,
    height: 58,
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    justifyContent: 'center',
    gap: 3,
  },
  floatLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  building: {
    width: 190,
    height: 250,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    paddingTop: 18,
  },
  roof: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.primary,
    marginBottom: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  windowsGrid: {
    width: 122,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 8,
  },
  window: {
    width: 26,
    height: 22,
    borderRadius: 6,
    backgroundColor: colors.primary,
    opacity: 0.92,
  },
  door: {
    marginTop: 16,
    width: 34,
    height: 52,
    borderRadius: 8,
    backgroundColor: colors.primaryDark,
  },
  trustPill: {
    position: 'absolute',
    bottom: 24,
    borderRadius: 999,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trustText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  dotsRow: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D1D5DB',
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.primary,
  },
  textBlock: {
    marginTop: 26,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  title: {
    ...typography.h1,
    textAlign: 'center',
  },
  description: {
    marginTop: 12,
    color: '#9CA3AF',
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'center',
  },
  bottomArea: {
    marginTop: 'auto',
    paddingTop: 22,
  },
});
