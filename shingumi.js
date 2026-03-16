function onModeChange() {
    const mode = document.querySelector('input[name="mode"]:checked').value;
    const boardLenInput = document.getElementById('boardLen');
    const boardLenLabel = document.getElementById('boardLenLabel');
    if (mode === 'tateguu') {
        boardLenLabel.textContent = 'LVL 定尺長さ';
        boardLenInput.value = 2120;
    } else {
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
    const PITCH = parseFloat(document.getElementById('pitch').value) || 1;
    const hikite = document.getElementById('optHikite').checked;
    const boardLen = parseFloat(document.getElementById('boardLen').value) || 0;
    const mode = document.querySelector('input[name="mode"]:checked').value;

    if (rawH === 0 || rawW === 0) return;

    // 芯の製作寸法 (カット寸法をそのまま使用)
    const H = rawH;
    const W = rawW;

    // サマリー表示
    document.getElementById('calcSummary').innerHTML =
        `<strong>芯の製作寸法:</strong> 高 ${H}mm × 幅 ${W}mm`;

    const list = [];

    // 1. 縦桟 (縦勝ち)
    list.push({ name: "縦桟 (LVL)", len: H, qty: 2, note: "外周左右 (通し材)" });

    // 2. 上下桟 (横材)
    const yokoLen = W - (LVL * 2);
    list.push({ name: "上下桟 (LVL)", len: yokoLen, qty: 2, note: "外周上下 (中入れ材)" });

    // 3. 引手補強
    const hikiteH = 300;
    const hikiteCenter = 900;
    const hTop = H - (hikiteCenter + hikiteH / 2);
    const hBottom = H - (hikiteCenter - hikiteH / 2);

    if (hikite) {
        list.push({ name: "引手補強 (LVL)", len: hikiteH, qty: 4, note: "左右各2本 (FL+900芯目安)" });
    }

    // 4. 中桟 (貫)
    const activeH = H - (LVL * 2);
    const nukiCount = Math.floor(activeH / PITCH);
    const realPitch = activeH / (nukiCount + 1);

    let standardNukiQty = 0;
    let shortNukiQty = 0;
    const shortNukiLen = yokoLen - (LVL * 4);

    for (let i = 1; i <= nukiCount; i++) {
        const yPos = LVL + (i * realPitch);
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
    renderProcurement(list, boardLen, mode);
    drawDoor(H, W, LVL, NUKI, nukiCount, realPitch, hikite, hTop, hikiteH);
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

function renderProcurement(list, boardLen, mode) {
    const matLabel = mode === 'tateguu' ? 'LVL' : 'ランバー';
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

function drawDoor(H, W, LVL, NUKI, nCount, pitch, hikite, hTop, hLen) {
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
    for (let i = 1; i <= nCount; i++) {
        const y = (LVL + i * pitch);
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
