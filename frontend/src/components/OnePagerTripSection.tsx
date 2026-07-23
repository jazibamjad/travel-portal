import { OnePagerTripSection as TripSection } from "@/lib/types";

export function OnePagerTripSectionView({ trip }: { trip: TripSection }) {
  return (
    <div className="mt-4 rounded-lg border border-slate-200 p-4 print:break-inside-avoid">
      <h3 className="text-sm font-bold text-sky-700">
        ✈ {trip.destinationLabel} {trip.project && `· ${trip.project}`} {trip.entity && `· ${trip.entity}`}
      </h3>
      <p className="mt-1 text-xs text-slate-600">
        📅 {trip.fromDate ?? "TBC"} – {trip.toDate ?? trip.fromDate ?? "TBC"} {trip.fromDate && `· ${trip.days} day(s)`} · status: {trip.status}
      </p>
      <p className="mt-0.5 text-xs text-slate-600">🏨 Hotel: {trip.hotel || "TBC"}</p>
      <p className="mt-0.5 text-xs text-slate-600">🚗 Transportation: {trip.transport || "TBC"}</p>
      <p className="mt-0.5 text-xs text-slate-600">🧳 Travelling with Alex: {trip.travellerNames.length ? trip.travellerNames.join(", ") : "—"}</p>

      {trip.meetings.length > 0 ? (
        <>
          <h4 className="mt-3 text-xs font-bold text-slate-700">🤝 Meetings &amp; agenda</h4>
          <table className="mt-1 w-full border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-left">
                <th className="border border-slate-200 p-1">#</th>
                <th className="border border-slate-200 p-1">Time</th>
                <th className="border border-slate-200 p-1">Who</th>
                <th className="border border-slate-200 p-1">Project / entity</th>
                <th className="border border-slate-200 p-1">Status / priority</th>
                <th className="border border-slate-200 p-1">Agenda</th>
                <th className="border border-slate-200 p-1">Team</th>
              </tr>
            </thead>
            <tbody>
              {trip.meetings.map((m, i) => (
                <tr key={i}>
                  <td className="border border-slate-200 p-1">{m.orderNum}</td>
                  <td className="border border-slate-200 p-1">{m.meetingTime ?? "—"}</td>
                  <td className="border border-slate-200 p-1">{m.contactName}</td>
                  <td className="border border-slate-200 p-1">
                    {m.project ?? "—"}
                    {m.entity && <div className="text-slate-400">{m.entity}</div>}
                  </td>
                  <td className="border border-slate-200 p-1">
                    {m.status}
                    <div>{m.priority}</div>
                  </td>
                  <td className="border border-slate-200 p-1">{m.agenda || "—"}</td>
                  <td className="border border-slate-200 p-1">{m.attendeeNames.length ? m.attendeeNames.join(", ") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h4 className="mt-3 text-xs font-bold text-slate-700">📋 Printing materials &amp; meeting requirements</h4>
          {trip.materials.length ? (
            <table className="mt-1 w-full border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-left">
                  <th className="border border-slate-200 p-1">Material / document</th>
                  <th className="border border-slate-200 p-1">For meeting</th>
                  <th className="border border-slate-200 p-1">Owner</th>
                </tr>
              </thead>
              <tbody>
                {trip.materials.map((m, i) => (
                  <tr key={i}>
                    <td className="border border-slate-200 p-1">{m.description}</td>
                    <td className="border border-slate-200 p-1">{m.forMeeting}</td>
                    <td className="border border-slate-200 p-1">{m.owner ?? "owner TBC"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-xs text-slate-400">No materials listed.</p>
          )}
        </>
      ) : (
        <p className="mt-2 text-xs text-slate-400">No meetings recorded for this trip.</p>
      )}
    </div>
  );
}
