import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Plus } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { useAuth } from '@/hooks/use-auth';
import { useSelectedSyndicResidence } from '@/hooks/use-selected-syndic-residence';
import { ApiError } from '@/lib/api/client';
import { AssemblyGeneral, AssemblyResult, AssemblyStatus, ParticipantStatus } from '@/services/assemblies-service';
import {
  addAgendaItem,
  createResolution,
  getParticipants,
  getResults,
  getSyndicAssembly,
  updateAssemblyStatus,
  updateParticipant,
  updateVotingStatus,
} from '@/services/syndic-assemblies-service';

export default function SyndicAssemblyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const { selectedResidence } = useSelectedSyndicResidence();
  const [assembly, setAssembly] = useState<AssemblyGeneral | null>(null);
  const [results, setResults] = useState<AssemblyResult[]>([]);
  const [agendaTitle, setAgendaTitle] = useState('');
  const [resolutionTitle, setResolutionTitle] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token || !selectedResidence || !id) return;
    setIsLoading(true);
    setError('');
    try {
      const [detail, participants, resultData] = await Promise.all([
        getSyndicAssembly(token, selectedResidence.id, id),
        getParticipants(token, selectedResidence.id, id).catch(() => []),
        getResults(token, selectedResidence.id, id).catch(() => []),
      ]);
      setAssembly({ ...detail, participants });
      setResults(resultData);
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : 'Impossible de charger cette AG.');
    } finally {
      setIsLoading(false);
    }
  }, [id, selectedResidence, token]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const run = async (task: () => Promise<unknown>, success?: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await task();
      await load();
      if (success) Alert.alert(success);
    } catch (err: unknown) {
      Alert.alert('Action impossible', err instanceof ApiError ? err.message : 'Veuillez réessayer.');
    } finally {
      setBusy(false);
    }
  };

  const changeStatus = (status: AssemblyStatus) => {
    if (!token || !selectedResidence || !id) return;
    run(() => updateAssemblyStatus(token, selectedResidence.id, id, status), 'Statut mis à jour');
  };

  const addAgenda = () => {
    if (!token || !selectedResidence || !id || !agendaTitle.trim()) return;
    run(async () => {
      await addAgendaItem(token, selectedResidence.id, id, { title: agendaTitle.trim() });
      setAgendaTitle('');
    }, 'Point ajouté');
  };

  const addResolution = () => {
    if (!token || !selectedResidence || !id || !resolutionTitle.trim()) return;
    run(async () => {
      await createResolution(token, selectedResidence.id, id, { title: resolutionTitle.trim() });
      setResolutionTitle('');
    }, 'Résolution ajoutée');
  };

  const setParticipant = (participantId: string, status: ParticipantStatus) => {
    if (!token || !selectedResidence || !id) return;
    run(() => updateParticipant(token, selectedResidence.id, id, participantId, { status }));
  };

  const setVoting = (resolutionId: string, votingStatus: 'OPEN' | 'CLOSED') => {
    if (!token || !selectedResidence || !id) return;
    run(() => updateVotingStatus(token, selectedResidence.id, id, resolutionId, votingStatus), 'Vote mis à jour');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable style={styles.backRow} onPress={() => router.replace('/syndic/assemblies')}>
          <ChevronLeft size={18} color={colors.text} />
          <Text style={styles.backText}>Retour</Text>
        </Pressable>
        <Text style={styles.title}>{assembly?.title ?? 'Gestion AG'}</Text>
        {!!assembly && <Text style={styles.subtitle}>{assembly.status} - {new Date(assembly.scheduledAt).toLocaleString('fr-FR')}</Text>}
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {isLoading && <State text="Chargement..." loading />}
        {!isLoading && !!error && <State text={error} />}
        {!isLoading && !error && assembly && (
          <>
            <Section title="Statut">
              <View style={styles.row}>
                {(['DRAFT', 'PUBLISHED', 'IN_PROGRESS', 'CLOSED', 'CANCELLED'] as AssemblyStatus[]).map((status) => (
                  <Action key={status} label={status} onPress={() => changeStatus(status)} active={assembly.status === status} />
                ))}
              </View>
            </Section>

            <Section title="Ordre du jour">
              <InlineForm value={agendaTitle} onChangeText={setAgendaTitle} placeholder="Nouveau point" onSubmit={addAgenda} />
              {assembly.agendaItems?.map((item) => <Text key={item.id} style={styles.listText}>{item.order}. {item.title}</Text>)}
            </Section>

            <Section title="Résolutions">
              <InlineForm value={resolutionTitle} onChangeText={setResolutionTitle} placeholder="Nouvelle résolution" onSubmit={addResolution} />
              {assembly.resolutions?.map((item) => (
                <View key={item.id} style={styles.itemBlock}>
                  <Text style={styles.listText}>{item.order}. {item.title}</Text>
                  <Text style={styles.muted}>Vote: {item.votingStatus}</Text>
                  <View style={styles.row}>
                    <Action label="Ouvrir vote" onPress={() => setVoting(item.id, 'OPEN')} />
                    <Action label="Clore vote" onPress={() => setVoting(item.id, 'CLOSED')} />
                  </View>
                </View>
              ))}
            </Section>

            <Section title="Participants">
              {assembly.participants?.map((item) => (
                <View key={item.id} style={styles.itemBlock}>
                  <Text style={styles.listText}>{item.user?.fullName ?? item.userId} - {item.apartment?.number ?? ''}</Text>
                  <Text style={styles.muted}>{item.status}</Text>
                  <View style={styles.row}>
                    {(['PRESENT', 'ABSENT', 'REPRESENTED'] as ParticipantStatus[]).map((status) => (
                      <Action key={status} label={status} onPress={() => setParticipant(item.id, status)} />
                    ))}
                  </View>
                </View>
              ))}
            </Section>

            <Section title="Résultats">
              {results.length ? results.map((item) => (
                <Text key={item.resolutionId} style={styles.listText}>
                  {item.title}: Oui {item.results.YES} - Non {item.results.NO} - Abst. {item.results.ABSTAIN}
                </Text>
              )) : <Text style={styles.muted}>Aucun vote enregistré.</Text>}
            </Section>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function InlineForm({ value, onChangeText, placeholder, onSubmit }: { value: string; onChangeText: (v: string) => void; placeholder: string; onSubmit: () => void }) {
  return (
    <View style={styles.inlineForm}>
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#9CA3AF" style={styles.input} />
      <Pressable style={styles.iconButton} onPress={onSubmit}><Plus size={18} color={colors.white} /></Pressable>
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <View style={styles.card}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>;
}

function Action({ label, onPress, active }: { label: string; onPress: () => void; active?: boolean }) {
  return <Pressable style={[styles.action, active && styles.actionActive]} onPress={onPress}><Text style={[styles.actionText, active && styles.actionTextActive]}>{label}</Text></Pressable>;
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
  subtitle: { marginTop: 5, color: colors.muted, fontSize: 13, fontWeight: '700' },
  content: { padding: 18, gap: 12 },
  card: { borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, padding: 16, gap: 10 },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '900' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  action: { borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, paddingVertical: 9, backgroundColor: '#F9FAFB' },
  actionActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  actionText: { color: colors.text, fontSize: 11, fontWeight: '900' },
  actionTextActive: { color: colors.white },
  inlineForm: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 12, color: colors.text, fontWeight: '700' },
  iconButton: { width: 46, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  listText: { color: colors.text, fontSize: 14, lineHeight: 21, fontWeight: '800' },
  muted: { color: colors.muted, fontSize: 13, lineHeight: 19, fontWeight: '600' },
  itemBlock: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, gap: 8 },
});
