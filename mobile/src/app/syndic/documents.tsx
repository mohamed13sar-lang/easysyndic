import { router } from 'expo-router';
import { ChevronLeft, Download, FileText, Plus, UploadCloud } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import {
  formatSyndicResidenceAddress,
  useSelectedSyndicResidence,
} from '@/hooks/use-selected-syndic-residence';
import { useAuth } from '@/hooks/use-auth';
import { ApiError } from '@/lib/api/client';
import {
  AppDocument,
  createSyndicDocument,
  DocumentType,
  getDocumentSignedUrl,
  getSyndicDocuments,
} from '@/services/documents-service';
import type { UploadFile } from '@/services/upload-service';

const documentTypes: Array<{ label: string; value: DocumentType }> = [
  { label: 'Reglement', value: 'GENERAL' },
  { label: 'PV', value: 'PV' },
  { label: 'Assemblee', value: 'ASSEMBLEE_GENERALE' },
  { label: 'Facture', value: 'FACTURE' },
  { label: 'Travaux', value: 'TRAVAUX' },
  { label: 'Contrat', value: 'CONTRAT' },
];

const typeLabel = (type: DocumentType) =>
  documentTypes.find((item) => item.value === type)?.label ?? 'Document';

export default function SyndicDocumentsScreen() {
  const { token } = useAuth();
  const { selectedResidence, isLoading: isResidenceLoading } = useSelectedSyndicResidence();
  const [documents, setDocuments] = useState<AppDocument[]>([]);
  const [selectedFile, setSelectedFile] = useState<UploadFile | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<DocumentType>('GENERAL');
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  const residenceLabel = useMemo(() => {
    if (isResidenceLoading) return 'Chargement de la residence...';
    if (!selectedResidence) return 'Aucune residence selectionnee';
    return `${selectedResidence.name} - ${formatSyndicResidenceAddress(selectedResidence)}`;
  }, [isResidenceLoading, selectedResidence]);

  const loadDocuments = useCallback(async () => {
    if (!token || !selectedResidence) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      setDocuments(await getSyndicDocuments(token, selectedResidence.id));
    } catch (err: unknown) {
      setError(
        err instanceof ApiError ? err.message : 'Impossible de charger les documents.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [selectedResidence, token]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const pickFile = async () => {
    const DocumentPicker = await import('expo-document-picker');
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: [
        'application/pdf',
        'image/*',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ],
    });
    if (result.canceled || !result.assets.length) return;
    const asset = result.assets[0];
    setSelectedFile({
      uri: asset.uri,
      name: asset.name || 'document',
      type: asset.mimeType || 'application/octet-stream',
    });
    if (!title.trim()) {
      setTitle((asset.name || 'Document').replace(/\.[^.]+$/, ''));
    }
  };

  const uploadDocument = async () => {
    if (!token || !selectedResidence || !selectedFile || isUploading) return;
    if (!title.trim()) {
      Alert.alert('Titre requis', 'Ajoutez un titre au document.');
      return;
    }
    setIsUploading(true);
    try {
      const created = await createSyndicDocument(
        token,
        {
          title: title.trim(),
          description: description.trim() || undefined,
          type,
          residenceId: selectedResidence.id,
        },
        selectedFile,
      );
      setDocuments((current) => [created, ...current]);
      setSelectedFile(null);
      setTitle('');
      setDescription('');
      setType('GENERAL');
      Alert.alert('Document ajoute', 'Le fichier est disponible pour les residents.');
    } catch (err: unknown) {
      Alert.alert(
        'Upload impossible',
        err instanceof ApiError ? err.message : 'Veuillez reessayer dans un instant.',
      );
    } finally {
      setIsUploading(false);
    }
  };

  const openDocument = async (document: AppDocument) => {
    if (!token) return;
    try {
      const { url } = await getDocumentSignedUrl(token, document.id);
      await Linking.openURL(url);
    } catch (err: unknown) {
      Alert.alert(
        'Document indisponible',
        err instanceof ApiError ? err.message : 'Impossible d ouvrir ce document.',
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable style={styles.backRow} onPress={() => router.replace('/syndic/dashboard')}>
            <ChevronLeft size={18} color={colors.text} />
            <Text style={styles.backText}>Retour</Text>
          </Pressable>
          <Text style={styles.title}>Documents</Text>
          <Text style={styles.subtitle}>{residenceLabel}</Text>
        </View>

        <View style={styles.uploadCard}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Ajouter un document</Text>
              <Text style={styles.sectionSubtitle}>PDF, image, Word ou Excel</Text>
            </View>
            <UploadCloud size={22} color={colors.primary} />
          </View>

          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Titre"
            placeholderTextColor="#9CA3AF"
            style={styles.input}
          />
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Description optionnelle"
            placeholderTextColor="#9CA3AF"
            style={[styles.input, styles.textarea]}
            multiline
          />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeRow}>
            {documentTypes.map((item) => {
              const active = type === item.value;
              return (
                <Pressable
                  key={item.value}
                  style={[styles.typeChip, active && styles.typeChipActive]}
                  onPress={() => setType(item.value)}>
                  <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Pressable style={styles.fileButton} onPress={pickFile}>
            <Plus size={18} color={colors.primary} />
            <Text style={styles.fileButtonText}>
              {selectedFile ? selectedFile.name : 'Choisir un fichier'}
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.primaryButton,
              (!selectedResidence || !selectedFile || isUploading) && styles.buttonDisabled,
            ]}
            disabled={!selectedResidence || !selectedFile || isUploading}
            onPress={uploadDocument}>
            {isUploading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.primaryButtonText}>Publier le document</Text>
            )}
          </Pressable>
        </View>

        {isLoading && (
          <View style={styles.stateCard}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.stateText}>Chargement des documents...</Text>
          </View>
        )}

        {!isLoading && !!error && (
          <View style={styles.stateCard}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={loadDocuments}>
              <Text style={styles.retryText}>Reessayer</Text>
            </Pressable>
          </View>
        )}

        {!isLoading && !error && documents.length === 0 && (
          <View style={styles.stateCard}>
            <Text style={styles.stateText}>Aucun document publie pour cette residence.</Text>
          </View>
        )}

        <View style={styles.list}>
          {documents.map((document) => (
            <Pressable
              key={document.id}
              style={styles.documentCard}
              onPress={() => openDocument(document)}>
              <View style={styles.fileIconWrap}>
                <FileText size={18} color={colors.primary} />
              </View>
              <View style={styles.documentCopy}>
                <Text style={styles.documentTitle}>{document.title}</Text>
                <Text style={styles.documentMeta}>
                  {typeLabel(document.type)} - {document.fileName}
                </Text>
              </View>
              <Download size={18} color={colors.primary} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { padding: 24, paddingBottom: 40 },
  header: { marginBottom: 16 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  backText: { color: colors.text, fontSize: 13, fontWeight: '700' },
  title: { color: colors.text, fontSize: 28, lineHeight: 34, fontWeight: '800' },
  subtitle: { marginTop: 5, color: colors.muted, fontSize: 13, fontWeight: '600' },
  uploadCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: 16,
    gap: 12,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
  sectionSubtitle: { marginTop: 3, color: colors.muted, fontSize: 12, fontWeight: '600' },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  textarea: { minHeight: 76, textAlignVertical: 'top' },
  typeRow: { gap: 8 },
  typeChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  typeChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeChipText: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  typeChipTextActive: { color: colors.white },
  fileButton: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fileButtonText: { flex: 1, color: colors.primary, fontSize: 13, fontWeight: '800' },
  primaryButton: {
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { color: colors.white, fontSize: 14, fontWeight: '800' },
  buttonDisabled: { opacity: 0.5 },
  stateCard: {
    marginTop: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: 18,
    alignItems: 'center',
    gap: 10,
  },
  stateText: { color: colors.muted, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  errorText: { color: colors.danger, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  retryButton: {
    borderRadius: 12,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  retryText: { color: colors.white, fontSize: 12, fontWeight: '800' },
  list: { marginTop: 14, gap: 10 },
  documentCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fileIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentCopy: { flex: 1 },
  documentTitle: { color: colors.text, fontSize: 14, fontWeight: '800' },
  documentMeta: { marginTop: 4, color: colors.muted, fontSize: 12, fontWeight: '600' },
});
