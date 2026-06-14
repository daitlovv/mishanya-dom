using Mishanya;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddHttpClient();
builder.Services.AddSingleton<IcalService>();
builder.Services.AddSingleton<TelegramService>();
builder.Services.AddSingleton<PaymentService>();
var app = builder.Build();

// Отдаём статический сайт (положите фронт рядом, в wwwroot, или настройте проксирование)
app.UseDefaultFiles();
app.UseStaticFiles();

// ---- Занятые даты для календаря ----
app.MapGet("/api/availability", async (IcalService ical) =>
{
    var busy = await ical.GetBusyDatesAsync();
    return Results.Json(new { busy });
});

// ---- Создание брони + платёжная ссылка ----
app.MapPost("/api/book", async (BookRequest req, IcalService ical,
                                 TelegramService tg, PaymentService pay) =>
{
    // 1. валидация дат
    if (!DateOnly.TryParse(req.CheckIn, out var ci) || !DateOnly.TryParse(req.CheckOut, out var co) || co <= ci)
        return Results.BadRequest(new { error = "Некорректные даты" });

    // 2. проверка занятости на сервере (защита от гонок)
    var busy = (await ical.GetBusyDatesAsync()).ToHashSet();
    foreach (var d in Pricing.ListNights(ci, co))
        if (busy.Contains(d.ToString("yyyy-MM-dd")))
            return Results.Conflict(new { error = "Выбранные даты уже заняты" });

    // 3. серверный пересчёт цены (фронту не доверяем)
    int payingKids = (req.KidAges ?? new()).Count(a => a > 10); // 10 включительно бесплатно
    int payingGuests = req.Adults + payingKids;
    var q = Pricing.Calc(ci, co, payingGuests, req.Wood, req.Chan, req.Veniki, req.Dog);

    // 4. создаём платёж на ПРЕДОПЛАТУ (деньги идут на карту/счёт хозяина у эквайера)
    var (paymentUrl, paymentId) = await pay.CreatePrepaymentAsync(q.Prepay,
        $"Предоплата 10% · {req.CheckIn}–{req.CheckOut} · {req.Name}");

    // 5. уведомление в Telegram
    await tg.NotifyAsync(
        $"<b>Новая бронь «Мишаня»</b>\n" +
        $"📅 {req.CheckIn} → {req.CheckOut} ({q.NightsCount} ноч.)\n" +
        $"👤 {req.Name}, {req.Phone}\n" +
        $"👥 гостей платных: {payingGuests}\n" +
        $"💰 итого {q.Total} ₽, предоплата {q.Prepay} ₽\n" +
        $"🧾 платёж: {paymentId}");

    return Results.Json(new { paymentUrl, total = q.Total, prepay = q.Prepay });
});

// ---- Вебхук от эквайера: подтверждение оплаты ----
app.MapPost("/api/payment/webhook", async (HttpRequest http, TelegramService tg, PaymentService pay) =>
{
    var ok = await pay.HandleWebhookAsync(http);
    if (ok) await tg.NotifyAsync("✅ Предоплата получена — бронь подтверждена.");
    return Results.Ok();
});

app.Run();

// ---- DTO запроса брони ----
record BookRequest(
    string CheckIn, string CheckOut,
    int Adults, List<int>? KidAges,
    bool Wood, bool Chan, int Veniki, bool Dog,
    string Name, string Phone);
