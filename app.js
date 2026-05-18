// URL取得
const params = new URLSearchParams(window.location.search);
const caseId = params.get("caseId");
const replyTo = params.get("replyTo");

// 地図
const map = L.map("map").setView([35.4437, 139.6380], 16);

L.tileLayer(
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
).addTo(map);

// 状態
let placingPole = false;
let roadMode = false;

let beforeMarker = null;
let afterMarker = null;
let roadVector = null;
let roadLine = null;
let distanceLine = null;

// 住所検索
function searchAddress() {
  const address = document.getElementById("address").value;

  fetch("https://nominatim.openstreetmap.org/search?format=json&q=" + encodeURIComponent(address))
    .then(res => res.json())
    .then(data => {
      if (!data.length) return alert("見つかりません");
      map.setView([data[0].lat, data[0].lon], 18);
    });
}

// 電柱
function setPole() {
  placingPole = true;
}

// 道路方向
function enableRoadDirectionMode() {
  if (!beforeMarker) return alert("電柱先に置いて");
  roadMode = true;
}

// クリック
map.on("click", e => {

  const latlng = e.latlng;

  // 道路方向
  if (roadMode) {
    const base = beforeMarker.getLatLng();

    const dx = latlng.lng - base.lng;
    const dy = latlng.lat - base.lat;
    const len = Math.sqrt(dx * dx + dy * dy);

    roadVector = { x: dx / len, y: dy / len };

    if (roadLine) map.removeLayer(roadLine);

    roadLine = L.polyline([base, latlng], {
      color: "blue"
    }).addTo(map);

    roadMode = false;
    return;
  }

  // 電柱
  if (placingPole) {

    if (beforeMarker) map.removeLayer(beforeMarker);

    beforeMarker = L.marker(latlng, { draggable: true }).addTo(map);

    beforeMarker.on("dragend", () => {
      if (afterMarker && roadVector) autoCalc();
    });

    placingPole = false;
    return;
  }

  // ✅ 移設位置クリック → 自動計算
  if (beforeMarker && roadVector) {

    const base = beforeMarker.getLatLng();

    const dx = latlng.lng - base.lng;
    const dy = latlng.lat - base.lat;

    const meterX = dx * 111111 * Math.cos(base.lat * Math.PI / 180);
    const meterY = dy * 111111;

    const road = roadVector;
    const perp = { x: -road.y, y: road.x };

    const xMove = meterX * road.x + meterY * road.y;
    const yMove = meterX * perp.x + meterY * perp.y;

    inputX.value = xMove.toFixed(2);
    inputY.value = yMove.toFixed(2);

    applyXYMove();
  }

});

// XY配置
function applyXYMove() {

  const x = parseFloat(inputX.value);
  const y = parseFloat(inputY.value);

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

// 自動再計算（ドラッグ用）
function autoCalc() {

  const base = beforeMarker.getLatLng();
  const target = afterMarker.getLatLng();

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

  updateInfo(xMove, yMove);
}

// 表示更新
function updateInfo(x, y) {

  const d = beforeMarker.getLatLng().distanceTo(afterMarker.getLatLng());

  xyInfo.innerText =
    `移設量：道路方向 ${x.toFixed(2)} m / 民地方向 ${y.toFixed(2)} m`;

  distanceInfo.innerText =
    `移設距離：約 ${d.toFixed(2)} m`;

}

// リセット
function resetXY() {
  if (afterMarker) map.removeLayer(afterMarker);
  afterMarker = null;
}

// 送信
function saveAndSend() {

  const payload = {
    caseId,
    replyTo,
    before: beforeMarker.getLatLng(),
    after: afterMarker.getLatLng(),
    xMove: parseFloat(inputX.value),
    yMove: parseFloat(inputY.value)
  };

  fetch("【GAS URL】", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  })
    .then(() => alert("送信完了"))
    .catch(() => alert("送信失敗"));
}
