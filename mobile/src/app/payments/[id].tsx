import { router, useLocalSearchParams } from 'expo-router';
import { CalendarDays, Camera, ChevronLeft, Image as ImageIcon, Receipt } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { useAuth } from '@/hooks/use-auth';
import { ApiError } from '@/lib/api/client';
import {
  declareMyPayment,
  getMyPayment,
  PaymentMethod,
  PaymentStatus,
  ResidentPayment,
} from '@/services/payments-service';
import { uploadPaymentProof } from '@/services/storage-service';

const monthNames = [
  'Janvier',
  'Fevrier',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Aout',
  'Septembre',
  'Octobre',
  'Novembre',
  'Decembre',
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

function formatCurrency(amount: number) {
  return `${amount.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} MAD`;
}

function formatDate(value: string | null) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatMonthYear(payment: ResidentPayment) {
  return `${monthNames[payment.month - 1] ?? payment.month} ${payment.year}`;
}

function formatStatus(status: PaymentStatus) {
  if (status === 'PAYE') return 'Payé';
  if (status === 'PARTIELLEMENT_PAYE') return 'Paiement partiel';
  if (status === 'EN_RETARD') return 'En retard';
  if (status === 'EXONERE') return 'Exonéré';
  return 'Non payé';
}

function formatTransactionStatus(status?: string) {
  if (status === 'PENDING') return 'En attente';
  if (status === 'REJECTED') return 'Rejeté';
  return 'Validé';
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

export default function PaymentDetailsScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { token } = useAuth();
  const [payment, setPayment] = useState<ResidentPayment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeclareVisible, setIsDeclareVisible] = useState(false);
  const [declaredAmount, setDeclaredAmount] = useState('');
  const [declaredProof, setDeclaredProof] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [declaredNote, setDeclaredNote] = useState('');
  const [declaredMethod, setDeclaredMethod] = useState<PaymentMethod>('BANK_TRANSFER');
  const [error, setError] = useState('');

  const loadPayment = useCallback(async () => {
    if (!token || !id) {
      setIsLoading(false);
      setError('Paiement introuvable.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const data = await getMyPayment(token, id);
      setPayment(data);
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : 'Impossible de charger ce paiement.');
    } finally {
      setIsLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    loadPayment();
  }, [loadPayment]);

  const pickProofImage = async (source: 'camera' | 'library') => {
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Permission requise',
        source === 'camera'
          ? 'Autorisez la camera pour prendre une photo.'
          : 'Autorisez la galerie pour choisir une image.',
      );
      return;
    }

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.85,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.85,
          });

    if (!result.canceled) {
      setDeclaredProof(result.assets[0]);
    }
  };

  const chooseProofImage = () => {
    Alert.alert('Preuve de paiement', 'Ajoutez une image de votre justificatif.', [
      { text: 'Prendre une photo', onPress: () => pickProofImage('camera') },
      { text: 'Choisir depuis la galerie', onPress: () => pickProofImage('library') },
      { text: 'Annuler', style: 'cancel' },
    ]);
  };

  const handleDeclarePayment = async () => {
    if (!token || !payment || isSubmitting) return;
    const amount = Number(declaredAmount.replace(',', '.'));
    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert('Montant invalide', 'Saisissez un montant de versement positif.');
      return;
    }
    if (!declaredProof) {
      Alert.alert('Preuve de paiement', 'Ajoutez une image de votre preuve de paiement.');
      return;
    }

    setIsSubmitting(true);
    try {
      const proof = await uploadPaymentProof({
        uri: declaredProof.uri,
        fileName: declaredProof.fileName,
        mimeType: declaredProof.mimeType,
        size: declaredProof.fileSize,
      });
      const updatedPayment = await declareMyPayment(token, payment.id, {
        amount,
        paymentMethod: declaredMethod,
        proofUrl: proof.url,
        note: declaredNote.trim() || undefined,
      });
      setPayment(updatedPayment);
      setDeclaredAmount('');
      setDeclaredProof(null);
      setDeclaredNote('');
      setIsDeclareVisible(false);
      Alert.alert('Déclaration envoyée', 'Votre paiement est en attente de validation.');
    } catch (err: unknown) {
      Alert.alert(
        'Déclaration impossible',
        err instanceof ApiError ? err.message : 'Veuillez réessayer dans un instant.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable style={styles.backRow} onPress={() => router.replace('/payments')}>
          <ChevronLeft size={18} color={colors.text} />
          <Text style={styles.backText}>Retour</Text>
        </Pressable>
        <Text style={styles.title}>Paiement</Text>
        <Text style={styles.subtitle}>Détail de la charge</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {isLoading && (
          <View style={styles.stateCard}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.stateText}>Chargement du paiement...</Text>
          </View>
        )}

        {!isLoading && !!error && (
          <View style={styles.stateCard}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={loadPayment}>
              <Text style={styles.retryText}>Réessayer</Text>
            </Pressable>
          </View>
        )}

        {!isLoading && !error && payment && (
          <>
            <View style={styles.heroCard}>
              <View style={styles.iconWrap}>
                <Receipt size={22} color={colors.primary} strokeWidth={2.2} />
              </View>
              <Text style={styles.heroTitle}>Reste à payer - Charges {formatMonthYear(payment)}</Text>
              <Text style={styles.heroAmount}>{formatCurrency(payment.remainingAmount)}</Text>
              <Text style={styles.heroMeta}>
                Payé {formatCurrency(payment.amountPaid)} / Dû {formatCurrency(payment.amountDue)}
              </Text>
              <View style={styles.dateRow}>
                <CalendarDays size={14} color={colors.muted} />
                <Text style={styles.dateText}>
                  Échéance : {payment.dueDate ? formatDate(payment.dueDate) : formatMonthYear(payment)}
                </Text>
              </View>
              <Pressable
                style={styles.declareButton}
                onPress={() => setIsDeclareVisible(true)}>
                <Text style={styles.declareButtonText}>Déclarer un paiement</Text>
              </Pressable>
            </View>

            <View style={styles.card}>
              <DetailRow label="Statut" value={formatStatus(payment.status)} />
              <DetailRow label="Montant dû" value={formatCurrency(payment.amountDue)} />
              <DetailRow label="Montant payé" value={formatCurrency(payment.amountPaid)} />
              <DetailRow label="Reste à payer" value={formatCurrency(payment.remainingAmount)} />
              <DetailRow label="Date de paiement" value={formatDate(payment.paidAt)} />
              <DetailRow label="Méthode" value={payment.paymentMethod ?? '-'} />
              <DetailRow label="Reçu" value={payment.receiptUrl ?? '-'} />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Historique des versements</Text>
              {!payment.transactions || payment.transactions.length === 0 ? (
                <Text style={styles.emptyText}>Aucun versement enregistré.</Text>
              ) : (
                payment.transactions.map((transaction) => (
                  <View key={transaction.id} style={styles.transactionRow}>
                    <View>
                      <Text style={styles.transactionAmount}>
                        {formatCurrency(transaction.amount)}
                      </Text>
                      <Text style={styles.transactionMeta}>
                        {transaction.paymentMethod ?? 'Méthode non renseignée'} -{' '}
                        {formatDate(transaction.paidAt)}
                      </Text>
                      <Text style={styles.transactionStatus}>
                        {formatTransactionStatus(transaction.status)}
                      </Text>
                      {!!transaction.note && (
                        <Text style={styles.transactionNote}>{transaction.note}</Text>
                      )}
                    </View>
                    <Text style={styles.transactionReceipt}>
                      {transaction.receiptUrl ? 'Reçu' : '-'}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>

      <Modal
        visible={isDeclareVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsDeclareVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Déclarer un paiement</Text>
            <TextInput
              value={declaredAmount}
              onChangeText={setDeclaredAmount}
              keyboardType="numeric"
              placeholder="Montant versé"
              placeholderTextColor={colors.muted}
              style={styles.input}
            />
            <TextInput
              value={declaredNote}
              onChangeText={setDeclaredNote}
              placeholder="Note optionnelle"
              placeholderTextColor={colors.muted}
              style={styles.input}
            />
            <Pressable style={styles.proofButton} onPress={chooseProofImage}>
              <View style={styles.proofIcon}>
                {declaredProof ? (
                  <ImageIcon size={18} color={colors.primary} />
                ) : (
                  <Camera size={18} color={colors.primary} />
                )}
              </View>
              <View style={styles.proofCopy}>
                <Text style={styles.proofTitle}>Preuve de paiement</Text>
                <Text style={styles.proofSubtitle}>
                  {declaredProof ? 'Image selectionnee' : 'Prendre une photo ou choisir depuis la galerie'}
                </Text>
              </View>
            </Pressable>
            {declaredProof && (
              <View style={styles.proofPreviewCard}>
                <Image source={{ uri: declaredProof.uri }} style={styles.proofPreviewImage} />
                <Pressable onPress={() => setDeclaredProof(null)}>
                  <Text style={styles.removeProofText}>Retirer</Text>
                </Pressable>
              </View>
            )}
            <Text style={styles.methodTitle}>Méthode</Text>
            <View style={styles.methodGrid}>
              {paymentMethods.map((method) => {
                const selected = method === declaredMethod;
                return (
                  <Pressable
                    key={method}
                    style={[styles.methodOption, selected && styles.methodOptionSelected]}
                    onPress={() => setDeclaredMethod(method)}>
                    <Text
                      style={[
                        styles.methodOptionText,
                        selected && styles.methodOptionTextSelected,
                      ]}>
                      {method}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.modalActions}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => setIsDeclareVisible(false)}>
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </Pressable>
              <Pressable
                style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                disabled={isSubmitting}
                onPress={handleDeclarePayment}>
                <Text style={styles.submitButtonText}>
                  {isSubmitting ? 'Envoi...' : 'Envoyer'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
    backgroundColor: colors.primary,
    padding: 20,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroTitle: {
    color: '#D1FAF6',
    fontSize: 14,
    fontWeight: '700',
  },
  heroAmount: {
    marginTop: 8,
    color: colors.white,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
  },
  heroMeta: {
    marginTop: 6,
    color: '#D1FAF6',
    fontSize: 13,
    fontWeight: '700',
  },
  dateRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    color: '#CCFBF7',
    fontSize: 13,
    fontWeight: '500',
  },
  declareButton: {
    marginTop: 16,
    borderRadius: 14,
    backgroundColor: colors.white,
    paddingVertical: 12,
    alignItems: 'center',
  },
  declareButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '800',
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
    marginBottom: 8,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '500',
  },
  transactionRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  transactionAmount: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  transactionMeta: {
    marginTop: 3,
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  transactionStatus: {
    marginTop: 4,
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  transactionNote: {
    marginTop: 3,
    color: colors.text,
    fontSize: 12,
    fontWeight: '500',
  },
  transactionReceipt: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 460,
    borderRadius: 20,
    backgroundColor: colors.white,
    padding: 18,
    gap: 12,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  input: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  methodTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  proofButton: {
    minHeight: 62,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.primaryLight,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  proofIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proofCopy: {
    flex: 1,
    minWidth: 0,
  },
  proofTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  proofSubtitle: {
    marginTop: 3,
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  proofPreviewCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  proofPreviewImage: {
    width: 74,
    height: 74,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
  },
  removeProofText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '800',
  },
  methodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  methodOption: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  methodOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  methodOptionText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  methodOptionTextSelected: {
    color: colors.white,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  submitButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
  },
});
