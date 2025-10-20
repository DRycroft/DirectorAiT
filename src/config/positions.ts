// Single source of truth for all team positions across the application

export const BOARD_POSITIONS = [
  "Chair",
  "Deputy Chair",
  "Director",
  "Independent Director",
  "Non-Executive Director",
  "Executive Director",
];

export const EXECUTIVE_POSITIONS = [
  "CEO",
  "CFO",
  "COO",
  "CTO",
  "CMO",
  "CHRO",
  "General Counsel",
  "Managing Director",
];

export const KEY_STAFF_POSITIONS = [
  "Head of Finance",
  "Head of Operations",
  "Head of Sales",
  "Head of Marketing",
  "Head of HR",
  "Head of IT",
  "Head of Legal",
  "Company Secretary",
];

export const getPositionsByType = (memberType: 'board' | 'executive' | 'key_staff'): string[] => {
  switch (memberType) {
    case 'board':
      return BOARD_POSITIONS;
    case 'executive':
      return EXECUTIVE_POSITIONS;
    case 'key_staff':
      return KEY_STAFF_POSITIONS;
    default:
      return [];
  }
};
