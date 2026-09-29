import React, { useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { errorMessage } from '{{IMPORT:api.errors}}';
import { AppText } from '{{IMPORT:components.AppText}}';
{{#if GROUP_CHAT}}
{{#if VECTOR_ICONS}}
import { AppIcon } from '{{IMPORT:components.AppIcon}}';
{{/if}}
{{/if}}
import { useStyles, useTheme } from '{{IMPORT:hooks.useTheme}}';
import { translate } from '{{IMPORT:i18n.index}}';
import type { MainStackParamList } from '{{IMPORT:navigation.types}}';
import type { Theme } from '{{IMPORT:theme.index}}';
import { flash } from '{{IMPORT:utils.flashMessage}}';
import { UserRow } from '../../components/UserRow/UserRow';
import { useUserList } from '../../hooks/useUserList';
import { chatService } from '../../services/chatService';

/** Everybody you can chat with, right away (A → Z, more on scroll); the search box narrows it down. */
export function NewChatScreen(): React.JSX.Element {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { theme } = useTheme();
  const styles = useStyles(createStyles);
  const { users, search, setSearch, loading, loadingMore, loadMore } = useUserList();
  const [opening, setOpening] = useState<string | null>(null);

  const open = async (userId: string) => {
    setOpening(userId);
    try {
      const conversation = await chatService.startConversation(userId);
      navigation.replace('ChatRoom', { conversationId: conversation.id, title: conversation.title, avatar: conversation.avatar });
    } catch (error) {
      flash.error({ message: errorMessage(error) });
    } finally {
      setOpening(null);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder={translate('common', 'searchUsers')}
        placeholderTextColor={theme.colors.placeholder}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
        style={styles.search}
      />
      <FlatList
        data={users}
        keyExtractor={item => item.id}
        keyboardShouldPersistTaps="handled"
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
{{#if GROUP_CHAT}}
        ListHeaderComponent={
          <UserRow
            name={translate('common', 'newGroup')}
            onPress={() => navigation.navigate('CreateGroup')}
{{#if VECTOR_ICONS}}
            trailing={<AppIcon name="account-multiple-plus-outline" size={22} tintColor={theme.colors.primary} />}
{{/if}}
          />
        }
{{/if}}
        ListEmptyComponent={loading ? <ActivityIndicator style={styles.spinner} /> : <AppText style={styles.empty} color="textSecondary" align="center" intlType="common" value="noUsers" />}
        ListFooterComponent={loadingMore ? <ActivityIndicator style={styles.spinner} /> : undefined}
        renderItem={({ item }) => (
          <UserRow name={item.name} avatar={item.avatar} onPress={() => open(item.id)} disabled={opening !== null} trailing={opening === item.id ? <ActivityIndicator /> : null} />
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
    spinner: { marginVertical: theme.spacing.spacing16 },
    empty: { marginTop: theme.spacing.spacing24 },
  });
