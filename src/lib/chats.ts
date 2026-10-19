import type { NotificationBody } from '../api/greenApi';

export interface ChatMessage {
  id: string;
  text: string;
  outgoing: boolean;
  timestamp: number;
  pending?: boolean;
  failed?: boolean;
}

export interface Chat {
  /** chatId used for sending (e.g. "79991234567@c.us"). */
  id: string;
  title: string;
  /** Digits of the phone number, used to match incoming MAX notifications that carry a numeric chatId. */
  phone?: string;
  /** Alternative chat ids seen in notifications for this chat. */
  aliases: string[];
  messages: ChatMessage[];
  unread: number;
}

export type ChatsState = Record<string, Chat>;

export type ChatsAction =
  | { type: 'create'; chatId: string; phone: string }
  | { type: 'outgoing'; chatId: string; message: ChatMessage }
  | { type: 'confirm'; chatId: string; tempId: string; idMessage: string }
  | { type: 'fail'; chatId: string; tempId: string }
  | { type: 'notification'; body: NotificationBody }
  | { type: 'read'; chatId: string };

const INCOMING = new Set(['incomingMessageReceived']);
const OUTGOING = new Set(['outgoingMessageReceived', 'outgoingAPIMessageReceived']);

export function extractText(body: NotificationBody): string | null {
  const data = body.messageData;
  if (!data) return null;
  if (data.typeMessage === 'textMessage') return data.textMessageData?.textMessage ?? null;
  if (data.typeMessage === 'extendedTextMessage') return data.extendedTextMessageData?.text ?? null;
  return null;
}

/** Finds the chat a notification belongs to: by chatId, alias or sender phone number. */
export function findChatKey(state: ChatsState, body: NotificationBody): string | null {
  const sender = body.senderData;
  if (!sender) return null;
  if (state[sender.chatId]) return sender.chatId;
  const phone = sender.senderPhoneNumber ? String(sender.senderPhoneNumber) : sender.chatId.replace(/\D/g, '');
  for (const chat of Object.values(state)) {
    if (chat.aliases.includes(sender.chatId)) return chat.id;
    if (chat.phone && phone && chat.phone === phone) return chat.id;
  }
  return null;
}

function appendUnique(messages: ChatMessage[], message: ChatMessage): ChatMessage[] {
  if (messages.some((m) => m.id === message.id)) return messages;
  return [...messages, message].sort((a, b) => a.timestamp - b.timestamp);
}

export function chatsReducer(state: ChatsState, action: ChatsAction): ChatsState {
  switch (action.type) {
    case 'create': {
      if (state[action.chatId]) return state;
      return {
        ...state,
        [action.chatId]: {
          id: action.chatId,
          title: `+${action.phone}`,
          phone: action.phone,
          aliases: [],
          messages: [],
          unread: 0,
        },
      };
    }
    case 'outgoing': {
      const chat = state[action.chatId];
      if (!chat) return state;
      return { ...state, [chat.id]: { ...chat, messages: appendUnique(chat.messages, action.message) } };
    }
    case 'confirm':
    case 'fail': {
      const chat = state[action.chatId];
      if (!chat) return state;
      const messages = chat.messages.map((m) => {
        if (m.id !== action.tempId) return m;
        return action.type === 'confirm'
          ? { ...m, id: action.idMessage, pending: false }
          : { ...m, pending: false, failed: true };
      });
      return { ...state, [chat.id]: { ...chat, messages } };
    }
    case 'notification': {
      const { body } = action;
      const isIncoming = INCOMING.has(body.typeWebhook);
      if (!isIncoming && !OUTGOING.has(body.typeWebhook)) return state;
      const text = extractText(body);
      const sender = body.senderData;
      if (text === null || !sender) return state;

      const message: ChatMessage = {
        id: body.idMessage ?? `${body.timestamp}-${text}`,
        text,
        outgoing: !isIncoming,
        timestamp: body.timestamp * 1000,
      };
      const key = findChatKey(state, body);
      if (key) {
        const chat = state[key];
        const aliases =
          sender.chatId !== chat.id && !chat.aliases.includes(sender.chatId)
            ? [...chat.aliases, sender.chatId]
            : chat.aliases;
        return {
          ...state,
          [key]: {
            ...chat,
            aliases,
            messages: appendUnique(chat.messages, message),
            unread: chat.unread + (isIncoming ? 1 : 0),
          },
        };
      }
      // Message from someone we have no chat with yet: open a new chat for it.
      return {
        ...state,
        [sender.chatId]: {
          id: sender.chatId,
          title: sender.chatName || sender.senderName || sender.chatId,
          phone: sender.senderPhoneNumber ? String(sender.senderPhoneNumber) : undefined,
          aliases: [],
          messages: [message],
          unread: isIncoming ? 1 : 0,
        },
      };
    }
    case 'read': {
      const chat = state[action.chatId];
      if (!chat || chat.unread === 0) return state;
      return { ...state, [chat.id]: { ...chat, unread: 0 } };
    }
  }
}
