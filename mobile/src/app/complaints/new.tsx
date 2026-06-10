import { router } from 'expo-router';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import {
  Camera,
  ChevronLeft,
  Droplets,
  Mic,
  MoreHorizontal,
  Shield,
  Sparkles,
  Wrench,
  Zap,
} from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton } from '@/components/AppButton';
import { colors } from '@/constants/colors';
import { useAuth } from '@/hooks/use-auth';
import { formatApartmentLabel, useSelectedResidence } from '@/hooks/use-selected-residence';
import { ApiError } from '@/lib/api/client';
import {
  ComplaintCategory,
  CreateComplaintMediaInput,
  ComplaintUrgency,
  createMyComplaint,
} from '@/services/complaints-service';
import {
  uploadComplaintAudio,
  uploadComplaintImage,
  UploadedFile,
} from '@/services/storage-service';

const categories = [
  { key: 'Plomberie', value: 'EAU' as ComplaintCategory, icon: Droplets },
  { key: 'Electricite', value: 'ELECTRICITE' as ComplaintCategory, icon: Zap },
  { key: 'Ascenseur', value: 'ASCENSEUR' as ComplaintCategory, icon: Wrench },
  { key: 'Nettoyage', value: 'NETTOYAGE' as ComplaintCategory, icon: Sparkles },
  { key: 'Securite', value: 'SECURITE' as ComplaintCategory, icon: Shield },
  { key: 'Autre', value: 'AUTRE' as ComplaintCategory, icon: MoreHorizontal },
];

export default function ComplaintNewScreen() {
  const { token } = useAuth();
  const {
    selectedResidence,
    isLoading: isResidenceLoading,
    error: residenceError,
  } = useSelectedResidence();
  const [category, setCategory] = useState<ComplaintCategory>('EAU');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedImages, setSelectedImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [previewSound, setPreviewSound] = useState<Audio.Sound | null>(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pickImages = async (source: 'camera' | 'library') => {
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission requise', 'Autorisez l acces aux photos pour joindre une image.');
      return;
    }

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85 })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsMultipleSelection: true,
            quality: 0.85,
          });

    if (!result.canceled) {
      setSelectedImages((current) => [...current, ...result.assets]);
    }
  };

  const choosePhotoSource = () => {
    Alert.alert('Ajouter une photo', 'Choisissez une source.', [
      { text: 'Prendre une photo', onPress: () => pickImages('camera') },
      { text: 'Choisir depuis la galerie', onPress: () => pickImages('library') },
      { text: 'Annuler', style: 'cancel' },
    ]);
  };

  const startRecording = async () => {
    const permission = await Audio.requestPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission requise', 'Autorisez le microphone pour enregistrer un message vocal.');
      return;
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });
    const { recording: nextRecording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY,
    );
    setRecording(nextRecording);
  };

  const stopRecording = async () => {
    if (!recording) return;
    await recording.stopAndUnloadAsync();
    const status = await recording.getStatusAsync();
    setAudioUri(recording.getURI());
    setAudioDuration(status.isDoneRecording ? status.durationMillis ?? 0 : 0);
    setRecording(null);
  };

  const playAudioPreview = async () => {
    if (!audioUri) return;
    if (previewSound) {
      await previewSound.replayAsync();
      return;
    }
    const { sound } = await Audio.Sound.createAsync({ uri: audioUri });
    setPreviewSound(sound);
    await sound.playAsync();
  };

  const formatDuration = (millis: number) => {
    const seconds = Math.max(0, Math.round(millis / 1000));
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  };

  const handleSubmit = async () => {
    if (!token) {
      setError('Session introuvable. Veuillez vous reconnecter.');
      return;
    }
    if (!selectedResidence) {
      setError('Sélectionnez une résidence avant de créer une réclamation.');
      return;
    }
    if (!title.trim()) {
      Alert.alert('Veuillez saisir un titre.');
      return;
    }
    if (!description.trim() && !audioUri) {
      Alert.alert('Description requise', 'Ajoutez une description ou un message vocal.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const uploadedImages: UploadedFile[] = [];
      for (const image of selectedImages) {
        uploadedImages.push(
          await uploadComplaintImage({
            uri: image.uri,
            fileName: image.fileName,
            mimeType: image.mimeType,
            size: image.fileSize,
          }),
        );
      }

      const uploadedMedia: CreateComplaintMediaInput[] = uploadedImages.map((file) => ({
        url: file.url,
        type: 'IMAGE',
        fileName: file.fileName,
        mimeType: file.mimeType,
        size: file.size ?? undefined,
      }));

      if (audioUri) {
        const audio = await uploadComplaintAudio({
          uri: audioUri,
          fileName: `message-vocal-${Date.now()}.m4a`,
          mimeType: 'audio/m4a',
        });
        uploadedMedia.push({
          url: audio.url,
          type: 'AUDIO',
          fileName: audio.fileName,
          mimeType: audio.mimeType,
          size: audio.size ?? undefined,
        });
      }

      await createMyComplaint(token, {
        residenceId: selectedResidence.id,
        apartmentId: selectedResidence.apartment.id,
        category,
        title: title.trim(),
        description: description.trim() || 'Message vocal',
        urgency: 'MEDIUM' as ComplaintUrgency,
        media: uploadedMedia,
      });
      Alert.alert('Réclamation envoyée avec succès.');
      router.replace('/complaints');
    } catch (err: unknown) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
          : 'Impossible d’envoyer la réclamation.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable style={styles.backRow} onPress={() => router.replace('/complaints')}>
          <ChevronLeft size={18} color={colors.text} />
          <Text style={styles.backText}>Retour</Text>
        </Pressable>
        <Text style={styles.title}>Nouvelle réclamation</Text>
        <Text style={styles.subtitle}>Decrivez votre probleme</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.contextCard}>
          <Text style={styles.contextTitle}>
            {isResidenceLoading
              ? 'Chargement de la residence...'
              : selectedResidence
                ? selectedResidence.name
                : 'Aucune residence selectionnee'}
          </Text>
          <Text style={styles.contextText}>
            {selectedResidence ? formatApartmentLabel(selectedResidence) : residenceError || '-'}
          </Text>
        </View>

        <Text style={styles.label}>Categorie</Text>
        <View style={styles.categoryGrid}>
          {categories.map((item) => {
            const Icon = item.icon;
            const selected = item.value === category;
            return (
              <Pressable
                key={item.key}
                onPress={() => setCategory(item.value)}
                style={[styles.categoryCard, selected && styles.categoryCardSelected]}>
                <View
                  style={[
                    styles.categoryIconWrap,
                    selected && styles.categoryIconWrapSelected,
                  ]}>
                  <Icon
                    size={18}
                    color={selected ? colors.primary : '#6B7280'}
                    strokeWidth={2.2}
                  />
                </View>
                <Text style={[styles.categoryText, selected && styles.categoryTextSelected]}>
                  {item.key}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Titre</Text>
        <TextInput
          value={title}
          onChangeText={(value) => {
            setTitle(value);
            if (error) setError('');
          }}
          placeholder="Ex: Fuite d'eau cuisine"
          placeholderTextColor="#9CA3AF"
          style={styles.input}
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          value={description}
          onChangeText={(value) => {
            setDescription(value);
            if (error) setError('');
          }}
          placeholder="Decrivez le probleme en detail..."
          placeholderTextColor="#9CA3AF"
          style={styles.textarea}
          multiline
          textAlignVertical="top"
        />

        <Text style={styles.label}>Medias</Text>
        <Pressable style={styles.uploadCard} onPress={choosePhotoSource}>
          <View style={styles.uploadIconWrap}>
            <Camera size={22} color={colors.primary} strokeWidth={2.1} />
          </View>
          <Text style={styles.uploadTitle}>Ajouter une photo</Text>
          <Text style={styles.uploadSubtitle}>Prendre une photo ou choisir depuis la galerie</Text>
        </Pressable>

        <Pressable
          style={[styles.audioCard, recording && styles.audioCardRecording]}
          onPress={recording ? stopRecording : startRecording}>
          <View style={styles.uploadIconWrap}>
            <Mic size={22} color={colors.primary} strokeWidth={2.1} />
          </View>
          <Text style={styles.uploadTitle}>
            {recording ? 'Arreter l enregistrement' : 'Enregistrer un message vocal'}
          </Text>
          <Text style={styles.uploadSubtitle}>
            {audioUri ? `Message vocal - ${formatDuration(audioDuration)}` : 'Description ou audio obligatoire'}
          </Text>
        </Pressable>

        {(selectedImages.length > 0 || audioUri) && (
          <View style={styles.previewCard}>
            <Text style={styles.previewTitle}>Medias selectionnes</Text>
            {selectedImages.map((item, index) => (
              <View key={`${item.uri}-${index}`} style={styles.mediaPreviewRow}>
                <Image source={{ uri: item.uri }} style={styles.previewImage} />
                <View style={styles.previewTextWrap}>
                  <Text style={styles.previewType}>Image</Text>
                  <Text style={styles.previewUrl} numberOfLines={1}>{item.fileName ?? item.uri}</Text>
                </View>
                <Pressable
                  onPress={() =>
                    setSelectedImages((current) =>
                      current.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }>
                  <Text style={styles.removeMediaText}>Retirer</Text>
                </Pressable>
              </View>
            ))}
            {audioUri && (
              <View style={styles.voiceNote}>
                <Pressable style={styles.voicePlayButton} onPress={playAudioPreview}>
                  <Text style={styles.voicePlayText}>Play</Text>
                </Pressable>
                <View style={styles.previewTextWrap}>
                  <Text style={styles.previewType}>Message vocal</Text>
                  <Text style={styles.previewUrl}>{formatDuration(audioDuration)}</Text>
                </View>
                <Pressable onPress={() => setAudioUri(null)}>
                  <Text style={styles.removeMediaText}>Supprimer</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        <View style={styles.actions}>
          <AppButton
            title="Envoyer la réclamation"
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={isSubmitting || isResidenceLoading || !selectedResidence}
          />
          <Pressable style={styles.cancelButton} onPress={() => router.replace('/complaints')}>
            <Text style={styles.cancelText}>Annuler</Text>
          </Pressable>
        </View>
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
    paddingBottom: 18,
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
    marginTop: 6,
    color: colors.muted,
    fontSize: 15,
    fontWeight: '500',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 28,
  },
  contextCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: 14,
    marginBottom: 10,
  },
  contextTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  contextText: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 13,
    fontWeight: '500',
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
    marginTop: 8,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
    marginBottom: 10,
  },
  categoryCard: {
    width: '48.3%',
    minHeight: 68,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  categoryCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  categoryIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryIconWrapSelected: {
    backgroundColor: '#D6F3F1',
  },
  categoryText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 1,
  },
  categoryTextSelected: {
    color: colors.primary,
  },
  input: {
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    marginBottom: 8,
    color: colors.text,
    fontSize: 14,
  },
  textarea: {
    height: 130,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    paddingTop: 12,
    marginBottom: 10,
    color: colors.text,
    fontSize: 14,
  },
  uploadCard: {
    marginTop: 8,
    minHeight: 126,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioCard: {
    marginTop: 8,
    minHeight: 104,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioCardRecording: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerLight,
  },
  uploadIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  uploadTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  uploadSubtitle: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 13,
    fontWeight: '500',
  },
  previewCard: {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: 14,
    gap: 10,
  },
  previewTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  mediaPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  previewImage: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
  },
  previewIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  previewType: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  previewUrl: {
    marginTop: 3,
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  removeMediaText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '800',
  },
  voiceNote: {
    minHeight: 54,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  voicePlayButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voicePlayText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '800',
  },
  errorText: {
    marginTop: 12,
    color: colors.danger,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  actions: {
    marginTop: 22,
  },
  cancelButton: {
    marginTop: 12,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: '700',
  },
});
