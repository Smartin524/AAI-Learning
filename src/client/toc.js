(() => {
  const sectionLinks = [...document.querySelectorAll("[data-toc-section]")];
  if (!sectionLinks.length) return;

  const updateCurrentSection = () => {
    const currentId = window.location.hash.slice(1);
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

  updateCurrentSection();
  window.addEventListener("hashchange", updateCurrentSection);
})();
