(() => {
  const entries = [...document.querySelectorAll("[data-course-entry]")].map((link) => {
    const schedule = JSON.parse(link.dataset.courseEntry);
    return { link, schedule, fallback: link.getAttribute("href") };
  });
  if (!entries.length) return;

  const updateEntry = ({ link, schedule, fallback }) => {
    // Calendar days in the course timezone avoid host timezone and DST drift.
    const parts = new Intl.DateTimeFormat("en", {
      timeZone: schedule.timeZone,
      year: "numeric", month: "2-digit", day: "2-digit",
    }).formatToParts(new Date());
    const date = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
    const today = Date.UTC(Number(date.year), Number(date.month) - 1, Number(date.day));
    const start = Date.parse(`${schedule.firstWeekStart}T00:00:00Z`);
    const week = Math.floor((today - start) / (7 * 86400000)) + 1;
    const currentPage = schedule.pages.find((page) => page.week === week);
    link.setAttribute("href", currentPage?.href ?? fallback);
  };

  const updateEntries = () => entries.forEach(updateEntry);
  updateEntries();
  window.addEventListener("pageshow", updateEntries);
  window.addEventListener("focus", updateEntries);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) updateEntries();
  });
  // Refresh before native navigation (including new tabs) or TOC interception.
  ["click", "auxclick", "contextmenu"].forEach((type) => {
    document.addEventListener(type, updateEntries, { capture: true });
  });
})();
