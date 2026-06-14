using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace Mishanya;

// Создаёт платёж на предоплату через ЮKassa и обрабатывает вебхук подтверждения.
// Деньги поступают на счёт/карту, привязанные к вашему магазину ЮKassa.
//
// Что нужно от вас (один раз):
//   1. Зарегистрировать магазин на yookassa.ru, привязать карту/счёт для выплат.
//   2. Получить shopId и секретный ключ (Настройки -> API ключи).
//   3. Прописать их в appsettings.json (YooKassa:ShopId, YooKassa:SecretKey).
//   4. В ЛК ЮKassa указать URL вебхука: https://ваш-домен/api/payment/webhook
//
// Если ключи не заданы — сервис работает в ДЕМО-режиме: возвращает пустую
// ссылку, фронт показывает сообщение и предлагает бронь по телефону.
public class PaymentService
{
    private readonly HttpClient _http;
    private readonly string _shopId;
    private readonly string _secret;
    private readonly string _returnUrl;

    public PaymentService(HttpClient http, IConfiguration cfg)
    {
        _http = http;
        _shopId = cfg["YooKassa:ShopId"] ?? "";
        _secret = cfg["YooKassa:SecretKey"] ?? "";
        _returnUrl = cfg["Site:ReturnUrl"] ?? "https://example.com/booking.html?paid=1";
    }

    private bool Configured => !string.IsNullOrEmpty(_shopId) && !string.IsNullOrEmpty(_secret);

    public async Task<(string paymentUrl, string paymentId)> CreatePrepaymentAsync(int amountRub, string description)
    {
        if (!Configured)
            return ("", "demo-no-acquiring");

        var idempotenceKey = Guid.NewGuid().ToString();
        var payload = new
        {
            amount = new { value = amountRub.ToString("0.00", System.Globalization.CultureInfo.InvariantCulture), currency = "RUB" },
            capture = true,
            confirmation = new { type = "redirect", return_url = _returnUrl },
            description
        };

        var req = new HttpRequestMessage(HttpMethod.Post, "https://api.yookassa.ru/v3/payments");
        var auth = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{_shopId}:{_secret}"));
        req.Headers.Authorization = new AuthenticationHeaderValue("Basic", auth);
        req.Headers.Add("Idempotence-Key", idempotenceKey);
        req.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

        try
        {
            var resp = await _http.SendAsync(req);
            var json = await resp.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            var id = root.GetProperty("id").GetString() ?? "";
            var url = root.GetProperty("confirmation").GetProperty("confirmation_url").GetString() ?? "";
            return (url, id);
        }
        catch
        {
            return ("", "error");
        }
    }

    // Вебхук ЮKassa: событие payment.succeeded подтверждает оплату.
    public async Task<bool> HandleWebhookAsync(HttpRequest http)
    {
        try
        {
            using var reader = new StreamReader(http.Body);
            var body = await reader.ReadToEndAsync();
            using var doc = JsonDocument.Parse(body);
            var ev = doc.RootElement.GetProperty("event").GetString();
            return ev == "payment.succeeded";
        }
        catch { return false; }
    }
}
