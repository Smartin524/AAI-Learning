(() => {
  const storageKey = "aai-learning-color-mode";
  const validModes = new Set(["light", "dark", "auto"]);

  let savedMode = "auto";
  try {
    const value = localStorage.getItem(storageKey);
    if (validModes.has(value)) savedMode = value;
  } catch {
    // Storage can be unavailable in private browsing or strict file contexts.
  }

  document.documentElement.dataset.colorMode = savedMode;
})();
