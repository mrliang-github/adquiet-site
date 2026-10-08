(() => {
  const preferenceKey = "heatsleuth-language";
  const currentLanguage = document.documentElement.lang;
  const queryLanguage = new URLSearchParams(window.location.search).get("lang");

  for (const control of document.querySelectorAll("[data-language-choice]")) {
    control.addEventListener("click", () => {
      window.localStorage.setItem(preferenceKey, control.dataset.languageChoice);
    });
  }

  if (queryLanguage === "en" || queryLanguage === "zh") {
    window.localStorage.setItem(preferenceKey, queryLanguage);
  }

  if (currentLanguage !== "en") {
    return;
  }

  const preferredLanguage = window.localStorage.getItem(preferenceKey);
  const browserLanguages = navigator.languages || [navigator.language || ""];
  const browserPrefersChinese = browserLanguages.some((language) =>
    language.toLowerCase().startsWith("zh")
  );

  if (!queryLanguage && preferredLanguage !== "en" && (preferredLanguage === "zh" || browserPrefersChinese)) {
    window.location.replace("/heatsleuth/zh/");
  }
})();
