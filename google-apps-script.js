/*
 * ИНСТРУКЦИЯ:
 * 1. Откройте Google Таблицу: https://docs.google.com/spreadsheets/d/18XzAjhUSICZ020aOGOQlt5zkt5i76Rb5OaKrTuHPWIU
 * 2. Убедитесь, что в первой строке есть колонки (добавьте при необходимости):
 *    № | ФИО | почта | аккаунт | от кого получил | специальность | формат | телефон |
 *    ФИО 2 | почта 2 | телефон 2 | аккаунт 2 | Дата | Стоимость | Статус оплаты
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

    var headerMap = {
      number:         ['№', 'номер', 'n'],
      name:           ['фио', 'имя'],
      email:          ['почта', 'email', 'e-mail', 'эл. почта', 'эл почта'],
      social:         ['аккаунт', 'соцсети', 'соц сети', 'соц. сети', 'соц.сети'],
      referral:       ['от кого получил', 'от кого', 'приглашение'],
      specialization: ['специальность', 'специализация'],
      format:         ['формат'],
      phone:          ['телефон', 'phone'],
      name2:          ['фио 2', 'фио2', 'участник 2 фио'],
      email2:         ['почта 2', 'почта2', 'email 2', 'email2'],
      phone2:         ['телефон 2', 'телефон2', 'phone 2'],
      social2:        ['аккаунт 2', 'аккаунт2', 'соц 2'],
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

    setCell(cols.number, nextRow - 1);
    setCell(cols.name, data.name || '');
    setCell(cols.email, data.email || '');
    setCell(cols.social, data.social || '');
    setCell(cols.referral, data.referral || '');
    setCell(cols.specialization, data.specialization || '');
    setCell(cols.format, data.format || '');
    setCell(cols.phone, data.phone || '');
    setCell(cols.name2, data.name2 || '');
    setCell(cols.email2, data.email2 || '');
    setCell(cols.phone2, data.phone2 || '');
    setCell(cols.social2, data.social2 || '');
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
