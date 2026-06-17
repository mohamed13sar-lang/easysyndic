import { router } from 'expo-router';
import { ClipboardList, CreditCard, FileText, Home, User } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { radius, spacing } from '@/constants/design';

type ResidentTab = 'home' | 'complaints' | 'payments' | 'documents' | 'profile';

const tabs = [
  { key: 'home', title: 'Accueil', icon: Home, href: '/home' },
  { key: 'complaints', title: 'Demandes', icon: ClipboardList, href: '/complaints' },
  { key: 'payments', title: 'Paiements', icon: CreditCard, href: '/payments' },
  { key: 'documents', title: 'Docs', icon: FileText, href: '/documents' },
  { key: 'profile', title: 'Profil', icon: User, href: '/profile' },
] as const;

export function useResidentTabBarInset() {
  const insets = useSafeAreaInsets();
  return 70 + Math.max(insets.bottom, spacing.sm);
}

export function ResidentTabBar({ active }: { active: ResidentTab }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.key === active;

        return (
          <Pressable
            key={tab.key}
            style={styles.tab}
            onPress={() => {
              if (!isActive) {
                router.push(tab.href as never);
              }
            }}>
            <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
              <Icon
                size={19}
                color={isActive ? colors.primary : colors.mutedLight}
                strokeWidth={2.2}
              />
            </View>
            <Text style={[styles.tabText, isActive && styles.tabTextActive]} numberOfLines={1}>
              {tab.title}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tab: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  iconWrap: {
    width: 34,
    height: 30,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: colors.primaryLight,
  },
  tabText: {
    color: colors.mutedLight,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
  },
  tabTextActive: {
    color: colors.primary,
  },
});
