/*
 * ИНСТРУКЦИЯ:
 * 1. Откройте Google Таблицу: https://docs.google.com/spreadsheets/d/18XzAjhUSICZ020aOGOQlt5zkt5i76Rb5OaKrTuHPWIU
 * 2. Меню: Расширения > Apps Script
 * 3. Удалите всё содержимое и вставьте этот код
 * 4. Нажмите «Развернуть» > «Новое развёртывание»
 * 5. Тип: «Веб-приложение»
 * 6. Выполнять как: «Я» (ваш аккаунт)
 * 7. Доступ: «Все»
 * 8. Нажмите «Развернуть», разрешите доступ
 * 9. Скопируйте URL веб-приложения
 * 10. Вставьте URL в файл js/main.js в переменную APPS_SCRIPT_URL
 */

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    // Добавляем заголовки, если лист пустой
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        'Дата', 'ФИО', 'Email', 'Телефон',
        'Соцсети', 'От кого приглашение',
        'Специализация', 'Формат', 'Стоимость'
      ]);
    }

    sheet.appendRow([
      new Date().toLocaleString('ru-RU'),
      data.name || '',
      data.email || '',
      data.phone || '',
      data.social || '',
      data.referral || '',
      data.specialization || '',
      data.format || '',
      data.price || ''
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
