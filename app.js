// ============ 八卦数映射 ============
var TRIGRAM_NUM = {
  1: {name:"乾", sym:"☰"},
  2: {name:"兑", sym:"☱"},
  3: {name:"离", sym:"☲"},
  4: {name:"震", sym:"☳"},
  5: {name:"巽", sym:"☴"},
  6: {name:"坎", sym:"☵"},
  7: {name:"艮", sym:"☶"},
  8: {name:"坤", sym:"☷"},
  0: {name:"坤", sym:"☷"}
};

// 根据上下卦名找卦
function findGuaByTrigrams(upperName, lowerName) {
  for (var i = 0; i < HEXAGRAMS.length; i++) {
    var g = HEXAGRAMS[i];
    if (g.upper === upperName && g.lower === lowerName) return g;
  }
  return null;
}

// 数字起卦
function numGua() {
  var rawUpper = parseInt(document.getElementById('numUpper').value) || 0;
  var rawLower = parseInt(document.getElementById('numLower').value) || 0;
  var rawYao = parseInt(document.getElementById('numYao').value) || 0;

  var upperRem = rawUpper % 8;
  var lowerRem = rawLower % 8;
  var yaoRem = rawYao % 6;

  var upperT = TRIGRAM_NUM[upperRem];
  var lowerT = TRIGRAM_NUM[lowerRem];
  var yaoNum = yaoRem === 0 ? 6 : yaoRem; // 余0=上爻

  var resultDiv = document.getElementById('numResult');
  if (rawUpper === 0 && rawLower === 0 && rawYao === 0) {
    resultDiv.classList.remove('visible');
    return;
  }

  var gua = findGuaByTrigrams(upperT.name, lowerT.name);
  if (!gua) {
    resultDiv.innerHTML = '未找到对应的卦，请检查数字。';
    resultDiv.classList.add('visible');
    return;
  }

  // 自动选中本卦，数字卦动爻唯一，不再手动点选
  selectedYao.clear();
  selectedYao.add(yaoNum);
  selectedBaseId = gua.id;
  selectGua(gua.id);

  // 高亮动爻按钮
  document.querySelectorAll('.yao-btn').forEach(function(b) {
    b.classList.remove('active');
  });
  var btn = document.querySelector('.yao-btn[data-yao="' + yaoNum + '"]');
  if (btn) btn.classList.add('active');
  updateDerivedGua();

  // 推算之卦
  var derivedGua = null;
  var baseLines = getGuaLines(gua);
  var derivedLines = baseLines.slice();
  derivedLines[yaoNum - 1] = derivedLines[yaoNum - 1] === 1 ? 0 : 1;
  derivedGua = findGuaByLines(derivedLines);

  var yaoLabel = yaoNum === 6 ? '上爻' : (['','初','二','三','四','五','上'][yaoNum]) + '爻';
  var derivedHtml = derivedGua
    ? ' → 之卦：<strong>' + derivedGua.id + '. ' + derivedGua.name + ' ' + derivedGua.upperTri + derivedGua.lowerTri + '</strong>'
    : '';

  resultDiv.innerHTML = '上卦 ' + upperT.sym + upperT.name + '（' + rawUpper + '÷8 余' + upperRem + '）　'
    + '下卦 ' + lowerT.sym + lowerT.name + '（' + rawLower + '÷8 余' + lowerRem + '）　'
    + '动爻 ' + yaoLabel + '（' + rawYao + '÷6 余' + yaoRem + '）<br>'
    + '→ <strong>本卦：' + gua.id + '. ' + gua.name + ' ' + gua.upperTri + gua.lowerTri + '</strong>'
    + '　动：<strong>' + yaoLabel + '</strong>　<span style="font-size:0.8rem;">(' + gua.lines[yaoNum - 1] + ')</span>'
    + derivedHtml
    + '<br><br>✅ <strong style="color:var(--success);">起卦完成！</strong>请直接在下方填写所问之事，点击「开始解卦」提交。';
  resultDiv.classList.add('visible');

  // 自动滚动到问题输入区
  setTimeout(function() {
    document.getElementById('question').focus();
    document.getElementById('question').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 300);
}

// ============ 全局状态 ============
var selectedBaseId = null;
var selectedYao = new Set();

// API 配置（仅后端可见，前端源码不暴露明文密钥）
var settings = {
  apiBase: 'https://apihub.agnes-ai.com/v1',
  apiModel: 'agnes-2.0-flash',
  apiKey: atob('c2stSXltemVzRVluU3BheGk4cnVPSDBacnFMUXMzNnFjWmN5TkdwU0NHYXFRV2Vzb3pO'),
  temperature: 0.7
};

function init() {
  populateGuaSelect();
}

function populateGuaSelect() {
  var sel = document.getElementById('baseGua');
  sel.innerHTML = '<option value="">-- 请选择本卦，或先用数字起卦 --</option>';
  HEXAGRAMS.forEach(function(g) {
    var opt = document.createElement('option');
    opt.value = g.id;
    opt.textContent = g.id + '. ' + g.name + ' ' + g.upperTri + g.lowerTri;
    sel.appendChild(opt);
  });
}

function renderGuaList() { /* 侧栏已移除，保留空函数以免 JS 报错 */ }
function filterGuaList() { /* 侧栏已移除 */ }

function selectGua(id) {
  selectedBaseId = id;
  document.getElementById('baseGua').value = id;
  updateDerivedGua();
  highlightYaoVisual();
}

function onBaseGuaChange() {
  var val = document.getElementById('baseGua').value;
  selectedBaseId = val ? parseInt(val) : null;
  updateDerivedGua();
  highlightYaoVisual();
}

function toggleYao(num, btn) {
  if (selectedYao.has(num)) {
    selectedYao.delete(num);
    btn.classList.remove('active');
  } else {
    selectedYao.add(num);
    btn.classList.add('active');
  }
  updateDerivedGua();
}

function updateDerivedGua() {
  var group = document.getElementById('derivedGuaGroup');
  var input = document.getElementById('derivedGua');
  // 之卦信息已在数字起卦结果区展示，此处仅防 JS 报错
  if (!group || !input) return;
  if (!selectedBaseId || selectedYao.size === 0) {
    group.style.display = 'none';
    return;
  }
  var base = HEXAGRAMS.find(function(g) { return g.id === selectedBaseId; });
  if (!base) return;
  var baseLines = getGuaLines(base);
  var derivedLines = baseLines.slice();
  selectedYao.forEach(function(yn) {
    derivedLines[yn - 1] = derivedLines[yn - 1] === 1 ? 0 : 1;
  });
  var derivedGua = findGuaByLines(derivedLines);
  if (derivedGua) {
    group.style.display = 'block';
    input.value = derivedGua.id + '. ' + derivedGua.name + ' ' + derivedGua.upperTri + derivedGua.lowerTri;
  } else {
    group.style.display = 'none';
  }
}

function getGuaLines(gua) {
  var lines = [];
  gua.lines.forEach(function(l) {
    // 取爻标签前两字判断阴阳：含"九"为阳爻（初九/九二~九五/上九），不含为阴爻
    var label = l.substring(0, 2);
    lines.push(label.indexOf('九') >= 0 ? 1 : 0);
  });
  return lines;
}

function findGuaByLines(targetLines) {
  for (var i = 0; i < HEXAGRAMS.length; i++) {
    var g = HEXAGRAMS[i];
    var lines = getGuaLines(g);
    var match = true;
    for (var j = 0; j < 6; j++) {
      if (lines[j] !== targetLines[j]) { match = false; break; }
    }
    if (match) return g;
  }
  return null;
}

function highlightYaoVisual() {
  var buttons = document.querySelectorAll('.yao-btn');
  buttons.forEach(function(b) { b.classList.remove('yin'); });
  if (!selectedBaseId) return;
  var gua = HEXAGRAMS.find(function(g) { return g.id === selectedBaseId; });
  if (!gua) return;
  var lines = getGuaLines(gua);
  buttons.forEach(function(b) {
    var yn = parseInt(b.dataset.yao);
    if (lines[yn - 1] === 0) b.classList.add('yin');
  });
}

async function submitReading() {
  if (!selectedBaseId) { alert('请先选择本卦'); return; }
  var question = document.getElementById('question').value.trim();
  if (!question) { alert('请填写所问之事'); return; }
  var baseGua = HEXAGRAMS.find(function(g) { return g.id === selectedBaseId; });
  var resultCard = document.getElementById('resultCard');
  var resultBody = document.getElementById('resultBody');
  var submitBtn = document.getElementById('submitBtn');
  resultCard.classList.add('visible');
  resultBody.innerHTML = '<p class="loading">正在推演卦象...</p>';
  submitBtn.disabled = true;
  submitBtn.textContent = '解卦中...';

  var derivedGua = null;
  var changingLinesInfo = '';
  if (selectedYao.size > 0) {
    var baseLines = getGuaLines(baseGua);
    var derivedLines = baseLines.slice();
    selectedYao.forEach(function(n) { derivedLines[n-1] = derivedLines[n-1] === 1 ? 0 : 1; });
    derivedGua = findGuaByLines(derivedLines);
    var yaoNames = ['初','二','三','四','五','上'];
    var parts = [];
    selectedYao.forEach(function(n) {
      parts.push(yaoNames[n-1] + '爻动（' + baseGua.lines[n-1] + '）');
    });
    changingLinesInfo = '\n动爻：' + parts.join('；');
  }

  var systemPrompt = '你是解忧徐会长，一位创立"三维义理解卦心法"解卦的易经研习者。你不是AI算命先生，而是一个研读义理辅助决策的朋友。\n\n'
    + '## 核心框架：三维看世界\n'
    + '任何一件事，从三个维度去看：\n'
    + '- 格局：事情处在什么结构里（本卦的卦象格局）？上下卦的八卦物象对应什么现实隐喻？\n'
    + '- 时机：事情处在什么时间点上（动爻在六爻中的位置）？卦气从本卦到变卦是好转还是恶化？动爻是否得位、得中、得应？是否处在互卦中？互卦有何影响？\n'
    + '- 人心：问卦人的心态和位置（爻辞中的"志""位""应变"）？他现在最需要看清什么？最需要如何调整心态和应对？\n\n'
    + '## 指导思想\n'
    + '解卦不仅是为了看清局势，更是为了帮助来访者修心进德：\n'
    + '- 引导人心平气和——心不平则理不明，气不和则路不通。先让心静下来，才能看清卦在说什么\n'
    + '- 鼓励与人为善——吉凶之转常在一念之善。卦象的"吉"需要人的善行去承接，"凶"也常因善念而化解\n'
    + '- 提醒增加三能——体能足则志坚，心能定则虑清，智能开则路通。卦象指路，三能是走路的腿\n'
    + '- 卦是导航，人自身的修为才是真正的发动机\n\n'
    + '## 表达规范（强制执行）\n'
    + '- 半文半白，先引爻辞原文再用白话解读，自然衔接不分点罗列\n'
    + '- 温和但笃定，用"卦象显示…"而非"我觉得…"\n'
    + '- 用日常比喻（地形图、路况、导航）化解玄奥，不搞玄学包装\n'
    + '- 每次解读必须落到能操作的三步——理清现状、规划方向、执行动作\n'
    + '- 卦象说凶就说凶，但说完凶要告诉人怎么避开\n'
    + '- 结语要有力收束，一句短的话收尾\n'
    + '- 不做冗长铺垫，直接说卦、说爻、说人\n\n'
    + '## 边界\n'
    + '- 不给绝对预测，"卦象显示"不是"你一定会"\n'
    + '- 不替人做决定，卦是导航，方向盘在问卦人手里\n'
    + '- 不哄人开心，也不刻意吓人，如实解读\n'
    + '- 不确定就说不确定\n\n'
    + '## 本卦信息\n'
    + '卦名：' + baseGua.name + '\n'
    + '卦辞：' + baseGua.judgment + '\n'
    + '上卦：' + baseGua.upper + '（' + baseGua.upperTri + '）\n'
    + '下卦：' + baseGua.lower + '（' + baseGua.lowerTri + '）\n'
    + '六爻爻辞：\n' + baseGua.lines.join('\n') + '\n'
    + changingLinesInfo;

  if (derivedGua) {
    systemPrompt += '\n\n变卦（之卦）：' + derivedGua.name + '\n'
      + '变卦卦辞：' + derivedGua.judgment + '\n'
      + '变卦上卦：' + derivedGua.upper + '（' + derivedGua.upperTri + '）\n'
      + '变卦下卦：' + derivedGua.lower + '（' + derivedGua.lowerTri + '）';
  } else {
    systemPrompt += '\n\n此卦无动爻，为静卦，卦象本身即是最重要的信息。';
  }

  systemPrompt += '\n\n请根据以上信息，用徐会长的三维心法为问卦人解读此卦。';

  try {
    var apiKey = settings.apiKey;
    if (!apiKey) throw new Error('API Key 未配置。');

    var response = await fetch(settings.apiBase + '/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify({
        model: settings.apiModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question }
        ],
        temperature: settings.temperature,
        max_tokens: 2048
      })
    });

    if (!response.ok) {
      var errText = await response.text();
      throw new Error('API 错误 (' + response.status + '): ' + errText.substring(0, 200));
    }

    var data = await response.json();
    var content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!content) content = '（模型未返回内容）';
    resultBody.innerHTML = content + '<p style="text-align:center;color:var(--text-light);font-size:0.82rem;margin-top:24px;">公众号：解忧徐会长 公益制作</p>';
  } catch (err) {
    resultBody.innerHTML = '<p class="error-msg">解卦出错：' + err.message + '</p>'
      + '<p class="tooltip">请稍后重试，如有问题请联系公众号：解忧徐会长。</p>';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = '🔮 开始解卦';
  }
}

function toggleTheme() {
  var html = document.documentElement;
  var current = html.getAttribute('data-theme');
  var next = current === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('yijing_theme', next);
}

(function() {
  var saved = localStorage.getItem('yijing_theme');
  if (saved) document.documentElement.setAttribute('data-theme', saved);
})();

document.addEventListener('keydown', function(e) {
  if (e.ctrlKey && e.key === 'Enter') submitReading();
});

init();