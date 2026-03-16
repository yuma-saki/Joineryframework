function switchTab(tabName) {
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById('tab-' + tabName).classList.add('active');
    document.getElementById('nav-' + tabName).classList.add('active');
    window.scrollTo(0, 0);
}

function onTypeChange() {
    const type = document.getElementById('typeSelect').value;
    const lvlLabel = document.getElementById('lvlLabel');
    const lvlWidth = document.getElementById('lvlWidth');
    const boardLenInput = document.getElementById('boardLen');
    const boardLenLabel = document.getElementById('boardLenLabel');
    if (type === '建具') {
        lvlLabel.textContent = '縦桟/上下桟 幅 (LVL)';
        lvlWidth.value = 35;
        boardLenLabel.textContent = 'LVL 定尺長さ';
        boardLenInput.value = 2120;
    } else {
        lvlLabel.textContent = '縦桟/上下桟 幅 (ランバー)';
        lvlWidth.value = 50;
        boardLenLabel.textContent = 'ランバー 定尺長さ';
        boardLenInput.value = 1820;
    }
    calculate();
}

function calculate() {
    // 入力値取得 (空文字対策)
    const rawH = parseFloat(document.getElementById('h').value) || 0;
    const rawW = parseFloat(document.getElementById('w').value) || 0;
    const LVL = parseFloat(document.getElementById('lvlWidth').value) || 0;
    const NUKI = parseFloat(document.getElementById('nukiWidth').value) || 0;
    const N = parseInt(document.getElementById('nukiCount').value) || 0;
    const hikite = document.getElementById('optHikite').checked;
    const type = document.getElementById('typeSelect').value;
    const mat = type === '建具' ? 'LVL' : 'ランバー';
    const boardLen = parseFloat(document.getElementById('boardLen').value) || 0;

    if (rawH === 0 || rawW === 0) return;

    // 芯の製作寸法 (カット寸法 + 10mm)
    const H = rawH + 10;
    const W = rawW + 10;

    // サマリー表示
    document.getElementById('calcSummary').innerHTML =
        `<strong>カット寸法:</strong> 高 ${rawH}mm × 幅 ${rawW}mm<br>` +
        `<strong>芯の製作寸法:</strong> 高 ${H}mm × 幅 ${W}mm`;

    const list = [];

    // 1. 縦桟 (縦勝ち)
    list.push({ name: `縦桟 (${mat})`, len: H, qty: 2, note: "外周左右 (通し材)" });

    // 2. 上下桟 (横材)
    const yokoLen = W - (LVL * 2);
    list.push({ name: `上下桟 (${mat})`, len: yokoLen, qty: 2, note: "外周上下 (中入れ材)" });

    // 3. 引手補強
    const hikiteH = 300;
    const hikiteCenter = 900;
    const hTop = H - (hikiteCenter + hikiteH / 2);
    const hBottom = H - (hikiteCenter - hikiteH / 2);

    if (hikite) {
        list.push({ name: `引手補強 (${mat})`, len: hikiteH, qty: 4, note: "左右各2本 (FL+900芯目安)" });
    }

    // 4. 中桟 (貫) — 本数指定・等間隔センター配置
    const activeH = H - (LVL * 2);
    const realPitch = N > 0 ? activeH / (N + 1) : 0;
    const centerY = LVL + activeH / 2;

    const nukiPositions = [];
    for (let i = 0; i < N; i++) {
        const yPos = centerY + (i - (N - 1) / 2) * realPitch;
        nukiPositions.push(yPos);
    }

    let standardNukiQty = 0;
    let shortNukiQty = 0;
    const shortNukiLen = yokoLen - (LVL * 4);

    for (const yPos of nukiPositions) {
        if (hikite && yPos >= hTop && yPos <= hBottom) {
            shortNukiQty++;
        } else {
            standardNukiQty++;
        }
    }

    if (standardNukiQty > 0) {
        list.push({ name: "中桟 (貫) 通常", len: yokoLen.toFixed(1), qty: standardNukiQty, note: `ピッチ: 約${realPitch.toFixed(1)}mm` });
    }
    if (shortNukiQty > 0) {
        list.push({ name: "中桟 (貫) 短尺", len: shortNukiLen.toFixed(1), qty: shortNukiQty, note: `ピッチ: 約${realPitch.toFixed(1)}mm (引手干渉)` });
    }

    renderTable(list);
    renderProcurement(list, boardLen, type);
    drawDoor(H, W, LVL, NUKI, nukiPositions, hikite, hTop, hikiteH);
}

function renderTable(list) {
    const body = document.getElementById('resultBody');
    body.innerHTML = list.map(item => `
        <tr>
            <td>${item.name}</td>
            <td class="highlight">${item.len} mm</td>
            <td>${item.qty} 本</td>
            <td>${item.note}</td>
        </tr>
    `).join('');
}

function renderProcurement(list, boardLen, type) {
    const matLabel = type === '建具' ? 'LVL' : 'ランバー';
    const title = document.getElementById('procurementTitle');
    title.textContent = `材料手配リスト (${matLabel} ${boardLen}mm)`;

    const body = document.getElementById('procurementBody');
    if (boardLen <= 0) {
        body.innerHTML = '<tr><td colspan="4">定尺長さを入力してください</td></tr>';
        return;
    }

    let totalBoards = 0;
    const rows = list.map(item => {
        const partLen = parseFloat(item.len);
        if (partLen <= 0 || partLen > boardLen) {
            return `<tr><td>${item.name}</td><td class="highlight">${item.len} mm</td><td>-</td><td>パーツ長さが定尺を超えています</td></tr>`;
        }
        const perBoard = Math.floor(boardLen / partLen);
        const boardsNeeded = Math.ceil(item.qty / perBoard);
        totalBoards += boardsNeeded;
        return `
        <tr>
            <td>${item.name}</td>
            <td class="highlight">${item.len} mm</td>
            <td>${perBoard} 本</td>
            <td class="highlight">${boardsNeeded} 本</td>
        </tr>`;
    });

    rows.push(`
        <tr style="font-weight:bold; border-top: 2px solid #333;">
            <td colspan="3">合計必要本数</td>
            <td class="highlight">${totalBoards} 本</td>
        </tr>`);

    body.innerHTML = rows.join('');
}

function drawDoor(H, W, LVL, NUKI, nukiPositions, hikite, hTop, hLen) {
    const canvas = document.getElementById('doorCanvas');
    const ctx = canvas.getContext('2d');
    const scale = Math.min(400 / H, 300 / W);

    canvas.width = W * scale + 40;
    canvas.height = H * scale + 40;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.translate(20, 20);

    // 縦桟 (通し)
    ctx.fillStyle = "#ddd";
    ctx.fillRect(0, 0, LVL * scale, H * scale);
    ctx.fillRect((W - LVL) * scale, 0, LVL * scale, H * scale);

    // 上下桟 (中入れ)
    ctx.fillStyle = "#ccc";
    ctx.fillRect(LVL * scale, 0, (W - LVL * 2) * scale, LVL * scale);
    ctx.fillRect(LVL * scale, (H - LVL) * scale, (W - LVL * 2) * scale, LVL * scale);

    // 引手補強
    if (hikite) {
        ctx.fillStyle = "rgba(230, 126, 34, 0.6)";
        ctx.fillRect(LVL * scale, hTop * scale, LVL * scale * 2, hLen * scale);
        ctx.fillRect((W - LVL * 3) * scale, hTop * scale, LVL * scale * 2, hLen * scale);
    }

    // 中桟
    ctx.fillStyle = "#bbb";
    for (const y of nukiPositions) {
        if (hikite && y >= hTop && y <= (hTop + hLen)) {
            ctx.fillRect((LVL * 3) * scale, y * scale, (W - LVL * 6) * scale, NUKI * scale);
        } else {
            ctx.fillRect(LVL * scale, y * scale, (W - LVL * 2) * scale, NUKI * scale);
        }
    }

    // 外枠
    ctx.strokeStyle = "#333";
    ctx.strokeRect(0, 0, W * scale, H * scale);
}

calculate();
