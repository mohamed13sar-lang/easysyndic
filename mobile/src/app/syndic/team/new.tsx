import { router } from 'expo-router';
import { ChevronDown, Save, ShieldCheck } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '@/hooks/use-auth';
import { useSelectedSyndicResidence } from '@/hooks/use-selected-syndic-residence';
import { ApiError } from '@/lib/api/client';
import {
  createSyndicTeamMember,
  getPermissionTemplates,
  PermissionMap,
  TeamRole,
} from '@/services/syndic-team-service';

const teal = '#0FA19A';
const charcoal = '#1F2328';
const muted = '#6B7280';
const border = '#E5E7EB';

const roles: { label: string; value: TeamRole }[] = [
  { label: 'Caissier', value: 'CAISSIER' },
  { label: 'Gardien', value: 'GARDIEN' },
  { label: 'Vice Syndic', value: 'VICE_SYNDIC' },
  { label: 'Secretaire', value: 'SECRETAIRE' },
];

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

function clonePermissions(permissions: PermissionMap): PermissionMap {
  return Object.fromEntries(
    Object.entries(permissions).map(([module, actions]) => [module, { ...actions }]),
  );
}

export default function NewTeamMemberScreen() {
  const { token } = useAuth();
  const { selectedResidence } = useSelectedSyndicResidence();
  const [templates, setTemplates] = useState<Record<TeamRole, PermissionMap> | null>(null);
  const [role, setRole] = useState<TeamRole>('CAISSIER');
  const [permissions, setPermissions] = useState<PermissionMap>({});
  const [showRoles, setShowRoles] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    async function loadTemplates() {
      if (!token) return;
      setIsLoading(true);
      try {
        const data = await getPermissionTemplates(token);
        if (!isMounted) return;
        setTemplates(data);
        setPermissions(clonePermissions(data.CAISSIER));
      } catch (err) {
        if (!isMounted) return;
        if (err instanceof ApiError && err.status === 404) {
          setError("Le module equipe n'est pas encore active sur le serveur deploye.");
          return;
        }
        setError(err instanceof ApiError ? err.message : 'Impossible de charger les permissions.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadTemplates();
    return () => {
      isMounted = false;
    };
  }, [token]);

  const selectedRoleLabel = useMemo(
    () => roles.find((item) => item.value === role)?.label ?? role,
    [role],
  );

  const selectRole = (nextRole: TeamRole) => {
    setRole(nextRole);
    setShowRoles(false);
    if (templates?.[nextRole]) {
      setPermissions(clonePermissions(templates[nextRole]));
    }
  };

  const togglePermission = (module: string, action: string) => {
    setPermissions((current) => ({
      ...current,
      [module]: {
        ...current[module],
        [action]: !current[module]?.[action],
      },
    }));
  };

  const submit = async () => {
    if (!token || !selectedResidence) return;
    if (!fullName.trim() || !phone.trim()) {
      setError('Nom complet et telephone sont obligatoires.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const member = await createSyndicTeamMember(token, {
        residenceId: selectedResidence.id,
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        role,
        permissions,
      });
      Alert.alert(
        'Membre ajoute',
        member.temporaryPassword
          ? `Mot de passe temporaire: ${member.temporaryPassword}`
          : 'Le membre a ete ajoute.',
      );
      router.replace('/syndic/team' as never);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible d'ajouter ce membre.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <ShieldCheck size={24} color={teal} strokeWidth={2.2} />
            </View>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>Nouveau membre</Text>
              <Text style={styles.title}>Definir l'acces</Text>
              <Text style={styles.subtitle}>Les permissions sont modifiables avant invitation.</Text>
            </View>
          </View>

          {isLoading ? (
            <View style={styles.stateCard}>
              <ActivityIndicator color={teal} />
            </View>
          ) : (
            <>
              <View style={styles.card}>
                <Text style={styles.label}>Nom complet</Text>
                <TextInput
                  style={styles.input}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Ex: Ahmed Benali"
                  placeholderTextColor="#9CA3AF"
                />
                <Text style={styles.label}>Telephone</Text>
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  placeholder="+212 6..."
                  placeholderTextColor="#9CA3AF"
                />
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="email@exemple.com"
                  placeholderTextColor="#9CA3AF"
                />

                <Text style={styles.label}>Role</Text>
                <Pressable style={styles.select} onPress={() => setShowRoles((value) => !value)}>
                  <Text style={styles.selectText}>{selectedRoleLabel}</Text>
                  <ChevronDown size={18} color={muted} strokeWidth={2.1} />
                </Pressable>
                {showRoles && (
                  <View style={styles.roleList}>
                    {roles.map((item) => (
                      <Pressable
                        key={item.value}
                        style={[styles.roleOption, item.value === role && styles.roleOptionActive]}
                        onPress={() => selectRole(item.value)}>
                        <Text
                          style={[
                            styles.roleOptionText,
                            item.value === role && styles.roleOptionTextActive,
                          ]}>
                          {item.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
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
                onPress={submit}
                disabled={isSubmitting}>
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Save size={18} color="#FFFFFF" strokeWidth={2.2} />
                    <Text style={styles.saveButtonText}>Enregistrer le membre</Text>
                  </>
                )}
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
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
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: border,
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 14,
  },
  label: { marginBottom: 7, color: charcoal, fontSize: 13, fontWeight: '900' },
  input: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: border,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 13,
    color: charcoal,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 14,
  },
  select: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: border,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectText: { color: charcoal, fontSize: 14, fontWeight: '800' },
  roleList: { marginTop: 8, gap: 8 },
  roleOption: { borderRadius: 13, borderWidth: 1, borderColor: border, padding: 12 },
  roleOptionActive: { borderColor: teal, backgroundColor: '#E7F7F6' },
  roleOptionText: { color: charcoal, fontSize: 14, fontWeight: '800' },
  roleOptionTextActive: { color: teal },
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
  stateCard: {
    minHeight: 180,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: border,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: { color: '#B91C1C', fontSize: 13, lineHeight: 19, fontWeight: '700', marginBottom: 12 },
});
