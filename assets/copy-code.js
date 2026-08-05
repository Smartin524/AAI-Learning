(() => {
  const copyText = async (text) => {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();

    if (!copied) throw new Error("Copy command failed");
  };

  document.querySelectorAll("pre").forEach((codeBlock) => {
    if (codeBlock.closest(".code-block")) return;

    const wrapper = document.createElement("div");
    wrapper.className = "code-block";
    codeBlock.parentNode.insertBefore(wrapper, codeBlock);
    wrapper.appendChild(codeBlock);

    const button = document.createElement("button");
    button.className = "copy-code-button";
    button.type = "button";
    button.setAttribute("aria-label", "复制代码");
    button.textContent = "复制";
    wrapper.appendChild(button);

    let resetTimer;
    button.addEventListener("click", async () => {
      window.clearTimeout(resetTimer);
      try {
        await copyText(codeBlock.textContent);
        button.textContent = "已复制";
        button.classList.add("is-copied");
      } catch {
        button.textContent = "复制失败";
      }

      resetTimer = window.setTimeout(() => {
        button.textContent = "复制";
        button.classList.remove("is-copied");
      }, 1600);
    });
  });
})();
