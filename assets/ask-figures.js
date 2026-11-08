/* ============================================================================
 * EC224 course AI: "Ask about this figure" on every "Predict, then see" figure.
 *
 * Loaded by the live weekN-viz.html pages (lab/predict/tools/build-live.js adds
 * the script tag) after chatbot.js and ask-widget.js. The kit itself is not
 * touched: this finds each figure root (.kfig) and adds one quiet link under the
 * figure's question and setup. The link opens the Ask popover already about that
 * figure: its number and topic, and the question it is asking right now (read at
 * click time, so "Try a new one" is followed). The student then types their own
 * question, or picks "Explain the idea" / "Give me a hint".
 *
 * Without the popover (the widget failed to load) the link opens the full page,
 * ask.html, with the figure named in the question box.
 * ==========================================================================*/
(function () {
  "use strict";
  if (window.__ec224AskFigs) return;
  window.__ec224AskFigs = true;

  function text(node) { return node ? String(node.textContent || "").replace(/\s+/g, " ").trim() : ""; }

  function figureInfo(fig) {
    var num = fig.querySelector(".fig-num");
    var topicEl = num && num.querySelector("span");
    var topic = text(topicEl);
    var number = text(num).replace(topic, "").replace(/^Figure\s*/i, "").trim();   // "8.1"
    var q = text(fig.querySelector(".q"));
    var weekM = location.pathname.match(/week(\d+)/);
    return { number: number, topic: topic, question: q, week: weekM ? weekM[1] : "" };
  }

  function contextFor(fig) {
    var f = figureInfo(fig);
    var label = "Figure " + f.number + (f.topic ? ", " + f.topic : "");
    var prompt = "I am working on Figure " + f.number + (f.topic ? " (" + f.topic + ")" : "") +
      (f.week ? " on the Week " + f.week + " visualizations page" : "") + " of EC224." +
      (f.question ? " The figure asks: \"" + f.question + "\"" : "");
    return { label: label, prompt: prompt, placeholder: "What is unclear here?" };
  }

  function addLink(fig) {
    if (fig.querySelector(".ecask-fig")) return;
    var head = fig.querySelector(".fig-head");
    if (!head) return;
    var Bot = window.EC224Bot;
    var b = document.createElement("button");
    b.type = "button";
    b.className = "ecask-fig";
    b.innerHTML = (Bot && Bot.MARK ? '<span class="ea-mark">' + Bot.MARK + "</span>" : "") + "<span>Ask about this figure</span>";
    var info = figureInfo(fig);
    b.setAttribute("aria-label", "Ask the course AI about Figure " + info.number);
    b.addEventListener("click", function (e) {
      e.stopPropagation();
      var ctx = contextFor(fig);
      if (window.EC224Ask) window.EC224Ask.open({ context: ctx, opener: b });
      else location.href = "ask.html?q=" + encodeURIComponent("About " + ctx.label + ": ");
    });
    head.appendChild(b);
  }

  function scan(root) {
    var figs = (root || document).querySelectorAll ? (root || document).querySelectorAll(".kfig") : [];
    for (var i = 0; i < figs.length; i++) addLink(figs[i]);
  }

  function start() {
    if (window.EC224Bot) window.EC224Bot.ensureCss();
    scan(document);
    // the kit mounts its figures inline at the end of <body>; watch a little longer in case one renders late
    if ("MutationObserver" in window) {
      var mo = new MutationObserver(function () { scan(document); });
      mo.observe(document.body, { subtree: true, attributes: true, attributeFilter: ["class"] });
      setTimeout(function () { mo.disconnect(); }, 8000);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
