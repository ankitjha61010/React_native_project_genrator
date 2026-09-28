import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { userMessage } from '{{IMPORT:api.errors}}';
import { AppText } from '{{IMPORT:components.AppText}}';
import { useStyles, useTheme } from '{{IMPORT:hooks.useTheme}}';
import type { Theme } from '{{IMPORT:theme.index}}';
import { flash } from '{{IMPORT:utils.flashMessage}}';
import { chatService, type ChatContact } from '../../services/chatService';

/** Search people by name / email and open the direct chat with them. */
export function NewChatScreen(): React.JSX.Element {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const styles = useStyles(createStyles);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ChatContact[]>([]);
  const [searching, setSearching] = useState(false);
  const [opening, setOpening] = useState<string | null>(null);

  // Search 300 ms after the last keystroke.
  useEffect(() => {
    const term = query.trim();
    if (!term) {
      setResults([]);
      return undefined;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        setResults(await chatService.searchContacts(term));
      } catch (error) {
        flash.error({ message: userMessage(error) ?? 'Search failed.' });
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const open = async (contact: ChatContact) => {
    setOpening(contact.id);
    try {
      const conversation = await chatService.startConversation([contact.id]);
      navigation.replace('ChatRoom', { conversationId: conversation.id, title: conversation.title, avatar: conversation.avatar, isGroup: conversation.isGroup });
    } catch (error) {
      flash.error({ message: userMessage(error) ?? 'Could not open the chat.' });
    } finally {
      setOpening(null);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search by name or email"
        placeholderTextColor={theme.colors.placeholder}
        autoFocus
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.search}
      />
      {searching ? <ActivityIndicator style={styles.spinner} /> : null}
      <FlatList
        data={results}
        keyExtractor={item => item.id}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          query.trim() && !searching ? <AppText style={styles.empty} color="textSecondary" align="center" text="Nobody found" /> : undefined
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => open(item)} disabled={opening !== null} accessibilityRole="button">
            {item.avatar ? (
              <Image source={{ uri: item.avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.initials]}>
                <AppText fontFamily="semiBold" color="primary" text={item.name.slice(0, 1).toUpperCase()} />
              </View>
            )}
            <AppText style={styles.name} fontFamily="medium" numberOfLines={1} text={item.name} />
            {opening === item.id ? <ActivityIndicator /> : null}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    search: {
      margin: theme.spacing.spacing16,
      paddingHorizontal: theme.spacing.spacing12,
      minHeight: theme.spacing.spacing48,
      borderRadius: theme.borderRadius.radius8,
      borderWidth: theme.spacing.spacing1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      color: theme.colors.text,
      fontFamily: theme.typography.fontFamily.regular,
      fontSize: theme.typography.fontSize.size14,
    },
    spinner: { marginBottom: theme.spacing.spacing8 },
    row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.spacing12, paddingHorizontal: theme.spacing.spacing16, paddingVertical: theme.spacing.spacing10 },
    avatar: { width: theme.spacing.spacing40, height: theme.spacing.spacing40, borderRadius: theme.spacing.spacing20 },
    initials: { alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface },
    name: { flex: 1 },
    empty: { marginTop: theme.spacing.spacing24 },
  });
