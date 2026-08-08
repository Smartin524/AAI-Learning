(() => {
  const sectionLinks = [...document.querySelectorAll("[data-toc-section]")];
  if (!sectionLinks.length) return;

  const sections = sectionLinks.map((link) => ({
    id: link.dataset.tocSection,
    link,
    target: document.getElementById(link.dataset.tocSection),
  })).filter((section) => section.target);

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

  let frameRequested = false;
  const requestScrollSync = () => {
    if (frameRequested) return;
    frameRequested = true;
    window.requestAnimationFrame(() => {
      frameRequested = false;
      syncWithScroll();
    });
  };

  syncWithScroll();
  window.addEventListener("scroll", requestScrollSync, { passive: true });
  window.addEventListener("resize", requestScrollSync);
  window.addEventListener("hashchange", requestScrollSync);
})();
