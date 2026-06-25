import { router, useFocusEffect } from 'expo-router';
import {
  Bell,
  CalendarDays,
  CreditCard,
  Droplets,
  FileText,
  Megaphone,
  PlusCircle,
  Wrench,
} from 'lucide-react-native';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useMemo, useState } from 'react';
import { ResidentTabBar, useResidentTabBarInset } from '@/components/ResidentTabBar';
import { BrandLogo } from '@/components/BrandLogo';
import { colors } from '@/constants/colors';
import { useAuth } from '@/hooks/use-auth';
import { formatApartmentLabel, useSelectedResidence } from '@/hooks/use-selected-residence';
import { ApiError } from '@/lib/api/client';
import {
  Announcement,
  AnnouncementPriority,
  AnnouncementType,
  getMyAnnouncements,
} from '@/services/announcements-service';
import {
  getMyPayments,
  getMyPaymentsSummary,
  PaymentStatus,
  ResidentPayment,
  ResidentPaymentSummary,
} from '@/services/payments-service';
import {
  ComplaintStatus as ApiComplaintStatus,
  getMyComplaints,
  ResidentComplaint,
} from '@/services/complaints-service';

type ComplaintStatus = 'En cours' | 'Resolu';

type QuickActionProps = {
  title: string;
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  iconBg: string;
  iconColor: string;
  onPress: () => void;
};

type ComplaintItemProps = {
  title: string;
  status: ComplaintStatus;
  date: string;
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
};

type AnnouncementItemProps = {
  item: Announcement;
};

function formatCurrency(amount: number) {
  return `${amount.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} MAD`;
}

function formatSignedCurrency(amount: number) {
  if (amount > 0) return `+${formatCurrency(amount)}`;
  if (amount < 0) return `-${formatCurrency(Math.abs(amount))}`;
  return formatCurrency(0);
}

function formatPaymentStatus(status?: PaymentStatus) {
  if (status === 'PAYE') return 'Payé';
  if (status === 'PARTIELLEMENT_PAYE') return 'Paiement partiel';
  if (status === 'EN_RETARD') return 'En retard';
  if (status === 'EXONERE') return 'Exonéré';
  if (status === 'NON_PAYE') return 'Non payé';
  return 'Aucun paiement';
}

function resolveComplaintStatus(status: ApiComplaintStatus): ComplaintStatus {
  return status === 'RESOLUE' || status === 'FERMEE' ? 'Resolu' : 'En cours';
}

const emptyPaymentSummary: ResidentPaymentSummary = {
  amountDueTotal: 0,
  amountPaidTotal: 0,
  balance: 0,
  remainingToPay: 0,
  creditBalance: 0,
  status: 'BALANCED',
};

const announcementTypeLabels: Record<AnnouncementType, string> = {
  ASSEMBLEE_GENERALE: 'Assemblée générale',
  DECES: 'Décès',
  COUPURE_ELECTRICITE: "Coupure d'électricité",
  COUPURE_EAU: "Coupure d'eau",
  TRAVAUX: 'Travaux',
  NETTOYAGE: 'Nettoyage',
  SECURITE: 'Sécurité',
  AUTRE: 'Annonce',
};

const announcementPriorityLabels: Record<AnnouncementPriority, string> = {
  NORMAL: 'Normal',
  IMPORTANT: 'Important',
  URGENT: 'Urgent',
};

function formatAnnouncementDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(value));
}

function getBalancePresentation(summary: ResidentPaymentSummary) {
  if (summary.status === 'DEBT') {
    return {
      label: 'Reste à payer',
      amount: summary.balance,
      badge: 'Solde débiteur',
      description: 'Un solde reste à régler',
      cardStyle: styles.balanceCardDebt,
      labelStyle: styles.balanceTextDebt,
      amountStyle: styles.balanceAmountDebt,
      dueStyle: styles.balanceDueDebt,
      pillStyle: styles.balancePillDebt,
      pillTextStyle: styles.balancePillTextDebt,
    };
  }

  if (summary.status === 'CREDIT') {
    return {
      label: 'Solde créditeur',
      amount: summary.balance,
      badge: 'Crédit disponible',
      description: 'Votre compte présente une avance',
      cardStyle: styles.balanceCardCredit,
      labelStyle: styles.balanceTextCredit,
      amountStyle: styles.balanceAmountCredit,
      dueStyle: styles.balanceDueCredit,
      pillStyle: styles.balancePillCredit,
      pillTextStyle: styles.balancePillTextCredit,
    };
  }

  return {
    label: 'Solde à jour',
    amount: 0,
    badge: 'Compte équilibré',
    description: 'Aucun impayé',
    cardStyle: styles.balanceCardBalanced,
    labelStyle: styles.balanceTextCredit,
    amountStyle: styles.balanceAmountCredit,
    dueStyle: styles.balanceDueCredit,
    pillStyle: styles.balancePillCredit,
    pillTextStyle: styles.balancePillTextCredit,
  };
}

function QuickAction({ title, icon: Icon, iconBg, iconColor, onPress }: QuickActionProps) {
  return (
    <Pressable style={styles.quickAction} onPress={onPress}>
      <View style={[styles.quickIconWrap, { backgroundColor: iconBg }]}>
        <Icon size={20} color={iconColor} strokeWidth={2.2} />
      </View>
      <Text style={styles.quickActionText}>{title}</Text>
    </Pressable>
  );
}

function ComplaintItem({ title, status, date, icon: Icon }: ComplaintItemProps) {
  const isInProgress = status === 'En cours';
  return (
    <View style={styles.complaintCard}>
      <View style={styles.complaintLeft}>
        <View style={[styles.complaintIconWrap, isInProgress ? styles.warningBg : styles.blueBg]}>
          <Icon
            size={18}
            color={isInProgress ? colors.warning : colors.blue}
            strokeWidth={2.2}
          />
        </View>
        <View>
          <Text style={styles.complaintTitle}>{title}</Text>
          <Text style={styles.complaintDate}>{date}</Text>
        </View>
      </View>
      <View style={[styles.statusPill, isInProgress ? styles.statusWarning : styles.statusSuccess]}>
        <Text
          style={[
            styles.statusText,
            { color: isInProgress ? colors.warning : colors.success },
          ]}>
          {status}
        </Text>
      </View>
    </View>
  );
}

function AnnouncementItem({ item }: AnnouncementItemProps) {
  const isUrgent = item.priority === 'URGENT';
  return (
    <Pressable
      style={[styles.announcementCard, isUrgent && styles.announcementCardUrgent]}
      onPress={() => router.push(`/announcements/${item.id}` as never)}>
      <View style={styles.announcementIconWrap}>
        <Megaphone size={18} color={colors.primary} strokeWidth={2.2} />
      </View>
      <View style={styles.announcementTextWrap}>
        <View style={styles.announcementTopRow}>
          <Text style={styles.announcementType}>{announcementTypeLabels[item.type]}</Text>
          <Text style={[styles.announcementPriority, isUrgent && styles.announcementPriorityUrgent]}>
            {announcementPriorityLabels[item.priority]}
          </Text>
        </View>
        <Text style={styles.announcementTitle}>{item.title}</Text>
        <Text style={styles.announcementSubtitle} numberOfLines={2}>
          {item.message}
        </Text>
        <Text style={styles.announcementDate}>Publié le {formatAnnouncementDate(item.publishAt)}</Text>
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const { token, user } = useAuth();
  const { selectedResidence, isLoading } = useSelectedResidence();
  const [payments, setPayments] = useState<ResidentPayment[]>([]);
  const [paymentSummary, setPaymentSummary] =
    useState<ResidentPaymentSummary>(emptyPaymentSummary);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [complaints, setComplaints] = useState<ResidentComplaint[]>([]);
  const [paymentsError, setPaymentsError] = useState('');
  const [announcementsError, setAnnouncementsError] = useState('');
  const [complaintsError, setComplaintsError] = useState('');
  const [isAnnouncementsLoading, setIsAnnouncementsLoading] = useState(false);
  const firstName = user?.fullName.split(' ').filter(Boolean)[0] ?? 'Resident';
  const residenceLabel = selectedResidence
    ? `${selectedResidence.name} - ${formatApartmentLabel(selectedResidence)}`
    : isLoading
      ? 'Chargement de votre résidence...'
      : 'Aucune résidence liée';
  const latestPayment = payments[0] ?? null;
  const balancePresentation = getBalancePresentation(paymentSummary);
  const tabBarInset = useResidentTabBarInset();

  const loadPayments = useCallback(async () => {
    if (!token || !selectedResidence) {
      setPayments([]);
      setPaymentSummary(emptyPaymentSummary);
      return;
    }

    try {
      setPaymentsError('');
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
      setPaymentsError(
        err instanceof ApiError ? err.message : 'Impossible de charger vos paiements.',
      );
    }
  }, [selectedResidence, token]);

  const loadAnnouncements = useCallback(async () => {
    if (!token || !selectedResidence) {
      setAnnouncements([]);
      setAnnouncementsError('');
      setIsAnnouncementsLoading(false);
      return;
    }

    setIsAnnouncementsLoading(true);
    setAnnouncementsError('');

    if (__DEV__) {
      console.log('[home] selectedResidenceId', selectedResidence.id);
    }

    try {
      const announcementData = await getMyAnnouncements(token, {
        residenceId: selectedResidence.id,
        limit: 3,
      });
      if (__DEV__) {
        console.log('[home] announcements returned', announcementData.length);
      }
      setAnnouncements(announcementData);
    } catch (err: unknown) {
      setAnnouncements([]);
      setAnnouncementsError(
        err instanceof ApiError ? err.message : 'Impossible de charger les annonces.',
      );
      if (__DEV__) {
        console.log(
          '[home] announcements error',
          err instanceof Error ? err.message : String(err),
        );
      }
    } finally {
      setIsAnnouncementsLoading(false);
    }
  }, [selectedResidence, token]);

  const loadComplaints = useCallback(async () => {
    if (!token || !selectedResidence) {
      setComplaints([]);
      setComplaintsError('');
      return;
    }

    try {
      setComplaintsError('');
      const data = await getMyComplaints(token, {
        residenceId: selectedResidence.id,
        apartmentId: selectedResidence.apartment.id,
      });
      setComplaints(data.slice(0, 3));
    } catch (err: unknown) {
      setComplaints([]);
      setComplaintsError(
        err instanceof ApiError ? err.message : 'Impossible de charger les réclamations.',
      );
    }
  }, [selectedResidence, token]);

  useFocusEffect(
    useCallback(() => {
      loadPayments();
      loadAnnouncements();
      loadComplaints();
    }, [loadAnnouncements, loadComplaints, loadPayments]),
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: tabBarInset + 24 }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <BrandLogo variant="mark" />
            <Pressable style={styles.headerTextWrap} onPress={() => router.push('/residence/details')}>
              <Text style={styles.greeting}>Bonjour, {firstName}</Text>
              <Text style={styles.subGreeting}>{residenceLabel}</Text>
            </Pressable>
          </View>
          <Pressable style={styles.bellButton} onPress={() => router.push('/notifications')}>
            <Bell size={20} color={colors.text} strokeWidth={2.1} />
            <View style={styles.bellDot} />
          </Pressable>
        </View>

        <View style={[styles.balanceCard, balancePresentation.cardStyle]}>
          <Text style={[styles.balanceLabel, balancePresentation.labelStyle]}>
            {balancePresentation.label}
          </Text>
          <Text style={[styles.balanceAmount, balancePresentation.amountStyle]}>
            {formatSignedCurrency(balancePresentation.amount)}
          </Text>
          <View style={[styles.paymentStatusPill, balancePresentation.pillStyle]}>
            <Text style={[styles.paymentStatusText, balancePresentation.pillTextStyle]}>
              {paymentsError || balancePresentation.badge}
            </Text>
          </View>
          <Text style={[styles.balanceDue, balancePresentation.dueStyle]}>
            {latestPayment
              ? `${balancePresentation.description} · Dernier statut : ${formatPaymentStatus(latestPayment.status)}`
              : balancePresentation.description}
          </Text>
          <Pressable style={styles.payNowButton} onPress={() => router.push('/payments')}>
            <Text style={styles.payNowText}>Voir mes paiements</Text>
          </Pressable>
        </View>

        <View style={styles.announcementsHeader}>
          <Text style={styles.sectionTitle}>Dernières annonces</Text>
          <Pressable onPress={() => router.push('/announcements' as never)}>
            <Text style={styles.seeMoreText}>Voir plus</Text>
          </Pressable>
        </View>
        <View style={styles.sectionList}>
          {isAnnouncementsLoading ? (
            <View style={styles.emptyAnnouncementCard}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.emptyAnnouncementText}>Chargement des annonces...</Text>
            </View>
          ) : announcementsError ? (
            <View style={styles.emptyAnnouncementCard}>
              <Text style={styles.emptyAnnouncementText}>{announcementsError}</Text>
            </View>
          ) : announcements.length > 0 ? (
            announcements.map((item) => <AnnouncementItem key={item.id} item={item} />)
          ) : (
            <View style={styles.emptyAnnouncementCard}>
              <Text style={styles.emptyAnnouncementText}>Aucune annonce pour le moment.</Text>
            </View>
          )}
        </View>

        <View style={styles.quickGrid}>
          <QuickAction
            title="Nouvelle réclamation"
            icon={PlusCircle}
            iconBg={colors.primaryLight}
            iconColor={colors.primary}
            onPress={() => router.push('/complaints/new')}
          />
          <QuickAction
            title="Mes paiements"
            icon={CreditCard}
            iconBg={colors.blueLight}
            iconColor={colors.blue}
            onPress={() => router.push('/payments')}
          />
          <QuickAction
            title="Documents"
            icon={FileText}
            iconBg="#EEF2FF"
            iconColor="#6366F1"
            onPress={() => router.push('/documents')}
          />
          <QuickAction
            title="Annonces"
            icon={Megaphone}
            iconBg="#F3F4F6"
            iconColor="#6B7280"
            onPress={() => router.push('/announcements' as never)}
          />
          <QuickAction
            title="Assemblées"
            icon={CalendarDays}
            iconBg={colors.successLight}
            iconColor={colors.success}
            onPress={() => router.push('/assemblies' as never)}
          />
        </View>

        <Text style={styles.sectionTitle}>Derniers paiements</Text>
        <View style={styles.sectionList}>
          {paymentsError ? (
            <View style={styles.emptyAnnouncementCard}>
              <Text style={styles.emptyAnnouncementText}>{paymentsError}</Text>
            </View>
          ) : payments.length > 0 ? (
            payments.slice(0, 3).map((payment) => (
              <Pressable
                key={payment.id}
                style={styles.paymentMiniCard}
                onPress={() =>
                  router.push({ pathname: '/payments/[id]', params: { id: payment.id } })
                }>
                <View style={styles.paymentMiniCopy}>
                  <Text style={styles.complaintTitle}>
                    Charges {payment.month}/{payment.year}
                  </Text>
                  <Text style={styles.complaintDate}>{formatPaymentStatus(payment.status)}</Text>
                </View>
                <Text style={styles.paymentMiniAmount}>
                  {formatCurrency(payment.remainingAmount)}
                </Text>
              </Pressable>
            ))
          ) : (
            <View style={styles.emptyAnnouncementCard}>
              <Text style={styles.emptyAnnouncementText}>Aucun paiement recent.</Text>
            </View>
          )}
        </View>

        <Text style={styles.sectionTitle}>Reclamations recentes</Text>
        <View style={styles.sectionList}>
          {complaintsError ? (
            <View style={styles.emptyAnnouncementCard}>
              <Text style={styles.emptyAnnouncementText}>{complaintsError}</Text>
            </View>
          ) : complaints.length > 0 ? (
            complaints.map((complaint) => (
              <ComplaintItem
                key={complaint.id}
                title={complaint.title}
                status={resolveComplaintStatus(complaint.status)}
                date={formatAnnouncementDate(complaint.createdAt)}
                icon={complaint.category === 'EAU' ? Droplets : Wrench}
              />
            ))
          ) : (
            <View style={styles.emptyAnnouncementCard}>
              <Text style={styles.emptyAnnouncementText}>Aucune reclamation recente.</Text>
            </View>
          )}
        </View>

        <View style={styles.spacer} />
      </ScrollView>

      <ResidentTabBar active="home" />
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  headerLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingRight: 12,
  },
  headerTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  greeting: {
    color: colors.text,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
  },
  subGreeting: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 14,
    fontWeight: '500',
  },
  bellButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellDot: {
    position: 'absolute',
    top: 8,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
  },
  balanceCard: {
    borderRadius: 18,
    backgroundColor: colors.primary,
    padding: 20,
    marginBottom: 16,
  },
  balanceCardDebt: {
    backgroundColor: '#FFF7F7',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  balanceCardCredit: {
    backgroundColor: colors.successLight,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  balanceCardBalanced: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  balanceLabel: {
    color: '#D1FAF6',
    fontSize: 14,
    fontWeight: '600',
  },
  balanceTextDebt: {
    color: '#991B1B',
  },
  balanceTextCredit: {
    color: '#047857',
  },
  balanceAmount: {
    marginTop: 8,
    color: colors.white,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
  },
  balanceAmountDebt: {
    color: colors.danger,
  },
  balanceAmountCredit: {
    color: '#047857',
  },
  balanceDue: {
    marginTop: 8,
    color: '#CCFBF7',
    fontSize: 13,
    fontWeight: '500',
  },
  balanceDueDebt: {
    color: '#7F1D1D',
  },
  balanceDueCredit: {
    color: '#065F46',
  },
  paymentStatusPill: {
    marginTop: 12,
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  balancePillDebt: {
    backgroundColor: colors.dangerLight,
  },
  balancePillCredit: {
    backgroundColor: colors.white,
  },
  paymentStatusText: {
    fontSize: 12,
    fontWeight: '800',
  },
  balancePillTextDebt: {
    color: colors.danger,
  },
  balancePillTextCredit: {
    color: '#047857',
  },
  payNowButton: {
    marginTop: 14,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.white,
  },
  payNowText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: '700',
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
    marginBottom: 18,
  },
  quickAction: {
    width: '48%',
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 16,
    paddingHorizontal: 14,
    minHeight: 96,
    justifyContent: 'center',
  },
  quickIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  quickActionText: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 10,
  },
  sectionList: {
    gap: 10,
    marginBottom: 18,
  },
  complaintCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paymentMiniCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  paymentMiniCopy: {
    flex: 1,
    minWidth: 0,
  },
  paymentMiniAmount: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  complaintLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  complaintIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningBg: {
    backgroundColor: colors.warningLight,
  },
  blueBg: {
    backgroundColor: colors.blueLight,
  },
  complaintTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  complaintDate: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 12,
    fontWeight: '500',
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusWarning: {
    backgroundColor: colors.warningLight,
  },
  statusSuccess: {
    backgroundColor: colors.successLight,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  announcementCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  announcementCardUrgent: {
    borderColor: '#FECACA',
    backgroundColor: '#FFF7F7',
  },
  announcementIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  announcementTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  announcementTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  announcementType: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  announcementPriority: {
    color: colors.success,
    fontSize: 11,
    fontWeight: '800',
  },
  announcementPriorityUrgent: {
    color: colors.danger,
  },
  announcementTitle: {
    marginTop: 3,
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  announcementSubtitle: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 12,
    fontWeight: '500',
  },
  announcementDate: {
    marginTop: 5,
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '700',
  },
  announcementsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 2,
  },
  seeMoreText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  emptyAnnouncementCard: {
    minHeight: 64,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
  },
  emptyAnnouncementText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  spacer: {
    height: 8,
  },
});
