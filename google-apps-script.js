/*
 * ИНСТРУКЦИЯ:
 * 1. Откройте Google Таблицу с заявками.
 * 2. В первой строке — заголовки колонок (уже созданы):
 *    № | ФИО | почта | телефон | аккаунт | от кого получил | специальность | формат | Дата | Стоимость | Статус оплаты
 *    Порядок и точные формулировки не важны — скрипт ищет колонки по названию.
 * 3. Меню: Расширения > Apps Script
 * 4. Вставьте этот код, сохраните (Cmd+S)
 * 5. «Развернуть» > «Новое развёртывание»
 * 6. Тип: «Веб-приложение», выполнять как: «Я», доступ: «Все»
 * 7. Скопируйте URL (.../exec) и вставьте в js/main.js → APPS_SCRIPT_URL
 *
 * Данные с лендинга приходят POST-ом в поле payload (form-urlencoded) или как JSON.
 */

function normHeader(s) {
  return String(s || '')
    .replace(/ /g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/**
 * Парсит тело POST: JSON или form field payload= (нужен для fetch no-cors + urlencoded).
 */
function parseRequestData(e) {
  if (e.parameter && e.parameter.payload) {
    return JSON.parse(e.parameter.payload);
  }
  if (!e.postData || !e.postData.contents) {
    throw new Error('Пустое тело запроса');
  }
  var raw = String(e.postData.contents).trim();
  var ct = (e.postData.type || '').toLowerCase();
  if (ct.indexOf('application/json') >= 0) {
    return JSON.parse(raw);
  }
  if (raw.charAt(0) === '{' || raw.charAt(0) === '[') {
    return JSON.parse(raw);
  }
  if (raw.indexOf('payload=') === 0) {
    var v = raw.substring('payload='.length);
    return JSON.parse(decodeURIComponent(v));
  }
  var parts = raw.split('&');
  var i;
  for (i = 0; i < parts.length; i++) {
    if (parts[i].indexOf('payload=') === 0) {
      return JSON.parse(decodeURIComponent(parts[i].substring('payload='.length).replace(/\+/g, ' ')));
    }
  }
  return JSON.parse(raw);
}

function doPost(e) {
  try {
    var data = parseRequestData(e);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    var lastCol = Math.max(sheet.getLastColumn(), 1);
    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];

    var headerMap = {
      number: ['№', 'номер', 'n', 'no'],
      name: ['фио', 'имя'],
      email: ['почта', 'email', 'e-mail', 'эл. почта', 'эл почта', 'электронная почта'],
      phone: ['телефон', 'phone', 'тел.'],
      social: ['аккаунт', 'соцсети', 'соц сети', 'соц. сети', 'соц.сети'],
      referral: ['от кого получил', 'от кого', 'от кого узнал', 'приглашение', 'откуда'],
      specialization: ['специальность', 'специализация'],
      format: ['формат', 'тариф'],
      date: ['дата', 'date', 'время'],
      price: ['стоимость', 'цена', 'price', 'сумма'],
      paymentStatus: ['статус оплаты', 'статус', 'оплата']
    };

    function findColExact(candidates) {
      var i;
      var j;
      for (i = 0; i < headers.length; i++) {
        var h = normHeader(headers[i]);
        if (!h) continue;
        for (j = 0; j < candidates.length; j++) {
          if (h === candidates[j]) return i + 1;
        }
      }
      return -1;
    }

    var cols = {};
    Object.keys(headerMap).forEach(function (key) {
      cols[key] = findColExact(headerMap[key]);
    });

    var nextRow = sheet.getLastRow() + 1;
    var rowValues = new Array(lastCol).fill('');

    function setCell(colIndex, value) {
      if (colIndex > 0 && colIndex <= lastCol) rowValues[colIndex - 1] = value;
    }

    setCell(cols.number, nextRow - 1);
    setCell(cols.name, data.name || '');
    setCell(cols.email, data.email || '');
    setCell(cols.phone, data.phone || '');
    setCell(cols.social, data.social || '');
    setCell(cols.referral, data.referral || '');
    setCell(cols.specialization, data.specialization || '');
    setCell(cols.format, data.format || '');
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
