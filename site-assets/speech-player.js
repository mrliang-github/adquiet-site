(() => {
  const root = document.querySelector("[data-english-player]");
  const dataNode = document.querySelector("#english-player-data");
  if (!root || !dataNode) return;

  let lesson;
  try { lesson = JSON.parse(dataNode.textContent); } catch { return; }
  const sentenceButtons = [...root.querySelectorAll("[data-play-sentence]")];
  const rateSelect = root.querySelector("[data-playback-rate]");
  const voiceSelect = root.querySelector("[data-voice]");
  const translationButton = root.querySelector("[data-toggle-translations]");
  const completionButton = root.querySelector("[data-mark-complete]");
  const status = root.querySelector("[data-player-status]");
  if (!rateSelect || !translationButton || !completionButton || !status) return;
  status.classList.remove("hidden");
  status.setAttribute("aria-live", "polite");

  const storageKey = `liangxiao-english:${lesson.id}:${lesson.revision}`;
  const canSpeak = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
  let session = 0;
  let activeSentenceId = null;
  let selectedVoice = null;
  let progress = {};
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) ?? "{}");
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) progress = parsed;
  } catch { /* Progress is optional. */ }

  const saveProgress = () => {
    try { localStorage.setItem(storageKey, JSON.stringify(progress)); } catch { /* Reading remains available. */ }
  };
  const setStatus = (message) => { status.textContent = message; };
  const getSentence = (id) => {
    const sentence = lesson.sentences.find((item) => item.id === id);
    if (sentence) return sentence;
    if (id === "answer") {
      const answer = root.querySelector("#answer-block .en-line");
      if (answer) return { id, speaker: "You", text: answer.textContent.trim() };
    }
    return null;
  };
  const setActive = (id) => {
    activeSentenceId = id;
    for (const button of sentenceButtons) {
      const active = button.dataset.playSentence === id;
      button.closest(".english-sentence")?.classList.toggle("is-playing", active);
      button.classList.toggle("playing", active);
      button.setAttribute("aria-pressed", String(active));
    }
    if (lesson.sentences.some((sentence) => sentence.id === id)) {
      progress.lastSentenceId = id;
      saveProgress();
    }
  };
  const applyTranslations = (visible) => {
    for (const translation of root.querySelectorAll("[data-translation]")) {
      translation.hidden = !visible;
      translation.classList.toggle("hidden", !visible);
    }
    translationButton.setAttribute("aria-pressed", String(visible));
    translationButton.textContent = visible ? "隐藏中文" : "显示中文";
    progress.showTranslations = visible;
    saveProgress();
  };
  const applyRate = (rate) => {
    const available = [...rateSelect.options].map((option) => Number(option.value));
    const normalized = available.includes(Number(rate)) ? Number(rate) : 1;
    rateSelect.value = String(normalized);
    progress.rate = normalized;
    saveProgress();
    return normalized;
  };
  const refreshVoice = () => {
    if (!canSpeak) return null;
    const voices = speechSynthesis.getVoices().filter((voice) => /^en(?:[-_]|$)/iu.test(voice.lang));
    const requested = voiceSelect?.value || progress.voiceURI;
    selectedVoice = voices.find((voice) => voice.voiceURI === requested) ?? voices[0] ?? null;
    if (voiceSelect) {
      voiceSelect.replaceChildren();
      for (const voice of voices) {
        const option = document.createElement("option");
        option.value = voice.voiceURI;
        option.textContent = `${voice.name} (${voice.lang})`;
        voiceSelect.append(option);
      }
      if (selectedVoice) voiceSelect.value = selectedVoice.voiceURI;
      else {
        const option = document.createElement("option");
        option.textContent = "暂无英文声音";
        voiceSelect.append(option);
      }
    }
    return selectedVoice;
  };
  const stop = ({ announce = true } = {}) => {
    session += 1;
    if (canSpeak) speechSynthesis.cancel();
    setActive(null);
    if (announce) setStatus("播放已停止。");
  };
  const play = (ids) => {
    if (!canSpeak) return setStatus("当前浏览器不支持点读。你仍然可以直接阅读和练习。");
    const voice = refreshVoice();
    if (!voice) return setStatus("当前设备还没有可用的英文声音。可继续阅读文本，或在系统中添加英文语音后重试。");
    const sentences = ids.map(getSentence).filter(Boolean);
    if (!sentences.length) return;
    stop({ announce: false });
    const currentSession = ++session;
    const rate = applyRate(rateSelect.value);
    let index = 0;
    const playNext = () => {
      if (session !== currentSession) return;
      if (index === sentences.length) {
        setActive(null);
        setStatus("播放完成。");
        return;
      }
      const sentence = sentences[index];
      setActive(sentence.id);
      setStatus(`正在播放：${sentence.speaker}`);
      const utterance = new SpeechSynthesisUtterance(sentence.text);
      utterance.lang = voice.lang || "en-US";
      utterance.rate = rate;
      utterance.voice = voice;
      utterance.onend = () => {
        if (session !== currentSession) return;
        index += 1;
        playNext();
      };
      utterance.onerror = () => {
        if (session !== currentSession) return;
        setActive(null);
        setStatus("播放没有完成。请重试，或继续使用文本练习。");
      };
      speechSynthesis.speak(utterance);
    };
    playNext();
  };

  applyTranslations(progress.showTranslations ?? root.dataset.translationsDefault !== "hidden");
  applyRate(progress.rate ?? 1);
  completionButton.setAttribute("aria-pressed", String(Boolean(progress.completed)));
  completionButton.textContent = progress.completed ? "已标记完成" : "标记本课完成";
  if (progress.lastSentenceId && getSentence(progress.lastSentenceId)) {
    root.querySelector(`[data-sentence-id="${progress.lastSentenceId}"]`)?.classList.add("was-last");
  }
  if (canSpeak) {
    refreshVoice();
    speechSynthesis.addEventListener?.("voiceschanged", refreshVoice);
    setStatus("点击任一句开始点读。");
  } else setStatus("当前浏览器不支持点读。你仍然可以直接阅读和练习。");

  root.addEventListener("click", (event) => {
    const button = event.target.closest("[data-play-sentence]");
    if (button) play([button.dataset.playSentence]);
    if (event.target.closest("[data-play-all]")) play(lesson.sentences.map((sentence) => sentence.id));
    if (event.target.closest("[data-stop]")) stop();
    if (event.target.closest("[data-toggle-translations]")) applyTranslations(translationButton.getAttribute("aria-pressed") !== "true");
    if (event.target.closest("[data-toggle-setup]")) {
      const setupButton = root.querySelector("[data-toggle-setup]");
      const visible = setupButton.getAttribute("aria-pressed") !== "true";
      for (const paragraph of root.querySelectorAll(".setup .cn")) {
        paragraph.hidden = !visible;
        paragraph.classList.toggle("hidden", !visible);
      }
      setupButton.setAttribute("aria-pressed", String(visible));
      setupButton.textContent = visible ? "隐藏中文" : "显示中文";
    }
    if (event.target.closest("[data-show-answer]")) {
      const answer = root.querySelector("#answer-block");
      const visible = answer.classList.contains("hidden");
      answer.classList.toggle("hidden", !visible);
      root.querySelector("[data-show-answer]").textContent = visible ? "隐藏参考答案" : "显示参考答案";
    }
    if (event.target.closest("[data-blind-listen]")) {
      document.body.classList.add("blind");
      root.querySelector("[data-blind-listen]").classList.add("hidden");
      root.querySelector("[data-exit-blind]").classList.remove("hidden");
      play(lesson.sentences.map((sentence) => sentence.id));
    }
    if (event.target.closest("[data-exit-blind]")) {
      document.body.classList.remove("blind");
      root.querySelector("[data-blind-listen]").classList.remove("hidden");
      root.querySelector("[data-exit-blind]").classList.add("hidden");
      stop();
    }
    if (event.target.closest("[data-mark-complete]")) {
      progress.completed = !progress.completed;
      completionButton.setAttribute("aria-pressed", String(progress.completed));
      completionButton.textContent = progress.completed ? "已标记完成" : "标记本课完成";
      saveProgress();
      setStatus(progress.completed ? "已保存为本浏览器的完成记录。" : "已取消完成标记。");
    }
  });
  rateSelect.addEventListener("change", () => applyRate(rateSelect.value));
  voiceSelect?.addEventListener("change", () => {
    progress.voiceURI = voiceSelect.value;
    saveProgress();
    refreshVoice();
  });
  window.addEventListener("pagehide", () => {
    stop({ announce: false });
    document.body.classList.remove("blind");
    window.speechSynthesis?.removeEventListener?.("voiceschanged", refreshVoice);
  }, { once: true });
})();
