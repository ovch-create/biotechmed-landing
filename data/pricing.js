const pricing = [
  {
    title: "Запись",
    subtitle: "Онлайн-доступ к записям БиотехМед в СПб",
    price: "3 000 ₽",
    highlighted: false,
    features: [
      "Записи лекций интенсива в Санкт-Петербурге",
      "Просмотр в удобное время",
      "Возможность пересматривать"
    ],
    note: null,
    cta: "Зарегистрироваться",
    formFormat: "Запись интенсива БиотехМед СПб",
    formPrice: "3 000 ₽",
    widgetScriptId: "d8fc6da7b4965c285988cc5efa52d82c6c745595",
    widgetScriptSrc: "https://artlifecourse.getcourse.ru/pl/lite/widget/script?id=1583159"
  },
  {
    title: "Очное участие",
    subtitle: "Санкт-Петербург, 23 мая",
    price: "2 500 ₽",
    priceNote: "до 19 апреля",
    priceLater: "3 500 ₽ с 20 апреля",
    highlighted: true,
    features: [
      "Полная программа интенсива в очном формате",
      "Лекции от биотехнолога Семёна Фомина",
      'Рубрика «К барьеру»: честный диалог с производителем',
      "Личный вопрос спикеру вне сцены",
      "Кофебрейк и приятные бонусы от бренда",
      "Обмен опытом и нетворкинг с коллегами"
    ],
    note: "Количество мест ограничено",
    cta: "Зарегистрироваться",
    formFormat: "Очное",
    formPrice: new Date() < new Date('2026-04-20') ? "2 500 ₽" : "3 500 ₽",
    widgetScriptId: "b33ccd3e92494e8428579260955b021cdea31c74",
    widgetScriptSrc: "https://artlifecourse.getcourse.ru/pl/lite/widget/script?id=1583154"
  },
  {
    title: "Расширенный",
    subtitle: "Записи БиотехМед Санкт-Петербург и БиотехМед Краснодар",
    price: "5 000 ₽",
    highlighted: false,
    features: [
      "Записи лекций БиотехМед Санкт-Петербург",
      "Записи лекций БиотехМед Краснодар",
      "Доступ к записям через ~2 недели после события",
      "Возможность пересматривать"
    ],
    note: "Краснодарская запись доступна к покупке последний раз",
    cta: "Зарегистрироваться",
    formFormat: "Запись интенсивов БиотехМед СПб и БиотехМед Краснодар",
    formPrice: "5 000 ₽",
    widgetScriptId: "4bfdd563972457889cad1d3b19bc308ae2baf6aa",
    widgetScriptSrc: "https://artlifecourse.getcourse.ru/pl/lite/widget/script?id=1583161"
  }
];
