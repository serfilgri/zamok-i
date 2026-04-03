<?php
declare(strict_types=1);

header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
  http_response_code(405);
  echo json_encode(["ok" => false, "error" => "method_not_allowed"], JSON_UNESCAPED_UNICODE);
  exit;
}

$rawBody = file_get_contents("php://input");
$payload = json_decode($rawBody ?: "", true);

if (!is_array($payload)) {
  http_response_code(400);
  echo json_encode(["ok" => false, "error" => "invalid_json"], JSON_UNESCAPED_UNICODE);
  exit;
}

function clean_text(mixed $value, int $maxLen = 400): string {
  $text = trim((string)$value);
  $text = preg_replace('/[\r\n\t]+/u', ' ', $text) ?? '';
  $text = strip_tags($text);
  if (mb_strlen($text) > $maxLen) {
    $text = mb_substr($text, 0, $maxLen);
  }
  return $text;
}

$name = clean_text($payload["name"] ?? "");
$phone = clean_text($payload["phone"] ?? "");
$comment = clean_text($payload["message"] ?? ($payload["comment"] ?? ""), 1200);
$page = clean_text($payload["page"] ?? "", 600);
$formName = clean_text($payload["form"] ?? "contact_form", 120);
$createdAt = clean_text($payload["createdAt"] ?? "", 120);

if ($name === "" || $phone === "") {
  http_response_code(422);
  echo json_encode(["ok" => false, "error" => "name_or_phone_required"], JSON_UNESCAPED_UNICODE);
  exit;
}

if (mb_strlen($phone) < 6) {
  http_response_code(422);
  echo json_encode(["ok" => false, "error" => "invalid_phone"], JSON_UNESCAPED_UNICODE);
  exit;
}

$host = $_SERVER["HTTP_HOST"] ?? "zamok-i.ru";
$hostOnly = preg_replace('/:\d+$/', '', $host) ?? $host;
$isLocalHost = $hostOnly === "localhost"
  || $hostOnly === "127.0.0.1"
  || str_ends_with($hostOnly, ".local");
$to = "info@zamok-i.ru";
$subject = "Новая заявка с сайта zamok-i";

$lines = [
  "Новая заявка с сайта",
  "",
  "Имя: " . $name,
  "Телефон: " . $phone,
];

if ($comment !== "") {
  $lines[] = "Комментарий: " . $comment;
}

$lines[] = "Форма: " . $formName;
if ($page !== "") {
  $lines[] = "Страница: " . $page;
}
if ($createdAt !== "") {
  $lines[] = "Время (ISO): " . $createdAt;
}
$lines[] = "IP: " . ($_SERVER["REMOTE_ADDR"] ?? "unknown");
$lines[] = "User-Agent: " . clean_text($_SERVER["HTTP_USER_AGENT"] ?? "", 500);

$message = implode("\n", $lines);

if ($isLocalHost) {
  echo json_encode([
    "ok" => true,
    "warning" => "mail_disabled_in_local_environment",
  ], JSON_UNESCAPED_UNICODE);
  exit;
}

// In production we keep real e-mail delivery.
$encodedSubject = "=?UTF-8?B?" . base64_encode($subject) . "?=";
$from = "no-reply@" . $hostOnly;
$headers = [
  "MIME-Version: 1.0",
  "Content-Type: text/plain; charset=UTF-8",
  "From: zamok-i <{$from}>",
  "Reply-To: {$to}",
];

$sent = @mail($to, $encodedSubject, $message, implode("\r\n", $headers));
if (!$sent) {
  http_response_code(500);
  echo json_encode(["ok" => false, "error" => "mail_send_failed"], JSON_UNESCAPED_UNICODE);
  exit;
}

echo json_encode(["ok" => true], JSON_UNESCAPED_UNICODE);
