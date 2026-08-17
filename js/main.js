// main.js — shared across all pages

let currentLang = localStorage.getItem("lang") || "en";

document.addEventListener("DOMContentLoaded", () => {
  insertHeader();
  insertFooter();
  loadLanguage(currentLang);
});

function insertHeader() {
  document.getElementById("site-header").innerHTML = `
    <div class="logo">Physics and We</div>
    <nav>
      <ul>
        <li><a href="index.html" data-i18n="nav_home">Home</a></li>
        <li><a href="about.html" data-i18n="nav_about">About YSO & Outreach</a></li>
        <li><a href="camp.html" data-i18n="nav_camp">Summer Camp</a></li>
        <li><a href="research.html" data-i18n="nav_research">Research & Studies</a></li>
        <li><a href="labs.html" data-i18n="nav_labs">Interactive Labs</a></li>
        <li><a href="news.html" data-i18n="nav_news">News & Events</a></li>
      </ul>
    </nav>
    <div class="lang-switcher">
      <button data-lang="en">EN</button>
      <button data-lang="hy">ՀՅ</button>
      <button data-lang="ru">РУ</button>
    </div>
  `;

  document.querySelectorAll(".lang-switcher button").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentLang = btn.getAttribute("data-lang");
      localStorage.setItem("lang", currentLang);
      loadLanguage(currentLang);
    });
  });

  highlightActiveNavLink();
}

function insertFooter() {
  document.getElementById("site-footer").innerHTML = `<p data-i18n="footer_text">© 2026 Physics and We</p>`;
}

function highlightActiveNavLink() {
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll("nav a").forEach((link) => {
    if (link.getAttribute("href") === currentPage) {
      link.classList.add("current");
    }
  });
}

async function loadLanguage(lang) {
  try {
    const res = await fetch(`js/lang/${lang}.json`);
    const translations = await res.json();
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (translations[key]) {
        el.textContent = translations[key];
      }
    });
    document.querySelectorAll(".lang-switcher button").forEach((btn) => {
      btn.classList.toggle("active-lang", btn.getAttribute("data-lang") === lang);
    });
  } catch (err) {
    console.error("Failed to load language file:", lang, err);
  }
}
