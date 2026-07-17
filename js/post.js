// post.js — 개별 글 렌더링
// ?slug=... 로 지정된 .md 를 fetch → marked 로 HTML 변환 → DOMPurify 로 정화 → 표시.

(function () {
  "use strict";

  const statusEl = document.getElementById("article-status");
  const articleEl = document.getElementById("article");
  const bodyEl = document.getElementById("article-body");
  const titleEl = document.getElementById("article-title");
  const metaEl = document.getElementById("article-meta");

  function getSlug() {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get("slug") || "";
    // 경로 조작 방지: 영문/숫자/한글/하이픈/언더스코어만 허용
    if (!/^[\w가-힣-]+$/u.test(slug)) return "";
    return slug;
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  function showError(msg) {
    statusEl.className = "status error";
    statusEl.textContent = msg;
    statusEl.hidden = false;
    articleEl.hidden = true;
  }

  /** 표를 가로 스크롤 wrapper 로 감싸 모바일 넘침 방지 */
  function wrapTables(container) {
    container.querySelectorAll("table").forEach(function (table) {
      const wrap = document.createElement("div");
      wrap.className = "table-wrap";
      table.parentNode.insertBefore(wrap, table);
      wrap.appendChild(table);
    });
  }

  async function loadPost() {
    const slug = getSlug();
    if (!slug) {
      showError("잘못된 주소입니다. 홈에서 글을 선택해 주세요.");
      return;
    }

    try {
      // 메타데이터(제목/날짜/태그) 조회
      let meta = null;
      try {
        const metaRes = await fetch("posts/posts.json", { cache: "no-cache" });
        if (metaRes.ok) {
          const posts = await metaRes.json();
          meta = posts.find(function (p) {
            return p.slug === slug;
          });
        }
      } catch (e) {
        /* 메타 없어도 본문은 계속 시도 */
      }

      // 본문 마크다운 로드
      const res = await fetch("posts/" + encodeURIComponent(slug) + ".md", {
        cache: "no-cache",
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const markdown = await res.text();

      // 제목/메타 반영
      const title = (meta && meta.title) || slug;
      document.title = title + " — MyBlog using Claude";
      titleEl.textContent = title;

      if (meta && meta.date) {
        const time = document.createElement("time");
        time.setAttribute("datetime", meta.date);
        time.textContent = formatDate(meta.date);
        metaEl.appendChild(time);
      }

      // 마크다운 → HTML → 정화
      const rawHtml = window.marked.parse(markdown);
      const clean = window.DOMPurify.sanitize(rawHtml);
      bodyEl.innerHTML = clean;

      // 헤더에 제목을 이미 보여주므로, 본문 맨 앞의 H1은 중복이라 제거
      const firstEl = bodyEl.firstElementChild;
      if (firstEl && firstEl.tagName === "H1") {
        firstEl.remove();
      }

      wrapTables(bodyEl);

      statusEl.hidden = true;
      articleEl.hidden = false;
    } catch (err) {
      showError("글을 찾을 수 없습니다: " + slug);
      console.error(err);
    }
  }

  loadPost();
})();
