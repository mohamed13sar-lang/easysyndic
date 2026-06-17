import { router, useFocusEffect } from 'expo-router';
import {
  Bell,
  Bot,
  Building2,
  ChevronRight,
  ClipboardList,
  CreditCard,
  Home,
  LogOut,
  Megaphone,
  Send,
  ShieldCheck,
  Users,
} from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BrandLogo } from '@/components/BrandLogo';
import { useAuth } from '@/hooks/use-auth';
import {
  formatSyndicResidenceAddress,
  useSelectedSyndicResidence,
} from '@/hooks/use-selected-syndic-residence';
import { ApiError } from '@/lib/api/client';
import {
  getSyndicDashboardStats,
  SyndicDashboardStats,
} from '@/services/syndic-dashboard-service';
import { Announcement } from '@/services/announcements-service';
import { getSyndicAnnouncements } from '@/services/syndic-announcements-service';
import { getMySyndicPermissions, PermissionMap } from '@/services/syndic-team-service';

type IconComponent = React.ComponentType<{
  size?: number;
  color?: string;
  strokeWidth?: number;
}>;

type KpiCardProps = {
  title: string;
  value: string;
  helper: string;
  icon: IconComponent;
  onPress: () => void;
};

type QuickActionProps = {
  title: string;
  subtitle: string;
  icon: IconComponent;
  onPress: () => void;
  module?: string;
  action?: string;
};

const accent = '#0FA19A';
const accentSoft = '#E7F7F6';
const textPrimary = '#1F2328';
const textSecondary = '#6B7280';
const border = '#E5E7EB';
const ownerRoles = new Set(['SUPER_ADMIN', 'SYNDIC']);

function getFullPermissions(): PermissionMap {
  return {
    dashboard: {
      viewDashboard: true,
      viewRevenueKpi: true,
      viewUnpaidKpi: true,
      viewPendingPaymentsKpi: true,
      viewComplaintsKpi: true,
      viewResidentsKpi: true,
      viewApartmentsKpi: true,
    },
    residences: {
      viewList: true,
      viewDetails: true,
      viewAddress: true,
      viewFinancialSummary: true,
      viewApartmentsCount: true,
      viewResidentsCount: true,
    },
    apartments: {
      viewList: true,
      viewDetails: true,
      viewOwnerName: true,
      viewResidentName: true,
      viewBalance: true,
      viewPaymentStatus: true,
      viewUnpaidAmount: true,
    },
    residents: {
      viewList: true,
      viewDetails: true,
      viewPhone: true,
      viewEmail: true,
      viewApartment: true,
      viewBalance: true,
      viewPaymentHistory: true,
    },
    payments: {
      viewList: true,
      viewAmount: true,
      viewUnpaid: true,
      viewPaid: true,
      viewPending: true,
      viewHistory: true,
      viewProofImage: true,
      declarePayment: true,
      validatePayment: true,
      refusePayment: true,
      editPayment: true,
      deletePayment: true,
      exportPayments: true,
    },
    complaints: {
      viewList: true,
      viewDetails: true,
      viewImages: true,
      listenAudio: true,
      updateStatus: true,
      assignComplaint: true,
      closeComplaint: true,
      deleteComplaint: true,
    },
    announcements: { viewList: true, create: true, edit: true, delete: true, publish: true },
    notifications: { viewList: true, send: true },
    assistant: { access: true },
    settings: { manageTeam: true, manageResidence: true },
    team: {
      viewTeam: true,
      createMember: true,
      editMember: true,
      deleteMember: true,
      editPermissions: true,
    },
  };
}

function formatNumber(value: number) {
  return value.toLocaleString('fr-FR', { maximumFractionDigits: 0 });
}

function formatCurrency(value: number) {
  return `${formatNumber(value)} MAD`;
}

function KpiCard({ title, value, helper, icon: Icon, onPress }: KpiCardProps) {
  return (
    <Pressable style={styles.kpiCard} onPress={onPress}>
      <View style={styles.kpiTopRow}>
        <View style={styles.kpiIcon}>
          <Icon size={19} color={accent} strokeWidth={2.2} />
        </View>
        <ChevronRight size={17} color="#9CA3AF" strokeWidth={2.1} />
      </View>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiTitle}>{title}</Text>
      <Text style={styles.kpiHelper}>{helper}</Text>
    </Pressable>
  );
}

function QuickAction({ title, subtitle, icon: Icon, onPress }: QuickActionProps) {
  return (
    <Pressable style={styles.quickAction} onPress={onPress}>
      <View style={styles.quickIcon}>
        <Icon size={18} color={accent} strokeWidth={2.2} />
      </View>
      <View style={styles.quickTextWrap}>
        <Text style={styles.quickTitle}>{title}</Text>
        <Text style={styles.quickSubtitle}>{subtitle}</Text>
      </View>
      <ChevronRight size={18} color="#9CA3AF" strokeWidth={2.1} />
    </Pressable>
  );
}

function LoadingState() {
  return (
    <View style={styles.stateCard}>
      <ActivityIndicator color={accent} />
      <Text style={styles.stateTitle}>Chargement du tableau de bord</Text>
      <Text style={styles.stateText}>Nous préparons les indicateurs de votre portefeuille.</Text>
    </View>
  );
}

export default function SyndicDashboardScreen() {
  const { user, token, logout } = useAuth();
  const {
    selectedResidence,
    isLoading: isResidenceLoading,
    error: residenceError,
  } = useSelectedSyndicResidence();
  const [stats, setStats] = useState<SyndicDashboardStats | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [permissions, setPermissions] = useState<PermissionMap | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const syndicName = user?.fullName ?? 'Syndic';
  const firstName = syndicName.split(' ').filter(Boolean)[0] ?? 'Syndic';

  const cards = useMemo(
    () =>
      stats
        ? [
            {
              title: 'Résidences',
              value: formatNumber(stats.totalResidences),
              helper: 'Portefeuille géré',
              icon: Building2,
              onPress: () => router.push('/syndic/residences'),
            },
            {
              title: 'Appartements',
              value: formatNumber(stats.totalApartments),
              helper: 'Lots suivis',
              icon: Home,
              onPress: () => router.push('/syndic/apartments'),
            },
            {
              title: 'Résidents',
              value: formatNumber(stats.totalResidents),
              helper: 'Contacts actifs',
              icon: Users,
              onPress: () => router.push('/syndic/residents'),
            },
            {
              title: 'Impayés',
              value: formatNumber(stats.unpaidPaymentsCount),
              helper: formatCurrency(stats.unpaidPaymentsAmount),
              icon: CreditCard,
              onPress: () =>
                router.push({ pathname: '/syndic/payments', params: { filter: 'unpaid' } }),
            },
            {
              title: 'Réclamations ouvertes',
              value: formatNumber(stats.openComplaintsCount),
              helper: `${formatNumber(stats.resolvedComplaintsCount)} résolues`,
              icon: ClipboardList,
              onPress: () => router.push('/syndic/complaints'),
            },
            {
              title: 'Notifications',
              value: formatNumber(stats.notificationsSentCount),
              helper: 'Messages envoyés',
              icon: Bell,
              onPress: () => router.push('/syndic/notifications'),
            },
          ]
        : [],
    [stats],
  );

  const quickActions: QuickActionProps[] = [
    {
      title: 'Gérer les appartements',
      subtitle: 'Lots, blocs et disponibilité',
      icon: Home,
      onPress: () => router.push('/syndic/apartments'),
    },
    {
      title: 'Gérer les résidents',
      subtitle: 'Fiches résidents et affectations',
      icon: Users,
      onPress: () => router.push('/syndic/residents'),
    },
    {
      title: 'Gérer les paiements',
      subtitle: 'Suivi des charges et impayés',
      icon: CreditCard,
      onPress: () => router.push('/syndic/payments'),
    },
    {
      title: 'Gérer les réclamations',
      subtitle: 'Demandes ouvertes et résolues',
      icon: ClipboardList,
      onPress: () => router.push('/syndic/complaints'),
    },
    {
      title: 'Envoyer une notification',
      subtitle: 'Informer les résidents',
      icon: Send,
      onPress: () => router.push('/syndic/notifications'),
    },
    {
      title: 'Gérer les annonces',
      subtitle: 'Assemblée, travaux et alertes',
      icon: Megaphone,
      onPress: () => router.push('/syndic/announcements' as never),
    },
      {
      title: 'Equipe Syndicat',
      subtitle: 'Gerer caissier, gardien, secretaire et permissions',
      icon: ShieldCheck,
      onPress: () => router.push('/syndic/team' as never),
    },
  ];

  const visibleQuickActions = quickActions.filter((action) => {
    if (!permissions) return true;
    if (action.onPress.toString().includes('/syndic/apartments')) {
      return Boolean(permissions.apartments?.viewList);
    }
    if (action.onPress.toString().includes('/syndic/residents')) {
      return Boolean(permissions.residents?.viewList);
    }
    if (action.onPress.toString().includes('/syndic/payments')) {
      return Boolean(permissions.payments?.viewList);
    }
    if (action.onPress.toString().includes('/syndic/complaints')) {
      return Boolean(permissions.complaints?.viewList);
    }
    if (action.onPress.toString().includes('/syndic/notifications')) {
      return Boolean(permissions.notifications?.send);
    }
    if (action.onPress.toString().includes('/syndic/announcements')) {
      return Boolean(permissions.announcements?.viewList);
    }
    if (action.onPress.toString().includes('/syndic/team')) {
      return Boolean(permissions.team?.viewTeam);
    }
    return true;
  });

  const visibleCards = cards.filter((card) => {
    if (!permissions) return true;
    if (!permissions.dashboard?.viewDashboard) return false;
    if (card.onPress.toString().includes('/syndic/residences')) {
      return Boolean(permissions.residences?.viewList);
    }
    if (card.onPress.toString().includes('/syndic/apartments')) {
      return Boolean(permissions.dashboard?.viewApartmentsKpi);
    }
    if (card.onPress.toString().includes('/syndic/residents')) {
      return Boolean(permissions.dashboard?.viewResidentsKpi);
    }
    if (card.onPress.toString().includes('/syndic/payments')) {
      return Boolean(permissions.dashboard?.viewUnpaidKpi);
    }
    if (card.onPress.toString().includes('/syndic/complaints')) {
      return Boolean(permissions.dashboard?.viewComplaintsKpi);
    }
    return true;
  });

  const loadStats = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const data = await getSyndicDashboardStats(token);
      setStats(data);
      if (selectedResidence) {
        if (user?.role && ownerRoles.has(user.role)) {
          setPermissions(getFullPermissions());
        } else {
          try {
            setPermissions(await getMySyndicPermissions(token, selectedResidence.id));
          } catch (permissionsError) {
            if (permissionsError instanceof ApiError && permissionsError.status === 404) {
              console.log('[permissions] endpoint unavailable, showing default syndic actions');
              setPermissions(null);
            } else {
              throw permissionsError;
            }
          }
        }
        const announcementData = await getSyndicAnnouncements(token, selectedResidence.id);
        setAnnouncements(announcementData.slice(0, 3));
      } else {
        setPermissions(null);
        setAnnouncements([]);
      }
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : 'Impossible de charger le tableau de bord.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedResidence, token, user?.role]);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats]),
  );

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const showLoading = isLoading || isResidenceLoading;
  const shownError = error || residenceError;
  const hasNoResidence = !isResidenceLoading && !selectedResidence;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <BrandLogo containerStyle={styles.headerLogo} />
            <Text style={styles.eyebrow}>Tableau de bord syndic</Text>
            <Text style={styles.title}>Bonjour, {firstName}</Text>
            <Text style={styles.subtitle}>{syndicName}</Text>
            <Text style={styles.headerMeta}>
              {selectedResidence
                ? selectedResidence.name
                : 'Sélectionnez une résidence pour affiner le suivi.'}
            </Text>
          </View>

          <Pressable style={styles.logoutButton} onPress={handleLogout}>
            <LogOut size={18} color={textPrimary} strokeWidth={2.1} />
            <Text style={styles.logoutText}>Déconnexion</Text>
          </Pressable>
        </View>

        {hasNoResidence ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Building2 size={24} color={accent} strokeWidth={2.2} />
            </View>
            <Text style={styles.emptyTitle}>Aucune résidence sélectionnée</Text>
            <Text style={styles.emptyText}>
              Choisissez une résidence pour consulter les indicateurs, gérer les lots et suivre les
              paiements.
            </Text>
            <Pressable style={styles.primaryButton} onPress={() => router.push('/syndic/residences')}>
              <Text style={styles.primaryButtonText}>Choisir une résidence</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable style={styles.residenceCard} onPress={() => router.push('/syndic/residences')}>
            <View style={styles.residenceLeft}>
              <View style={styles.residenceIcon}>
                <Building2 size={21} color={accent} strokeWidth={2.2} />
              </View>
              <View style={styles.residenceTextWrap}>
                <Text style={styles.sectionOverline}>Résidence sélectionnée</Text>
                <Text style={styles.residenceName}>
                  {isResidenceLoading ? 'Chargement...' : selectedResidence?.name}
                </Text>
                {!!selectedResidence && (
                  <Text style={styles.residenceAddress}>
                    {formatSyndicResidenceAddress(selectedResidence)}
                  </Text>
                )}
              </View>
            </View>
            <Text style={styles.changeResidenceText}>Changer</Text>
          </Pressable>
        )}

        <Pressable style={styles.assistantCard} onPress={() => router.push('/syndic/assistant' as never)}>
          <View style={styles.assistantIcon}>
            <Bot size={22} color={accent} strokeWidth={2.2} />
          </View>
          <View style={styles.assistantCopy}>
            <Text style={styles.assistantTitle}>Assistant Syndic IA</Text>
            <Text style={styles.assistantSubtitle}>Aide juridique, AG, annonces et résumés</Text>
          </View>
          <ChevronRight size={18} color="#D1D5DB" strokeWidth={2.1} />
        </Pressable>

        {showLoading && <LoadingState />}

        {!showLoading && !!shownError && (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>Impossible de charger les données</Text>
            <Text style={styles.errorText}>{shownError}</Text>
            <Pressable style={styles.secondaryButton} onPress={loadStats}>
              <Text style={styles.secondaryButtonText}>Réessayer</Text>
            </Pressable>
          </View>
        )}

        {!showLoading && !shownError && visibleCards.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Indicateurs clés</Text>
              <Text style={styles.sectionHint}>Vue consolidée</Text>
            </View>
            <View style={styles.kpiGrid}>
              {visibleCards.map((card) => (
                <KpiCard
                  key={card.title}
                  title={card.title}
                  value={card.value}
                  helper={card.helper}
                  icon={card.icon}
                  onPress={card.onPress}
                />
              ))}
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Actions rapides</Text>
              <Text style={styles.sectionHint}>Gestion courante</Text>
            </View>
            <View style={styles.actionsGrid}>
              {visibleQuickActions.map((action) => (
                <QuickAction
                  key={action.title}
                  title={action.title}
                  subtitle={action.subtitle}
                  icon={action.icon}
                  onPress={action.onPress}
                />
              ))}
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Dernières annonces</Text>
              <Pressable onPress={() => router.push('/syndic/announcements' as never)}>
                <Text style={styles.sectionLink}>Voir plus</Text>
              </Pressable>
            </View>
            <View style={styles.announcementsList}>
              {announcements.length > 0 ? (
                announcements.map((announcement) => (
                  <Pressable
                    key={announcement.id}
                    style={styles.announcementCard}
                    onPress={() => router.push('/syndic/announcements' as never)}>
                    <Text style={styles.announcementTitle}>{announcement.title}</Text>
                    <Text style={styles.announcementText} numberOfLines={2}>
                      {announcement.message}
                    </Text>
                  </Pressable>
                ))
              ) : (
                <View style={styles.stateCard}>
                  <Text style={styles.stateText}>Aucune annonce récente.</Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFB',
  },
  content: {
    width: '100%',
    maxWidth: 1120,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
  },
  header: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: border,
    backgroundColor: '#FFFFFF',
    padding: 22,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    boxShadow: '0 16px 40px rgba(15, 23, 42, 0.08)',
    elevation: 2,
  },
  headerCopy: {
    flex: 1,
    minWidth: 220,
  },
  headerLogo: {
    marginBottom: 10,
  },
  eyebrow: {
    color: accent,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  title: {
    marginTop: 8,
    color: textPrimary,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 6,
    color: textPrimary,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
  headerMeta: {
    marginTop: 6,
    color: textSecondary,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  logoutButton: {
    minHeight: 42,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: border,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 13,
  },
  logoutText: {
    color: textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  residenceCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: border,
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  residenceLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  residenceIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  residenceTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  sectionOverline: {
    color: textSecondary,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  residenceName: {
    marginTop: 3,
    color: textPrimary,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
  },
  residenceAddress: {
    marginTop: 3,
    color: textSecondary,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  changeResidenceText: {
    color: accent,
    fontSize: 13,
    fontWeight: '800',
  },
  assistantCard: {
    borderRadius: 20,
    backgroundColor: textPrimary,
    padding: 16,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  assistantIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(15, 161, 154, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  assistantCopy: {
    flex: 1,
    minWidth: 0,
  },
  assistantTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '800',
  },
  assistantSubtitle: {
    marginTop: 3,
    color: '#D1D5DB',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  sectionHeader: {
    marginTop: 4,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitle: {
    color: textPrimary,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
  },
  sectionHint: {
    color: textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  sectionLink: {
    color: accent,
    fontSize: 13,
    fontWeight: '800',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 22,
  },
  kpiCard: {
    minHeight: 156,
    minWidth: 230,
    flexGrow: 1,
    flexBasis: '31%',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: border,
    backgroundColor: '#FFFFFF',
    padding: 16,
    boxShadow: '0 10px 28px rgba(15, 23, 42, 0.06)',
    elevation: 1,
  },
  kpiTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kpiIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiValue: {
    marginTop: 20,
    color: textPrimary,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
  },
  kpiTitle: {
    marginTop: 4,
    color: textPrimary,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
  },
  kpiHelper: {
    marginTop: 3,
    color: textSecondary,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  announcementsList: {
    gap: 10,
  },
  announcementCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: border,
    backgroundColor: '#FFFFFF',
    padding: 14,
  },
  announcementTitle: {
    color: textPrimary,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
  },
  announcementText: {
    marginTop: 4,
    color: textSecondary,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  quickAction: {
    minHeight: 76,
    minWidth: 300,
    flexGrow: 1,
    flexBasis: '48%',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: border,
    backgroundColor: '#FFFFFF',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quickIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  quickTitle: {
    color: textPrimary,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '800',
  },
  quickSubtitle: {
    marginTop: 2,
    color: textSecondary,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
  stateCard: {
    minHeight: 176,
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
    lineHeight: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  stateText: {
    color: textSecondary,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    textAlign: 'center',
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: border,
    backgroundColor: '#FFFFFF',
    padding: 22,
    marginBottom: 20,
    alignItems: 'center',
    boxShadow: '0 10px 28px rgba(15, 23, 42, 0.06)',
    elevation: 1,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    color: textPrimary,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyText: {
    maxWidth: 520,
    marginTop: 8,
    color: textSecondary,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '500',
    textAlign: 'center',
  },
  primaryButton: {
    marginTop: 16,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryButton: {
    marginTop: 6,
    minHeight: 42,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#B7D9D3',
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
});

