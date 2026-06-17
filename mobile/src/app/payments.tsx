import { router, useFocusEffect } from 'expo-router';
import {
  CalendarDays,
  CheckCircle2,
  Receipt,
} from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ResidentTabBar, useResidentTabBarInset } from '@/components/ResidentTabBar';
import { colors } from '@/constants/colors';
import { useAuth } from '@/hooks/use-auth';
import { useSelectedResidence } from '@/hooks/use-selected-residence';
import { ApiError } from '@/lib/api/client';
import {
  getMyPayments,
  getMyPaymentsSummary,
  PaymentStatus,
  ResidentPayment,
  ResidentPaymentSummary,
} from '@/services/payments-service';

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

function formatCurrency(amount: number) {
  return `${amount.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} MAD`;
}

function formatSignedCurrency(amount: number) {
  if (amount > 0) return `+${formatCurrency(amount)}`;
  if (amount < 0) return `-${formatCurrency(Math.abs(amount))}`;
  return formatCurrency(0);
}

function formatMonthYear(payment: ResidentPayment) {
  return `${monthNames[payment.month - 1] ?? payment.month} ${payment.year}`;
}

function formatDate(value: string | null) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function getPaymentLabel(status: PaymentStatus) {
  if (status === 'PAYE') return 'Payé';
  if (status === 'EXONERE') return 'Exonéré';
  if (status === 'PARTIELLEMENT_PAYE') return 'Paiement partiel';
  if (status === 'EN_RETARD') return 'En retard';
  return 'Non payé';
}

function getPaymentStatusStyle(status: PaymentStatus) {
  if (status === 'PAYE') {
    return { backgroundColor: colors.successLight, color: colors.success };
  }
  if (status === 'EXONERE') {
    return { backgroundColor: colors.blueLight, color: colors.blue };
  }
  if (status === 'EN_RETARD') {
    return { backgroundColor: colors.dangerLight, color: colors.danger };
  }
  if (status === 'PARTIELLEMENT_PAYE') {
    return { backgroundColor: colors.warningLight, color: colors.warning };
  }
  return { backgroundColor: '#F3F4F6', color: colors.muted };
}

const emptyPaymentSummary: ResidentPaymentSummary = {
  amountDueTotal: 0,
  amountPaidTotal: 0,
  balance: 0,
  remainingToPay: 0,
  creditBalance: 0,
  status: 'BALANCED',
};

function getSummaryPresentation(summary: ResidentPaymentSummary) {
  if (summary.status === 'DEBT') {
    return {
      label: 'Reste à payer',
      amount: summary.balance,
      description: 'Solde débiteur',
      amountStyle: styles.balanceAmountDebt,
    };
  }

  if (summary.status === 'CREDIT') {
    return {
      label: 'Solde créditeur',
      amount: summary.balance,
      description: 'Avance disponible sur votre compte',
      amountStyle: styles.balanceAmountCredit,
    };
  }

  return {
    label: 'Solde à jour',
    amount: 0,
    description: 'Aucun impayé',
    amountStyle: styles.balanceAmountCredit,
  };
}

export default function PaymentsScreen() {
  const { token } = useAuth();
  const {
    selectedResidence,
    isLoading: isResidenceLoading,
    error: residenceError,
  } = useSelectedResidence();
  const [payments, setPayments] = useState<ResidentPayment[]>([]);
  const [paymentSummary, setPaymentSummary] =
    useState<ResidentPaymentSummary>(emptyPaymentSummary);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadPayments = useCallback(async () => {
    if (!token || !selectedResidence) {
      setPayments([]);
      setPaymentSummary(emptyPaymentSummary);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const filters = {
        residenceId: selectedResidence.id,
        apartmentId: selectedResidence.apartment.id,
      };
      const [data, summary] = await Promise.all([
        getMyPayments(token, filters),
        getMyPaymentsSummary(token, filters),
      ]);
      setPayments(data);
      setPaymentSummary(summary);
    } catch (err: unknown) {
      setPayments([]);
      setPaymentSummary(emptyPaymentSummary);
      setError(
        err instanceof ApiError ? err.message : 'Impossible de charger vos paiements.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [selectedResidence, token]);

  useFocusEffect(
    useCallback(() => {
      loadPayments();
    }, [loadPayments]),
  );

  const paidPayments = useMemo(
    () => payments.filter((payment) => payment.status === 'PAYE'),
    [payments],
  );
  const summaryPresentation = getSummaryPresentation(paymentSummary);
  const showLoading = isLoading || isResidenceLoading;
  const shownError = error || residenceError;
  const tabBarInset = useResidentTabBarInset();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: tabBarInset + 24 }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Paiements</Text>
          <Text style={styles.subtitle}>Gérez vos charges</Text>
        </View>

        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>{summaryPresentation.label}</Text>
          <Text style={[styles.balanceAmount, summaryPresentation.amountStyle]}>
            {formatSignedCurrency(summaryPresentation.amount)}
          </Text>
          <Text style={styles.balanceDue}>
            {summaryPresentation.description}
          </Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total cotisations</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(paymentSummary.amountDueTotal)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total payé</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(paymentSummary.amountPaidTotal)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Reste à payer</Text>
              <Text style={[styles.summaryValue, styles.summaryDebtValue]}>
                {formatCurrency(paymentSummary.remainingToPay)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Solde créditeur</Text>
              <Text style={[styles.summaryValue, styles.summaryCreditValue]}>
                {formatCurrency(paymentSummary.creditBalance)}
              </Text>
            </View>
          </View>
          <Pressable
            style={styles.payNowButton}
            onPress={() => Alert.alert('Paiement en ligne non disponible.')}>
            <Text style={styles.payNowText}>Voir les détails</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Factures</Text>
        <View style={styles.list}>
          {showLoading && (
            <View style={styles.stateCard}>
              <ActivityIndicator color={colors.primary} />
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
              <Text style={styles.stateTitle}>Aucun appartement selectionne</Text>
              <Text style={styles.stateText}>
                Sélectionnez une résidence avant de consulter vos paiements.
              </Text>
            </View>
          )}

          {!showLoading && !shownError && selectedResidence && payments.length === 0 && (
            <View style={styles.stateCard}>
              <Text style={styles.stateTitle}>Aucun paiement</Text>
              <Text style={styles.stateText}>
                Vos charges mensuelles apparaitront ici des qu&apos;elles seront creees.
              </Text>
            </View>
          )}

          {!showLoading &&
            !shownError &&
            payments.map((payment) => {
              const statusStyle = getPaymentStatusStyle(payment.status);
              return (
                <Pressable
                  key={payment.id}
                  style={styles.invoiceCard}
                  onPress={() =>
                    router.push({ pathname: '/payments/[id]', params: { id: payment.id } })
                  }>
                  <View style={styles.invoiceTop}>
                    <View style={styles.invoiceLeft}>
                      <View style={styles.invoiceIconWrap}>
                        <Receipt size={18} color={colors.primary} strokeWidth={2.2} />
                      </View>
                      <View>
                        <Text style={styles.invoiceTitle}>Charges {formatMonthYear(payment)}</Text>
                        <Text style={styles.invoiceDate}>
                          {payment.dueDate
                            ? formatDate(payment.dueDate)
                            : formatMonthYear(payment)}
                        </Text>
                      </View>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: statusStyle.backgroundColor },
                      ]}>
                      <Text
                        style={[
                          styles.statusText,
                          { color: statusStyle.color },
                        ]}>
                        {getPaymentLabel(payment.status)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.amountRows}>
                    <View style={styles.amountRow}>
                      <Text style={styles.amountLabel}>Cotisation</Text>
                      <Text style={styles.amountValue}>{formatCurrency(payment.amountDue)}</Text>
                    </View>
                    <View style={styles.amountRow}>
                      <Text style={styles.amountLabel}>Montant payé</Text>
                      <Text style={styles.amountValue}>{formatCurrency(payment.amountPaid)}</Text>
                    </View>
                    <View style={styles.amountRow}>
                      <Text style={styles.amountLabel}>Reste à payer</Text>
                      <Text style={styles.remainingValue}>
                        {formatCurrency(payment.remainingAmount)}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
        </View>

        <Text style={styles.sectionTitle}>Historique recent</Text>
        <View style={styles.list}>
          {!showLoading && !shownError && paidPayments.length === 0 && (
            <View style={styles.stateCard}>
              <Text style={styles.stateText}>Aucun paiement regle pour le moment.</Text>
            </View>
          )}

          {!showLoading &&
            !shownError &&
            paidPayments.map((item) => (
              <Pressable
                key={item.id}
                style={styles.historyCard}
                onPress={() =>
                  router.push({ pathname: '/payments/[id]', params: { id: item.id } })
                }>
                <View style={styles.historyLeft}>
                  <View style={styles.historyIconWrap}>
                    <CheckCircle2 size={18} color={colors.success} strokeWidth={2.2} />
                  </View>
                  <View>
                    <Text style={styles.historyTitle}>
                      {item.paymentMethod ? `Paiement ${item.paymentMethod}` : 'Paiement enregistre'}
                    </Text>
                    <View style={styles.historyDateRow}>
                      <CalendarDays size={13} color={colors.muted} />
                      <Text style={styles.historyDate}>
                        {item.paidAt ? formatDate(item.paidAt) : formatMonthYear(item)}
                      </Text>
                    </View>
                  </View>
                </View>
                <Text style={styles.historyAmount}>{formatCurrency(item.amountPaid)}</Text>
              </Pressable>
            ))}
        </View>

        <View style={styles.spacer} />
      </ScrollView>

      <ResidentTabBar active="payments" />
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
    marginBottom: 16,
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
  balanceCard: {
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    marginBottom: 18,
  },
  balanceLabel: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '600',
  },
  balanceAmount: {
    marginTop: 8,
    color: colors.text,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
  },
  balanceAmountDebt: {
    color: colors.danger,
  },
  balanceAmountCredit: {
    color: colors.success,
  },
  balanceDue: {
    marginTop: 8,
    color: colors.muted,
    fontSize: 13,
    fontWeight: '500',
  },
  summaryGrid: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 14,
    gap: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  summaryLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  summaryValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  summaryDebtValue: {
    color: colors.danger,
  },
  summaryCreditValue: {
    color: colors.success,
  },
  payNowButton: {
    marginTop: 14,
    alignSelf: 'flex-start',
    borderRadius: 12,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  payNowText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: '700',
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 10,
  },
  list: {
    gap: 10,
    marginBottom: 18,
  },
  invoiceCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: 16,
  },
  invoiceTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  invoiceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    paddingRight: 10,
  },
  invoiceIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invoiceTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  invoiceDate: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 12,
    fontWeight: '500',
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  amountRows: {
    marginTop: 12,
    gap: 7,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  amountLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  amountValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  remainingValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  historyCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    paddingRight: 8,
  },
  historyIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  historyDateRow: {
    marginTop: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  historyDate: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '500',
  },
  historyAmount: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  stateCard: {
    minHeight: 112,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  stateTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
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
    lineHeight: 18,
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
  spacer: {
    height: 8,
  },
});
