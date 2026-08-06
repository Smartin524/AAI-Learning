((global) => {
  const config = Object.freeze({
    selector: "pre",
    defaultLanguage: "python",
    resetDelay: 1600,
  });
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

  const pythonKeywords = new Set([
    "False", "None", "True", "and", "as", "assert", "async", "await", "break",
    "class", "continue", "def", "del", "elif", "else", "except", "finally", "for",
    "from", "global", "if", "import", "in", "is", "lambda", "nonlocal", "not", "or",
    "pass", "raise", "return", "try", "while", "with", "yield",
  ]);
  const pythonBuiltins = new Set([
    "abs", "all", "any", "bool", "dict", "enumerate", "filter", "float", "int",
    "isinstance", "len", "list", "map", "max", "min", "open", "print", "range",
    "repr", "reversed", "round", "set", "sorted", "str", "sum", "tuple", "type", "zip",
  ]);
  const tokenPattern = /'''[\s\S]*?'''|"""[\s\S]*?"""|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|#[^\n]*|\$[A-Za-z_]\w*|\b(?:False|None|True|and|as|assert|async|await|break|class|continue|def|del|elif|else|except|finally|for|from|global|if|import|in|is|lambda|nonlocal|not|or|pass|raise|return|try|while|with|yield)\b|\b(?:abs|all|any|bool|dict|enumerate|filter|float|int|isinstance|len|list|map|max|min|open|print|range|repr|reversed|round|set|sorted|str|sum|tuple|type|zip)\b|\b[A-Za-z_]\w*(?=\s*\()|\b\d+(?:\.\d+)?\b|(?:==|!=|<=|>=|:=|->|\*\*|\/\/|[+\-*\/%@<>=])/g;

  const tokenType = (token) => {
    if (token.startsWith("#")) return "comment";
    if (/^['"]/.test(token)) return "string";
    if (pythonKeywords.has(token)) return "keyword";
    if (pythonBuiltins.has(token)) return "builtin";
    if (/^\$/.test(token)) return "variable";
    if (/^\d/.test(token)) return "number";
    if (/^[A-Za-z_]/.test(token)) return "function";
    return "operator";
  };

  const highlightCode = (codeBlock) => {
    const source = codeBlock.textContent;
    const language = codeBlock.dataset.language || config.defaultLanguage;

    if (language === "plain") {
      codeBlock.dataset.highlighted = "plain";
      return;
    }

    const fragment = document.createDocumentFragment();
    let cursor = 0;

    tokenPattern.lastIndex = 0;
    for (const match of source.matchAll(tokenPattern)) {
      if (match.index > cursor) fragment.append(source.slice(cursor, match.index));

      const token = document.createElement("span");
      token.className = `syntax-${tokenType(match[0])}`;
      token.textContent = match[0];
      fragment.append(token);
      cursor = match.index + match[0].length;
    }

    if (cursor < source.length) fragment.append(source.slice(cursor));
    codeBlock.replaceChildren(fragment);
    codeBlock.dataset.highlighted = "true";
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

  const enhance = (codeBlock) => {
    if (!(codeBlock instanceof HTMLElement) || codeBlock.dataset.codeEnhanced === "true") return;

    highlightCode(codeBlock);

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
      }, config.resetDelay);
    });

    codeBlock.dataset.codeEnhanced = "true";
  };

  const init = (root = document) => {
    if (root.matches?.(config.selector)) enhance(root);
    root.querySelectorAll?.(config.selector).forEach(enhance);
  };

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) init(node);
      });
    });
  });

  global.CodeBlocks = Object.freeze({ init, enhance, config });
  init();
  observer.observe(document.body, { childList: true, subtree: true });
})(window);
