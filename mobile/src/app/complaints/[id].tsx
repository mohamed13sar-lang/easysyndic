import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, ClipboardList, Image as ImageIcon, Volume2 } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
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
  ComplaintCategory,
  getMyComplaint,
  ResidentComplaint,
} from '@/services/complaints-service';

const categoryLabels: Record<ComplaintCategory, string> = {
  ASCENSEUR: 'Ascenseur',
  EAU: 'Plomberie',
  ELECTRICITE: 'Electricite',
  NETTOYAGE: 'Nettoyage',
  SECURITE: 'Securite',
  PARKING: 'Parking',
  BRUIT: 'Bruit',
  ECLAIRAGE: 'Eclairage',
  PORTE_GARAGE: 'Porte garage',
  CAMERA: 'Camera',
  VOISINAGE: 'Voisinage',
  AUTRE: 'Autre',
};

function formatDate(value: string | null) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

export default function ComplaintDetailsScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { token } = useAuth();
  const [complaint, setComplaint] = useState<ResidentComplaint | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
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
      // Keep local placeholder visible when the OS cannot open it.
    }
    Alert.alert('Media', url);
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

  const loadComplaint = useCallback(async () => {
    if (!token || !id) {
      setIsLoading(false);
      setError('Réclamation introuvable.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const data = await getMyComplaint(token, id);
      setComplaint(data);
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : 'Impossible de charger cette réclamation.');
    } finally {
      setIsLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    loadComplaint();
  }, [loadComplaint]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable style={styles.backRow} onPress={() => router.replace('/complaints')}>
          <ChevronLeft size={18} color={colors.text} />
          <Text style={styles.backText}>Retour</Text>
        </Pressable>
        <Text style={styles.title}>Réclamation</Text>
        <Text style={styles.subtitle}>Detail de votre demande</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {isLoading && (
          <View style={styles.stateCard}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.stateText}>Chargement de la réclamation...</Text>
          </View>
        )}

        {!isLoading && !!error && (
          <View style={styles.stateCard}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={loadComplaint}>
              <Text style={styles.retryText}>Réessayer</Text>
            </Pressable>
          </View>
        )}

        {!isLoading && !error && complaint && (
          <>
            <View style={styles.heroCard}>
              <View style={styles.iconWrap}>
                <ClipboardList size={22} color={colors.primary} strokeWidth={2.2} />
              </View>
              <Text style={styles.heroTitle}>{complaint.title}</Text>
              <Text style={styles.heroSubtitle}>{complaint.description}</Text>
            </View>

            <View style={styles.card}>
              <DetailRow label="Categorie" value={categoryLabels[complaint.category]} />
              <DetailRow label="Urgence" value={complaint.urgency} />
              <DetailRow label="Statut" value={complaint.status} />
              <DetailRow
                label="Appartement"
                value={`Appartement ${complaint.apartment.number}${
                  complaint.apartment.block ? ` - Bloc ${complaint.apartment.block}` : ''
                }`}
              />
              <DetailRow label="Creee le" value={formatDate(complaint.createdAt)} />
              <DetailRow label="Mise a jour" value={formatDate(complaint.updatedAt)} />
              <DetailRow label="Fermee le" value={formatDate(complaint.closedAt)} />
              <DetailRow label="Commentaires" value={`${complaint.commentsCount}`} />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Médias joints</Text>
              {complaint.media.length === 0 ? (
                <Text style={styles.emptyText}>Aucun média joint.</Text>
              ) : (
                <View style={styles.mediaList}>
                  {complaint.media.map((media) => {
                    const url = media.url ?? media.fileUrl;
                    const type = media.type ?? media.fileType;
                    if (type === 'IMAGE') {
                      return (
                        <Pressable
                          key={media.id}
                          style={styles.imageTile}
                          onPress={() => openMedia(url)}>
                          {url.startsWith('http') ? (
                            <Image source={{ uri: url }} style={styles.imagePreview} />
                          ) : (
                            <View style={styles.mediaIconTile}>
                              <ImageIcon size={22} color={colors.primary} />
                            </View>
                          )}
                          <Text style={styles.mediaName} numberOfLines={1}>
                            {media.fileName ?? 'Image'}
                          </Text>
                        </Pressable>
                      );
                    }

                    return (
                      <Pressable
                        key={media.id}
                        style={styles.audioRow}
                        onPress={() => playAudio(url)}>
                        <View style={styles.audioIcon}>
                          <Volume2 size={18} color={colors.primary} />
                        </View>
                        <View style={styles.audioTextWrap}>
                          <Text style={styles.audioTitle}>Message vocal</Text>
                          <Text style={styles.audioUrl} numberOfLines={1}>
                            {playingAudioUrl === url ? 'Lecture en cours...' : 'Appuyer pour ecouter'}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          </>
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
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
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
    fontWeight: '800',
    lineHeight: 34,
  },
  subtitle: {
    marginTop: 5,
    color: colors.muted,
    fontSize: 14,
    fontWeight: '500',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 24,
    gap: 12,
  },
  heroCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: 18,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  heroSubtitle: {
    marginTop: 8,
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: 16,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  mediaList: {
    gap: 10,
  },
  imageTile: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    padding: 10,
  },
  imagePreview: {
    width: '100%',
    height: 150,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
  },
  mediaIconTile: {
    height: 90,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaName: {
    marginTop: 8,
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  audioRow: {
    minHeight: 58,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  audioIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  audioTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  audioUrl: {
    marginTop: 3,
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  detailRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 10,
  },
  detailLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  detailValue: {
    marginTop: 3,
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  stateCard: {
    minHeight: 128,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: 16,
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
