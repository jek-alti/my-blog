// theme.js — 다크모드 토글 + localStorage 저장/복원
// 초기 테마 적용(FOUC 방지)은 각 HTML <head> 안 인라인 스크립트에서 먼저 처리한다.
// 이 파일은 토글 버튼의 동작만 담당한다.

(function () {
  "use strict";

  const STORAGE_KEY = "theme";

  /** 현재 적용된 테마를 반환 ("light" | "dark") */
  function currentTheme() {
    return document.documentElement.getAttribute("data-theme") === "dark"
      ? "dark"
      : "light";
  }

  /** 테마를 적용하고 저장한다. */
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (e) {
      /* localStorage 사용 불가 환경은 무시 */
    }
    const btn = document.querySelector(".theme-toggle");
    if (btn) {
      btn.setAttribute(
        "aria-label",
        theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"
      );
    }
  }

  function init() {
    const btn = document.querySelector(".theme-toggle");
    if (!btn) return;
    // 초기 aria-label 세팅
    applyTheme(currentTheme());
    btn.addEventListener("click", function () {
      applyTheme(currentTheme() === "dark" ? "light" : "dark");
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
