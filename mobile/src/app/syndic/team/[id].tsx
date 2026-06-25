import { router, useLocalSearchParams } from 'expo-router';
import { Save, ShieldCheck, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
  deleteSyndicTeamMember,
  getSyndicTeam,
  PermissionMap,
  SyndicTeamMember,
  updateSyndicTeamMember,
  updateSyndicTeamMemberStatus,
} from '@/services/syndic-team-service';

const teal = '#0FA19A';
const charcoal = '#1F2328';
const muted = '#6B7280';
const border = '#E5E7EB';

const moduleLabels: Record<string, string> = {
  dashboard: 'Tableau de bord',
  residences: 'Residences',
  residents: 'Residents',
  apartments: 'Appartements',
  payments: 'Paiements',
  complaints: 'Reclamations',
  announcements: 'Annonces',
  notifications: 'Notifications',
  assistant: 'Assistant IA',
  team: 'Equipe',
  settings: 'Parametres',
};

const actionLabels: Record<string, string> = {
  viewDashboard: 'Voir tableau de bord',
  viewRevenueKpi: 'Voir revenus',
  viewUnpaidKpi: 'Voir impayes',
  viewPendingPaymentsKpi: 'Voir paiements en attente',
  viewComplaintsKpi: 'Voir reclamations',
  viewResidentsKpi: 'Voir residents',
  viewApartmentsKpi: 'Voir appartements',
  viewList: 'Voir liste',
  viewDetails: 'Voir details',
  viewAddress: 'Voir adresse',
  viewFinancialSummary: 'Voir resume financier',
  viewApartmentsCount: 'Voir nombre appartements',
  viewResidentsCount: 'Voir nombre residents',
  viewOwnerName: 'Voir proprietaire',
  viewResidentName: 'Voir occupant',
  viewBalance: 'Voir solde',
  viewPaymentStatus: 'Voir statut paiement',
  viewUnpaidAmount: 'Voir impaye',
  viewPhone: 'Voir telephone',
  viewEmail: 'Voir email',
  viewApartment: 'Voir appartement',
  viewPaymentHistory: 'Voir historique paiement',
  viewAmount: 'Voir montants',
  viewUnpaid: 'Voir impayes',
  viewPaid: 'Voir payes',
  viewPending: 'Voir en attente',
  viewHistory: 'Voir historique',
  viewProofImage: 'Voir justificatifs',
  declarePayment: 'Declarer paiement',
  validatePayment: 'Valider paiement',
  refusePayment: 'Refuser paiement',
  editPayment: 'Modifier paiement',
  deletePayment: 'Supprimer paiement',
  exportPayments: 'Exporter paiements',
  viewImages: 'Voir images',
  listenAudio: 'Ecouter audio',
  assignComplaint: 'Assigner reclamation',
  closeComplaint: 'Fermer reclamation',
  deleteComplaint: 'Supprimer reclamation',
  publish: 'Publier',
  viewTeam: 'Voir equipe',
  createMember: 'Ajouter membre',
  editMember: 'Modifier membre',
  deleteMember: 'Supprimer membre',
  editPermissions: 'Modifier permissions',
  validate: 'Valider',
  refuse: 'Refuser',
  export: 'Exporter',
  assign: 'Assigner',
  updateStatus: 'Statut',
  close: 'Fermer',
  send: 'Envoyer',
  access: 'Acces',
  manageTeam: 'Equipe',
  manageResidence: 'Residence',
};

const roleLabels: Record<string, string> = {
  VICE_SYNDIC: 'Vice Syndic',
  CAISSIER: 'Caissier',
  CASHIER: 'Caissier',
  GARDIEN: 'Gardien',
  SECRETAIRE: 'Secretaire',
};

export default function EditTeamMemberScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const { selectedResidence } = useSelectedSyndicResidence();
  const [member, setMember] = useState<SyndicTeamMember | null>(null);
  const [permissions, setPermissions] = useState<PermissionMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    async function loadMember() {
      if (!token || !selectedResidence || !id) return;
      setIsLoading(true);
      setError('');

      try {
        const team = await getSyndicTeam(token, selectedResidence.id);
        const found = team.find((item) => item.id === id) ?? null;
        if (!isMounted) return;
        setMember(found);
        setPermissions(found?.permissions ?? {});
        if (!found) setError('Membre introuvable.');
      } catch (err) {
        if (!isMounted) return;
        if (err instanceof ApiError && err.status === 404) {
          setError("Le module equipe n'est pas encore active sur le serveur deploye.");
          return;
        }
        setError(err instanceof ApiError ? err.message : 'Impossible de charger le membre.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadMember();
    return () => {
      isMounted = false;
    };
  }, [id, selectedResidence, token]);

  const togglePermission = (module: string, action: string) => {
    setPermissions((current) => ({
      ...current,
      [module]: {
        ...current[module],
        [action]: !current[module]?.[action],
      },
    }));
  };

  const save = async () => {
    if (!token || !member) return;
    setIsSubmitting(true);
    setError('');

    try {
      const updated = await updateSyndicTeamMember(token, member.id, {
        role: member.role,
        permissions,
      });
      setMember(updated);
      Alert.alert('Permissions mises a jour');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Impossible de sauvegarder.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleStatus = async () => {
    if (!token || !member) return;
    setIsSubmitting(true);
    setError('');

    try {
      const updated = await updateSyndicTeamMemberStatus(token, member.id, !member.isActive);
      setMember(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Impossible de changer le statut.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const remove = () => {
    if (!token || !member) return;
    Alert.alert('Supprimer ce membre ?', 'Son acces a cette residence sera retire.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteSyndicTeamMember(token, member.id);
            router.replace('/syndic/team' as never);
          } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Impossible de supprimer.');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <ShieldCheck size={24} color={teal} strokeWidth={2.2} />
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>Permissions</Text>
            <Text style={styles.title}>{member?.user.fullName ?? 'Membre equipe'}</Text>
            <Text style={styles.subtitle}>{member ? roleLabels[member.role] ?? member.role : ''}</Text>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator color={teal} />
          </View>
        ) : !member ? (
          <View style={styles.stateCard}>
            <Text style={styles.errorText}>{error || 'Membre introuvable.'}</Text>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <View style={styles.memberRow}>
                <View>
                  <Text style={styles.memberName}>{member.user.fullName}</Text>
                  <Text style={styles.memberMeta}>{member.user.phone}</Text>
                  {!!member.user.email && <Text style={styles.memberMeta}>{member.user.email}</Text>}
                </View>
                <Pressable
                  style={[styles.statusButton, member.isActive ? styles.activeStatus : styles.inactiveStatus]}
                  onPress={toggleStatus}
                  disabled={isSubmitting}>
                  <Text
                    style={[
                      styles.statusText,
                      member.isActive ? styles.activeText : styles.inactiveText,
                    ]}>
                    {member.isActive ? 'Actif' : 'Inactif'}
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.permissionsTitle}>Permissions</Text>
              {Object.entries(permissions).map(([module, actions]) => (
                <View key={module} style={styles.permissionGroup}>
                  <Text style={styles.moduleTitle}>{moduleLabels[module] ?? module}</Text>
                  <View style={styles.chips}>
                    {Object.entries(actions).map(([action, allowed]) => (
                      <Pressable
                        key={action}
                        style={[styles.chip, allowed && styles.chipActive]}
                        onPress={() => togglePermission(module, action)}>
                        <Text style={[styles.chipText, allowed && styles.chipTextActive]}>
                          {actionLabels[action] ?? action}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ))}
            </View>

            {!!error && <Text style={styles.errorText}>{error}</Text>}

            <Pressable
              style={[styles.saveButton, isSubmitting && styles.disabledButton]}
              onPress={save}
              disabled={isSubmitting}>
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Save size={18} color="#FFFFFF" strokeWidth={2.2} />
                  <Text style={styles.saveButtonText}>Sauvegarder</Text>
                </>
              )}
            </Pressable>

            <Pressable style={styles.deleteButton} onPress={remove}>
              <Trash2 size={18} color="#B91C1C" strokeWidth={2.2} />
              <Text style={styles.deleteButtonText}>Supprimer le membre</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFB' },
  content: { padding: 20, paddingBottom: 36 },
  header: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: border,
    backgroundColor: '#FFFFFF',
    padding: 18,
    flexDirection: 'row',
    gap: 14,
    marginBottom: 14,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#E7F7F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: { flex: 1, minWidth: 0 },
  eyebrow: { color: teal, fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  title: { marginTop: 4, color: charcoal, fontSize: 24, lineHeight: 30, fontWeight: '900' },
  subtitle: { marginTop: 4, color: muted, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  stateCard: {
    minHeight: 180,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: border,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: border,
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 14,
  },
  memberRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14 },
  memberName: { color: charcoal, fontSize: 16, fontWeight: '900' },
  memberMeta: { marginTop: 3, color: muted, fontSize: 13, fontWeight: '600' },
  statusButton: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  activeStatus: { backgroundColor: '#DCFCE7' },
  inactiveStatus: { backgroundColor: '#F3F4F6' },
  statusText: { fontSize: 12, fontWeight: '900' },
  activeText: { color: '#15803D' },
  inactiveText: { color: muted },
  permissionsTitle: { color: charcoal, fontSize: 17, fontWeight: '900', marginBottom: 12 },
  permissionGroup: {
    borderTopWidth: 1,
    borderTopColor: border,
    paddingTop: 12,
    marginTop: 12,
  },
  moduleTitle: { color: charcoal, fontSize: 14, fontWeight: '900', marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  chipActive: { borderColor: teal, backgroundColor: '#E7F7F6' },
  chipText: { color: muted, fontSize: 12, fontWeight: '900' },
  chipTextActive: { color: teal },
  saveButton: {
    minHeight: 50,
    borderRadius: 15,
    backgroundColor: teal,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  disabledButton: { opacity: 0.65 },
  saveButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  deleteButton: {
    marginTop: 12,
    minHeight: 48,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  deleteButtonText: { color: '#B91C1C', fontSize: 14, fontWeight: '900' },
  errorText: { color: '#B91C1C', fontSize: 13, lineHeight: 19, fontWeight: '700', marginBottom: 12 },
});
