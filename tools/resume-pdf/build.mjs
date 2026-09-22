#!/usr/bin/env node
/*
 * Собирает PDF-резюме (A4) из тех же конфигов, что и сайт:
 *   config.json / config.en.json  +  projects/<lang>/*.json  +  assets/avatar.*
 *
 * Печать выполняет headless Chromium (Edge/Chrome), поэтому скрипт не требует
 * внешних npm-зависимостей.
 *
 * Использование:
 *   node tools/resume-pdf/build.mjs                     # ru + en -> dist/
 *   node tools/resume-pdf/build.mjs --lang ru           # только русский
 *   node tools/resume-pdf/build.mjs --compact           # плотнее отступы (влезает в 2 страницы)
 *   node tools/resume-pdf/build.mjs --assets            # писать сразу в assets/
 *   node tools/resume-pdf/build.mjs --out some/dir      # свой каталог вывода
 *   node tools/resume-pdf/build.mjs --keep-html         # не удалять промежуточный HTML
 *   node tools/resume-pdf/build.mjs --install-hook      # поставить git-хук pre-commit
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { chmod, copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..", "..");

const CONFIG_FILES = { ru: "config.json", en: "config.en.json" };
const OUTPUT_NAMES = { ru: "resume.pdf", en: "resume.en.pdf" };

const BROWSER_CANDIDATES = [
    process.env.BROWSER_PATH,
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"
].filter(Boolean);

const COMPACT_SPACING = `:root {
    --gap-sec: 15pt;
    --gap-block: 14pt;
    --gap-heading: 13pt;
    --gap-title: 13pt;
    --gap-body: 10pt;
}`;

function parseArgs(argv) {
    const args = { lang: "all", out: "dist", assets: false, keepHtml: false, compact: false, installHook: false };
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === "--lang") args.lang = argv[++i];
        else if (arg === "--out") args.out = argv[++i];
        else if (arg === "--assets") args.assets = true;
        else if (arg === "--keep-html") args.keepHtml = true;
        else if (arg === "--compact") args.compact = true;
        else if (arg === "--install-hook") args.installHook = true;
        else if (arg === "--help" || arg === "-h") args.help = true;
        else throw new Error(`Неизвестный аргумент: ${arg}`);
    }
    return args;
}

const USAGE = `node tools/resume-pdf/build.mjs [--lang ru|en|all] [--out dist] [--compact] [--assets] [--keep-html] [--install-hook]`;

function findBrowser() {
    for (const candidate of BROWSER_CANDIDATES) {
        if (candidate && existsSync(candidate)) return candidate;
    }
    throw new Error(
        "Не найден Chromium-браузер для печати PDF. Укажите путь через переменную окружения BROWSER_PATH."
    );
}

async function readJson(path) {
    return JSON.parse(await readFile(path, "utf8"));
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function escapeAttr(value) {
    return escapeHtml(value);
}

function getInitials(name) {
    const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return (parts[0] || "?").slice(0, 2).toUpperCase();
}

async function avatarDataUri(path) {
    if (!path) return "";
    const file = resolve(ROOT, path);
    if (!existsSync(file)) return "";
    const extension = file.slice(file.lastIndexOf(".") + 1).toLowerCase();
    const mime = extension === "png" ? "image/png" : extension === "webp" ? "image/webp" : "image/jpeg";
    const data = await readFile(file);
    return `data:${mime};base64,${data.toString("base64")}`;
}

/** Строка контакта: у mailto показываем адрес, у хендлов — подпись в скобках. */
function contactLine(link) {
    const url = link.url || "";
    const value = link.value || "";
    const isMail = /^mailto:/i.test(url);
    const shown = isMail ? value : url;
    const suffix = !isMail && value.startsWith("@") ? ` (${value})` : "";
    const href = url || (isMail ? `mailto:${value}` : "");
    return { href, text: `${link.label || ""}: ${shown}${suffix}` };
}

function renderHeader(config, photoUri) {
    const profile = config.profile || {};
    const photo = photoUri
        ? `<img class="head__photo" src="${escapeAttr(photoUri)}" alt="">`
        : `<div class="head__photo-fallback" aria-hidden="true">${escapeHtml(getInitials(profile.name))}</div>`;

    return `<div class="head">
        ${photo}
        <h1 class="head__name">${escapeHtml(profile.name)}</h1>
        <p class="head__role">${escapeHtml(profile.role)}</p>
        <p class="head__desc">${escapeHtml(profile.description)}</p>
    </div>`;
}

function renderLinks(config) {
    const items = Array.isArray(config.links) ? config.links : [];
    if (!items.length) return "";

    const lines = items.map((link) => {
        const { href, text } = contactLine(link);
        const body = escapeHtml(text);
        return `<p class="line">- ${href ? `<a href="${escapeAttr(href)}">${body}</a>` : body}</p>`;
    }).join("\n            ");

    return `<section class="sec">
        <h2 class="sec__title">${escapeHtml(config.ui?.links || "Links")}</h2>
        <div class="lines">
            ${lines}
        </div>
    </section>`;
}

function renderEducation(config) {
    const items = Array.isArray(config.resume?.education) ? config.resume.education : [];
    if (!items.length) return "";

    const blocks = items.map((item) => `<div class="block">
            <p class="edu__date">${escapeHtml(item.date)}</p>
            <p class="edu__title">${escapeHtml(item.title)}</p>
            <p class="edu__degree">${escapeHtml(item.degree)}</p>
        </div>`).join("\n        ");

    return `<section class="sec">
        <h2 class="sec__title">${escapeHtml(config.ui?.education || "Education")}</h2>
        ${blocks}
    </section>`;
}

function renderExperience(config) {
    const items = Array.isArray(config.resume?.experience) ? config.resume.experience : [];
    if (!items.length) return "";

    const blocks = items.map((item) => {
        const duties = (Array.isArray(item.duties) ? item.duties : [])
            .map((duty) => `<p class="line">- ${escapeHtml(duty)}</p>`)
            .join("\n            ");

        return `<div class="block">
            <p class="entry__title">${escapeHtml([item.role, item.company].filter(Boolean).join(" — "))}</p>
            <p class="entry__date">${escapeHtml(item.date)}</p>
            <div class="entry__body">
            ${duties}
            </div>
        </div>`;
    }).join("\n        ");

    return `<section class="sec">
        <h2 class="sec__title">${escapeHtml(config.ui?.experience || "Experience")}</h2>
        ${blocks}
    </section>`;
}

function renderSkills(config) {
    const groups = Array.isArray(config.resume?.skills) ? config.resume.skills : [];
    if (!groups.length) return "";

    const items = groups.map((group) => `<p class="line">- <strong>${escapeHtml(group.title)}:</strong> ${escapeHtml(
        (Array.isArray(group.items) ? group.items : []).join(", ")
    )}</p>`).join("\n            ");

    return `<section class="sec">
        <h2 class="sec__title">${escapeHtml(config.ui?.skills || "Skills")}</h2>
        <div class="skills">
            ${items}
        </div>
    </section>`;
}

function renderProjects(config, projects, language) {
    if (!projects.length) return "";

    const tagsLabel = config.ui?.tags || (language === "ru" ? "Теги" : "Tags");

    const blocks = projects.map((project) => {
        const tags = Array.isArray(project.tags) && project.tags.length
            ? `<p class="line">${escapeHtml(tagsLabel)}: ${escapeHtml(project.tags.join(", "))}</p>`
            : "";

        const links = (Array.isArray(project.links) ? project.links : []).map((link) => {
            const url = link.url || "";
            const href = /^https?:|^mailto:/i.test(url) ? url : "";
            const text = escapeHtml(`- ${link.label ? `${link.label}: ` : ""}${url}`);
            return `<p class="line">${href ? `<a href="${escapeAttr(href)}">${text}</a>` : text}</p>`;
        }).join("\n            ");

        return `<div class="block">
            <p class="entry__title">${escapeHtml(project.title)}</p>
            <div class="project__meta">
            <p class="project__desc">${escapeHtml(project.description || project.short || "")}</p>
            ${tags}
            ${links}
            </div>
        </div>`;
    }).join("\n        ");

    return `<section class="sec">
        <h2 class="sec__title">${escapeHtml(config.ui?.projects || "Projects")}</h2>
        ${blocks}
    </section>`;
}

async function buildHtml(language, css, compact) {
    const config = await readJson(resolve(ROOT, CONFIG_FILES[language]));
    const projectPaths = Array.isArray(config.projects) ? config.projects : [];
    const projects = await Promise.all(projectPaths.map((path) => readJson(resolve(ROOT, path))));

    const photoUri = await avatarDataUri(config.profile?.avatar);

    const body = [
        renderHeader(config, photoUri),
        renderLinks(config),
        renderEducation(config),
        renderExperience(config),
        renderSkills(config),
        renderProjects(config, projects, language)
    ].filter(Boolean).join("\n\n    ");

    return `<!DOCTYPE html>
<html lang="${language}">
<head>
<meta charset="utf-8">
<title>${escapeHtml(config.meta?.title || config.profile?.name || "Resume")}</title>
<style>
${css}
${compact ? COMPACT_SPACING : ""}
</style>
</head>
<body>
    ${body}
</body>
</html>
`;
}

function printPdf(browser, htmlPath, pdfPath) {
    const result = spawnSync(browser, [
        "--headless=new",
        "--disable-gpu",
        "--no-pdf-header-footer",
        "--virtual-time-budget=8000",
        `--print-to-pdf=${pdfPath}`,
        pathToFileURL(htmlPath).href
    ], { encoding: "utf8" });

    if (result.error) throw result.error;
    if (!existsSync(pdfPath)) {
        throw new Error(`Печать PDF не удалась: ${result.stderr || result.stdout || "нет файла на выходе"}`);
    }
}

/** Ставит git-хук pre-commit, который держит PDF в синке с конфигами. */
async function installHook() {
    const git = (...argv) => {
        const result = spawnSync("git", argv, { cwd: ROOT, encoding: "utf8" });
        if (result.error) throw result.error;
        if (result.status !== 0) throw new Error(`git ${argv.join(" ")}: ${result.stderr.trim()}`);
        return result.stdout.trim();
    };

    git("rev-parse", "--is-inside-work-tree");

    // git config --get возвращает код 1, если ключ не задан, — это не ошибка.
    const configured = spawnSync("git", ["config", "--get", "core.hooksPath"], { cwd: ROOT, encoding: "utf8" });
    const hooksPath = (configured.stdout || "").trim();
    if (hooksPath) {
        throw new Error(
            `В репозитории задан core.hooksPath = ${hooksPath}.
` +
            `Скопируйте tools/resume-pdf/pre-commit в этот каталог вручную или уберите настройку.`
        );
    }

    const hooksDir = resolve(ROOT, git("rev-parse", "--git-path", "hooks"));
    const target = join(hooksDir, "pre-commit");

    await mkdir(hooksDir, { recursive: true });

    if (existsSync(target)) {
        const existing = await readFile(target, "utf8");
        if (!existing.includes("tools/resume-pdf/build.mjs")) {
            throw new Error(
                `Хук ${target} уже существует и не наш.
` +
                `Сохраните его отдельно и удалите, затем повторите установку.`
            );
        }
    }

    await copyFile(join(HERE, "pre-commit"), target);
    try {
        await chmod(target, 0o755);
    } catch {
        // На Windows бит выполнения не нужен: git вызывает хук через sh.
    }

    console.log(`Хук установлен: ${target}`);
    console.log("Он пересоберёт assets/resume*.pdf, если в коммит попали конфиги, проекты или аватар.");
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
        console.log(USAGE);
        return;
    }

    if (args.installHook) {
        await installHook();
        return;
    }

    const languages = args.lang === "all" ? ["ru", "en"] : [args.lang];
    for (const language of languages) {
        if (!CONFIG_FILES[language]) throw new Error(`Неизвестный язык: ${language}. Доступно: ru, en, all.`);
    }

    const browser = findBrowser();
    const css = await readFile(join(HERE, "resume.css"), "utf8");
    const outDir = args.assets ? join(ROOT, "assets") : resolve(ROOT, args.out);
    await mkdir(outDir, { recursive: true });

    console.log(`Браузер для печати: ${browser}`);

    for (const language of languages) {
        const html = await buildHtml(language, css, args.compact);
        const htmlPath = join(tmpdir(), `resume-${language}-${Date.now()}.html`);
        const pdfPath = join(outDir, OUTPUT_NAMES[language]);

        await writeFile(htmlPath, html, "utf8");
        try {
            printPdf(browser, htmlPath, pdfPath);
        } finally {
            if (!args.keepHtml) await rm(htmlPath, { force: true });
            else console.log(`HTML сохранён: ${htmlPath}`);
        }

        console.log(`Готово: ${pdfPath}`);
    }
}

main().catch((error) => {
    console.error(`Ошибка: ${error.message}`);
    process.exitCode = 1;
});
