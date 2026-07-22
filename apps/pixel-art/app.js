(function () {
  "use strict";

  var GRID_SIZE = 16;
  var DOT_PX = 20; // 320 / 16
  var STORAGE_KEY = "pixel-art-data";

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

  var gridEl = document.getElementById("grid");
  var paletteEl = document.getElementById("palette");
  var colorPicker = document.getElementById("colorPicker");
  var currentSwatch = document.getElementById("currentSwatch");
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

  window.addEventListener("touchend", function () {
    isDrawing = false;
  });

  // 드래그 이미지 방지
  gridEl.addEventListener("dragstart", function (e) {
    e.preventDefault();
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
    var swatches = paletteEl.querySelectorAll(".swatch");
    for (var i = 0; i < swatches.length; i++) {
      var isMatch = !eraserOn && swatches[i].dataset.color.toLowerCase() === currentColor.toLowerCase();
      swatches[i].classList.toggle("is-selected", isMatch);
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
          return typeof c === "string" ? c : null;
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
