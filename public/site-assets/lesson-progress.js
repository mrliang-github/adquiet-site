(() => {
  for (const link of document.querySelectorAll("[data-lesson-cta]")) {
    const id = link.dataset.lessonId;
    const revision = link.dataset.lessonRevision;
    if (!id || !revision) continue;
    try {
      const progress = JSON.parse(window.localStorage.getItem(`liangxiao-english:${id}:${revision}`) ?? "{}");
      if (progress.completed) {
        link.textContent = "温习打卡 →";
      } else if (progress.lastSentenceId) {
        link.textContent = "继续打卡 →";
      }
    } catch {
      // Local storage is an enhancement, not a dependency for navigation.
    }
  }
})();

