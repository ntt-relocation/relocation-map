// URL取得
const params = new URLSearchParams(window.location.search);
const caseId = params.get("caseId");
const replyTo = params.get("replyTo");

// 地図
const map = L.map("map").setView([35.4437, 139.6380], 16);

L.tileLayer(
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
).addTo(map);

// ✅ カスタムアイコン
const blueIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  iconSize: [25, 41]
});

const redIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  iconSize: [25, 41]
});

// 状態
let placingPole = false;
let roadMode = false;
let beforeMarker = null;
let afterMarker = null;
let roadVector = null;

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
  if (!beforeMarker) return alert("先に電柱");
  roadMode = true;
}

// クリック処理
map.on("click", e => {

  const latlng = e.latlng;

  // 道路方向
  if (roadMode) {
    const base = beforeMarker.getLatLng();
    const dx = latlng.lng - base.lng;
    const dy = latlng.lat - base.lat;
    const len = Math.sqrt(dx * dx + dy * dy);

    roadVector = { x: dx / len, y: dy / len };

    L.polyline([base, latlng], { color: "blue", weight: 4 }).addTo(map);

    roadMode = false;
    return;
  }

  // 電柱
  if (placingPole) {
    if (beforeMarker) map.removeLayer(beforeMarker);

    beforeMarker = L.marker(latlng, {
      draggable: true,
      icon: blueIcon
    }).addTo(map);

    placingPole = false;
    return;
  }

  // ✅ 移設位置（本命）
  if (!beforeMarker || !roadVector) {
    alert("電柱と道路方向設定してください");
    return;
  }

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

  // ✅ 表示ズラし（重要）
  const offset = 0.5;
  const lat = latlng.lat + offset / 111111;
  const lng = latlng.lng + offset / (111111 * Math.cos(base.lat * Math.PI / 180));

  if (!afterMarker) {
    afterMarker = L.marker([lat, lng], { icon: redIcon }).addTo(map);
  } else {
    afterMarker.setLatLng([lat, lng]);
  }

  const d = base.distanceTo(latlng);

  xyInfo.innerText = `道路 ${xMove.toFixed(2)}m / 民地 ${yMove.toFixed(2)}m`;
  distanceInfo.innerText = `距離：約 ${d.toFixed(2)}m`;
});

// 送信
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
