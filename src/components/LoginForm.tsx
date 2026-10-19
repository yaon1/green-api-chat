import { type FormEvent, useState } from 'react';
import { type Credentials, getStateInstance } from '../api/greenApi';

interface Props {
  onLogin: (creds: Credentials) => void;
}

export function LoginForm({ onLogin }: Props) {
  const [apiUrl, setApiUrl] = useState('https://api.green-api.com');
  const [idInstance, setIdInstance] = useState('');
  const [apiTokenInstance, setApiTokenInstance] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      onLogin(creds);
    } catch {
      setError('Не удалось подключиться. Проверьте apiUrl, idInstance и apiTokenInstance.');
    } finally {
      setLoading(false);
    }
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
