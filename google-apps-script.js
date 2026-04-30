/*
 * ИНСТРУКЦИЯ:
 * 1. Откройте нужную Google Таблицу с заявками.
 * 2. В первой строке — заголовки колонок. Для пары достаточно добавить вручную:
 *    ФИО 2 | почта 2 | телефон 2 | аккаунт 2
 *    Если этих колонок нет — скрипт создаст их сам справа при первой заявке «на двоих».
 * 3. Меню: Расширения > Apps Script
 * 4. Вставьте этот код, сохраните (Cmd+S)
 * 5. «Развернуть» > «Новое развёртывание» (или «Управление развёртываниями» — изменить, версия новая)
 * 6. Тип: «Веб-приложение», выполнять как: «Я», доступ: «Все»
 * 7. Скопируйте URL и вставьте в js/main.js → APPS_SCRIPT_URL
 *
 * Данные с лендинга приходят POST-ом в поле payload (form-urlencoded) или как JSON.
 * Ожидаемые заголовки (пример):
 * № | ФИО | почта | аккаунт | от кого получил | специальность | формат | телефон |
 * ФИО 2 | почта 2 | телефон 2 | аккаунт 2 | Дата | Стоимость | Статус оплаты
 */

function normHeader(s) {
  return String(s || '')
    .replace(/\u00a0/g, ' ')
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
      number: [
        '№',
        'номер',
        'n',
        'no'
      ],
      name: [
        'фио',
        'имя'
      ],
      email: [
        'почта',
        'email',
        'e-mail',
        'эл. почта',
        'эл почта',
        'электронная почта'
      ],
      social: [
        'аккаунт',
        'соцсети',
        'соц сети',
        'соц. сети',
        'соц.сети'
      ],
      referral: [
        'от кого получил',
        'от кого',
        'от кого узнал',
        'приглашение',
        'откуда'
      ],
      specialization: [
        'специальность',
        'специализация'
      ],
      format: [
        'формат',
        'тариф'
      ],
      phone: [
        'телефон',
        'phone',
        'тел.'
      ],
      name2: [
        'фио 2',
        'фио2',
        'фио (2)',
        'участник 2 фио',
        'участник 2',
        'участник2',
        'второй участник',
        'фио второго',
        'фио второго участника',
        '2 участник',
        'участник №2'
      ],
      email2: [
        'почта 2',
        'почта2',
        'email 2',
        'email2',
        'e-mail 2',
        'эл. почта 2',
        'эл почта 2',
        'почта второго'
      ],
      phone2: [
        'телефон 2',
        'телефон2',
        'phone 2',
        'тел 2',
        'тел. 2',
        'телефон второго'
      ],
      social2: [
        'аккаунт 2',
        'аккаунт2',
        'соц 2',
        'соцсети 2',
        'соц.сети 2',
        'аккаунт второго'
      ],
      date: [
        'дата',
        'date',
        'время'
      ],
      price: [
        'стоимость',
        'цена',
        'price',
        'сумма'
      ],
      paymentStatus: [
        'статус оплаты',
        'статус',
        'оплата'
      ]
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

    /**
     * Для колонок второго участника — если точного совпадения нет, ищем заголовок,
     * где есть «2»/«втор» и ключевое слово поля (узко, чтобы не перепутать с др. колонками).
     */
    function findColPairFuzzy(key) {
      var i;
      var h;
      var has2;
      for (i = 0; i < headers.length; i++) {
        h = normHeader(headers[i]);
        if (!h) continue;
        has2 = (h.indexOf('2') !== -1) || /втор|№\s*2/i.test(h);
        if (!has2 && h.indexOf('2') === -1) continue;
        if (key === 'name2') {
          if ((/фио|имя|участник/.test(h)) && !/почта|email|эл\.|тел|аккаунт|соц|phone/.test(h)) return i + 1;
        } else if (key === 'email2') {
          if (/почта|email|e-mail|эл/.test(h) && !/тел|фио|аккаунт|соц/.test(h)) return i + 1;
        } else if (key === 'phone2') {
          if (/тел|phone/.test(h) && !/почта|фио|email|аккаунт/.test(h)) return i + 1;
        } else if (key === 'social2') {
          if (/аккаунт|соц|соцсети/.test(h) && !/почта|тел|фио|email/.test(h)) return i + 1;
        }
      }
      return -1;
    }

    var cols = {};
    Object.keys(headerMap).forEach(function (key) {
      var idx = findColExact(headerMap[key]);
      if (idx < 0 && (key === 'name2' || key === 'email2' || key === 'phone2' || key === 'social2')) {
        idx = findColPairFuzzy(key);
      }
      cols[key] = idx;
    });

    var pairDefaults = {
      name2: 'ФИО 2',
      email2: 'почта 2',
      phone2: 'телефон 2',
      social2: 'аккаунт 2'
    };
    var pairOrder = ['name2', 'email2', 'phone2', 'social2'];

    pairOrder.forEach(function (pk) {
      if (cols[pk] > 0) return;
      var c = Math.max(sheet.getLastColumn(), 0) + 1;
      sheet.getRange(1, c).setValue(pairDefaults[pk]);
      cols[pk] = c;
    });

    lastCol = Math.max(sheet.getLastColumn(), 1);
    headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];

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
