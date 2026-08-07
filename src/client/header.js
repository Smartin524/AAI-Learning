(() => {
  const storageKey = "aai-learning-color-mode";
  const validModes = new Set(["light", "dark", "auto"]);
  const labels = {
    light: "日间模式",
    dark: "夜间模式",
    auto: "自适应模式",
  };

  const popovers = [...document.querySelectorAll("[data-popover]")];

  const closePopover = (popover) => {
    const trigger = popover.querySelector("[data-popover-trigger]");
    const panel = popover.querySelector("[data-popover-panel]");
    if (!trigger || !panel) return;
    trigger.setAttribute("aria-expanded", "false");
    panel.hidden = true;
  };

  const closeOtherPopovers = (current) => {
    popovers.forEach((popover) => {
      if (popover !== current) closePopover(popover);
    });
  };

  popovers.forEach((popover) => {
    const trigger = popover.querySelector("[data-popover-trigger]");
    const panel = popover.querySelector("[data-popover-panel]");
    if (!trigger || !panel) return;

    trigger.addEventListener("click", () => {
      const willOpen = trigger.getAttribute("aria-expanded") !== "true";
      closeOtherPopovers(popover);
      trigger.setAttribute("aria-expanded", String(willOpen));
      panel.hidden = !willOpen;
      if (willOpen) {
        const initialFocus = panel.querySelector('[aria-current="page"]')
          ?? panel.querySelector("button, a");
        initialFocus?.focus();
      }
    });

    popover.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      closePopover(popover);
      trigger.focus();
    });
  });

  document.addEventListener("click", (event) => {
    popovers.forEach((popover) => {
      if (!popover.contains(event.target)) closePopover(popover);
    });
  });

  const themeControl = document.querySelector("[data-theme-control]");
  if (!themeControl) return;

  const themeTrigger = themeControl.querySelector("[data-theme-trigger]");
  const themeOptions = [...themeControl.querySelectorAll("[data-theme-option]")];

  const setMode = (value, persist = true) => {
    const mode = validModes.has(value) ? value : "auto";
    document.documentElement.dataset.colorMode = mode;
    themeTrigger?.setAttribute("aria-label", labels[mode]);
    themeTrigger?.setAttribute("title", labels[mode]);

    themeOptions.forEach((option) => {
      const active = option.dataset.themeOption === mode;
      option.classList.toggle("active", active);
      option.setAttribute("aria-checked", String(active));
    });

    if (persist) {
      try {
        localStorage.setItem(storageKey, mode);
      } catch {
        // The selected mode still applies for the current page.
      }
    }
  };

  setMode(document.documentElement.dataset.colorMode, false);
  themeOptions.forEach((option) => {
    option.addEventListener("click", () => {
      setMode(option.dataset.themeOption);
      closePopover(themeControl);
      themeTrigger?.focus();
    });
  });
})();
