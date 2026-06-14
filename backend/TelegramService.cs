using System.Text;
using System.Text.Json;

namespace Mishanya;

// Шлёт уведомление о новой брони в Telegram (@daitlov).
// Нужен бот: напишите @BotFather → /newbot → получите токен.
// chatId узнать: напишите боту любое сообщение, затем
// https://api.telegram.org/bot<ТОКЕН>/getUpdates → поле chat.id
public class TelegramService
{
    private readonly HttpClient _http;
    private readonly string _token;
    private readonly string _chatId;

    public TelegramService(HttpClient http, IConfiguration cfg)
    {
        _http = http;
        _token = cfg["Telegram:BotToken"] ?? "";
        _chatId = cfg["Telegram:ChatId"] ?? "";
    }

    public async Task NotifyAsync(string text)
    {
        if (string.IsNullOrEmpty(_token) || string.IsNullOrEmpty(_chatId)) return;
        var url = $"https://api.telegram.org/bot{_token}/sendMessage";
        var payload = new { chat_id = _chatId, text, parse_mode = "HTML" };
        var body = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
        try { await _http.PostAsync(url, body); } catch { /* не валим бронь из-за уведомления */ }
    }
}
