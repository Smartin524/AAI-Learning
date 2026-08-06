(() => {
  const icons = {
    copy: [
      ["rect", { x: "9", y: "9", width: "11", height: "11", rx: "2" }],
      ["path", { d: "M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3" }],
    ],
    check: [["path", { d: "m5 12 4 4L19 6" }]],
    error: [
      ["path", { d: "M12 8v5" }],
      ["path", { d: "M12 17h.01" }],
      ["circle", { cx: "12", cy: "12", r: "9" }],
    ],
  };

  const setButtonContent = (button, label, iconName) => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");

    icons[iconName].forEach(([tag, attributes]) => {
      const shape = document.createElementNS("http://www.w3.org/2000/svg", tag);
      Object.entries(attributes).forEach(([name, value]) => shape.setAttribute(name, value));
      svg.appendChild(shape);
    });

    const text = document.createElement("span");
    text.textContent = label;
    button.replaceChildren(svg, text);
  };

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
    setButtonContent(button, "复制", "copy");
    wrapper.appendChild(button);

    let resetTimer;
    button.addEventListener("click", async () => {
      window.clearTimeout(resetTimer);
      try {
        await copyText(codeBlock.textContent);
        button.setAttribute("aria-label", "代码已复制");
        setButtonContent(button, "已复制", "check");
        button.classList.add("is-copied");
      } catch {
        button.setAttribute("aria-label", "复制失败");
        setButtonContent(button, "复制失败", "error");
      }

      resetTimer = window.setTimeout(() => {
        button.setAttribute("aria-label", "复制代码");
        setButtonContent(button, "复制", "copy");
        button.classList.remove("is-copied");
      }, 1600);
    });
  });
})();
