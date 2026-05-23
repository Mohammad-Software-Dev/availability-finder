import { AvailabilityForm } from "./components/AvailabilityForm";
import { AvailabilityResults } from "./components/AvailabilityResults";
import { ScheduleVisualization } from "./features/schedule-visualization/ScheduleVisualization";
import { useAvailabilityPlanner } from "./hooks/useAvailabilityPlanner";
import { formatPlanningDate } from "./lib/date";
import { scrollIntoViewRespectingMotion } from "./lib/scroll";
import { useRef } from "react";

function App() {
  const {
    availableDates,
    selectedDate,
    people,
    peopleStatus,
    peopleError,
    selectedIds,
    visualizationPeople,
    availability,
    availabilityStatus,
    availabilityError,
    lastSubmittedRequest,
    availabilityIsStale,
    hasParticipants,
    setSelectedDate,
    setSelectedIds,
    handleDirtyChange,
    handleSubmit,
    handleClearResults,
  } = useAvailabilityPlanner();
  const analysisSectionRef = useRef<HTMLDivElement | null>(null);

  function handleViewAnalysis() {
    scrollIntoViewRespectingMotion(analysisSectionRef.current, {
      block: "start",
    });
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <h1 className="text-3xl leading-tight font-bold sm:text-4xl">
        Availability Finder
      </h1>

      {peopleStatus === "loading" && !hasParticipants && (
        <p>Loading planning dates and participants...</p>
      )}

      {peopleStatus === "error" && (
        <p className="text-red-500">
          {peopleError?.message ?? "Failed to load participants"}
        </p>
      )}

      {peopleStatus === "success" && availableDates.length === 0 && (
        <p>No planning dates available</p>
      )}

      {peopleStatus === "success" &&
        availableDates.length > 0 &&
        people.length === 0 && (
          <p>
            No participants available for {formatPlanningDate(selectedDate)}
          </p>
        )}

      {hasParticipants && (
        <div className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.82fr)] xl:items-start">
            <AvailabilityForm
              availableDates={availableDates}
              people={people}
              selectedDate={selectedDate}
              status={availabilityStatus}
              selectedIds={selectedIds}
              onSelectedDateChange={setSelectedDate}
              onSelectedIdsChange={setSelectedIds}
              lastSubmittedRequest={lastSubmittedRequest}
              onDirtyChange={handleDirtyChange}
              onSubmit={handleSubmit}
            />

            <div>
              <AvailabilityResults
                data={availability}
                status={availabilityStatus}
                error={availabilityError}
                isStale={availabilityIsStale}
                selectedDate={selectedDate}
                submittedDate={lastSubmittedRequest?.date ?? null}
                onClear={handleClearResults}
                onViewAnalysis={handleViewAnalysis}
              />
            </div>
          </div>

          {availability && (
            <div ref={analysisSectionRef}>
              <ScheduleVisualization
                people={visualizationPeople}
                availability={availability}
                isStale={availabilityIsStale}
              />
            </div>
          )}
        </div>
      )}

      {hasParticipants && peopleStatus === "loading" && (
        <p className="text-sm text-muted-foreground">
          Updating participants and events for
          {formatPlanningDate(selectedDate)}.
        </p>
      )}
    </div>
  );
}

export default App;
