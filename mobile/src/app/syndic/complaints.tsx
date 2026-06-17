import { router, useFocusEffect } from 'expo-router';
import {
  Building2,
  ChevronLeft,
  ClipboardList,
  Image as ImageIcon,
  MessageSquare,
  Send,
  Volume2,
} from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '@/hooks/use-auth';
import {
  formatSyndicResidenceAddress,
  useSelectedSyndicResidence,
} from '@/hooks/use-selected-syndic-residence';
import { ApiError } from '@/lib/api/client';
import {
  addSyndicComplaintComment,
  getSyndicComplaints,
  SyndicComplaint,
  SyndicComplaintStatus,
  updateSyndicComplaintStatus,
} from '@/services/syndic-complaints-service';

type FilterStatus = 'ALL' | SyndicComplaintStatus;

const statuses: SyndicComplaintStatus[] = [
  'NOUVELLE',
  'VUE',
  'EN_COURS',
  'RESOLUE',
  'FERMEE',
  'REFUSEE',
];

const filterStatuses: FilterStatus[] = ['ALL', ...statuses];

const categoryLabels: Record<string, string> = {
  ASCENSEUR: 'Ascenseur',
  EAU: 'Eau',
  ELECTRICITE: 'Électricité',
  NETTOYAGE: 'Nettoyage',
  SECURITE: 'Sécurité',
  PARKING: 'Parking',
  BRUIT: 'Bruit',
  ECLAIRAGE: 'Éclairage',
  PORTE_GARAGE: 'Porte garage',
  CAMERA: 'Camera',
  VOISINAGE: 'Voisinage',
  AUTRE: 'Autre',
};

function formatStatus(status: FilterStatus) {
  if (status === 'ALL') return 'Toutes';
  if (status === 'NOUVELLE') return 'Nouvelle';
  if (status === 'VUE') return 'Vue';
  if (status === 'EN_COURS') return 'En cours';
  if (status === 'RESOLUE') return 'Résolue';
  if (status === 'FERMEE') return 'Fermée';
  return 'Refusée';
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatApartment(complaint: SyndicComplaint) {
  const apartment = complaint.apartment;
  return [
    `Appartement ${apartment.number}`,
    apartment.block ? `Bloc ${apartment.block}` : null,
    apartment.floor === null ? null : `Étage ${apartment.floor}`,
  ]
    .filter(Boolean)
    .join(' - ');
}

function isOpenStatus(status: string) {
  return status === 'NOUVELLE' || status === 'VUE' || status === 'EN_COURS';
}

export default function SyndicComplaintsScreen() {
  const { token } = useAuth();
  const {
    selectedResidence,
    isLoading: isResidenceLoading,
    error: residenceError,
  } = useSelectedSyndicResidence();
  const [complaints, setComplaints] = useState<SyndicComplaint[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('ALL');
  const [commentByComplaint, setCommentByComplaint] = useState<Record<string, string>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [commentingId, setCommentingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [playingAudioUrl, setPlayingAudioUrl] = useState<string | null>(null);
  const [audioSound, setAudioSound] = useState<any>(null);

  const openMedia = async (url: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        return;
      }
    } catch {
      // Local placeholders are shown as text when no handler exists.
    }
    Alert.alert('Média', url);
  };

  const playAudio = async (url: string) => {
    try {
      if (audioSound) {
        audioSound.remove();
      }
      const Audio = await import('expo-audio');
      const player = Audio.createAudioPlayer({ uri: url });
      setAudioSound(player);
      setPlayingAudioUrl(url);
      player.play();
    } catch {
      Alert.alert('Message vocal', 'Impossible de lire ce message vocal.');
    }
  };

  const loadComplaints = useCallback(async () => {
    console.log('[syndic-complaints] selectedResidenceId', selectedResidence?.id ?? null);

    if (!token || !selectedResidence) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const data = await getSyndicComplaints(token, selectedResidence.id);
      setComplaints(data);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        console.log('[syndic-complaints] backend error message', err.message, err.details);
        setError(`Impossible de charger les réclamations : ${err.message}`);
      } else {
        setError('Impossible de charger les réclamations.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedResidence, token]);

  useFocusEffect(
    useCallback(() => {
      loadComplaints();
    }, [loadComplaints]),
  );

  const counters = useMemo(() => {
    return complaints.reduce(
      (acc, complaint) => ({
        open: acc.open + (isOpenStatus(complaint.status) ? 1 : 0),
        resolved: acc.resolved + (complaint.status === 'RESOLUE' || complaint.status === 'FERMEE' ? 1 : 0),
        refused: acc.refused + (complaint.status === 'REFUSEE' ? 1 : 0),
      }),
      { open: 0, resolved: 0, refused: 0 },
    );
  }, [complaints]);

  const filteredComplaints = useMemo(
    () =>
      complaints.filter((complaint) =>
        activeFilter === 'ALL' ? true : complaint.status === activeFilter,
      ),
    [activeFilter, complaints],
  );

  const handleUpdateStatus = async (complaintId: string, status: SyndicComplaintStatus) => {
    if (!token || !selectedResidence || updatingId) return;
    setUpdatingId(complaintId);
    setActionError('');

    try {
      await updateSyndicComplaintStatus(token, selectedResidence.id, complaintId, status);
      await loadComplaints();
    } catch (err: unknown) {
      setActionError(err instanceof ApiError ? err.message : 'Impossible de modifier le statut.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleAddComment = async (complaintId: string) => {
    if (!token || !selectedResidence || commentingId) return;
    const comment = commentByComplaint[complaintId]?.trim();
    if (!comment) {
      setActionError('Le commentaire est obligatoire.');
      return;
    }

    setCommentingId(complaintId);
    setActionError('');

    try {
      await addSyndicComplaintComment(token, selectedResidence.id, complaintId, comment);
      setCommentByComplaint((current) => ({ ...current, [complaintId]: '' }));
      await loadComplaints();
    } catch (err: unknown) {
      setActionError(err instanceof ApiError ? err.message : 'Impossible d’ajouter le commentaire.');
    } finally {
      setCommentingId(null);
    }
  };

  const showLoading = isLoading || isResidenceLoading;
  const shownError = error || residenceError;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable style={styles.backRow} onPress={() => router.replace('/syndic/dashboard')}>
            <ChevronLeft size={18} color="#1F2328" />
            <Text style={styles.backText}>Retour</Text>
          </Pressable>
          <Text style={styles.title}>Réclamations</Text>
          <Text style={styles.subtitle}>
            {selectedResidence
              ? `${selectedResidence.name} - ${formatSyndicResidenceAddress(selectedResidence)}`
              : 'Sélectionnez une résidence active'}
          </Text>
        </View>

        <View style={styles.totalsGrid}>
          <View style={styles.totalCard}>
            <Text style={styles.totalValue}>{counters.open}</Text>
            <Text style={styles.totalLabel}>Ouvertes</Text>
          </View>
          <View style={styles.totalCard}>
            <Text style={styles.totalValue}>{counters.resolved}</Text>
            <Text style={styles.totalLabel}>Résolues / fermées</Text>
          </View>
          <View style={styles.totalCard}>
            <Text style={styles.totalValue}>{counters.refused}</Text>
            <Text style={styles.totalLabel}>Refusées</Text>
          </View>
        </View>

        <View style={styles.filterRow}>
          {filterStatuses.map((status) => {
            const selected = activeFilter === status;
            return (
              <Pressable
                key={status}
                style={[styles.filterButton, selected && styles.filterButtonSelected]}
                onPress={() => setActiveFilter(status)}>
                <Text style={[styles.filterText, selected && styles.filterTextSelected]}>
                  {formatStatus(status)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {!!actionError && <Text style={styles.actionError}>{actionError}</Text>}

        {showLoading && (
          <View style={styles.stateCard}>
            <ActivityIndicator color="#18A7A0" />
            <Text style={styles.stateText}>Chargement des réclamations...</Text>
          </View>
        )}

        {!showLoading && !!shownError && (
          <View style={styles.stateCard}>
            <Text style={styles.errorText}>{shownError}</Text>
            <Pressable style={styles.retryButton} onPress={loadComplaints}>
              <Text style={styles.retryText}>Réessayer</Text>
            </Pressable>
          </View>
        )}

        {!showLoading && !shownError && !selectedResidence && (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>Aucune résidence active</Text>
            <Text style={styles.stateText}>Sélectionnez une résidence avant de gérer les réclamations.</Text>
          </View>
        )}

        {!showLoading && !shownError && selectedResidence && filteredComplaints.length === 0 && (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>Aucune réclamation</Text>
            <Text style={styles.stateText}>Les réclamations de cette résidence apparaîtront ici.</Text>
          </View>
        )}

        {!showLoading && !shownError && filteredComplaints.length > 0 && (
          <View style={styles.grid}>
            {filteredComplaints.map((complaint) => (
              <View key={complaint.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.iconWrap}>
                    <ClipboardList size={20} color="#18A7A0" strokeWidth={2.2} />
                  </View>
                  <Text style={[styles.statusBadge, isOpenStatus(complaint.status) ? styles.pending : styles.closed]}>
                    {formatStatus(complaint.status as SyndicComplaintStatus)}
                  </Text>
                </View>

                <Text style={styles.cardTitle}>{complaint.title}</Text>
                <Text style={styles.metaText}>{categoryLabels[complaint.category] ?? complaint.category}</Text>
                <Text style={styles.metaText}>{formatApartment(complaint)}</Text>
                <Text style={styles.metaText}>
                  {complaint.resident?.fullName ?? (complaint.isAnonymous ? 'Résident anonyme' : 'Résident -')}
                </Text>
                <Text style={styles.description}>{complaint.description}</Text>
                <Text style={styles.dateText}>{formatDate(complaint.createdAt)}</Text>

                {complaint.media.length > 0 && (
                  <View style={styles.mediaBox}>
                    <Text style={styles.sectionLabel}>Pièces jointes</Text>
                    {complaint.media.map((media) => {
                      const url = media.url ?? media.fileUrl;
                      const type = media.type ?? media.fileType;
                      if (type === 'IMAGE') {
                        return (
                          <Pressable
                            key={media.id}
                            style={styles.mediaRow}
                            onPress={() => openMedia(url)}>
                            {url.startsWith('http') ? (
                              <Image source={{ uri: url }} style={styles.mediaThumb} />
                            ) : (
                              <View style={styles.mediaIcon}>
                                <ImageIcon size={18} color="#18A7A0" />
                              </View>
                            )}
                            <Text style={styles.mediaText} numberOfLines={1}>
                              {media.fileName ?? 'Image'}
                            </Text>
                          </Pressable>
                        );
                      }

                      return (
                        <Pressable
                          key={media.id}
                          style={styles.mediaRow}
                          onPress={() => playAudio(url)}>
                          <View style={styles.mediaIcon}>
                            <Volume2 size={18} color="#18A7A0" />
                          </View>
                          <Text style={styles.mediaText} numberOfLines={1}>
                            {playingAudioUrl === url ? 'Lecture en cours...' : 'Message vocal'}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}

                <Text style={styles.sectionLabel}>Statut</Text>
                <View style={styles.statusRow}>
                  {statuses.map((status) => {
                    const selected = complaint.status === status;
                    return (
                      <Pressable
                        key={status}
                        style={[styles.statusButton, selected && styles.statusButtonSelected]}
                        disabled={updatingId === complaint.id || selected}
                        onPress={() => handleUpdateStatus(complaint.id, status)}>
                        <Text style={[styles.statusButtonText, selected && styles.statusButtonTextSelected]}>
                          {updatingId === complaint.id && !selected ? '...' : formatStatus(status)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={styles.commentBox}>
                  <MessageSquare size={17} color="#18A7A0" />
                  <TextInput
                    value={commentByComplaint[complaint.id] ?? ''}
                    onChangeText={(value) =>
                      setCommentByComplaint((current) => ({ ...current, [complaint.id]: value }))
                    }
                    placeholder="Ajouter un commentaire"
                    placeholderTextColor="#9CA3AF"
                    style={styles.commentInput}
                  />
                  <Pressable
                    style={[styles.sendButton, commentingId === complaint.id && styles.buttonDisabled]}
                    disabled={commentingId === complaint.id}
                    onPress={() => handleAddComment(complaint.id)}>
                    <Send size={16} color="#FFFFFF" />
                  </Pressable>
                </View>
                <Text style={styles.commentCount}>{complaint.commentsCount} commentaire(s)</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.footerAction}>
          <Pressable style={styles.residenceButton} onPress={() => router.push('/syndic/residences')}>
            <Building2 size={17} color="#18A7A0" />
            <Text style={styles.residenceButtonText}>Changer de résidence</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 24, paddingBottom: 36, width: '100%', maxWidth: 980, alignSelf: 'center' },
  header: { marginBottom: 16 },
  backRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginBottom: 18 },
  backText: { marginLeft: 2, color: '#1F2328', fontSize: 16, fontWeight: '500' },
  title: { color: '#1F2328', fontSize: 28, lineHeight: 34, fontWeight: '800' },
  subtitle: { marginTop: 6, color: '#6B7280', fontSize: 14, lineHeight: 20, fontWeight: '500' },
  totalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  totalCard: { minHeight: 88, minWidth: 160, flexGrow: 1, flexBasis: '31%', borderRadius: 18, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF', padding: 16 },
  totalValue: { color: '#1F2328', fontSize: 24, fontWeight: '800' },
  totalLabel: { marginTop: 6, color: '#6B7280', fontSize: 13, fontWeight: '700' },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  filterButton: { minHeight: 38, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  filterButtonSelected: { borderColor: '#18A7A0', backgroundColor: '#D6F3F1' },
  filterText: { color: '#6B7280', fontSize: 13, fontWeight: '800' },
  filterTextSelected: { color: '#18A7A0' },
  actionError: { marginBottom: 12, color: '#DC2626', fontSize: 13, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { minHeight: 300, minWidth: 280, flexGrow: 1, flexBasis: '48%', borderRadius: 18, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF', padding: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconWrap: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#D6F3F1', alignItems: 'center', justifyContent: 'center' },
  statusBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, fontSize: 12, fontWeight: '800' },
  pending: { backgroundColor: '#FEF3C7', color: '#D97706' },
  closed: { backgroundColor: '#DCFCE7', color: '#16A34A' },
  cardTitle: { marginTop: 14, color: '#1F2328', fontSize: 17, fontWeight: '800' },
  metaText: { marginTop: 5, color: '#6B7280', fontSize: 13, fontWeight: '600' },
  description: { marginTop: 12, color: '#1F2328', fontSize: 14, lineHeight: 20, fontWeight: '500' },
  dateText: { marginTop: 10, color: '#9CA3AF', fontSize: 12, fontWeight: '700' },
  mediaBox: { marginTop: 12, gap: 8 },
  mediaRow: { minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  mediaThumb: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#D6F3F1' },
  mediaIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#D6F3F1', alignItems: 'center', justifyContent: 'center' },
  mediaText: { flex: 1, color: '#1F2328', fontSize: 13, fontWeight: '800' },
  sectionLabel: { marginTop: 14, marginBottom: 8, color: '#1F2328', fontSize: 13, fontWeight: '800' },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusButton: { minHeight: 36, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', justifyContent: 'center', paddingHorizontal: 10 },
  statusButtonSelected: { borderColor: '#18A7A0', backgroundColor: '#D6F3F1' },
  statusButtonText: { color: '#6B7280', fontSize: 12, fontWeight: '800' },
  statusButtonTextSelected: { color: '#18A7A0' },
  commentBox: { marginTop: 14, minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  commentInput: { flex: 1, color: '#1F2328', fontSize: 14, fontWeight: '600' },
  sendButton: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#18A7A0', alignItems: 'center', justifyContent: 'center' },
  buttonDisabled: { opacity: 0.6 },
  commentCount: { marginTop: 8, color: '#6B7280', fontSize: 12, fontWeight: '700' },
  stateCard: { minHeight: 140, borderRadius: 18, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF', padding: 18, alignItems: 'center', justifyContent: 'center', gap: 8 },
  stateTitle: { color: '#1F2328', fontSize: 15, fontWeight: '800', textAlign: 'center' },
  stateText: { color: '#6B7280', fontSize: 14, lineHeight: 20, fontWeight: '500', textAlign: 'center' },
  errorText: { color: '#DC2626', fontSize: 14, lineHeight: 20, fontWeight: '600', textAlign: 'center' },
  retryButton: { borderRadius: 12, backgroundColor: '#D6F3F1', paddingHorizontal: 14, paddingVertical: 8 },
  retryText: { color: '#18A7A0', fontSize: 13, fontWeight: '800' },
  footerAction: { marginTop: 16 },
  residenceButton: { height: 50, borderRadius: 14, borderWidth: 1, borderColor: '#18A7A0', backgroundColor: '#D6F3F1', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  residenceButtonText: { color: '#18A7A0', fontSize: 14, fontWeight: '800' },
});
