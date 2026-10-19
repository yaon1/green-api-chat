import { type FormEvent, useState } from 'react';
import type { Chat } from '../lib/chats';
import type { PollStatus } from '../lib/useNotifications';

interface Props {
  chats: Chat[];
  activeId: string | null;
  status: PollStatus;
  idInstance: string;
  onSelect: (id: string) => void;
  onCreate: (phone: string) => string | null;
  onLogout: () => void;
}

const STATUS_LABEL: Record<PollStatus, string> = {
  idle: 'Подключение…',
  polling: 'В сети',
  error: 'Нет связи, переподключаемся…',
};

export function Sidebar({ chats, activeId, status, idInstance, onSelect, onCreate, onLogout }: Props) {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    const err = onCreate(phone);
    setError(err);
    if (!err) setPhone('');
  }

  return (
    <aside className="sidebar">
      <header className="sidebar__header">
        <div>
          <div className="sidebar__title">Чаты</div>
          <div className={`status status--${status}`}>
            {STATUS_LABEL[status]} · {idInstance}
          </div>
        </div>
        <button className="link" onClick={onLogout}>
          Выйти
        </button>
      </header>

      <form className="new-chat" onSubmit={submit}>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Номер получателя, напр. 79991234567"
          inputMode="tel"
        />
        <button className="btn btn--small">Создать</button>
      </form>
      {error && <div className="error error--inline">{error}</div>}

      <ul className="chat-list">
        {chats.length === 0 && <li className="muted chat-list__empty">Создайте чат по номеру телефона</li>}
        {chats.map((chat) => {
          const last = chat.messages[chat.messages.length - 1];
          return (
            <li key={chat.id}>
              <button
                className={`chat-item ${chat.id === activeId ? 'chat-item--active' : ''}`}
                onClick={() => onSelect(chat.id)}
              >
                <span className="avatar">{chat.title.replace(/\D/g, '').slice(-2) || chat.title[0]}</span>
                <span className="chat-item__body">
                  <span className="chat-item__title">{chat.title}</span>
                  <span className="chat-item__last">
                    {last ? `${last.outgoing ? 'Вы: ' : ''}${last.text}` : 'Нет сообщений'}
                  </span>
                </span>
                {chat.unread > 0 && <span className="badge">{chat.unread}</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
