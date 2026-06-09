import { router, useFocusEffect } from 'expo-router';
import {
  Building2,
  ChevronLeft,
  Home,
  Plus,
  UserPlus,
  Users,
  X,
} from 'lucide-react-native';
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
  getSyndicApartments,
  SyndicApartment,
} from '@/services/syndic-apartments-service';
import {
  assignSyndicResidentApartment,
  createSyndicResident,
  getSyndicResidents,
  ResidentType,
  SyndicResident,
  SyndicResidentApartment,
} from '@/services/syndic-residents-service';

type ModalMode = 'create' | 'details' | 'reassign';

function getApartmentLabel(apartment?: SyndicApartment) {
  if (!apartment) return 'Appartement -';
  return [
    `Appartement ${apartment.number}`,
    apartment.floor === null ? null : `Étage ${apartment.floor}`,
    apartment.block ? `Bloc ${apartment.block}` : null,
  ]
    .filter(Boolean)
    .join(' - ');
}

function getPrimaryLink(resident: SyndicResident) {
  return (
    resident.residentApartments.find((link) => link.isPrimary && link.isActive) ??
    resident.residentApartments.find((link) => link.isActive) ??
    resident.residentApartments[0] ??
    null
  );
}

function formatResidentType(type?: ResidentType) {
  if (type === 'OWNER') return 'Propriétaire';
  if (type === 'TENANT') return 'Locataire';
  return '-';
}

export default function SyndicResidentsScreen() {
  const { token } = useAuth();
  const {
    selectedResidence,
    isLoading: isResidenceLoading,
    error: residenceError,
  } = useSelectedSyndicResidence();
  const [residents, setResidents] = useState<SyndicResident[]>([]);
  const [apartments, setApartments] = useState<SyndicApartment[]>([]);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [apartmentId, setApartmentId] = useState('');
  const [residentType, setResidentType] = useState<ResidentType>('OWNER');
  const [isPrimary, setIsPrimary] = useState(true);
  const [selectedResident, setSelectedResident] = useState<SyndicResident | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>('details');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');

  const apartmentById = useMemo(
    () => new Map(apartments.map((apartment) => [apartment.id, apartment])),
    [apartments],
  );

  const loadResidents = useCallback(async () => {
    if (!token || !selectedResidence) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const [residentsData, apartmentsData] = await Promise.all([
        getSyndicResidents(token, selectedResidence.id),
        getSyndicApartments(token, selectedResidence.id),
      ]);
      setResidents(residentsData);
      setApartments(apartmentsData);
      setApartmentId((current) => current || apartmentsData[0]?.id || '');
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : 'Impossible de charger les résidents.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedResidence, token]);

  useFocusEffect(
    useCallback(() => {
      loadResidents();
    }, [loadResidents]),
  );

  const resetForm = () => {
    setFullName('');
    setPhone('');
    setEmail('');
    setResidentType('OWNER');
    setIsPrimary(true);
    setFormError('');
  };

  const openCreateModal = () => {
    resetForm();
    setApartmentId(apartments[0]?.id || '');
    setSelectedResident(null);
    setModalMode('create');
    setIsModalVisible(true);
  };

  const openDetailsModal = (resident: SyndicResident) => {
    const link = getPrimaryLink(resident);
    setSelectedResident(resident);
    setApartmentId(link?.apartmentId ?? apartments[0]?.id ?? '');
    setResidentType(link?.residentType ?? 'OWNER');
    setIsPrimary(link?.isPrimary ?? true);
    setFormError('');
    setModalMode('details');
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setIsModalVisible(false);
    setFormError('');
    setSelectedResident(null);
  };

  const handleCreate = async () => {
    if (!token || !selectedResidence || isSubmitting) return;
    if (!fullName.trim()) {
      setFormError('Le nom complet est obligatoire.');
      return;
    }
    if (!phone.trim()) {
      setFormError('Le téléphone est obligatoire.');
      return;
    }
    if (!apartmentId) {
      setFormError('Sélectionnez un appartement.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      await createSyndicResident(token, selectedResidence.id, {
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        apartmentId,
        residentType,
        isPrimary,
      });
      closeModal();
      resetForm();
      await loadResidents();
    } catch (err: unknown) {
      setFormError(err instanceof ApiError ? err.message : 'Impossible de créer le résident.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReassign = async () => {
    if (!token || !selectedResidence || !selectedResident || isSubmitting) return;
    if (!apartmentId) {
      setFormError('Sélectionnez un appartement.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      await assignSyndicResidentApartment(token, selectedResidence.id, selectedResident.id, {
        apartmentId,
        residentType,
        isPrimary,
      });
      setModalMode('details');
      await loadResidents();
    } catch (err: unknown) {
      setFormError(err instanceof ApiError ? err.message : 'Impossible de réassigner ce résident.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const showLoading = isLoading || isResidenceLoading;
  const shownError = error || residenceError;
  const selectedLink = selectedResident ? getPrimaryLink(selectedResident) : null;
  const selectedApartment = selectedLink ? apartmentById.get(selectedLink.apartmentId) : undefined;

  const renderApartmentOptions = () => (
    <View style={styles.optionGrid}>
      {apartments.map((apartment) => {
        const selected = apartment.id === apartmentId;
        return (
          <Pressable
            key={apartment.id}
            style={[styles.optionButton, selected && styles.optionButtonSelected]}
            onPress={() => setApartmentId(apartment.id)}>
            <Home size={16} color={selected ? '#FFFFFF' : '#18A7A0'} strokeWidth={2.2} />
            <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
              {getApartmentLabel(apartment)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  const renderResidentTypeOptions = () => (
    <View style={styles.segmentRow}>
      {(['OWNER', 'TENANT'] as ResidentType[]).map((type) => {
        const selected = residentType === type;
        return (
          <Pressable
            key={type}
            style={[styles.segmentButton, selected && styles.segmentButtonSelected]}
            onPress={() => setResidentType(type)}>
            <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>
              {formatResidentType(type)}
            </Text>
          </Pressable>
        );
      })}
      <Pressable
        style={[styles.primaryToggle, isPrimary && styles.primaryToggleSelected]}
        onPress={() => setIsPrimary((value) => !value)}>
        <Text style={[styles.primaryText, isPrimary && styles.primaryTextSelected]}>Principal</Text>
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable style={styles.backRow} onPress={() => router.replace('/syndic/dashboard')}>
            <ChevronLeft size={18} color="#111827" />
            <Text style={styles.backText}>Retour</Text>
          </Pressable>
          <View style={styles.titleRow}>
            <View>
              <Text style={styles.title}>Résidents</Text>
              <Text style={styles.subtitle}>
                {selectedResidence
                  ? `${selectedResidence.name} - ${formatSyndicResidenceAddress(selectedResidence)}`
                  : 'Sélectionnez une résidence active'}
              </Text>
            </View>
            <Pressable
              style={[styles.primaryAction, (!selectedResidence || apartments.length === 0) && styles.buttonDisabled]}
              disabled={!selectedResidence || apartments.length === 0}
              onPress={openCreateModal}>
              <Plus size={18} color="#FFFFFF" strokeWidth={2.4} />
              <Text style={styles.primaryActionText}>Nouveau résident</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Gestion des résidents</Text>
          <Text style={styles.sectionMeta}>{residents.length} résident(s)</Text>
        </View>

        {showLoading && (
          <View style={styles.stateCard}>
            <ActivityIndicator color="#18A7A0" />
            <Text style={styles.stateText}>Chargement des résidents...</Text>
          </View>
        )}

        {!showLoading && !!shownError && (
          <View style={styles.stateCard}>
            <Text style={styles.errorText}>{shownError}</Text>
            <Pressable style={styles.retryButton} onPress={loadResidents}>
              <Text style={styles.retryText}>Réessayer</Text>
            </Pressable>
          </View>
        )}

        {!showLoading && !shownError && !selectedResidence && (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>Aucune résidence active</Text>
            <Text style={styles.stateText}>Sélectionnez une résidence avant de gérer les résidents.</Text>
          </View>
        )}

        {!showLoading && !shownError && selectedResidence && apartments.length === 0 && (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>Aucun appartement</Text>
            <Text style={styles.stateText}>Créez un appartement avant d’ajouter un résident.</Text>
          </View>
        )}

        {!showLoading && !shownError && selectedResidence && apartments.length > 0 && residents.length === 0 && (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>Aucun résident</Text>
            <Text style={styles.stateText}>Ajoutez le premier résident de cette résidence.</Text>
          </View>
        )}

        {!showLoading && !shownError && residents.length > 0 && (
          <View style={styles.grid}>
            {residents.map((resident) => {
              const primaryLink = getPrimaryLink(resident);
              const apartment = primaryLink ? apartmentById.get(primaryLink.apartmentId) : undefined;

              return (
                <Pressable key={resident.id} style={styles.card} onPress={() => openDetailsModal(resident)}>
                  <View style={styles.cardHeader}>
                    <View style={styles.iconWrap}>
                      <Users size={20} color="#18A7A0" strokeWidth={2.2} />
                    </View>
                    <Text style={[styles.statusText, resident.isActive ? styles.active : styles.inactive]}>
                      {resident.isActive ? 'Actif' : 'Inactif'}
                    </Text>
                  </View>
                  <Text style={styles.cardTitle}>{resident.fullName}</Text>
                  <Text style={styles.metaText}>{resident.phone}</Text>
                  {!!resident.email && <Text style={styles.metaText}>{resident.email}</Text>}
                  <Text style={styles.apartmentText}>{getApartmentLabel(apartment)}</Text>
                  {!!primaryLink && (
                    <Text style={styles.typeText}>
                      {formatResidentType(primaryLink.residentType)}
                      {primaryLink.isPrimary ? ' - Principal' : ''}
                    </Text>
                  )}
                </Pressable>
              );
            })}
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
              <View style={styles.modalTitleRow}>
                <View style={styles.modalIconWrap}>
                  {modalMode === 'create' ? (
                    <UserPlus size={20} color="#18A7A0" strokeWidth={2.2} />
                  ) : (
                    <Users size={20} color="#18A7A0" strokeWidth={2.2} />
                  )}
                </View>
                <Text style={styles.modalTitle}>
                  {modalMode === 'create'
                    ? 'Nouveau résident'
                    : modalMode === 'reassign'
                      ? 'Réassigner l’appartement'
                      : selectedResident?.fullName ?? 'Détail résident'}
                </Text>
              </View>
              <Pressable style={styles.closeButton} onPress={closeModal}>
                <X size={20} color="#111827" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalContent}>
              {modalMode === 'create' && (
                <>
                  <TextInput value={fullName} onChangeText={setFullName} placeholder="Nom complet" placeholderTextColor="#9CA3AF" style={styles.input} />
                  <TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="Téléphone" placeholderTextColor="#9CA3AF" style={styles.input} />
                  <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="Email optionnel" placeholderTextColor="#9CA3AF" style={styles.input} />
                  <Text style={styles.fieldLabel}>Appartement</Text>
                  {renderApartmentOptions()}
                  <Text style={styles.fieldLabel}>Type</Text>
                  {renderResidentTypeOptions()}
                </>
              )}

              {modalMode === 'details' && selectedResident && (
                <>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Nom complet</Text>
                    <Text style={styles.detailValue}>{selectedResident.fullName}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Téléphone</Text>
                    <Text style={styles.detailValue}>{selectedResident.phone}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Email</Text>
                    <Text style={styles.detailValue}>{selectedResident.email ?? '-'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Appartement</Text>
                    <Text style={styles.detailValue}>{getApartmentLabel(selectedApartment)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Type</Text>
                    <Text style={styles.detailValue}>{formatResidentType(selectedLink?.residentType)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Statut</Text>
                    <Text style={styles.detailValue}>{selectedResident.isActive ? 'Actif' : 'Inactif'}</Text>
                  </View>
                </>
              )}

              {modalMode === 'reassign' && (
                <>
                  <Text style={styles.fieldLabel}>Appartement</Text>
                  {renderApartmentOptions()}
                  <Text style={styles.fieldLabel}>Type</Text>
                  {renderResidentTypeOptions()}
                </>
              )}

              {!!formError && <Text style={styles.formError}>{formError}</Text>}
            </ScrollView>

            {modalMode === 'create' && (
              <Pressable
                style={[styles.createButton, isSubmitting && styles.buttonDisabled]}
                disabled={isSubmitting}
                onPress={handleCreate}>
                <Text style={styles.createButtonText}>{isSubmitting ? 'Création...' : 'Créer le résident'}</Text>
              </Pressable>
            )}

            {modalMode === 'details' && selectedResident && (
              <View style={styles.modalActions}>
                <Pressable style={styles.secondaryButton} onPress={() => setModalMode('reassign')}>
                  <Text style={styles.secondaryButtonText}>Réassigner appartement</Text>
                </Pressable>
              </View>
            )}

            {modalMode === 'reassign' && (
              <View style={styles.modalActions}>
                <Pressable style={styles.secondaryButton} onPress={() => setModalMode('details')}>
                  <Text style={styles.secondaryButtonText}>Annuler</Text>
                </Pressable>
                <Pressable
                  style={[styles.createButton, styles.modalPrimaryButton, isSubmitting && styles.buttonDisabled]}
                  disabled={isSubmitting}
                  onPress={handleReassign}>
                  <Text style={styles.createButtonText}>{isSubmitting ? 'Enregistrement...' : 'Enregistrer'}</Text>
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
  content: { padding: 24, paddingBottom: 36, width: '100%', maxWidth: 1040, alignSelf: 'center' },
  header: { marginBottom: 16 },
  backRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginBottom: 18 },
  backText: { marginLeft: 2, color: '#111827', fontSize: 16, fontWeight: '500' },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' },
  title: { color: '#111827', fontSize: 28, lineHeight: 34, fontWeight: '800' },
  subtitle: { marginTop: 6, color: '#6B7280', fontSize: 14, lineHeight: 20, fontWeight: '500' },
  primaryAction: { minHeight: 46, borderRadius: 14, backgroundColor: '#18A7A0', paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryActionText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  sectionHeader: { marginBottom: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  sectionTitle: { color: '#111827', fontSize: 17, fontWeight: '800' },
  sectionMeta: { color: '#6B7280', fontSize: 13, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    minHeight: 178,
    minWidth: 230,
    flexGrow: 1,
    flexBasis: '31%',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    padding: 16,
    boxShadow: '0 12px 30px rgba(15, 23, 42, 0.07)',
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconWrap: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#D6F3F1', alignItems: 'center', justifyContent: 'center' },
  statusText: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, fontSize: 12, fontWeight: '800' },
  active: { backgroundColor: '#DCFCE7', color: '#16A34A' },
  inactive: { backgroundColor: '#FEE2E2', color: '#DC2626' },
  cardTitle: { marginTop: 14, color: '#111827', fontSize: 17, fontWeight: '800' },
  metaText: { marginTop: 5, color: '#6B7280', fontSize: 13, fontWeight: '600' },
  apartmentText: { marginTop: 12, color: '#111827', fontSize: 14, fontWeight: '700' },
  typeText: { marginTop: 6, color: '#18A7A0', fontSize: 13, fontWeight: '800' },
  stateCard: { minHeight: 150, borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF', padding: 18, alignItems: 'center', justifyContent: 'center', gap: 8 },
  stateTitle: { color: '#111827', fontSize: 15, fontWeight: '800', textAlign: 'center' },
  stateText: { color: '#6B7280', fontSize: 14, lineHeight: 20, fontWeight: '500', textAlign: 'center' },
  errorText: { color: '#DC2626', fontSize: 14, lineHeight: 20, fontWeight: '600', textAlign: 'center' },
  retryButton: { borderRadius: 12, backgroundColor: '#D6F3F1', paddingHorizontal: 14, paddingVertical: 8 },
  retryText: { color: '#18A7A0', fontSize: 13, fontWeight: '800' },
  footerAction: { marginTop: 16 },
  residenceButton: { height: 50, borderRadius: 14, borderWidth: 1, borderColor: '#18A7A0', backgroundColor: '#D6F3F1', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  residenceButtonText: { color: '#18A7A0', fontSize: 14, fontWeight: '800' },
  buttonDisabled: { opacity: 0.6 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(17, 24, 39, 0.45)', padding: 20, alignItems: 'center', justifyContent: 'center' },
  modalCard: { width: '100%', maxWidth: 620, maxHeight: '92%', borderRadius: 22, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', padding: 18 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 },
  modalTitleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  modalIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#D6F3F1', alignItems: 'center', justifyContent: 'center' },
  modalTitle: { flex: 1, color: '#111827', fontSize: 20, fontWeight: '800' },
  closeButton: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  modalContent: { gap: 10, paddingBottom: 8 },
  input: { minHeight: 50, borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', paddingHorizontal: 14, color: '#111827', fontSize: 14, fontWeight: '600' },
  fieldLabel: { marginTop: 8, marginBottom: 2, color: '#111827', fontSize: 13, fontWeight: '800' },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionButton: { minHeight: 44, borderRadius: 14, borderWidth: 1, borderColor: '#D6F3F1', backgroundColor: '#F9FAFB', paddingHorizontal: 12, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 7 },
  optionButtonSelected: { borderColor: '#18A7A0', backgroundColor: '#18A7A0' },
  optionText: { color: '#111827', fontSize: 13, fontWeight: '700' },
  optionTextSelected: { color: '#FFFFFF' },
  segmentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  segmentButton: { minHeight: 44, minWidth: 124, borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  segmentButtonSelected: { borderColor: '#18A7A0', backgroundColor: '#D6F3F1' },
  segmentText: { color: '#6B7280', fontSize: 13, fontWeight: '800' },
  segmentTextSelected: { color: '#18A7A0' },
  primaryToggle: { minHeight: 44, minWidth: 102, borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  primaryToggleSelected: { borderColor: '#16A34A', backgroundColor: '#DCFCE7' },
  primaryText: { color: '#6B7280', fontSize: 13, fontWeight: '800' },
  primaryTextSelected: { color: '#16A34A' },
  formError: { marginTop: 8, color: '#DC2626', fontSize: 13, fontWeight: '600' },
  createButton: { marginTop: 14, height: 50, borderRadius: 14, backgroundColor: '#18A7A0', alignItems: 'center', justifyContent: 'center' },
  createButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  modalPrimaryButton: { flex: 1, marginTop: 0 },
  modalActions: { marginTop: 14, flexDirection: 'row', gap: 10 },
  secondaryButton: { flex: 1, minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  secondaryButtonText: { color: '#111827', fontSize: 14, fontWeight: '800' },
  detailRow: { borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingVertical: 11 },
  detailLabel: { color: '#6B7280', fontSize: 12, fontWeight: '700' },
  detailValue: { marginTop: 4, color: '#111827', fontSize: 15, fontWeight: '800' },
});
