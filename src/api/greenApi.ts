export interface Credentials {
  apiUrl: string;
  idInstance: string;
  apiTokenInstance: string;
}

export interface SenderData {
  chatId: string;
  chatName?: string;
  sender?: string;
  senderName?: string;
  senderPhoneNumber?: number;
}

export interface MessageData {
  typeMessage: string;
  textMessageData?: { textMessage: string };
  extendedTextMessageData?: { text: string };
}

export interface NotificationBody {
  typeWebhook: string;
  timestamp: number;
  idMessage?: string;
  senderData?: SenderData;
  messageData?: MessageData;
}

export interface Notification {
  receiptId: number;
  body: NotificationBody;
}

export class GreenApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'GreenApiError';
  }
}

function methodUrl(creds: Credentials, method: string, suffix = ''): string {
  const base = creds.apiUrl.replace(/\/+$/, '');
  return `${base}/waInstance${creds.idInstance}/${method}/${creds.apiTokenInstance}${suffix}`;
}

async function request<T>(url: string, init?: RequestInit): Promise<T | null> {
  const res = await fetch(url, init);
  if (!res.ok) {
    throw new GreenApiError(`GREEN-API ответил ${res.status} ${res.statusText}`, res.status);
  }
  const text = await res.text();
  // receiveNotification returns an empty body when the queue is empty.
  if (!text || text === 'null') return null;
  return JSON.parse(text) as T;
}

/** Turns "+7 (999) 123-45-67" into the chatId GREEN-API expects for a phone number (Telegram, MAX, WhatsApp). */
export function phoneToChatId(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) throw new GreenApiError('Введите номер телефона в международном формате');
  return `${digits}@c.us`;
}

export async function getStateInstance(creds: Credentials): Promise<string> {
  const data = await request<{ stateInstance: string }>(methodUrl(creds, 'getStateInstance'));
  return data?.stateInstance ?? 'unknown';
}

export interface InstanceSettings {
  webhookUrl?: string;
  incomingWebhook?: string;
  outgoingWebhook?: string;
  outgoingAPIMessageWebhook?: string;
}

export async function getSettings(creds: Credentials): Promise<InstanceSettings> {
  return (await request<InstanceSettings>(methodUrl(creds, 'getSettings'))) ?? {};
}

/** HTTP API receiving needs notifications enabled and no webhook URL set. */
export function receivingReady(settings: InstanceSettings): boolean {
  return settings.incomingWebhook === 'yes' && !settings.webhookUrl;
}

/** Enables incoming/outgoing notifications for HTTP API polling (webhookUrl must stay empty). */
export async function enableNotifications(creds: Credentials): Promise<void> {
  await request(methodUrl(creds, 'setSettings'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      webhookUrl: '',
      incomingWebhook: 'yes',
      outgoingWebhook: 'yes',
      outgoingAPIMessageWebhook: 'yes',
      outgoingMessageWebhook: 'yes',
    }),
  });
}

export async function sendMessage(
  creds: Credentials,
  chatId: string,
  message: string,
): Promise<string> {
  const data = await request<{ idMessage: string }>(methodUrl(creds, 'sendMessage'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chatId, message }),
  });
  if (!data?.idMessage) throw new GreenApiError('Сообщение не принято сервером');
  return data.idMessage;
}

export async function receiveNotification(
  creds: Credentials,
  receiveTimeout = 5,
  signal?: AbortSignal,
): Promise<Notification | null> {
  return request<Notification>(
    methodUrl(creds, 'receiveNotification', `?receiveTimeout=${receiveTimeout}`),
    { signal },
  );
}

export async function deleteNotification(creds: Credentials, receiptId: number): Promise<void> {
  await request(methodUrl(creds, 'deleteNotification', `/${receiptId}`), { method: 'DELETE' });
}
