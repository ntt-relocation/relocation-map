// ✅ URLパラメータ
const params = new URLSearchParams(window.location.search);
const caseId = params.get("caseId");
const replyTo = params.get("replyTo");

if (!caseId || !replyTo) {
  alert("URLが不正です");
}

// ✅ 地図
const map = L.map("map").setView([35.4437, 139.6380], 16);

L.tileLayer(
"https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
).addTo(map);

// ✅ 状態
let placingPole = false;
let roadMode = false;

let beforeMarker = null;
let afterMarker = null;
let roadVector = null;
let roadLine = null;
let distanceLine = null;

// ✅ 住所検索
function searchAddress() {
  const address = addressInput.value;

  fetch("https://nominatim.openstreetmap.org/search?format=json&q=" + address)
    .then(res => res.json())
    .then(data => {
      if (!data.length) return alert("見つかりません");
      map.setView([data[0].lat, data[0].lon], 18);
    });
}

// ✅ 電柱設置
function setPole() {
  placingPole = true;
}

// ✅ 道路方向
function enableRoadDirectionMode() {
  if (!beforeMarker) return alert("先に電柱を置いてください");
  roadMode = true;
}

// ✅ 地図クリック
map.on("click", e => {

  if (roadMode) {
    const base = beforeMarker.getLatLng();
    const target = e.latlng;

    const dx = target.lng - base.lng;
    const dy = target.lat - base.lat;
    const len = Math.sqrt(dx * dx + dy * dy);

    roadVector = { x: dx / len, y: dy / len };

    if (roadLine) map.removeLayer(roadLine);
    roadLine = L.polyline([base, target], { color: "blue" }).addTo(map);

    roadMode = false;
    return;
  }

  if (!placingPole) return;

  if (beforeMarker) map.removeLayer(beforeMarker);

  beforeMarker = L.marker(e.latlng, { draggable: true }).addTo(map);

  beforeMarker.on("dragend", () => {
    if (afterMarker && roadVector) applyXYMove();
  });

  placingPole = false;
});

// ✅ XY移動
function applyXYMove() {

  if (!beforeMarker || !roadVector) {
    alert("方向設定してください");
    return;
  }

  const x = parseFloat(inputX.value);
  const y = parseFloat(inputY.value);

  const base = beforeMarker.getLatLng();
  const perp = { x: -roadVector.y, y: roadVector.x };

  const lat = base.lat + (roadVector.y * x + perp.y * y) / 111111;
  const lng = base.lng + (roadVector.x * x + perp.x * y) / 111111;

  if (!afterMarker) {
    afterMarker = L.marker([lat, lng]).addTo(map);
  } else {
    afterMarker.setLatLng([lat, lng]);
  }

  const d = base.distanceTo(afterMarker.getLatLng());

  xyInfo.innerText = `X:${x}m Y:${y}m`;
  distanceInfo.innerText = `距離：約${d.toFixed(2)}m`;

  if (distanceLine) map.removeLayer(distanceLine);
  distanceLine = L.polyline([base, afterMarker.getLatLng()], { color: "purple" }).addTo(map);
}

// ✅ リセット
function resetXY() {
  if (afterMarker) map.removeLayer(afterMarker);
  afterMarker = null;
  roadVector = null;
}

// ✅ ストリートビュー
function openStreetView() {
  if (!beforeMarker) return alert("電柱を置いてください");

  const p = beforeMarker.getLatLng();

  window.open(
    `https://www.google.com/maps?q=&layer=c&cbll=${p.lat},${p.lng}`,
    "_blank"
  );
}

// ✅ 送信
function saveAndSend() {

  if (!beforeMarker || !afterMarker) {
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
    distance: beforeMarker.getLatLng().distanceTo(afterMarker.getLatLng())
  };

  fetch("【ここにGAS URL】", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  })
    .then(() => alert("送信完了"))
    .catch(() => alert("失敗"));
}
