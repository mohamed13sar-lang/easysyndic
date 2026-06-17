import { router } from 'expo-router';
import { Bot, ChevronLeft, Send } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandLogo } from '@/components/BrandLogo';
import { colors } from '@/constants/colors';
import { radius, spacing, typography } from '@/constants/design';

const quickPrompts = [
  'Rediger une annonce',
  'Preparer une AG',
  'Resumer une reunion',
  'Question sur la loi',
  'Message aux residents',
];

export default function SyndicAssistantScreen() {
  const [message, setMessage] = useState('');
  const [selectedPrompt, setSelectedPrompt] = useState(quickPrompts[0]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable style={styles.backRow} onPress={() => router.back()}>
          <ChevronLeft size={18} color={colors.white} />
          <Text style={styles.backText}>Retour</Text>
        </Pressable>
        <BrandLogo variant="dark" containerStyle={styles.logoWrap} />
        <Text style={styles.title}>Assistant Syndic IA</Text>
        <Text style={styles.subtitle}>Aide juridique, AG, annonces et resumes</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.assistantBubble}>
          <View style={styles.botIcon}>
            <Bot size={20} color={colors.primary} strokeWidth={2.2} />
          </View>
          <Text style={styles.assistantText}>
            Choisissez un besoin ou decrivez votre demande. Cette version prepare le message cote
            mobile en attendant le service IA.
          </Text>
        </View>

        <View style={styles.promptGrid}>
          {quickPrompts.map((prompt) => {
            const active = prompt === selectedPrompt;
            return (
              <Pressable
                key={prompt}
                style={[styles.promptChip, active && styles.promptChipActive]}
                onPress={() => {
                  setSelectedPrompt(prompt);
                  setMessage(prompt);
                }}>
                <Text style={[styles.promptText, active && styles.promptTextActive]}>{prompt}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            Les reponses sont fournies a titre d aide generale et ne remplacent pas un conseil
            juridique professionnel.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.composer}>
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="Votre demande..."
          placeholderTextColor={colors.muted}
          style={styles.input}
          multiline
        />
        <Pressable style={styles.sendButton}>
          <Send size={18} color={colors.white} strokeWidth={2.2} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.charcoal,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 2,
    marginBottom: spacing.md,
  },
  backText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
  },
  logoWrap: {
    marginBottom: spacing.sm,
  },
  title: {
    color: colors.white,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: spacing.xs,
    color: '#D1D5DB',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  content: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
  assistantBubble: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: spacing.lg,
    flexDirection: 'row',
    gap: spacing.md,
  },
  botIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assistantText: {
    ...typography.body,
    flex: 1,
  },
  promptGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  promptChip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  promptChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  promptText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  promptTextActive: {
    color: colors.white,
  },
  disclaimer: {
    borderRadius: radius.md,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: colors.warningLight,
    padding: spacing.md,
  },
  disclaimerText: {
    color: '#92400E',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },
  composer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 46,
    maxHeight: 110,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    fontWeight: '600',
  },
  sendButton: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
