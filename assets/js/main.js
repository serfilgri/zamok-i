const SERVICE_PRICES = {
  emergency_opening: 1200,
  key_copy: 1500,
  car_opening: 1500,
  lock_repair: 1000,
  lock_replacement: 1500,
  door_security_upgrade: 2500,
  lock_installation: 1800,
  handle_installation: 1000,
  master_replacement: 1500,
  entry_lock_repair: 1200,
  interroom_install: 1300,
  interroom_mortise: 1400,
  lock_service: 1200,
  apartment_opening: 1200,
  workshop_repair: 1000,
};

function formatPrice(price) {
  return `от ${new Intl.NumberFormat("ru-RU").format(price)} ₽`;
}

function getSiteRootPrefix() {
  const scriptEl = document.querySelector('script[src*="assets/js/main.js"]');
  const src = scriptEl ? scriptEl.getAttribute("src") || "" : "";
  return src.replace(/assets\/js\/main\.js(?:\?.*)?$/, "");
}

function applyLoadedPrices(loadedPrices) {
  for (const [serviceId, price] of Object.entries(loadedPrices)) {
    if (!Object.prototype.hasOwnProperty.call(SERVICE_PRICES, serviceId))
      continue;

    const parsedPrice = Number(price);
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) continue;

    SERVICE_PRICES[serviceId] = parsedPrice;
  }
}

async function loadPrices() {
  const rootPrefix = getSiteRootPrefix();

  try {
    const response = await fetch(`${rootPrefix}prices.json`, {
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const loadedPrices = await response.json();
    applyLoadedPrices(loadedPrices);
  } catch (error) {
    console.warn(
      "prices.json is unavailable, fallback prices are used:",
      error,
    );
  }
}

async function loadServicesData() {
  const rootPrefix = getSiteRootPrefix();

  // Сначала пробуем загрузить из inline-данных (для работы без сервера)
  const inlineScript = document.getElementById("services-data");
  if (inlineScript) {
    try {
      const data = JSON.parse(inlineScript.textContent);
      if (Array.isArray(data)) {
        return data;
      }
    } catch (e) {
      console.warn("Failed to parse inline services-data:", e);
    }
  }

  // Если inline-данных нет, пробуем fetch
  try {
    const response = await fetch(`${rootPrefix}services-data.json`, {
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.warn(
      "services-data.json is unavailable, service cards are not rendered:",
      error,
    );
    return [];
  }
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderServiceCard(item, index, mode) {
  const number = String(index + 1).padStart(2, "0");
  const title = escapeHtml(item.title || "");
  const description = escapeHtml(item.description || "");
  const icon = escapeHtml(item.icon || "build");
  const pagePath = escapeHtml(item.pagePath || "#");
  const priceId = escapeHtml(item.priceId || "");

  if (mode === "map") {
    return `
      <article class="service-card">
        <span class="service-card__num">${number}</span>
        <span class="material-symbols-outlined service-card__icon">${icon}</span>
        <h3>${title}</h3>
        <p>${pagePath}</p>
        <div style="margin-top: 20px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap">
          <a
            href="${pagePath}"
            class="btn btn--white"
            style="padding: 11px 20px; font-size: 0.8rem; box-shadow: 3px 3px 0 var(--black)"
          >Подробнее</a>
          <strong
            data-price-id="${priceId}"
            style="margin-left: auto; background: var(--primary); border: 2px solid var(--black); padding: 8px 12px; font-size: 0.9rem; line-height: 1"
          ></strong>
        </div>
      </article>
    `;
  }

  const category = escapeHtml(item.category || "");
  return `
    <article class="service-card" data-category="${category}">
      <span class="service-card__num">${number}</span>
      <span class="material-symbols-outlined service-card__icon">${icon}</span>
      <h3>${title}</h3>
      <p>${description}</p>
      <div style="margin-top: 20px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap">
        <a
          href="${pagePath}"
          class="btn btn--white"
          style="padding: 11px 20px; font-size: 0.8rem; box-shadow: 3px 3px 0 var(--black)"
        >Подробнее</a>
        <strong
          data-price-id="${priceId}"
          style="margin-left: auto; background: var(--primary); border: 2px solid var(--black); padding: 8px 12px; font-size: 0.9rem; line-height: 1"
        ></strong>
      </div>
    </article>
  `;
}

function renderServicesFromData(servicesData) {
  const indexContainer = document.getElementById("indexServicesCards");
  const catalogContainer = document.getElementById("servicesCards");

  const featured = servicesData.filter((item) => item.featured).slice(0, 6);
  const allItems = servicesData.filter((item) => item.pagePath);

  if (indexContainer) {
    indexContainer.innerHTML = featured
      .map((item, index) => renderServiceCard(item, index, "catalog"))
      .join("");
  }

  if (catalogContainer) {
    catalogContainer.innerHTML = allItems
      .map((item, index) => renderServiceCard(item, index, "catalog"))
      .join("");
  }
}

function applyServicePrices() {
  document.querySelectorAll("[data-price-id]").forEach((el) => {
    const priceId = el.getAttribute("data-price-id");
    if (!priceId) return;

    const price = SERVICE_PRICES[priceId];
    if (!Number.isFinite(price)) return;

    el.textContent = formatPrice(price);
  });
}

function setServicePrice(serviceId, nextPrice) {
  const parsedPrice = Number(nextPrice);
  if (!Object.prototype.hasOwnProperty.call(SERVICE_PRICES, serviceId)) return;
  if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) return;

  SERVICE_PRICES[serviceId] = parsedPrice;
  applyServicePrices();
}

window.setServicePrice = setServicePrice;

// Same-origin endpoint for lead forms.
// Can be overridden by setting window.LEAD_WEBHOOK_URL before this script loads.
const LEAD_WEBHOOK_URL = window.LEAD_WEBHOOK_URL || "/api/lead.php";

function initServicesFilter() {
  const filterWrap = document.getElementById("servicesFilter");
  const cardsWrap = document.getElementById("servicesCards");
  if (!filterWrap || !cardsWrap) return;

  const cards = Array.from(cardsWrap.querySelectorAll(".service-card"));
  if (!cards.length) return;

  filterWrap.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-filter]");
    if (!btn) return;

    const filter = btn.getAttribute("data-filter") || "all";

    filterWrap.querySelectorAll("[data-filter]").forEach((item) => {
      const isActive = item === btn;
      item.classList.toggle("btn--black", isActive);
      item.classList.toggle("btn--white", !isActive);
    });

    cards.forEach((card) => {
      const category = card.getAttribute("data-category");
      card.hidden = !(filter === "all" || category === filter);
    });
  });
}

/* ---- Burger menu ---- */
const burger = document.getElementById("burger");
const mobileMenu = document.getElementById("mobileMenu");

if (burger && mobileMenu) {
  burger.addEventListener("click", () => {
    mobileMenu.classList.toggle("open");
  });

  mobileMenu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => mobileMenu.classList.remove("open"));
  });
}

/* ---- FAQ accordion ---- */
document.querySelectorAll(".faq__question").forEach((btn) => {
  btn.addEventListener("click", () => {
    const item = btn.closest(".faq__item");
    if (!item) return;

    const isOpen = item.classList.contains("open");
    document.querySelectorAll(".faq__item").forEach((i) => {
      i.classList.remove("open");
      const question = i.querySelector(".faq__question");
      if (question) question.setAttribute("aria-expanded", "false");
    });

    if (!isOpen) {
      item.classList.add("open");
      btn.setAttribute("aria-expanded", "true");
    }
  });
});

function initReviewsToggle() {
  const reviewsToggle = document.getElementById("reviewsToggle");
  const reviewItems = Array.from(document.querySelectorAll("[data-review-item]"));
  const hiddenReviewsCount = Math.max(reviewItems.length - 6, 0);

  if (!reviewsToggle || hiddenReviewsCount === 0) return;

  const collapsedLabel = `Показать ещё ${hiddenReviewsCount} историй`;
  reviewsToggle.textContent = collapsedLabel;

  reviewsToggle.addEventListener("click", () => {
    const expanded = reviewsToggle.getAttribute("aria-expanded") === "true";

    reviewItems.forEach((item, index) => {
      if (index >= 6) item.hidden = expanded;
    });

    reviewsToggle.setAttribute("aria-expanded", String(!expanded));
    reviewsToggle.textContent = expanded ? collapsedLabel : "Свернуть отзывы";
  });
}

function initSeoBlockToggle() {
  const content = document.getElementById("seoBlockContent");
  const toggle = document.getElementById("seoBlockToggle");
  if (!content || !toggle) return;

  const applyState = (expanded) => {
    content.classList.toggle("is-expanded", expanded);
    toggle.setAttribute("aria-expanded", String(expanded));
    toggle.textContent = expanded ? "Свернуть текст" : "Показать полностью";
  };

  applyState(false);

  if (content.scrollHeight <= content.clientHeight + 8) {
    applyState(true);
    toggle.hidden = true;
    return;
  }

  toggle.addEventListener("click", () => {
    const expanded = toggle.getAttribute("aria-expanded") === "true";
    applyState(!expanded);
  });
}

/* ---- Scroll to top ---- */
const scrollTop = document.getElementById("scrollTop");

if (scrollTop) {
  window.addEventListener("scroll", () => {
    scrollTop.classList.toggle("visible", window.scrollY > 400);
  });

  scrollTop.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

function setSubmitState(btn, text, options = {}) {
  btn.textContent = text;
  btn.style.background = options.background || "";
  btn.style.color = options.color || "";
  btn.disabled = Boolean(options.disabled);
}

function collectFormPayload(form) {
  const payload = {};
  const fields = form.querySelectorAll("input, select, textarea");

  fields.forEach((field) => {
    const key = field.name || field.id;
    if (!key || field.type === "submit" || field.type === "button") return;
    payload[key] = field.value.trim();
  });

  payload.page = window.location.href;
  payload.form =
    form.getAttribute("id") || form.getAttribute("name") || "contact_form";
  payload.createdAt = new Date().toISOString();
  return payload;
}

/* ---- Form submit ---- */
async function handleForm(e) {
  e.preventDefault();
  const btn = e.target.querySelector('[type="submit"]');
  if (!btn) return;

  const previousText = btn.textContent;
  const payload = collectFormPayload(e.target);

  try {
    setSubmitState(btn, "Отправляем...", {
      background: "#000",
      color: "#fff",
      disabled: true,
    });

    const response = await fetch(LEAD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    let responseJson = null;
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      responseJson = await response.json();
    }

    if (responseJson && responseJson.ok === false) {
      throw new Error(responseJson.error || "Lead submit failed");
    }

    setSubmitState(btn, "Заявка отправлена ✓", {
      background: "#000",
      color: "#fff",
      disabled: true,
    });
    e.target.reset();

    setTimeout(() => {
      setSubmitState(btn, previousText, { disabled: false });
    }, 2500);
  } catch (error) {
    console.error("Lead submit failed:", error);
    setSubmitState(btn, "Ошибка отправки. Повторить", {
      background: "#000",
      color: "#fff",
      disabled: false,
    });
  }
}

window.handleForm = handleForm;

/* ---- Smooth scroll for anchors ---- */
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    const href = this.getAttribute("href");
    if (!href || href === "#") return;

    const target = document.querySelector(href);
    if (!target) return;

    e.preventDefault();
    const navbar = document.getElementById("navbar");
    const navbarHeight = navbar ? navbar.offsetHeight : 0;
    const top =
      target.getBoundingClientRect().top + window.scrollY - navbarHeight - 8;

    window.scrollTo({ top, behavior: "smooth" });
  });
});

function initIndexContactForm() {
  const form = document.getElementById("contactForm");
  if (!form || form.hasAttribute("onsubmit")) return;

  form.addEventListener("submit", handleForm);
}

async function initPrices() {
  try {
    await loadPrices();
  } catch (e) {
    console.warn("loadPrices failed, continuing without prices:", e);
  }
  const servicesData = await loadServicesData();
  renderServicesFromData(servicesData);
  applyServicePrices();
  initServicesFilter();
}

initReviewsToggle();
initSeoBlockToggle();
initIndexContactForm();
initPrices();
