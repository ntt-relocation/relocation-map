// URLパラメータ取得
const params = new URLSearchParams(window.location.search);
const caseId = params.get("caseId");
const replyTo = params.get("replyTo");

// 地図
const map = L.map("map").setView([35.4437, 139.6380], 16);

L.tileLayer(
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
).addTo(map);

// アイコン
const blueIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  iconSize: [18, 30],
  iconAnchor: [9, 30]
});

const redIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  iconSize: [18, 30],
  iconAnchor: [9, 30]
});

// 状態
let placingPole = false;
let roadMode = false;

let beforeMarker = null;
let afterMarker = null;
let roadVector = null;
let roadLine = null;

// 住所検索
function searchAddress() {
  const address = document.getElementById("address").value;
  if (!address) return;

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
  alert("電柱をクリックしてください");
}

// 道路方向
function enableRoadDirectionMode() {
  if (!beforeMarker) {
    alert("先に電柱を置いてください");
    return;
  }
  roadMode = true;
  alert("方向をクリックしてください");
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

    if (roadLine) map.removeLayer(roadLine);
    roadLine = L.polyline([base, latlng], { color: "blue" }).addTo(map);

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

  // 移設
  if (!beforeMarker || !roadVector) {
    alert("電柱と道路方向を先に設定してください");
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

  afterMarker = L.marker(latlng, { icon: redIcon }).addTo(map);
});

// ✅ 送信（ここが最重要）
function saveAndSend() {
  if (!beforeMarker || !afterMarker) {
    alert("位置を確定してください");
    return;
  }

  fetch("send.php", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      caseId: caseId,
      replyTo: replyTo,
      before_lat: beforeMarker.getLatLng().lat,
      before_lng: beforeMarker.getLatLng().lng,
      after_lat: afterMarker.getLatLng().lat,
      after_lng: afterMarker.getLatLng().lng,
      xMove: inputX.value,
      yMove: inputY.value
    })
  })
  .then(res => res.text())
  .then(() => alert("送信完了"))
  .catch(() => alert("送信失敗"));
}
