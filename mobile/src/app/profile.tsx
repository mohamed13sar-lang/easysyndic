import { router } from 'expo-router';
import {
  Bell,
  Building2,
  ChevronRight,
  FileText,
  HelpCircle,
  LogOut,
  Mail,
  Phone,
  User,
} from 'lucide-react-native';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ResidentTabBar, useResidentTabBarInset } from '@/components/ResidentTabBar';
import { colors } from '@/constants/colors';
import { useAuth } from '@/hooks/use-auth';
import {
  formatApartmentLabel,
  formatFloorLabel,
  formatResidenceAddress,
  useSelectedResidence,
} from '@/hooks/use-selected-residence';

const menuItems = [
  { title: 'Modifier mes informations', icon: User },
  { title: 'Changer de residence', icon: Building2 },
  { title: 'Notifications', icon: Bell },
  { title: 'Aide & support', icon: HelpCircle },
  { title: "Conditions d'utilisation", icon: FileText },
];

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { selectedResidence, isLoading, error } = useSelectedResidence();
  const tabBarInset = useResidentTabBarInset();
  const initials =
    user?.fullName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'ES';

  const handleMenuPress = (title: string) => {
    if (title === 'Changer de residence') {
      router.push('/residence');
      return;
    }
    if (title === 'Notifications') {
      router.push('/notifications');
      return;
    }
    Alert.alert(title, 'Fonction bientôt disponible.');
  };

  const handleLogout = () => {
    Alert.alert('Déconnexion', 'Voulez-vous vraiment vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Se déconnecter',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/login');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: tabBarInset + 24 }]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Profil</Text>
          <Text style={styles.subtitle}>Vos informations</Text>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{user?.fullName ?? 'Resident'}</Text>

          <View style={styles.contactRow}>
            <Phone size={16} color={colors.muted} />
            <Text style={styles.contactText}>{user?.phone ?? '-'}</Text>
          </View>
          <View style={styles.contactRow}>
            <Mail size={16} color={colors.muted} />
            <Text style={styles.contactText}>{user?.email ?? '-'}</Text>
          </View>
        </View>

        <Pressable style={styles.residenceCard} onPress={() => router.push('/residence/details')}>
          <Text style={styles.sectionTitle}>Ma residence</Text>
          {isLoading ? (
            <Text style={styles.residenceMeta}>Chargement...</Text>
          ) : error ? (
            <Text style={styles.residenceError}>{error}</Text>
          ) : selectedResidence ? (
            <>
              <View style={styles.residenceHeader}>
                <View style={styles.residenceIconWrap}>
                  <Building2 size={18} color={colors.primary} strokeWidth={2.2} />
                </View>
                <Text style={styles.residenceName}>{selectedResidence.name}</Text>
              </View>
              <Text style={styles.residenceMeta}>{formatApartmentLabel(selectedResidence)}</Text>
              <Text style={styles.residenceMeta}>{formatFloorLabel(selectedResidence)}</Text>
              <Text style={styles.residenceAddress}>{formatResidenceAddress(selectedResidence)}</Text>
            </>
          ) : (
            <Text style={styles.residenceMeta}>Aucune residence liee.</Text>
          )}
        </Pressable>

        <View style={styles.menuCard}>
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <Pressable
                key={item.title}
                onPress={() => handleMenuPress(item.title)}
                style={[styles.menuRow, index < menuItems.length - 1 && styles.menuRowBorder]}>
                <View style={styles.menuLeft}>
                  <View style={styles.menuIconWrap}>
                    <Icon size={17} color={colors.primary} strokeWidth={2.2} />
                  </View>
                  <Text style={styles.menuText}>{item.title}</Text>
                </View>
                <ChevronRight size={18} color={colors.muted} />
              </Pressable>
            );
          })}
        </View>

        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <LogOut size={18} color={colors.danger} strokeWidth={2.2} />
          <Text style={styles.logoutText}>Se deconnecter</Text>
        </Pressable>

        <View style={styles.spacer} />
      </ScrollView>

      <ResidentTabBar active="profile" />
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
    marginBottom: 14,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 5,
    color: colors.muted,
    fontSize: 14,
    fontWeight: '500',
  },
  profileCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: 18,
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    color: colors.white,
    fontSize: 24,
    fontWeight: '800',
  },
  name: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 12,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  contactText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '500',
  },
  residenceCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
  },
  residenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  residenceIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  residenceName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  residenceMeta: {
    color: colors.muted,
    fontSize: 13,
    marginBottom: 4,
  },
  residenceAddress: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  residenceError: {
    color: colors.danger,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  menuCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    overflow: 'hidden',
    marginBottom: 12,
  },
  menuRow: {
    minHeight: 56,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    paddingRight: 8,
  },
  menuIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  logoutButton: {
    minHeight: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: colors.dangerLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoutText: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: '800',
  },
  spacer: {
    height: 8,
  },
});
