export const Modal = (() => {
  const TUTORIAL = [
    {
      title: "Welcome \u2615",
      tag: "Tutorial 1/3",
      text: "People line up for drinks.\n\nGoal: serve enough people before time runs out.\n\nYou start with weak settings \u2014 you MUST adjust the sliders to win!",
    },
    {
      title: "Two levers (for now)",
      tag: "Tutorial 2/3",
      text: "Baristas = how many drinks you can make at once (compute).\nPantry speed = how fast ingredients reach baristas (bandwidth).\n\nIf baristas say \u201Cwaiting\u201D\u2026 the pantry is too slow!",
    },
    {
      title: "Play it like a game",
      tag: "Tutorial 3/3",
      text: "Adjust sliders, hit GO, and try to hit the goal.\n\nLater levels unlock new knobs with real trade-offs.\n\nCan you beat all four levels?",
    },
  ];

  function mount(ui) {
    let mode = "tutorial";
    let idx = 0;
    let clearPayload = null;
    let losePayload = null;

    function showOverlay() {
      ui.overlay.style.display = "flex";
      ui.overlay.setAttribute("aria-hidden", "false");
    }
    function hideOverlay() {
      ui.overlay.style.display = "none";
      ui.overlay.setAttribute("aria-hidden", "true");
    }

    function renderTutorial() {
      const s = TUTORIAL[idx];
      ui.mTag.textContent = s.tag;
      ui.mTitle.textContent = s.title;
      ui.mText.textContent = s.text;
      ui.mNerd.style.display = "none";
      ui.mExtra.style.display = "none";
      ui.mExtra.innerHTML = "";

      ui.mBack.style.display = "";
      ui.mBack.disabled = idx === 0;
      ui.mNext.textContent = idx === TUTORIAL.length - 1 ? "Done" : "Next \u27A1";
    }

    function renderClear() {
      ui.mTag.textContent = "LEVEL CLEAR! \uD83C\uDF89";
      ui.mTitle.textContent = clearPayload?.title || "Nice!";
      ui.mText.textContent = clearPayload?.text || "You cleared the level.";

      if (clearPayload?.hoverHint) {
        ui.mNerd.style.display = "block";
        ui.mNerd.textContent = clearPayload.hoverHint;
      } else {
        ui.mNerd.style.display = "none";
      }

      if (clearPayload?.extraHtml) {
        ui.mExtra.style.display = "block";
        ui.mExtra.innerHTML = clearPayload.extraHtml;
      } else {
        ui.mExtra.style.display = "none";
        ui.mExtra.innerHTML = "";
      }

      ui.mBack.style.display = "none";
      ui.mNext.textContent = clearPayload?.nextLabel || "Next level \u27A1";
    }

    function renderLose() {
      ui.mTag.textContent = losePayload?.tag || "\u23F1 TIME\u2019S UP";
      ui.mTitle.textContent = losePayload?.title || "Not enough drinks!";
      ui.mText.textContent = losePayload?.text || "Try adjusting your sliders and try again.";

      if (losePayload?.hoverHint) {
        ui.mNerd.style.display = "block";
        ui.mNerd.textContent = losePayload.hoverHint;
      } else {
        ui.mNerd.style.display = "none";
      }

      if (losePayload?.extraHtml) {
        ui.mExtra.style.display = "block";
        ui.mExtra.innerHTML = losePayload.extraHtml;
      } else {
        ui.mExtra.style.display = "none";
        ui.mExtra.innerHTML = "";
      }

      ui.mBack.style.display = "none";
      ui.mNext.textContent = losePayload?.nextLabel || "Try Again";
    }

    function openTutorial() {
      mode = "tutorial";
      idx = 0;
      renderTutorial();
      showOverlay();
    }

    function openClear(payload) {
      mode = "clear";
      clearPayload = payload;
      renderClear();
      showOverlay();
    }

    function openLose(payload) {
      mode = "lose";
      losePayload = payload;
      renderLose();
      showOverlay();
    }

    ui.btnHelp.addEventListener("click", openTutorial);
    ui.mClose.addEventListener("click", hideOverlay);
    ui.overlay.addEventListener("click", (e) => {
      if (e.target !== ui.overlay) return;
      // Don't dismiss win/level-clear or lose modals by clicking outside — only tutorial
      if (mode === "clear" || mode === "lose") return;
      hideOverlay();
    });

    ui.mBack.addEventListener("click", () => {
      if (mode !== "tutorial") return;
      idx = Math.max(0, idx - 1);
      renderTutorial();
    });

    ui.mNext.addEventListener("click", () => {
      if (mode === "tutorial") {
        if (idx < TUTORIAL.length - 1) {
          idx++;
          renderTutorial();
        } else hideOverlay();
        return;
      }
      if (mode === "lose") {
        hideOverlay();
        losePayload?.onNext?.();
        return;
      }
      hideOverlay();
      clearPayload?.onNext?.();
    });

    return { openTutorial, openClear, openLose, hideOverlay };
  }

  return { mount };
})();
