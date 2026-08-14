// Ung dung luyen tap QHTT / Van tru hoc - 100% chay o trinh duyet, khong backend.
// Cham diem bang so sanh truc tiep voi du lieu da tinh san trong data/*.json
// (khong go tay dap an rieng trong app.js).

(function () {
  "use strict";

  var STORE_KEY = "qhtt_progress_v1";
  var state = {
    mcq: null,
    numeric: null,
    progress: loadProgress(),
  };

  function loadProgress() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      return raw ? JSON.parse(raw) : { mcq: {}, numeric: {} };
    } catch (e) {
      return { mcq: {}, numeric: {} };
    }
  }
  function saveProgress() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state.progress));
    } catch (e) {
      /* localStorage khong kha dung (che do an danh, v.v.) - bo qua im lang */
    }
  }

  function el(tag, attrs, children) {
    var e = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "class") e.className = attrs[k];
        else if (k === "html") e.innerHTML = attrs[k];
        else e.setAttribute(k, attrs[k]);
      });
    }
    (children || []).forEach(function (c) {
      if (typeof c === "string") e.appendChild(document.createTextNode(c));
      else if (c) e.appendChild(c);
    });
    return e;
  }

  function renderMath(root) {
    if (window.renderMathInElement) {
      window.renderMathInElement(root, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "$", right: "$", display: false },
        ],
        throwOnError: false,
      });
    }
  }

  // ---------------- Loading du lieu, co try/catch + timeout ----------------
  function fetchJSON(path, timeoutMs) {
    return new Promise(function (resolve, reject) {
      var ctrl = new AbortController();
      var timer = setTimeout(function () {
        ctrl.abort();
        reject(new Error("Quá thời gian tải " + path));
      }, timeoutMs || 20000);
      fetch(path, { signal: ctrl.signal })
        .then(function (r) {
          clearTimeout(timer);
          if (!r.ok) throw new Error("HTTP " + r.status + " khi tải " + path);
          return r.json();
        })
        .then(resolve)
        .catch(function (err) {
          clearTimeout(timer);
          reject(err);
        });
    });
  }

  function boot() {
    var app = document.getElementById("app");
    app.innerHTML = "";
    app.appendChild(el("div", { class: "loading" }, ["Đang tải dữ liệu bài tập…"]));

    Promise.all([fetchJSON("data/mcq.json"), fetchJSON("data/numeric.json")])
      .then(function (res) {
        state.mcq = res[0];
        state.numeric = res[1];
        window.addEventListener("hashchange", route);
        route();
      })
      .catch(function (err) {
        app.innerHTML = "";
        app.appendChild(
          el("div", { class: "err-box" }, [
            el("p", {}, ["Không tải được dữ liệu bài tập: " + err.message]),
            el("button", { class: "btn" }, ["Thử lại"]).also(function (b) {
              b.onclick = boot;
            }),
          ])
        );
      });
  }
  // tien ich nho de gan onclick ngay khi tao (khong bat buoc nhung gon)
  HTMLElement.prototype.also = function (fn) {
    fn(this);
    return this;
  };

  // ---------------------------- Routing ----------------------------
  function route() {
    var hash = location.hash.replace(/^#/, "") || "/";
    var parts = hash.split("/").filter(Boolean);
    updateNav(hash);

    if (parts.length === 0) return renderHome();
    if (parts[0] === "mcq" && parts.length === 1) return renderMcqOverview();
    if (parts[0] === "mcq" && parts.length === 2) return renderMcqQuestion(parseInt(parts[1], 10));
    if (parts[0] === "numeric" && parts.length === 1) return renderNumericOverview();
    if (parts[0] === "numeric" && parts.length === 2) return renderNumericQuestion(parseInt(parts[1], 10));
    renderHome();
  }

  function updateNav(hash) {
    document.querySelectorAll("#topnav a").forEach(function (a) {
      var r = a.getAttribute("data-route");
      var active = ("/" + hash.replace(/^\//, "")).indexOf(r) === 0 && (r !== "/" || hash === "/" || hash === "");
      a.classList.toggle("active", active);
    });
  }

  function mount(node) {
    var app = document.getElementById("app");
    app.innerHTML = "";
    app.appendChild(node);
    renderMath(app);
    window.scrollTo(0, 0);
  }

  // ---------------------------- Trang chu ----------------------------
  function renderHome() {
    var mcqDone = Object.keys(state.progress.mcq).length;
    var mcqCorrect = Object.values(state.progress.mcq).filter(function (x) { return x.correct; }).length;
    var numDone = Object.keys(state.progress.numeric).length;
    var numCorrect = Object.values(state.progress.numeric).filter(function (x) { return x.correct; }).length;

    var wrap = el("div", {}, [
      el("div", { class: "card hero" }, [
        el("h2", {}, ["Luyện tập Quy hoạch tuyến tính & Vận trù học"]),
        el("p", {}, [
          "100 câu trắc nghiệm (36 câu có đồ thị minh họa vẽ bằng Python) và 10 bài tập tính toán " +
          "(đơn hình gốc / hai pha / M, đối ngẫu, bài toán vận tải – thuật toán thế vị). " +
          "Chấm điểm ngay lập tức, không cần gửi lên server nào.",
        ]),
        el("div", { class: "stat-row" }, [
          el("div", { class: "stat" }, [el("b", {}, [String(mcqCorrect) + "/" + String(mcqDone) + "/100"]), el("span", {}, ["Trắc nghiệm đúng/đã làm/tổng"])]),
          el("div", { class: "stat" }, [el("b", {}, [String(numCorrect) + "/" + String(numDone) + "/10"]), el("span", {}, ["Tính toán đúng/đã làm/tổng"])]),
        ]),
        el("a", { class: "btn", href: "#/mcq" }, ["Bắt đầu trắc nghiệm"]),
        el("a", { class: "btn secondary", href: "#/numeric" }, ["Bài tập tính toán"]),
      ]),
      el("div", { class: "card" }, [
        el("h3", {}, ["Cách dùng"]),
        el("ul", {}, [
          el("li", {}, ["Trắc nghiệm: chọn 1 đáp án rồi bấm “Kiểm tra” — hiện ngay đúng/sai + giải thích."]),
          el("li", {}, ["Bài tập tính toán: nhập số vào các ô (chấp nhận sai số nhỏ do làm tròn), bấm “Kiểm tra”."]),
          el("li", {}, ["Tiến độ tự lưu ở trình duyệt này (localStorage) — quay lại vẫn thấy câu đã làm."]),
        ]),
      ]),
    ]);
    mount(wrap);
  }

  // ---------------------------- MCQ: tong quan ----------------------------
  function renderMcqOverview() {
    var groups = {};
    state.mcq.forEach(function (q) {
      groups[q.group] = groups[q.group] || [];
      groups[q.group].push(q);
    });
    var doneCount = Object.keys(state.progress.mcq).length;

    var body = [
      el("div", { class: "card" }, [
        el("h2", {}, ["100 câu trắc nghiệm"]),
        el("div", { class: "progress-bar-outer" }, [
          el("div", { class: "progress-bar-inner", style: "width:" + (doneCount) + "%" }),
        ]),
        el("p", {}, [doneCount + " / 100 câu đã làm."]),
      ]),
    ];

    Object.keys(groups).forEach(function (g) {
      var cells = groups[g].map(function (q) {
        var p = state.progress.mcq[q.id];
        var cls = "q";
        if (p) cls += p.correct ? " correct" : " wrong";
        var b = el("button", { class: cls }, [String(q.id)]);
        b.onclick = function () { location.hash = "#/mcq/" + q.id; };
        return b;
      });
      body.push(
        el("div", { class: "card" }, [
          el("h4", { style: "margin-top:0" }, [g]),
          el("div", { class: "qgrid-cells", style: "grid-template-columns:repeat(10,1fr)" }, cells),
        ])
      );
    });

    mount(el("div", {}, body));
  }

  // ---------------------------- MCQ: 1 cau ----------------------------
  function renderMcqQuestion(id) {
    var q = state.mcq.find(function (x) { return x.id === id; });
    if (!q) return renderMcqOverview();
    var prev = state.progress.mcq[id];

    var optionLabels = [];
    var optWrap = el("div", { class: "options" });
    ["A", "B", "C", "D"].forEach(function (letter) {
      var input = el("input", { type: "radio", name: "opt", value: letter });
      if (prev) input.disabled = true;
      if (prev && prev.selected === letter) input.checked = true;
      var label = el("label", {}, [input, letter + ". " + q.options[letter]]);
      if (prev) {
        if (letter === q.correct) label.classList.add("correct");
        else if (letter === prev.selected) label.classList.add("wrong");
      }
      optionLabels.push({ letter: letter, label: label, input: input });
      optWrap.appendChild(label);
    });

    var explain = el("div", { class: "explain" + (prev ? " show" : ""), html: q.explanation });
    var checkBtn = el("button", { class: "btn" }, ["Kiểm tra"]);
    var fbLine = el("p", {class:"result-line"}, []);

    if (prev) {
      checkBtn.disabled = true;
      fbLine.textContent = prev.correct ? "✔ Bạn đã trả lời đúng." : "✘ Bạn đã chọn " + prev.selected + " (đáp án đúng: " + q.correct + ").";
      fbLine.style.color = prev.correct ? "#1e7e34" : "#c0392b";
    }

    checkBtn.onclick = function () {
      var chosen = optWrap.querySelector("input:checked");
      if (!chosen) { fbLine.textContent = "Hãy chọn 1 đáp án trước."; return; }
      var letter = chosen.value;
      var correct = letter === q.correct;
      state.progress.mcq[id] = { selected: letter, correct: correct };
      saveProgress();
      renderMcqQuestion(id);
    };

    var idx = state.mcq.findIndex(function (x) { return x.id === id; });
    var navRow = el("div", { class: "nav-row" }, [
      el("a", { class: "btn secondary", href: idx > 0 ? "#/mcq/" + state.mcq[idx - 1].id : "#/mcq" }, ["← Câu trước"]),
      el("a", { class: "btn secondary", href: "#/mcq" }, ["Danh sách"]),
      el("a", { class: "btn", href: idx < state.mcq.length - 1 ? "#/mcq/" + state.mcq[idx + 1].id : "#/mcq" }, ["Câu sau →"]),
    ]);

    var main = el("div", { class: "card" }, [
      el("div", { class: "qgroup-label" }, [q.group + " · Câu " + q.id + "/100"]),
      el("div", { class: "qtext", html: q.question }),
      q.image ? el("img", { class: "qimg", src: "img/" + q.image, alt: "hình minh họa câu " + q.id }) : null,
      optWrap,
      checkBtn,
      fbLine,
      explain,
      navRow,
    ]);

    // luoi cau hoi ben phai
    var cells = state.mcq.map(function (qq) {
      var p = state.progress.mcq[qq.id];
      var cls = "";
      if (p) cls = p.correct ? "correct" : "wrong";
      if (qq.id === id) cls += " current";
      var b = el("button", { class: cls.trim() }, [String(qq.id)]);
      b.onclick = function () { location.hash = "#/mcq/" + qq.id; };
      return b;
    });
    var side = el("div", { class: "qgrid" }, [
      el("h4", {}, ["Danh sách câu"]),
      el("div", { class: "qgrid-cells" }, cells),
    ]);

    mount(el("div", { class: "quiz-layout" }, [main, side]));
  }

  // ---------------------------- Numeric: tong quan ----------------------------
  function renderNumericOverview() {
    var doneCount = Object.keys(state.progress.numeric).length;
    var cells = state.numeric.map(function (ex) {
      var p = state.progress.numeric[ex.id];
      var cls = "";
      if (p) cls = p.correct ? "correct" : "wrong";
      var card = el("div", { class: "card" }, [
        el("div", { class: "qgroup-label" }, ["Bài " + ex.id + (p ? (p.correct ? " · Đã đúng" : " · Cần làm lại") : "")]),
        el("h4", { style: "margin:4px 0" }, [ex.title]),
        el("a", { class: "btn secondary", href: "#/numeric/" + ex.id }, [p ? "Xem lại" : "Làm bài"]),
      ]);
      return card;
    });
    var body = [
      el("div", { class: "card" }, [
        el("h2", {}, ["10 bài tập tính toán"]),
        el("div", { class: "progress-bar-outer" }, [
          el("div", { class: "progress-bar-inner", style: "width:" + doneCount * 10 + "%" }),
        ]),
        el("p", {}, [doneCount + " / 10 bài đã làm. Kết quả nhập vào được chấp nhận sai số nhỏ (làm tròn)."]),
      ]),
    ].concat(cells);
    mount(el("div", {}, body));
  }

  // ---------------------------- Numeric: 1 bai ----------------------------
  function renderNumericQuestion(id) {
    var ex = state.numeric.find(function (x) { return x.id === id; });
    if (!ex) return renderNumericOverview();
    var prev = state.progress.numeric[id];

    var inputs = [];
    var fieldsWrap = el("div", {});
    ex.fields.forEach(function (f, i) {
      var input = el("input", { type: "text", placeholder: "nhập số…" });
      if (prev) { input.value = prev.values[i]; input.disabled = true; }
      var fb = el("span", { class: "fb" }, []);
      if (prev) {
        var ok = Math.abs(parseFloat(prev.values[i]) - f.expected) <= (f.tol || 0.01);
        fb.textContent = ok ? "✔" : "✘ (đúng: " + f.expected + ")";
        fb.style.color = ok ? "#1e7e34" : "#c0392b";
      }
      inputs.push(input);
      fieldsWrap.appendChild(el("div", { class: "field-row" }, [
        el("label", { html: "$" + f.name.replace(/(\d+)/, "_{$1}").replace(/\*/g, "^*") + "$" }),
        input,
        fb,
      ]));
    });

    var checkBtn = el("button", { class: "btn" }, ["Kiểm tra"]);
    var resultLine = el("p", {class:"result-line"}, []);
    if (prev) {
      checkBtn.disabled = true;
      resultLine.textContent = prev.correct ? "✔ Chính xác toàn bộ." : "✘ Còn sai ở 1 hoặc nhiều ô — xem đáp án đúng ở trên.";
      resultLine.style.color = prev.correct ? "#1e7e34" : "#c0392b";
    }
    checkBtn.onclick = function () {
      var vals = inputs.map(function (inp) { return inp.value.trim(); });
      if (vals.some(function (v) { return v === "" || isNaN(parseFloat(v)); })) {
        resultLine.textContent = "Hãy nhập đủ số vào tất cả các ô.";
        resultLine.style.color = "#c0392b";
        return;
      }
      var allOk = ex.fields.every(function (f, i) {
        return Math.abs(parseFloat(vals[i]) - f.expected) <= (f.tol || 0.01);
      });
      state.progress.numeric[id] = { values: vals, correct: allOk };
      saveProgress();
      renderNumericQuestion(id);
    };

    var idx = state.numeric.findIndex(function (x) { return x.id === id; });
    var navRow = el("div", { class: "nav-row" }, [
      el("a", { class: "btn secondary", href: idx > 0 ? "#/numeric/" + state.numeric[idx - 1].id : "#/numeric" }, ["← Bài trước"]),
      el("a", { class: "btn secondary", href: "#/numeric" }, ["Danh sách"]),
      el("a", { class: "btn", href: idx < state.numeric.length - 1 ? "#/numeric/" + state.numeric[idx + 1].id : "#/numeric" }, ["Bài sau →"]),
    ]);

    var card = el("div", { class: "card" }, [
      el("div", { class: "qgroup-label" }, ["Bài tập tính toán " + ex.id + "/10"]),
      el("h3", {}, [ex.title]),
      el("p", { html: ex.prompt }),
      fieldsWrap,
      checkBtn,
      resultLine,
      el("p", { class: "source-note" }, ["Nguồn: " + ex.source]),
      navRow,
    ]);
    mount(card);
  }

  boot();
})();
