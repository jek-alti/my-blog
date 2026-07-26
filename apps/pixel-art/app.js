(function () {
  "use strict";

  var GRID_SIZE = 16;
  var DOT_PX = 20; // 320 / 16
  var STORAGE_KEY = "pixel-art-data";
  var COLOR_RE = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i; // 유효 hex(3·4·6·8자리)만 허용

  var PALETTE = [
    "#000000", "#ffffff", "#7f8c8d", "#bdc3c7",
    "#e74c3c", "#e67e22", "#f1c40f", "#2ecc71",
    "#1abc9c", "#3498db", "#2980b9", "#9b59b6",
    "#8e44ad", "#e84393", "#d35400", "#795548"
  ];

  // 상태: 각 셀의 색(null = 빈 칸)
  var cells = new Array(GRID_SIZE * GRID_SIZE).fill(null);
  var currentColor = "#ff4d4d";
  var eraserOn = false;
  var isDrawing = false;
  var cursor = 0; // 키보드 격자 커서 위치

  var gridEl = document.getElementById("grid");
  var paletteEl = document.getElementById("palette");
  var colorPicker = document.getElementById("colorPicker");
  var currentSwatch = document.getElementById("currentSwatch");
  var currentColorText = document.getElementById("currentColorText");
  var eraserBtn = document.getElementById("eraserBtn");
  var clearBtn = document.getElementById("clearBtn");
  var saveBtn = document.getElementById("saveBtn");
  var exportCanvas = document.getElementById("exportCanvas");

  var cellEls = [];

  // ---- 렌더링 ----
  function buildGrid() {
    var frag = document.createDocumentFragment();
    for (var i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
      var cell = document.createElement("div");
      cell.className = "cell";
      cell.setAttribute("role", "gridcell");
      cell.tabIndex = i === 0 ? 0 : -1; // 로빙 tabindex: 격자 진입점 1개
      cell.dataset.index = String(i);
      frag.appendChild(cell);
      cellEls.push(cell);
    }
    gridEl.appendChild(frag);
  }

  function paintCellDom(index) {
    var color = cells[index];
    cellEls[index].style.background = color ? color : "";
  }

  function renderAll() {
    for (var i = 0; i < cells.length; i++) {
      paintCellDom(i);
    }
  }

  // ---- 그리기 ----
  function applyToCell(index) {
    if (index == null || index < 0 || index >= cells.length) return;
    var newColor = eraserOn ? null : currentColor;
    if (cells[index] === newColor) return;
    cells[index] = newColor;
    paintCellDom(index);
    save();
  }

  function indexFromPoint(clientX, clientY) {
    var el = document.elementFromPoint(clientX, clientY);
    if (!el || !el.classList || !el.classList.contains("cell")) return null;
    return parseInt(el.dataset.index, 10);
  }

  // 마우스 이벤트
  gridEl.addEventListener("mousedown", function (e) {
    if (e.button !== 0) return;
    e.preventDefault();
    isDrawing = true;
    var target = e.target;
    if (target.classList.contains("cell")) {
      applyToCell(parseInt(target.dataset.index, 10));
    }
  });

  gridEl.addEventListener("mouseover", function (e) {
    if (!isDrawing) return;
    var target = e.target;
    if (target.classList.contains("cell")) {
      applyToCell(parseInt(target.dataset.index, 10));
    }
  });

  window.addEventListener("mouseup", function () {
    isDrawing = false;
  });

  // 터치 이벤트
  gridEl.addEventListener("touchstart", function (e) {
    e.preventDefault();
    isDrawing = true;
    var t = e.touches[0];
    applyToCell(indexFromPoint(t.clientX, t.clientY));
  }, { passive: false });

  gridEl.addEventListener("touchmove", function (e) {
    if (!isDrawing) return;
    e.preventDefault();
    var t = e.touches[0];
    applyToCell(indexFromPoint(t.clientX, t.clientY));
  }, { passive: false });

  function stopDrawing() {
    isDrawing = false;
  }
  window.addEventListener("touchend", stopDrawing);
  window.addEventListener("touchcancel", stopDrawing); // 터치 취소 시에도 해제
  window.addEventListener("blur", stopDrawing); // 창 포커스 잃으면 해제

  // 드래그 이미지 방지
  gridEl.addEventListener("dragstart", function (e) {
    e.preventDefault();
  });

  // ---- 키보드 조작 (접근성) ----
  // Tab으로 격자 진입 → 방향키로 커서 이동 → Enter/Space로 현재 칸 칠하기
  function moveCursor(next) {
    if (next < 0 || next >= cells.length) return;
    cellEls[cursor].tabIndex = -1;
    cursor = next;
    cellEls[cursor].tabIndex = 0;
    cellEls[cursor].focus();
  }

  gridEl.addEventListener("focusin", function (e) {
    var t = e.target;
    if (t && t.dataset && t.dataset.index != null) {
      cursor = parseInt(t.dataset.index, 10);
    }
  });

  gridEl.addEventListener("keydown", function (e) {
    var row = Math.floor(cursor / GRID_SIZE);
    var col = cursor % GRID_SIZE;
    var handled = true;
    switch (e.key) {
      case "ArrowUp": if (row > 0) moveCursor(cursor - GRID_SIZE); break;
      case "ArrowDown": if (row < GRID_SIZE - 1) moveCursor(cursor + GRID_SIZE); break;
      case "ArrowLeft": if (col > 0) moveCursor(cursor - 1); break;
      case "ArrowRight": if (col < GRID_SIZE - 1) moveCursor(cursor + 1); break;
      case "Enter":
      case " ": applyToCell(cursor); break;
      default: handled = false;
    }
    if (handled) e.preventDefault();
  });

  // 팔레트에서 ↑ 키 → 마지막에 머물렀던 격자 칸으로 포커스 이동
  paletteEl.addEventListener("keydown", function (e) {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (cellEls[cursor]) cellEls[cursor].focus();
    }
  });

  // ---- 팔레트 ----
  function buildPalette() {
    var frag = document.createDocumentFragment();
    PALETTE.forEach(function (color) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "swatch";
      btn.style.background = color;
      btn.setAttribute("aria-label", "색상 " + color);
      btn.dataset.color = color;
      btn.addEventListener("click", function () {
        selectColor(color);
      });
      frag.appendChild(btn);
    });
    paletteEl.appendChild(frag);
  }

  function selectColor(color) {
    currentColor = color;
    setEraser(false);
    updateCurrentUI();
  }

  function updateCurrentUI() {
    currentSwatch.style.background = currentColor;
    // aria-live 영역이 읽도록 현재 상태를 텍스트로 전달
    currentColorText.textContent = eraserOn ? "지우개 선택됨" : ("선택한 색 " + currentColor);
    var swatches = paletteEl.querySelectorAll(".swatch");
    for (var i = 0; i < swatches.length; i++) {
      var isMatch = !eraserOn && swatches[i].dataset.color.toLowerCase() === currentColor.toLowerCase();
      swatches[i].classList.toggle("is-selected", isMatch);
      swatches[i].setAttribute("aria-pressed", isMatch ? "true" : "false");
    }
  }

  function setEraser(on) {
    eraserOn = on;
    eraserBtn.setAttribute("aria-pressed", on ? "true" : "false");
  }

  colorPicker.addEventListener("input", function () {
    selectColor(colorPicker.value);
  });

  eraserBtn.addEventListener("click", function () {
    setEraser(!eraserOn);
    updateCurrentUI();
  });

  clearBtn.addEventListener("click", function () {
    var hasContent = cells.some(function (c) { return c !== null; });
    if (hasContent && !window.confirm("격자 전체를 지울까요?")) return;
    cells = new Array(GRID_SIZE * GRID_SIZE).fill(null);
    renderAll();
    save();
  });

  // ---- PNG 저장 ----
  saveBtn.addEventListener("click", function () {
    var ctx = exportCanvas.getContext("2d");
    ctx.clearRect(0, 0, exportCanvas.width, exportCanvas.height);
    for (var i = 0; i < cells.length; i++) {
      var color = cells[i];
      if (!color) continue; // 빈 셀은 투명 유지
      var x = (i % GRID_SIZE) * DOT_PX;
      var y = Math.floor(i / GRID_SIZE) * DOT_PX;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, DOT_PX, DOT_PX);
    }
    var url = exportCanvas.toDataURL("image/png");
    var a = document.createElement("a");
    a.href = url;
    a.download = "pixel-art.png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });

  // ---- localStorage 저장/복원 ----
  function save() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cells));
    } catch (e) {
      /* 저장 실패는 무시 (프라이빗 모드 등) */
    }
  }

  function load() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length === GRID_SIZE * GRID_SIZE) {
        cells = parsed.map(function (c) {
          // 색상 형식(#hex)만 허용 — 임의 문자열 주입 방지
          return (typeof c === "string" && COLOR_RE.test(c)) ? c : null;
        });
      }
    } catch (e) {
      /* 손상된 데이터는 무시 */
    }
  }

  // ---- 초기화 ----
  buildGrid();
  buildPalette();
  load();
  renderAll();
  currentColor = colorPicker.value;
  updateCurrentUI();
})();
