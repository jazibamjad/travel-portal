namespace Api.Services;

public static class DateMath
{
    /// <summary>Inclusive day count between two dates, mirroring the prototype's daysBetween(): a single date counts as 1 day.</summary>
    public static int DaysBetween(DateOnly? from, DateOnly? to)
    {
        if (from is null) return 0;
        var end = to ?? from.Value;
        if (end < from.Value) end = from.Value;
        return end.DayNumber - from.Value.DayNumber + 1;
    }
}
