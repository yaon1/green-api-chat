# GREEN-API Chat

Веб-чат для отправки и получения текстовых сообщений в **Telegram** через [GREEN-API](https://green-api.com/telegram)
(тестовое задание на позицию «Фронтенд разработчик React»; задание допускает Telegram вместо MAX).
API GREEN-API единый для MAX, Telegram и WhatsApp, поэтому приложение работает с инстансом любого из этих мессенджеров.
Интерфейс сделан по мотивам [web.max.ru](https://web.max.ru/): список чатов слева, переписка справа.

**Демо:** https://yaon1.github.io/green-api-chat/

## Возможности

- Вход по учётным данным инстанса GREEN-API: `apiUrl`, `idInstance`, `apiTokenInstance` (проверяется через `getStateInstance`).
- Создание чата по номеру телефона получателя.
- Отправка текстовых сообщений — метод [SendMessage](https://green-api.com/telegram/docs/api/sending/SendMessage/).
- Получение сообщений — [HTTP API](https://green-api.com/telegram/docs/api/receiving/technology-http-api/): long polling `ReceiveNotification` + `DeleteNotification`.
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

1. Зарегистрируйтесь в [консоли GREEN-API](https://console.green-api.com/) и создайте инстанс для Telegram.
2. Авторизуйте инстанс (QR-код / номер телефона Telegram) — статус должен быть `authorized`.
3. Уведомления о входящих сообщениях должны быть включены, а URL вебхука — пустым (приложение получает
   уведомления через HTTP API). Если это не так, приложение при входе предложит включить их одной кнопкой
   (метод `SetSettings`), либо это можно сделать вручную в консоли.
4. Скопируйте `apiUrl`, `idInstance` и `apiTokenInstance` и введите их на экране входа.

## Как пользоваться

1. Войдите с учётными данными инстанса.
2. Введите номер получателя в международном формате (например, `79991234567`) и нажмите «Создать».
3. Напишите сообщение и нажмите Enter или кнопку отправки.
4. Когда получатель ответит в Telegram, ответ появится в чате.

## Структура

```
src/
  api/greenApi.ts           клиент GREEN-API: sendMessage, receiveNotification, deleteNotification, getStateInstance
  lib/chats.ts              редьюсер состояния чатов: сопоставление уведомлений с чатами, дедупликация
  lib/useNotifications.ts   цикл long polling с экспоненциальной паузой при ошибках
  lib/storage.ts            сохранение учётных данных и истории в localStorage
  components/               LoginForm, Sidebar, ChatWindow
```

В Telegram (и MAX) входящие уведомления приходят с числовым `chatId`, а чат создаётся по номеру телефона,
поэтому сообщение сопоставляется с чатом по `senderPhoneNumber`, а новый `chatId` запоминается как алиас.

## Деплой

Каждый push в `main` собирает проект и публикует его на GitHub Pages (`.github/workflows/deploy.yml`).
