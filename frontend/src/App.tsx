import { AvailabilityForm } from "./components/AvailabilityForm";
import { AvailabilityResults } from "./components/AvailabilityResults";
import { ScheduleVisualization } from "./features/schedule-visualization/ScheduleVisualization";
import { useAvailabilityPlanner } from "./hooks/useAvailabilityPlanner";
import { formatPlanningDate } from "./lib/date";

function App() {
  const {
    availableDates,
    selectedDate,
    people,
    peopleStatus,
    peopleError,
    selectedIds,
    selectedPeople,
    visualizationPeople,
    availability,
    availabilityStatus,
    availabilityError,
    lastSubmittedRequest,
    availabilityIsStale,
    hasParticipants,
    resultsWorkspaceRef,
    setSelectedDate,
    setSelectedIds,
    handleDirtyChange,
    handleSubmit,
    handleClearResults,
  } = useAvailabilityPlanner();

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <h1 className="text-3xl leading-tight font-bold sm:text-4xl">
        Availability Finder{" "}
        <span className="mt-1 block text-base font-medium text-muted-foreground sm:mt-0 sm:inline sm:text-lg">
          (Date-aware planner)
        </span>
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

      {peopleStatus === "success" && availableDates.length > 0 && people.length === 0 && (
        <p>No participants available for {formatPlanningDate(selectedDate)}</p>
      )}

      {hasParticipants && (
        <div className="space-y-6">
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

          <div
            ref={resultsWorkspaceRef}
            className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.88fr)] xl:items-start"
          >
            <ScheduleVisualization
              people={visualizationPeople}
              selectedCount={selectedPeople.length}
              availability={availability}
              isStale={availabilityIsStale}
            />

            <div className="xl:sticky xl:top-6">
              <AvailabilityResults
                data={availability}
                status={availabilityStatus}
                error={availabilityError}
                isStale={availabilityIsStale}
                selectedDate={selectedDate}
                submittedDate={lastSubmittedRequest?.date ?? null}
                onClear={handleClearResults}
              />
            </div>
          </div>
        </div>
      )}

      {hasParticipants && peopleStatus === "loading" && (
        <p className="text-sm text-muted-foreground">
          Updating participants and events for {formatPlanningDate(selectedDate)}.
        </p>
      )}
    </div>
  );
}

export default App;
