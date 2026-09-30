import React, { useCallback, useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { errorMessage } from '{{IMPORT:api.errors}}';
import { AppLoader } from '{{IMPORT:components.AppLoader}}';
import { AppText } from '{{IMPORT:components.AppText}}';
import { useStyles } from '{{IMPORT:hooks.useTheme}}';
import { translate } from '{{IMPORT:i18n.index}}';
import type { MainStackParamList } from '{{IMPORT:navigation.types}}';
import type { Theme } from '{{IMPORT:theme.index}}';
import type { Conversation } from '{{IMPORT:chat.types}}';
import { flash } from '{{IMPORT:utils.flashMessage}}';
import { ChatActions } from '../../components/ChatActions/ChatActions';
import { chatService } from '../../services/chatService';

/** A direct chat's details (tap the photo / name in the chat): who it is with, and managing the chat. */
export function ChatDetailsScreen(): React.JSX.Element {
  const route = useRoute<RouteProp<MainStackParamList, 'ChatDetails'>>();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const styles = useStyles(createStyles);
  const { conversationId } = route.params;
  const [conversation, setConversation] = useState<Conversation | null>(null);

  useEffect(() => {
    chatService
      .fetchConversation(conversationId)
      .then(setConversation)
      .catch(error => flash.error({ message: errorMessage(error) }));
  }, [conversationId]);

  // Deleted: back past the (now empty) chat to the chat list.
  const closeChat = useCallback(() => navigation.popToTop(), [navigation]);

  if (!conversation) return <AppLoader fullScreen />;
  const other = conversation.participants[0];
  const title = conversation.title;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        {conversation.avatar ? (
          <Image source={{ uri: conversation.avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.initials]}>
            <AppText fontFamily="bold" fontSize="size32" color="onPrimary" text={title.charAt(0).toUpperCase()} />
          </View>
        )}
        <AppText fontFamily="bold" fontSize="size20" align="center" text={title} />
        {other ? <AppText color={other.isOnline ? 'success' : 'textSecondary'} text={translate('common', other.isOnline ? 'online' : 'offline')} /> : null}
      </View>

      <ChatActions conversationId={conversationId} canDelete onDeleted={closeChat} />
    </ScrollView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    content: { paddingBottom: theme.spacing.spacing32 },
    header: { alignItems: 'center', gap: theme.spacing.spacing8, padding: theme.spacing.spacing24 },
    avatar: { width: 104, height: 104, borderRadius: 52, backgroundColor: theme.colors.primary },
    initials: { alignItems: 'center', justifyContent: 'center' },
  });
