import { router, useFocusEffect } from 'expo-router';
import {
  ClipboardList,
  CreditCard,
  Droplets,
  FileText,
  Home,
  Lightbulb,
  Plus,
  Search,
  User,
  Wrench,
} from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import { useSelectedResidence } from '@/hooks/use-selected-residence';
import { ApiError } from '@/lib/api/client';
import {
  ComplaintCategory,
  ComplaintStatus as ApiComplaintStatus,
  getMyComplaints,
  ResidentComplaint,
} from '@/services/complaints-service';

type FilterTab = 'Toutes' | 'En cours' | 'Resolues';
type ComplaintStatus = 'En cours' | 'Resolu' | 'En attente';
type ComplaintIcon = 'droplets' | 'wrench' | 'lightbulb';

const categoryLabels: Record<ComplaintCategory, string> = {
  ASCENSEUR: 'Ascenseur',
  EAU: 'Plomberie',
  ELECTRICITE: 'Electricite',
  NETTOYAGE: 'Nettoyage',
  SECURITE: 'Securite',
  PARKING: 'Parking',
  BRUIT: 'Bruit',
  ECLAIRAGE: 'Eclairage',
  PORTE_GARAGE: 'Porte garage',
  CAMERA: 'Camera',
  VOISINAGE: 'Voisinage',
  AUTRE: 'Autre',
};

function resolveIcon(name: ComplaintIcon) {
  if (name === 'droplets') return Droplets;
  if (name === 'wrench') return Wrench;
  return Lightbulb;
}

function resolveComplaintIcon(category: ComplaintCategory): ComplaintIcon {
  if (category === 'EAU') return 'droplets';
  if (category === 'ASCENSEUR') return 'wrench';
  return 'lightbulb';
}

function resolveStatus(status: ApiComplaintStatus): ComplaintStatus {
  if (status === 'RESOLUE' || status === 'FERMEE') return 'Resolu';
  if (status === 'NOUVELLE' || status === 'VUE') return 'En attente';
  return 'En cours';
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function BottomTab({
  title,
  active,
  onPress,
  icon: Icon,
}: {
  title: string;
  active?: boolean;
  onPress: () => void;
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
}) {
  return (
    <Pressable style={styles.bottomTab} onPress={onPress}>
      <Icon size={20} color={active ? colors.primary : '#9CA3AF'} strokeWidth={2.2} />
      <Text style={[styles.bottomTabText, active && styles.bottomTabTextActive]}>{title}</Text>
    </Pressable>
  );
}

export default function ComplaintsScreen() {
  const { token } = useAuth();
  const {
    selectedResidence,
    isLoading: isResidenceLoading,
    error: residenceError,
  } = useSelectedResidence();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('Toutes');
  const [complaints, setComplaints] = useState<ResidentComplaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadComplaints = useCallback(async () => {
    if (!token || !selectedResidence) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const data = await getMyComplaints(token, {
        residenceId: selectedResidence.id,
        apartmentId: selectedResidence.apartment.id,
      });
      setComplaints(data);
    } catch (err: unknown) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Impossible de charger vos réclamations.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [selectedResidence, token]);

  useFocusEffect(
    useCallback(() => {
      loadComplaints();
    }, [loadComplaints]),
  );

  const counters = useMemo(() => {
    const inProgress = complaints.filter((c) => resolveStatus(c.status) === 'En cours').length;
    const waiting = complaints.filter((c) => resolveStatus(c.status) === 'En attente').length;
    const resolved = complaints.filter((c) => resolveStatus(c.status) === 'Resolu').length;
    return { inProgress, waiting, resolved };
  }, [complaints]);

  const filteredComplaints = useMemo(() => {
    const term = search.trim().toLowerCase();
    return complaints.filter((item) => {
      const status = resolveStatus(item.status);
      const category = categoryLabels[item.category];
      const byFilter =
        activeFilter === 'Toutes' ||
        (activeFilter === 'En cours' && status === 'En cours') ||
        (activeFilter === 'Resolues' && status === 'Resolu');

      const bySearch =
        term.length === 0 ||
        item.title.toLowerCase().includes(term) ||
        category.toLowerCase().includes(term) ||
        item.description.toLowerCase().includes(term);

      return byFilter && bySearch;
    });
  }, [activeFilter, complaints, search]);

  const renderStatusBadge = (status: ComplaintStatus) => {
    if (status === 'En cours') {
      return (
        <View style={[styles.statusBadge, { backgroundColor: colors.warningLight }]}>
          <Text style={[styles.statusText, { color: colors.warning }]}>{status}</Text>
        </View>
      );
    }

    if (status === 'Resolu') {
      return (
        <View style={[styles.statusBadge, { backgroundColor: colors.successLight }]}>
          <Text style={[styles.statusText, { color: colors.success }]}>{status}</Text>
        </View>
      );
    }

    return (
      <View style={[styles.statusBadge, { backgroundColor: colors.dangerLight }]}>
        <Text style={[styles.statusText, { color: colors.danger }]}>{status}</Text>
      </View>
    );
  };

  const showLoading = isLoading || isResidenceLoading;
  const shownError = error || residenceError;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Réclamations</Text>
            <Text style={styles.subtitle}>Suivez vos demandes</Text>
          </View>
          <Pressable style={styles.plusButton} onPress={() => router.push('/complaints/new')}>
            <Plus size={20} color={colors.white} strokeWidth={2.4} />
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statPill}>
            <Text style={styles.statText}>{counters.inProgress} En cours</Text>
          </View>
          <View style={styles.statPill}>
            <Text style={styles.statText}>{counters.waiting} En attente</Text>
          </View>
          <View style={styles.statPill}>
            <Text style={styles.statText}>{counters.resolved} Resolues</Text>
          </View>
        </View>

        <View style={styles.searchBox}>
          <Search size={18} color={colors.muted} strokeWidth={2.2} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Rechercher..."
            placeholderTextColor="#9CA3AF"
            style={styles.searchInput}
          />
        </View>

        <View style={styles.filterRow}>
          {(['Toutes', 'En cours', 'Resolues'] as FilterTab[]).map((item) => {
            const active = item === activeFilter;
            return (
              <Pressable
                key={item}
                onPress={() => setActiveFilter(item)}
                style={[styles.filterPill, active && styles.filterPillActive]}>
                <Text style={[styles.filterText, active && styles.filterTextActive]}>{item}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.list}>
          {showLoading && (
            <View style={styles.stateCard}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.stateText}>Chargement des réclamations...</Text>
            </View>
          )}

          {!showLoading && !!shownError && (
            <View style={styles.stateCard}>
              <Text style={styles.errorText}>{shownError}</Text>
              <Pressable style={styles.retryButton} onPress={loadComplaints}>
                <Text style={styles.retryText}>Réessayer</Text>
              </Pressable>
            </View>
          )}

          {!showLoading && !shownError && !selectedResidence && (
            <View style={styles.stateCard}>
              <Text style={styles.stateTitle}>Aucun appartement selectionne</Text>
              <Text style={styles.stateText}>
                Sélectionnez une résidence avant de consulter vos réclamations.
              </Text>
            </View>
          )}

          {!showLoading &&
            !shownError &&
            selectedResidence &&
            filteredComplaints.length === 0 && (
              <View style={styles.stateCard}>
                <Text style={styles.stateTitle}>Aucune réclamation</Text>
                <Text style={styles.stateText}>
                  Vos demandes pour cet appartement apparaitront ici.
                </Text>
              </View>
            )}

          {!showLoading &&
            !shownError &&
            filteredComplaints.map((item) => {
              const status = resolveStatus(item.status);
              const Icon = resolveIcon(resolveComplaintIcon(item.category));
              return (
                <Pressable
                  key={item.id}
                  style={styles.card}
                  onPress={() =>
                    router.push({ pathname: '/complaints/[id]', params: { id: item.id } })
                  }>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardLeft}>
                      <View style={styles.cardIconWrap}>
                        <Icon size={18} color={colors.primary} strokeWidth={2.2} />
                      </View>
                      <View style={styles.cardTitleWrap}>
                        <Text style={styles.cardTitle}>{item.title}</Text>
                        <Text style={styles.cardCategory}>{categoryLabels[item.category]}</Text>
                      </View>
                    </View>
                    {renderStatusBadge(status)}
                  </View>

                  <Text style={styles.cardDescription}>{item.description}</Text>
                  <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
                </Pressable>
              );
            })}
        </View>

        <View style={styles.spacer} />
      </ScrollView>

      <View style={styles.tabBar}>
        <BottomTab title="Accueil" icon={Home} onPress={() => router.push('/home')} />
        <BottomTab title="Réclamations" icon={ClipboardList} active onPress={() => {}} />
        <BottomTab title="Paiements" icon={CreditCard} onPress={() => router.push('/payments')} />
        <BottomTab title="Documents" icon={FileText} onPress={() => router.push('/documents')} />
        <BottomTab title="Profil" icon={User} onPress={() => router.push('/profile')} />
      </View>
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
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
  },
  subtitle: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 14,
    fontWeight: '500',
  },
  plusButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  statPill: {
    borderRadius: 999,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  statText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  searchBox: {
    marginTop: 14,
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
  filterRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
  },
  filterPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  filterPillActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  filterText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  filterTextActive: {
    color: colors.primary,
  },
  list: {
    marginTop: 14,
    gap: 10,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 8,
  },
  cardIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardTitleWrap: {
    flex: 1,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  cardCategory: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 12,
    fontWeight: '500',
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardDescription: {
    marginTop: 12,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  cardDate: {
    marginTop: 10,
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '500',
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
  tabBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bottomTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  bottomTabText: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '600',
  },
  bottomTabTextActive: {
    color: colors.primary,
  },
});
