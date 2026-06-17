import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  ClipboardList,
  Home,
  Pencil,
  Plus,
  Power,
  Receipt,
  UserPlus,
  Users,
} from 'lucide-react-native';
import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '@/hooks/use-auth';
import { useSelectedSyndicResidence } from '@/hooks/use-selected-syndic-residence';
import { ApiError } from '@/lib/api/client';
import {
  ApartmentProfile,
  ApartmentProfilePayment,
  getSyndicApartmentProfile,
  updateSyndicApartmentStatus,
} from '@/services/syndic-apartments-service';

function formatCurrency(value: number | null | undefined) {
  const amount = Number(value ?? 0);
  return `${amount.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} MAD`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatMonth(payment: ApartmentProfilePayment) {
  return `${String(payment.month).padStart(2, '0')}/${payment.year}`;
}

function statusLabel(status: string) {
  if (status === 'PAYE') return 'Payé';
  if (status === 'PARTIELLEMENT_PAYE') return 'Partiel';
  if (status === 'EN_RETARD') return 'En retard';
  if (status === 'EXONERE') return 'Exonéré';
  if (status === 'RESOLUE') return 'Résolue';
  if (status === 'FERMEE') return 'Fermée';
  if (status === 'EN_COURS') return 'En cours';
  if (status === 'NOUVELLE') return 'Nouvelle';
  return status.replaceAll('_', ' ');
}

function StatCard({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'neutral' | 'danger' | 'success' }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text
        style={[
          styles.statValue,
          tone === 'danger' && styles.dangerText,
          tone === 'success' && styles.successText,
        ]}>
        {value}
      </Text>
    </View>
  );
}

function Section({
  title,
  children,
  emptyText,
  isEmpty = false,
}: {
  title: string;
  children: ReactNode;
  emptyText: string;
  isEmpty?: boolean;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {isEmpty ? <Text style={styles.emptyText}>{emptyText}</Text> : children}
    </View>
  );
}

export default function SyndicApartmentProfileScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { token } = useAuth();
  const { selectedResidence } = useSelectedSyndicResidence();
  const [profile, setProfile] = useState<ApartmentProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [error, setError] = useState('');

  const loadProfile = useCallback(async () => {
    if (!token || !selectedResidence || !id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const data = await getSyndicApartmentProfile(token, selectedResidence.id, id);
      setProfile(data);
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : 'Impossible de charger le profil appartement.');
    } finally {
      setIsLoading(false);
    }
  }, [id, selectedResidence, token]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile]),
  );

  const toggleStatus = async () => {
    if (!token || !selectedResidence || !profile || isUpdatingStatus) return;

    setIsUpdatingStatus(true);
    try {
      const updated = await updateSyndicApartmentStatus(
        token,
        selectedResidence.id,
        profile.apartment.id,
        !profile.apartment.isActive,
      );
      setProfile({
        ...profile,
        apartment: { ...profile.apartment, isActive: updated.isActive },
      });
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : 'Impossible de changer le statut.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const apartment = profile?.apartment;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={18} color="#1F2328" />
          <Text style={styles.backText}>Retour</Text>
        </Pressable>

        {isLoading && (
          <View style={styles.stateCard}>
            <ActivityIndicator color="#18A7A0" />
            <Text style={styles.stateText}>Chargement du profil...</Text>
          </View>
        )}

        {!isLoading && !!error && (
          <View style={styles.stateCard}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={loadProfile}>
              <Text style={styles.retryText}>Réessayer</Text>
            </Pressable>
          </View>
        )}

        {!isLoading && !error && !profile && (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>Appartement introuvable</Text>
            <Text style={styles.stateText}>Ce profil n’est pas disponible pour cette résidence.</Text>
          </View>
        )}

        {!isLoading && !error && profile && apartment && (
          <>
            <View style={styles.hero}>
              <View style={styles.heroIcon}>
                <Home size={26} color="#0F8F89" strokeWidth={2.4} />
              </View>
              <View style={styles.heroText}>
                <Text style={styles.eyebrow}>Profil appartement</Text>
                <Text style={styles.title}>Appartement {apartment.number}</Text>
                <Text style={styles.subtitle}>
                  {profile.residence.name} · {profile.residence.city}
                </Text>
              </View>
              <View style={[styles.badge, apartment.isActive ? styles.activeBadge : styles.inactiveBadge]}>
                <Text style={[styles.badgeText, apartment.isActive ? styles.activeText : styles.inactiveText]}>
                  {apartment.isActive ? 'Actif' : 'Inactif'}
                </Text>
              </View>
            </View>

            <View style={styles.statsGrid}>
              <StatCard label="Total dû" value={formatCurrency(profile.statistics.totalDue)} />
              <StatCard label="Total payé" value={formatCurrency(profile.statistics.totalPaid)} tone="success" />
              <StatCard label="Reste" value={formatCurrency(profile.statistics.totalRemaining)} tone={profile.statistics.totalRemaining > 0 ? 'danger' : 'success'} />
              <StatCard label="Impayés" value={String(profile.statistics.unpaidCount)} tone={profile.statistics.unpaidCount > 0 ? 'danger' : 'neutral'} />
            </View>

            <View style={styles.infoGrid}>
              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>Bloc</Text>
                <Text style={styles.infoValue}>{apartment.block ?? '-'}</Text>
              </View>
              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>Étage</Text>
                <Text style={styles.infoValue}>{apartment.floor ?? '-'}</Text>
              </View>
              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>Surface</Text>
                <Text style={styles.infoValue}>{apartment.surface ? `${apartment.surface} m²` : '-'}</Text>
              </View>
              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>Cotisation</Text>
                <Text style={styles.infoValue}>{formatCurrency(apartment.monthlyFee)}</Text>
              </View>
            </View>

            <Section
              title="Résidents actuels"
              emptyText="Aucun résident actif lié à cet appartement."
              isEmpty={profile.residents.length === 0}>
              {profile.residents.map((link) => (
                <View key={link.id} style={styles.rowCard}>
                  <Users size={18} color="#18A7A0" />
                  <View style={styles.rowBody}>
                    <Text style={styles.rowTitle}>{link.user.fullName}</Text>
                    <Text style={styles.rowMeta}>
                      {link.residentType === 'OWNER' ? 'Propriétaire' : 'Locataire'} · {link.user.phone}
                    </Text>
                  </View>
                </View>
              ))}
            </Section>

            <Section
              title="Impayés"
              emptyText="Aucun impayé pour cet appartement."
              isEmpty={profile.unpaidPayments.length === 0}>
              {profile.unpaidPayments.slice(0, 5).map((payment) => (
                <View key={payment.id} style={styles.rowCard}>
                  <AlertTriangle size={18} color="#DC2626" />
                  <View style={styles.rowBody}>
                    <Text style={styles.rowTitle}>Échéance {formatMonth(payment)}</Text>
                    <Text style={styles.rowMeta}>{statusLabel(payment.status)}</Text>
                  </View>
                  <Text style={styles.debtAmount}>{formatCurrency(payment.remainingAmount)}</Text>
                </View>
              ))}
            </Section>

            <Section
              title="Historique des paiements"
              emptyText="Aucun paiement enregistré."
              isEmpty={profile.payments.length === 0}>
              {profile.payments.slice(0, 6).map((payment) => (
                <View key={payment.id} style={styles.rowCard}>
                  <Receipt size={18} color="#18A7A0" />
                  <View style={styles.rowBody}>
                    <Text style={styles.rowTitle}>Paiement {formatMonth(payment)}</Text>
                    <Text style={styles.rowMeta}>
                      {statusLabel(payment.status)} · Payé {formatCurrency(payment.amountPaid)}
                    </Text>
                  </View>
                  <Text style={styles.rowAmount}>{formatCurrency(payment.amountDue)}</Text>
                </View>
              ))}
            </Section>

            <Section
              title="Réclamations"
              emptyText="Aucune réclamation liée à cet appartement."
              isEmpty={profile.complaints.length === 0}>
              {profile.complaints.slice(0, 5).map((complaint) => (
                <Pressable
                  key={complaint.id}
                  style={styles.rowCard}
                  onPress={() => router.push({ pathname: '/syndic/complaints', params: { complaintId: complaint.id } })}>
                  <ClipboardList size={18} color="#6366F1" />
                  <View style={styles.rowBody}>
                    <Text style={styles.rowTitle}>{complaint.title}</Text>
                    <Text style={styles.rowMeta}>
                      {statusLabel(complaint.status)} · {formatDate(complaint.createdAt)}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </Section>

            <Section
              title="Activité récente"
              emptyText="Aucune activité récente."
              isEmpty={profile.latestActivity.length === 0}>
              {profile.latestActivity.map((activity) => (
                <View key={`${activity.type}-${activity.id}`} style={styles.activityRow}>
                  <View style={styles.activityDot} />
                  <View style={styles.rowBody}>
                    <Text style={styles.rowTitle}>{activity.title}</Text>
                    <Text style={styles.rowMeta}>
                      {statusLabel(activity.subtitle)} · {formatDate(activity.createdAt)}
                    </Text>
                  </View>
                </View>
              ))}
            </Section>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Actions</Text>
              <View style={styles.actionsGrid}>
                <Pressable style={styles.actionButton} onPress={() => router.push('/syndic/apartments')}>
                  <Pencil size={17} color="#18A7A0" />
                  <Text style={styles.actionText}>Modifier appartement</Text>
                </Pressable>
                <Pressable style={styles.actionButton} onPress={toggleStatus} disabled={isUpdatingStatus}>
                  <Power size={17} color="#18A7A0" />
                  <Text style={styles.actionText}>{apartment.isActive ? 'Désactiver' : 'Activer'}</Text>
                </Pressable>
                <Pressable style={styles.actionButton} onPress={() => router.push('/syndic/residents')}>
                  <UserPlus size={17} color="#18A7A0" />
                  <Text style={styles.actionText}>Ajouter résident</Text>
                </Pressable>
                <Pressable style={styles.actionButton} onPress={() => router.push({ pathname: '/syndic/payments', params: { apartmentId: apartment.id } })}>
                  <Banknote size={17} color="#18A7A0" />
                  <Text style={styles.actionText}>Créer paiement</Text>
                </Pressable>
                <Pressable style={styles.actionButton} onPress={() => router.push('/syndic/complaints')}>
                  <ClipboardList size={17} color="#18A7A0" />
                  <Text style={styles.actionText}>Voir réclamations</Text>
                </Pressable>
                <Pressable style={styles.actionButton} onPress={() => router.push('/syndic/residents')}>
                  <Plus size={17} color="#18A7A0" />
                  <Text style={styles.actionText}>Affecter un occupant</Text>
                </Pressable>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { width: '100%', maxWidth: 1040, alignSelf: 'center', padding: 24, paddingBottom: 44 },
  backButton: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, marginBottom: 18 },
  backText: { color: '#1F2328', fontSize: 15, fontWeight: '700' },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 18, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF', padding: 18, marginBottom: 14 },
  heroIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: '#D6F3F1', alignItems: 'center', justifyContent: 'center' },
  heroText: { flex: 1, minWidth: 0 },
  eyebrow: { color: '#18A7A0', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  title: { marginTop: 3, color: '#1F2328', fontSize: 26, lineHeight: 32, fontWeight: '900' },
  subtitle: { marginTop: 4, color: '#6B7280', fontSize: 14, fontWeight: '600' },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  activeBadge: { backgroundColor: '#DCFCE7' },
  inactiveBadge: { backgroundColor: '#FEE2E2' },
  badgeText: { fontSize: 12, fontWeight: '900' },
  activeText: { color: '#16A34A' },
  inactiveText: { color: '#DC2626' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  statCard: { flexGrow: 1, flexBasis: '23%', minWidth: 150, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF', padding: 14 },
  statLabel: { color: '#6B7280', fontSize: 12, fontWeight: '800' },
  statValue: { marginTop: 8, color: '#1F2328', fontSize: 19, fontWeight: '900' },
  dangerText: { color: '#DC2626' },
  successText: { color: '#059669' },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  infoCard: { flexGrow: 1, flexBasis: '23%', minWidth: 150, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF', padding: 14 },
  infoLabel: { color: '#6B7280', fontSize: 12, fontWeight: '800' },
  infoValue: { marginTop: 7, color: '#1F2328', fontSize: 16, fontWeight: '900' },
  section: { borderRadius: 18, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF', padding: 16, marginBottom: 14 },
  sectionTitle: { color: '#1F2328', fontSize: 17, fontWeight: '900', marginBottom: 12 },
  rowCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, backgroundColor: '#F9FAFB', padding: 12, marginBottom: 8 },
  rowBody: { flex: 1, minWidth: 0 },
  rowTitle: { color: '#1F2328', fontSize: 14, fontWeight: '800' },
  rowMeta: { marginTop: 3, color: '#6B7280', fontSize: 12, fontWeight: '600' },
  rowAmount: { color: '#1F2328', fontSize: 13, fontWeight: '900' },
  debtAmount: { color: '#DC2626', fontSize: 13, fontWeight: '900' },
  emptyText: { color: '#6B7280', fontSize: 14, lineHeight: 20, fontWeight: '600' },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  activityDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#18A7A0' },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionButton: { minHeight: 46, flexGrow: 1, flexBasis: '31%', minWidth: 180, borderRadius: 14, borderWidth: 1, borderColor: '#C7ECE9', backgroundColor: '#F0FBFA', paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  actionText: { color: '#0F8F89', fontSize: 13, fontWeight: '900' },
  stateCard: { minHeight: 170, borderRadius: 18, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF', padding: 18, alignItems: 'center', justifyContent: 'center', gap: 10 },
  stateTitle: { color: '#1F2328', fontSize: 16, fontWeight: '900', textAlign: 'center' },
  stateText: { color: '#6B7280', fontSize: 14, lineHeight: 20, fontWeight: '600', textAlign: 'center' },
  errorText: { color: '#DC2626', fontSize: 14, lineHeight: 20, fontWeight: '700', textAlign: 'center' },
  retryButton: { borderRadius: 12, backgroundColor: '#D6F3F1', paddingHorizontal: 14, paddingVertical: 8 },
  retryText: { color: '#18A7A0', fontSize: 13, fontWeight: '900' },
});
