import { router, useFocusEffect } from 'expo-router';
import { CalendarDays, ChevronLeft, MapPin } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { useAuth } from '@/hooks/use-auth';
import { useSelectedResidence } from '@/hooks/use-selected-residence';
import { ApiError } from '@/lib/api/client';
import { AssemblyGeneral, getMyAssemblies } from '@/services/assemblies-service';

const statusLabels: Record<string, string> = {
  PUBLISHED: 'Publiee',
  IN_PROGRESS: 'En cours',
  CLOSED: 'Cloturee',
  CANCELLED: 'Annulee',
  DRAFT: 'Brouillon',
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function ResidentAssembliesScreen() {
  const { token } = useAuth();
  const { selectedResidence, isLoading: residenceLoading, error: residenceError } = useSelectedResidence();
  const [assemblies, setAssemblies] = useState<AssemblyGeneral[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAssemblies = useCallback(async () => {
    if (!token || !selectedResidence) {
      setAssemblies([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      setAssemblies(await getMyAssemblies(token, selectedResidence.id));
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : 'Impossible de charger les AG.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedResidence, token]);

  useFocusEffect(useCallback(() => { loadAssemblies(); }, [loadAssemblies]));

  const showLoading = isLoading || residenceLoading;
  const shownError = error || residenceError;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable style={styles.backRow} onPress={() => router.replace('/home')}>
          <ChevronLeft size={18} color={colors.text} />
          <Text style={styles.backText}>Retour</Text>
        </Pressable>
        <Text style={styles.title}>Assemblées Générales</Text>
        <Text style={styles.subtitle}>{selectedResidence?.name ?? 'Convocations et votes'}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {showLoading && <State text="Chargement des AG..." loading />}
        {!showLoading && !!shownError && <State text={shownError} />}
        {!showLoading && !shownError && assemblies.length === 0 && (
          <State text="Aucune assemblée générale publiée pour le moment." />
        )}
        {!showLoading && !shownError && assemblies.map((item) => (
          <Pressable
            key={item.id}
            style={styles.card}
            onPress={() => router.push(`/assemblies/${item.id}` as never)}>
            <View style={styles.cardTop}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{statusLabels[item.status]}</Text>
              </View>
            </View>
            <View style={styles.metaRow}>
              <CalendarDays size={15} color={colors.muted} />
              <Text style={styles.metaText}>{formatDate(item.scheduledAt)}</Text>
            </View>
            <View style={styles.metaRow}>
              <MapPin size={15} color={colors.muted} />
              <Text style={styles.metaText}>{item.location}</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function State({ text, loading }: { text: string; loading?: boolean }) {
  return (
    <View style={styles.stateCard}>
      {loading && <ActivityIndicator color={colors.primary} />}
      <Text style={styles.stateText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border, padding: 24 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 14 },
  backText: { color: colors.text, fontSize: 13, fontWeight: '800' },
  title: { color: colors.text, fontSize: 27, fontWeight: '900' },
  subtitle: { marginTop: 5, color: colors.muted, fontSize: 14, fontWeight: '600' },
  content: { padding: 20, gap: 12 },
  card: { borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, padding: 16, gap: 10 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  cardTitle: { flex: 1, color: colors.text, fontSize: 17, fontWeight: '900' },
  badge: { alignSelf: 'flex-start', borderRadius: 999, backgroundColor: colors.primaryLight, paddingHorizontal: 10, paddingVertical: 5 },
  badgeText: { color: colors.primary, fontSize: 11, fontWeight: '900' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  metaText: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  stateCard: { borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, padding: 18, alignItems: 'center', gap: 8 },
  stateText: { color: colors.muted, textAlign: 'center', fontSize: 14, fontWeight: '700' },
});
