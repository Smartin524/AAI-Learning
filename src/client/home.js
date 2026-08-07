(() => {
  const openings = [
    "进入正题吧", "回到问题本身", "从事实开始", "先看证据", "继续求解",
    "尚待论证", "保留怀疑", "从已知出发", "不预设答案", "先厘清概念",
    "结论以后再说", "让材料说话", "问题仍在这里", "不妨推演下去", "先把问题问对",
    "已知并不等于理解", "理解始于区分", "复杂性不可省略", "对答案保持警惕", "不急于得出结论",
    "暂且相信证据", "继续修正认知", "一切仍可重审", "向下追问", "所知有限",
    "今日亦有未知", "学然后知不足", "知止而后有定", "切莫空悲切", "路尚未尽",
    "此处并无捷径", "所见只是局部", "再往深处看", "不要满足于表象", "答案未必唯一",
    "定义决定讨论", "先区分，再判断", "事实先于解释", "解释仍需验证", "直觉不足为据",
    "共识并非证明", "相关不等于因果", "例外同样重要", "细节决定边界", "边界决定结论",
    "把假设写清楚", "把问题拆开来看", "未知值得保留", "今日继续积累", "勿以空谈代替思考"
  ];
  const heading = document.querySelector("[data-opening]");
  if (!heading) return;

  const previous = sessionStorage.getItem("aai-learning-last-opening");
  const candidates = openings.filter((opening) => opening !== previous);
  const opening = candidates[Math.floor(Math.random() * candidates.length)];
  sessionStorage.setItem("aai-learning-last-opening", opening);

  const render = (text) => {
    heading.textContent = text;
    const period = document.createElement("span");
    period.className = "opening-period";
    period.textContent = "。";
    heading.append(period);
  };

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    render(opening);
    return;
  }

  heading.textContent = "";
  heading.classList.add("is-typing");
  let index = 0;
  const typeNext = () => {
    if (index < opening.length) {
      heading.textContent += opening[index];
      index += 1;
      window.setTimeout(typeNext, 68 + Math.random() * 42);
      return;
    }
    render(opening);
    heading.classList.remove("is-typing");
  };
  window.setTimeout(typeNext, 260);
})();
