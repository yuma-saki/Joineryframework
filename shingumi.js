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
    const optCheckbox = document.getElementById('optHikite');
    const optLabel = document.getElementById('optHikiteLabel');

    if (type === '建具') {
        lvlLabel.textContent = '縦桟/上下桟 幅 (LVL)';
        lvlWidth.value = 35;
        boardLenLabel.textContent = 'LVL 定尺長さ';
        boardLenInput.value = 2120;
        optLabel.textContent = '引手補強 (左右各2本/H900芯)';
        optCheckbox.checked = true;
    } else {
        lvlLabel.textContent = '縦桟/上下桟 幅 (ランバー)';
        lvlWidth.value = 50;
        boardLenLabel.textContent = 'ランバー 定尺長さ';
        boardLenInput.value = 1820;
        optLabel.textContent = 'ロイヤル補強 (上下桟ダブル)';
        optCheckbox.checked = false;
    }
    calculate();
}

function calculate() {
    const rawH = parseFloat(document.getElementById('h').value) || 0;
    const rawW = parseFloat(document.getElementById('w').value) || 0;
    const LVL = parseFloat(document.getElementById('lvlWidth').value) || 0;
    const NUKI = parseFloat(document.getElementById('nukiWidth').value) || 0;
    const N = parseInt(document.getElementById('nukiCount').value) || 0;
    const optChecked = document.getElementById('optHikite').checked;
    const type = document.getElementById('typeSelect').value;
    const mat = type === '建具' ? 'LVL' : 'ランバー';
    const boardLen = parseFloat(document.getElementById('boardLen').value) || 0;
    const nukiBoardLen = parseFloat(document.getElementById('nukiBoardLen').value) || 0;

    // 建具: 引手補強 / 家具: ロイヤル補強
    const hikite = type === '建具' && optChecked;
    const royal = type === '家具' && optChecked;

    if (rawH === 0 || rawW === 0) return;

    const H = rawH + 10;
    const W = rawW + 10;

    document.getElementById('calcSummary').innerHTML =
        `<strong>カット寸法:</strong> 高 ${rawH}mm × 幅 ${rawW}mm<br>` +
        `<strong>芯の製作寸法:</strong> 高 ${H}mm × 幅 ${W}mm`;

    const list = [];

    // 1. 縦桟
    list.push({ name: `縦桟 (${mat})`, len: H, qty: 2, note: "外周左右 (通し材)" });

    // 2. 上下桟 — ロイヤル補強時はダブル (qty: 4)
    const yokoLen = W - (LVL * 2);
    if (royal) {
        list.push({ name: `上下桟 (${mat})`, len: yokoLen, qty: 4, note: "外周上下 ×2 (ロイヤル補強)" });
    } else {
        list.push({ name: `上下桟 (${mat})`, len: yokoLen, qty: 2, note: "外周上下 (中入れ材)" });
    }

    // 3. 補強
    const hikiteH = 300;
    const hikiteCenter = 900;
    const hTop = H - (hikiteCenter + hikiteH / 2);
    const hBottom = H - (hikiteCenter - hikiteH / 2);

    if (hikite) {
        list.push({ name: `引手補強 (${mat})`, len: hikiteH, qty: 4, note: "左右各2本 (FL+900芯目安)" });
    }

    // 4. 中桟 — 本数指定・等間隔センター配置
    const activeH = H - (LVL * 2);
    const realPitch = N > 0 ? activeH / (N + 1) : 0;
    const centerY = LVL + activeH / 2;

    const nukiPositions = [];
    for (let i = 0; i < N; i++) {
        nukiPositions.push(centerY + (i - (N - 1) / 2) * realPitch);
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
    renderProcurement(list, boardLen, nukiBoardLen, type);
    drawDoor(H, W, LVL, NUKI, nukiPositions, hikite, hTop, hikiteH, royal);
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

// First Fit Decreasing ビンパッキング
function binPackFFD(list, boardLen) {
    const oversized = [];
    const pieces = [];

    for (const item of list) {
        const l = parseFloat(item.len);
        if (l <= 0) continue;
        if (l > boardLen) { oversized.push(item); continue; }
        for (let i = 0; i < item.qty; i++) {
            pieces.push({ name: item.name, len: l });
        }
    }

    // 長いものから順に並べる
    pieces.sort((a, b) => b.len - a.len);

    const bins = [];
    for (const piece of pieces) {
        // 余りに収まる最初のビンを探す
        let placed = false;
        for (const bin of bins) {
            if (bin.remaining >= piece.len) {
                bin.pieces.push(piece);
                bin.remaining -= piece.len;
                placed = true;
                break;
            }
        }
        if (!placed) {
            bins.push({ remaining: boardLen - piece.len, pieces: [piece] });
        }
    }

    return { bins, oversized };
}

function renderProcurementSection(titleId, bodyId, list, boardLen, label) {
    document.getElementById(titleId).textContent = `材料手配リスト — ${label}`;
    const body = document.getElementById(bodyId);

    if (list.length === 0) {
        body.innerHTML = '<tr><td colspan="3" style="color:var(--text-secondary)">対象部材なし</td></tr>';
        return;
    }
    if (boardLen <= 0) {
        body.innerHTML = '<tr><td colspan="3">定尺長さを入力してください</td></tr>';
        return;
    }

    const { bins, oversized } = binPackFFD(list, boardLen);
    const rows = [];

    bins.forEach((bin, i) => {
        // 同名パーツをまとめる
        const grouped = {};
        for (const p of bin.pieces) {
            grouped[p.name] = (grouped[p.name] || 0) + 1;
        }
        const content = Object.entries(grouped)
            .map(([name, cnt]) => cnt > 1 ? `${name} ×${cnt}` : name)
            .join('<br>');
        const used = (boardLen - bin.remaining).toFixed(0);
        rows.push(`
        <tr>
            <td style="color:var(--text-secondary);font-size:0.8rem;text-align:center">${i + 1}</td>
            <td style="line-height:1.6">${content}</td>
            <td style="white-space:nowrap;font-size:0.8rem">
                ${used}mm使用<br>
                <span style="color:var(--text-secondary)">残 ${Number(bin.remaining).toFixed(0)}mm</span>
            </td>
        </tr>`);
    });

    if (oversized.length > 0) {
        const names = oversized.map(i => i.name).join('、');
        rows.push(`<tr><td colspan="3" style="color:#e74c3c;font-size:0.85rem">⚠ 定尺超え: ${names}</td></tr>`);
    }

    rows.push(`
        <tr style="font-weight:bold;border-top:2px solid var(--border);background:#f4f6f8">
            <td colspan="2">合計必要本数</td>
            <td class="highlight">${bins.length} 本</td>
        </tr>`);

    body.innerHTML = rows.join('');
}

function renderProcurement(list, boardLen, nukiBoardLen, type) {
    const matLabel = type === '建具' ? 'LVL' : 'ランバー';

    // LVL/ランバーを含む部材 vs 中桟 (別材料) で分割
    const mainList = list.filter(item => /LVL|ランバー/.test(item.name));
    const nukiList = list.filter(item => !/LVL|ランバー/.test(item.name));

    renderProcurementSection(
        'procurementTitle', 'procurementBody',
        mainList, boardLen,
        `${matLabel} 定尺${boardLen}mm`
    );
    renderProcurementSection(
        'nukiProcurementTitle', 'nukiProcurementBody',
        nukiList, nukiBoardLen,
        `中桟材 定尺${nukiBoardLen}mm`
    );
}

function drawDoor(H, W, LVL, NUKI, nukiPositions, hikite, hTop, hLen, royal) {
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

    // 上下桟 (1枚目)
    ctx.fillStyle = "#ccc";
    ctx.fillRect(LVL * scale, 0, (W - LVL * 2) * scale, LVL * scale);
    ctx.fillRect(LVL * scale, (H - LVL) * scale, (W - LVL * 2) * scale, LVL * scale);

    // ロイヤル補強: 2枚目の上下桟を濃い色で重ねる
    if (royal) {
        ctx.fillStyle = "rgba(39, 174, 96, 0.45)";
        ctx.fillRect(LVL * scale, LVL * scale, (W - LVL * 2) * scale, LVL * scale);
        ctx.fillRect(LVL * scale, (H - LVL * 2) * scale, (W - LVL * 2) * scale, LVL * scale);
    }

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
