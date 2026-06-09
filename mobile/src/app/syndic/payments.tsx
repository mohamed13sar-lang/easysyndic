import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import {
  Building2,
  ChevronLeft,
  CreditCard,
  Home,
  Plus,
  Receipt,
  X,
} from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
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
  PaymentMethod,
  PaymentStatus,
  addSyndicPaymentTransaction,
  createSyndicPayment,
  getSyndicNonPaidPayments,
  getSyndicPayments,
  rejectSyndicPaymentTransaction,
  SyndicPayment,
  updateSyndicPayment,
  validateSyndicPaymentTransaction,
} from '@/services/syndic-payments-service';
import {
  getSyndicResidents,
  SyndicResident,
} from '@/services/syndic-residents-service';

type ModalMode = 'create' | 'details' | 'edit' | 'transaction';
type PaymentFormValidation =
  | { error: string }
  | {
      parsedMonth: number;
      parsedYear: number;
      parsedAmountDue: number;
      parsedAmountPaid: number;
    };

const statuses: PaymentStatus[] = [
  'NON_PAYE',
  'PARTIELLEMENT_PAYE',
  'PAYE',
  'EN_RETARD',
  'EXONERE',
];

const paymentMethods: PaymentMethod[] = [
  'CASH',
  'BANK_TRANSFER',
  'CHECK',
  'CASH_PLUS',
  'WAFACASH',
  'MOBILE_PAYMENT',
  'OTHER',
];

const monthNames = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
];

function formatCurrency(value: number) {
  return `${value.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} MAD`;
}

function formatStatus(status: PaymentStatus) {
  if (status === 'PAYE') return 'Payé';
  if (status === 'NON_PAYE') return 'Non payé';
  if (status === 'PARTIELLEMENT_PAYE') return 'Partiel';
  if (status === 'EN_RETARD') return 'En retard';
  return 'Exonéré';
}

function getPaymentSuccessMessage(status: PaymentStatus) {
  if (status === 'PAYE') return 'Paiement marqué comme payé';
  if (status === 'PARTIELLEMENT_PAYE') return 'Paiement partiel enregistré';
  if (status === 'EN_RETARD') return 'Paiement en retard';
  if (status === 'EXONERE') return 'Paiement exonéré';
  return 'Paiement enregistré avec succès';
}

function getStatusStyle(status: PaymentStatus) {
  if (status === 'PAYE' || status === 'EXONERE') {
    return { backgroundColor: '#DCFCE7', color: '#16A34A' };
  }
  if (status === 'PARTIELLEMENT_PAYE') {
    return { backgroundColor: '#FEF3C7', color: '#D97706' };
  }
  if (status === 'EN_RETARD') {
    return { backgroundColor: '#FEE2E2', color: '#DC2626' };
  }
  return { backgroundColor: '#F3F4F6', color: '#4B5563' };
}

function parseAmount(value: string) {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function getApartmentLabel(apartment?: SyndicApartment) {
  if (!apartment) return 'Appartement -';
  return `Appartement ${apartment.number}${apartment.block ? ` - Bloc ${apartment.block}` : ''}`;
}

function isUnpaid(payment: SyndicPayment) {
  return (
    payment.status === 'NON_PAYE' ||
    payment.status === 'PARTIELLEMENT_PAYE' ||
    payment.status === 'EN_RETARD'
  );
}

function formatMonthYear(payment: SyndicPayment) {
  return `${monthNames[payment.month - 1] ?? payment.month} ${payment.year}`;
}

async function openProofImage(url: string) {
  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
      return;
    }
  } catch {
    // The preview remains visible if the platform cannot open the URL.
  }
  Alert.alert('Preuve de paiement', url);
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

export default function SyndicPaymentsScreen() {
  const { filter } = useLocalSearchParams<{ filter?: string }>();
  const { token } = useAuth();
  const {
    selectedResidence,
    isLoading: isResidenceLoading,
    error: residenceError,
  } = useSelectedSyndicResidence();
  const [payments, setPayments] = useState<SyndicPayment[]>([]);
  const [apartments, setApartments] = useState<SyndicApartment[]>([]);
  const [residents, setResidents] = useState<SyndicResident[]>([]);
  const [apartmentId, setApartmentId] = useState('');
  const [residentId, setResidentId] = useState('');
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [amountDue, setAmountDue] = useState('');
  const [amountPaid, setAmountPaid] = useState('0');
  const [transactionNote, setTransactionNote] = useState('');
  const [status, setStatus] = useState<PaymentStatus>('NON_PAYE');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [selectedPayment, setSelectedPayment] = useState<SyndicPayment | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>('details');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const isUnpaidFilter = filter === 'unpaid';

  const apartmentById = useMemo(
    () => new Map(apartments.map((apartment) => [apartment.id, apartment])),
    [apartments],
  );
  const residentById = useMemo(
    () => new Map(residents.map((resident) => [resident.id, resident])),
    [residents],
  );
  const eligibleResidents = useMemo(
    () =>
      residents.filter((resident) =>
        resident.residentApartments.some((link) => link.apartmentId === apartmentId && link.isActive),
      ),
    [apartmentId, residents],
  );
  const sortedPayments = useMemo(
    () => [...payments].sort((a, b) => b.year - a.year || b.month - a.month),
    [payments],
  );
  const totals = useMemo(() => {
    return payments.reduce(
      (acc, payment) => ({
        unpaidCount: acc.unpaidCount + (isUnpaid(payment) ? 1 : 0),
        unpaidAmount:
          acc.unpaidAmount + (isUnpaid(payment) ? Math.max(payment.remainingAmount, 0) : 0),
        paidAmount: acc.paidAmount + payment.amountPaid,
        partialAmount:
          acc.partialAmount +
          (payment.status === 'PARTIELLEMENT_PAYE' ? Math.max(payment.remainingAmount, 0) : 0),
      }),
      { unpaidCount: 0, unpaidAmount: 0, paidAmount: 0, partialAmount: 0 },
    );
  }, [payments]);

  const loadPayments = useCallback(async () => {
    if (!token || !selectedResidence) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const [paymentsData, apartmentsData, residentsData] = await Promise.all([
        isUnpaidFilter
          ? getSyndicNonPaidPayments(token, selectedResidence.id)
          : getSyndicPayments(token, selectedResidence.id),
        getSyndicApartments(token, selectedResidence.id),
        getSyndicResidents(token, selectedResidence.id),
      ]);
      setPayments(paymentsData);
      setApartments(apartmentsData);
      setResidents(residentsData);

      const firstApartmentId = apartmentsData[0]?.id || '';
      const nextApartmentId = apartmentId || firstApartmentId;
      setApartmentId((current) => current || firstApartmentId);
      const firstResident = residentsData.find((resident) =>
        resident.residentApartments.some((link) => link.apartmentId === nextApartmentId && link.isActive),
      );
      setResidentId((current) => current || firstResident?.id || '');
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : 'Impossible de charger les paiements.');
    } finally {
      setIsLoading(false);
    }
  }, [apartmentId, isUnpaidFilter, selectedResidence, token]);

  useFocusEffect(
    useCallback(() => {
      loadPayments();
    }, [loadPayments]),
  );

  const handleApartmentSelect = (nextApartmentId: string) => {
    setApartmentId(nextApartmentId);
    const firstResident = residents.find((resident) =>
      resident.residentApartments.some((link) => link.apartmentId === nextApartmentId && link.isActive),
    );
    setResidentId(firstResident?.id || '');
  };

  const resetForm = () => {
    setMonth(String(new Date().getMonth() + 1));
    setYear(String(new Date().getFullYear()));
    setAmountDue('');
    setAmountPaid('0');
    setTransactionNote('');
    setStatus('NON_PAYE');
    setPaymentMethod('CASH');
    setFormError('');
  };

  const openCreateModal = () => {
    resetForm();
    const firstApartmentId = apartments[0]?.id || '';
    handleApartmentSelect(apartmentId || firstApartmentId);
    setSelectedPayment(null);
    setModalMode('create');
    setIsModalVisible(true);
  };

  const openDetailsModal = (payment: SyndicPayment) => {
    setSelectedPayment(payment);
    setAmountDue(String(payment.amountDue));
    setAmountPaid(String(payment.amountPaid));
    setStatus(payment.status);
    setPaymentMethod(payment.paymentMethod ?? 'CASH');
    setTransactionNote('');
    setFormError('');
    setModalMode('details');
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setIsModalVisible(false);
    setSelectedPayment(null);
    setFormError('');
  };

  const validatePaymentForm = (): PaymentFormValidation => {
    const parsedMonth = Number(month);
    const parsedYear = Number(year);
    const parsedAmountDue = parseAmount(amountDue);
    const parsedAmountPaid = parseAmount(amountPaid);

    if (!apartmentId || !residentId) {
      return { error: 'Sélectionnez un appartement et un résident.' };
    }
    if (!Number.isInteger(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
      return { error: 'Le mois doit être compris entre 1 et 12.' };
    }
    if (!Number.isInteger(parsedYear) || parsedYear < 2020) {
      return { error: 'L’année est invalide.' };
    }
    if (parsedAmountDue === null || parsedAmountPaid === null) {
      return { error: 'Les montants sont invalides.' };
    }
    if (parsedAmountDue < 0 || parsedAmountPaid < 0) {
      return { error: 'Les montants ne peuvent pas être négatifs.' };
    }

    return { parsedMonth, parsedYear, parsedAmountDue, parsedAmountPaid };
  };

  const handleCreate = async () => {
    if (!token || !selectedResidence || isSubmitting) return;
    const parsed = validatePaymentForm();
    if ('error' in parsed) {
      setFormError(parsed.error);
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      const createdPayment = await createSyndicPayment(token, selectedResidence.id, {
        apartmentId,
        residentId,
        month: parsed.parsedMonth,
        year: parsed.parsedYear,
        amountDue: parsed.parsedAmountDue,
        amountPaid: parsed.parsedAmountPaid,
        status,
        paymentMethod,
      });
      setPayments((current) => [createdPayment, ...current]);
      closeModal();
      resetForm();
      Alert.alert(getPaymentSuccessMessage(createdPayment.status));
      await loadPayments();
    } catch (err: unknown) {
      setFormError(err instanceof ApiError ? err.message : 'Impossible de créer le paiement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!token || !selectedResidence || !selectedPayment || isSubmitting) return;
    const parsedAmountDue = parseAmount(amountDue);
    const parsedAmountPaid = parseAmount(amountPaid);
    if (parsedAmountDue === null || parsedAmountPaid === null) {
      setFormError('Les montants sont invalides.');
      return;
    }
    if (parsedAmountDue < 0 || parsedAmountPaid < 0) {
      setFormError('Les montants ne peuvent pas être négatifs.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      const updatedPayment = await updateSyndicPayment(token, selectedResidence.id, selectedPayment.id, {
        amountDue: parsedAmountDue,
        amountPaid: parsedAmountPaid,
        status,
        paymentMethod,
        paidAt: status === 'PAYE' ? new Date().toISOString() : undefined,
      });
      setPayments((current) =>
        current.map((payment) =>
          payment.id === updatedPayment.id ? updatedPayment : payment,
        ),
      );
      closeModal();
      Alert.alert(getPaymentSuccessMessage(updatedPayment.status));
      await loadPayments();
    } catch (err: unknown) {
      setFormError(err instanceof ApiError ? err.message : 'Impossible de modifier le paiement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddTransaction = async () => {
    if (!token || !selectedResidence || !selectedPayment || isSubmitting) return;
    const parsedAmountPaid = parseAmount(amountPaid);
    if (parsedAmountPaid === null || parsedAmountPaid <= 0) {
      setFormError('Le montant du versement doit être positif.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      const updatedPayment = await addSyndicPaymentTransaction(
        token,
        selectedResidence.id,
        selectedPayment.id,
        {
          amount: parsedAmountPaid,
          paymentMethod,
          paidAt: new Date().toISOString(),
          note: transactionNote || undefined,
        },
      );
      setPayments((current) =>
        current.map((payment) =>
          payment.id === updatedPayment.id ? updatedPayment : payment,
        ),
      );
      closeModal();
      Alert.alert(getPaymentSuccessMessage(updatedPayment.status));
      await loadPayments();
    } catch (err: unknown) {
      setFormError(err instanceof ApiError ? err.message : 'Impossible d’ajouter le versement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTransactionDecision = async (
    transactionId: string,
    decision: 'validate' | 'reject',
  ) => {
    if (!token || !selectedResidence || !selectedPayment || isSubmitting) return;

    setIsSubmitting(true);
    setFormError('');

    try {
      const updatedPayment =
        decision === 'validate'
          ? await validateSyndicPaymentTransaction(
              token,
              selectedResidence.id,
              selectedPayment.id,
              transactionId,
            )
          : await rejectSyndicPaymentTransaction(
              token,
              selectedResidence.id,
              selectedPayment.id,
              transactionId,
            );

      setSelectedPayment(updatedPayment);
      setPayments((current) =>
        current.map((payment) =>
          payment.id === updatedPayment.id ? updatedPayment : payment,
        ),
      );
      Alert.alert(
        decision === 'validate'
          ? 'Paiement validé'
          : 'Déclaration rejetée',
      );
      await loadPayments();
    } catch (err: unknown) {
      setFormError(
        err instanceof ApiError ? err.message : 'Impossible de traiter cette déclaration.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const showLoading = isLoading || isResidenceLoading;
  const shownError = error || residenceError;
  const selectedApartment = selectedPayment ? apartmentById.get(selectedPayment.apartmentId) : undefined;
  const selectedResident = selectedPayment ? residentById.get(selectedPayment.residentId) : undefined;

  const renderStatusOptions = () => (
    <View style={styles.optionGrid}>
      {statuses.map((item) => {
        const selected = item === status;
        return (
          <Pressable
            key={item}
            style={[styles.smallOption, selected && styles.smallOptionSelected]}
            onPress={() => setStatus(item)}>
            <Text style={[styles.smallOptionText, selected && styles.smallOptionTextSelected]}>
              {formatStatus(item)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  const renderPaymentMethodOptions = () => (
    <View style={styles.optionGrid}>
      {paymentMethods.map((method) => {
        const selected = method === paymentMethod;
        return (
          <Pressable
            key={method}
            style={[styles.smallOption, selected && styles.smallOptionSelected]}
            onPress={() => setPaymentMethod(method)}>
            <Text style={[styles.smallOptionText, selected && styles.smallOptionTextSelected]}>
              {method}
            </Text>
          </Pressable>
        );
      })}
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
              <Text style={styles.title}>Paiements</Text>
              <Text style={styles.subtitle}>
                {selectedResidence
                  ? `${isUnpaidFilter ? 'Impayés - ' : ''}${selectedResidence.name} - ${formatSyndicResidenceAddress(selectedResidence)}`
                  : 'Sélectionnez une résidence active'}
              </Text>
            </View>
            <Pressable
              style={[styles.primaryAction, (!selectedResidence || apartments.length === 0 || residents.length === 0) && styles.buttonDisabled]}
              disabled={!selectedResidence || apartments.length === 0 || residents.length === 0}
              onPress={openCreateModal}>
              <Plus size={18} color="#FFFFFF" strokeWidth={2.4} />
              <Text style={styles.primaryActionText}>Nouveau paiement</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.totalsGrid}>
          <View style={styles.totalCard}>
            <Text style={styles.totalValue}>{totals.unpaidCount}</Text>
            <Text style={styles.totalLabel}>Impayés</Text>
          </View>
          <View style={styles.totalCard}>
            <Text style={styles.totalValue}>{formatCurrency(totals.unpaidAmount)}</Text>
            <Text style={styles.totalLabel}>Reste à payer</Text>
          </View>
          <View style={styles.totalCard}>
            <Text style={styles.totalValue}>{formatCurrency(totals.paidAmount)}</Text>
            <Text style={styles.totalLabel}>Montant payé</Text>
          </View>
          <View style={styles.totalCard}>
            <Text style={styles.totalValue}>{formatCurrency(totals.partialAmount)}</Text>
            <Text style={styles.totalLabel}>Partiels</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {isUnpaidFilter ? 'Paiements impayés' : 'Gestion des paiements'}
          </Text>
          <Text style={styles.sectionMeta}>{sortedPayments.length} paiement(s)</Text>
        </View>

        {showLoading && (
          <View style={styles.stateCard}>
            <ActivityIndicator color="#18A7A0" />
            <Text style={styles.stateText}>Chargement des paiements...</Text>
          </View>
        )}

        {!showLoading && !!shownError && (
          <View style={styles.stateCard}>
            <Text style={styles.errorText}>{shownError}</Text>
            <Pressable style={styles.retryButton} onPress={loadPayments}>
              <Text style={styles.retryText}>Réessayer</Text>
            </Pressable>
          </View>
        )}

        {!showLoading && !shownError && !selectedResidence && (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>Aucune résidence active</Text>
            <Text style={styles.stateText}>Sélectionnez une résidence avant de gérer les paiements.</Text>
          </View>
        )}

        {!showLoading && !shownError && selectedResidence && sortedPayments.length === 0 && (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>
              {isUnpaidFilter ? 'Aucun impayé' : 'Aucun paiement'}
            </Text>
            <Text style={styles.stateText}>
              {isUnpaidFilter
                ? 'Aucun impayé pour cette résidence.'
                : 'Créez le premier paiement de cette résidence.'}
            </Text>
          </View>
        )}

        {!showLoading && !shownError && sortedPayments.length > 0 && (
          <View style={styles.grid}>
            {sortedPayments.map((payment) => {
              const apartment = apartmentById.get(payment.apartmentId);
              const resident = residentById.get(payment.residentId);
              const statusStyle = getStatusStyle(payment.status);

              return (
                <Pressable key={payment.id} style={styles.card} onPress={() => openDetailsModal(payment)}>
                  <View style={styles.cardHeader}>
                    <View style={styles.iconWrap}>
                      <Receipt size={20} color="#18A7A0" strokeWidth={2.2} />
                    </View>
                    <Text style={[styles.statusBadge, statusStyle]}>{formatStatus(payment.status)}</Text>
                  </View>
                  <Text style={styles.cardTitle}>{formatMonthYear(payment)}</Text>
                  <Text style={styles.metaText}>{getApartmentLabel(apartment)}</Text>
                  <Text style={styles.metaText}>{resident?.fullName ?? 'Résident -'}</Text>
                  <Text style={styles.amountText}>Dû : {formatCurrency(payment.amountDue)}</Text>
                  <Text style={styles.metaText}>Payé : {formatCurrency(payment.amountPaid)}</Text>
                  <Text style={styles.remainingText}>
                    Reste : {formatCurrency(Math.max(payment.remainingAmount, 0))}
                  </Text>
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
                  <CreditCard size={20} color="#18A7A0" strokeWidth={2.2} />
                </View>
                <Text style={styles.modalTitle}>
                  {modalMode === 'create'
                    ? 'Nouveau paiement'
                    : modalMode === 'edit'
                      ? 'Modifier le paiement'
                      : modalMode === 'transaction'
                        ? 'Ajouter un versement'
                        : selectedPayment
                          ? formatMonthYear(selectedPayment)
                          : 'Détail paiement'}
                </Text>
              </View>
              <Pressable style={styles.closeButton} onPress={closeModal}>
                <X size={20} color="#111827" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalContent}>
              {modalMode === 'create' && (
                <>
                  <Text style={styles.fieldLabel}>Appartement</Text>
                  <View style={styles.optionGrid}>
                    {apartments.map((apartment) => {
                      const selected = apartment.id === apartmentId;
                      return (
                        <Pressable
                          key={apartment.id}
                          style={[styles.optionButton, selected && styles.optionButtonSelected]}
                          onPress={() => handleApartmentSelect(apartment.id)}>
                          <Home size={16} color={selected ? '#FFFFFF' : '#18A7A0'} strokeWidth={2.2} />
                          <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                            {getApartmentLabel(apartment)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <Text style={styles.fieldLabel}>Résident</Text>
                  <View style={styles.optionGrid}>
                    {eligibleResidents.map((resident) => {
                      const selected = resident.id === residentId;
                      return (
                        <Pressable
                          key={resident.id}
                          style={[styles.optionButton, selected && styles.optionButtonSelected]}
                          onPress={() => setResidentId(resident.id)}>
                          <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                            {resident.fullName}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <View style={styles.formGrid}>
                    <TextInput value={month} onChangeText={setMonth} keyboardType="number-pad" placeholder="Mois" placeholderTextColor="#9CA3AF" style={styles.input} />
                    <TextInput value={year} onChangeText={setYear} keyboardType="number-pad" placeholder="Année" placeholderTextColor="#9CA3AF" style={styles.input} />
                    <TextInput value={amountDue} onChangeText={setAmountDue} keyboardType="numeric" placeholder="Montant dû" placeholderTextColor="#9CA3AF" style={styles.input} />
                    <TextInput value={amountPaid} onChangeText={setAmountPaid} keyboardType="numeric" placeholder="Montant payé" placeholderTextColor="#9CA3AF" style={styles.input} />
                  </View>

                  <Text style={styles.fieldLabel}>Statut</Text>
                  {renderStatusOptions()}
                  <Text style={styles.fieldLabel}>Méthode</Text>
                  {renderPaymentMethodOptions()}
                </>
              )}

              {modalMode === 'details' && selectedPayment && (
                <>
                  <DetailRow label="Résident" value={selectedResident?.fullName ?? 'Résident -'} />
                  <DetailRow label="Appartement" value={getApartmentLabel(selectedApartment)} />
                  <DetailRow label="Mois / année" value={formatMonthYear(selectedPayment)} />
                  <DetailRow label="Montant dû" value={formatCurrency(selectedPayment.amountDue)} />
                  <DetailRow label="Montant payé" value={formatCurrency(selectedPayment.amountPaid)} />
                  <DetailRow label="Reste à payer" value={formatCurrency(selectedPayment.remainingAmount)} />
                  <DetailRow label="Statut" value={formatStatus(selectedPayment.status)} />
                  <DetailRow label="Méthode" value={selectedPayment.paymentMethod ?? '-'} />
                  <Text style={styles.fieldLabel}>Historique des versements</Text>
                  {!selectedPayment.transactions || selectedPayment.transactions.length === 0 ? (
                    <Text style={styles.emptyTransactionsText}>Aucun versement enregistré.</Text>
                  ) : (
                    selectedPayment.transactions.map((transaction) => (
                      <View key={transaction.id} style={styles.transactionRow}>
                        <Text style={styles.transactionAmount}>
                          {formatCurrency(transaction.amount)}
                        </Text>
                        <Text style={styles.transactionMeta}>
                          {transaction.paymentMethod ?? '-'} -{' '}
                          {new Date(transaction.paidAt).toLocaleDateString('fr-FR')}
                        </Text>
                        <Text style={styles.transactionStatus}>
                          {transaction.status === 'PENDING'
                            ? 'En attente de validation'
                            : transaction.status === 'REJECTED'
                              ? 'Rejeté'
                              : 'Validé'}
                        </Text>
                        {!!(transaction.proofUrl || transaction.receiptUrl) && (
                          <Pressable
                            style={styles.proofPreviewRow}
                            onPress={() =>
                              openProofImage(transaction.proofUrl ?? transaction.receiptUrl ?? '')
                            }>
                            <Image
                              source={{ uri: transaction.proofUrl ?? transaction.receiptUrl ?? '' }}
                              style={styles.proofThumb}
                            />
                            <View style={styles.proofTextWrap}>
                              <Text style={styles.proofTitle}>Preuve de paiement</Text>
                              <Text style={styles.transactionMeta}>
                                Appuyer pour agrandir
                              </Text>
                            </View>
                          </Pressable>
                        )}
                        {!!transaction.note && (
                          <Text style={styles.transactionMeta}>{transaction.note}</Text>
                        )}
                        {transaction.status === 'PENDING' && (
                          <View style={styles.transactionActions}>
                            <Pressable
                              style={[styles.transactionActionButton, styles.validateButton]}
                              disabled={isSubmitting}
                              onPress={() =>
                                handleTransactionDecision(transaction.id, 'validate')
                              }>
                              <Text style={styles.transactionActionText}>Valider</Text>
                            </Pressable>
                            <Pressable
                              style={[styles.transactionActionButton, styles.rejectButton]}
                              disabled={isSubmitting}
                              onPress={() =>
                                handleTransactionDecision(transaction.id, 'reject')
                              }>
                              <Text style={styles.transactionActionText}>Rejeter</Text>
                            </Pressable>
                          </View>
                        )}
                      </View>
                    ))
                  )}
                </>
              )}

              {modalMode === 'edit' && selectedPayment && (
                <>
                  <TextInput
                    value={amountDue}
                    onChangeText={setAmountDue}
                    keyboardType="numeric"
                    placeholder="Montant dû"
                    placeholderTextColor="#9CA3AF"
                    style={styles.input}
                  />
                  <TextInput
                    value={amountPaid}
                    onChangeText={setAmountPaid}
                    keyboardType="numeric"
                    placeholder="Montant payé"
                    placeholderTextColor="#9CA3AF"
                    style={styles.input}
                  />
                  <Text style={styles.fieldLabel}>Statut</Text>
                  {renderStatusOptions()}
                  <Text style={styles.fieldLabel}>Méthode</Text>
                  {renderPaymentMethodOptions()}
                </>
              )}

              {modalMode === 'transaction' && selectedPayment && (
                <>
                  <DetailRow label="Paiement" value={formatMonthYear(selectedPayment)} />
                  <DetailRow label="Reste à payer" value={formatCurrency(selectedPayment.remainingAmount)} />
                  <TextInput
                    value={amountPaid}
                    onChangeText={setAmountPaid}
                    keyboardType="numeric"
                    placeholder="Montant du versement"
                    placeholderTextColor="#9CA3AF"
                    style={styles.input}
                  />
                  <TextInput
                    value={transactionNote}
                    onChangeText={setTransactionNote}
                    placeholder="Note"
                    placeholderTextColor="#9CA3AF"
                    style={styles.input}
                  />
                  <Text style={styles.fieldLabel}>Méthode</Text>
                  {renderPaymentMethodOptions()}
                </>
              )}

              {!!formError && <Text style={styles.formError}>{formError}</Text>}
            </ScrollView>

            {modalMode === 'create' && (
              <Pressable style={[styles.createButton, isSubmitting && styles.buttonDisabled]} disabled={isSubmitting} onPress={handleCreate}>
                <Text style={styles.createButtonText}>{isSubmitting ? 'Création...' : 'Créer le paiement'}</Text>
              </Pressable>
            )}

            {modalMode === 'details' && selectedPayment && (
              <View style={styles.modalActions}>
                <Pressable style={styles.secondaryButton} onPress={() => {
                  setAmountPaid('');
                  setTransactionNote('');
                  setModalMode('transaction');
                }}>
                  <Text style={styles.secondaryButtonText}>Ajouter un versement</Text>
                </Pressable>
                <Pressable style={styles.secondaryButton} onPress={() => setModalMode('edit')}>
                  <Text style={styles.secondaryButtonText}>Modifier le paiement</Text>
                </Pressable>
              </View>
            )}

            {modalMode === 'edit' && selectedPayment && (
              <View style={styles.modalActions}>
                <Pressable style={styles.secondaryButton} onPress={() => setModalMode('details')}>
                  <Text style={styles.secondaryButtonText}>Annuler</Text>
                </Pressable>
                <Pressable
                  style={[styles.createButton, styles.modalPrimaryButton, isSubmitting && styles.buttonDisabled]}
                  disabled={isSubmitting}
                  onPress={handleUpdate}>
                  <Text style={styles.createButtonText}>{isSubmitting ? 'Enregistrement...' : 'Enregistrer'}</Text>
                </Pressable>
              </View>
            )}

            {modalMode === 'transaction' && selectedPayment && (
              <View style={styles.modalActions}>
                <Pressable style={styles.secondaryButton} onPress={() => setModalMode('details')}>
                  <Text style={styles.secondaryButtonText}>Annuler</Text>
                </Pressable>
                <Pressable
                  style={[styles.createButton, styles.modalPrimaryButton, isSubmitting && styles.buttonDisabled]}
                  disabled={isSubmitting}
                  onPress={handleAddTransaction}>
                  <Text style={styles.createButtonText}>{isSubmitting ? 'Enregistrement...' : 'Ajouter'}</Text>
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
  totalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  totalCard: { minHeight: 94, minWidth: 170, flexGrow: 1, flexBasis: '31%', borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF', padding: 16, boxShadow: '0 10px 26px rgba(15, 23, 42, 0.06)', elevation: 2 },
  totalValue: { color: '#111827', fontSize: 22, fontWeight: '800' },
  totalLabel: { marginTop: 6, color: '#6B7280', fontSize: 13, fontWeight: '700' },
  sectionHeader: { marginBottom: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  sectionTitle: { color: '#111827', fontSize: 17, fontWeight: '800' },
  sectionMeta: { color: '#6B7280', fontSize: 13, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { minHeight: 218, minWidth: 260, flexGrow: 1, flexBasis: '31%', borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF', padding: 16, boxShadow: '0 12px 30px rgba(15, 23, 42, 0.07)', elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconWrap: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#D6F3F1', alignItems: 'center', justifyContent: 'center' },
  statusBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, fontSize: 12, fontWeight: '800' },
  cardTitle: { marginTop: 14, color: '#111827', fontSize: 17, fontWeight: '800' },
  metaText: { marginTop: 6, color: '#6B7280', fontSize: 13, fontWeight: '600' },
  amountText: { marginTop: 12, color: '#111827', fontSize: 14, fontWeight: '800' },
  remainingText: { marginTop: 6, color: '#DC2626', fontSize: 14, fontWeight: '800' },
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
  modalCard: { width: '100%', maxWidth: 660, maxHeight: '92%', borderRadius: 22, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', padding: 18 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 },
  modalTitleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  modalIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#D6F3F1', alignItems: 'center', justifyContent: 'center' },
  modalTitle: { flex: 1, color: '#111827', fontSize: 20, fontWeight: '800' },
  closeButton: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  modalContent: { gap: 10, paddingBottom: 8 },
  fieldLabel: { marginTop: 8, marginBottom: 2, color: '#111827', fontSize: 13, fontWeight: '800' },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionButton: { minHeight: 44, borderRadius: 14, borderWidth: 1, borderColor: '#D6F3F1', backgroundColor: '#F9FAFB', paddingHorizontal: 12, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 7 },
  optionButtonSelected: { borderColor: '#18A7A0', backgroundColor: '#18A7A0' },
  optionText: { color: '#111827', fontSize: 13, fontWeight: '700' },
  optionTextSelected: { color: '#FFFFFF' },
  formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  input: { minHeight: 50, minWidth: 140, flexGrow: 1, flexBasis: '45%', borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', paddingHorizontal: 14, color: '#111827', fontSize: 14, fontWeight: '600' },
  smallOption: { minHeight: 38, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 11 },
  smallOptionSelected: { borderColor: '#18A7A0', backgroundColor: '#D6F3F1' },
  smallOptionText: { color: '#6B7280', fontSize: 12, fontWeight: '800' },
  smallOptionTextSelected: { color: '#18A7A0' },
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
  emptyTransactionsText: { color: '#6B7280', fontSize: 13, fontWeight: '600' },
  transactionRow: { borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingVertical: 10 },
  transactionAmount: { color: '#111827', fontSize: 14, fontWeight: '800' },
  transactionMeta: { marginTop: 3, color: '#6B7280', fontSize: 12, fontWeight: '600' },
  transactionStatus: { marginTop: 5, color: '#18A7A0', fontSize: 12, fontWeight: '800' },
  proofPreviewRow: { marginTop: 10, borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', padding: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
  proofThumb: { width: 56, height: 56, borderRadius: 12, backgroundColor: '#D6F3F1' },
  proofTextWrap: { flex: 1, minWidth: 0 },
  proofTitle: { color: '#111827', fontSize: 13, fontWeight: '800' },
  transactionActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  transactionActionButton: { flex: 1, minHeight: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  validateButton: { backgroundColor: '#16A34A' },
  rejectButton: { backgroundColor: '#DC2626' },
  transactionActionText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
});
