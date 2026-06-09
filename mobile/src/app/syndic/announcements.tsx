import { router, useFocusEffect } from 'expo-router';
import {
  AlertTriangle,
  BellRing,
  CalendarDays,
  ChevronLeft,
  Edit3,
  Megaphone,
  Plus,
  Trash2,
} from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  Announcement,
  AnnouncementPriority,
  AnnouncementType,
} from '@/services/announcements-service';
import {
  createSyndicAnnouncement,
  deleteSyndicAnnouncement,
  getSyndicAnnouncements,
  updateSyndicAnnouncement,
} from '@/services/syndic-announcements-service';
import { useAuth } from '@/hooks/use-auth';
import {
  formatSyndicResidenceAddress,
  useSelectedSyndicResidence,
} from '@/hooks/use-selected-syndic-residence';
import { ApiError } from '@/lib/api/client';

const accent = '#0F766E';
const accentSoft = '#E6F4F1';
const textPrimary = '#111827';
const textSecondary = '#6B7280';
const border = '#E5E7EB';

const typeOptions: { value: AnnouncementType; label: string }[] = [
  { value: 'ASSEMBLEE_GENERALE', label: 'Assemblée générale' },
  { value: 'DECES', label: 'Décès' },
  { value: 'COUPURE_ELECTRICITE', label: "Coupure d'électricité" },
  { value: 'COUPURE_EAU', label: "Coupure d'eau" },
  { value: 'TRAVAUX', label: 'Travaux' },
  { value: 'NETTOYAGE', label: 'Nettoyage' },
  { value: 'SECURITE', label: 'Sécurité' },
  { value: 'AUTRE', label: 'Autre' },
];

const priorityOptions: { value: AnnouncementPriority; label: string }[] = [
  { value: 'NORMAL', label: 'Normal' },
  { value: 'IMPORTANT', label: 'Important' },
  { value: 'URGENT', label: 'Urgent' },
];

type FormState = {
  id?: string;
  title: string;
  message: string;
  type: AnnouncementType;
  priority: AnnouncementPriority;
  expiresAt: string;
};

const initialForm: FormState = {
  title: '',
  message: '',
  type: 'AUTRE',
  priority: 'NORMAL',
  expiresAt: '',
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function getTypeLabel(type: AnnouncementType) {
  return typeOptions.find((option) => option.value === type)?.label ?? 'Annonce';
}

function getPriorityLabel(priority: AnnouncementPriority) {
  return priorityOptions.find((option) => option.value === priority)?.label ?? priority;
}

export default function SyndicAnnouncementsScreen() {
  const { token } = useAuth();
  const {
    selectedResidence,
    isLoading: isResidenceLoading,
    error: residenceError,
  } = useSelectedSyndicResidence();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState<FormState>(initialForm);

  const stats = useMemo(
    () => ({
      total: announcements.length,
      urgent: announcements.filter((item) => item.priority === 'URGENT').length,
      important: announcements.filter((item) => item.priority === 'IMPORTANT').length,
    }),
    [announcements],
  );

  const loadAnnouncements = useCallback(async () => {
    if (!token || !selectedResidence) {
      setAnnouncements([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const data = await getSyndicAnnouncements(token, selectedResidence.id);
      setAnnouncements(data);
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : 'Impossible de charger les annonces.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedResidence, token]);

  useFocusEffect(
    useCallback(() => {
      loadAnnouncements();
    }, [loadAnnouncements]),
  );

  const openCreate = () => {
    if (!selectedResidence) {
      Alert.alert(
        'Residence requise',
        'Selectionnez une residence avant de publier une annonce.',
      );
      return;
    }
    setForm(initialForm);
    setModalVisible(true);
  };

  const openEdit = (item: Announcement) => {
    setForm({
      id: item.id,
      title: item.title,
      message: item.message,
      type: item.type,
      priority: item.priority,
      expiresAt: item.expiresAt ? item.expiresAt.slice(0, 10) : '',
    });
    setModalVisible(true);
  };

  const saveAnnouncement = async () => {
    if (!token || !selectedResidence || isSaving) return;
    if (form.title.trim().length < 3 || form.message.trim().length < 3) {
      Alert.alert('Annonce incomplète', 'Ajoutez un titre et un message.');
      return;
    }

    setIsSaving(true);
    try {
      const expiresAt = form.expiresAt.trim();
      if (
        expiresAt &&
        (!/^\d{4}-\d{2}-\d{2}$/.test(expiresAt) ||
          Number.isNaN(new Date(expiresAt).getTime()))
      ) {
        Alert.alert(
          'Date invalide',
          'Utilisez le format YYYY-MM-DD pour la date d expiration, par exemple 2026-12-31.',
        );
        return;
      }
      if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) {
        Alert.alert(
          'Date invalide',
          'La date d expiration doit etre dans le futur.',
        );
        return;
      }

      const payload = {
        title: form.title.trim(),
        message: form.message.trim(),
        type: form.type,
        priority: form.priority,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      };

      if (form.id) {
        await updateSyndicAnnouncement(token, selectedResidence.id, form.id, payload);
      } else {
        await createSyndicAnnouncement(token, selectedResidence.id, payload);
      }

      setModalVisible(false);
      await loadAnnouncements();
      Alert.alert(
        'Annonce publiee',
        form.id
          ? 'Les modifications ont ete enregistrees.'
          : 'Les residents recevront une notification.',
      );
    } catch (err: unknown) {
      Alert.alert(
        'Erreur',
        err instanceof ApiError ? err.message : "Impossible d'enregistrer l'annonce.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = (item: Announcement) => {
    if (!token || !selectedResidence) return;

    Alert.alert(
      'Supprimer l’annonce',
      'Cette annonce sera désactivée pour les résidents.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSyndicAnnouncement(token, selectedResidence.id, item.id);
              await loadAnnouncements();
            } catch (err: unknown) {
              Alert.alert(
                'Erreur',
                err instanceof ApiError ? err.message : 'Suppression impossible.',
              );
            }
          },
        },
      ],
    );
  };

  const showLoading = isLoading || isResidenceLoading;
  const shownError = error || residenceError;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.replace('/syndic/dashboard')}>
            <ChevronLeft size={18} color={textPrimary} />
            <Text style={styles.backText}>Tableau de bord</Text>
          </Pressable>
          <View style={styles.headerRow}>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>Communication</Text>
              <Text style={styles.title}>Annonces</Text>
              <Text style={styles.subtitle}>
                {selectedResidence
                  ? `${selectedResidence.name} - ${formatSyndicResidenceAddress(selectedResidence)}`
                  : 'Sélectionnez une résidence pour publier des annonces.'}
              </Text>
            </View>
            <Pressable style={styles.primaryButton} onPress={openCreate}>
              <Plus size={18} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Nouvelle annonce</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Megaphone size={19} color={accent} />
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Annonces actives</Text>
          </View>
          <View style={styles.statCard}>
            <BellRing size={19} color={accent} />
            <Text style={styles.statValue}>{stats.important}</Text>
            <Text style={styles.statLabel}>Importantes</Text>
          </View>
          <View style={styles.statCard}>
            <AlertTriangle size={19} color="#B91C1C" />
            <Text style={styles.statValue}>{stats.urgent}</Text>
            <Text style={styles.statLabel}>Urgentes</Text>
          </View>
        </View>

        {showLoading && (
          <View style={styles.stateCard}>
            <ActivityIndicator color={accent} />
            <Text style={styles.stateText}>Chargement des annonces...</Text>
          </View>
        )}

        {!showLoading && !!shownError && (
          <View style={styles.stateCard}>
            <Text style={styles.errorText}>{shownError}</Text>
            <Pressable style={styles.secondaryButton} onPress={loadAnnouncements}>
              <Text style={styles.secondaryButtonText}>Réessayer</Text>
            </Pressable>
          </View>
        )}

        {!showLoading && !shownError && announcements.length === 0 && (
          <View style={styles.stateCard}>
            <Megaphone size={26} color={accent} />
            <Text style={styles.stateTitle}>Aucune annonce</Text>
            <Text style={styles.stateText}>
              Publiez une information pour les résidents de la résidence sélectionnée.
            </Text>
            <Pressable style={styles.secondaryButton} onPress={openCreate}>
              <Text style={styles.secondaryButtonText}>Créer une annonce</Text>
            </Pressable>
          </View>
        )}

        {!showLoading &&
          !shownError &&
          announcements.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.cardIcon}>
                  <Megaphone size={18} color={accent} />
                </View>
                <View style={styles.cardCopy}>
                  <Text style={styles.typeLabel}>{getTypeLabel(item.type)}</Text>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                </View>
                <View
                  style={[
                    styles.priorityBadge,
                    item.priority === 'URGENT' && styles.priorityUrgent,
                  ]}>
                  <Text
                    style={[
                      styles.priorityText,
                      item.priority === 'URGENT' && styles.priorityTextUrgent,
                    ]}>
                    {getPriorityLabel(item.priority)}
                  </Text>
                </View>
              </View>
              <Text style={styles.cardMessage} numberOfLines={3}>
                {item.message}
              </Text>
              <View style={styles.cardFooter}>
                <View style={styles.dateRow}>
                  <CalendarDays size={15} color={textSecondary} />
                  <Text style={styles.dateText}>Publié le {formatDate(item.publishAt)}</Text>
                </View>
                <View style={styles.actionRow}>
                  <Pressable style={styles.iconButton} onPress={() => openEdit(item)}>
                    <Edit3 size={16} color={accent} />
                  </Pressable>
                  <Pressable style={styles.iconButtonDanger} onPress={() => confirmDelete(item)}>
                    <Trash2 size={16} color="#B91C1C" />
                  </Pressable>
                </View>
              </View>
            </View>
          ))}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{form.id ? 'Modifier annonce' : 'Nouvelle annonce'}</Text>
            <TextInput
              style={styles.input}
              value={form.title}
              onChangeText={(title) => setForm((prev) => ({ ...prev, title }))}
              placeholder="Titre"
              placeholderTextColor="#9CA3AF"
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              value={form.message}
              onChangeText={(message) => setForm((prev) => ({ ...prev, message }))}
              placeholder="Message"
              placeholderTextColor="#9CA3AF"
              multiline
            />

            <Text style={styles.formLabel}>Type</Text>
            <View style={styles.chipGrid}>
              {typeOptions.map((option) => (
                <Pressable
                  key={option.value}
                  style={[styles.chip, form.type === option.value && styles.chipActive]}
                  onPress={() => setForm((prev) => ({ ...prev, type: option.value }))}>
                  <Text style={[styles.chipText, form.type === option.value && styles.chipTextActive]}>
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.formLabel}>Priorité</Text>
            <View style={styles.chipGrid}>
              {priorityOptions.map((option) => (
                <Pressable
                  key={option.value}
                  style={[styles.chip, form.priority === option.value && styles.chipActive]}
                  onPress={() => setForm((prev) => ({ ...prev, priority: option.value }))}>
                  <Text
                    style={[
                      styles.chipText,
                      form.priority === option.value && styles.chipTextActive,
                    ]}>
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <TextInput
              style={styles.input}
              value={form.expiresAt}
              onChangeText={(expiresAt) => setForm((prev) => ({ ...prev, expiresAt }))}
              placeholder="Expiration optionnelle YYYY-MM-DD"
              placeholderTextColor="#9CA3AF"
            />

            <View style={styles.modalActions}>
              <Pressable style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>Annuler</Text>
              </Pressable>
              <Pressable style={styles.saveButton} onPress={saveAnnouncement}>
                {isSaving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveText}>Enregistrer</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  content: {
    width: '100%',
    maxWidth: 1120,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
    gap: 12,
  },
  header: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: border,
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  backButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 16,
  },
  backText: {
    color: textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 14,
    flexWrap: 'wrap',
  },
  headerCopy: {
    flex: 1,
    minWidth: 240,
  },
  eyebrow: {
    color: accent,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  title: {
    marginTop: 7,
    color: textPrimary,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 6,
    color: textSecondary,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  primaryButton: {
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: accent,
    paddingHorizontal: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    minWidth: 160,
    flexGrow: 1,
    flexBasis: '31%',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: border,
    backgroundColor: '#FFFFFF',
    padding: 15,
  },
  statValue: {
    marginTop: 10,
    color: textPrimary,
    fontSize: 24,
    fontWeight: '800',
  },
  statLabel: {
    marginTop: 2,
    color: textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: border,
    backgroundColor: '#FFFFFF',
    padding: 16,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCopy: {
    flex: 1,
    minWidth: 0,
  },
  typeLabel: {
    color: accent,
    fontSize: 12,
    fontWeight: '800',
  },
  cardTitle: {
    marginTop: 4,
    color: textPrimary,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '800',
  },
  priorityBadge: {
    borderRadius: 999,
    backgroundColor: accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  priorityUrgent: {
    backgroundColor: '#FEE2E2',
  },
  priorityText: {
    color: accent,
    fontSize: 11,
    fontWeight: '800',
  },
  priorityTextUrgent: {
    color: '#B91C1C',
  },
  cardMessage: {
    marginTop: 12,
    color: textSecondary,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  cardFooter: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    color: textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonDanger: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateCard: {
    minHeight: 160,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: border,
    backgroundColor: '#FFFFFF',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  stateTitle: {
    color: textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  stateText: {
    color: textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  secondaryButton: {
    minHeight: 42,
    borderRadius: 13,
    backgroundColor: accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 15,
  },
  secondaryButtonText: {
    color: accent,
    fontSize: 13,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.35)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    maxHeight: '92%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  modalTitle: {
    color: textPrimary,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 14,
  },
  input: {
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: border,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 13,
    color: textPrimary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  textArea: {
    minHeight: 96,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  formLabel: {
    marginTop: 4,
    marginBottom: 8,
    color: textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: border,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  chipActive: {
    borderColor: accent,
    backgroundColor: accentSoft,
  },
  chipText: {
    color: textSecondary,
    fontSize: 12,
    fontWeight: '800',
  },
  chipTextActive: {
    color: accent,
  },
  modalActions: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    color: textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  saveButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
