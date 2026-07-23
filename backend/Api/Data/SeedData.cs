using Api.Entities;
using Api.Services;
using Microsoft.EntityFrameworkCore;

namespace Api.Data;

/// <summary>
/// Idempotent demo-data seeding, reusing the original prototype's fictional dataset
/// (trimmed for size) per the assignment's process requirement to ship meaningful seed data.
/// Skips entirely if trips already exist, so re-running `docker compose up` never duplicates data.
/// </summary>
public static class SeedData
{
    public static async Task SeedAsync(AppDbContext db, PasswordHasher hasher)
    {
        if (await db.Trips.AnyAsync()) return;

        var peopleByName = new Dictionary<string, Person>();
        Person AddPerson(string name, string title, string function, bool isCeo = false)
        {
            var p = new Person { FullName = name, Title = title, Function = function, IsCeo = isCeo };
            db.People.Add(p);
            peopleByName[name] = p;
            return p;
        }

        AddPerson("Alex Morgan", "Group CEO", "Executive Office", isCeo: true);
        AddPerson("Jamie Morgan", "Chief of Staff", "Executive Office");
        AddPerson("Sam Baker", "Group CFO", "Finance");
        AddPerson("Robin Garcia", "Head of Legal", "Legal");
        AddPerson("Wesley Stone", "VP Strategy", "Strategy");
        AddPerson("Kevin Marks", "Advisor", "External");
        AddPerson("Grace Hall", "Executive Coordinator", "CEO Office");
        AddPerson("Pierre", "Regional Director APAC", "Operations");
        await db.SaveChangesAsync();

        var citiesByLabel = new Dictionary<string, City>();
        City AddCity(string label, params (string Name, string Role, string? Email)[] contacts)
        {
            var parts = label.Split(',', 2);
            var city = new City { CityName = parts[0].Trim(), Country = parts.Length > 1 ? parts[1].Trim() : "", Label = label };
            foreach (var c in contacts)
                city.Contacts.Add(new Contact { Name = c.Name, OrgRole = c.Role, Email = c.Email });
            db.Cities.Add(city);
            citiesByLabel[label] = city;
            return city;
        }

        AddCity("Prague, Czechia",
            ("Karel Novak", "Northwind — Group Finance & Accounting Director", null),
            ("Elena Vargova", "VLTAVA Tax & Legal — Managing Partner", null),
            ("Petra Svobodova", "VLTAVA — Partner", null),
            ("Kevin Marks (local contact)", "Advisor / intermediary", null));
        AddCity("Vienna, Austria",
            ("Weiss family", "Vienna contact", null),
            ("Stefan Gruber", "Alpen Group", "stefan@alpengroup.example.com"));
        AddCity("Amsterdam, Netherlands",
            ("Anders Vik", "Amsterdam network", null),
            ("Chris Verhoeven", "Amsterdam network", null),
            ("Dan Hersh", "Sim & Grant", null),
            ("Derek Lau", "Northgate Bank", null),
            ("Oliver Stanton", "NRW Legal", null),
            ("John Chalmers", "Infra Finance Weekly", null));
        AddCity("New York, United States",
            ("Chase Grant", "Investor network", null),
            ("Joshua Osler", "New York contact", null),
            ("Ted Nolan", "4T Investments", "ted.nolan@4tinvest.example.com"));
        AddCity("Lisbon, Portugal",
            ("Bruno Rocha", "Lisbon network", null),
            ("Nuno Alves", "IM", null),
            ("Ana Duarte", "Lex & Partners", null));
        AddCity("Bangkok, Thailand",
            ("Somchai Prasert", "Bangkok contact", "s.prasert@example.com"),
            ("TIF (Thai Investment Fund)", "Bangkok", null));
        AddCity("Jakarta, Indonesia",
            ("Hadi Wijaya", "Jakarta contact", "hadi.wijaya@example.com"),
            ("Rudi Hartono", "Vista Invest", "rhartono@vistainvest.example.com"),
            ("Health Ministry", "Project Helix (healthcare)", null));
        AddCity("Kuala Lumpur, Malaysia",
            ("Amir Rahman", "CelNet", "amir.rahman@celnet.example.com"),
            ("National Investment Fund", "Kuala Lumpur", null));
        AddCity("Singapore, Singapore",
            ("Sofia Lam", "UrbanBank (markets)", null),
            ("Ravi Nair", "TGL", "ravi.nair@tgl.example.com"),
            ("Mei Chen", "Quayside IM", "mei.chen@quaysideim.example.com"));
        AddCity("Hong Kong, China",
            ("Victor Cheung", "Hong Kong network", null),
            ("Golden Peak", "Hong Kong", null),
            ("HQD", "Hong Kong", "w.chan@hqd.example.com"));
        AddCity("Warsaw, Poland",
            ("Marek Zielinski", "Polska Tower Co (PTC)", "marek.zielinski@ptc.example.com"));
        AddCity("Zurich, Switzerland",
            ("Helvetia Bank", "Zurich", null),
            ("MTC (Aldini)", "Zurich", null));
        AddCity("Seoul, South Korea",
            ("Seoul Sovereign Fund", "Seoul", null));
        await db.SaveChangesAsync();

        Contact Contact(string city, string name) =>
            citiesByLabel[city].Contacts.First(c => c.Name == name);

        // --- Trips ---
        var prague = new Trip
        {
            Project = "Northwind (Czechia)",
            Entity = "Northwind (JV)",
            DestinationCityId = citiesByLabel["Prague, Czechia"].Id,
            FromDate = new DateOnly(2026, 6, 23),
            ToDate = new DateOnly(2026, 6, 25),
            Status = TripStatus.Confirmed,
            Hotel = "Riverside Grand",
            Transport = "Airport transfer booked"
        };
        prague.Travellers.Add(peopleByName["Jamie Morgan"]);
        prague.Travellers.Add(peopleByName["Kevin Marks"]);
        prague.Meetings.Add(new Meeting
        {
            ContactId = Contact("Prague, Czechia", "Karel Novak").Id, OrderNum = 1, Priority = MeetingPriority.High,
            Status = MeetingStatus.Confirmed, MeetingTime = new TimeOnly(10, 0), Project = "Northwind (Czechia)", Entity = "Northwind (JV)",
            Agenda = "Walk through Northwind financials; align on valuation / NBO basis.",
            Attendees = { peopleByName["Jamie Morgan"], peopleByName["Kevin Marks"] },
            Materials = { new Material { Description = "Northwind financials review + valuation / NBO basis", OwnerPersonId = peopleByName["Sam Baker"].Id } }
        });
        prague.Meetings.Add(new Meeting
        {
            ContactId = Contact("Prague, Czechia", "Elena Vargova").Id, OrderNum = 2, Priority = MeetingPriority.High,
            Status = MeetingStatus.Confirmed, MeetingTime = new TimeOnly(13, 0), Project = "Northwind (Czechia)", Entity = "Northwind (JV)",
            Agenda = "JV structure options — equity, roles, geographies; confirm NDA.",
            Attendees = { peopleByName["Jamie Morgan"] },
            Materials =
            {
                new Material { Description = "International JV structure options (equity, roles, geographies)", OwnerPersonId = peopleByName["Jamie Morgan"].Id },
                new Material { Description = "Signed NDA copy", OwnerPersonId = peopleByName["Grace Hall"].Id }
            }
        });
        prague.Meetings.Add(new Meeting
        {
            ContactId = Contact("Prague, Czechia", "Petra Svobodova").Id, OrderNum = 3, Priority = MeetingPriority.Medium,
            Status = MeetingStatus.Tentative, Project = "Northwind (Czechia)", Entity = "Northwind (JV)", Agenda = "",
            Attendees = { peopleByName["Jamie Morgan"] }
        });
        prague.Meetings.Add(new Meeting
        {
            ContactId = Contact("Prague, Czechia", "Kevin Marks (local contact)").Id, OrderNum = 4, Priority = MeetingPriority.Low,
            Status = MeetingStatus.Confirmed, Project = "Northwind (Czechia)", Entity = "Northwind (JV)", Agenda = ""
        });
        db.Trips.Add(prague);

        var newYork = new Trip
        {
            Project = "Fundraising / Investor roadshow",
            Entity = "MGH Capital / Fund",
            DestinationCityId = citiesByLabel["New York, United States"].Id,
            FromDate = new DateOnly(2026, 8, 2),
            ToDate = new DateOnly(2026, 8, 28),
            Status = TripStatus.Confirmed,
            Hotel = "Hudson Grand",
            Transport = "Car service on file"
        };
        db.Trips.Add(newYork);

        var amsterdamOption = new Trip
        {
            Project = "Project Atlas (IM)",
            Entity = "MGH Digital",
            DestinationCityId = citiesByLabel["Amsterdam, Netherlands"].Id,
            Status = TripStatus.Option,
            Hotel = "Canal House"
        };
        db.Trips.Add(amsterdamOption);

        var jakartaOption = new Trip
        {
            Project = "Project Helix (Jakarta healthcare)",
            Entity = "MGH Healthcare",
            DestinationCityId = citiesByLabel["Jakarta, Indonesia"].Id,
            Status = TripStatus.Option,
            Hotel = "Orchid Tower"
        };
        db.Trips.Add(jakartaOption);

        await db.SaveChangesAsync();

        // --- Flights ---
        db.Flights.AddRange(
            new Flight { TravellerPersonId = peopleByName["Alex Morgan"].Id, TripId = prague.Id, OriginLabel = "Vienna", DestinationLabel = "Prague", FlightDateText = "Tue 23 Jun", FlightNo = "TransEuro TE451", DepartText = "VIE 17:35", ArriveText = "PRG 19:30", Aircraft = "A320neo" },
            new Flight { TravellerPersonId = peopleByName["Alex Morgan"].Id, TripId = prague.Id, OriginLabel = "Prague", DestinationLabel = "Vienna", FlightDateText = "Thu 25 Jun", FlightNo = "TransEuro TE452", DepartText = "PRG 20:30", ArriveText = "VIE 22:25", Aircraft = "A320neo" },
            new Flight { TravellerPersonId = peopleByName["Kevin Marks"].Id, TripId = prague.Id, OriginLabel = "Vienna", DestinationLabel = "Prague", FlightDateText = "Tue 23 Jun", FlightNo = "TransEuro TE451", DepartText = "VIE 17:35", ArriveText = "PRG 19:30", Aircraft = "A320neo" },
            new Flight { TravellerPersonId = peopleByName["Kevin Marks"].Id, TripId = prague.Id, OriginLabel = "Prague", DestinationLabel = "Vienna", FlightDateText = "Thu 25 Jun", FlightNo = "TransEuro TE452", DepartText = "PRG 20:30", ArriveText = "VIE 22:25", Aircraft = "A320neo" },
            new Flight { TravellerPersonId = peopleByName["Jamie Morgan"].Id, TripId = prague.Id, OriginLabel = "Singapore", DestinationLabel = "Prague", FlightDateText = "Tue 23 Jun", FlightNo = "TBC", DepartText = "SIN —", ArriveText = "PRG 21:35", Aircraft = "—" },
            new Flight { TravellerPersonId = peopleByName["Jamie Morgan"].Id, TripId = prague.Id, OriginLabel = "Prague", DestinationLabel = "Singapore", FlightDateText = "Thu 25 Jun", FlightNo = "TBC", DepartText = "PRG 19:35", ArriveText = "SIN —", Aircraft = "—" },
            new Flight { TravellerPersonId = peopleByName["Alex Morgan"].Id, TripId = newYork.Id, OriginLabel = "Amsterdam", DestinationLabel = "New York", FlightDateText = "Sun 2 Aug", FlightNo = "TBC (confirm from ticket)", DepartText = "AMS —", ArriveText = "USA —", Aircraft = "—" },
            new Flight { TravellerPersonId = peopleByName["Alex Morgan"].Id, TripId = newYork.Id, OriginLabel = "New York", DestinationLabel = "Amsterdam", FlightDateText = "Fri 28 Aug", FlightNo = "TBC (confirm from ticket)", DepartText = "USA —", ArriveText = "AMS —", Aircraft = "—" }
        );

        // --- Team plan ---
        var prg = "Prague, Czechia";
        db.TeamPlanEntries.AddRange(
            new TeamPlanEntry { PersonId = peopleByName["Alex Morgan"].Id, FromDate = new DateOnly(2026, 6, 23), ToDate = new DateOnly(2026, 6, 25), CityId = citiesByLabel[prg].Id, Type = PlanEntryType.Trip, Notes = "Northwind (Czechia JV) — meeting 24 Jun. TransEuro TE451/TE452." },
            new TeamPlanEntry { PersonId = peopleByName["Alex Morgan"].Id, FromDate = new DateOnly(2026, 8, 2), ToDate = new DateOnly(2026, 8, 28), CityId = citiesByLabel["New York, United States"].Id, Type = PlanEntryType.Trip, Notes = "Amsterdam → USA, returning to Amsterdam 28 Aug." },
            new TeamPlanEntry { PersonId = peopleByName["Alex Morgan"].Id, CityId = citiesByLabel["Amsterdam, Netherlands"].Id, Type = PlanEntryType.Option, Notes = "Possible leg after Prague." },
            new TeamPlanEntry { PersonId = peopleByName["Alex Morgan"].Id, CityId = citiesByLabel["Jakarta, Indonesia"].Id, Type = PlanEntryType.Option, Notes = "Option — dates TBC." },
            new TeamPlanEntry { PersonId = peopleByName["Jamie Morgan"].Id, FromDate = new DateOnly(2026, 6, 23), ToDate = new DateOnly(2026, 6, 25), CityId = citiesByLabel[prg].Id, Type = PlanEntryType.Trip, Notes = "From Singapore. Arr Tue 23 Jun 21:35; dep Thu 25 Jun 19:35." },
            new TeamPlanEntry { PersonId = peopleByName["Sam Baker"].Id, Type = PlanEntryType.Option, Notes = "Nothing confirmed yet." },
            new TeamPlanEntry { PersonId = peopleByName["Robin Garcia"].Id, Type = PlanEntryType.Option, Notes = "Nothing shared." },
            new TeamPlanEntry { PersonId = peopleByName["Wesley Stone"].Id, FromDate = new DateOnly(2026, 7, 4), ToDate = new DateOnly(2026, 7, 11), Type = PlanEntryType.Vacation, ApprovalStatus = Entities.ApprovalStatus.Pending, Notes = "Away on vacation." },
            new TeamPlanEntry { PersonId = peopleByName["Kevin Marks"].Id, FromDate = new DateOnly(2026, 6, 23), ToDate = new DateOnly(2026, 6, 25), CityId = citiesByLabel[prg].Id, Type = PlanEntryType.Trip, Notes = "With Alex (same TransEuro flights); back to Vienna." },
            new TeamPlanEntry { PersonId = peopleByName["Grace Hall"].Id, FromDate = new DateOnly(2026, 6, 23), ToDate = new DateOnly(2026, 7, 2), CityId = citiesByLabel["Singapore, Singapore"].Id, Type = PlanEntryType.Trip, Notes = "With IT team — awaiting visas." },
            new TeamPlanEntry { PersonId = peopleByName["Pierre"].Id, CityId = citiesByLabel["Hong Kong, China"].Id, Type = PlanEntryType.Option, Notes = "Hong Kong / Seoul — dates not confirmed." }
        );

        // --- Seeded login accounts (README documents these credentials) ---
        db.Users.AddRange(
            new User { Email = "coordinator@mgh.example.com", PasswordHash = hasher.Hash("Coordinator!123"), Role = UserRole.Coordinator, PersonId = peopleByName["Grace Hall"].Id },
            new User { Email = "ceo@mgh.example.com", PasswordHash = hasher.Hash("Ceo!12345"), Role = UserRole.Ceo, PersonId = peopleByName["Alex Morgan"].Id },
            new User { Email = "jamie@mgh.example.com", PasswordHash = hasher.Hash("TeamMember!123"), Role = UserRole.TeamMember, PersonId = peopleByName["Jamie Morgan"].Id }
        );

        await db.SaveChangesAsync();
    }
}
