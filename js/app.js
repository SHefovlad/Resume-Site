const CONFIG_FILES = {
    ru: "config.json",
    en: "config.en.json"
};

const LANGUAGE_STORAGE_KEY = "portfolio-language";
const DEFAULT_LANGUAGE = "en";

let currentLanguage = DEFAULT_LANGUAGE;
let currentConfig = null;
let currentProjects = [];
let currentProjectIndex = 0;
let modalLastFocused = null;
let savedScrollY = 0;

const $ = (selector) => document.querySelector(selector);

const elements = {
    brandMark: $("#brandMark"),
    brandRole: $("#brandRole"),
    siteNav: $("#siteNav"),
    languageSwitch: $("#languageSwitch"),
    profileName: $("#profileName"),
    profileRole: $("#profileRole"),
    profileDescription: $("#profileDescription"),
    resumeDownload: $("#resumeDownload"),
    projectsCta: $("#projectsCta"),
    avatarImage: $("#avatarImage"),
    avatarPlaceholder: $("#avatarPlaceholder"),
    resumeTitle: $("#resumeTitle"),
    educationTitle: $("#educationTitle"),
    experienceTitle: $("#experienceTitle"),
    skillsTitle: $("#skillsTitle"),
    educationList: $("#educationList"),
    experienceList: $("#experienceList"),
    skillsList: $("#skillsList"),
    projectsTitle: $("#projectsTitle"),
    projectsGrid: $("#projectsGrid"),
    contactsTitle: $("#contactsTitle"),
    contactsGrid: $("#contactsGrid"),
    modal: $("#modal"),
    modalClose: $("#modalClose"),
    modalTitle: $("#modalTitle"),
    modalShortTitle: $("#modalShortTitle"),
    modalShort: $("#modalShort"),
    modalDetailsTitle: $("#modalDetailsTitle"),
    modalFull: $("#modalFull"),
    modalLinksSection: $("#modalLinksSection"),
    modalLinksTitle: $("#modalLinksTitle"),
    modalLinks: $("#modalLinks"),
    carouselTrack: $("#carouselTrack"),
    carouselPrev: $("#carouselPrev"),
    carouselNext: $("#carouselNext"),
    carouselDots: $("#carouselDots"),
    status: $("#status")
};

const CONTACT_ICONS = {
    github: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55 0-.27-.01-1.17-.02-2.12-3.2.7-3.88-1.36-3.88-1.36-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.71.08-.71 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.18 1.18.92-.26 1.91-.38 2.89-.39.98 0 1.97.13 2.89.39 2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81.23 2.76.11 3.05.74.81 1.18 1.83 1.18 3.09 0 4.42-2.7 5.39-5.26 5.67.41.36.78 1.06.78 2.14 0 1.55-.01 2.79-.01 3.17 0 .31.21.67.8.55C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z"/></svg>`,
    telegram: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/></svg>`,
    email: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4.24l-8 5.33-8-5.33V6l8 5.33L20 6v2.24z"/></svg>`,
    link: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.59 13.41a2 2 0 0 0 2.82 0L16 10.82A2 2 0 1 0 13.18 8l-1.17 1.17-1.41-1.41 1.17-1.17a4 4 0 1 1 5.65 5.65l-2.59 2.59a4 4 0 0 1-5.65 0zm2.82-2.82a2 2 0 0 0-2.82 0L8 13.18A2 2 0 1 0 10.82 16l1.17-1.17 1.41 1.41-1.17 1.17a4 4 0 1 1-5.65-5.65l2.59-2.59a4 4 0 0 1 5.65 0z"/></svg>`
};

function setText(element, value) {
    if (element) element.textContent = value ?? "";
}

function detectLanguage() {
    return (navigator.language || "").toLowerCase().startsWith("ru") ? "ru" : "en";
}

function getInitials(name) {
    const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return (parts[0] || "?").slice(0, 2).toUpperCase();
}

function resolveRootPath(path) {
    if (!path) return "";
    return new URL(path, document.baseURI).href;
}

function resolveProjectPath(project, path) {
    if (!path) return "";
    const base = project?._sourcePath ? resolveRootPath(project._sourcePath) : document.baseURI;
    return new URL(path, base).href;
}

function isBlankLink(url) {
    return !url || url === "#";
}

function isExternalUrl(url) {
    return /^(https?:|mailto:|tel:)/i.test(url || "");
}

async function fetchJson(path) {
    const response = await fetch(resolveRootPath(path), { cache: "no-store" });
    if (!response.ok) {
        throw new Error(`Не удалось загрузить ${path}: ${response.status}`);
    }
    return response.json();
}

async function loadConfig(language) {
    const configPath = CONFIG_FILES[language];
    const config = await fetchJson(configPath);

    if (!Array.isArray(config.projects) || config.projects.length !== 3) {
        throw new Error(`${configPath}: projects должен содержать ровно 3 пути к JSON-файлам.`);
    }

    const projects = await Promise.all(config.projects.map(async (projectPath) => {
        const project = await fetchJson(projectPath);
        return {
            ...project,
            _sourcePath: projectPath
        };
    }));

    return { config, projects };
}

function showStatus(message) {
    if (!elements.status || !message) return;
    elements.status.textContent = message;
    elements.status.hidden = false;
    clearTimeout(showStatus.timer);
    showStatus.timer = setTimeout(() => {
        elements.status.hidden = true;
    }, 5000);
}

function setPageMeta(config) {
    document.documentElement.lang = currentLanguage;
    document.title = config.meta?.title || config.profile?.name || "Portfolio";

    const description = document.querySelector('meta[name="description"]');
    if (description) {
        description.content = config.meta?.description || config.profile?.description || "";
    }
}

function renderAvatar(config) {
    const path = config.profile?.avatar || "";
    const image = elements.avatarImage;
    const placeholder = elements.avatarPlaceholder;

    placeholder.textContent = getInitials(config.profile?.name);
    placeholder.hidden = false;
    image.hidden = true;
    image.removeAttribute("src");
    image.alt = config.profile?.name || "";

    if (!path) return;

    image.onload = () => {
        placeholder.hidden = true;
        image.hidden = false;
    };

    image.onerror = () => {
        image.hidden = true;
        placeholder.hidden = false;
        image.removeAttribute("src");
    };

    image.src = resolveRootPath(path);
}

function renderHeaderAndHero(config) {
    const ui = config.ui || {};

    setText(elements.brandMark, getInitials(config.profile?.name));
    setText(elements.brandRole, config.profile?.role || "Unity Developer");
    setText(elements.profileName, config.profile?.name);
    setText(elements.profileRole, config.profile?.role);
    setText(elements.profileDescription, config.profile?.description);

    if (config.profile?.resume) {
        elements.resumeDownload.href = resolveRootPath(config.profile.resume);
        elements.resumeDownload.download = "";
        elements.resumeDownload.hidden = false;
        setText(elements.resumeDownload, ui.downloadResume || "Download resume");
    } else {
        elements.resumeDownload.hidden = true;
    }

    setText(elements.projectsCta, ui.viewProjects || "Projects");
    setText(elements.siteNav.querySelector('[data-nav="resume"]'), ui.resume || "Resume");
    setText(elements.siteNav.querySelector('[data-nav="projects"]'), ui.projects || "Projects");
    setText(elements.siteNav.querySelector('[data-nav="contacts"]'), ui.contacts || "Contacts");

    elements.languageSwitch.textContent = currentLanguage === "ru" ? "EN" : "RU";
    elements.languageSwitch.setAttribute(
        "aria-label",
        currentLanguage === "ru"
            ? (ui.switchToEnglish || "Switch to English")
            : (ui.switchToRussian || "Switch to Russian")
    );

    renderAvatar(config);
}

function renderEducation(items) {
    elements.educationList.innerHTML = "";

    (Array.isArray(items) ? items : []).forEach((item) => {
        const article = document.createElement("article");
        article.className = "edu";

        const date = document.createElement("span");
        date.className = "edu__date";
        date.textContent = item.date || "";

        const title = document.createElement("h4");
        title.className = "edu__place";
        title.textContent = item.title || "";

        const degree = document.createElement("p");
        degree.className = "edu__degree";
        degree.textContent = item.degree || "";

        article.append(date, title, degree);
        elements.educationList.appendChild(article);
    });
}

function renderExperience(items) {
    elements.experienceList.innerHTML = "";

    (Array.isArray(items) ? items : []).forEach((item) => {
        const article = document.createElement("article");
        article.className = "exp";

        const date = document.createElement("span");
        date.className = "exp__date";
        date.textContent = item.date || "";

        const role = document.createElement("h4");
        role.className = "exp__role";
        role.textContent = item.role || "";

        const company = document.createElement("p");
        company.className = "exp__company";
        company.textContent = item.company || "";

        const duties = document.createElement("ul");
        duties.className = "exp__duties";
        (Array.isArray(item.duties) ? item.duties : []).forEach((duty) => {
            const li = document.createElement("li");
            li.textContent = duty;
            duties.appendChild(li);
        });

        article.append(date, role, company, duties);
        elements.experienceList.appendChild(article);
    });
}

function renderSkills(groups) {
    elements.skillsList.innerHTML = "";

    (Array.isArray(groups) ? groups : []).forEach((group) => {
        const section = document.createElement("section");
        section.className = "skill-group";

        const title = document.createElement("h4");
        title.className = "skill-group__title";
        title.textContent = group.title || "";

        const list = document.createElement("ul");
        list.className = "skill-tags";

        (Array.isArray(group.items) ? group.items : []).forEach((item) => {
            const li = document.createElement("li");
            li.textContent = item;
            list.appendChild(li);
        });

        section.append(title, list);
        elements.skillsList.appendChild(section);
    });
}

function renderResume(config) {
    const ui = config.ui || {};
    const resume = config.resume || {};

    setText(elements.resumeTitle, ui.resume || "Resume");
    setText(elements.educationTitle, ui.education || "Education");
    setText(elements.experienceTitle, ui.experience || "Experience");
    setText(elements.skillsTitle, ui.skills || "Skills");

    renderEducation(resume.education);
    renderExperience(resume.experience);
    renderSkills(resume.skills);
}

function appendImageWithFallback(parent, path, alt, placeholderText, project) {
    const placeholder = document.createElement("div");
    placeholder.className = "image-placeholder image-placeholder--project";
    placeholder.textContent = placeholderText;
    parent.appendChild(placeholder);

    if (!path) return;

    const image = document.createElement("img");
    image.alt = alt || "";
    image.loading = "lazy";
    image.hidden = true;

    image.onload = () => {
        placeholder.hidden = true;
        image.hidden = false;
    };

    image.onerror = () => {
        image.remove();
        placeholder.hidden = false;
    };

    image.src = resolveProjectPath(project, path);
    parent.appendChild(image);
}

function createProjectCard(project, index) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "project-card";
    button.dataset.projectIndex = String(index);

    const media = document.createElement("div");
    media.className = "project-card__media";
    appendImageWithFallback(
        media,
        Array.isArray(project.images) ? project.images[0] : "",
        project.title,
        currentConfig.ui?.missingImage || "No image",
        project
    );

    const body = document.createElement("div");
    body.className = "project-card__body";

    const title = document.createElement("h3");
    title.className = "project-card__title";
    title.textContent = project.title || "";

    const description = document.createElement("p");
    description.className = "project-card__desc";
    description.textContent = project.description || project.short || "";

    const tags = document.createElement("ul");
    tags.className = "project-card__tags";
    (Array.isArray(project.tags) ? project.tags : []).forEach((tag) => {
        const li = document.createElement("li");
        li.textContent = tag;
        tags.appendChild(li);
    });

    const more = document.createElement("span");
    more.className = "project-card__more";
    more.textContent = currentConfig.ui?.details || "Details →";

    body.append(title, description);
    if (tags.children.length) body.appendChild(tags);
    body.appendChild(more);

    button.append(media, body);
    button.addEventListener("click", () => openModal(index));

    return button;
}

function renderProjects(config, projects) {
    setText(elements.projectsTitle, config.ui?.projects || "Projects");
    elements.projectsGrid.innerHTML = "";
    projects.forEach((project, index) => {
        elements.projectsGrid.appendChild(createProjectCard(project, index));
    });
}

function renderContacts(config) {
    setText(elements.contactsTitle, config.ui?.contacts || "Contacts");
    elements.contactsGrid.innerHTML = "";

    (Array.isArray(config.contacts) ? config.contacts : []).forEach((contact) => {
        const tile = document.createElement("article");
        tile.className = "contact-tile";

        const link = document.createElement("a");
        link.className = "contact-tile__link";
        link.href = contact.url || "#";

        if (isExternalUrl(contact.url) && !/^mailto:|^tel:/i.test(contact.url)) {
            link.target = "_blank";
            link.rel = "noopener noreferrer";
        }

        const icon = document.createElement("span");
        icon.className = "contact-tile__icon";
        icon.innerHTML = CONTACT_ICONS[contact.icon] || CONTACT_ICONS.link;

        const label = document.createElement("span");
        label.className = "contact-tile__label";
        label.textContent = contact.label || "";

        const value = document.createElement("span");
        value.className = "contact-tile__value";
        value.textContent = contact.value || "";

        link.append(icon, label, value);
        tile.appendChild(link);

        if (contact.copy) {
            const copyButton = document.createElement("button");
            copyButton.type = "button";
            copyButton.className = "contact-tile__copy";
            copyButton.setAttribute("aria-label", `${config.ui?.copy || "Copy"} ${contact.label || ""}`);
            copyButton.innerHTML = `
                <svg class="icon-copy" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                </svg>
                <svg class="icon-check" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
            `;

            copyButton.addEventListener("click", async (event) => {
                event.preventDefault();
                event.stopPropagation();

                if (!(await copyToClipboard(contact.copy))) return;

                copyButton.classList.add("is-copied");
                clearTimeout(copyButton._timer);
                copyButton._timer = setTimeout(() => copyButton.classList.remove("is-copied"), 1500);
            });

            tile.appendChild(copyButton);
        }

        elements.contactsGrid.appendChild(tile);
    });
}

function renderModalUi(config) {
    const ui = config.ui || {};
    setText(elements.modalShortTitle, ui.short || "Short");
    setText(elements.modalDetailsTitle, ui.detailsSection || "Details");
    setText(elements.modalLinksTitle, ui.links || "Links");
    elements.modalClose.setAttribute("aria-label", ui.close || "Close");
    elements.carouselPrev.setAttribute("aria-label", ui.previous || "Previous");
    elements.carouselNext.setAttribute("aria-label", ui.next || "Next");
}

function renderCarousel(project) {
    elements.carouselTrack.innerHTML = "";
    elements.carouselDots.innerHTML = "";

    const images = Array.isArray(project.images) && project.images.length
        ? project.images
        : [null];

    images.forEach((path, index) => {
        const slide = document.createElement("div");
        slide.className = "carousel__slide";

        appendImageWithFallback(
            slide,
            path,
            project.title,
            currentConfig.ui?.missingImage || "No image",
            project
        );

        elements.carouselTrack.appendChild(slide);

        const dot = document.createElement("button");
        dot.type = "button";
        dot.className = "carousel__dot";
        dot.setAttribute("aria-label", `${currentConfig.ui?.slide || "Slide"} ${index + 1}`);
        dot.addEventListener("click", () => goToSlide(index));
        elements.carouselDots.appendChild(dot);
    });

    currentProjectIndex = 0;
    updateCarouselControls();
    goToSlide(0);
}

function updateCarouselControls() {
    const count = elements.carouselTrack.children.length;
    const multiple = count > 1;
    elements.carouselPrev.hidden = !multiple;
    elements.carouselNext.hidden = !multiple;
    elements.carouselDots.hidden = !multiple;
}

function goToSlide(index) {
    const count = elements.carouselTrack.children.length;
    if (!count) return;

    currentProjectIndex = (index + count) % count;
    elements.carouselTrack.style.transform = `translateX(-${currentProjectIndex * 100}%)`;

    elements.carouselDots.querySelectorAll(".carousel__dot").forEach((dot, dotIndex) => {
        dot.classList.toggle("is-active", dotIndex === currentProjectIndex);
    });
}

function renderProjectModal(project) {
    const ui = currentConfig.ui || {};

    setText(elements.modalTitle, project.title || "");
    setText(elements.modalShort, project.short || project.description || "");

    elements.modalFull.innerHTML = "";
    (Array.isArray(project.details) ? project.details : []).forEach((paragraph) => {
        const p = document.createElement("p");
        p.textContent = paragraph;
        elements.modalFull.appendChild(p);
    });

    elements.modalLinks.innerHTML = "";
    const links = Array.isArray(project.links) ? project.links : [];
    elements.modalLinksSection.hidden = links.length === 0;

    links.forEach((link) => {
        const anchor = document.createElement("a");
        anchor.className = link.primary ? "btn" : "btn btn--ghost";
        anchor.href = link.url || "#";
        anchor.textContent = link.label || "";

        if (isExternalUrl(link.url) && !/^mailto:|^tel:/i.test(link.url)) {
            anchor.target = "_blank";
            anchor.rel = "noopener noreferrer";
        }

        elements.modalLinks.appendChild(anchor);
    });

    renderCarousel(project);
    renderModalUi(currentConfig);
}

function lockBodyScroll() {
    savedScrollY = window.scrollY || 0;
    document.body.style.position = "fixed";
    document.body.style.top = `-${savedScrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
    document.body.classList.add("modal-open");
}

function unlockBodyScroll() {
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    document.body.style.width = "";
    document.body.classList.remove("modal-open");
    window.scrollTo(0, savedScrollY);
}

function openModal(index) {
    const project = currentProjects[index];
    if (!project) return;

    modalLastFocused = document.activeElement;
    renderProjectModal(project);

    elements.modal.classList.add("is-open");
    elements.modal.setAttribute("aria-hidden", "false");
    lockBodyScroll();
    elements.modal.querySelector(".modal__dialog").scrollTop = 0;
    elements.modalClose.focus();
}

function closeModal() {
    elements.modal.classList.remove("is-open");
    elements.modal.setAttribute("aria-hidden", "true");
    unlockBodyScroll();

    if (modalLastFocused && typeof modalLastFocused.focus === "function") {
        modalLastFocused.focus();
    }
}

function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(text).then(() => true).catch(() => legacyCopy(text));
    }
    return Promise.resolve(legacyCopy(text));
}

function legacyCopy(text) {
    try {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        textarea.style.top = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        const success = document.execCommand("copy");
        textarea.remove();
        return success;
    } catch {
        return false;
    }
}

function getInitialLanguage() {
    try {
        const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (saved === "ru" || saved === "en") return saved;
    } catch {
        // localStorage may be unavailable in restrictive browser modes.
    }

    return detectLanguage();
}

async function loadLanguage(language) {
    const nextLanguage = language === "ru" ? "ru" : "en";

    try {
        const { config, projects } = await loadConfig(nextLanguage);
        currentLanguage = nextLanguage;
        currentConfig = config;
        currentProjects = projects;

        setPageMeta(config);
        renderHeaderAndHero(config);
        renderResume(config);
        renderProjects(config, projects);
        renderContacts(config);
        renderModalUi(config);
    } catch (error) {
        console.error(error);
        const message = currentLanguage === "ru"
            ? "Не удалось загрузить данные портфолио. Проверьте пути к JSON-файлам."
            : "Failed to load portfolio data. Check the JSON file paths.";
        showStatus(message);
    }
}

function setupEvents() {
    elements.languageSwitch.addEventListener("click", async () => {
        const nextLanguage = currentLanguage === "ru" ? "en" : "ru";
        try {
            localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
        } catch {
            // Ignore storage errors; the switch still works for the current page.
        }
        await loadLanguage(nextLanguage);
    });

    elements.modal.querySelectorAll("[data-close]").forEach((element) => {
        element.addEventListener("click", closeModal);
    });

    elements.carouselPrev.addEventListener("click", () => goToSlide(currentProjectIndex - 1));
    elements.carouselNext.addEventListener("click", () => goToSlide(currentProjectIndex + 1));

    document.addEventListener("keydown", (event) => {
        if (!elements.modal.classList.contains("is-open")) return;
        if (event.key === "Escape") closeModal();
        if (event.key === "ArrowLeft") goToSlide(currentProjectIndex - 1);
        if (event.key === "ArrowRight") goToSlide(currentProjectIndex + 1);
    });

    let touchStartX = 0;
    let touchStartY = 0;
    let horizontalSwipe = null;

    elements.carouselTrack.addEventListener("touchstart", (event) => {
        touchStartX = event.touches[0].clientX;
        touchStartY = event.touches[0].clientY;
        horizontalSwipe = null;
    }, { passive: true });

    elements.carouselTrack.addEventListener("touchmove", (event) => {
        if (horizontalSwipe !== null) return;

        const dx = Math.abs(event.touches[0].clientX - touchStartX);
        const dy = Math.abs(event.touches[0].clientY - touchStartY);

        if (dx < 8 && dy < 8) return;
        horizontalSwipe = dx > dy;
    }, { passive: true });

    elements.carouselTrack.addEventListener("touchend", (event) => {
        if (!horizontalSwipe) return;

        const dx = event.changedTouches[0].clientX - touchStartX;
        if (Math.abs(dx) >= 40) {
            goToSlide(dx < 0 ? currentProjectIndex + 1 : currentProjectIndex - 1);
        }

        horizontalSwipe = null;
    }, { passive: true });
}

async function init() {
    setupEvents();
    await loadLanguage(getInitialLanguage());
}

init();
