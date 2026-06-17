import { router, useFocusEffect } from 'expo-router';
import { ChevronRight, ShieldCheck, UserPlus, Users } from 'lucide-react-native';
import { useCallback, useState } from 'react';
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
  getSyndicTeam,
  PermissionMap,
  SyndicTeamMember,
} from '@/services/syndic-team-service';

const teal = '#0FA19A';
const charcoal = '#1F2328';
const muted = '#6B7280';
const border = '#E5E7EB';

const roleLabels: Record<string, string> = {
  VICE_SYNDIC: 'Vice Syndic',
  CAISSIER: 'Caissier',
  CASHIER: 'Caissier',
  GARDIEN: 'Gardien',
  SECRETAIRE: 'Secretaire',
};

function summarizePermissions(permissions: PermissionMap) {
  const enabled = Object.entries(permissions)
    .flatMap(([module, actions]) =>
      Object.entries(actions)
        .filter(([, allowed]) => allowed)
        .map(([action]) => `${module}.${action}`),
    )
    .slice(0, 3);

  return enabled.length ? enabled.join(', ') : 'Aucune permission active';
}

export default function SyndicTeamScreen() {
  const { token } = useAuth();
  const { selectedResidence, isLoading: isResidenceLoading } = useSelectedSyndicResidence();
  const [members, setMembers] = useState<SyndicTeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadTeam = useCallback(async () => {
    if (!token || !selectedResidence) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      setMembers(await getSyndicTeam(token, selectedResidence.id));
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setError("Le module equipe n'est pas encore active sur le serveur deploye.");
        return;
      }
      setError(err instanceof ApiError ? err.message : "Impossible de charger l'equipe.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedResidence, token]);

  useFocusEffect(
    useCallback(() => {
      loadTeam();
    }, [loadTeam]),
  );

  const showLoading = isLoading || isResidenceLoading;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <ShieldCheck size={24} color={teal} strokeWidth={2.2} />
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>Equipe Syndicat</Text>
            <Text style={styles.title}>Roles et permissions</Text>
            <Text style={styles.subtitle}>
              Gerer caissier, gardien, secretaire et permissions
            </Text>
          </View>
        </View>

        <Pressable style={styles.primaryButton} onPress={() => router.push('/syndic/team/new')}>
          <UserPlus size={18} color="#FFFFFF" strokeWidth={2.2} />
          <Text style={styles.primaryButtonText}>Ajouter un membre</Text>
        </Pressable>

        {showLoading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator color={teal} />
            <Text style={styles.stateText}>Chargement de l'equipe...</Text>
          </View>
        ) : error ? (
          <View style={styles.stateCard}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.secondaryButton} onPress={loadTeam}>
              <Text style={styles.secondaryButtonText}>Reessayer</Text>
            </Pressable>
          </View>
        ) : members.length === 0 ? (
          <View style={styles.stateCard}>
            <Users size={28} color={teal} strokeWidth={2.2} />
            <Text style={styles.stateTitle}>Aucun membre pour cette residence</Text>
            <Text style={styles.stateText}>
              Ajoutez une personne et choisissez exactement ses permissions.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {members.map((member) => (
              <Pressable
                key={member.id}
                style={styles.memberCard}
                onPress={() => router.push(`/syndic/team/${member.id}` as never)}>
                <View style={styles.memberTop}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {member.user.fullName.slice(0, 1).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.memberCopy}>
                    <Text style={styles.memberName}>{member.user.fullName}</Text>
                    <Text style={styles.memberRole}>{roleLabels[member.role] ?? member.role}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      member.isActive ? styles.activePill : styles.inactivePill,
                    ]}>
                    <Text
                      style={[
                        styles.statusText,
                        member.isActive ? styles.activeText : styles.inactiveText,
                      ]}>
                      {member.isActive ? 'Actif' : 'Inactif'}
                    </Text>
                  </View>
                  <ChevronRight size={18} color="#9CA3AF" strokeWidth={2.1} />
                </View>
                <Text style={styles.permissionSummary} numberOfLines={2}>
                  {summarizePermissions(member.permissions)}
                </Text>
              </Pressable>
            ))}
          </View>
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
  primaryButton: {
    minHeight: 48,
    borderRadius: 15,
    backgroundColor: teal,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  stateCard: {
    minHeight: 180,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: border,
    backgroundColor: '#FFFFFF',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  stateTitle: { color: charcoal, fontSize: 17, fontWeight: '900', textAlign: 'center' },
  stateText: { color: muted, fontSize: 14, lineHeight: 20, fontWeight: '600', textAlign: 'center' },
  errorText: { color: '#B91C1C', fontSize: 14, lineHeight: 20, fontWeight: '700', textAlign: 'center' },
  secondaryButton: {
    minHeight: 42,
    borderRadius: 13,
    backgroundColor: '#E7F7F6',
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  secondaryButtonText: { color: teal, fontSize: 13, fontWeight: '900' },
  list: { gap: 12 },
  memberCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: border,
    backgroundColor: '#FFFFFF',
    padding: 14,
  },
  memberTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#E7F7F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: teal, fontSize: 16, fontWeight: '900' },
  memberCopy: { flex: 1, minWidth: 0 },
  memberName: { color: charcoal, fontSize: 15, lineHeight: 20, fontWeight: '900' },
  memberRole: { marginTop: 2, color: muted, fontSize: 13, fontWeight: '700' },
  statusPill: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  activePill: { backgroundColor: '#DCFCE7' },
  inactivePill: { backgroundColor: '#F3F4F6' },
  statusText: { fontSize: 11, fontWeight: '900' },
  activeText: { color: '#15803D' },
  inactiveText: { color: muted },
  permissionSummary: { marginTop: 12, color: muted, fontSize: 12, lineHeight: 18, fontWeight: '600' },
});
