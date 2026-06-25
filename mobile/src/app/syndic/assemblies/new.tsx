import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { useAuth } from '@/hooks/use-auth';
import { useSelectedSyndicResidence } from '@/hooks/use-selected-syndic-residence';
import { ApiError } from '@/lib/api/client';
import { AssemblyType } from '@/services/assemblies-service';
import { createAssembly } from '@/services/syndic-assemblies-service';

export default function NewSyndicAssemblyScreen() {
  const { token } = useAuth();
  const { selectedResidence } = useSelectedSyndicResidence();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<AssemblyType>('ORDINAIRE');
  const [scheduledAt, setScheduledAt] = useState(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16));
  const [location, setLocation] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [quorumRequired, setQuorumRequired] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const save = async () => {
    if (!token || !selectedResidence || isSaving) return;
    if (!title.trim() || !location.trim()) {
      Alert.alert('AG incomplète', 'Ajoutez un titre et un lieu.');
      return;
    }
    setIsSaving(true);
    try {
      const created = await createAssembly(token, selectedResidence.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        type,
        scheduledAt: new Date(scheduledAt).toISOString(),
        location: location.trim(),
        meetingLink: meetingLink.trim() || undefined,
        quorumRequired: quorumRequired ? Number(quorumRequired.replace(',', '.')) : undefined,
      });
      router.replace(`/syndic/assemblies/${created.id}` as never);
    } catch (err: unknown) {
      Alert.alert('Création impossible', err instanceof ApiError ? err.message : 'Veuillez réessayer.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable style={styles.backRow} onPress={() => router.replace('/syndic/assemblies')}>
          <ChevronLeft size={18} color={colors.text} />
          <Text style={styles.backText}>Retour</Text>
        </Pressable>
        <Text style={styles.title}>Créer une AG</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Field label="Titre" value={title} onChangeText={setTitle} />
        <Field label="Description" value={description} onChangeText={setDescription} multiline />
        <View style={styles.row}>
          {(['ORDINAIRE', 'EXTRAORDINAIRE'] as AssemblyType[]).map((item) => (
            <Pressable key={item} style={[styles.chip, type === item && styles.chipActive]} onPress={() => setType(item)}>
              <Text style={[styles.chipText, type === item && styles.chipTextActive]}>{item}</Text>
            </Pressable>
          ))}
        </View>
        <Field label="Date et heure" value={scheduledAt} onChangeText={setScheduledAt} placeholder="YYYY-MM-DDTHH:mm" />
        <Field label="Lieu" value={location} onChangeText={setLocation} />
        <Field label="Lien visio optionnel" value={meetingLink} onChangeText={setMeetingLink} />
        <Field label="Quorum requis optionnel" value={quorumRequired} onChangeText={setQuorumRequired} keyboardType="numeric" />
        <Pressable style={styles.primaryButton} onPress={save} disabled={isSaving}>
          {isSaving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryButtonText}>Créer l'AG</Text>}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field(props: { label: string; value: string; onChangeText: (v: string) => void; placeholder?: string; multiline?: boolean; keyboardType?: 'default' | 'numeric' }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{props.label}</Text>
      <TextInput {...props} placeholderTextColor="#9CA3AF" style={[styles.input, props.multiline && styles.textarea]} />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border, padding: 22 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  backText: { color: colors.text, fontSize: 13, fontWeight: '800' },
  title: { color: colors.text, fontSize: 27, fontWeight: '900' },
  content: { padding: 18, gap: 14 },
  field: { gap: 7 },
  label: { color: colors.text, fontWeight: '900' },
  input: { borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, padding: 13, color: colors.text, fontWeight: '700' },
  textarea: { minHeight: 90, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 8 },
  chip: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 12, alignItems: 'center', backgroundColor: colors.white },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.muted, fontWeight: '900' },
  chipTextActive: { color: colors.white },
  primaryButton: { height: 52, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: colors.white, fontWeight: '900', fontSize: 15 },
});
