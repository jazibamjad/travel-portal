using Api.Entities;
using Microsoft.EntityFrameworkCore;

namespace Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Person> People => Set<Person>();
    public DbSet<City> Cities => Set<City>();
    public DbSet<Contact> Contacts => Set<Contact>();
    public DbSet<Trip> Trips => Set<Trip>();
    public DbSet<Meeting> Meetings => Set<Meeting>();
    public DbSet<Material> Materials => Set<Material>();
    public DbSet<Flight> Flights => Set<Flight>();
    public DbSet<TeamPlanEntry> TeamPlanEntries => Set<TeamPlanEntry>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<User>(e =>
        {
            e.HasIndex(x => x.Email).IsUnique();
            e.Property(x => x.Role).HasConversion<string>();
            e.HasOne(x => x.Person).WithMany().HasForeignKey(x => x.PersonId).OnDelete(DeleteBehavior.SetNull);
        });

        b.Entity<City>(e =>
        {
            e.HasIndex(x => x.Label).IsUnique();
        });

        b.Entity<Contact>(e =>
        {
            e.HasOne(x => x.City).WithMany(c => c.Contacts).HasForeignKey(x => x.CityId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<Trip>(e =>
        {
            e.Property(x => x.Status).HasConversion<string>();
            e.HasOne(x => x.DestinationCity).WithMany().HasForeignKey(x => x.DestinationCityId).OnDelete(DeleteBehavior.Restrict);
            e.HasMany(x => x.Travellers).WithMany(p => p.TripsAccompanying).UsingEntity(j => j.ToTable("TripTravellers"));
        });

        b.Entity<Meeting>(e =>
        {
            e.Property(x => x.Priority).HasConversion<string>();
            e.Property(x => x.Status).HasConversion<string>();
            e.HasOne(x => x.Trip).WithMany(t => t.Meetings).HasForeignKey(x => x.TripId).OnDelete(DeleteBehavior.Cascade);
            // Restrict: a Contact referenced by a Meeting cannot be deleted (PRD delete-guard deviation).
            e.HasOne(x => x.Contact).WithMany(c => c.Meetings).HasForeignKey(x => x.ContactId).OnDelete(DeleteBehavior.Restrict);
            e.HasMany(x => x.Attendees).WithMany().UsingEntity(j => j.ToTable("MeetingAttendees"));
        });

        b.Entity<Material>(e =>
        {
            e.HasOne(x => x.Meeting).WithMany(m => m.Materials).HasForeignKey(x => x.MeetingId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.OwnerPerson).WithMany().HasForeignKey(x => x.OwnerPersonId).OnDelete(DeleteBehavior.SetNull);
        });

        b.Entity<Flight>(e =>
        {
            e.HasOne(x => x.TravellerPerson).WithMany().HasForeignKey(x => x.TravellerPersonId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Trip).WithMany(t => t.Flights).HasForeignKey(x => x.TripId).OnDelete(DeleteBehavior.SetNull);
        });

        b.Entity<TeamPlanEntry>(e =>
        {
            e.Property(x => x.Type).HasConversion<string>();
            e.Property(x => x.ApprovalStatus).HasConversion<string>();
            e.HasOne(x => x.Person).WithMany(p => p.TeamPlanEntries).HasForeignKey(x => x.PersonId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.City).WithMany().HasForeignKey(x => x.CityId).OnDelete(DeleteBehavior.SetNull);
        });
    }
}
