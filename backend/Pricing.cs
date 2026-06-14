namespace Mishanya;

// Расчёт стоимости брони. Это ЗЕРКАЛО фронтового js/pricing.js.
// Любая правка тарифов/доплат должна меняться в обоих местах одинаково.
public static class Pricing
{
    public const int BaseGuests = 6;
    public const int ExtraGuestPerNight = 1000;
    public const int WoodPerNight = 2000;
    public const int Chan = 1500;
    public const int Venik = 500;
    public const int Dog = 1000;
    public const int Deposit = 10000;
    public const double PrepayRate = 0.10;

    public static int NightPrice(DateOnly d) => d.DayOfWeek switch
    {
        DayOfWeek.Saturday => 25000,
        DayOfWeek.Friday => 20000,
        DayOfWeek.Sunday => 20000,
        _ => 18000, // Пн–Чт
    };

    public static List<DateOnly> ListNights(DateOnly checkIn, DateOnly checkOut)
    {
        var nights = new List<DateOnly>();
        for (var cur = checkIn; cur < checkOut; cur = cur.AddDays(1))
            nights.Add(cur);
        return nights;
    }

    public record Line(string Label, int Sum);
    public record Quote(int NightsCount, List<Line> Lines, int Total, int Prepay, int DepositAmount);

    // payingGuests = взрослые + дети старше 10 лет
    public static Quote Calc(DateOnly checkIn, DateOnly checkOut, int payingGuests,
                             bool wood, bool chan, int veniki, bool dog)
    {
        var nights = ListNights(checkIn, checkOut);
        int n = nights.Count;
        var lines = new List<Line>();

        int tariff = nights.Sum(NightPrice);
        lines.Add(new($"Проживание · {n} ноч.", tariff));

        int extra = Math.Max(0, payingGuests - BaseGuests);
        int extraSum = extra * ExtraGuestPerNight * n;
        if (extra > 0) lines.Add(new($"Доп. гости: {extra} × 1000 ₽ × {n} сут.", extraSum));

        int woodSum = wood ? WoodPerNight * n : 0;
        if (wood) lines.Add(new($"Дрова · {n} сут.", woodSum));

        int chanSum = chan ? Chan : 0;
        if (chan) lines.Add(new("Набор в чан", chanSum));

        int venikSum = veniki * Venik;
        if (veniki > 0) lines.Add(new($"Веники · {veniki} шт.", venikSum));

        int dogSum = dog ? Dog : 0;
        if (dog) lines.Add(new("Собака", dogSum));

        int total = tariff + extraSum + woodSum + chanSum + venikSum + dogSum;
        int prepay = (int)Math.Round(total * PrepayRate);
        return new(n, lines, total, prepay, Deposit);
    }
}
