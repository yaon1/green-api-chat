import { describe, expect, it } from 'vitest';
import type { NotificationBody } from '../api/greenApi';
import { type ChatsState, chatsReducer, extractText } from './chats';

const incoming = (overrides: Partial<NotificationBody> = {}): NotificationBody => ({
  typeWebhook: 'incomingMessageReceived',
  timestamp: 1763115112,
  idMessage: 'in-1',
  senderData: { chatId: '10000000', chatName: 'Иван', senderPhoneNumber: 79991234567 },
  messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: 'Привет' } },
  ...overrides,
});

function withChat(): ChatsState {
  return chatsReducer({}, { type: 'create', chatId: '79991234567@c.us', phone: '79991234567' });
}

describe('chatsReducer', () => {
  it('creates a chat once', () => {
    const state = withChat();
    expect(Object.keys(state)).toEqual(['79991234567@c.us']);
    expect(chatsReducer(state, { type: 'create', chatId: '79991234567@c.us', phone: '79991234567' })).toBe(state);
  });

  it('matches a MAX notification with numeric chatId to the phone chat and remembers the alias', () => {
    const state = chatsReducer(withChat(), { type: 'notification', body: incoming() });
    const chat = state['79991234567@c.us'];
    expect(chat.messages).toHaveLength(1);
    expect(chat.messages[0]).toMatchObject({ text: 'Привет', outgoing: false });
    expect(chat.unread).toBe(1);
    expect(chat.aliases).toEqual(['10000000']);
    expect(Object.keys(state)).toHaveLength(1);
  });

  it('opens a new chat for an unknown sender', () => {
    const state = chatsReducer({}, { type: 'notification', body: incoming() });
    expect(state['10000000']).toMatchObject({ title: 'Иван', unread: 1 });
  });

  it('ignores duplicate notifications and non-text messages', () => {
    let state = chatsReducer(withChat(), { type: 'notification', body: incoming() });
    state = chatsReducer(state, { type: 'notification', body: incoming() });
    state = chatsReducer(state, {
      type: 'notification',
      body: incoming({ idMessage: 'img', messageData: { typeMessage: 'imageMessage' } }),
    });
    expect(state['79991234567@c.us'].messages).toHaveLength(1);
  });

  it('confirms and fails pending outgoing messages', () => {
    let state = chatsReducer(withChat(), {
      type: 'outgoing',
      chatId: '79991234567@c.us',
      message: { id: 'tmp-1', text: 'Hi', outgoing: true, timestamp: 1, pending: true },
    });
    state = chatsReducer(state, { type: 'confirm', chatId: '79991234567@c.us', tempId: 'tmp-1', idMessage: 'srv-1' });
    expect(state['79991234567@c.us'].messages[0]).toMatchObject({ id: 'srv-1', pending: false });

    state = chatsReducer(state, {
      type: 'outgoing',
      chatId: '79991234567@c.us',
      message: { id: 'tmp-2', text: 'Hi', outgoing: true, timestamp: 2, pending: true },
    });
    state = chatsReducer(state, { type: 'fail', chatId: '79991234567@c.us', tempId: 'tmp-2' });
    expect(state['79991234567@c.us'].messages[1]).toMatchObject({ failed: true, pending: false });
  });

  it('does not duplicate an API-sent message echoed back as outgoingAPIMessageReceived', () => {
    let state = chatsReducer(withChat(), {
      type: 'outgoing',
      chatId: '79991234567@c.us',
      message: { id: 'srv-1', text: 'Hi', outgoing: true, timestamp: 1 },
    });
    state = chatsReducer(state, {
      type: 'notification',
      body: incoming({ typeWebhook: 'outgoingAPIMessageReceived', idMessage: 'srv-1' }),
    });
    expect(state['79991234567@c.us'].messages).toHaveLength(1);
    expect(state['79991234567@c.us'].unread).toBe(0);
  });

  it('clears unread on read', () => {
    let state = chatsReducer(withChat(), { type: 'notification', body: incoming() });
    state = chatsReducer(state, { type: 'read', chatId: '79991234567@c.us' });
    expect(state['79991234567@c.us'].unread).toBe(0);
  });
});

describe('extractText', () => {
  it('reads extended text messages', () => {
    expect(
      extractText(incoming({ messageData: { typeMessage: 'extendedTextMessage', extendedTextMessageData: { text: 'link' } } })),
    ).toBe('link');
  });
});
