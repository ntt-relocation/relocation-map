<?php

function clean($v) {
    return htmlspecialchars($v ?? '', ENT_QUOTES);
}

$caseId = clean($_POST['caseId']);
$replyTo = clean($_POST['replyTo']);

$before_lat = clean($_POST['before_lat']);
$before_lng = clean($_POST['before_lng']);

$after_lat = clean($_POST['after_lat']);
$after_lng = clean($_POST['after_lng']);

$xMove = clean($_POST['xMove']);
$yMove = clean($_POST['yMove']);

// ✅ 送信先
if (!empty($replyTo)) {
    $to = $replyTo;
} else {
    $to = "default@example.com";
}

// ✅ メール
$subject = "支障移転データ [$caseId]";

$message = "
案件ID: $caseId

移設量:
道路方向: $xMove m
民地方向: $yMove m

移設前:
$before_lat, $before_lng

移設後:
$after_lat, $after_lng

地図:
https://www.google.com/maps?q=$after_lat,$after_lng
";

$headers = "From: no-reply@company.local";

mail($to, $subject, $message, $headers);

// ✅ ログ保存
file_put_contents("log.txt", $message . "\n----\n", FILE_APPEND);

echo "OK";
?>
