(() => {
  const toc = document.querySelector(".toc");
  if (!toc) return;

  const chapterGroups = [...toc.querySelectorAll("[data-chapter-group]")];
  const chapterPaths = new Set(chapterGroups.map((group) => {
    const link = group.querySelector(".chapter-link");
    return link ? new URL(link.href, window.location.href).pathname : "";
  }));
  const chapterOrder = new Map(chapterGroups.map((group, index) => {
    const link = group.querySelector(".chapter-link");
    return [link ? new URL(link.href, window.location.href).pathname : "", index];
  }));

  let sectionLinks = [];
  let sections = [];
  let frameRequested = false;
  let navigationController;
  let renderedPath = window.location.pathname;

  const directionFor = (url) => {
    const current = chapterOrder.get(renderedPath) ?? 0;
    const next = chapterOrder.get(url.pathname) ?? current;
    return next < current ? "back" : "forward";
  };

  const setCurrentSection = (currentId) => {
    sectionLinks.forEach((link) => {
      const active = link.dataset.tocSection === currentId;
      link.classList.toggle("active", active);
      if (active) {
        link.setAttribute("aria-current", "location");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  };

  const refreshSections = () => {
    const activeGroup = toc.querySelector(".chapter-group.active");
    sectionLinks = activeGroup
      ? [...activeGroup.querySelectorAll("[data-toc-section]")]
      : [];
    sections = sectionLinks.map((link) => ({
      id: link.dataset.tocSection,
      target: document.getElementById(link.dataset.tocSection),
    })).filter((section) => section.target);
  };

  const syncWithScroll = () => {
    const readingLine = 96;
    let currentId = sections[0]?.id ?? "";

    for (const section of sections) {
      if (section.target.getBoundingClientRect().top > readingLine) break;
      currentId = section.id;
    }

    const atPageEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    if (atPageEnd && sections.length) currentId = sections.at(-1).id;
    setCurrentSection(currentId);
  };

  const requestScrollSync = () => {
    if (frameRequested) return;
    frameRequested = true;
    window.requestAnimationFrame(() => {
      frameRequested = false;
      syncWithScroll();
    });
  };

  const goToSection = (url, updateHistory = true) => {
    const targetId = url.hash.slice(1);
    const target = targetId ? document.getElementById(targetId) : null;
    if (!target) return false;

    if (updateHistory) window.history.pushState({ chapter: url.pathname }, "", url);
    const alignTarget = () => {
      target.scrollIntoView({ behavior: "auto", block: "start" });
      setCurrentSection(targetId);
      requestScrollSync();
    };

    alignTarget();
    // Browsers can restore a stale scroll position after popstate; align once
    // more on the next frame so backward/forward navigation lands consistently.
    window.requestAnimationFrame(alignTarget);
    return true;
  };

  const activateChapter = (url) => {
    chapterGroups.forEach((group) => {
      const link = group.querySelector(".chapter-link");
      const subnav = group.querySelector(".chapter-subnav");
      const active = link && new URL(link.href, window.location.href).pathname === url.pathname;

      group.classList.toggle("active", active);
      link?.classList.toggle("active", active);
      if (active) {
        link?.setAttribute("aria-current", "page");
        subnav?.removeAttribute("aria-hidden");
        subnav?.removeAttribute("inert");
      } else {
        link?.removeAttribute("aria-current");
        subnav?.setAttribute("aria-hidden", "true");
        subnav?.setAttribute("inert", "");
        subnav?.querySelectorAll("[data-toc-section]").forEach((sectionLink) => {
          sectionLink.classList.remove("active");
          sectionLink.removeAttribute("aria-current");
        });
      }
    });
  };

  const loadWithFrame = (url, signal) => new Promise((resolve, reject) => {
    const frame = document.createElement("iframe");
    frame.hidden = true;
    frame.setAttribute("sandbox", "allow-same-origin");

    const cleanup = () => frame.remove();
    const abort = () => {
      cleanup();
      reject(new DOMException("Navigation aborted", "AbortError"));
    };

    signal.addEventListener("abort", abort, { once: true });
    frame.addEventListener("error", () => {
      cleanup();
      reject(new Error("Unable to load chapter"));
    }, { once: true });
    frame.addEventListener("load", () => {
      try {
        const html = frame.contentDocument?.documentElement.outerHTML;
        if (!html) throw new Error("Chapter document is unavailable");
        cleanup();
        resolve(new DOMParser().parseFromString(html, "text/html"));
      } catch (error) {
        cleanup();
        reject(error);
      }
    }, { once: true });
    frame.src = url.href;
    document.body.appendChild(frame);
  });

  const loadDocument = async (url, signal) => {
    if (url.protocol === "file:") return loadWithFrame(url, signal);
    const response = await fetch(url, { signal, credentials: "same-origin" });
    if (!response.ok) throw new Error(`Unable to load chapter: ${response.status}`);
    return new DOMParser().parseFromString(await response.text(), "text/html");
  };

  // Keep fetched documents immutable: each navigation receives a fresh clone.
  // In-flight requests are shared by preloading and clicks, so cancelling a
  // navigation must not cancel a request another navigation may still need.
  const documents = new Map();
  const pendingDocuments = new Map();
  const documentKey = (url) => `${url.origin}${url.pathname}${url.search}`;
  documents.set(documentKey(new URL(window.location.href)), document.cloneNode(true));

  const getDocument = (url, signal) => {
    if (url.protocol === "file:") return loadDocument(url, signal);
    const key = documentKey(url);
    if (documents.has(key)) return Promise.resolve(documents.get(key).cloneNode(true));
    if (!pendingDocuments.has(key)) {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 15000);
      const request = loadDocument(url, controller.signal).then((nextDocument) => {
        if (!nextDocument.querySelector(".chapter") ||
            nextDocument.body.dataset.courseId !== document.body.dataset.courseId) {
          throw new Error("Chapter document does not match the current course");
        }
        documents.set(key, nextDocument);
        return nextDocument;
      }).finally(() => {
        window.clearTimeout(timeout);
        pendingDocuments.delete(key);
      });
      pendingDocuments.set(key, request);
    }
    return pendingDocuments.get(key).then((nextDocument) => nextDocument.cloneNode(true));
  };

  const preloadChapters = () => {
    if (!/^https?:$/.test(window.location.protocol)) return;
    const currentIndex = chapterOrder.get(renderedPath) ?? 0;
    const queue = [...chapterPaths]
      .filter((pathname) => pathname && pathname !== renderedPath)
      .sort((a, b) => Math.abs(chapterOrder.get(a) - currentIndex) - Math.abs(chapterOrder.get(b) - currentIndex));
    const worker = async () => {
      while (queue.length) {
        const url = new URL(queue.shift(), window.location.href);
        try {
          await getDocument(url);
        } catch {
          // A failed speculative request is retried by a later click.
        }
      }
    };
    // Two workers bound background network traffic; adjacent chapters go first.
    void worker();
    void worker();
  };

  const schedulePreload = () => {
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(preloadChapters, { timeout: 2000 });
    } else {
      window.setTimeout(preloadChapters, 200);
    }
  };
  if (document.readyState === "complete") schedulePreload();
  else window.addEventListener("load", schedulePreload, { once: true });

  const swapChapter = (nextDocument, url, updateHistory) => {
    const currentChapter = document.querySelector(".chapter");
    const nextChapter = nextDocument.querySelector(".chapter");
    const nextCourseId = nextDocument.body.dataset.courseId;
    if (!currentChapter || !nextChapter || nextCourseId !== document.body.dataset.courseId) {
      throw new Error("Chapter document does not match the current course");
    }

    const direction = directionFor(url);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // The chapter menu must remain live while it expands and collapses. A
    // document-level View Transition snapshots it, turning the menu into a
    // hard cut, so use a small Web Animations transition for the content.
    activateChapter(url);
    // Commit immediately: waiting for an exit animation delays feedback and
    // allows an older navigation to finish after a newer click.
    currentChapter.getAnimations().forEach((animation) => animation.cancel());
    currentChapter.replaceWith(nextChapter);
    if (!reducedMotion) {
      nextChapter.animate(
        [{ opacity: 0.65, transform: `translateX(${direction === "forward" ? 6 : -6}px)` }, { opacity: 1, transform: "translateX(0)" }],
        { duration: 120, easing: "cubic-bezier(0, 0, .2, 1)" },
      );
    }

    document.title = nextDocument.title || document.title;
    renderedPath = url.pathname;
    if (updateHistory) window.history.pushState({ chapter: url.pathname }, "", url);

    refreshSections();
    if (!goToSection(url, false)) {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
    requestScrollSync();
    document.dispatchEvent(new CustomEvent("aai:navigation"));
  };

  const navigate = async (url, updateHistory = true) => {
    navigationController?.abort();
    const controller = new AbortController();
    navigationController = controller;
    try {
      const nextDocument = await getDocument(url, controller.signal);
      if (controller.signal.aborted) return;
      swapChapter(nextDocument, url, updateHistory);
    } catch (error) {
      if (controller.signal.aborted) return;
      window.location.assign(url.href);
    }
  };

  document.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest("a[href]");
    if (!link) return;

    const url = new URL(link.href, window.location.href);
    if (url.origin !== window.location.origin || !chapterPaths.has(url.pathname)) return;
    event.preventDefault();
    if (url.pathname === window.location.pathname) {
      navigationController?.abort();
      if (url.hash && goToSection(url)) return;
      window.history.pushState({ chapter: url.pathname }, "", url);
      window.scrollTo({ top: 0, behavior: "auto" });
      requestScrollSync();
      return;
    }
    navigate(url);
  });

  window.addEventListener("popstate", () => {
    const url = new URL(window.location.href);
    if (!chapterPaths.has(url.pathname)) return;
    if (url.pathname === renderedPath && url.hash) {
      goToSection(url, false);
      return;
    }
    navigate(url, false);
  });
  window.addEventListener("scroll", requestScrollSync, { passive: true });
  window.addEventListener("resize", requestScrollSync);
  window.addEventListener("hashchange", requestScrollSync);

  refreshSections();
  const initialUrl = new URL(window.location.href);
  if (!initialUrl.hash || !goToSection(initialUrl, false)) syncWithScroll();
})();
