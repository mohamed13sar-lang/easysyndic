import { router } from 'expo-router';
import { Building2, CheckCircle2, ChevronLeft, Plus } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton } from '@/components/AppButton';
import { colors } from '@/constants/colors';
import { useAuth } from '@/hooks/use-auth';
import { ApiError } from '@/lib/api/client';
import { getMyResidences, ResidentResidence } from '@/services/resident-service';
import {
  loadSelectedResidenceRelationId,
  saveSelectedResidenceRelationId,
} from '@/services/selected-residence-storage';

function formatAddress(residence: ResidentResidence) {
  return [residence.address, residence.district, residence.city].filter(Boolean).join(', ');
}

function formatApartment(residence: ResidentResidence) {
  return `Appartement ${residence.apartment.number}`;
}

function formatFloor(residence: ResidentResidence) {
  if (residence.apartment.floor === null) {
    return residence.apartment.block ? `Bloc ${residence.apartment.block}` : 'Etage non renseigne';
  }

  const floor = `${residence.apartment.floor}eme etage`;
  return residence.apartment.block ? `${floor} · Bloc ${residence.apartment.block}` : floor;
}

export default function ResidenceScreen() {
  const { token } = useAuth();
  const [residences, setResidences] = useState<ResidentResidence[]>([]);
  const [selectedRelationId, setSelectedRelationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadResidences = useCallback(async () => {
    if (!token) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const [response, storedRelationId] = await Promise.all([
        getMyResidences(token),
        loadSelectedResidenceRelationId(),
      ]);
      setResidences(response.residences);

      const storedResidence = response.residences.find(
        (residence) => residence.relationId === storedRelationId,
      );
      const defaultResidence =
        storedResidence ?? response.activeRelation ?? response.residences[0] ?? null;

      setSelectedRelationId(defaultResidence?.relationId ?? null);
      if (defaultResidence) {
        await saveSelectedResidenceRelationId(defaultResidence.relationId);
      }
    } catch (err: unknown) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Impossible de charger vos residences pour le moment.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadResidences();
  }, [loadResidences]);

  const handleSelectResidence = async (relationId: string) => {
    setSelectedRelationId(relationId);
    await saveSelectedResidenceRelationId(relationId);
  };

  const handleContinue = async () => {
    if (!selectedRelationId) {
      return;
    }

    await saveSelectedResidenceRelationId(selectedRelationId);
    router.push('/home');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable style={styles.backRow} onPress={() => router.replace('/home')}>
          <ChevronLeft size={18} color={colors.text} />
          <Text style={styles.backText}>Retour</Text>
        </Pressable>
        <Text style={styles.title}>Votre residence</Text>
        <Text style={styles.subtitle}>Sélectionnez votre résidence principale</Text>
      </View>

      <View style={styles.body}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}>
          {isLoading && (
            <View style={styles.stateCard}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.stateText}>Chargement de vos residences...</Text>
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
              <Text style={styles.stateTitle}>Aucune residence liee</Text>
              <Text style={styles.stateText}>
                Votre compte résident n'est encore lié à aucun appartement.
              </Text>
            </View>
          )}

          {!isLoading && !error && residences.map((residence) => {
            const isSelected = residence.relationId === selectedRelationId;
            return (
              <Pressable
                key={residence.relationId}
                onPress={() => handleSelectResidence(residence.relationId)}
                style={[styles.card, isSelected ? styles.cardSelected : styles.cardUnselected]}>
                <View style={[styles.iconWrap, isSelected ? styles.iconSelected : styles.iconUnselected]}>
                  <Building2
                    size={22}
                    color={isSelected ? colors.primary : '#9CA3AF'}
                    strokeWidth={2.2}
                  />
                </View>

                <View style={styles.cardTextContent}>
                  <Text style={styles.cardTitle}>{residence.name}</Text>
                  <Text style={styles.cardAddress}>{formatAddress(residence)}</Text>
                  <View style={styles.pillsRow}>
                    <View style={styles.pill}>
                      <Text style={styles.pillText}>{formatApartment(residence)}</Text>
                    </View>
                    <View style={styles.pill}>
                      <Text style={styles.pillText}>{formatFloor(residence)}</Text>
                    </View>
                  </View>
                </View>

                {isSelected && (
                  <View style={styles.checkWrap}>
                    <CheckCircle2 size={22} color={colors.primary} />
                  </View>
                )}
              </Pressable>
            );
          })}

          <Pressable style={styles.addCard} onPress={() => console.log('add residence')}>
            <Plus size={18} color={colors.primary} />
            <Text style={styles.addText}>Ajouter une residence</Text>
          </Pressable>
        </ScrollView>

        <View style={styles.footer}>
          <AppButton
            title="Continuer ->"
            onPress={handleContinue}
            disabled={!selectedRelationId || isLoading}
          />
        </View>
      </View>
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
    paddingBottom: 20,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 20,
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
    lineHeight: 34,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 8,
    color: colors.muted,
    fontSize: 15,
    lineHeight: 24,
  },
  body: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 18,
    gap: 12,
  },
  card: {
    minHeight: 112,
    borderRadius: 16,
    borderWidth: 1.5,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  cardSelected: {
    borderColor: colors.primary,
  },
  cardUnselected: {
    borderColor: colors.border,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  iconSelected: {
    backgroundColor: colors.primaryLight,
  },
  iconUnselected: {
    backgroundColor: '#F3F4F6',
  },
  cardTextContent: {
    flex: 1,
    paddingRight: 8,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  cardAddress: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  pillsRow: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  pill: {
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillText: {
    color: '#4B5563',
    fontSize: 12,
    fontWeight: '600',
  },
  checkWrap: {
    marginTop: 3,
  },
  addCard: {
    minHeight: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  stateCard: {
    minHeight: 112,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  stateTitle: {
    color: colors.text,
    fontSize: 16,
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
    lineHeight: 18,
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
  footer: {
    backgroundColor: colors.background,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 18,
  },
});
