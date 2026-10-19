# GREEN-API Chat

Веб-чат для отправки и получения текстовых сообщений в MAX (а также WhatsApp/Telegram) через [GREEN-API](https://green-api.com/max).
Интерфейс сделан по мотивам [web.max.ru](https://web.max.ru/): список чатов слева, переписка справа.

## Возможности

- Вход по учётным данным инстанса GREEN-API: `apiUrl`, `idInstance`, `apiTokenInstance` (проверяется через `getStateInstance`).
- Создание чата по номеру телефона получателя.
- Отправка текстовых сообщений — метод [SendMessage](https://green-api.com/v3/docs/api/sending/SendMessage/).
- Получение сообщений — [HTTP API](https://green-api.com/v3/docs/api/receiving/technology-http-api/): long polling `ReceiveNotification` + `DeleteNotification`.
- Входящие от новых собеседников автоматически открывают новый чат; счётчик непрочитанных.
- Сообщения, отправленные с телефона или через API, тоже попадают в историю (`outgoingMessageReceived`, `outgoingAPIMessageReceived`).
- История и учётные данные хранятся в `localStorage` браузера; на сервер, кроме GREEN-API, ничего не отправляется.
- Адаптивная вёрстка, светлая и тёмная тема.

## Стек

React 18, TypeScript, Vite, Vitest. Без UI-библиотек и сторонних SDK — запросы к API на `fetch`.

## Запуск локально

Нужен Node.js 18+.

```bash
git clone <repo-url> green-api-chat
cd green-api-chat
npm install
npm run dev        # http://localhost:5173
```

Сборка и проверки:

```bash
npm run build      # проверка типов + production-сборка в dist/
npm test           # юнит-тесты (логика чатов и API-клиент)
npm run preview    # просмотр собранной версии
```

## Подготовка инстанса GREEN-API

1. Зарегистрируйтесь в [консоли GREEN-API](https://console.green-api.com/) и создайте инстанс для MAX.
2. Авторизуйте инстанс (QR-код / номер телефона) — статус должен быть `authorized`.
3. В настройках инстанса включите получение уведомлений о входящих сообщениях
   (и, при желании, об исходящих). URL вебхука оставьте пустым — приложение получает уведомления через HTTP API.
4. Скопируйте `apiUrl`, `idInstance` и `apiTokenInstance` и введите их на экране входа.

## Как пользоваться

1. Войдите с учётными данными инстанса.
2. Введите номер получателя в международном формате (например, `79991234567`) и нажмите «Создать».
3. Напишите сообщение и нажмите Enter или кнопку отправки.
4. Когда получатель ответит в MAX, ответ появится в чате.

## Структура

```
src/
  api/greenApi.ts           клиент GREEN-API: sendMessage, receiveNotification, deleteNotification, getStateInstance
  lib/chats.ts              редьюсер состояния чатов: сопоставление уведомлений с чатами, дедупликация
  lib/useNotifications.ts   цикл long polling с экспоненциальной паузой при ошибках
  lib/storage.ts            сохранение учётных данных и истории в localStorage
  components/               LoginForm, Sidebar, ChatWindow
```

Для MAX входящие уведомления могут приходить с числовым `chatId`, а чат создаётся по номеру телефона,
поэтому сообщение сопоставляется с чатом по `senderPhoneNumber`, а новый `chatId` запоминается как алиас.
