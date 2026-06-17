import { router, useFocusEffect } from 'expo-router';
import { Bell, Building2, ChevronLeft, Plus, Send, X } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
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
  createSyndicNotification,
  getSyndicNotifications,
  SyndicNotification,
  SyndicNotificationTargetType,
  SyndicNotificationType,
} from '@/services/syndic-notifications-service';

const notificationTypes: SyndicNotificationType[] = ['GENERAL', 'TARGETED', 'SYSTEM'];
const targetTypes: SyndicNotificationTargetType[] = ['RESIDENCE'];

function formatType(type: SyndicNotificationType) {
  if (type === 'GENERAL') return 'Générale';
  if (type === 'TARGETED') return 'Ciblée';
  if (type === 'SYSTEM') return 'Système';
  if (type === 'PAYMENT_REMINDER') return 'Rappel paiement';
  if (type === 'PAYMENT_RECEIVED') return 'Paiement reçu';
  if (type === 'COMPLAINT_STATUS') return 'Réclamation';
  return 'Document';
}

function formatTarget(type: SyndicNotificationTargetType) {
  if (type === 'RESIDENCE') return 'Résidence';
  if (type === 'APARTMENT') return 'Appartement';
  if (type === 'USER') return 'Résident';
  if (type === 'NON_PAID') return 'Impayés';
  return 'Rôle';
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function SyndicNotificationsScreen() {
  const { token } = useAuth();
  const {
    selectedResidence,
    isLoading: isResidenceLoading,
    error: residenceError,
  } = useSelectedSyndicResidence();
  const [notifications, setNotifications] = useState<SyndicNotification[]>([]);
  const [selectedNotification, setSelectedNotification] = useState<SyndicNotification | null>(null);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<SyndicNotificationType>('GENERAL');
  const [targetType, setTargetType] = useState<SyndicNotificationTargetType>('RESIDENCE');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');

  const totalRecipients = useMemo(
    () => notifications.reduce((sum, item) => sum + item.recipientsCount, 0),
    [notifications],
  );

  const loadNotifications = useCallback(async () => {
    if (!token || !selectedResidence) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const data = await getSyndicNotifications(token, selectedResidence.id);
      setNotifications(data);
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : 'Impossible de charger les notifications.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedResidence, token]);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications]),
  );

  const openCreateModal = () => {
    setTitle('');
    setMessage('');
    setType('GENERAL');
    setTargetType('RESIDENCE');
    setFormError('');
    setIsCreateModalVisible(true);
  };

  const closeCreateModal = () => {
    setIsCreateModalVisible(false);
    setFormError('');
  };

  const handleCreate = async () => {
    if (!token || !selectedResidence || isSubmitting) return;
    if (title.trim().length < 3) {
      setFormError('Le titre doit contenir au moins 3 caractères.');
      return;
    }
    if (message.trim().length < 3) {
      setFormError('Le message doit contenir au moins 3 caractères.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      await createSyndicNotification(token, selectedResidence.id, {
        title: title.trim(),
        message: message.trim(),
        type,
        targetType,
      });
      closeCreateModal();
      await loadNotifications();
    } catch (err: unknown) {
      setFormError(err instanceof ApiError ? err.message : 'Impossible d’envoyer la notification.');
    } finally {
      setIsSubmitting(false);
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
          <View style={styles.titleRow}>
            <View>
              <Text style={styles.title}>Notifications</Text>
              <Text style={styles.subtitle}>
                {selectedResidence
                  ? `${selectedResidence.name} - ${formatSyndicResidenceAddress(selectedResidence)}`
                  : 'Sélectionnez une résidence active'}
              </Text>
            </View>
            <Pressable
              style={[styles.primaryAction, !selectedResidence && styles.buttonDisabled]}
              disabled={!selectedResidence}
              onPress={openCreateModal}>
              <Plus size={18} color="#FFFFFF" strokeWidth={2.4} />
              <Text style={styles.primaryActionText}>Nouvelle notification</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.totalsGrid}>
          <View style={styles.totalCard}>
            <Text style={styles.totalValue}>{notifications.length}</Text>
            <Text style={styles.totalLabel}>Notifications</Text>
          </View>
          <View style={styles.totalCard}>
            <Text style={styles.totalValue}>{totalRecipients}</Text>
            <Text style={styles.totalLabel}>Destinataires touchés</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Historique des notifications</Text>
          <Text style={styles.sectionMeta}>{notifications.length} envoi(s)</Text>
        </View>

        {showLoading && (
          <View style={styles.stateCard}>
            <ActivityIndicator color="#18A7A0" />
            <Text style={styles.stateText}>Chargement des notifications...</Text>
          </View>
        )}

        {!showLoading && !!shownError && (
          <View style={styles.stateCard}>
            <Text style={styles.errorText}>{shownError}</Text>
            <Pressable style={styles.retryButton} onPress={loadNotifications}>
              <Text style={styles.retryText}>Réessayer</Text>
            </Pressable>
          </View>
        )}

        {!showLoading && !shownError && !selectedResidence && (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>Aucune résidence active</Text>
            <Text style={styles.stateText}>Sélectionnez une résidence avant de gérer les notifications.</Text>
          </View>
        )}

        {!showLoading && !shownError && selectedResidence && notifications.length === 0 && (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>Aucune notification</Text>
            <Text style={styles.stateText}>Envoyez une première notification aux résidents.</Text>
          </View>
        )}

        {!showLoading && !shownError && notifications.length > 0 && (
          <View style={styles.grid}>
            {notifications.map((notification) => (
              <Pressable
                key={notification.id}
                style={styles.card}
                onPress={() => setSelectedNotification(notification)}>
                <View style={styles.cardHeader}>
                  <View style={styles.iconWrap}>
                    <Bell size={20} color="#18A7A0" strokeWidth={2.2} />
                  </View>
                  <Text style={styles.badge}>{formatType(notification.type)}</Text>
                </View>
                <Text style={styles.cardTitle}>{notification.title}</Text>
                <Text style={styles.messageText}>{notification.message}</Text>
                <Text style={styles.metaText}>{formatTarget(notification.targetType)}</Text>
                <Text style={styles.metaText}>{notification.recipientsCount} destinataire(s)</Text>
                <Text style={styles.dateText}>{formatDate(notification.createdAt)}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={isCreateModalVisible} transparent animationType="fade" onRequestClose={closeCreateModal}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <View style={styles.modalIconWrap}>
                  <Send size={20} color="#18A7A0" strokeWidth={2.2} />
                </View>
                <Text style={styles.modalTitle}>Nouvelle notification</Text>
              </View>
              <Pressable style={styles.closeButton} onPress={closeCreateModal}>
                <X size={20} color="#1F2328" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalContent}>
              <TextInput value={title} onChangeText={setTitle} placeholder="Titre" placeholderTextColor="#9CA3AF" style={styles.input} />
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder="Message"
                placeholderTextColor="#9CA3AF"
                style={[styles.input, styles.textArea]}
                multiline
              />

              <Text style={styles.fieldLabel}>Type</Text>
              <View style={styles.optionGrid}>
                {notificationTypes.map((item) => {
                  const selected = item === type;
                  return (
                    <Pressable
                      key={item}
                      style={[styles.smallOption, selected && styles.smallOptionSelected]}
                      onPress={() => setType(item)}>
                      <Text style={[styles.smallOptionText, selected && styles.smallOptionTextSelected]}>
                        {formatType(item)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.fieldLabel}>Cible</Text>
              <View style={styles.optionGrid}>
                {targetTypes.map((item) => {
                  const selected = item === targetType;
                  return (
                    <Pressable
                      key={item}
                      style={[styles.smallOption, selected && styles.smallOptionSelected]}
                      onPress={() => setTargetType(item)}>
                      <Text style={[styles.smallOptionText, selected && styles.smallOptionTextSelected]}>
                        {formatTarget(item)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {!!formError && <Text style={styles.formError}>{formError}</Text>}
            </ScrollView>

            <Pressable
              style={[styles.createButton, isSubmitting && styles.buttonDisabled]}
              disabled={isSubmitting}
              onPress={handleCreate}>
              <Text style={styles.createButtonText}>{isSubmitting ? 'Envoi...' : 'Envoyer la notification'}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={!!selectedNotification} transparent animationType="fade" onRequestClose={() => setSelectedNotification(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <View style={styles.modalIconWrap}>
                  <Bell size={20} color="#18A7A0" strokeWidth={2.2} />
                </View>
                <Text style={styles.modalTitle}>{selectedNotification?.title ?? 'Notification'}</Text>
              </View>
              <Pressable style={styles.closeButton} onPress={() => setSelectedNotification(null)}>
                <X size={20} color="#1F2328" />
              </Pressable>
            </View>

            {!!selectedNotification && (
              <View>
                <Text style={styles.detailMessage}>{selectedNotification.message}</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Type</Text>
                  <Text style={styles.detailValue}>{formatType(selectedNotification.type)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Cible</Text>
                  <Text style={styles.detailValue}>{formatTarget(selectedNotification.targetType)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Destinataires</Text>
                  <Text style={styles.detailValue}>{selectedNotification.recipientsCount}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Envoyée le</Text>
                  <Text style={styles.detailValue}>{formatDate(selectedNotification.createdAt)}</Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 24, paddingBottom: 36, width: '100%', maxWidth: 1040, alignSelf: 'center' },
  header: { marginBottom: 16 },
  backRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginBottom: 18 },
  backText: { marginLeft: 2, color: '#1F2328', fontSize: 16, fontWeight: '500' },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' },
  title: { color: '#1F2328', fontSize: 28, lineHeight: 34, fontWeight: '800' },
  subtitle: { marginTop: 6, color: '#6B7280', fontSize: 14, lineHeight: 20, fontWeight: '500' },
  primaryAction: { minHeight: 46, borderRadius: 14, backgroundColor: '#18A7A0', paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryActionText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  totalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  totalCard: { minHeight: 94, minWidth: 170, flexGrow: 1, flexBasis: '48%', borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF', padding: 16, boxShadow: '0 10px 26px rgba(15, 23, 42, 0.06)', elevation: 2 },
  totalValue: { color: '#1F2328', fontSize: 22, fontWeight: '800' },
  totalLabel: { marginTop: 6, color: '#6B7280', fontSize: 13, fontWeight: '700' },
  sectionHeader: { marginBottom: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  sectionTitle: { color: '#1F2328', fontSize: 17, fontWeight: '800' },
  sectionMeta: { color: '#6B7280', fontSize: 13, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { minHeight: 210, minWidth: 260, flexGrow: 1, flexBasis: '31%', borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF', padding: 16, boxShadow: '0 12px 30px rgba(15, 23, 42, 0.07)', elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconWrap: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#D6F3F1', alignItems: 'center', justifyContent: 'center' },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#D6F3F1', color: '#18A7A0', fontSize: 12, fontWeight: '800' },
  cardTitle: { marginTop: 14, color: '#1F2328', fontSize: 17, fontWeight: '800' },
  messageText: { marginTop: 8, color: '#1F2328', fontSize: 14, lineHeight: 20, fontWeight: '500' },
  metaText: { marginTop: 6, color: '#6B7280', fontSize: 13, fontWeight: '600' },
  dateText: { marginTop: 10, color: '#9CA3AF', fontSize: 12, fontWeight: '700' },
  stateCard: { minHeight: 150, borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF', padding: 18, alignItems: 'center', justifyContent: 'center', gap: 8 },
  stateTitle: { color: '#1F2328', fontSize: 15, fontWeight: '800', textAlign: 'center' },
  stateText: { color: '#6B7280', fontSize: 14, lineHeight: 20, fontWeight: '500', textAlign: 'center' },
  errorText: { color: '#DC2626', fontSize: 14, lineHeight: 20, fontWeight: '600', textAlign: 'center' },
  retryButton: { borderRadius: 12, backgroundColor: '#D6F3F1', paddingHorizontal: 14, paddingVertical: 8 },
  retryText: { color: '#18A7A0', fontSize: 13, fontWeight: '800' },
  buttonDisabled: { opacity: 0.6 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(17, 24, 39, 0.45)', padding: 20, alignItems: 'center', justifyContent: 'center' },
  modalCard: { width: '100%', maxWidth: 660, maxHeight: '92%', borderRadius: 22, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', padding: 18 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 },
  modalTitleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  modalIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#D6F3F1', alignItems: 'center', justifyContent: 'center' },
  modalTitle: { flex: 1, color: '#1F2328', fontSize: 20, fontWeight: '800' },
  closeButton: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  modalContent: { gap: 10, paddingBottom: 8 },
  input: { minHeight: 50, borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', paddingHorizontal: 14, color: '#1F2328', fontSize: 14, fontWeight: '600' },
  textArea: { minHeight: 116, paddingTop: 13, textAlignVertical: 'top' },
  fieldLabel: { marginTop: 8, marginBottom: 2, color: '#1F2328', fontSize: 13, fontWeight: '800' },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  smallOption: { minHeight: 38, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 11 },
  smallOptionSelected: { borderColor: '#18A7A0', backgroundColor: '#D6F3F1' },
  smallOptionText: { color: '#6B7280', fontSize: 12, fontWeight: '800' },
  smallOptionTextSelected: { color: '#18A7A0' },
  formError: { marginTop: 8, color: '#DC2626', fontSize: 13, fontWeight: '600' },
  createButton: { marginTop: 14, height: 50, borderRadius: 14, backgroundColor: '#18A7A0', alignItems: 'center', justifyContent: 'center' },
  createButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  detailMessage: { color: '#1F2328', fontSize: 15, lineHeight: 22, fontWeight: '600', marginBottom: 12 },
  detailRow: { borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingVertical: 11 },
  detailLabel: { color: '#6B7280', fontSize: 12, fontWeight: '700' },
  detailValue: { marginTop: 4, color: '#1F2328', fontSize: 15, fontWeight: '800' },
});
