import { router } from 'expo-router';
import {
  ClipboardList,
  CreditCard,
  Download,
  FileText,
  Home,
  Search,
  User,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';

type FilterType = 'Tous' | 'Reglement' | 'PV' | 'Factures' | 'Contrats';

const documents = [
  {
    id: '1',
    title: 'Reglement interieur',
    type: 'Reglement',
    date: '12 Mai 2026',
    size: '1.2 MB',
  },
  {
    id: '2',
    title: 'PV Assemblee Generale',
    type: 'PV',
    date: '08 Mai 2026',
    size: '2.4 MB',
  },
  {
    id: '3',
    title: 'Facture entretien ascenseur',
    type: 'Factures',
    date: '02 Mai 2026',
    size: '850 KB',
  },
  {
    id: '4',
    title: 'Contrat nettoyage',
    type: 'Contrats',
    date: '28 Avril 2026',
    size: '1.8 MB',
  },
];

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

export default function DocumentsScreen() {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('Tous');

  const filteredDocuments = useMemo(() => {
    const term = search.trim().toLowerCase();
    return documents.filter((doc) => {
      const byFilter = activeFilter === 'Tous' || doc.type === activeFilter;
      const bySearch =
        term.length === 0 ||
        doc.title.toLowerCase().includes(term) ||
        doc.type.toLowerCase().includes(term);
      return byFilter && bySearch;
    });
  }, [activeFilter, search]);

  const typeStyle = (type: string) => {
    if (type === 'Reglement') return { bg: colors.blueLight, color: colors.blue };
    if (type === 'PV') return { bg: colors.purpleLight, color: colors.purple };
    if (type === 'Factures') return { bg: colors.warningLight, color: colors.warning };
    return { bg: colors.successLight, color: colors.success };
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Documents</Text>
          <Text style={styles.subtitle}>Vos fichiers importants</Text>
        </View>

        <View style={styles.searchBox}>
          <Search size={18} color={colors.muted} strokeWidth={2.1} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Rechercher un document..."
            placeholderTextColor="#9CA3AF"
            style={styles.searchInput}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}>
          {(['Tous', 'Reglement', 'PV', 'Factures', 'Contrats'] as FilterType[]).map((chip) => {
            const active = chip === activeFilter;
            return (
              <Pressable
                key={chip}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setActiveFilter(chip)}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{chip}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.list}>
          {filteredDocuments.map((doc) => {
            const style = typeStyle(doc.type);
            return (
              <Pressable
                key={doc.id}
                style={styles.card}
                onPress={() => Alert.alert('Ouverture bientôt disponible.')}>
                <View style={styles.cardLeft}>
                  <View style={styles.fileIconWrap}>
                    <FileText size={18} color={colors.primary} strokeWidth={2.1} />
                  </View>
                  <View style={styles.cardTextBlock}>
                    <Text style={styles.cardTitle}>{doc.title}</Text>
                    <View style={styles.metaRow}>
                      <View style={[styles.typePill, { backgroundColor: style.bg }]}>
                        <Text style={[styles.typePillText, { color: style.color }]}>{doc.type}</Text>
                      </View>
                      <Text style={styles.metaText}>{doc.date}</Text>
                      <Text style={styles.metaText}>{doc.size}</Text>
                    </View>
                  </View>
                </View>
                <Pressable
                  style={styles.downloadButton}
                  onPress={() => Alert.alert('Téléchargement bientôt disponible.')}>
                  <Download size={16} color={colors.primary} strokeWidth={2.2} />
                </Pressable>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.spacer} />
      </ScrollView>

      <View style={styles.tabBar}>
        <BottomTab title="Accueil" icon={Home} onPress={() => router.push('/home')} />
        <BottomTab
          title="Reclamations"
          icon={ClipboardList}
          onPress={() => router.push('/complaints')}
        />
        <BottomTab title="Paiements" icon={CreditCard} onPress={() => router.push('/payments')} />
        <BottomTab title="Documents" icon={FileText} active onPress={() => {}} />
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
  searchBox: {
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
  chipsRow: {
    paddingTop: 12,
    paddingBottom: 6,
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  chipText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: colors.white,
  },
  list: {
    marginTop: 8,
    gap: 10,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    paddingRight: 10,
  },
  fileIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTextBlock: {
    flex: 1,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  metaRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flexWrap: 'wrap',
  },
  typePill: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  typePillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  metaText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '500',
  },
  downloadButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
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
