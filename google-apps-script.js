/*
 * ИНСТРУКЦИЯ:
 * 1. Откройте Google Таблицу: https://docs.google.com/spreadsheets/d/18XzAjhUSICZ020aOGOQlt5zkt5i76Rb5OaKrTuHPWIU
 * 2. Убедитесь, что в первой строке есть колонки:
 *    № | ФИО | почта | аккаунт | от кого получил | специальность | формат | телефон | Дата | Стоимость | Статус оплаты
 *    (последние три можно добавить в конец — в любом порядке, скрипт найдёт их по названию)
 * 3. Меню: Расширения > Apps Script
 * 4. Удалите всё содержимое и вставьте этот код
 * 5. Сохраните (Cmd+S)
 * 6. Нажмите «Развернуть» > «Новое развёртывание»
 * 7. Тип: «Веб-приложение», Выполнять как: «Я», Доступ: «Все»
 * 8. Нажмите «Развернуть», разрешите доступ
 * 9. Скопируйте URL веб-приложения
 * 10. Вставьте URL в файл js/main.js в переменную APPS_SCRIPT_URL
 */

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    var lastCol = Math.max(sheet.getLastColumn(), 1);
    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];

    // Возможные варианты заголовков для каждого поля
    var headerMap = {
      number:         ['№', 'номер', 'n'],
      name:           ['фио', 'имя'],
      email:          ['почта', 'email', 'e-mail', 'эл. почта', 'эл почта'],
      social:         ['аккаунт', 'соцсети', 'соц сети', 'соц. сети', 'соц.сети'],
      referral:       ['от кого получил', 'от кого', 'приглашение'],
      specialization: ['специальность', 'специализация'],
      format:         ['формат'],
      phone:          ['телефон', 'phone'],
      date:           ['дата', 'date'],
      price:          ['стоимость', 'цена', 'price'],
      paymentStatus:  ['статус оплаты', 'статус', 'оплата']
    };

    function findCol(candidates) {
      for (var i = 0; i < headers.length; i++) {
        var h = String(headers[i] || '').trim().toLowerCase();
        if (!h) continue;
        for (var j = 0; j < candidates.length; j++) {
          if (h === candidates[j]) return i + 1;
        }
      }
      return -1;
    }

    var cols = {};
    Object.keys(headerMap).forEach(function (key) {
      cols[key] = findCol(headerMap[key]);
    });

    var nextRow = sheet.getLastRow() + 1;
    var rowValues = new Array(lastCol).fill('');

    function setCell(colIndex, value) {
      if (colIndex > 0 && colIndex <= lastCol) rowValues[colIndex - 1] = value;
    }

    setCell(cols.number, nextRow - 1); // порядковый номер = № строки минус заголовок
    setCell(cols.name, data.name || '');
    setCell(cols.email, data.email || '');
    setCell(cols.social, data.social || '');
    setCell(cols.referral, data.referral || '');
    setCell(cols.specialization, data.specialization || '');
    setCell(cols.format, data.format || '');
    setCell(cols.phone, data.phone || '');
    setCell(cols.date, new Date().toLocaleString('ru-RU'));
    setCell(cols.price, data.price || '');
    setCell(cols.paymentStatus, data.paymentStatus || 'Не подтверждена');

    sheet.getRange(nextRow, 1, 1, lastCol).setValues([rowValues]);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
