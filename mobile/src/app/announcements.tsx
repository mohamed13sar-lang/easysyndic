import { router, useFocusEffect } from 'expo-router';
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
import { useSelectedResidence } from '@/hooks/use-selected-residence';
import { ApiError } from '@/lib/api/client';
import {
  Announcement,
  AnnouncementPriority,
  AnnouncementType,
  getMyAnnouncements,
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
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function AnnouncementCard({ item }: { item: Announcement }) {
  const isUrgent = item.priority === 'URGENT';
  return (
    <Pressable
      style={[styles.card, isUrgent && styles.cardUrgent]}
      onPress={() => router.push(`/announcements/${item.id}` as never)}>
      <View style={styles.cardTop}>
        <View style={styles.iconWrap}>
          <Megaphone size={18} color={colors.primary} strokeWidth={2.2} />
        </View>
        <View style={styles.cardCopy}>
          <Text style={styles.typeLabel}>{typeLabels[item.type]}</Text>
          <Text style={styles.cardTitle}>{item.title}</Text>
        </View>
        <View style={[styles.priorityBadge, isUrgent && styles.priorityBadgeUrgent]}>
          <Text style={[styles.priorityText, isUrgent && styles.priorityTextUrgent]}>
            {priorityLabels[item.priority]}
          </Text>
        </View>
      </View>
      <Text style={styles.cardMessage} numberOfLines={2}>
        {item.message}
      </Text>
      <Text style={styles.cardMeta}>Publié le {formatDate(item.publishAt)}</Text>
    </Pressable>
  );
}

export default function AnnouncementsScreen() {
  const { token } = useAuth();
  const {
    selectedResidence,
    isLoading: isResidenceLoading,
    error: residenceError,
  } = useSelectedResidence();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAnnouncements = useCallback(async () => {
    if (!token || !selectedResidence) {
      setAnnouncements([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const data = await getMyAnnouncements(token, { residenceId: selectedResidence.id });
      setAnnouncements(data);
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : 'Impossible de charger les annonces.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedResidence, token]);

  useFocusEffect(
    useCallback(() => {
      loadAnnouncements();
    }, [loadAnnouncements]),
  );

  const showLoading = isLoading || isResidenceLoading;
  const shownError = error || residenceError;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable style={styles.backRow} onPress={() => router.replace('/home')}>
          <ChevronLeft size={18} color={colors.text} />
          <Text style={styles.backText}>Retour</Text>
        </Pressable>
        <Text style={styles.title}>Annonces</Text>
        <Text style={styles.subtitle}>
          {selectedResidence ? selectedResidence.name : 'Informations de votre résidence'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {showLoading && (
          <View style={styles.stateCard}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.stateText}>Chargement des annonces...</Text>
          </View>
        )}

        {!showLoading && !!shownError && (
          <View style={styles.stateCard}>
            <Text style={styles.errorText}>{shownError}</Text>
            <Pressable style={styles.retryButton} onPress={loadAnnouncements}>
              <Text style={styles.retryText}>Réessayer</Text>
            </Pressable>
          </View>
        )}

        {!showLoading && !shownError && announcements.length === 0 && (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>Aucune annonce</Text>
            <Text style={styles.stateText}>Les annonces importantes apparaîtront ici.</Text>
          </View>
        )}

        {!showLoading &&
          !shownError &&
          announcements.map((item) => <AnnouncementCard key={item.id} item={item} />)}
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
    paddingBottom: 18,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  backText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    color: colors.text,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 5,
    color: colors.muted,
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 28,
    gap: 12,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: 16,
  },
  cardUrgent: {
    borderColor: '#FECACA',
    backgroundColor: '#FFF7F7',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCopy: {
    flex: 1,
    minWidth: 0,
  },
  typeLabel: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  cardTitle: {
    marginTop: 3,
    color: colors.text,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '800',
  },
  priorityBadge: {
    borderRadius: 999,
    backgroundColor: colors.successLight,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  priorityBadgeUrgent: {
    backgroundColor: colors.dangerLight,
  },
  priorityText: {
    color: colors.success,
    fontSize: 11,
    fontWeight: '800',
  },
  priorityTextUrgent: {
    color: colors.danger,
  },
  cardMessage: {
    marginTop: 12,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
  },
  cardMeta: {
    marginTop: 10,
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
  stateCard: {
    minHeight: 124,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: 18,
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
});
