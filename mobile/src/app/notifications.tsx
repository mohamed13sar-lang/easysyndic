import { router, useFocusEffect } from 'expo-router';
import {
  Bell,
  CheckCheck,
  ChevronLeft,
  ClipboardList,
  CreditCard,
  FileText,
  Megaphone,
} from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  Vibration,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { useAuth } from '@/hooks/use-auth';
import { useSelectedResidence } from '@/hooks/use-selected-residence';
import { ApiError } from '@/lib/api/client';
import {
  getMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  NotificationType,
  ResidentNotification,
} from '@/services/notifications-service';

type UiNotificationType = 'announcement' | 'payment' | 'complaint' | 'document';

function getUiType(type: NotificationType): UiNotificationType {
  if (type === 'NEW_ANNOUNCEMENT') return 'announcement';
  if (type === 'PAYMENT_REMINDER' || type === 'PAYMENT_RECEIVED') return 'payment';
  if (type === 'COMPLAINT_STATUS') return 'complaint';
  if (type === 'DOCUMENT_SHARED') return 'document';
  return 'announcement';
}

function getTypeStyle(type: UiNotificationType) {
  if (type === 'announcement') {
    return { icon: Megaphone, bg: colors.blueLight, color: colors.blue };
  }
  if (type === 'payment') {
    return { icon: CreditCard, bg: colors.successLight, color: colors.success };
  }
  if (type === 'complaint') {
    return { icon: ClipboardList, bg: colors.warningLight, color: colors.warning };
  }
  return { icon: FileText, bg: colors.purpleLight, color: colors.purple };
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function NotificationsScreen() {
  const { token } = useAuth();
  const {
    selectedResidence,
    isLoading: isResidenceLoading,
    error: residenceError,
  } = useSelectedResidence();
  const [notifications, setNotifications] = useState<ResidentNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!token || !selectedResidence) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const data = await getMyNotifications(token, { residenceId: selectedResidence.id });
      setNotifications((previous) => {
        const previousIds = new Set(previous.map((item) => item.id));
        const hasNewUnread = data.some(
          (item) => !item.isRead && !previousIds.has(item.id),
        );
        if (previous.length > 0 && hasNewUnread) {
          Vibration.vibrate(120);
        }
        return data;
      });
    } catch (err: unknown) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Impossible de charger vos notifications.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [selectedResidence, token]);

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications]),
  );

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.isRead).length,
    [notifications],
  );

  const markAllRead = async () => {
    if (!token || !selectedResidence || unreadCount === 0 || isMarkingAll) return;

    setIsMarkingAll(true);
    try {
      await markAllNotificationsRead(token, { residenceId: selectedResidence.id });
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
    } catch (err: unknown) {
      Alert.alert(
        'Erreur',
        err instanceof ApiError ? err.message : 'Impossible de tout marquer comme lu.',
      );
    } finally {
      setIsMarkingAll(false);
    }
  };

  const openNotification = async (item: ResidentNotification) => {
    if (!token) return;

    if (!item.isRead) {
      setNotifications((prev) =>
        prev.map((current) =>
          current.id === item.id
            ? { ...current, isRead: true, readAt: new Date().toISOString() }
            : current,
        ),
      );

      try {
        await markNotificationRead(token, item.recipientId);
      } catch {
        setNotifications((prev) =>
          prev.map((current) =>
            current.id === item.id ? { ...current, isRead: false, readAt: null } : current,
          ),
        );
      }
    }

    const announcementId = item.metadata?.announcementId;
    if (typeof announcementId === 'string' && announcementId.length > 0) {
      router.push({
        pathname: '/announcements/[id]',
        params: { id: announcementId },
      });
      return;
    }

    router.push({
      pathname: '/notifications/[id]',
      params: { id: item.recipientId },
    });
  };

  const showLoading = isLoading || isResidenceLoading;
  const shownError = error || residenceError;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Pressable style={styles.backRow} onPress={() => router.replace('/home')}>
            <ChevronLeft size={18} color={colors.text} />
            <Text style={styles.backText}>Retour</Text>
          </Pressable>
          <Pressable style={styles.readAllBtn} onPress={markAllRead}>
            <CheckCheck size={15} color={colors.primary} />
            <Text style={styles.readAllText}>Tout lire</Text>
          </Pressable>
        </View>

        <Text style={styles.title}>Notifications</Text>
        <Text style={styles.subtitle}>
          {unreadCount > 0 ? `${unreadCount} non lues` : 'Vos dernieres alertes'}
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {showLoading && (
          <View style={styles.stateCard}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.stateText}>Chargement des notifications...</Text>
          </View>
        )}

        {!showLoading && !!shownError && (
          <View style={styles.stateCard}>
            <Text style={styles.errorText}>{shownError}</Text>
            <Pressable style={styles.retryButton} onPress={loadNotifications}>
              <Text style={styles.retryText}>Réessayer</Text>
            </Pressable>
          </View>
        )}

        {!showLoading && !shownError && !selectedResidence && (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>Aucune residence selectionnee</Text>
            <Text style={styles.stateText}>
              Sélectionnez une résidence avant de consulter vos notifications.
            </Text>
          </View>
        )}

        {!showLoading && !shownError && selectedResidence && notifications.length === 0 && (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>Aucune notification</Text>
            <Text style={styles.stateText}>Vos alertes apparaitront ici.</Text>
          </View>
        )}

        {!showLoading &&
          !shownError &&
          notifications.map((item) => {
            const type = getTypeStyle(getUiType(item.type));
            const TypeIcon = type.icon;

            return (
              <Pressable
                key={item.id}
                style={[styles.card, !item.isRead && styles.cardUnread]}
                onPress={() => openNotification(item)}>
                <View style={styles.cardLeft}>
                  <View style={[styles.iconWrap, { backgroundColor: type.bg }]}>
                    <TypeIcon size={18} color={type.color} strokeWidth={2.2} />
                  </View>
                  <View style={styles.cardTextWrap}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <Text style={styles.cardMessage}>{item.message}</Text>
                    <Text style={styles.cardTime}>
                      {item.senderName ? `${item.senderName} - ` : ''}
                      {formatTime(item.createdAt)}
                    </Text>
                  </View>
                </View>

                {!item.isRead ? (
                  <View style={styles.unreadDot} />
                ) : (
                  <View style={styles.readDotSpace} />
                )}
              </Pressable>
            );
          })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.white,
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    marginLeft: 2,
    color: colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
  readAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  readAllText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
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
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 24,
    gap: 12,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  cardUnread: {
    backgroundColor: '#F5FFFE',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    paddingRight: 10,
    gap: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTextWrap: {
    flex: 1,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  cardMessage: {
    marginTop: 5,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  cardTime: {
    marginTop: 8,
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '500',
  },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: colors.primary,
    marginTop: 5,
  },
  readDotSpace: {
    width: 9,
    height: 9,
    marginTop: 5,
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
});
