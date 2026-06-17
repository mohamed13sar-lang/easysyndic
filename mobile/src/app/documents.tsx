import { Download, FileText, Search } from 'lucide-react-native';
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
import { ResidentTabBar, useResidentTabBarInset } from '@/components/ResidentTabBar';
import { colors } from '@/constants/colors';
import { useAuth } from '@/hooks/use-auth';
import { useSelectedResidence } from '@/hooks/use-selected-residence';
import { ApiError } from '@/lib/api/client';
import {
  AppDocument,
  DocumentType,
  getDocumentSignedUrl,
  getMyDocuments,
} from '@/services/documents-service';

type FilterType = 'Tous' | 'Reglement' | 'PV' | 'Factures' | 'Contrats' | 'Autres';

const typeLabels: Record<DocumentType, FilterType> = {
  ASSEMBLEE_GENERALE: 'PV',
  PV: 'PV',
  FACTURE: 'Factures',
  TRAVAUX: 'Autres',
  CONTRAT: 'Contrats',
  GENERAL: 'Reglement',
};

export default function DocumentsScreen() {
  const { token } = useAuth();
  const { selectedResidence } = useSelectedResidence();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('Tous');
  const [documents, setDocuments] = useState<AppDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const tabBarInset = useResidentTabBarInset();

  const loadDocuments = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError('');
    try {
      const data = await getMyDocuments(token, selectedResidence?.id);
      setDocuments(data);
    } catch (err: unknown) {
      setError(
        err instanceof ApiError ? err.message : 'Impossible de charger les documents.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [selectedResidence?.id, token]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const filteredDocuments = useMemo(() => {
    const term = search.trim().toLowerCase();
    return documents.filter((doc) => {
      const label = typeLabels[doc.type] ?? 'Autres';
      const byFilter = activeFilter === 'Tous' || label === activeFilter;
      const bySearch =
        term.length === 0 ||
        doc.title.toLowerCase().includes(term) ||
        label.toLowerCase().includes(term);
      return byFilter && bySearch;
    });
  }, [activeFilter, documents, search]);

  const typeStyle = (type: string) => {
    if (type === 'Reglement') return { bg: colors.blueLight, color: colors.blue };
    if (type === 'PV') return { bg: colors.purpleLight, color: colors.purple };
    if (type === 'Factures') return { bg: colors.warningLight, color: colors.warning };
    return { bg: colors.successLight, color: colors.success };
  };

  const formatSize = (size: number) => {
    if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    if (size >= 1024) return `${Math.round(size / 1024)} KB`;
    return `${size} B`;
  };

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value));

  const openDocument = async (doc: AppDocument) => {
    if (!token) return;
    try {
      const { url } = await getDocumentSignedUrl(token, doc.id);
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
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: tabBarInset + 24 }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Documents</Text>
          <Text style={styles.subtitle}>Vos fichiers importants</Text>
        </View>

        <View style={styles.searchBox}>
          <Search size={18} color={colors.muted} strokeWidth={2.1} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Rechercher un document..."
            placeholderTextColor="#9CA3AF"
            style={styles.searchInput}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}>
          {(['Tous', 'Reglement', 'PV', 'Factures', 'Contrats', 'Autres'] as FilterType[]).map((chip) => {
            const active = chip === activeFilter;
            return (
              <Pressable
                key={chip}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setActiveFilter(chip)}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{chip}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

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

        <View style={styles.list}>
          {!isLoading &&
            !error &&
            filteredDocuments.map((doc) => {
              const label = typeLabels[doc.type] ?? 'Autres';
              const style = typeStyle(label);
              return (
                <Pressable key={doc.id} style={styles.card} onPress={() => openDocument(doc)}>
                  <View style={styles.cardLeft}>
                    <View style={styles.fileIconWrap}>
                      <FileText size={18} color={colors.primary} strokeWidth={2.1} />
                    </View>
                    <View style={styles.cardTextBlock}>
                      <Text style={styles.cardTitle}>{doc.title}</Text>
                      <View style={styles.metaRow}>
                        <View style={[styles.typePill, { backgroundColor: style.bg }]}>
                          <Text style={[styles.typePillText, { color: style.color }]}>{label}</Text>
                        </View>
                        <Text style={styles.metaText}>{formatDate(doc.createdAt)}</Text>
                        <Text style={styles.metaText}>{formatSize(doc.size)}</Text>
                      </View>
                    </View>
                  </View>
                  <Pressable style={styles.downloadButton} onPress={() => openDocument(doc)}>
                    <Download size={16} color={colors.primary} strokeWidth={2.2} />
                  </Pressable>
                </Pressable>
              );
            })}

          {!isLoading && !error && filteredDocuments.length === 0 && (
            <View style={styles.stateCard}>
              <Text style={styles.stateText}>Aucun document disponible.</Text>
            </View>
          )}
        </View>

        <View style={styles.spacer} />
      </ScrollView>

      <ResidentTabBar active="documents" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  header: {
    marginBottom: 14,
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
  searchBox: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
  },
  chipsRow: {
    paddingTop: 12,
    paddingBottom: 6,
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  chipText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: colors.white,
  },
  list: {
    marginTop: 8,
    gap: 10,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    paddingRight: 10,
  },
  fileIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTextBlock: {
    flex: 1,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  metaRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flexWrap: 'wrap',
  },
  typePill: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  typePillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  metaText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '500',
  },
  downloadButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateCard: {
    marginTop: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: 18,
    alignItems: 'center',
    gap: 10,
  },
  stateText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  retryButton: {
    borderRadius: 12,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  retryText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '800',
  },
  spacer: {
    height: 8,
  },
});
