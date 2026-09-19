(() => {
  const root = document.querySelector("[data-english-player]");
  const dataNode = document.querySelector("#english-player-data");
  if (!root || !dataNode) return;

  let lesson;
  try {
    lesson = JSON.parse(dataNode.textContent);
  } catch (error) {
    console.error("Unable to read English lesson player data", error);
    return;
  }

  const sentenceButtons = [...root.querySelectorAll("[data-play-sentence]")];
  const playAllButton = root.querySelector("[data-play-all]");
  const stopButton = root.querySelector("[data-stop]");
  const rateSelect = root.querySelector("[data-playback-rate]");
  const translationButton = root.querySelector("[data-toggle-translations]");
  const completionButton = root.querySelector("[data-mark-complete]");
  const status = root.querySelector("[data-player-status]");
  const storageKey = `liangxiao-english:${lesson.id}:${lesson.revision}`;
  const canSpeak = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
  let session = 0;
  let activeSentenceId = null;
  let selectedVoice = null;

  const readProgress = () => {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(storageKey) ?? "{}");
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  };
  let progress = readProgress();

  const saveProgress = () => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(progress));
    } catch {
      // Storage is optional. Learning can continue without it.
    }
  };

  const setStatus = (message) => {
    status.textContent = message;
  };
  const setActive = (sentenceId) => {
    activeSentenceId = sentenceId;
    for (const button of sentenceButtons) {
      const isActive = button.dataset.playSentence === sentenceId;
      button.closest(".english-sentence")?.classList.toggle("is-playing", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    }
    if (sentenceId) {
      progress.lastSentenceId = sentenceId;
      saveProgress();
    }
  };
  const applyTranslations = (visible) => {
    for (const translation of root.querySelectorAll("[data-translation]")) {
      translation.hidden = !visible;
    }
    translationButton.setAttribute("aria-pressed", String(visible));
    translationButton.textContent = visible ? "隐藏中文" : "显示中文";
    progress.showTranslations = visible;
    saveProgress();
  };
  const applyRate = (rate) => {
    const normalized = [0.8, 1, 1.2].includes(Number(rate)) ? Number(rate) : 1;
    rateSelect.value = String(normalized);
    progress.rate = normalized;
    saveProgress();
    return normalized;
  };
  const refreshVoice = () => {
    if (!canSpeak) return null;
    const voices = window.speechSynthesis.getVoices();
    selectedVoice = voices.find((voice) => /^en(?:[-_]|$)/iu.test(voice.lang)) ?? null;
    return selectedVoice;
  };
  const stop = ({ announce = true } = {}) => {
    session += 1;
    if (canSpeak) window.speechSynthesis.cancel();
    if (activeSentenceId) setActive(null);
    if (announce) setStatus("播放已停止。");
  };
  const play = (sentenceIds) => {
    if (!canSpeak) {
      setStatus("当前浏览器不支持点读。你仍然可以直接阅读和练习。" );
      return;
    }
    const voice = refreshVoice();
    if (!voice) {
      setStatus("当前设备还没有可用的英文声音。可继续阅读文本，或在系统中添加英文语音后重试。" );
      return;
    }

    const sentences = sentenceIds
      .map((id) => lesson.sentences.find((sentence) => sentence.id === id))
      .filter(Boolean);
    if (!sentences.length) return;

    stop({ announce: false });
    const currentSession = ++session;
    const rate = applyRate(rateSelect.value);
    let index = 0;
    const playNext = () => {
      if (session !== currentSession || index >= sentences.length) {
        if (session === currentSession) {
          setActive(null);
          setStatus("播放完成。" );
        }
        return;
      }
      const sentence = sentences[index];
      setActive(sentence.id);
      setStatus(`正在播放：${sentence.speaker}`);
      const utterance = new SpeechSynthesisUtterance(sentence.text);
      utterance.lang = "en-US";
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
        setStatus("播放没有完成。请重试，或继续使用文本练习。" );
      };
      window.speechSynthesis.speak(utterance);
    };
    playNext();
  };

  applyTranslations(progress.showTranslations !== false);
  applyRate(progress.rate ?? 1);
  if (progress.completed) {
    completionButton.setAttribute("aria-pressed", "true");
    completionButton.textContent = "已标记完成";
  }
  if (progress.lastSentenceId && lesson.sentences.some((sentence) => sentence.id === progress.lastSentenceId)) {
    root.querySelector(`[data-sentence-id="${progress.lastSentenceId}"]`)?.classList.add("was-last");
  }
  if (!canSpeak) {
    setStatus("当前浏览器不支持点读。你仍然可以直接阅读和练习。" );
  } else {
    refreshVoice();
    window.speechSynthesis.addEventListener?.("voiceschanged", refreshVoice);
  }

  root.addEventListener("click", (event) => {
    const sentenceButton = event.target.closest("[data-play-sentence]");
    if (sentenceButton) play([sentenceButton.dataset.playSentence]);
    if (event.target.closest("[data-play-all]")) play(lesson.sentences.map((sentence) => sentence.id));
    if (event.target.closest("[data-stop]")) stop();
    if (event.target.closest("[data-toggle-translations]")) {
      applyTranslations(translationButton.getAttribute("aria-pressed") !== "true");
    }
    if (event.target.closest("[data-mark-complete]")) {
      progress.completed = !progress.completed;
      completionButton.setAttribute("aria-pressed", String(progress.completed));
      completionButton.textContent = progress.completed ? "已标记完成" : "标记本课完成";
      saveProgress();
      setStatus(progress.completed ? "已保存为本浏览器的完成记录。" : "已取消完成标记。" );
    }
  });
  rateSelect.addEventListener("change", () => applyRate(rateSelect.value));
  window.addEventListener(
    "pagehide",
    () => {
      stop({ announce: false });
      window.speechSynthesis?.removeEventListener?.("voiceschanged", refreshVoice);
    },
    { once: true }
  );
})();
