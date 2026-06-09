import { router } from 'expo-router';
import { ChevronLeft, Home } from 'lucide-react-native';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import {
  formatApartmentLabel,
  formatFloorLabel,
  formatResidenceAddress,
  useSelectedResidence,
} from '@/hooks/use-selected-residence';

function formatCurrency(amount: number | null) {
  if (amount === null) return '-';
  return `${amount.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} MAD`;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

export default function ResidenceDetailsScreen() {
  const { selectedResidence, isLoading, error, reload } = useSelectedResidence();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable style={styles.backRow} onPress={() => router.replace('/home')}>
          <ChevronLeft size={18} color={colors.text} />
          <Text style={styles.backText}>Retour</Text>
        </Pressable>
        <Text style={styles.title}>Residence</Text>
        <Text style={styles.subtitle}>Details de votre appartement</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {isLoading && (
          <View style={styles.stateCard}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.stateText}>Chargement de votre residence...</Text>
          </View>
        )}

        {!isLoading && !!error && (
          <View style={styles.stateCard}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={reload}>
              <Text style={styles.retryText}>Réessayer</Text>
            </Pressable>
          </View>
        )}

        {!isLoading && !error && !selectedResidence && (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>Aucune residence selectionnee</Text>
            <Text style={styles.stateText}>Sélectionnez une résidence pour voir les détails.</Text>
          </View>
        )}

        {!isLoading && !error && selectedResidence && (
          <>
            <View style={styles.heroCard}>
              <View style={styles.iconWrap}>
                <Home size={22} color={colors.primary} strokeWidth={2.2} />
              </View>
              <Text style={styles.heroTitle}>{selectedResidence.name}</Text>
              <Text style={styles.heroSubtitle}>{formatResidenceAddress(selectedResidence)}</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Appartement</Text>
              <DetailRow label="Numéro" value={formatApartmentLabel(selectedResidence)} />
              <DetailRow label="Étage" value={formatFloorLabel(selectedResidence)} />
              <DetailRow
                label="Surface"
                value={
                  selectedResidence.apartment.surface === null
                    ? '-'
                    : `${selectedResidence.apartment.surface} m2`
                }
              />
              <DetailRow
                label="Cotisation"
                value={formatCurrency(
                  selectedResidence.monthlyFee ?? selectedResidence.apartment.monthlyFee,
                )}
              />
              <DetailRow
                label="Statut"
                value={selectedResidence.apartment.isActive ? 'Actif' : 'Inactif'}
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Relation résident</Text>
              <DetailRow
                label="Type"
                value={selectedResidence.residentType === 'OWNER' ? 'Propriétaire' : 'Locataire'}
              />
              <DetailRow label="Principal" value={selectedResidence.isPrimary ? 'Oui' : 'Non'} />
              <DetailRow
                label="Relation"
                value={selectedResidence.relationIsActive ? 'Active' : 'Inactive'}
              />
              <DetailRow label="Debut" value={selectedResidence.startDate ?? '-'} />
              <DetailRow label="Fin" value={selectedResidence.endDate ?? '-'} />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.white,
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  backText: {
    marginLeft: 2,
    color: colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
  },
  subtitle: {
    marginTop: 5,
    color: colors.muted,
    fontSize: 14,
    fontWeight: '500',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 24,
    gap: 12,
  },
  heroCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: 18,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  heroSubtitle: {
    marginTop: 6,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: 16,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8,
  },
  detailRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 10,
  },
  detailLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  detailValue: {
    marginTop: 3,
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  stateCard: {
    minHeight: 128,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  stateTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  stateText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  retryButton: {
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  retryText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },
});
