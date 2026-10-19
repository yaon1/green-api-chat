import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { type Credentials, type NotificationBody, phoneToChatId, sendMessage } from './api/greenApi';
import { ChatWindow } from './components/ChatWindow';
import { LoginForm } from './components/LoginForm';
import { Sidebar } from './components/Sidebar';
import { chatsReducer } from './lib/chats';
import { clearCredentials, loadChats, loadCredentials, saveChats, saveCredentials } from './lib/storage';
import { useNotifications } from './lib/useNotifications';

export function App() {
  const [creds, setCreds] = useState<Credentials | null>(() => loadCredentials());

  function login(next: Credentials) {
    saveCredentials(next);
    setCreds(next);
  }

  function logout() {
    clearCredentials();
    setCreds(null);
  }

  if (!creds) return <LoginForm onLogin={login} />;
  return <Messenger key={creds.idInstance} creds={creds} onLogout={logout} />;
}

function Messenger({ creds, onLogout }: { creds: Credentials; onLogout: () => void }) {
  const [chats, dispatch] = useReducer(chatsReducer, creds.idInstance, loadChats);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => saveChats(creds.idInstance, chats), [creds.idInstance, chats]);

  const onNotification = useCallback((body: NotificationBody) => dispatch({ type: 'notification', body }), []);
  const status = useNotifications(creds, onNotification);

  const sorted = useMemo(
    () =>
      Object.values(chats).sort(
        (a, b) => (b.messages.at(-1)?.timestamp ?? 0) - (a.messages.at(-1)?.timestamp ?? 0),
      ),
    [chats],
  );
  const active = activeId ? chats[activeId] ?? null : null;

  useEffect(() => {
    if (active && active.unread > 0) dispatch({ type: 'read', chatId: active.id });
  }, [active]);

  function createChat(phone: string): string | null {
    try {
      const chatId = phoneToChatId(phone);
      dispatch({ type: 'create', chatId, phone: phone.replace(/\D/g, '') });
      setActiveId(chatId);
      return null;
    } catch (err) {
      return (err as Error).message;
    }
  }

  async function send(text: string) {
    if (!active) return;
    const tempId = `tmp-${Date.now()}`;
    const chatId = active.id;
    dispatch({
      type: 'outgoing',
      chatId,
      message: { id: tempId, text, outgoing: true, timestamp: Date.now(), pending: true },
    });
    try {
      const idMessage = await sendMessage(creds, chatId, text);
      dispatch({ type: 'confirm', chatId, tempId, idMessage });
    } catch (err) {
      console.error('[green-api-chat] send failed', err);
      dispatch({ type: 'fail', chatId, tempId });
    }
  }

  return (
    <div className={`app ${active ? 'app--chat-open' : ''}`}>
      <Sidebar
        chats={sorted}
        activeId={activeId}
        status={status}
        idInstance={creds.idInstance}
        onSelect={setActiveId}
        onCreate={createChat}
        onLogout={onLogout}
      />
      <ChatWindow chat={active} onSend={send} onBack={() => setActiveId(null)} />
    </div>
  );
}
