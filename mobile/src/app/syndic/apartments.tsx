import { router, useFocusEffect } from 'expo-router';
import { Building2, ChevronLeft, Home, Pencil, Plus, Power, Trash2, X } from 'lucide-react-native';
import { useCallback, useState } from 'react';
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
import { useAuth } from '@/hooks/use-auth';
import {
  formatSyndicResidenceAddress,
  useSelectedSyndicResidence,
} from '@/hooks/use-selected-syndic-residence';
import { ApiError } from '@/lib/api/client';
import {
  createSyndicApartment,
  deleteSyndicApartment,
  getSyndicApartment,
  getSyndicApartments,
  SyndicApartment,
  updateSyndicApartment,
  updateSyndicApartmentStatus,
} from '@/services/syndic-apartments-service';

type ModalMode = 'create' | 'details' | 'edit';

function formatCurrency(value: number | null) {
  if (value === null) return '-';
  return `${value.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} MAD`;
}

function optionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function countLabel(value: number | undefined) {
  return value === undefined ? '-' : value.toLocaleString('fr-FR');
}

export default function SyndicApartmentsScreen() {
  const { token } = useAuth();
  const {
    selectedResidence,
    isLoading: isResidenceLoading,
    error: residenceError,
  } = useSelectedSyndicResidence();
  const [apartments, setApartments] = useState<SyndicApartment[]>([]);
  const [selectedApartment, setSelectedApartment] = useState<SyndicApartment | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>('details');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [number, setNumber] = useState('');
  const [floor, setFloor] = useState('');
  const [block, setBlock] = useState('');
  const [monthlyFee, setMonthlyFee] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');

  const resetForm = () => {
    setNumber('');
    setFloor('');
    setBlock('');
    setMonthlyFee('');
    setFormError('');
  };

  const fillForm = (apartment: SyndicApartment) => {
    setNumber(apartment.number);
    setFloor(apartment.floor === null ? '' : String(apartment.floor));
    setBlock(apartment.block ?? '');
    setMonthlyFee(apartment.monthlyFee === null ? '' : String(apartment.monthlyFee));
    setFormError('');
  };

  const loadApartments = useCallback(async () => {
    if (!token || !selectedResidence) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const data = await getSyndicApartments(token, selectedResidence.id);
      setApartments(data);
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : 'Impossible de charger les appartements.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedResidence, token]);

  useFocusEffect(
    useCallback(() => {
      loadApartments();
    }, [loadApartments]),
  );

  const openCreateModal = () => {
    resetForm();
    setSelectedApartment(null);
    setModalMode('create');
    setIsModalVisible(true);
  };

  const openDetailsModal = async (apartment: SyndicApartment) => {
    setSelectedApartment(apartment);
    setModalMode('details');
    setIsModalVisible(true);

    if (!token || !selectedResidence) return;
    setIsDetailsLoading(true);
    try {
      const details = await getSyndicApartment(token, selectedResidence.id, apartment.id);
      setSelectedApartment(details);
    } catch (err: unknown) {
      setFormError(err instanceof ApiError ? err.message : 'Impossible de charger le detail.');
    } finally {
      setIsDetailsLoading(false);
    }
  };

  const closeModal = () => {
    setIsModalVisible(false);
    setSelectedApartment(null);
    resetForm();
  };

  const handleCreate = async () => {
    if (!token || !selectedResidence || isSubmitting) return;
    if (!number.trim()) {
      setFormError('Le numero est obligatoire.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      await createSyndicApartment(token, selectedResidence.id, {
        number: number.trim(),
        floor: optionalNumber(floor),
        block: block.trim() || undefined,
        monthlyFee: optionalNumber(monthlyFee),
      });
      closeModal();
      await loadApartments();
    } catch (err: unknown) {
      setFormError(err instanceof ApiError ? err.message : 'Impossible de creer l appartement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!token || !selectedResidence || !selectedApartment || isSubmitting) return;
    if (!number.trim()) {
      setFormError('Le numero est obligatoire.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      const updated = await updateSyndicApartment(token, selectedResidence.id, selectedApartment.id, {
        number: number.trim(),
        floor: optionalNumber(floor),
        block: block.trim() || undefined,
        monthlyFee: optionalNumber(monthlyFee),
      });
      setSelectedApartment(updated);
      setModalMode('details');
      await loadApartments();
    } catch (err: unknown) {
      setFormError(err instanceof ApiError ? err.message : 'Impossible de modifier l appartement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmStatusChange = () => {
    if (!selectedApartment) return;
    const nextActive = !selectedApartment.isActive;
    Alert.alert(
      nextActive ? 'Activer l’appartement' : 'Désactiver l’appartement',
      nextActive
        ? 'Voulez-vous activer cet appartement ?'
        : 'Voulez-vous desactiver cet appartement ? Les donnees liees seront conservees.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: nextActive ? 'Activer' : 'Désactiver',
          style: nextActive ? 'default' : 'destructive',
          onPress: () => handleStatusChange(nextActive),
        },
      ],
    );
  };

  const handleStatusChange = async (isActive: boolean) => {
    if (!token || !selectedResidence || !selectedApartment || isSubmitting) return;
    setIsSubmitting(true);
    setFormError('');

    try {
      const updated = await updateSyndicApartmentStatus(
        token,
        selectedResidence.id,
        selectedApartment.id,
        isActive,
      );
      setSelectedApartment(updated);
      await loadApartments();
    } catch (err: unknown) {
      setFormError(err instanceof ApiError ? err.message : 'Impossible de changer le statut.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      'Supprimer appartement',
      'La suppression est securisee: l appartement sera desactive, pas supprime physiquement.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Désactiver',
          style: 'destructive',
          onPress: handleDelete,
        },
      ],
    );
  };

  const handleDelete = async () => {
    if (!token || !selectedResidence || !selectedApartment || isSubmitting) return;
    setIsSubmitting(true);
    setFormError('');

    try {
      const updated = await deleteSyndicApartment(token, selectedResidence.id, selectedApartment.id);
      setSelectedApartment(updated);
      await loadApartments();
    } catch (err: unknown) {
      setFormError(err instanceof ApiError ? err.message : 'Impossible de supprimer l appartement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEdit = () => {
    if (!selectedApartment) return;
    fillForm(selectedApartment);
    setModalMode('edit');
  };

  const showLoading = isLoading || isResidenceLoading;
  const shownError = error || residenceError;
  const isFormMode = modalMode === 'create' || modalMode === 'edit';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable style={styles.backRow} onPress={() => router.replace('/syndic/dashboard')}>
            <ChevronLeft size={18} color="#111827" />
            <Text style={styles.backText}>Retour</Text>
          </Pressable>
          <View style={styles.titleRow}>
            <View style={styles.titleWrap}>
              <Text style={styles.title}>Appartements</Text>
              <Text style={styles.subtitle}>
                {selectedResidence
                  ? `${selectedResidence.name} - ${formatSyndicResidenceAddress(selectedResidence)}`
                  : 'Sélectionnez une résidence active'}
              </Text>
            </View>
            <Pressable
              style={[styles.addButton, !selectedResidence && styles.buttonDisabled]}
              disabled={!selectedResidence}
              onPress={openCreateModal}>
              <Plus size={18} color="#FFFFFF" strokeWidth={2.4} />
              <Text style={styles.addButtonText}>Nouvel appartement</Text>
            </Pressable>
          </View>
        </View>

        {showLoading && (
          <View style={styles.stateCard}>
            <ActivityIndicator color="#18A7A0" />
            <Text style={styles.stateText}>Chargement des appartements...</Text>
          </View>
        )}

        {!showLoading && !!shownError && (
          <View style={styles.stateCard}>
            <Text style={styles.errorText}>{shownError}</Text>
            <Pressable style={styles.retryButton} onPress={loadApartments}>
              <Text style={styles.retryText}>Réessayer</Text>
            </Pressable>
          </View>
        )}

        {!showLoading && !shownError && !selectedResidence && (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>Aucune résidence active</Text>
            <Text style={styles.stateText}>Sélectionnez une résidence avant de gérer les appartements.</Text>
          </View>
        )}

        {!showLoading && !shownError && selectedResidence && apartments.length === 0 && (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>Aucun appartement</Text>
            <Text style={styles.stateText}>Ajoutez le premier appartement de cette résidence.</Text>
          </View>
        )}

        {!showLoading && !shownError && apartments.length > 0 && (
          <View style={styles.grid}>
            {apartments.map((apartment) => (
              <Pressable
                key={apartment.id}
                style={styles.card}
                onPress={() => router.push(`/syndic/apartments/${apartment.id}` as never)}>
                <View style={styles.cardHeader}>
                  <View style={styles.iconWrap}>
                    <Home size={20} color="#18A7A0" strokeWidth={2.2} />
                  </View>
                  <Text style={[styles.statusText, apartment.isActive ? styles.active : styles.inactive]}>
                    {apartment.isActive ? 'Actif' : 'Inactif'}
                  </Text>
                </View>
                <Text style={styles.cardTitle}>Appartement {apartment.number}</Text>
                <View style={styles.metaRow}>
                  <Text style={styles.metaText}>
                    {apartment.floor === null ? 'Étage -' : `Étage ${apartment.floor}`}
                  </Text>
                  <Text style={styles.metaText}>{apartment.block ? `Bloc ${apartment.block}` : 'Bloc -'}</Text>
                </View>
                <Text style={styles.feeText}>Cotisation: {formatCurrency(apartment.monthlyFee)}</Text>
                <Text style={styles.tapHint}>Voir profil</Text>
              </Pressable>
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

      <Modal visible={isModalVisible} transparent animationType="fade" onRequestClose={closeModal}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {modalMode === 'create'
                  ? 'Nouvel appartement'
                  : modalMode === 'edit'
                    ? 'Modifier appartement'
                    : `Appartement ${selectedApartment?.number ?? ''}`}
              </Text>
              <Pressable style={styles.closeButton} onPress={closeModal}>
                <X size={20} color="#111827" />
              </Pressable>
            </View>

            {isDetailsLoading && (
              <View style={styles.modalState}>
                <ActivityIndicator color="#18A7A0" />
              </View>
            )}

            {!isDetailsLoading && isFormMode && (
              <View style={styles.formGrid}>
                <TextInput
                  value={number}
                  onChangeText={(value) => {
                    setNumber(value);
                    if (formError) setFormError('');
                  }}
                  placeholder="Numéro"
                  placeholderTextColor="#9CA3AF"
                  style={styles.input}
                />
                <TextInput
                  value={floor}
                  onChangeText={setFloor}
                  keyboardType="number-pad"
                  placeholder="Étage"
                  placeholderTextColor="#9CA3AF"
                  style={styles.input}
                />
                <TextInput
                  value={block}
                  onChangeText={setBlock}
                  placeholder="Bloc"
                  placeholderTextColor="#9CA3AF"
                  style={styles.input}
                />
                <TextInput
                  value={monthlyFee}
                  onChangeText={setMonthlyFee}
                  keyboardType="numeric"
                  placeholder="Cotisation mensuelle"
                  placeholderTextColor="#9CA3AF"
                  style={styles.input}
                />
              </View>
            )}

            {!isDetailsLoading && modalMode === 'details' && selectedApartment && (
              <View style={styles.detailsGrid}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Numéro</Text>
                  <Text style={styles.detailValue}>{selectedApartment.number}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Bloc</Text>
                  <Text style={styles.detailValue}>{selectedApartment.block ?? '-'}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Étage</Text>
                  <Text style={styles.detailValue}>{selectedApartment.floor ?? '-'}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Cotisation</Text>
                  <Text style={styles.detailValue}>{formatCurrency(selectedApartment.monthlyFee)}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Statut</Text>
                  <Text style={styles.detailValue}>{selectedApartment.isActive ? 'Actif' : 'Inactif'}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Résidents</Text>
                  <Text style={styles.detailValue}>
                    {countLabel(selectedApartment._count?.residentApartments)}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Paiements</Text>
                  <Text style={styles.detailValue}>{countLabel(selectedApartment._count?.payments)}</Text>
                </View>
              </View>
            )}

            {!!formError && <Text style={styles.formError}>{formError}</Text>}

            {modalMode === 'create' && (
              <Pressable
                style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]}
                disabled={isSubmitting}
                onPress={handleCreate}>
                <Text style={styles.primaryButtonText}>
                  {isSubmitting ? 'Création...' : 'Créer l’appartement'}
                </Text>
              </Pressable>
            )}

            {modalMode === 'edit' && (
              <View style={styles.actionRow}>
                <Pressable style={styles.secondaryButton} onPress={() => setModalMode('details')}>
                  <Text style={styles.secondaryButtonText}>Annuler</Text>
                </Pressable>
                <Pressable
                  style={[styles.primaryButton, styles.actionFill, isSubmitting && styles.buttonDisabled]}
                  disabled={isSubmitting}
                  onPress={handleUpdate}>
                  <Text style={styles.primaryButtonText}>
                    {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                  </Text>
                </Pressable>
              </View>
            )}

            {modalMode === 'details' && selectedApartment && (
              <View style={styles.actionsWrap}>
                <Pressable style={styles.secondaryButton} onPress={startEdit}>
                  <Pencil size={16} color="#18A7A0" />
                  <Text style={styles.secondaryButtonText}>Modifier</Text>
                </Pressable>
                <Pressable style={styles.secondaryButton} onPress={confirmStatusChange}>
                  <Power size={16} color="#18A7A0" />
                  <Text style={styles.secondaryButtonText}>
                    {selectedApartment.isActive ? 'Désactiver' : 'Activer'}
                  </Text>
                </Pressable>
                <Pressable style={styles.dangerButton} onPress={confirmDelete}>
                  <Trash2 size={16} color="#DC2626" />
                  <Text style={styles.dangerButtonText}>Supprimer</Text>
                </Pressable>
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
  content: { padding: 24, paddingBottom: 36, width: '100%', maxWidth: 980, alignSelf: 'center' },
  header: { marginBottom: 16 },
  backRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginBottom: 18 },
  backText: { marginLeft: 2, color: '#111827', fontSize: 16, fontWeight: '500' },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  titleWrap: { flex: 1 },
  title: { color: '#111827', fontSize: 28, lineHeight: 34, fontWeight: '800' },
  subtitle: { marginTop: 6, color: '#6B7280', fontSize: 14, lineHeight: 20, fontWeight: '500' },
  addButton: { minHeight: 46, borderRadius: 14, backgroundColor: '#18A7A0', paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  addButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { minHeight: 166, minWidth: 230, flexGrow: 1, flexBasis: '31%', borderRadius: 18, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF', padding: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconWrap: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#D6F3F1', alignItems: 'center', justifyContent: 'center' },
  statusText: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, fontSize: 12, fontWeight: '800' },
  active: { backgroundColor: '#DCFCE7', color: '#16A34A' },
  inactive: { backgroundColor: '#FEE2E2', color: '#DC2626' },
  cardTitle: { marginTop: 14, color: '#111827', fontSize: 17, fontWeight: '800' },
  metaRow: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metaText: { color: '#6B7280', fontSize: 13, fontWeight: '600' },
  feeText: { marginTop: 10, color: '#111827', fontSize: 14, fontWeight: '700' },
  tapHint: { marginTop: 10, color: '#18A7A0', fontSize: 12, fontWeight: '800' },
  stateCard: { minHeight: 140, borderRadius: 18, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF', padding: 18, alignItems: 'center', justifyContent: 'center', gap: 8 },
  stateTitle: { color: '#111827', fontSize: 15, fontWeight: '800', textAlign: 'center' },
  stateText: { color: '#6B7280', fontSize: 14, lineHeight: 20, fontWeight: '500', textAlign: 'center' },
  errorText: { color: '#DC2626', fontSize: 14, lineHeight: 20, fontWeight: '600', textAlign: 'center' },
  retryButton: { borderRadius: 12, backgroundColor: '#D6F3F1', paddingHorizontal: 14, paddingVertical: 8 },
  retryText: { color: '#18A7A0', fontSize: 13, fontWeight: '800' },
  footerAction: { marginTop: 16 },
  residenceButton: { height: 50, borderRadius: 14, borderWidth: 1, borderColor: '#18A7A0', backgroundColor: '#D6F3F1', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  residenceButtonText: { color: '#18A7A0', fontSize: 14, fontWeight: '800' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(17, 24, 39, 0.45)', padding: 20, alignItems: 'center', justifyContent: 'center' },
  modalCard: { width: '100%', maxWidth: 620, maxHeight: '92%', borderRadius: 18, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', padding: 18 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 },
  modalTitle: { flex: 1, color: '#111827', fontSize: 20, fontWeight: '800' },
  closeButton: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  modalState: { minHeight: 120, alignItems: 'center', justifyContent: 'center' },
  formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  input: { minWidth: 180, flexGrow: 1, flexBasis: '48%', height: 50, borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', paddingHorizontal: 14, color: '#111827', fontSize: 14, fontWeight: '600' },
  formError: { marginTop: 10, color: '#DC2626', fontSize: 13, fontWeight: '600' },
  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  detailItem: { minWidth: 150, flexGrow: 1, flexBasis: '31%', borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', padding: 12 },
  detailLabel: { color: '#6B7280', fontSize: 12, fontWeight: '700' },
  detailValue: { marginTop: 5, color: '#111827', fontSize: 15, fontWeight: '800' },
  primaryButton: { marginTop: 14, height: 50, borderRadius: 14, backgroundColor: '#18A7A0', alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  secondaryButton: { minHeight: 44, borderRadius: 14, borderWidth: 1, borderColor: '#18A7A0', backgroundColor: '#D6F3F1', paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 },
  secondaryButtonText: { color: '#18A7A0', fontSize: 13, fontWeight: '800' },
  dangerButton: { minHeight: 44, borderRadius: 14, borderWidth: 1, borderColor: '#FCA5A5', backgroundColor: '#FEE2E2', paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 },
  dangerButtonText: { color: '#DC2626', fontSize: 13, fontWeight: '800' },
  actionsWrap: { marginTop: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionRow: { marginTop: 14, flexDirection: 'row', gap: 8 },
  actionFill: { marginTop: 0, flex: 1 },
  buttonDisabled: { opacity: 0.6 },
});
