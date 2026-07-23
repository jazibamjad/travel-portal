namespace Api.Entities;

public enum UserRole
{
    Coordinator,
    Ceo,
    TeamMember
}

public enum TripStatus
{
    Confirmed,
    Option,
    Tentative
}

public enum MeetingPriority
{
    High,
    Medium,
    Low
}

public enum MeetingStatus
{
    Proposed,
    Requested,
    Confirmed,
    Tentative,
    Declined,
    Completed
}

public enum PlanEntryType
{
    Trip,
    Option,
    Vacation,
    Remote
}

public enum ApprovalStatus
{
    Pending,
    Approved,
    Rejected
}
