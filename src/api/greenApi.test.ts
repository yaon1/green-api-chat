import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  deleteNotification,
  enableNotifications,
  phoneToChatId,
  receiveNotification,
  receivingReady,
  sendMessage,
} from './greenApi';

const creds = { apiUrl: 'https://api.green-api.com/', idInstance: '1101', apiTokenInstance: 'tok' };

function mockFetch(body: string, status = 200) {
  const fn = vi.fn().mockResolvedValue(new Response(body, { status }));
  vi.stubGlobal('fetch', fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe('phoneToChatId', () => {
  it('normalizes formatted numbers', () => {
    expect(phoneToChatId('+7 (999) 123-45-67')).toBe('79991234567@c.us');
  });
  it('rejects too short numbers', () => {
    expect(() => phoneToChatId('12345')).toThrow();
  });
});

describe('api calls', () => {
  it('sends a message with POST to the instance URL', async () => {
    const fetch = mockFetch('{"idMessage":"abc"}');
    await expect(sendMessage(creds, '79991234567@c.us', 'hi')).resolves.toBe('abc');
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('https://api.green-api.com/waInstance1101/sendMessage/tok');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ chatId: '79991234567@c.us', message: 'hi' });
  });

  it('treats an empty receiveNotification body as no notification', async () => {
    mockFetch('null');
    await expect(receiveNotification(creds)).resolves.toBeNull();
    mockFetch('');
    await expect(receiveNotification(creds)).resolves.toBeNull();
  });

  it('deletes a notification by receiptId with DELETE', async () => {
    const fetch = mockFetch('{"result":true}');
    await deleteNotification(creds, 42);
    expect(fetch.mock.calls[0][0]).toBe('https://api.green-api.com/waInstance1101/deleteNotification/tok/42');
    expect(fetch.mock.calls[0][1].method).toBe('DELETE');
  });

  it('throws on HTTP errors', async () => {
    mockFetch('', 401);
    await expect(sendMessage(creds, 'x', 'y')).rejects.toThrow('401');
  });
});

describe('notification settings', () => {
  it('requires incoming notifications and an empty webhook URL', () => {
    expect(receivingReady({ incomingWebhook: 'yes', webhookUrl: '' })).toBe(true);
    expect(receivingReady({ incomingWebhook: 'no', webhookUrl: '' })).toBe(false);
    expect(receivingReady({ incomingWebhook: 'yes', webhookUrl: 'https://example.com/hook' })).toBe(false);
  });

  it('enables notifications via setSettings', async () => {
    const fetch = mockFetch('{"saveSettings":true}');
    await enableNotifications(creds);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('https://api.green-api.com/waInstance1101/setSettings/tok');
    expect(JSON.parse(init.body)).toMatchObject({ webhookUrl: '', incomingWebhook: 'yes' });
  });
});
