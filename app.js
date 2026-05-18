// ==============================
// URLパラメータ
// ==============================
const params = new URLSearchParams(window.location.search);
const caseId = params.get("caseId");
const replyTo = params.get("replyTo");

if (!caseId || !replyTo) {
  alert("URLが不正です");
}

// ==============================
// 地図
// ==============================
const map = L.map("map").setView([35.4437, 139.6380], 16);

L.tileLayer(
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
).addTo(map);

// ==============================
// 状態
// ==============================
let placingPole = false;
let roadMode = false;
let moveSelectMode = false;

let beforeMarker = null;
let afterMarker = null;
let roadVector = null;
let roadLine = null;
let distanceLine = null;

// ==============================
// 住所検索
// ==============================
function searchAddress() {
  const address = document.getElementById("address").value;

  if (!address) return alert("住所入力してください");

  fetch("https://nominatim.openstreetmap.org/search?format=json&q=" + encodeURIComponent(address))
    .then(res => res.json())
    .then(data => {
      if (!data.length) return alert("見つかりません");
      map.setView([data[0].lat, data[0].lon], 18);
    });
}

// ==============================
// 電柱設置
// ==============================
function setPole() {
  placingPole = true;
  alert("電柱位置をクリックしてください");
}

// ==============================
// 道路方向指定
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
// ✅ 移設先クリックモード（追加）
// ==============================
function enableMoveSelectMode() {
  if (!beforeMarker || !roadVector) {
    alert("電柱と道路方向を設定してください");
    return;
  }
  moveSelectMode = true;
  alert("移設先をクリックしてください");
}

// ==============================
// 地図クリック
// ==============================
map.on("click", e => {

  // ✅ 移設先クリック（自動計算）
  if (moveSelectMode) {
    const base = beforeMarker.getLatLng();
    const target = e.latlng;

    const dx = target.lng - base.lng;
    const dy = target.lat - base.lat;

    const meterX = dx * 111111 * Math.cos(base.lat * Math.PI / 180);
    const meterY = dy * 111111;

    const road = roadVector;
    const perp = { x: -road.y, y: road.x };

    const xMove = meterX * road.x + meterY * road.y;
    const yMove = meterX * perp.x + meterY * perp.y;

    inputX.value = xMove.toFixed(2);
    inputY.value = yMove.toFixed(2);

    applyXYMove();

    moveSelectMode = false;
    return;
  }

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

  beforeMarker = L.marker(e.latlng, { draggable: true }).addTo(map);

  beforeMarker.on("dragend", () => {
    if (afterMarker && roadVector) {
      applyXYMove();
    }
  });

  placingPole = false;
});

// ==============================
// XY配置
// ==============================
function applyXYMove() {

  if (!beforeMarker || !roadVector) {
    alert("方向設定してください");
    return;
  }

  const x = parseFloat(inputX.value);
  const y = parseFloat(inputY.value);

  if (isNaN(x) || isNaN(y)) return;

  const base = beforeMarker.getLatLng();
  const perp = { x: -roadVector.y, y: roadVector.x };

  const lat = base.lat + (roadVector.y * x + perp.y * y) / 111111;
  const lng = base.lng + (roadVector.x * x + perp.x * y) / (111111 * Math.cos(base.lat * Math.PI / 180));

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

  const base = beforeMarker.getLatLng();
  const d = base.distanceTo(afterMarker.getLatLng());

  xyInfo.innerText =
    `移設量：道路方向 ${x.toFixed(2)} m / 民地方向 ${y.toFixed(2)} m`;

  distanceInfo.innerText =
    `移設距離：約 ${d.toFixed(2)} m`;

  if (distanceLine) map.removeLayer(distanceLine);

  distanceLine = L.polyline(
    [base, afterMarker.getLatLng()],
    { color: "purple", dashArray: "5,5" }
  ).addTo(map);
}

// ==============================
// リセット
// ==============================
function resetXY() {
  if (afterMarker) map.removeLayer(afterMarker);
  if (roadLine) map.removeLayer(roadLine);
  if (distanceLine) map.removeLayer(distanceLine);

  afterMarker = null;
  roadVector = null;

  inputX.value = "";
  inputY.value = "";

  xyInfo.innerText = "";
  distanceInfo.innerText = "";
}

// ==============================
// 送信
// ==============================
function saveAndSend() {

  if (!beforeMarker || !afterMarker || !roadVector) {
    alert("位置未確定");
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

  fetch("【ここにGAS URL】", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  })
    .then(() => alert("送信完了"))
    .catch(() => alert("送信失敗"));
}
