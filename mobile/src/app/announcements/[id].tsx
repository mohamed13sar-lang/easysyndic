import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Megaphone } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { useAuth } from '@/hooks/use-auth';
import { ApiError } from '@/lib/api/client';
import {
  Announcement,
  AnnouncementPriority,
  AnnouncementType,
  getMyAnnouncement,
} from '@/services/announcements-service';

const typeLabels: Record<AnnouncementType, string> = {
  ASSEMBLEE_GENERALE: 'Assemblée générale',
  DECES: 'Décès',
  COUPURE_ELECTRICITE: "Coupure d'électricité",
  COUPURE_EAU: "Coupure d'eau",
  TRAVAUX: 'Travaux',
  NETTOYAGE: 'Nettoyage',
  SECURITE: 'Sécurité',
  AUTRE: 'Autre',
};

const priorityLabels: Record<AnnouncementPriority, string> = {
  NORMAL: 'Normal',
  IMPORTANT: 'Important',
  URGENT: 'Urgent',
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function AnnouncementDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAnnouncement = useCallback(async () => {
    if (!token || !id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const data = await getMyAnnouncement(token, id);
      setAnnouncement(data);
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Impossible de charger l'annonce.");
    } finally {
      setIsLoading(false);
    }
  }, [id, token]);

  useFocusEffect(
    useCallback(() => {
      loadAnnouncement();
    }, [loadAnnouncement]),
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable style={styles.backRow} onPress={() => router.replace('/announcements')}>
          <ChevronLeft size={18} color={colors.text} />
          <Text style={styles.backText}>Annonces</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {isLoading && (
          <View style={styles.stateCard}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.stateText}>Chargement de l'annonce...</Text>
          </View>
        )}

        {!isLoading && !!error && (
          <View style={styles.stateCard}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={loadAnnouncement}>
              <Text style={styles.retryText}>Réessayer</Text>
            </Pressable>
          </View>
        )}

        {!isLoading && !error && announcement && (
          <View style={styles.detailCard}>
            <View style={styles.iconWrap}>
              <Megaphone size={24} color={colors.primary} strokeWidth={2.2} />
            </View>
            <Text style={styles.typeLabel}>{typeLabels[announcement.type]}</Text>
            <Text style={styles.title}>{announcement.title}</Text>
            <View style={styles.metaRow}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{priorityLabels[announcement.priority]}</Text>
              </View>
              <Text style={styles.metaText}>{formatDate(announcement.publishAt)}</Text>
            </View>
            <Text style={styles.message}>{announcement.message}</Text>
            {!!announcement.expiresAt && (
              <Text style={styles.expiry}>Valable jusqu'au {formatDate(announcement.expiresAt)}</Text>
            )}
            {!!announcement.residence?.name && (
              <Text style={styles.residence}>{announcement.residence.name}</Text>
            )}
          </View>
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
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 14,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  content: {
    padding: 24,
  },
  detailCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: 22,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  typeLabel: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  title: {
    marginTop: 7,
    color: colors.text,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
  },
  metaRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 9,
  },
  badge: {
    borderRadius: 999,
    backgroundColor: colors.successLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '800',
  },
  metaText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  message: {
    marginTop: 20,
    color: colors.text,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
  },
  expiry: {
    marginTop: 18,
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  residence: {
    marginTop: 8,
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  stateCard: {
    minHeight: 140,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
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
    fontWeight: '700',
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
