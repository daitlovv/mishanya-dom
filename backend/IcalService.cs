using System.Globalization;

namespace Mishanya;

// Тянет занятые даты из вашего календаря Циан (.ics) и отдаёт список 'YYYY-MM-DD'.
// Циан публикует брони как VEVENT с DTSTART/DTEND (даты), занимаем все дни [start, end).
public class IcalService
{
    private readonly HttpClient _http;
    private readonly string _icalUrl;
    private List<string> _cache = new();
    private DateTime _cacheAt = DateTime.MinValue;

    public IcalService(HttpClient http, IConfiguration cfg)
    {
        _http = http;
        _icalUrl = cfg["Cian:IcalUrl"] ?? "";
    }

    public async Task<List<string>> GetBusyDatesAsync()
    {
        // кэш на 30 минут, чтобы не дёргать Циан на каждый запрос
        if ((DateTime.UtcNow - _cacheAt).TotalMinutes < 30 && _cache.Count > 0)
            return _cache;

        var busy = new HashSet<string>();
        try
        {
            var text = await _http.GetStringAsync(_icalUrl);
            DateOnly? start = null, end = null;
            foreach (var raw in text.Split('\n'))
            {
                var line = raw.Trim();
                if (line.StartsWith("BEGIN:VEVENT")) { start = end = null; }
                else if (line.StartsWith("DTSTART")) start = ParseDate(line);
                else if (line.StartsWith("DTEND")) end = ParseDate(line);
                else if (line.StartsWith("END:VEVENT") && start is DateOnly s)
                {
                    var e = end ?? s.AddDays(1);
                    for (var d = s; d < e; d = d.AddDays(1))
                        busy.Add(d.ToString("yyyy-MM-dd"));
                }
            }
            _cache = busy.OrderBy(x => x).ToList();
            _cacheAt = DateTime.UtcNow;
        }
        catch
        {
            // если Циан недоступен — отдаём прошлый кэш (пустой при первом запуске)
        }
        return _cache;
    }

    private static DateOnly? ParseDate(string line)
    {
        var val = line.Split(':').Last().Trim();
        val = val.Length >= 8 ? val[..8] : val; // YYYYMMDD
        return DateOnly.TryParseExact(val, "yyyyMMdd", CultureInfo.InvariantCulture,
            DateTimeStyles.None, out var d) ? d : null;
    }
}
