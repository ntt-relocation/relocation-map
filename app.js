// ==============================
// URLパラメータ取得（超重要）
// ==============================
const params = new URLSearchParams(window.location.search);
const caseId = params.get("caseId");
const replyTo = params.get("replyTo");

if (!caseId || !replyTo) {
  alert("案件情報が不足しています。送信元へ確認してください。");
}

// ==============================
// 地図初期化（横浜）
// ==============================
const map = L.map("map", { maxZoom: 22 })
  .setView([35.4437, 139.6380], 16);

L.tileLayer(
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
  {
    maxZoom: 22,
    maxNativeZoom: 19
  }
).addTo(map);

// ==============================
// 状態
// ==============================
let placingPole = false;
let roadMode = false;

let beforeMarker = null;
let afterMarker = null;
let roadVector = null;
let roadLine = null;
let distanceLine = null;

// ==============================
// 電柱設置
// ==============================
function setPole() {
  placingPole = true;
  alert("移設前電柱をクリックしてください");
}

// ==============================
// 道路方向
// ==============================
function enableRoadDirectionMode() {
  if (!beforeMarker) {
    alert("先に電柱を置いてください");
    return;
  }
  roadMode = true;
  alert("道路方向をクリックしてください");
}

// ==============================
// 地図クリック
// ==============================
map.on("click", e => {

  // 道路方向
  if (roadMode) {
    const base = beforeMarker.getLatLng();
    const target = e.latlng;

    const dx = target.lng - base.lng;
    const dy = target.lat - base.lat;
    const len = Math.sqrt(dx * dx + dy * dy);

    roadVector = { x: dx / len, y: dy / len };

    if (roadLine) map.removeLayer(roadLine);

    roadLine = L.polyline([base, target], {
      color: "blue",
      weight: 4,
      dashArray: "6,4"
    }).addTo(map);

    roadMode = false;
    return;
  }

  // 電柱
  if (!placingPole) return;

  if (beforeMarker) map.removeLayer(beforeMarker);

  beforeMarker = L.marker(e.latlng).addTo(map);
  placingPole = false;

  map.setView(beforeMarker.getLatLng(), 20);
});

// ==============================
// XY配置
// ==============================
function applyXYMove() {

  if (!beforeMarker || !roadVector) {
    alert("先に方向を設定してください");
    return;
  }

  const x = parseFloat(inputX.value);
  const y = parseFloat(inputY.value);

  if (isNaN(x) || isNaN(y)) {
    alert("数値を入力してください");
    return;
  }

  const base = beforeMarker.getLatLng();
  const perp = { x: -roadVector.y, y: roadVector.x };

  const meterToLat = 1 / 111111;
  const meterToLng = 1 / (111111 * Math.cos(base.lat * Math.PI / 180));

  const lat = base.lat + (roadVector.y * x + perp.y * y) * meterToLat;
  const lng = base.lng + (roadVector.x * x + perp.x * y) * meterToLng;

  if (!afterMarker) {
    afterMarker = L.marker([lat, lng]).addTo(map);
  } else {
    afterMarker.setLatLng([lat, lng]);
  }

  updateInfo(x, y);
}

// ==============================
// 表示更新
// ==============================
function updateInfo(x, y) {
  xyInfo.innerText =
    `移設量：道路方向 ${x}m / 民地方向 ${y}m`;

  const d = beforeMarker.getLatLng().distanceTo(afterMarker.getLatLng());

  distanceInfo.innerText =
    `移設距離：約 ${d.toFixed(2)}m`;

  if (distanceLine) map.removeLayer(distanceLine);

  distanceLine = L.polyline(
    [beforeMarker.getLatLng(), afterMarker.getLatLng()],
    { color: "purple", dashArray: "5,5" }
  ).addTo(map);
}

// ==============================
// やり直し
// ==============================
function resetXY() {
  if (afterMarker) map.removeLayer(afterMarker);
  if (roadLine) map.removeLayer(roadLine);
  if (distanceLine) map.removeLayer(distanceLine);

  afterMarker = null;
  roadVector = null;

  inputX.value = "";
  inputY.value = "";
  distanceInfo.innerText = "";
  xyInfo.innerText = "";
}

// ==============================
// ★ 保存＋送信（本体）
// ==============================
function saveAndSend() {

  if (!beforeMarker || !afterMarker || !roadVector) {
    alert("位置が未確定です");
    return;
  }

  const payload = {
    caseId,
    replyTo,
    before: beforeMarker.getLatLng(),
    after: afterMarker.getLatLng(),
    xMove: parseFloat(inputX.value),
    yMove: parseFloat(inputY.value),
    distance: beforeMarker.getLatLng()
      .distanceTo(afterMarker.getLatLng()),
    timestamp: new Date().toISOString()
  };

  fetch("【ここにGASのURL】", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  })
    .then(res => res.json())
    .then(() => {
      alert("送信完了しました");
    })
    .catch(() => {
      alert("送信失敗");
    });
}
