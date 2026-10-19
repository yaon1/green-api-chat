import { type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from 'react';
import type { Chat } from '../lib/chats';

interface Props {
  chat: Chat | null;
  onSend: (text: string) => void;
  onBack: () => void;
}

const timeFormat = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' });

export function ChatWindow({ chat, onSend, onBack }: Props) {
  const [text, setText] = useState('');
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' });
  }, [chat?.messages.length, chat?.id]);

  if (!chat) {
    return (
      <section className="chat chat--empty">
        <div className="muted">Выберите чат или создайте новый</div>
      </section>
    );
  }

  function submit(e?: FormEvent) {
    e?.preventDefault();
    const value = text.trim();
    if (!value) return;
    onSend(value);
    setText('');
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <section className="chat">
      <header className="chat__header">
        <button className="back" onClick={onBack} aria-label="Назад">
          ‹
        </button>
        <span className="avatar">{chat.title.replace(/\D/g, '').slice(-2) || chat.title[0]}</span>
        <div>
          <div className="chat__title">{chat.title}</div>
          <div className="muted small">{chat.id}</div>
        </div>
      </header>

      <div className="chat__messages">
        {chat.messages.map((m) => (
          <div key={m.id} className={`bubble ${m.outgoing ? 'bubble--out' : 'bubble--in'}`}>
            <div className="bubble__text">{m.text}</div>
            <div className="bubble__meta">
              {timeFormat.format(m.timestamp)}
              {m.outgoing && <span>{m.failed ? ' ⚠️' : m.pending ? ' 🕓' : ' ✓'}</span>}
            </div>
          </div>
        ))}
        <div ref={bottom} />
      </div>

      <form className="composer" onSubmit={submit}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Сообщение"
          rows={1}
          maxLength={4000}
        />
        <button className="send" aria-label="Отправить" disabled={!text.trim()}>
          ➤
        </button>
      </form>
    </section>
  );
}
