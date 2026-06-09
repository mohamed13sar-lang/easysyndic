import { router, useLocalSearchParams } from 'expo-router';
import { Bell, ChevronLeft } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { useAuth } from '@/hooks/use-auth';
import { ApiError } from '@/lib/api/client';
import {
  getMyNotification,
  markNotificationRead,
  ResidentNotification,
} from '@/services/notifications-service';

function formatDate(value: string | null) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

export default function NotificationDetailsScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { token } = useAuth();
  const [notification, setNotification] = useState<ResidentNotification | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadNotification = useCallback(async () => {
    if (!token || !id) {
      setIsLoading(false);
      setError('Notification introuvable.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const data = await getMyNotification(token, id);
      setNotification(data);

      if (!data.isRead) {
        await markNotificationRead(token, data.recipientId);
        setNotification({ ...data, isRead: true, readAt: new Date().toISOString() });
      }
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : 'Impossible de charger cette notification.');
    } finally {
      setIsLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    loadNotification();
  }, [loadNotification]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable style={styles.backRow} onPress={() => router.replace('/notifications')}>
          <ChevronLeft size={18} color={colors.text} />
          <Text style={styles.backText}>Retour</Text>
        </Pressable>
        <Text style={styles.title}>Notification</Text>
        <Text style={styles.subtitle}>Detail de l'alerte</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {isLoading && (
          <View style={styles.stateCard}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.stateText}>Chargement de la notification...</Text>
          </View>
        )}

        {!isLoading && !!error && (
          <View style={styles.stateCard}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={loadNotification}>
              <Text style={styles.retryText}>Réessayer</Text>
            </Pressable>
          </View>
        )}

        {!isLoading && !error && notification && (
          <>
            <View style={styles.heroCard}>
              <View style={styles.iconWrap}>
                <Bell size={22} color={colors.primary} strokeWidth={2.2} />
              </View>
              <Text style={styles.heroTitle}>{notification.title}</Text>
              <Text style={styles.heroSubtitle}>{notification.message}</Text>
            </View>

            <View style={styles.card}>
              <DetailRow label="Type" value={notification.type} />
              <DetailRow label="Cible" value={notification.targetType} />
              <DetailRow label="Envoyee par" value={notification.senderName ?? '-'} />
              <DetailRow label="Creee le" value={formatDate(notification.createdAt)} />
              <DetailRow label="Lue" value={notification.isRead ? 'Oui' : 'Non'} />
              <DetailRow label="Lue le" value={formatDate(notification.readAt)} />
            </View>
          </>
        )}
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
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  backText: {
    marginLeft: 2,
    color: colors.text,
    fontSize: 16,
    fontWeight: '500',
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
    padding: 24,
    gap: 12,
  },
  heroCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: 18,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  heroSubtitle: {
    marginTop: 8,
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: 16,
  },
  detailRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 10,
  },
  detailLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  detailValue: {
    marginTop: 3,
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  stateCard: {
    minHeight: 128,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
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
