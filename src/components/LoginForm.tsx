import { type FormEvent, useState } from 'react';
import {
  type Credentials,
  enableNotifications,
  getSettings,
  getStateInstance,
  receivingReady,
} from '../api/greenApi';

interface Props {
  onLogin: (creds: Credentials) => void;
}

export function LoginForm({ onLogin }: Props) {
  const [apiUrl, setApiUrl] = useState('https://api.green-api.com');
  const [idInstance, setIdInstance] = useState('');
  const [apiTokenInstance, setApiTokenInstance] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<Credentials | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const creds = {
      apiUrl: apiUrl.trim(),
      idInstance: idInstance.trim(),
      apiTokenInstance: apiTokenInstance.trim(),
    };
    setLoading(true);
    setError(null);
    try {
      const state = await getStateInstance(creds);
      if (state !== 'authorized') {
        setError(`Инстанс не авторизован (состояние: ${state}). Авторизуйте его в консоли GREEN-API.`);
        return;
      }
      if (!receivingReady(await getSettings(creds))) {
        setPending(creds);
        return;
      }
      onLogin(creds);
    } catch {
      setError('Не удалось подключиться. Проверьте apiUrl, idInstance и apiTokenInstance.');
    } finally {
      setLoading(false);
    }
  }

  async function enableAndLogin() {
    if (!pending) return;
    setLoading(true);
    setError(null);
    try {
      await enableNotifications(pending);
      onLogin(pending);
    } catch {
      setError('Не удалось изменить настройки инстанса. Включите уведомления в консоли GREEN-API.');
    } finally {
      setLoading(false);
    }
  }

  if (pending) {
    return (
      <div className="login">
        <div className="login__card">
          <h1>Нужны уведомления</h1>
          <p className="muted">
            Чтобы получать ответы, в инстансе должны быть включены уведомления о входящих сообщениях, а URL вебхука —
            пустым (приложение получает сообщения через HTTP API).
          </p>
          {error && <div className="error">{error}</div>}
          <button className="btn" onClick={enableAndLogin} disabled={loading}>
            {loading ? 'Сохраняем…' : 'Включить и продолжить'}
          </button>
          <button className="link" onClick={() => onLogin(pending)}>
            Продолжить без получения сообщений
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="login">
      <form className="login__card" onSubmit={submit}>
        <div className="login__logo">💬</div>
        <h1>Вход в чат</h1>
        <p className="muted">Учётные данные инстанса Telegram из консоли GREEN-API</p>
        <label>
          apiUrl
          <input value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} required />
        </label>
        <label>
          idInstance
          <input
            value={idInstance}
            onChange={(e) => setIdInstance(e.target.value)}
            inputMode="numeric"
            placeholder="1100000000"
            required
          />
        </label>
        <label>
          apiTokenInstance
          <input
            value={apiTokenInstance}
            onChange={(e) => setApiTokenInstance(e.target.value)}
            type="password"
            autoComplete="off"
            required
          />
        </label>
        {error && <div className="error">{error}</div>}
        <button className="btn" disabled={loading}>
          {loading ? 'Проверяем…' : 'Войти'}
        </button>
      </form>
    </div>
  );
}
