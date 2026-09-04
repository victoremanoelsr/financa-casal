export type AccountSettings = {
  profile: { fullName: string; phone: string; contactEmail: string; cpfLast4: string; birthDate: string };
  address: { postalCode: string; stateCode: string; city: string; district: string; street: string; number: string; complement: string };
  username: string;
  family: { id: string; name: string; joinCode: string; role: "admin" | "member" } | null;
  members: Array<{ id: string; displayName: string; role: "admin" | "member"; isCurrentUser: boolean }>;
  categories: Array<{ id: string; name: string; kind: "income" | "expense" | "both"; isSystem: boolean }>;
  preferences: {
    theme: "light" | "dark" | "system";
    notifications: { dueSoon: boolean; overdue: boolean; cards: boolean; goals: boolean; news: boolean };
    listOrder: "newest" | "oldest";
    dailySummaryTime: string;
  };
};
