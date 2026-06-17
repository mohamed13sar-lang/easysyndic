import { router, useFocusEffect } from 'expo-router';
import { Building2, CheckCircle2, ChevronLeft } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '@/hooks/use-auth';
import { ApiError } from '@/lib/api/client';
import {
  loadSelectedSyndicResidenceId,
  saveSelectedSyndicResidenceId,
} from '@/services/selected-syndic-residence-storage';
import {
  getSyndicResidences,
  SyndicResidence,
} from '@/services/syndic-residences-service';

function formatCurrency(value: number) {
  return `${value.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} MAD`;
}

function formatAddress(residence: SyndicResidence) {
  return [residence.address, residence.district, residence.city].filter(Boolean).join(', ');
}

export default function SyndicResidencesScreen() {
  const { token } = useAuth();
  const [residences, setResidences] = useState<SyndicResidence[]>([]);
  const [selectedResidenceId, setSelectedResidenceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadResidences = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const [data, storedResidenceId] = await Promise.all([
        getSyndicResidences(token),
        loadSelectedSyndicResidenceId(),
      ]);
      const selected =
        data.find((residence) => residence.id === storedResidenceId) ??
        data.find((residence) => residence.isActive) ??
        data[0] ??
        null;

      setResidences(data);
      setSelectedResidenceId(selected?.id ?? null);

      if (selected) {
        await saveSelectedSyndicResidenceId(selected.id);
      }
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : 'Impossible de charger vos résidences.');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      loadResidences();
    }, [loadResidences]),
  );

  const handleSelect = async (residenceId: string) => {
    setSelectedResidenceId(residenceId);
    await saveSelectedSyndicResidenceId(residenceId);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable style={styles.backRow} onPress={() => router.replace('/syndic/dashboard')}>
            <ChevronLeft size={18} color="#1F2328" />
            <Text style={styles.backText}>Retour</Text>
          </Pressable>
          <Text style={styles.title}>Résidences</Text>
          <Text style={styles.subtitle}>Sélectionnez la résidence active</Text>
        </View>

        {isLoading && (
          <View style={styles.stateCard}>
            <ActivityIndicator color="#18A7A0" />
            <Text style={styles.stateText}>Chargement des résidences...</Text>
          </View>
        )}

        {!isLoading && !!error && (
          <View style={styles.stateCard}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={loadResidences}>
              <Text style={styles.retryText}>Réessayer</Text>
            </Pressable>
          </View>
        )}

        {!isLoading && !error && residences.length === 0 && (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>Aucune résidence</Text>
            <Text style={styles.stateText}>Aucune résidence n'est encore liée à ce compte.</Text>
          </View>
        )}

        {!isLoading && !error && residences.length > 0 && (
          <View style={styles.grid}>
            {residences.map((residence) => {
              const selected = residence.id === selectedResidenceId;
              return (
                <Pressable
                  key={residence.id}
                  style={[styles.card, selected && styles.cardSelected]}
                  onPress={() => handleSelect(residence.id)}>
                  <View style={styles.cardHeader}>
                    <View style={styles.iconWrap}>
                      <Building2 size={20} color="#18A7A0" strokeWidth={2.2} />
                    </View>
                    {selected && <CheckCircle2 size={22} color="#18A7A0" />}
                  </View>

                  <Text style={styles.cardTitle}>{residence.name}</Text>
                  <Text style={styles.cardAddress}>{formatAddress(residence)}</Text>

                  <View style={styles.metricsGrid}>
                    <Text style={styles.metricText}>{residence.apartmentsCount} appartements</Text>
                    <Text style={styles.metricText}>{residence.residentsCount} résidents</Text>
                    <Text style={styles.metricText}>{residence.openComplaintsCount} ouvertes</Text>
                    <Text style={styles.metricText}>{formatCurrency(residence.unpaidPaymentsAmount)}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 24,
    paddingBottom: 36,
    width: '100%',
    maxWidth: 980,
    alignSelf: 'center',
  },
  header: {
    marginBottom: 16,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 18,
  },
  backText: {
    marginLeft: 2,
    color: '#1F2328',
    fontSize: 16,
    fontWeight: '500',
  },
  title: {
    color: '#1F2328',
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 6,
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    minHeight: 188,
    minWidth: 260,
    flexGrow: 1,
    flexBasis: '48%',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    padding: 16,
    boxShadow: '0 12px 30px rgba(15, 23, 42, 0.07)',
    elevation: 2,
  },
  cardSelected: {
    borderColor: '#18A7A0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#D6F3F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    marginTop: 14,
    color: '#1F2328',
    fontSize: 17,
    fontWeight: '800',
  },
  cardAddress: {
    marginTop: 5,
    color: '#6B7280',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  metricsGrid: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricText: {
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 10,
    paddingVertical: 5,
    color: '#4B5563',
    fontSize: 12,
    fontWeight: '700',
  },
  stateCard: {
    minHeight: 140,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  stateTitle: {
    color: '#1F2328',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  stateText: {
    color: '#6B7280',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    textAlign: 'center',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  retryButton: {
    borderRadius: 12,
    backgroundColor: '#D6F3F1',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  retryText: {
    color: '#18A7A0',
    fontSize: 13,
    fontWeight: '800',
  },
});
