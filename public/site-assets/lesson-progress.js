(() => {
  for (const link of document.querySelectorAll("[data-lesson-cta]")) {
    const id = link.dataset.lessonId;
    const revision = link.dataset.lessonRevision;
    if (!id || !revision) continue;
    try {
      const progress = JSON.parse(window.localStorage.getItem(`liangxiao-english:${id}:${revision}`) ?? "{}");
      if (progress.lastSentenceId || progress.completed) {
        link.textContent = "继续练习";
      }
    } catch {
      // Local storage is an enhancement, not a dependency for navigation.
    }
  }
})();
