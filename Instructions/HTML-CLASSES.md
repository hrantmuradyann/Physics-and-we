# Справочник HTML-классов — Physics and We

Этот файл объясняет **каждый класс, который встречается в HTML-разметке сайта**:
что он значит, как выглядит на экране и какой CSS за ним стоит.

Читать так: находишь в `sections/*.html` непонятный `class="..."` — ищешь его здесь.

Общее правило проекта: **в HTML нет текста и нет стилей.**
Текст берётся из `data/*.json`, внешний вид — целиком из четырёх CSS-файлов.
Класс в разметке — это только имя, по которому CSS находит элемент.

---

## Содержание

1. [Как устроена разметка](#1-как-устроена-разметка)
2. [Соглашение об именах (БЭМ)](#2-соглашение-об-именах-бэм)
3. [Каркас страницы](#3-каркас-страницы)
4. [Шапка, меню, футер](#4-шапка-меню-футер)
5. [Текстовые классы](#5-текстовые-классы)
6. [Кнопки](#6-кнопки)
7. [Заголовок страницы `.page-head`](#7-заголовок-страницы-page-head)
8. [Полосы `.band`](#8-полосы-band)
9. [Сетки `.grid`](#9-сетки-grid)
10. [Карточки `.card`](#10-карточки-card)
11. [Цифры `.stat`](#11-цифры-stat)
12. [Пронумерованные шаги `.steps`](#12-пронумерованные-шаги-steps)
13. [Лента дней `.timeline`](#13-лента-дней-timeline)
14. [Вопросы и ответы `.faq`](#14-вопросы-и-ответы-faq)
15. [Картинка рядом с текстом `.showcase`](#15-картинка-рядом-с-текстом-showcase)
16. [Приглашение в конце `.cta`](#16-приглашение-в-конце-cta)
17. [Первый экран главной `.hero`](#17-первый-экран-главной-hero)
18. [Новости: лента и страница новости](#18-новости-лента-post-card-и-страница-post)
19. [Анимация появления `.reveal`](#19-анимация-появления-reveal)
20. [Классы админки `/admin/`](#20-классы-админки-admin)
21. [Атрибуты `data-*` (не классы, но важно)](#21-атрибуты-data--не-классы-но-важно)
22. [CSS-переменные (цвета и размеры)](#22-css-переменные-цвета-и-размеры)
23. [Адаптив: что меняется на телефоне](#23-адаптив-что-меняется-на-телефоне)

---

## 1. Как устроена разметка

| Файл | Что в нём |
|---|---|
| [index.html](index.html) | «Скорлупа»: подключает CSS и JS, содержит три пустых места — `#site-header`, `#app`, `#site-footer`. Контента нет. |
| [sections/](sections/) | По одному файлу на страницу — только структура блоков, без текста. |
| [data/](data/) | Текст на трёх языках (hy / en / ru). |
| [css/style.css](css/style.css) | Сброс стилей, переменные, шапка, футер. Общий для сайта и админки. |
| [css/site.css](css/site.css) | Внешний вид всех публичных страниц (тёмная тема). |
| [css/home.css](css/home.css) | Только первый экран главной (`.hero`). |
| [css/admin.css](css/admin.css) | Только админка `/admin/` (светлая тема). |

Важный момент: почти весь `site.css` написан как `body.site .что-то`.
Класс `site` стоит на `<body class="site home">` в [index.html](index.html#L34).
Поэтому тёмная тема применяется только к публичным страницам, а админка остаётся светлой.

---

## 2. Соглашение об именах (БЭМ)

```
.card            ← блок          (самостоятельная штука)
.card__title     ← элемент блока (часть внутри, два подчёркивания)
.card--link      ← модификатор   (вариант блока, два дефиса)
```

* `__` — «часть чего-то». `.hero__title` — заголовок внутри `.hero`.
* `--` — «такой же, но другой». `.band--alt` — та же полоса, но светлее.
* Модификатор **никогда не ставится один**, всегда вместе с базовым классом:
  `class="btn btn--primary"`, а не `class="btn--primary"`.

---

## 3. Каркас страницы

```html
<body class="site home">
  <header id="site-header"></header>
  <main id="app">
    <section class="view active" id="view-home">
      <section class="band">
        <div class="container"> ... </div>
      </section>
    </section>
  </main>
  <footer id="site-footer"></footer>
</body>
```

### `site` (на `<body>`)
**Что это:** метка «это публичная страница сайта, а не админка».
**Как выглядит:** включает тёмную тему — почти чёрный фон `#070b1a`, светло-серый текст `#e8ecf6`.
**CSS:** [css/site.css:23](css/site.css#L23)

```css
body.site {
  --header-h: 4.6rem;          /* высота шапки, используется как отступ сверху */
  background-color: var(--dark-bg);
  color: var(--dark-text);
}
```

### `home` (на `<body>`)
**Что это:** метка «сейчас открыта главная».
**Как выглядит:** шапка становится прозрачной и «плавает» поверх первого экрана; у `#app` пропадает верхний отступ, чтобы hero уходил под шапку.
**CSS:** [css/site.css:39](css/site.css#L39), [css/site.css:73](css/site.css#L73)

```css
body.site:not(.home) #app { padding-top: var(--header-h); }  /* внутренние страницы */
body.site.home #site-header { background: transparent; }     /* главная */
```

### `.container` ⭐ самый частый класс
**Что это:** обёртка, которая держит содержимое по центру и не даёт строкам растянуться на весь монитор.
**Как выглядит:** невидимая коробка шириной максимум **1100 px**, прижата к центру экрана, с полями 1.5rem (24 px) слева и справа, чтобы текст не липнул к краям на телефоне. Сама по себе не рисует ни фона, ни рамки — только выравнивает.
**Где:** внутри почти каждой `<section>` — сама секция тянется от края до края (фон, градиент), а `.container` внутри возвращает текст в общую колонку.
**CSS:** [css/site.css:43](css/site.css#L43)

```css
.container {
  max-width: var(--max-width);   /* 1100px, задано в style.css */
  margin: 0 auto;                /* центрирование */
  padding: 0 1.5rem;             /* поля по бокам */
  width: 100%;
}
```

### `.container--narrow`
**Что это:** тот же контейнер, но уже.
**Как выглядит:** ширина максимум **780 px** — длинный текст читается легче, строка не слишком длинная.
**Где:** страницы «О нас» и FAQ.
**CSS:** [css/site.css:50](css/site.css#L50)

```css
.container--narrow { max-width: 780px; }
```

### `.view` / `.view.active`
**Что это:** обёртка одной страницы. Создаётся не руками, а скриптом [js/router.js](js/router.js#L57).
**Как выглядит:** `.view` полностью скрыт (`display: none`), видна только та, у которой есть `active`. Так работает переход между страницами без перезагрузки браузера.
**CSS:** [css/style.css:160](css/style.css#L160)

```css
.view        { display: none; }
.view.active { display: block; }
```

### `.page__error`
**Что это:** сообщение, которое показывается, если страница не загрузилась.
**Как выглядит:** приглушённый серый текст по центру, большие отступы сверху и снизу (6rem).
**CSS:** [css/site.css:781](css/site.css#L781)

---

## 4. Шапка, меню, футер

Шапка и футер **не написаны в HTML** — их собирает [js/main.js](js/main.js#L52) из `data/site.json`.
Но классы в них те же, что и везде.

| Класс | Как выглядит | CSS |
|---|---|---|
| `#site-header` | Полоса, прибитая к верху экрана (`position: fixed`), полупрозрачный тёмно-синий фон `rgba(8,11,26,.82)` + размытие фона под ней (`backdrop-filter: blur(14px)`), тонкая линия снизу. | [css/site.css:57](css/site.css#L57) |
| `#site-header.scrolled` | Добавляется скриптом, когда страницу прокрутили. На главной шапка из прозрачной становится матовой, чуть уменьшается по высоте и получает тень. | [css/site.css:81](css/site.css#L81) |
| `.logo` | Название сайта слева. Крупнее обычного текста (1.3rem), жирное (700). | [css/style.css:99](css/style.css#L99) |
| `nav a` | Пункт меню. Белый, полупрозрачный (0.9), при наведении становится полностью белым. | [css/style.css:110](css/style.css#L110) |
| `nav a.current` | Пункт текущей страницы: полностью белый и жирный. | [css/style.css:123](css/style.css#L123) |
| `nav a::after` | Не класс, а псевдоэлемент: подчёркивание высотой 2 px с сине-фиолетовым градиентом. При наведении **выезжает слева направо** за 0.28 с. | [css/site.css:96](css/site.css#L96) |
| `.lang-switcher` | Три кнопки языка справа, в ряд с зазором 0.4rem. | [css/style.css:129](css/style.css#L129) |
| `.lang-switcher button` | Прозрачная кнопка с рамкой цвета текста, скруглением 6 px, полупрозрачная (0.75). | [css/style.css:134](css/style.css#L134) |
| `.active-lang` | Активный язык: белый фон, тёмно-синий текст, жирный — выглядит как нажатая кнопка. | [css/style.css:150](css/style.css#L150) |
| `.footer__links` | Ряд ссылок в подвале, по центру, переносится на новую строку при нехватке места. | [css/site.css:958](css/site.css#L958) |
| `.footer__text` | Строка копирайта, мелкая (0.88rem), приглушённого цвета. | [css/site.css:975](css/site.css#L975) |

---

## 5. Текстовые классы

### `.eyebrow`
**Что это:** маленькая подпись **над** заголовком («надбровье»).
**Как выглядит:** мелкие (0.75rem) ЗАГЛАВНЫЕ буквы голубого цвета `#7ea8ff` с очень широкими промежутками между буквами (`letter-spacing: .3em`). Выглядит как рубрика: `И С С Л Е Д О В А Н И Я`.
**CSS:** [css/site.css:120](css/site.css#L120)

```css
.eyebrow {
  letter-spacing: 0.3em;
  font-size: 0.75rem;
  color: var(--dark-accent-soft);
  text-transform: uppercase;
  font-weight: 600;
}
```

### `.section-title`
**Что это:** заголовок блока внутри страницы (`<h2>`).
**Как выглядит:** крупный белый жирный текст. Размер «резиновый» — от 1.8rem на телефоне до 2.7rem на большом экране. Ограничен по ширине 24 символами (`max-width: 24ch`), поэтому длинный заголовок сам переносится красивым столбиком, а не растягивается на весь экран.
**CSS:** [css/site.css:128](css/site.css#L128)

```css
.section-title {
  font-size: clamp(1.8rem, 3.4vw, 2.7rem);  /* минимум, желаемое, максимум */
  font-weight: 800;
  color: #fff;
  line-height: 1.14;
  margin: 0.7rem 0 2.4rem;
  max-width: 24ch;
}
```

### `.lead`
**Что это:** вводный абзац под заголовком.
**Как выглядит:** чуть крупнее обычного текста (1.08rem), приглушённо-серо-голубой `#9aa6c4`, ширина не больше 52 символов.
**CSS:** [css/site.css:138](css/site.css#L138)

### `.prose`
**Что это:** контейнер для длинного текста из нескольких абзацев (заполняется через `data-rich`).
**Как выглядит:** серый текст 1.05rem с увеличенным межстрочным расстоянием 1.8, ширина до 62 символов. Между абзацами автоматический отступ 1.1rem, а слова, выделенные `**жирным**` в JSON, становятся белыми.
**CSS:** [css/site.css:145](css/site.css#L145)

```css
.prose        { color: var(--dark-muted); line-height: 1.8; max-width: 62ch; }
.prose p + p  { margin-top: 1.1rem; }   /* отступ между соседними абзацами */
.prose strong { color: #fff; }          /* **жирный** становится белым */
```

### `.link`
**Что это:** ссылка внутри текста. Класс навешивается автоматически, когда в JSON пишут `[текст](адрес)`.
**Как выглядит:** голубая, с подчёркиванием, отодвинутым от букв на 3 px.
**CSS:** [css/site.css:161](css/site.css#L161)

---

## 6. Кнопки

```html
<a class="btn btn--primary">Основная</a>
<a class="btn btn--ghost">Второстепенная</a>
<a class="btn btn--primary btn--lg">Большая</a>
```

### `.btn` — база
**Как выглядит:** «таблетка» — полностью скруглённые края (`border-radius: 999px`), внутренние поля 0.9rem × 1.7rem, полужирный текст. Сама по себе прозрачная: цвет даёт модификатор.
**CSS:** [css/site.css:170](css/site.css#L170)

### `.btn--primary`
**Как выглядит:** сине-фиолетовый градиент (135°, от `#2f80ed` к `#6f5cff`), белый текст, мягкая синяя тень-свечение снизу. При наведении **поднимается на 3 px** вверх, тень становится сильнее.
**CSS:** [css/site.css:184](css/site.css#L184)

```css
.btn--primary {
  background: linear-gradient(135deg, var(--dark-accent), var(--dark-accent-2));
  box-shadow: 0 12px 34px -10px rgba(47,128,237,.7);
}
.btn--primary:hover { transform: translateY(-3px); }
```

### `.btn--ghost`
**Как выглядит:** «призрак» — почти прозрачный фон (белый 4 %), светлая рамка, белый текст. При наведении фон белеет до 12 % и кнопка так же приподнимается.
**CSS:** [css/site.css:195](css/site.css#L195)

### `.btn--lg`
**Как выглядит:** та же кнопка, но крупнее — поля 1.05rem × 2.5rem, шрифт 1.05rem. Используется в блоке `.cta` внизу страниц.
**CSS:** [css/site.css:207](css/site.css#L207)

---

## 7. Заголовок страницы `.page-head`

Первый блок каждой страницы, кроме главной.

```html
<header class="page-head">
  <div class="container">
    <p class="eyebrow reveal" data-text="page.eyebrow"></p>
    <h1 class="page-head__title reveal" data-text="page.title"></h1>
    <p class="lead reveal" data-text="page.lead"></p>
  </div>
</header>
```

### `.page-head`
**Как выглядит:** большая шапка страницы с **тремя наложенными фонами**: голубое свечение из левого верхнего угла, фиолетовое справа сверху и вертикальный градиент от `#070b1a` к `#0a1024`. Отступы «резиновые»: 3.5–6rem сверху.
**CSS:** [css/site.css:215](css/site.css#L215)

```css
.page-head {
  padding: clamp(3.5rem, 8vw, 6rem) 0 clamp(2.5rem, 5vw, 4rem);
  overflow: hidden;
  background:
    radial-gradient(900px 460px at 20% 0%,  rgba(47,128,237,.22), transparent 62%),
    radial-gradient(700px 400px at 88% 20%, rgba(111,92,255,.18), transparent 60%),
    linear-gradient(180deg, var(--dark-bg), var(--dark-bg-3));
}
```

### `.page-head__title`
**Как выглядит:** самый большой заголовок страницы (`<h1>`) — от 2.2rem до 3.6rem, белый, очень жирный (800), строки плотно прижаты друг к другу (1.08), ширина до 18 символов.
**CSS:** [css/site.css:225](css/site.css#L225)

---

## 8. Полосы `.band`

Страница собирается из горизонтальных полос. Чередование `.band` / `.band--alt` даёт видимый ритм.

| Класс | Как выглядит | CSS |
|---|---|---|
| `.band` | Полоса во всю ширину экрана, фон `#0a1024`, вертикальные отступы «резиновые» — от 3.5rem на телефоне до 6rem на десктопе. | [css/site.css:240](css/site.css#L240) |
| `.band--alt` | То же, но фон чуть светлее (`#0b1228`) плюс тонкие линии сверху и снизу. Так соседние полосы визуально разделяются. | [css/site.css:245](css/site.css#L245) |
| `.band--tight` | То же, но с уменьшенными отступами (2.5–3.5rem). Для блока с цифрами, который не должен занимать целый экран. | [css/site.css:251](css/site.css#L251) |

```css
.band       { padding: clamp(3.5rem, 8vw, 6rem) 0; background: var(--dark-bg-3); }
.band--alt  { background: var(--dark-bg-2); border-top: 1px solid var(--dark-line);
                                            border-bottom: 1px solid var(--dark-line); }
.band--tight{ padding: clamp(2.5rem, 5vw, 3.5rem) 0; }
```

---

## 9. Сетки `.grid`

| Класс | Как выглядит | CSS |
|---|---|---|
| `.grid` | База: CSS Grid с зазором 1.3rem между элементами. | [css/site.css:258](css/site.css#L258) |
| `.grid--cards` | Ряд карточек, который **сам решает, сколько колонок поместится**: каждая колонка не уже 255 px. На широком экране — 4 в ряд, на планшете — 2, на телефоне — 1. Ничего дописывать не нужно. | [css/site.css:263](css/site.css#L263) |
| `.grid--stats` | То же для цифр, минимальная колонка 180 px, зазор 1.4rem. | [css/site.css:267](css/site.css#L267) |

```css
.grid--cards { grid-template-columns: repeat(auto-fit, minmax(255px, 1fr)); }
.grid--stats { grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1.4rem; }
```

`auto-fit` + `minmax` — это и есть вся «адаптивность» карточек: медиазапросы для них не нужны.

---

## 10. Карточки `.card`

```html
<article class="card reveal">
  <span class="card__icon" data-icon="icon"></span>
  <h3 class="card__title" data-text="title"></h3>
  <p  class="card__text"  data-text="text"></p>
  <p  class="card__meta"  data-text="meta"></p>
</article>
```

### `.card`
**Как выглядит:** прямоугольник со скруглением 18 px, внутренние поля 2rem × 1.7rem. Фон — едва заметный градиент из полупрозрачного белого (5.5 % → 2 %), поэтому карточка кажется чуть светлее тёмного фона, как матовое стекло. Тонкая светлая рамка. **При наведении** приподнимается на 6 px, рамка синеет, появляется глубокая тень — карточка «всплывает». Анимация плавная, 0.4 с.
**CSS:** [css/site.css:273](css/site.css#L273)

```css
.card {
  padding: 2rem 1.7rem;
  border-radius: 18px;
  background: linear-gradient(160deg, rgba(255,255,255,.055), rgba(255,255,255,.02));
  border: 1px solid var(--dark-line);
  transition: transform .4s cubic-bezier(.2,.7,.2,1), border-color .4s, box-shadow .4s;
}
.card:hover {
  transform: translateY(-6px);
  border-color: rgba(47,128,237,.5);
  box-shadow: 0 26px 55px -22px rgba(0,0,0,.85);
}
```

### `.card--link`
**Что это:** вариант карточки, которая целиком является ссылкой (`<a class="card card--link">`).
**Как выглядит:** визуально не отличается, но при наведении оживляет стрелку внизу (см. `.card__arrow`).
**CSS:** [css/site.css:355](css/site.css#L355)

### Части карточки

| Класс | Как выглядит | CSS |
|---|---|---|
| `.card__icon` | Квадрат 48×48 со скруглением 13 px, сине-фиолетовая полупрозрачная заливка, иконка внутри по центру (24×24, рисуется как SVG скриптом). Отступ снизу 1.2rem. | [css/site.css:294](css/site.css#L294) |
| `.card__title` | Заголовок карточки: белый, 1.2rem, жирный (700). | [css/site.css:310](css/site.css#L310) |
| `.card__text` | Описание: серо-голубой `#9aa6c4`, 0.95rem, межстрочный 1.65. | [css/site.css:318](css/site.css#L318) |
| `.card__meta` | Мелкая подпись внизу (например «10 класс · 2 часа»): 0.82rem, голубая, слегка прозрачная, отступ сверху 1.1rem. | [css/site.css:324](css/site.css#L324) |
| `.card__meta--top` | Та же подпись, но **сверху**, над заголовком, ЗАГЛАВНЫМИ, ещё мельче (0.72rem) с широким `letter-spacing`. Используется на странице партнёров для роли. | [css/site.css:332](css/site.css#L332) |
| `.card__arrow` | Строка «Подробнее →». Голубая, полужирная. Стрелка `→` **не написана в HTML** — её дорисовывает CSS через `::after`. При наведении на карточку зазор между текстом и стрелкой увеличивается с 0.4 до 0.7rem, а сама стрелка отъезжает вправо на 3 px. | [css/site.css:340](css/site.css#L340) |

```css
.card__arrow::after { content: "→"; transition: transform .25s ease; }
.card--link:hover .card__arrow          { gap: 0.7rem; }
.card--link:hover .card__arrow::after   { transform: translateX(3px); }
```

---

## 11. Цифры `.stat`

```html
<div class="stat reveal">
  <span class="stat__num" data-number="number" data-suffix="suffix">0</span>
  <span class="stat__label" data-text="label"></span>
</div>
```

| Класс | Как выглядит | CSS |
|---|---|---|
| `.stat` | Плитка с текстом по центру, тонкая рамка, скругление 16 px, почти прозрачный белый фон (2 %). При наведении поднимается на 4 px и рамка синеет. | [css/site.css:368](css/site.css#L368) |
| `.stat__num` | Само число. Очень крупное (2.1–3.1rem), сверхжирное. Главный трюк: текст закрашен **градиентом** от белого к голубому `#9db8ff` — сам текст прозрачный, а фон обрезан по буквам (`background-clip: text`). Значение считается от нуля скриптом [js/anim.js](js/anim.js#L46), когда блок появляется на экране. | [css/site.css:382](css/site.css#L382) |
| `.stat__label` | Подпись под числом: серая, 0.92rem, отступ сверху 0.6rem. | [css/site.css:393](css/site.css#L393) |

```css
.stat__num {
  font-size: clamp(2.1rem, 4vw, 3.1rem);
  background: linear-gradient(135deg, #ffffff, #9db8ff);
  background-clip: text;
  color: transparent;      /* видно градиент сквозь буквы */
}
```

---

## 12. Пронумерованные шаги `.steps`

```html
<ol class="steps" data-list="steps.items">
  <li class="step reveal">
    <h3 class="step__title"></h3>
    <p  class="step__text"></p>
  </li>
</ol>
```

**Цифры 1 2 3 4 в HTML не пишутся** — их расставляет CSS-счётчик.

| Класс | Как выглядит | CSS |
|---|---|---|
| `.steps` | Сетка колонками не уже 230 px, зазор 1.6rem. Здесь же обнуляется счётчик: `counter-reset: step`. | [css/site.css:403](css/site.css#L403) |
| `.step` | Один шаг. Отступ сверху 3.2rem — там помещается кружок с номером. Каждый шаг увеличивает счётчик на 1. | [css/site.css:410](css/site.css#L410) |
| `.step::before` | Кружок с номером: 2.4rem, идеально круглый, сине-фиолетовый градиент, белая жирная цифра по центру. | [css/site.css:414](css/site.css#L414) |
| `.step::after` | Тонкая горизонтальная линия от кружка вправо, к следующему шагу. У последнего шага скрыта, на узком экране скрыта у всех. | [css/site.css:430](css/site.css#L430) |
| `.step__title` | Белый заголовок шага, 1.1rem, жирный. | [css/site.css:446](css/site.css#L446) |
| `.step__text` | Серое описание, 0.95rem. | [css/site.css:453](css/site.css#L453) |

```css
.steps { counter-reset: step; }
.step  { counter-increment: step; padding-top: 3.2rem; position: relative; }
.step::before {
  content: counter(step);                      /* сюда подставляется 1, 2, 3... */
  position: absolute; top: 0; left: 0;
  width: 2.4rem; height: 2.4rem; border-radius: 50%;
  display: grid; place-items: center;
  background: linear-gradient(135deg, var(--dark-accent), var(--dark-accent-2));
}
```

---

## 13. Лента дней `.timeline`

Вертикальный список «день за днём» на странице лагеря.

| Класс | Как выглядит | CSS |
|---|---|---|
| `.timeline` | Список с отступом слева 1.8rem, зазор 1.6rem. | [css/site.css:462](css/site.css#L462) |
| `.timeline::before` | Вертикальная линия в 1 px вдоль всего списка, градиент от синего сверху к прозрачному снизу — как будто линия растворяется. | [css/site.css:467](css/site.css#L467) |
| `.timeline__item` | Один день. | [css/site.css:479](css/site.css#L479) |
| `.timeline__item::before` | Синяя точка 0.7rem на линии, с мягким полупрозрачным ореолом вокруг (`box-shadow: 0 0 0 4px`). | [css/site.css:481](css/site.css#L481) |
| `.timeline__label` | «ДЕНЬ 1» — мелкие голубые заглавные с широким `letter-spacing: .18em`. | [css/site.css:495](css/site.css#L495) |
| `.timeline__title` | Белый заголовок дня, 1.15rem, жирный. | [css/site.css:503](css/site.css#L503) |
| `.timeline__text` | Серое описание, ширина до 62 символов. | [css/site.css:510](css/site.css#L510) |

---

## 14. Вопросы и ответы `.faq`

Работает на стандартных тегах `<details>` / `<summary>` — **без единой строчки JavaScript**.

```html
<div class="faq" data-list="questions">
  <details class="faq__item reveal">
    <summary class="faq__question" data-text="q"></summary>
    <div class="faq__answer" data-rich="a"></div>
  </details>
</div>
```

| Класс | Как выглядит | CSS |
|---|---|---|
| `.faq` | Список вопросов, зазор 0.8rem. | [css/site.css:520](css/site.css#L520) |
| `.faq__item` | Прямоугольник с рамкой, скругление 14 px, чуть светлее фона. | [css/site.css:525](css/site.css#L525) |
| `.faq__item[open]` | Не класс, а состояние: когда вопрос **раскрыт**, рамка синеет и фон становится голубоватым. | [css/site.css:530](css/site.css#L530) |
| `.faq__question` | Сам вопрос, кликабельный (`cursor: pointer`), белый полужирный, поля 1.15rem, справа оставлено 3rem под знак «+». | [css/site.css:537](css/site.css#L537) |
| `.faq__question::after` | Знак **+** справа. Когда вопрос открыт, **поворачивается на 45°** и превращается в ×. Стандартный треугольник браузера при этом спрятан. | [css/site.css:550](css/site.css#L550) |
| `.faq__answer` | Ответ: серый текст, межстрочный 1.75, отступ снизу 1.3rem. | [css/site.css:568](css/site.css#L568) |

```css
.faq__question::after { content: "+"; transition: transform .3s ease; }
.faq__item[open] .faq__question::after { transform: translateY(-50%) rotate(45deg); }
.faq__question::-webkit-details-marker { display: none; }  /* убрать треугольник */
```

---

## 15. Картинка рядом с текстом `.showcase`

| Класс | Как выглядит | CSS |
|---|---|---|
| `.showcase` | Секция с вертикальным градиентом от `#0b1228` к `#0a1024`, большие отступы 4–7rem. | [css/site.css:581](css/site.css#L581) |
| `.showcase__inner` | Две колонки: картинка чуть шире текста (`1.05fr 1fr`), выровнены по центру по вертикали. На экране уже 860 px превращается в одну колонку. | [css/site.css:586](css/site.css#L586) |
| `.showcase__media` | Обёртка картинки. **Медленно плавает вверх-вниз** — анимация `float`, 6.5 с, бесконечно, размах 14 px. | [css/site.css:593](css/site.css#L593) |
| `.showcase__media img` | Скругление 18 px, светлая рамка, глубокая тень снизу. | [css/site.css:601](css/site.css#L601) |
| `.showcase__media::after` | Сине-фиолетовое пятно **позади** картинки с размытием 34 px — эффект свечения из-под фото. | [css/site.css:609](css/site.css#L609) |
| `.showcase__text` | Правая колонка с текстом и кнопкой. У `.lead` внутри неё отступ снизу 1.9rem. | [css/site.css:620](css/site.css#L620) |

```css
.showcase__inner { display: grid; grid-template-columns: 1.05fr 1fr; align-items: center; }
.showcase__media { animation: float 6.5s ease-in-out infinite; }
@keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-14px); } }
```

---

## 16. Приглашение в конце `.cta`

CTA = call to action, «призыв к действию». Последний блок почти каждой страницы.

| Класс | Как выглядит | CSS |
|---|---|---|
| `.cta` | Секция с текстом по центру, большие отступы 4–7rem. Фон: голубое пятно-свечение сверху по центру + градиент к самому тёмному цвету внизу. | [css/site.css:629](css/site.css#L629) |
| `.cta::before` | Огромное фиолетовое круглое пятно (50vw × 50vw), которое **медленно пульсирует** — анимация `pulseGlow` 7 с: прозрачность 0.5 → 1, масштаб 1 → 1.12. Кликам не мешает (`pointer-events: none`). | [css/site.css:637](css/site.css#L637) |
| `.cta__inner` | Содержимое поверх свечения (`z-index: 2`), ширина максимум 720 px. Ставится вместе с `.container`. | [css/site.css:658](css/site.css#L658) |
| `.cta__title` | Крупный белый заголовок 1.9–3rem, сверхжирный. | [css/site.css:664](css/site.css#L664) |
| `.cta__text` | Серый текст 1.1rem, отступ снизу 2rem — под ним кнопка `.btn--lg`. | [css/site.css:672](css/site.css#L672) |

---

## 17. Первый экран главной `.hero`

Всё это живёт в отдельном файле [css/home.css](css/home.css) и используется только на главной.

| Класс | Как выглядит | CSS |
|---|---|---|
| `.hero` | Экран **высотой во весь монитор** (`min-height: 100vh`), содержимое по вертикали в центре. Фон — два цветных пятна (синее справа сверху, фиолетовое слева снизу) поверх вертикального градиента. | [css/home.css:8](css/home.css#L8) |
| `.hero::before` | Ещё одно синее пятно 60vw, которое 18 секунд плавно **дрейфует и увеличивается** (анимация `drift`), чтобы экран никогда не был полностью неподвижным. | [css/home.css:21](css/home.css#L21) |
| `.hero__canvas` | `<canvas>` во весь блок, на нём [js/home.js](js/home.js) рисует движущееся созвездие из точек и линий. | [css/home.css:40](css/home.css#L40) |
| `.hero__overlay` | Прозрачный слой поверх созвездия: радиальный градиент, который затемняет края экрана, чтобы текст в центре читался. | [css/home.css:49](css/home.css#L49) |
| `.hero__content` | Текстовый блок поверх всего (`z-index: 2`), отступ сверху 6rem — чтобы не заезжать под шапку. Ставится вместе с `.container`. | [css/home.css:57](css/home.css#L57) |
| `.hero .eyebrow` | Та же рубрика, но с ещё более широкими буквами (0.35em) и отступом снизу 1.3rem. | [css/home.css:63](css/home.css#L63) |
| `.hero__title` | Самый большой текст на сайте: от 2.6rem до **5.2rem**, белый, сверхжирный, строки почти вплотную (1.03), ширина до 16 символов. | [css/home.css:69](css/home.css#L69) |
| `.hero__subtitle` | Подзаголовок 1.05–1.3rem, серый, ширина до 48 символов. | [css/home.css:78](css/home.css#L78) |
| `.hero__actions` | Ряд из двух кнопок, зазор 1rem, переносится на телефоне. | [css/home.css:86](css/home.css#L86) |
| `.hero__scroll` | Подсказка «прокрутите вниз» внизу по центру: мелкие заглавные буквы. На экране уже 720 px скрывается. | [css/home.css:94](css/home.css#L94) |
| `.hero__scroll-line` | Вертикальная линия 1 px под подсказкой, которая **пульсирует** — сжимается и растягивается по вертикали каждые 2 с. | [css/home.css:111](css/home.css#L111) |

---

## 18. Новости: лента `.post-card` и страница `.post`

Новости устроены как в соцсети: **лента карточек** и **отдельная страница у каждой новости**.

| Страница | Адрес | Файл разметки | Куда всё вставляется |
|---|---|---|---|
| Лента | `?view=news` | [sections/news.html](sections/news.html) | `<div id="news-list">` |
| Одна новость | `?view=post&id=<адрес>` | [sections/post.html](sections/post.html) | `<div id="news-post">` |

Разметка новостей **не пишется руками** — всё строит [js/news.js](js/news.js) из `news.json`.
В файлах секций лежат только пустые ящики:

```html
<!-- sections/news.html -->
<div id="news-list" class="news-list"></div>

<!-- sections/post.html -->
<div id="news-post" class="news-post"></div>
```

Маршрут `post` спрятан из меню: в [data/site.json](data/site.json) у него стоит `"hidden": true`,
поэтому в шапке его нет, но открыть по ссылке можно.

### Обёртки-контейнеры

| Класс | Как выглядит | CSS |
|---|---|---|
| `.container--feed` | Колонка шириной максимум **720 px** — лента в один столбец, как в соцсети. | [css/site.css:689](css/site.css#L689) |
| `.container--reading` | Колонка шириной максимум **760 px** — комфортная длина строки для чтения статьи. | [css/site.css:693](css/site.css#L693) |
| `.band--feed` | Полоса с уменьшенным верхним отступом — лента начинается сразу под заголовком страницы. | [css/site.css:697](css/site.css#L697) |
| `.band--article` | Полоса, в которой лежит статья. | [css/site.css:701](css/site.css#L701) |
| `.news-list` | Сетка в один столбец, зазор 1.6rem между карточками. | [css/site.css:706](css/site.css#L706) |

### Карточка в ленте

```html
<article class="post-card reveal">
  <a class="post-card__link" href="?view=post&id=…" data-goto="post" data-id="…">
    <div class="post-card__media"><img …></div>
    <div class="post-card__body">
      <div class="post-card__meta"><time class="post-card__date">…</time></div>
      <h3 class="post-card__title">…</h3>
      <p class="post-card__excerpt">…</p>
      <span class="post-card__more">Подробнее</span>
    </div>
  </a>
</article>
```

| Класс | Как выглядит | CSS |
|---|---|---|
| `.post-card` | Карточка со скруглением 20 px и `overflow: hidden`, чтобы фотография обрезалась по скруглению. Тот же «стеклянный» градиент, что у `.card`. При наведении поднимается на 4 px, рамка синеет, появляется тень. | [css/site.css:713](css/site.css#L713) |
| `.post-card__link` | Ссылка на всю карточку (`display: block`) — нажатие в любом месте открывает новость. Атрибуты `data-goto="post"` и `data-id="<адрес>"` перехватывает [js/router.js](js/router.js), поэтому переход происходит без перезагрузки. | [css/site.css:729](css/site.css#L729) |
| `.post-card__media` | Рамка фотографии с жёстким соотношением сторон **16:9** — карточки одинаковой высоты независимо от размера снимка. | [css/site.css:734](css/site.css#L734) |
| `.post-card__media img` | `object-fit: cover` — фотография заполняет рамку без искажений, лишнее обрезается. При наведении на карточку **плавно увеличивается на 4 %** за 0.6 с. | [css/site.css:739](css/site.css#L739) |
| `.post-card__body` | Текстовая часть под фотографией, поля 1.5rem × 1.7rem. | [css/site.css:753](css/site.css#L753) |
| `.post-card__meta` | Строка над заголовком (сейчас в ней только дата), flex с зазором 0.6rem. | [css/site.css:757](css/site.css#L757) |
| `.post-card__date` | Дата: мелкая (0.78rem), голубая, ЗАГЛАВНЫМИ, с широким `letter-spacing`. | [css/site.css:764](css/site.css#L764) |
| `.post-card__title` | Заголовок новости: белый, 1.4rem, жирный. | [css/site.css:771](css/site.css#L771) |
| `.post-card__excerpt` | Краткое описание: серое, 1rem. Если в админке оно не заполнено, берётся начало текста, обрезанное по слову до ~180 символов. | [css/site.css:779](css/site.css#L779) |
| `.post-card__more` | «Подробнее →». Стрелка дорисована через `::after`; при наведении на карточку зазор растёт, стрелка едет вправо. | [css/site.css:785](css/site.css#L785) |
| `.news-empty` | Курсивная серая строка, когда новостей нет. | [css/site.css:804](css/site.css#L804) |

### Страница одной новости

| Класс | Как выглядит | CSS |
|---|---|---|
| `.post__head` | Шапка статьи: ссылка назад, дата, заголовок, лид. Отступ снизу 2rem. | [css/site.css:813](css/site.css#L813) |
| `.post__back` | «← Все новости». Голубая, полужирная. При наведении белеет и **сдвигается на 3 px влево** — в сторону, куда ведёт. Встречается дважды: сверху и в конце статьи. | [css/site.css:818](css/site.css#L818) |
| `.post__date` | Дата над заголовком: мелкая, голубая, ЗАГЛАВНЫМИ. | [css/site.css:832](css/site.css#L832) |
| `.post__title` | Заголовок статьи: от 1.9rem до 3rem, белый, сверхжирный. | [css/site.css:841](css/site.css#L841) |
| `.post__lead` | Краткое описание под заголовком: серое, 1.15rem. | [css/site.css:850](css/site.css#L850) |
| `.post__media` | Большая фотография: скругление 18 px, светлая рамка, глубокая тень. В отличие от карточки высота **не** обрезается — снимок виден целиком. | [css/site.css:857](css/site.css#L857) |
| `.post__caption` | Подпись под фотографией на чуть более светлой подложке. Показывается, только если в админке заполнено описание снимка. | [css/site.css:870](css/site.css#L870) |
| `.post__body` | Текст статьи: 1.08rem, межстрочный 1.85, между абзацами 1.2rem. Пустая строка в админке = новый абзац. | [css/site.css:878](css/site.css#L878) |
| `.post__foot` | Низ статьи: отчёркнут линией сверху, снова ссылка «назад». | [css/site.css:888](css/site.css#L888) |
| `.post-related` | Блок «Другие новости» под статьёй, отделён линией. | [css/site.css:900](css/site.css#L900) |
| `.post-related__grid` | Сетка для карточек в этом блоке. Внутри него `.post-card` **уменьшается**: фото 2:1, шрифты и поля меньше — это сноска, а не главный блок. | [css/site.css:913](css/site.css#L913) |
| `.post-missing` | Сообщение «такой новости больше нет», если в адресе указан несуществующий `id`. По центру, с кнопкой возврата. | [css/site.css:927](css/site.css#L927) |

> **Про безопасность.** Весь текст из `news.json` вставляется через `textContent`,
> а не `innerHTML` — поэтому ничто, набранное в админке, не может стать работающим кодом
> на странице. Адрес картинки дополнительно проверяется: пропускаются только
> `https://…` и файлы внутри сайта, всё остальное (`javascript:`, `data:`, `//чужой-сайт`)
> отбрасывается.

---

## 19. Анимация появления `.reveal`

Самый универсальный класс: его можно добавить **к чему угодно**.

**Как выглядит:** элемент изначально невидим (`opacity: 0`) и сдвинут вниз на 26 px. Когда при прокрутке он попадает в зону видимости, [js/anim.js](js/anim.js#L20) добавляет ему класс `is-visible`, и элемент за 0.8 с плавно **проявляется и выезжает снизу вверх**.

Элементы одного ряда появляются **не одновременно, а по очереди**: скрипт проставляет каждому переменную `--i` (порядковый номер), а задержка считается как `--i × 0.09s`.

**CSS:** [css/site.css:766](css/site.css#L766)

```css
.reveal {
  opacity: 0;
  transform: translateY(26px);
  transition: opacity .8s cubic-bezier(.2,.7,.2,1), transform .8s cubic-bezier(.2,.7,.2,1);
  transition-delay: calc(var(--i, 0) * 0.09s);   /* эффект «волны» */
}
.reveal.is-visible { opacity: 1; transform: none; }
```

Если посетитель попросил у системы «уменьшить анимацию», всё это отключается — [css/site.css:835](css/site.css#L835):

```css
@media (prefers-reduced-motion: reduce) {
  .reveal { opacity: 1; transform: none; transition: none; }
}
```

> Если забыть `reveal`, блок просто будет виден сразу — ничего не сломается.
> Если поставить `reveal`, но JS не отработает, блок останется **невидимым**.

---

## 20. Классы админки `/admin/`

Для [admin/index.html](admin/index.html) и [admin/login.html](admin/login.html).
Тема здесь **светлая**: белый фон, тёмно-синие заголовки. Публичный сайт эти стили не грузит.

> Попасть на эти страницы без входа нельзя: [functions/admin/_middleware.js](functions/admin/_middleware.js)
> проверяет сессию **на сервере**, до того как файл вообще будет отдан. Единственное исключение —
> сама страница входа.

### Экран входа

| Класс | Как выглядит | CSS |
|---|---|---|
| `.login-page` (на `<body>`) | Светло-серый фон `#f7f9fc` вместо белого. | [css/admin.css:191](css/admin.css#L191) |
| `.login` | Обёртка на всю высоту, содержимое строго по центру (`display: grid; place-items: center`). | [css/admin.css:155](css/admin.css#L155) |
| `.login__card` | Белая карточка шириной до 380 px: рамка, скругление 16 px, мягкая тень. Поля в столбик с зазором 1rem. | [css/admin.css:162](css/admin.css#L162) |
| `.login__title` | «Ադմին վահանակ» — тёмно-синий, 1.4rem. | [css/admin.css:174](css/admin.css#L174) |
| `.login__subtitle` | Серая поясняющая строка под заголовком, отрицательный отступ сверху — прижата к заголовку. | [css/admin.css:180](css/admin.css#L180) |
| `.login__submit` | Кнопка входа во всю ширину карточки. | [css/admin.css:186](css/admin.css#L186) |
| `.login__foot` | Ссылка «← На сайт» по центру внизу. | [css/admin.css:192](css/admin.css#L192) |

Ошибки и подсказки показываются в том же `.admin-status`, что и на главной странице админки.

### Шапка: кто вошёл

| Класс | Как выглядит | CSS |
|---|---|---|
| `.admin-session` | Правый угол шапки: имя вошедшего + кнопка выхода в ряд. | [css/admin.css:206](css/admin.css#L206) |
| `.admin-user` | Имя вошедшего: мелкое, белое, полупрозрачное. | [css/admin.css:136](css/admin.css#L136) |
| `.admin-user.bad` | То же, но бледно-красным — если войти не удалось. | [css/admin.css:142](css/admin.css#L142) |
| `.admin-logout` | «Դուրս գալ»: прозрачная кнопка-таблетка с белой рамкой, при наведении светлеет. | [css/admin.css:212](css/admin.css#L212) |

### Форма и переключатель языка

Все три языка редактируются **одновременно** и сохраняются вместе — вкладки только
переключают, какой из них показан в полях. Набранное не теряется.

| Класс | Как выглядит | CSS |
|---|---|---|
| `.admin-langs` | Строка вкладок над формой, отчёркнута линией снизу. | [css/admin.css:234](css/admin.css#L234) |
| `.admin-lang` | Вкладка языка: серо-голубая таблетка. | [css/admin.css:242](css/admin.css#L242) |
| `.admin-lang.is-active` | Текущая вкладка: синий фон, белый текст. | [css/admin.css:259](css/admin.css#L259) |
| `.admin-lang.is-filled` | Зелёная точка 6 px в правом верхнем углу — на этом языке заголовок уже написан. На активной вкладке точка белая. | [css/admin.css:307](css/admin.css#L307) |
| `.admin-langs__hint` | Серая подсказка справа, прижата к краю через `margin-left: auto`. | [css/admin.css:281](css/admin.css#L281) |
| `.admin-field__lang` | Маленький ярлык «ՀՅ / EN / РУ» рядом с подписью поля — напоминает, на каком языке вы сейчас пишете. | [css/admin.css:288](css/admin.css#L288) |
| `.admin-field__hint` | Подсказка под полем моноширинным шрифтом — показывает будущий адрес страницы. | [css/admin.css:299](css/admin.css#L299) |
| `.admin-row` | Два поля в ряд (дата и адрес), сами перестраиваются в столбик на узком экране. | [css/admin.css:306](css/admin.css#L306) |
| `.admin-hidden` | `display: none !important` — прячет кнопку «Отменить», пока вы не редактируете существующую новость. | [css/admin.css:312](css/admin.css#L312) |
| `.admin-intro` | Пояснительный абзац: серый, ширина до 62 символов. | [css/admin.css:6](css/admin.css#L6) |
| `.admin-form` | Форма-карточка: белый фон, рамка, скругление 14 px, мягкая тень, поля в столбик. | [css/admin.css:12](css/admin.css#L12) |
| `.admin-field` | Одно поле: подпись сверху, ввод снизу, зазор 0.35rem. | [css/admin.css:23](css/admin.css#L23) |
| `.admin-field label` | Подпись: мелкая (0.85rem), полужирная, тёмно-синяя. | [css/admin.css:28](css/admin.css#L28) |
| `.admin-field input/select/textarea` | Ввод во всю ширину, рамка `#cfd8e6`, скругление 8 px. При фокусе рамка синеет и появляется голубое кольцо. | [css/admin.css:34](css/admin.css#L34) |
| `.btn-admin` | Синяя кнопка-таблетка, белый текст. При наведении темнеет и поднимается на 1 px. | [css/admin.css:59](css/admin.css#L59) |
| `.btn-admin--ghost` | Та же кнопка, но прозрачная с синим текстом — для второстепенного действия. | [css/admin.css:76](css/admin.css#L76) |
| `.admin-actions` | Ряд кнопок под формой, зазор 0.8rem. | [css/admin.css:85](css/admin.css#L85) |
| `.admin-status` | Строка результата. Всегда занимает высоту 1.2em, чтобы страница не «прыгала». | [css/admin.css:92](css/admin.css#L92) |
| `.admin-status.ok` / `.error` / `.info` | Цвет сообщения: зелёный `#1a7f37` / красный `#c0392b` / синий. | [css/admin.css:99](css/admin.css#L99) |

### Главная фотография новости

| Класс | Как выглядит | CSS |
|---|---|---|
| `.admin-photo` | Две колонки: предпросмотр 200 px слева, элементы управления справа. На телефоне — в столбик. | [css/admin.css:320](css/admin.css#L320) |
| `.admin-photo__preview` | Рамка 16:9 с **пунктирной** границей — сразу видно, что это место под фото. Внутри снимок с `object-fit: cover`. | [css/admin.css:327](css/admin.css#L327) |
| `.admin-photo__empty` | Серый текст «Լուսանկար չկա» по центру пустой рамки. Сюда же выводится ошибка, если файл не загрузился. | [css/admin.css:344](css/admin.css#L344) |
| `.admin-photo__controls` | Столбик: выбор файла, поле для ручного пути, кнопка «Հեռացնել», пояснение. | [css/admin.css:351](css/admin.css#L351) |
| `.admin-photo__clear` | Красная кнопка-контур «Убрать фото». | [css/admin.css:360](css/admin.css#L360) |
| `.admin-photo__note` | Мелкая серая подсказка про форматы и размер. | [css/admin.css:375](css/admin.css#L375) |

### Список уже опубликованного

| Класс | Как выглядит | CSS |
|---|---|---|
| `.admin-existing` | Заголовок «Առկա նորությունները»: тёмно-синий, 1.4rem. | [css/admin.css:384](css/admin.css#L384) |
| `.admin-count` | Число новостей рядом с заголовком, обычным весом и серым. | [css/admin.css:413](css/admin.css#L413) |
| `.admin-news-list` | Список строк, зазор 0.6rem, ширина до 820 px. | [css/admin.css:419](css/admin.css#L419) |
| `.admin-item` | Одна строка: сетка из трёх колонок — миниатюра 76 px, текст, кнопки. | [css/admin.css:426](css/admin.css#L426) |
| `.admin-item.is-editing` | Строка, которую вы сейчас редактируете: синяя рамка и голубое кольцо вокруг. | [css/admin.css:438](css/admin.css#L438) |
| `.admin-item__thumb` | Миниатюра фотографии 16:10 со скруглением 6 px. | [css/admin.css:443](css/admin.css#L443) |
| `.admin-item__thumb.is-empty` | Пунктирный прямоугольник вместо снимка — у новости фото нет. | [css/admin.css:458](css/admin.css#L458) |
| `.admin-item__label` | Заголовок новости, полужирный. Длинный обрезается многоточием (`text-overflow: ellipsis`). | [css/admin.css:468](css/admin.css#L468) |
| `.admin-item__meta` | Вторая строка: дата, адрес страницы и заполненные языки. Мелкая, серая. | [css/admin.css:477](css/admin.css#L477) |
| `.admin-item__actions` | Три кнопки справа в ряд. | [css/admin.css:482](css/admin.css#L482) |
| `.admin-item__link` | «Դիտել» — открывает страницу новости в новой вкладке. | [css/admin.css:488](css/admin.css#L488) |
| `.admin-item__edit` | «Խմբագրել» — загружает новость обратно в форму. | [css/admin.css:489](css/admin.css#L489) |
| `.admin-item__del` | «Ջնջել»: красная кнопка-контур, при наведении бледно-красный фон. | [css/admin.css:397](css/admin.css#L397) |
| `.news-empty` | Курсив «Դեռ նորություններ չկան։». В админке у него **своя** светлая версия, потому что `css/site.css` здесь не подключён. | [css/admin.css:392](css/admin.css#L392) |

---

## 21. Атрибуты `data-*` (не классы, но важно)

Классы отвечают за **внешний вид**, а атрибуты `data-*` — за **содержимое**. Их читает [js/content.js](js/content.js#L143).

| Атрибут | Что делает |
|---|---|
| `data-text="hero.title"` | Подставляет обычный текст из JSON на языке посетителя. |
| `data-rich="story.text"` | То же, но пустая строка в JSON = новый абзац, поддерживается `**жирный**` и `[ссылка](адрес)`. |
| `data-list="cards"` | Повторяет `<template>` внутри — по разу на каждый элемент списка в JSON. Внутри шаблона имена короткие: `data-text="title"`. |
| `data-icon="icon"` | Рисует SVG-иконку по её имени из JSON. |
| `data-image="showcase.image"` | Подставляет имя файла картинки в `src`. |
| `data-alt="showcase.imageAlt"` | Подставляет описание картинки в `alt`. |
| `data-route="cta.button.route"` | Превращает элемент в ссылку на другую страницу сайта. |
| `data-number="number"` + `data-suffix="suffix"` | Число, которое считается от нуля при прокрутке, плюс приписка после него (`+`, `%`). |
| `data-ui="learnMore"` | Слово, общее для всех страниц (берётся из `data/site.json`). |
| `data-goto="labs"` | Ставится скриптом; по нему [js/router.js](js/router.js) ловит клик и меняет страницу без перезагрузки. |
| `data-keep` | Оставить обёртку видимой, даже если текста для неё в JSON нет. |

Если для элемента нет текста в JSON, скрипт **сам его прячет**, чтобы на странице не оставалось пустых дырок ([js/content.js:242](js/content.js#L242)).

---

## 22. CSS-переменные (цвета и размеры)

Все цвета собраны в одном месте — [css/style.css:19](css/style.css#L19). Поменяли здесь — поменялось на всём сайте.

```css
:root {
  /* Светлая тема — только админка */
  --color-primary:    #1a3c6e;   /* тёмно-синий: шапка админки, заголовки */
  --color-secondary:  #2f80ed;   /* синий: кнопки, фокус */
  --color-accent:     #f2994a;   /* оранжевый акцент */
  --color-bg:         #ffffff;
  --color-bg-alt:     #f7f9fc;
  --color-text:       #1c1c1c;
  --color-text-light: #666666;

  /* Тёмная тема — весь публичный сайт */
  --dark-bg:          #070b1a;   /* самый тёмный: hero, футер */
  --dark-bg-2:        #0b1228;   /* .band--alt */
  --dark-bg-3:        #0a1024;   /* .band */
  --dark-text:        #e8ecf6;   /* основной текст */
  --dark-muted:       #9aa6c4;   /* приглушённый: .lead, .card__text */
  --dark-line:        rgba(255,255,255,.08);  /* все тонкие рамки */
  --dark-accent:      #2f80ed;   /* синий */
  --dark-accent-2:    #6f5cff;   /* фиолетовый (вторая точка градиентов) */
  --dark-accent-soft: #7ea8ff;   /* светло-голубой: .eyebrow, .card__meta */

  --font-main:  "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  --max-width:  1100px;          /* ширина .container */
  --radius:     16px;
  --radius-sm:  10px;
}
```

Ещё одна переменная задаётся на `body.site`: `--header-h: 4.6rem` — высота шапки. На неё опирается верхний отступ внутренних страниц.

---

## 23. Адаптив: что меняется на телефоне

Медиазапросов в проекте немного, потому что сетки подстраиваются сами (`auto-fit`).

**Уже 860 px** — [css/site.css:790](css/site.css#L790)
* `.showcase__inner` — из двух колонок в одну, картинка уезжает наверх (`order: -1`).
* `.step::after` — соединительные линии между шагами исчезают.

**Уже 720 px** — [css/home.css:125](css/home.css#L125)
* `.hero__content` — отступ сверху растёт до 7rem.
* `.hero__scroll` — подсказка «листайте вниз» скрывается.

**Уже 640 px** — [css/site.css:804](css/site.css#L804), [css/home.css:137](css/home.css#L137), [css/style.css:193](css/style.css#L193)
* Шапка перестаёт быть прибитой к верху (`position: static`) — на телефоне меню переносится на несколько строк и закрыло бы пол-экрана.
* `body.site:not(.home) #app` — верхний отступ убирается, он больше не нужен.
* `.hero` — высота уменьшается до 82vh.
* `.card` — внутренние поля уменьшаются до 1.7rem × 1.4rem.
* `header` — логотип, меню и языки выстраиваются в столбик.

**`prefers-reduced-motion`** — [css/site.css:835](css/site.css#L835), [css/home.css:148](css/home.css#L148)
Если в системе включено «уменьшить движение», отключаются: появление `.reveal`, парение картинки, пульсация свечения в `.cta`, дрейф пятна и пульсация линии в `.hero`.

---

## Шпаргалка: как собрать новый блок

```html
<!-- Обычная полоса с заголовком и карточками -->
<section class="band band--alt">
  <div class="container">
    <p class="eyebrow reveal" data-text="блок.eyebrow"></p>
    <h2 class="section-title reveal" data-text="блок.title"></h2>

    <div class="grid grid--cards" data-list="блок.items">
      <template>
        <article class="card reveal">
          <span class="card__icon" data-icon="icon"></span>
          <h3 class="card__title" data-text="title"></h3>
          <p  class="card__text"  data-text="text"></p>
        </article>
      </template>
    </div>
  </div>
</section>
```

Порядок вложенности, который повторяется по всему сайту:

```
section.band          → фон и вертикальные отступы, во всю ширину
  div.container       → ограничение ширины 1100 px и центрирование
    p.eyebrow         → надпись-рубрика
    h2.section-title  → заголовок
    div.grid--cards   → сетка
      article.card    → карточка
```

Три правила, которых достаточно:

1. Фон и вертикальные отступы задаёт `.band` (или `.page-head`, `.cta`, `.showcase`).
2. Ширину содержимого — **всегда** `.container` внутри секции.
3. Всё, что должно появляться при прокрутке, получает `reveal`.
