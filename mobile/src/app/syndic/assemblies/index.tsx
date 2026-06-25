import { router, useFocusEffect } from 'expo-router';
import { CalendarDays, ChevronLeft, Plus } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { useAuth } from '@/hooks/use-auth';
import { formatSyndicResidenceAddress, useSelectedSyndicResidence } from '@/hooks/use-selected-syndic-residence';
import { ApiError } from '@/lib/api/client';
import { AssemblyGeneral } from '@/services/assemblies-service';
import { getSyndicAssemblies } from '@/services/syndic-assemblies-service';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export default function SyndicAssembliesScreen() {
  const { token } = useAuth();
  const { selectedResidence, isLoading: residenceLoading, error: residenceError } = useSelectedSyndicResidence();
  const [assemblies, setAssemblies] = useState<AssemblyGeneral[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token || !selectedResidence) {
      setAssemblies([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      setAssemblies(await getSyndicAssemblies(token, selectedResidence.id));
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : 'Impossible de charger les AG.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedResidence, token]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const shownError = error || residenceError;
  const showLoading = isLoading || residenceLoading;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable style={styles.backRow} onPress={() => router.replace('/syndic/dashboard')}>
          <ChevronLeft size={18} color={colors.text} />
          <Text style={styles.backText}>Retour</Text>
        </Pressable>
        <Text style={styles.title}>Assemblées Générales</Text>
        <Text style={styles.subtitle}>
          {selectedResidence ? `${selectedResidence.name} - ${formatSyndicResidenceAddress(selectedResidence)}` : 'Sélectionnez une résidence'}
        </Text>
        <Pressable style={[styles.primaryButton, !selectedResidence && styles.disabled]} disabled={!selectedResidence} onPress={() => router.push('/syndic/assemblies/new' as never)}>
          <Plus size={17} color={colors.white} />
          <Text style={styles.primaryButtonText}>Créer une AG</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {showLoading && <State text="Chargement..." loading />}
        {!showLoading && !!shownError && <State text={shownError} />}
        {!showLoading && !shownError && assemblies.length === 0 && <State text="Aucune AG pour cette résidence." />}
        {!showLoading && !shownError && assemblies.map((item) => (
          <Pressable key={item.id} style={styles.card} onPress={() => router.push(`/syndic/assemblies/${item.id}` as never)}>
            <View style={styles.cardTop}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.badge}>{item.status}</Text>
            </View>
            <View style={styles.metaRow}>
              <CalendarDays size={15} color={colors.muted} />
              <Text style={styles.metaText}>{formatDate(item.scheduledAt)}</Text>
            </View>
            <Text style={styles.metaText}>{item._count?.agendaItems ?? 0} points - {item._count?.resolutions ?? 0} résolutions - {item._count?.participants ?? 0} participants</Text>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function State({ text, loading }: { text: string; loading?: boolean }) {
  return <View style={styles.stateCard}>{loading && <ActivityIndicator color={colors.primary} />}<Text style={styles.stateText}>{text}</Text></View>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border, padding: 22, gap: 10 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { color: colors.text, fontSize: 13, fontWeight: '800' },
  title: { color: colors.text, fontSize: 27, fontWeight: '900' },
  subtitle: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  primaryButton: { height: 48, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  primaryButtonText: { color: colors.white, fontWeight: '900' },
  disabled: { opacity: 0.5 },
  content: { padding: 18, gap: 12 },
  card: { borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, padding: 16, gap: 10 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  cardTitle: { flex: 1, color: colors.text, fontSize: 17, fontWeight: '900' },
  badge: { color: colors.primary, fontSize: 11, fontWeight: '900' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  metaText: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  stateCard: { borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, padding: 18, alignItems: 'center', gap: 8 },
  stateText: { color: colors.muted, textAlign: 'center', fontWeight: '700' },
});
