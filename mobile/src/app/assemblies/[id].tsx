import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { CalendarDays, ChevronLeft, MapPin } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { useAuth } from '@/hooks/use-auth';
import { ApiError } from '@/lib/api/client';
import {
  AssemblyGeneral,
  AssemblyResult,
  AssemblyVoteValue,
  getMyAssembly,
  getMyAssemblyResults,
  updateMyAttendance,
  voteResolution,
} from '@/services/assemblies-service';

const voteLabels: Record<AssemblyVoteValue, string> = { YES: 'Oui', NO: 'Non', ABSTAIN: 'Abstention' };

function formatDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full', timeStyle: 'short' }).format(new Date(value));
}

export default function ResidentAssemblyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token, user } = useAuth();
  const [assembly, setAssembly] = useState<AssemblyGeneral | null>(null);
  const [results, setResults] = useState<AssemblyResult[]>([]);
  const [representedByName, setRepresentedByName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const loadAssembly = useCallback(async () => {
    if (!token || !id) return;
    setIsLoading(true);
    setError('');
    try {
      const data = await getMyAssembly(token, id);
      setAssembly(data);
      try {
        setResults(await getMyAssemblyResults(token, id));
      } catch {
        setResults([]);
      }
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : 'Impossible de charger cette AG.');
    } finally {
      setIsLoading(false);
    }
  }, [id, token]);

  useFocusEffect(useCallback(() => { loadAssembly(); }, [loadAssembly]));

  const sendAttendance = async (status: 'PRESENT' | 'ABSENT' | 'REPRESENTED') => {
    if (!token || !id || busy) return;
    setBusy(true);
    try {
      await updateMyAttendance(token, id, {
        status,
        representedByName: status === 'REPRESENTED' ? representedByName.trim() : undefined,
      });
      await loadAssembly();
      Alert.alert('Présence enregistrée');
    } catch (err: unknown) {
      Alert.alert('Action impossible', err instanceof ApiError ? err.message : 'Veuillez réessayer.');
    } finally {
      setBusy(false);
    }
  };

  const sendVote = async (resolutionId: string, vote: AssemblyVoteValue) => {
    if (!token || !id || busy) return;
    setBusy(true);
    try {
      await voteResolution(token, id, resolutionId, vote);
      await loadAssembly();
      Alert.alert('Vote enregistré');
    } catch (err: unknown) {
      Alert.alert('Vote impossible', err instanceof ApiError ? err.message : 'Veuillez réessayer.');
    } finally {
      setBusy(false);
    }
  };

  const myParticipant = assembly?.participants?.find((item) => item.userId === user?.id);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable style={styles.backRow} onPress={() => router.replace('/assemblies')}>
          <ChevronLeft size={18} color={colors.text} />
          <Text style={styles.backText}>Retour</Text>
        </Pressable>
        <Text style={styles.title}>{assembly?.title ?? 'Assemblée Générale'}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {isLoading && <State text="Chargement..." loading />}
        {!isLoading && !!error && <State text={error} />}
        {!isLoading && !error && assembly && (
          <>
            <View style={styles.card}>
              <View style={styles.metaRow}><CalendarDays size={16} color={colors.primary} /><Text style={styles.metaText}>{formatDate(assembly.scheduledAt)}</Text></View>
              <View style={styles.metaRow}><MapPin size={16} color={colors.primary} /><Text style={styles.metaText}>{assembly.location}</Text></View>
              {!!assembly.description && <Text style={styles.description}>{assembly.description}</Text>}
            </View>

            <Section title="Ordre du jour">
              {assembly.agendaItems?.length ? assembly.agendaItems.map((item) => (
                <Text key={item.id} style={styles.listText}>{item.order}. {item.title}</Text>
              )) : <Text style={styles.muted}>Aucun point pour le moment.</Text>}
            </Section>

            <Section title="Ma présence">
              <Text style={styles.muted}>Statut actuel: {myParticipant?.status ?? 'Non confirmé'}</Text>
              <TextInput value={representedByName} onChangeText={setRepresentedByName} placeholder="Nom du représentant" placeholderTextColor="#9CA3AF" style={styles.input} />
              <View style={styles.row}>
                <Action label="Présent" onPress={() => sendAttendance('PRESENT')} />
                <Action label="Absent" onPress={() => sendAttendance('ABSENT')} />
                <Action label="Représenté" onPress={() => sendAttendance('REPRESENTED')} />
              </View>
            </Section>

            <Section title="Résolutions">
              {assembly.resolutions?.length ? assembly.resolutions.map((resolution) => {
                const alreadyVoted = resolution.votes?.some((vote) => vote.userId === user?.id);
                return (
                  <View key={resolution.id} style={styles.resolution}>
                    <Text style={styles.resolutionTitle}>{resolution.order}. {resolution.title}</Text>
                    {!!resolution.description && <Text style={styles.muted}>{resolution.description}</Text>}
                    <Text style={styles.muted}>Vote: {resolution.votingStatus}</Text>
                    {resolution.votingStatus === 'OPEN' && !alreadyVoted && (
                      <View style={styles.row}>
                        {(Object.keys(voteLabels) as AssemblyVoteValue[]).map((vote) => (
                          <Action key={vote} label={voteLabels[vote]} onPress={() => sendVote(resolution.id, vote)} />
                        ))}
                      </View>
                    )}
                    {alreadyVoted && <Text style={styles.success}>Votre vote est enregistré.</Text>}
                  </View>
                );
              }) : <Text style={styles.muted}>Aucune résolution.</Text>}
            </Section>

            {results.length > 0 && (
              <Section title="Résultats">
                {results.map((item) => (
                  <Text key={item.resolutionId} style={styles.listText}>
                    {item.title}: Oui {item.results.YES} - Non {item.results.NO} - Abst. {item.results.ABSTAIN}
                  </Text>
                ))}
              </Section>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <View style={styles.card}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>;
}

function Action({ label, onPress }: { label: string; onPress: () => void }) {
  return <Pressable style={styles.action} onPress={onPress}><Text style={styles.actionText}>{label}</Text></Pressable>;
}

function State({ text, loading }: { text: string; loading?: boolean }) {
  return <View style={styles.card}>{loading && <ActivityIndicator color={colors.primary} />}<Text style={styles.muted}>{text}</Text></View>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border, padding: 22 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  backText: { color: colors.text, fontSize: 13, fontWeight: '800' },
  title: { color: colors.text, fontSize: 24, fontWeight: '900' },
  content: { padding: 18, gap: 12 },
  card: { borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, padding: 16, gap: 10 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaText: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '700' },
  description: { color: colors.muted, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '900' },
  listText: { color: colors.text, fontSize: 14, lineHeight: 21, fontWeight: '700' },
  muted: { color: colors.muted, fontSize: 13, lineHeight: 19, fontWeight: '600' },
  success: { color: colors.success, fontSize: 13, fontWeight: '800' },
  input: { borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 12, color: colors.text, fontWeight: '700' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  action: { borderRadius: 12, backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 10 },
  actionText: { color: colors.white, fontSize: 12, fontWeight: '900' },
  resolution: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, gap: 8 },
  resolutionTitle: { color: colors.text, fontSize: 15, fontWeight: '900' },
});
