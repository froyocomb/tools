// ==UserScript==
// @name         Froyocomb Helper
// @namespace    https://dobby233liu.neocities.org
// @version      v1.1.18e-VIBECODED-TEMPORARY
// @description  Tool for speeding up the process of finding commits from before a specific date (i.e. included with a specific build). Developed for Froyocomb, the Android pre-release source reconstruction project.
// @author       Liu Wenyuan & Froyocomb Team
// @match        https://android.googlesource.com/*
// @match        https://chromium.googlesource.com/*
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @run-at       document-end
// @downloadURL  https://raw.githubusercontent.com/froyocomb/tools/refs/heads/main/Froyocomb%20Helper.user.js
// @updateURL    https://raw.githubusercontent.com/froyocomb/tools/refs/heads/main/Froyocomb%20Helper.user.js
// @homepage     https://github.com/froyocomb/tools
// ==/UserScript==

/* eslint-disable curly */

"use strict";

const ON_GOOGLESOURCE = location.hostname.endsWith(".googlesource.com");
const SITE = location.hostname.split(".").reverse()[2];

const AUTHORIZED_ACCESS_PATH2 = "/a";
const AUTHORIZED_ACCESS_PATH = AUTHORIZED_ACCESS_PATH2 + "/";
const USE_AUTHORIZED_ACCESS = ON_GOOGLESOURCE ? location.pathname.startsWith(AUTHORIZED_ACCESS_PATH) : false;

// JANK
function getForCurrentSite(config, defaultValue) {
    return GM_getValue(SITE + "." + config, defaultValue);
}
function setForCurrentSite(config, value) {
    return GM_setValue(SITE + "." + config, value);
}
function deleteForCurrentSite(config) {
    return GM_deleteValue(SITE + "." + config);
}

if (!getForCurrentSite("referenceTag"))
    setForCurrentSite("referenceTag", SITE == "android" ? GM_getValue("referenceTag", "android-4.0.1_r1") : "TAG");
if (!getForCurrentSite("referenceTag2"))
    setForCurrentSite("referenceTag2", SITE == "android" ? GM_getValue("referenceTag", "android-5.0.0_r1") : "TAG");
if (!getForCurrentSite("referenceBranch"))
    setForCurrentSite("referenceBranch", SITE == "android" ? GM_getValue("referenceBranch", "ics-mr0-release") : "main");
if (!getForCurrentSite("referenceTime"))
    setForCurrentSite("referenceTime", (SITE == "android" ? GM_getValue("referenceTime") : null) ?? +(new Date("0")));
if (SITE == "android") {
    GM_deleteValue("referenceTag");
    GM_deleteValue("referenceBranch");
    GM_deleteValue("referenceTime");
}

const createElement = document.createElement.bind(document);

// Colors for the "Light 'em up!" commit-highlighting feature, exposed as CSS
// variables so they can be swapped out under Gitiles' native dark mode
// (html[data-theme="dark"], or no data-theme attribute + prefers-color-scheme:
// dark for "Auto"). Dark values match the user's own android.googlesource.com
// dark-mode userstyle.
GM_addStyle(`
:root {
    --fch-committer-highlight-bg: #ffee3366;
    --fch-time-highlight-bg: #ffff00;
    --fch-time-highlight-lesser-bg: #aadfff77;
    --fch-lightedup-bg: #ffff00;
    --fch-lightedup-exact-bg: #ffa400;
    --fch-lightedup-lesser-bg: #eeee0040;
    --fch-parentlink-bg: #aaccaa;
}

html[data-theme="dark"] {
    --fch-committer-highlight-bg: rgba(255, 214, 0, 0.18);
    --fch-time-highlight-bg: rgba(255, 214, 0, 0.28);
    --fch-time-highlight-lesser-bg: rgba(120, 170, 255, 0.16);
    --fch-lightedup-bg: rgba(255, 214, 0, 0.20);
    --fch-lightedup-exact-bg: rgba(255, 152, 0, 0.30);
    --fch-lightedup-lesser-bg: rgba(255, 224, 130, 0.09);
    --fch-parentlink-bg: rgba(126, 231, 135, 0.25);
}

@media (prefers-color-scheme: dark) {
    html:not([data-theme="light"]) {
        --fch-committer-highlight-bg: rgba(255, 214, 0, 0.18);
        --fch-time-highlight-bg: rgba(255, 214, 0, 0.28);
        --fch-time-highlight-lesser-bg: rgba(120, 170, 255, 0.16);
        --fch-lightedup-bg: rgba(255, 214, 0, 0.20);
        --fch-lightedup-exact-bg: rgba(255, 152, 0, 0.30);
        --fch-lightedup-lesser-bg: rgba(255, 224, 130, 0.09);
        --fch-parentlink-bg: rgba(126, 231, 135, 0.25);
    }
}

/* Extra dark-only accents for the highlight classes: a colored left edge
   instead of a flat block, matching the translucent-tint look above. Also
   overrides hover for these rows, since .CommitLog-item:hover has the same
   selector specificity and could otherwise still win depending on stylesheet
   order. */
html[data-theme="dark"] .CommitLog-item--fch-lightedUp {
    box-shadow: inset 3px 0 0 #ffd600;
}
html[data-theme="dark"] .CommitLog-item--fch-lightedUp:hover {
    background: rgba(255, 214, 0, 0.30) !important;
}
html[data-theme="dark"] .CommitLog-item--fch-lightedUp-exact {
    box-shadow: inset 3px 0 0 #ff9800;
}
html[data-theme="dark"] .CommitLog-item--fch-lightedUp-exact:hover {
    background: rgba(255, 152, 0, 0.40) !important;
}
html[data-theme="dark"] .CommitLog-item--fch-lightedUp-lesser {
    box-shadow: inset 3px 0 0 rgba(255, 214, 0, 0.5);
}
html[data-theme="dark"] .CommitLog-item--fch-lightedUp-lesser:hover {
    background: rgba(255, 224, 130, 0.18) !important;
}

@media (prefers-color-scheme: dark) {
    html:not([data-theme="light"]) .CommitLog-item--fch-lightedUp {
        box-shadow: inset 3px 0 0 #ffd600;
    }
    html:not([data-theme="light"]) .CommitLog-item--fch-lightedUp:hover {
        background: rgba(255, 214, 0, 0.30) !important;
    }
    html:not([data-theme="light"]) .CommitLog-item--fch-lightedUp-exact {
        box-shadow: inset 3px 0 0 #ff9800;
    }
    html:not([data-theme="light"]) .CommitLog-item--fch-lightedUp-exact:hover {
        background: rgba(255, 152, 0, 0.40) !important;
    }
    html:not([data-theme="light"]) .CommitLog-item--fch-lightedUp-lesser {
        box-shadow: inset 3px 0 0 rgba(255, 214, 0, 0.5);
    }
    html:not([data-theme="light"]) .CommitLog-item--fch-lightedUp-lesser:hover {
        background: rgba(255, 224, 130, 0.18) !important;
    }
}
`);

let floatingPanelStylesPresent = false;
function createFloatingPanel(variant) {
    if (!floatingPanelStylesPresent) {
        GM_addStyle(`
.fch-FloatingPanel {
    position: fixed;

    padding: 8px;
    background: #ffdb00ee;
}
.fch-FloatingPanel-bottom {
    left: 50%; bottom: 0;
    transform: translate3d(-50%, 0, 0);
}
.fch-FloatingPanel-right {
    right: 0; top: 3em;
    transform: translate3d(0, 0, 0);
}

.fch-FloatingPanel button {
    font: inherit;
}

/* Dark mode: match the user's own android.googlesource.com dark-mode
   userstyle exactly (--bg-alt / --text / --border / --link variables from
   that stylesheet), rather than keeping the light-theme yellow panel and
   patching individual text colors on top of it. */
html[data-theme="dark"] .fch-FloatingPanel {
    background: #252526;
    color: #d4d4d4;
    border: 1px solid #3a3a3c;
    border-radius: 0;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
}
html[data-theme="dark"] .fch-FloatingPanel a,
html[data-theme="dark"] .fch-FloatingPanel a:visited {
    color: #6cb6ff;
}
html[data-theme="dark"] .fch-FloatingPanel button {
    background: #3a3a3c;
    color: #d4d4d4;
    border: 1px solid #3a3a3c;
    border-radius: 0;
}
html[data-theme="dark"] .fch-FloatingPanel button:hover {
    background: #48484a;
}

@media (prefers-color-scheme: dark) {
    html:not([data-theme="light"]) .fch-FloatingPanel {
        background: #252526;
        color: #d4d4d4;
        border: 1px solid #3a3a3c;
        border-radius: 0;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
    }
    html:not([data-theme="light"]) .fch-FloatingPanel a,
    html:not([data-theme="light"]) .fch-FloatingPanel a:visited {
        color: #6cb6ff;
    }
    html:not([data-theme="light"]) .fch-FloatingPanel button {
        background: #3a3a3c;
        color: #d4d4d4;
        border: 1px solid #3a3a3c;
        border-radius: 0;
    }
    html:not([data-theme="light"]) .fch-FloatingPanel button:hover {
        background: #48484a;
    }
}
`);
        floatingPanelStylesPresent = true;
    }

    const panel = document.body.insertAdjacentElement("afterBegin", createElement("div"));
    panel.classList.add("fch-FloatingPanel");
    panel.classList.add("fch-FloatingPanel-" + (variant ?? "bottom"));
    panel.tabindex = 0;
    return panel;
}

function addListItem(list, content) {
    const item = list.appendChild(createElement("li"));
    if (content)
        item.appendChild(content);
    return content ?? item;
}

function generateButton(text, onClick) {
    const button = createElement("button");
    button.type = "button";
    button.innerText = text;
    if (onClick)
        button.addEventListener("click", onClick);
    return button;
}

let copyButtonStylePresent = false;
function createCopyButtonFactory(title) {
    if (!copyButtonStylePresent) {
        GM_addStyle(`
.fch-CopyButton {
    font: inherit;
    position: relative;
    margin-left: 2px;
    margin-right: 3px;
}

@keyframes fch-CopyButton-Toast-Anim {
    from, 33.333% {
        opacity: 1;
    }
    to {
        opacity: 0;
        bottom: calc(100% + 1em);
    }
}

.fch-CopyButton-Toast {
    position: absolute;
    left: 50%;
    transform: translate3d(-50%, 0, 0);
    bottom: calc(100% + 0.3em);
    z-index: 10;

    width: max-content;
    padding: 2px 6px;
    background: #ffdb00f0;
    border: #ffe54755 2px solid;
    border-radius: 6px;
    opacity: 0;
}
.fch-CopyButton-Toast > * {
    pointer-events: none;
}

.fch-CopyButton-Toast-Done, .fch-CopyButton-Toast-Error {
    animation: fch-CopyButton-Toast-Anim 1s ease-in-out;
}

.fch-CopyButton-Toast-Error {
    background-color: #ff0004f0;
    border-color: #ff474755;
}

html[data-theme="dark"] .fch-CopyButton-Toast {
    background: #2a2a2a;
    color: #d4d4d4;
    border-color: #3a3a3c;
}
html[data-theme="dark"] .fch-CopyButton-Toast-Error {
    background-color: #5a1a1a;
    border-color: #aa3333;
    color: #ffb4ab;
}

@media (prefers-color-scheme: dark) {
    html:not([data-theme="light"]) .fch-CopyButton-Toast {
        background: #2a2a2a;
        color: #d4d4d4;
        border-color: #3a3a3c;
    }
    html:not([data-theme="light"]) .fch-CopyButton-Toast-Error {
        background-color: #5a1a1a;
        border-color: #aa3333;
        color: #ffb4ab;
    }
}
`);
        copyButtonStylePresent = true;
    }

    const button = generateButton("\u{1F4CB}");
    button.classList.add("fch-CopyButton");
    button.title = title ? title : "Copy";
    const toast = button.appendChild(createElement("div"));
    toast.classList.add("fch-CopyButton-Toast");
    toast.style.display = "none";

    return function(text, copyCb) {
        const newButton = button.cloneNode(true);

        const newToast = newButton.querySelector(".fch-CopyButton-Toast");
        newToast.addEventListener("animationend", function(ev) {
            if (ev.animationName == "fch-CopyButton-Toast-Anim")
                ev.target.style.display = "none";
        });
        newToast.addEventListener("click", function(ev) {
            // prevent toast from triggering copy
            ev.stopPropagation();
        });

        newButton.addEventListener("click", function(ev) {
            (async function(ev) {
                let ok = true;
                try {
                    await navigator.clipboard.writeText(text);
                } catch (ex) {
                    console.error("[FCH] Copy to clipboard failed", ex);
                    ok = false;
                }

                if (typeof copyCb == "function")
                    copyCb(text);

                if (!newToast) return;
                newToast.classList.remove("fch-CopyButton-Toast-Done");
                newToast.classList.remove("fch-CopyButton-Toast-Error");
                requestAnimationFrame(() => {
                    newToast.style.display = "";
                    void(newToast.offsetWidth); // crime
                    if (ok) {
                        newToast.classList.add("fch-CopyButton-Toast-Done");
                        newToast.innerText = "Copied!";
                    } else {
                        newToast.classList.add("fch-CopyButton-Toast-Error");
                        newToast.innerText = "Copy failed!";
                    }
                });
            })();
        });
        return newButton;
    }
}

function getRepoHomePath(pathname) {
    if (ON_GOOGLESOURCE) {
        const i = pathname.indexOf(AUTHORIZED_ACCESS_PATH);
        if (i >= 0)
            pathname = pathname.substring(AUTHORIZED_ACCESS_PATH.length - 1);
    }

    const j = pathname.indexOf("/+");
    if (j >= 0)
        return pathname.substring(0, j);
    return pathname.replace(/\/+$/, "");
}

function formatRef(refType, refName) {
    if (refType == "" || refType == "commit")
        return refName;
    return `refs/${refType}/${refName}`;
}

function getPathToRef(homePath, ref, viewType="") {
    return homePath + `/+${viewType}/` + ref;
}

function parseGitilesJson(rawJson) {
    // TODO: what is Gitiles smoking
    return JSON.parse(rawJson.replace(/^\)\]\}'\n/, ""));
}

// if author email in a commit doesn't match one of these patterns, the commit potentially comes from upstream,
// or is likely a partner/AOSP ext contribution that probably got merged in by Google later
const AUTHOR_ALLOWLIST = (function(site) {
    // from inside google (mostly)
    let authorAllowlist = [
        /@(?:[A-Za-z0-9\-]+?\.)*(?<!corp-partner\.)google\.com/, // look idk
        /%(?:[A-Za-z0-9\-]+?\.)*(?<!corp-partner\.)google\.com@gtempaccount\.com/ // note the percent sign
    ];
    if (site == "android") {
        authorAllowlist = authorAllowlist.concat([ // from inside android
            /@(?:[A-Za-z0-9\-]+?\.)*android\.com/,
            /%(?:[A-Za-z0-9\-]+?\.)*android\.com@gtempaccount\.com/,
            /@android$/,
            /@android@[a-f0-9\-]+$/,
        ]);
    }
    if (
        site == "chromium"
        // idk
        // normally during 4.4 chromium-automerger@android is SLIGHTLY more reliable
        || (site == "android" && getRepoHomePath(location.pathname).startsWith("/platform/external/chromium_org"))
    ) {
        authorAllowlist = authorAllowlist.concat([
            /@(?:[A-Za-z0-9\-]+?\.)*chromium\.org/
        ]);
    }
    return authorAllowlist;
})(SITE);

// usually signs that may indicate a upstream commit
const ALERTABLE_COMMENT_MESSAGE_PATTERNS = (function(site){
    let patterns = [];
    if (site != "chromium") { // temporary
        patterns = patterns.concat([
            "\ngit-svn-id: "
        ]);
    }
    if (site != "chromium") {
        patterns = patterns.concat([
            /\nReview URL: http(?:s)?:\/\/codereview\.chromium\.org\//,
            /\nReview URL: http(?:s)?:\/\/chromiumcodereview\.appspot\.com\//,
            /\nReviewed-on: http(?:s)?:\/\/chromium-review\.googlesource\.com\//
        ]);
    }
    return patterns;
})(SITE);

function matchesPatterns(str, pats) {
    return pats.some(i => i instanceof RegExp ? !!str.match(i) : str.includes(i));
}

(function() {
    const headerMenu = document.querySelector(".Site-header .Header-menu");
    if (!headerMenu) return;
    for (const i of headerMenu.querySelectorAll(".Header-menuItem")) {
        if (i.tagName == "A" && i.href.startsWith("https://accounts.google.com/AccountChooser") && i.innerText == "Sign in") {
            i.appendChild(document.createTextNode(" "));
            GM_addStyle(`
.fch-LoginHint {
    color: #ff2f00;
    text-decoration: underline dotted; /* TODO: use abbr instead? */
}

html[data-theme="dark"] .fch-LoginHint {
    color: #ff8a65;
}
@media (prefers-color-scheme: dark) {
    html:not([data-theme="light"]) .fch-LoginHint {
        color: #ff8a65;
    }
}
`);
            const loginHint = i.appendChild(createElement("span"));
            loginHint.innerText = "(recommended)";
            loginHint.title = "Log in for more lenient rate limits";
            loginHint.classList.add("fch-LoginHint");
            break;
        }
    }
})();

if (document.querySelector(".RepoShortlog")) {
    // This part is almost useless outside of android
    (function() {
        const panel = createFloatingPanel();
        const list = panel.appendChild(createElement("ul"));

        function updateRefLink(link, refType, refName, viewType) {
            const ref = formatRef(refType, refName);
            link.href = getPathToRef((USE_AUTHORIZED_ACCESS ? AUTHORIZED_ACCESS_PATH2 : "") + getRepoHomePath(location.pathname), ref, viewType);
            link.innerText = "Go to " + viewType + " of " + ref;
            return link;
        }

        function makeRefLink(key, kname, refType) {
            const refContainer = addListItem(list);
            const refLink = refContainer.appendChild(createElement("a"));
            function updateThisRefLink() {
                updateRefLink(refLink, refType, getForCurrentSite(key), "log");
            }
            updateThisRefLink();
            refContainer.appendChild(document.createTextNode(" "));
            refContainer.appendChild(generateButton("Set", function() {
                const val = prompt(`Set ${kname} to:`, getForCurrentSite(key)).trim();
                if (!val || val === "") return;
                setForCurrentSite(key, val);
                updateThisRefLink();
            }));
        }

        makeRefLink("referenceTag", "reference tag", "tags");
        makeRefLink("referenceTag2", "reference tag 2", "tags");
        makeRefLink("referenceBranch", "reference branch", "heads");
    })();
} else if (document.querySelector(".CommitLog")) {
    (function() {
    GM_addStyle(`
.fch-LightEmUp-Message-Container {
    display: flex;
    flex-flow: row wrap;
    gap: 8px;
    align-items: center;
    margin-bottom: 2px;
}

.fch-LightEmUp-Message {
    flex: 1 1;
}

.fch-LightEmUp-RefTime-Entry, .fch-LightEmUp-RefTimeSetter-Entry {
    text-align: center;
}
.fch-LightEmUp-RefTime-Entry {
    font-size: 13px;
}
.fch-LightEmUp-RefTimeSetter-Entry {
    font-size: 12px;
}

.CommitLog-item--fch-lightedUp {
    background: var(--fch-lightedup-bg);
}
.CommitLog-item--fch-lightedUp-exact {
    background: var(--fch-lightedup-exact-bg);
}
.CommitLog-item--fch-lightedUp-lesser {
    background: var(--fch-lightedup-lesser-bg);
}
`);

        function filterCommits(commits, dateBefore) {
            const result = {};

            for (const commit of commits) {
                const authorEmail = commit.querySelector(":scope > .CommitLog-author").title;
                const lesser = !matchesPatterns(authorEmail, AUTHOR_ALLOWLIST);
                const time = new Date(commit.querySelector(":scope > .CommitLog-time").title);
                if (isNaN(+time))
                    continue;
                if (time <= dateBefore)
                    result[commit.querySelector(":scope > .CommitLog-sha1").href] = lesser ? "-lesser" : (time >= dateBefore ? "-exact" : "");
            }

            return result;
        }

        // strange feature per Mainnn's request
        //let markAsVisitedIframe = undefined;
        function markAsVisited(url) {
            /*// not working
            if (markAsVisitedIframe === undefined) {
                markAsVisitedIframe = document.body.appendChild(createElement("iframe"));
                markAsVisitedIframe.name = "fch-markAsVisited";
                markAsVisitedIframe.src = blankPage;
                markAsVisitedIframe.style.display = "none";
                console.log(markAsVisitedIframe);
            }
            */
            const wnd = window; // markAsVisitedIframe.contentWindow;
            const oldHref = wnd.location.href;
            wnd.history.replaceState({}, "", url);
            wnd.history.replaceState({}, "", oldHref);
        }

        const commits = Array.from(document.querySelectorAll(".Site-content > .Container > .CommitLog > .CommitLog-item"));
        const createCopyButton = createCopyButtonFactory("Copy hash");
        for (const commit of commits) {
            const hashEl = commit.querySelector(".CommitLog-sha1");
            if (!hashEl) continue;
            const hash = new URL(hashEl.href).pathname.split("/").reverse()[0];
            if (!(hash.length == 40 && hash.startsWith(hashEl.innerText))) {
                console.warn("[FCH] Hash extraction failed, sha1 link element:", hashEl);
                continue;
            }
            hashEl.parentNode.insertBefore(createCopyButton(hash, (_) => {
                try {
                    markAsVisited(hashEl.href);
                } catch (ex) {
                    console.warn("[FCH] markAsVisited failed", ex);
                }
            }), hashEl.nextSibling);
        }

        const panel = createFloatingPanel();

        const lightedUpClz = "CommitLog-item--fch-lightedUp";
        const lightedUpExactClz = "CommitLog-item--fch-lightedUp-exact";
        const lightedUpLesserClz = "CommitLog-item--fch-lightedUp-lesser";
        const firstId = "fch-lightedUp-First";

        const list = panel.appendChild(createElement("ul"));

        const lightEmUpEntry = list.appendChild(createElement("li"));
        const messageContainerEl = lightEmUpEntry.appendChild(createElement("div"));
        messageContainerEl.classList.add("fch-LightEmUp-Message-Container");

        const commitLogPretty = !!document.querySelector(".CommitLog-item > .Metadata");
        if (!commitLogPretty) { // FIXME: make lightEmUp work on pretty=fuller pages
            const lightEmUpBtn = messageContainerEl.appendChild(generateButton("Light 'em up!"));
            lightEmUpBtn.accessKey = "z";
            lightEmUpBtn.title = "[alt+z]";

            const messageEl = messageContainerEl.appendChild(createElement("span"));
            messageEl.classList.add("fch-LightEmUp-Message");

            const jumpToFirst = messageContainerEl.appendChild(createElement("a"));
            jumpToFirst.classList.add("fch-lightedUp-JumpToFirst");
            jumpToFirst.innerText = "(first)";
            jumpToFirst.href = "#" + firstId;
            jumpToFirst.style.display = "none";
            jumpToFirst.accessKey = "v";
            jumpToFirst.title = "[alt+v]";

            lightEmUpBtn.addEventListener("click", function() {
                const time = new Date(getForCurrentSite("referenceTime"));
                const filtered = filterCommits(commits, time);

                let firstFound = false;
                for (const commit of commits) {
                    commit.classList.remove(lightedUpClz);
                    commit.classList.remove(lightedUpExactClz);
                    commit.classList.remove(lightedUpLesserClz);
                    const found = filtered[commit.querySelector(":scope > .CommitLog-sha1").href];
                    if (found === undefined) {
                        if (commit.id == firstId)
                            delete commit.id;
                    } else {
                        commit.classList.add(lightedUpClz + found);
                        if (!firstFound) {
                            commit.id = firstId;
                            firstFound = true;
                        } else if (commit.id == firstId) {
                            delete commit.id;
                        }
                    }
                }

                const filteredCount = Object.keys(filtered).length;
                messageEl.innerText = `${filteredCount} found`;
                messageEl.title = `(before ${time.toISOString()})`;
                jumpToFirst.style.display = filteredCount > 0 ? "" : "none";
            });
        }

        const nextButtonOrig = document.querySelector(".LogNav-next");
        const prevButtonOrig = document.querySelector(".LogNav-prev");
        if (nextButtonOrig || prevButtonOrig) {
            messageContainerEl.appendChild(document.createTextNode("|"));
            if (prevButtonOrig) {
                const prevButton = messageContainerEl.appendChild(prevButtonOrig.cloneNode());
                prevButton.innerText = "<< Prev";
                prevButton.accessKey = "a";
                prevButton.title = "[alt+a]";
            }
            if (nextButtonOrig) {
                const nextButton = messageContainerEl.appendChild(nextButtonOrig.cloneNode());
                nextButton.innerText = "Next >>";
                nextButton.accessKey = "s";
                nextButton.title = "[alt+s]";
            }
        }

        const refTimeEntry = list.appendChild(createElement("li"));
        refTimeEntry.classList.add("fch-LightEmUp-RefTime-Entry");
        const refTimeContainer = refTimeEntry.appendChild(createElement("span"));
        const refTimePrefix = refTimeContainer.appendChild(document.createTextNode("Highlight commits from before "));
        const refTimeDisp = refTimeContainer.appendChild(createElement("strong"));
        function updateRefTimeDisp() {
            refTimeDisp.innerText = new Date(getForCurrentSite("referenceTime")).toISOString();
        }
        updateRefTimeDisp();

        const refTimeSetterEntry = list.appendChild(createElement("li"));
        refTimeSetterEntry.classList.add("fch-LightEmUp-RefTimeSetter-Entry");
        const refTimeSetterContainer = refTimeSetterEntry.appendChild(createElement("span"));

        if (commitLogPretty) {
            const rtsAppliesOnRefresh = refTimeSetterContainer.appendChild(createElement("abbr"));
            rtsAppliesOnRefresh.innerText = "Applies on refresh";
            rtsAppliesOnRefresh.title = 'Complain to Dobby if you\'d like "Light \'em up" to work here';
            refTimeSetterContainer.appendChild(document.createTextNode(" | "));
        }

        refTimeSetterContainer.appendChild(document.createTextNode("Set"));
        function rtsInsertSpace() {
            refTimeSetterContainer.appendChild(document.createTextNode(" "));
        }

        rtsInsertSpace();
        refTimeSetterContainer.appendChild(generateButton("by datetime", function() {
            const val = prompt("Set reference time by datetime string:", new Date(getForCurrentSite("referenceTime")).toISOString()).trim();
            if (!val || val === "") return;
            const ts = +(new Date(val));
            if (isNaN(ts)) {
                alert("Invalid date");
                return;
            }
            setForCurrentSite("referenceTime", ts);
            updateRefTimeDisp();
        }));

        rtsInsertSpace();
        refTimeSetterContainer.appendChild(generateButton("by timestamp", function() {
            const val = prompt("Set reference time by timestamp:", getForCurrentSite("referenceTime")).trim();
            if (!val || val === "") return;
            const ts = +(new Date(parseInt(val)));
            if (isNaN(ts)) {
                alert("Invalid date");
                return;
            }
            setForCurrentSite("referenceTime", ts);
            updateRefTimeDisp();
        }));

        if (SITE == "android") {
            rtsInsertSpace();
            const setByCommitBtn = refTimeSetterContainer.appendChild(generateButton("by tag commit"));
            const setByCommitWorkingEl = refTimeSetterContainer.appendChild(createElement("span"));
            setByCommitWorkingEl.innerText = " (working...)";
            setByCommitWorkingEl.style.display = "none";

            async function setByCommitBtnOnClickReal() {
                const hash = prompt("Please input the full hash of the commit modifying build/(make/)core/build_id.mk that you have in mind")?.trim();
                if (!hash || hash == "") return;
                if (hash.search(/^[0-9a-f]{40}$/) == -1) { // technically an arbitary limitation but idk
                    alert("Invalid hash");
                    return;
                }

                const url = new URL(getPathToRef(`${USE_AUTHORIZED_ACCESS ? AUTHORIZED_ACCESS_PATH2 : ""}/platform/build`, formatRef("commit", hash)), location.origin);
                url.searchParams.set("format", "JSON");

                const response = await fetch(url.href);

                if (!response.ok) {
                    const errMsg = await response.text();
                    console.error("[FCH] platform/build commit request error", new Error(errMsg));
                    alert("Status: " + response.status + "\n\n" + errMsg.trim());
                    return;
                }

                const body = parseGitilesJson(await response.text());

                const commitMsg = (body.message ?? "").split("\n")[0];
                let commitDate = new Date(body.committer.time);
                if (isNaN(+commitDate)) {
                    alert("Invalid date");
                    return;
                }

                if (confirm(
                    `Message: ${commitMsg}

Authored by: ${body.author.name} <${body.author.email}>
Committed by: ${body.committer.name} <${body.committer.email}>

Commit date: ${commitDate.toISOString()}

Does this seem correct?`)) {
                    if (body.committer.email == "initial-contribution@android.com"
                        && (commitMsg.startsWith("auto import from ") || commitMsg.startsWith("Automated import from ")
                            || commitMsg.includes("Code drop from //branches/")
                            || (body.message ?? "").includes("Automated import of CL "))) {
                        if (confirm("This commit appears to be a import from Perforce (or SVN?) (commonly seen pre-Dount).\n"
                                    + "Each import commit's dates appear to be seconds apart, which may cause detection inaccuracy.\n\n"
                                    + "Adjust reference time by 5 minutes for safety?"))
                            commitDate = new Date(commitDate.getTime() + 5*60000);
                    }
                    setForCurrentSite("referenceTime", +commitDate);
                    updateRefTimeDisp();
                }
            }
            setByCommitBtn.addEventListener("click", async function() {
                setByCommitWorkingEl.style.display = "";
                try {
                    await setByCommitBtnOnClickReal();
                } catch (ex) {
                    console.error("[FCH] setByCommitBtnOnClickReal error", ex);
                    alert(ex.stack);
                }
                setByCommitWorkingEl.style.display = "none";
            });
        }

        const panelRight = createFloatingPanel("right");
        // TODO: add options to set "pretty" and "n" here
        panelRight.appendChild(generateButton("Locate", function() {
            const newLoc = new URL(location);
            const start = prompt("Commit to locate in this log:", newLoc.searchParams.get("s") || "").trim();
            if (!start || start === "") return;
            newLoc.searchParams.set("s", start);
            location.href = newLoc.href;
        }));
    })();
}
if (document.querySelector(".Metadata")) {
    (function() {
        const repoName = getRepoHomePath(location.pathname);
        function getRowTitle(row) {
            return row?.querySelector(":scope > .Metadata-title")?.innerText;
        }
        function getRowCells(row) {
            return row.querySelectorAll(":scope > .Metadata-description > .Metadata-descriptionCell");
        }

        function findRowsWithTitle(rows, title) {
            return Array.from(rows).filter(i => getRowTitle(i) == title);
        }
        function findRowWithTitle(rows, title) {
            return findRowsWithTitle(rows, title)[0];
        }

        const AM_CONFIG_VERSION = 1;
        const AM_TIMEOUT_DURATION = 600;
        let amTimeout = null;
        function stopAutomashing(reason, doAlert=true) {
            const amConfig = getForCurrentSite("parentAutomashing." + repoName);
            deleteForCurrentSite("parentAutomashing." + repoName);
            clearTimeout(amTimeout);
            amTimeout = null;

            let memo = "Parent automashing for " + SITE + repoName + " stopped";
            if (reason) {
                memo += ": " + reason;
            }
            console.log("[FCH] " + memo);

            let memo2 = "";
            let noCommitsEncountered = "";
            if (amConfig && amConfig.log?.length > 0) {
                memo2 += "Encountered commits:\n" + amConfig.log.map(([i, j]) => `${i} ${j}`).join("\n");
            } else {
                noCommitsEncountered = "No commits encountered (nothing to do?)";
                memo2 += noCommitsEncountered;
            }
            console.log(memo2);

            if (doAlert) alert((memo + "\n" + noCommitsEncountered).trim());
        }
        const RELEASE_BRANCHING_COMMIT_REGEX = /^merge in (?:.+) history after reset to (?:.+)$/;

        let commit = null;
        const metadataParents = document.querySelectorAll(".Metadata");
        for (const metadataParent of metadataParents) {
            const metadata = metadataParent.querySelector(":scope > .Metadata-descriptionList");
            if (!metadata) continue;

            const nes = metadataParent.nextElementSibling;
            const metadataMessage = nes?.matches(".MetadataMessage") ? nes?.innerText : null;
            function highlightCommitterOrTaggerRow(row) {
                const cells = getRowCells(row);

                const committerEl = cells[0];
                const committerEmailMatch = committerEl.innerText.match("<([^<>]+?)>$");
                // TODO: more specific patterns to match expected committers
                if (committerEmailMatch && matchesPatterns(committerEmailMatch[1], AUTHOR_ALLOWLIST))
                    committerEl.style.backgroundColor = "var(--fch-committer-highlight-bg)";

                const refTime = new Date(getForCurrentSite("referenceTime"));
                const commitTimeEl = cells[1];
                const commitTime = new Date(commitTimeEl.innerText);
                const lesser = metadataMessage ? matchesPatterns(metadataMessage, ALERTABLE_COMMENT_MESSAGE_PATTERNS) : false;
                if (!isNaN(+commitTime) && commitTime <= refTime) {
                    // <arbitary color> or .CommitLog-item--fch-lightedUp
                    // TODO: do I use CSS for this?
                    commitTimeEl.style.backgroundColor = lesser ? "var(--fch-time-highlight-lesser-bg)" : "var(--fch-time-highlight-bg)";
                    return lesser ? "lesser" : true;
                }
            }

            const rows = metadata.querySelectorAll(":scope > .Metadata-row");
            const commitRow = findRowWithTitle(rows, "commit");
            if (getRowTitle(commitRow) == "commit") {
                const alreadyEncountered = !!commit;
                const cells = getRowCells(commitRow);

                const commitEl = cells[0];
                commit = commitEl.innerText;
                commitEl.appendChild(createCopyButtonFactory("Copy hash")(commit));

                const quickLinksContainer = cells[1];
                quickLinksContainer.appendChild(document.createTextNode(" "));

                const headLogLinkContainer = quickLinksContainer.appendChild(createElement("span"));
                headLogLinkContainer.appendChild(document.createTextNode("["));
                const headLogLink = headLogLinkContainer.appendChild(createElement("a"));
                headLogLinkContainer.appendChild(document.createTextNode("]"));

                headLogLink.innerText = "log@HEAD";
                const headLogUrl = new URL(getPathToRef(repoName, "HEAD", "log"), location.origin);
                headLogUrl.searchParams.set("s", commit);
                headLogLink.href = headLogUrl.href;

                const committerRow = findRowWithTitle(rows, "committer");
                const committerRowHighlighted = committerRow && highlightCommitterOrTaggerRow(committerRow);

                const amConfig = getForCurrentSite("parentAutomashing." + repoName);
                if (!alreadyEncountered && amConfig) {
                    const parents = findRowsWithTitle(rows, "parent");
                    const stopReasons = [
                        ["fch updated (start again)", amConfig.version != AM_CONFIG_VERSION],
                        ["wrong page (assuming you want to stop)", amConfig.tip != commit],
                        ["found commit", committerRowHighlighted],
                        ["root reached", parents.length == 0]
                    ];
                    const stopReason = stopReasons.filter(([text, cond]) => cond)[0];
                    if (stopReason) {
                        stopAutomashing(stopReason[0]);
                    } else {
                        const commitName = metadataMessage?.split("\n")[0];
                        amConfig.log.push([commit, commitName]);

                        let selectedParent = parents[0];
                        if (commitName?.match(RELEASE_BRANCHING_COMMIT_REGEX)) {
                            selectedParent = parents[1]; // use original release branch commit
                        }
                        const parentLink = getRowCells(selectedParent)?.[0].querySelector(":scope > a:first-child");
                        if (parentLink) {
                            parentLink.style.backgroundColor = "var(--fch-parentlink-bg)";
                            amConfig.tip = parentLink.innerText;
                            amTimeout = setTimeout(() => {
                                location.href = parentLink.href;
                            }, AM_TIMEOUT_DURATION);
                        } else {
                            stopAutomashing("root reached? (no parent link found)");
                        }

                        setForCurrentSite("parentAutomashing." + repoName, amConfig);
                    }
                }
            } else {
                const taggerRow = findRowWithTitle(rows, "tagger");
                if (taggerRow)
                    highlightCommitterOrTaggerRow(taggerRow);
            }
        }

        if (!commit || !document.querySelector(".TreeDetail")) return;
        const panelRight = createFloatingPanel("right");
        function addStartButton() {
            const btn = panelRight.appendChild(generateButton("Start automashing", function() {
                setForCurrentSite("parentAutomashing." + repoName, {
                    version: AM_CONFIG_VERSION,
                    tip: commit,
                    log: []
                });
                location.href = new URL(getPathToRef(repoName, commit), location.origin).href;
            }));
            return btn;
        }
        if (!getForCurrentSite("parentAutomashing." + repoName)) {
            addStartButton();
        } else {
            const list = panelRight.appendChild(createElement("ul"));
            const stopButton = addListItem(list, generateButton("Stop automashing", function() {
                stopAutomashing("user request", false);
                panelRight.replaceChildren();
                addStartButton();
            }));
            if (amTimeout) {
                const hint = addListItem(list, createElement("li"));
                hint.innerText = "Redirecting ...";
            }
        }
    })();
}
