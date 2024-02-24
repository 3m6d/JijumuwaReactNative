import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, KeyboardAvoidingView, Platform } from 'react-native';

export type Message = {
  id: string;
  text: string;
  sender: 'user' | 'sarathi';
};

type ConversationProps = {
  messages: Message[];
};

const Conversation: React.FC<ConversationProps> = ({ messages }) => {
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    // Using a timeout to ensure that scrollToEnd is called after the new item is rendered
    const timer = setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100); // You may need to adjust this duration

    return () => clearTimeout(timer);
  }, [messages]);

  const renderItem = ({ item }: { item: Message }) => {
    const isSarathi = item.sender === 'sarathi';
    return (
      <View style={[styles.messageRow, isSarathi ? null : styles.userRow]}>
        <View style={isSarathi ? styles.sarathiBubble : styles.userBubble}>
          <Text style={styles.label}>{isSarathi ? 'सराठी' : 'तपाई'}</Text>
          <Text style={isSarathi ? styles.sarathiText : styles.userText}>
            {item.text}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  listContainer: {
    flexGrow: 1,
  },
  messageRow: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  sarathiBubble: {
    backgroundColor: '#FFD700',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: '80%',
    alignSelf: 'flex-start',
  },
  userBubble: {
    backgroundColor: '#FFFFFF',
    borderColor: '#000000',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: '80%',
    alignSelf: 'flex-end',
  },
  label: {
    fontWeight: 'bold',
    color: '#000000',
    alignSelf: 'flex-end',
  },
  sarathiText: {
    color: '#000000',
  },
  userText: {
    color: '#000000',
  },
});

export default Conversation;
