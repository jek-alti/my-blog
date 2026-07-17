// main.js — 홈(글 목록) 렌더링
// posts/posts.json 을 fetch 해서 최신순으로 목록을 그린다.

(function () {
  "use strict";

  const listEl = document.getElementById("post-list");
  const statusEl = document.getElementById("list-status");

  /** "2026-07-11" 같은 날짜 문자열을 보기 좋게 포맷 */
  function formatDate(dateStr) {
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  /** 안전하게 텍스트를 넣기 위해 element 를 만들어 반환 */
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  /** 글 하나를 카드로 렌더링 */
  function renderCard(post) {
    const li = el("li", "post-card");

    const h2 = el("h2");
    const link = el("a", null, post.title || "(제목 없음)");
    link.href = "post.html?slug=" + encodeURIComponent(post.slug);
    h2.appendChild(link);
    li.appendChild(h2);

    if (post.date) {
      const meta = el("p", "post-meta");
      const time = el("time", null, formatDate(post.date));
      time.setAttribute("datetime", post.date);
      meta.appendChild(time);
      li.appendChild(meta);
    }

    if (post.summary) {
      li.appendChild(el("p", "post-summary", post.summary));
    }

    if (Array.isArray(post.tags) && post.tags.length) {
      const tags = el("ul", "tags");
      post.tags.forEach(function (t) {
        tags.appendChild(el("li", "tag", "#" + t));
      });
      li.appendChild(tags);
    }

    return li;
  }

  async function loadPosts() {
    try {
      const res = await fetch("posts/posts.json", { cache: "no-cache" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const posts = await res.json();

      if (!Array.isArray(posts) || posts.length === 0) {
        statusEl.textContent = "아직 작성된 글이 없습니다.";
        return;
      }

      // 날짜 최신순 정렬
      posts.sort(function (a, b) {
        return new Date(b.date) - new Date(a.date);
      });

      const frag = document.createDocumentFragment();
      posts.forEach(function (p) {
        frag.appendChild(renderCard(p));
      });
      listEl.appendChild(frag);
      statusEl.hidden = true;
    } catch (err) {
      statusEl.className = "status error";
      statusEl.textContent =
        "글 목록을 불러오지 못했습니다. 로컬 서버로 실행 중인지 확인하세요.";
      console.error(err);
    }
  }

  loadPosts();
})();
