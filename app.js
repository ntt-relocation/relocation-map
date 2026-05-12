// ==============================
// 地図初期表示
// ==============================
const map = L.map("map", { maxZoom: 22 })
  .setView([35.4437, 139.6380], 16);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 22,
  maxNativeZoom: 19,
  attribution: "© OpenStreetMap contributors"
}).addTo(map);

// ==============================
// 状態管理
// ==============================
let placingPole = false;
let roadDirectionMode = false;

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
  roadDirectionMode = false;
  alert("移設前電柱を地図上でクリックしてください");
}

// ==============================
// 道路方向指定
// ==============================
function enableRoadDirectionMode() {
  if (!beforeMarker) {
    alert("先に移設前電柱を置いてください");
    return;
  }
  placingPole = false;
  roadDirectionMode = true;
  alert("移設前電柱から道路方向の点を1回クリックしてください");
}

// ==============================
// 地図クリック処理
// ==============================
map.on("click", e => {

  // --- 道路方向指定 ---
  if (roadDirectionMode && beforeMarker) {
    const base = beforeMarker.getLatLng();
    const target = e.latlng;

    const dx = target.lng - base.lng;
    const dy = target.lat - base.lat;
    const len = Math.sqrt(dx * dx + dy * dy);

    roadVector = { x: dx / len, y: dy / len };

    if (roadLine) map.removeLayer(roadLine);
    roadLine = L.polyline([base, target], {
      color: "blue",
      dashArray: "5,5",
      weight: 3
    }).addTo(map);

    roadDirectionMode = false;
    alert("道路方向を設定しました");
    return;
  }

  // --- 移設前電柱配置 ---
  if (!placingPole) return;

  beforeMarker = L.marker(e.latlng, {
    draggable: false,
    icon: L.divIcon({
      html: `<span style="color:red;font-size:18px;">●</span>`
    })
  }).addTo(map)
    .bindPopup("移設前電柱");

  map.setView(beforeMarker.getLatLng(), 21);
  placingPole = false;
});

// ==============================
// XY入力で配置
// ==============================
function applyXYMove() {
  if (!beforeMarker || !roadVector) {
    alert("移設前電柱と道路方向を設定してください");
    return;
  }

  const x = parseFloat(document.getElementById("inputX").value);
  const y = parseFloat(document.getElementById("inputY").value);
  if (isNaN(x) || isNaN(y)) {
    alert("数値を入力してください");
    return;
  }

  const base = beforeMarker.getLatLng();
  const perp = { x: -roadVector.y, y: roadVector.x };

  const meterToLat = 1 / 111111;
  const meterToLng =
    1 / (111111 * Math.cos(base.lat * Math.PI / 180));

  const newLat =
    base.lat +
    (roadVector.y * x + perp.y * y) * meterToLat;
  const newLng =
    base.lng +
    (roadVector.x * x + perp.x * y) * meterToLng;

  if (!afterMarker) {
    afterMarker = L.marker([newLat, newLng], {
      draggable: false,
      icon: L.divIcon({
        html: `<span style="color:green;font-size:18px;">●</span>`
      })
    }).addTo(map)
      .bindPopup("移設後電柱");
  } else {
    afterMarker.setLatLng([newLat, newLng]);
  }

  map.setView(afterMarker.getLatLng(), 21);
  updateXYInfo(x, y);
  recalcDistance();

  document.getElementById("inputX").disabled = true;
  document.getElementById("inputY").disabled = true;
  document.getElementById("xyApplyBtn").disabled = true;
}

// ==============================
// やり直し機能
// ==============================
function resetXY() {
  if (afterMarker) {
    map.removeLayer(afterMarker);
    afterMarker = null;
  }
  if (roadLine) {
    map.removeLayer(roadLine);
    roadLine = null;
  }
  if (distanceLine) {
    map.removeLayer(distanceLine);
    distanceLine = null;
  }

  roadVector = null;

  document.getElementById("distanceInfo").innerText = "";
  document.getElementById("xyInfo").innerText = "";

  document.getElementById("inputX").disabled = false;
  document.getElementById("inputY").disabled = false;
  document.getElementById("xyApplyBtn").disabled = false;
  document.getElementById("inputX").value = "";
  document.getElementById("inputY").value = "";

  alert("道路方向と移設量をやり直してください");
}

// ==============================
// 表示更新
// ==============================
function updateXYInfo(x, y) {
  const sx = x >= 0 ? "+" : "";
  const sy = y >= 0 ? "+" : "";
  document.getElementById("xyInfo").innerText =
    `移設量：道路方向 ${sx}${x.toFixed(2)} m / 民地方向 ${sy}${y.toFixed(2)} m`;
}

function recalcDistance() {
  if (!beforeMarker || !afterMarker) return;

  const d =
    beforeMarker.getLatLng()
      .distanceTo(afterMarker.getLatLng());

  document.getElementById("distanceInfo").innerText =
    `移設距離：約 ${d.toFixed(2)} m`;

  if (distanceLine) map.removeLayer(distanceLine);
  distanceLine = L.polyline(
    [beforeMarker.getLatLng(), afterMarker.getLatLng()],
    { color: "purple", dashArray: "5,5" }
  ).addTo(map);
}

// ==============================
// 住所検索
// ==============================
function searchAddress() {
  const addr = document.getElementById("address").value;
  if (!addr) return;

  fetch(
    `https://nominatim.openstreetmap.org/search` +
    `?format=json&limit=1&accept-language=ja&countrycodes=jp&q=${encodeURIComponent(addr)}`
  )
    .then(res => res.json())
    .then(data => {
      if (!data.length) {
        alert("住所が見つかりません");
        return;
      }
      map.setView(
        [Number(data[0].lat), Number(data[0].lon)],
        18
      );
    });
}
``