export type SeedPerson = {
  id: string;
  name: string;
  workingHours: {
    start: string;
    end: string;
  };
};

export type SeedCalendarEvent = {
  id: string;
  personId: string;
  date: string;
  title?: string;
  start?: string;
  end?: string;
};

export const availableDates = [
  "2026-05-18",
  "2026-05-19",
  "2026-05-20",
] as const;

export const people: SeedPerson[] = [
  {
    id: "alice",
    name: "Alice Johnson",
    workingHours: { start: "09:00", end: "17:00" },
  },
  {
    id: "bob",
    name: "Bob Smith",
    workingHours: { start: "10:00", end: "18:00" },
  },
  {
    id: "charlie",
    name: "Charlie Brown",
    workingHours: { start: "08:00", end: "16:00" },
  },
  {
    id: "diana",
    name: "Diana Prince",
    workingHours: { start: "09:30", end: "17:30" },
  },
  {
    id: "edward",
    name: "Edward King",
    workingHours: { start: "11:00", end: "19:00" },
  },
  {
    id: "fatima",
    name: "Fatima Rahman",
    workingHours: { start: "08:30", end: "16:30" },
  },
];

export const calendarEvents: SeedCalendarEvent[] = [
  // ---------- Monday, 2026-05-18 ----------

  // Alice
  {
    id: "a1",
    personId: "alice",
    date: "2026-05-18",
    title: "Standup",
    start: "10:00",
    end: "10:30",
  },
  {
    id: "a2",
    personId: "alice",
    date: "2026-05-18",
    title: "Client call",
    start: "14:00",
    end: "15:00",
  },
  {
    id: "a3",
    personId: "alice",
    date: "2026-05-18",
    title: "Handoff",
    start: "15:00",
    end: "15:30",
  },

  // Bob
  {
    id: "b1",
    personId: "bob",
    date: "2026-05-18",
    title: "Planning",
    start: "11:00",
    end: "12:00",
  },
  {
    id: "b2",
    personId: "bob",
    date: "2026-05-18",
    title: "Design review",
    start: "15:00",
    end: "16:00",
  },

  // Charlie
  {
    id: "c2",
    personId: "charlie",
    date: "2026-05-18",
    title: "Focus",
    start: "15:00",
    end: "16:00",
  },

  // Diana
  {
    id: "d1",
    personId: "diana",
    date: "2026-05-18",
    title: "Team sync",
    start: "11:00",
    end: "12:00",
  },
  {
    id: "d2",
    personId: "diana",
    date: "2026-05-18",
    title: "Deep work",
    start: "14:00",
    end: "16:00",
  },

  // Edward
  {
    id: "e1",
    personId: "edward",
    date: "2026-05-18",
    title: "Onboarding",
    start: "11:30",
    end: "13:00",
  },
  {
    id: "e2",
    personId: "edward",
    date: "2026-05-18",
    title: "Review",
    start: "14:00",
    end: "15:00",
  },

  // Fatima
  {
    id: "f1",
    personId: "fatima",
    date: "2026-05-18",
    title: "Interviews",
    start: "11:00",
    end: "12:30",
  },
  {
    id: "f2",
    personId: "fatima",
    date: "2026-05-18",
    title: "Check-in",
    start: "14:30",
    end: "15:00",
  },
  {
    id: "f3",
    personId: "fatima",
    date: "2026-05-18",
    title: "Docs",
    start: "15:00",
    end: "16:00",
  },

  // Messy / Invalid cases

  // Missing end
  {
    id: "m1",
    personId: "alice",
    date: "2026-05-18",
    title: "Follow-up",
    start: "15:00",
  },

  // Missing start
  {
    id: "m2",
    personId: "bob",
    date: "2026-05-18",
    title: "Update",
    end: "14:00",
  },

  // End before start
  {
    id: "m3",
    personId: "charlie",
    date: "2026-05-18",
    title: "Handoff",
    start: "16:00",
    end: "15:00",
  },

  // Outside working hours
  {
    id: "m4",
    personId: "diana",
    date: "2026-05-18",
    title: "Briefing",
    start: "07:00",
    end: "08:00",
  },

  // Completely outside working hours
  {
    id: "m5",
    personId: "edward",
    date: "2026-05-18",
    title: "Support",
    start: "20:00",
    end: "21:00",
  },

  // Touching events (edge case)
  {
    id: "m7",
    personId: "bob",
    date: "2026-05-18",
    title: "Sync",
    start: "12:00",
    end: "12:30",
  },
  {
    id: "m8",
    personId: "bob",
    date: "2026-05-18",
    title: "Roadmap",
    start: "12:30",
    end: "13:00",
  },

  // Overlapping heavy case
  {
    id: "m10",
    personId: "diana",
    date: "2026-05-18",
    title: "Prep",
    start: "12:00",
    end: "13:00",
  },

  // ---------- Tuesday, 2026-05-19 ----------

  {
    id: "a4",
    personId: "alice",
    date: "2026-05-19",
    title: "Daily sync",
    start: "09:30",
    end: "10:30",
  },
  {
    id: "a5",
    personId: "alice",
    date: "2026-05-19",
    title: "Workshop prep",
    start: "13:00",
    end: "14:00",
  },
  {
    id: "m11",
    personId: "alice",
    date: "2026-05-19",
    title: "Notes",
    end: "16:00",
  },

  {
    id: "b3",
    personId: "bob",
    date: "2026-05-19",
    title: "Planning",
    start: "10:00",
    end: "11:00",
  },
  {
    id: "b4",
    personId: "bob",
    date: "2026-05-19",
    title: "Retro",
    start: "14:30",
    end: "15:30",
  },

  {
    id: "c3",
    personId: "charlie",
    date: "2026-05-19",
    title: "Research",
    start: "09:00",
    end: "10:00",
  },
  {
    id: "c4",
    personId: "charlie",
    date: "2026-05-19",
    title: "Client review",
    start: "13:00",
    end: "14:00",
  },

  {
    id: "d3",
    personId: "diana",
    date: "2026-05-19",
    title: "Kickoff",
    start: "10:30",
    end: "11:30",
  },
  {
    id: "d4",
    personId: "diana",
    date: "2026-05-19",
    title: "Partner call",
    start: "15:00",
    end: "16:00",
  },

  {
    id: "e3",
    personId: "edward",
    date: "2026-05-19",
    title: "Lunch review",
    start: "12:00",
    end: "13:00",
  },
  {
    id: "m12",
    personId: "edward",
    date: "2026-05-19",
    title: "Early support",
    start: "09:00",
    end: "10:00",
  },

  {
    id: "f4",
    personId: "fatima",
    date: "2026-05-19",
    title: "Screening",
    start: "09:00",
    end: "10:30",
  },
  {
    id: "f5",
    personId: "fatima",
    date: "2026-05-19",
    title: "Ops check-in",
    start: "13:30",
    end: "14:00",
  },

  // ---------- Wednesday, 2026-05-20 ----------

  {
    id: "w1",
    personId: "alice",
    date: "2026-05-20",
    title: "Morning review",
    start: "09:30",
    end: "10:00",
  },
  {
    id: "w2",
    personId: "bob",
    date: "2026-05-20",
    title: "Support handoff",
    start: "16:00",
    end: "17:00",
  },
  {
    id: "w3",
    personId: "diana",
    date: "2026-05-20",
    title: "Wrap-up",
    start: "16:30",
    end: "17:30",
  },
];
