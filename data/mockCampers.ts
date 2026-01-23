
// Mock camper data for development and testing
export interface Camper {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  cabin: string;
  checkInStatus: 'not-arrived' | 'checked-in' | 'checked-out';
  wristbandId: string;
  lastCheckIn?: string;
  lastCheckOut?: string;
  medicalInfo: {
    allergies: string[];
    medications: string[];
    conditions: string[];
    dietaryRestrictions: string[];
    notes: string;
  };
}

export const mockCampers: Camper[] = [
  {
    id: '1',
    firstName: 'Emma',
    lastName: 'Johnson',
    age: 12,
    cabin: 'Cabin A',
    checkInStatus: 'checked-in',
    wristbandId: 'WB001',
    lastCheckIn: new Date().toISOString(),
    medicalInfo: {
      allergies: ['Peanuts'],
      medications: ['EpiPen'],
      conditions: [],
      dietaryRestrictions: ['Nut-free'],
      notes: 'Severe peanut allergy',
    },
  },
  {
    id: '2',
    firstName: 'Liam',
    lastName: 'Smith',
    age: 10,
    cabin: 'Cabin B',
    checkInStatus: 'checked-out',
    wristbandId: 'WB002',
    lastCheckOut: new Date().toISOString(),
    medicalInfo: {
      allergies: [],
      medications: [],
      conditions: ['Asthma'],
      dietaryRestrictions: [],
      notes: 'Has inhaler',
    },
  },
  {
    id: '3',
    firstName: 'Olivia',
    lastName: 'Williams',
    age: 11,
    cabin: 'Cabin A',
    checkInStatus: 'not-arrived',
    wristbandId: 'WB003',
    medicalInfo: {
      allergies: [],
      medications: [],
      conditions: [],
      dietaryRestrictions: ['Vegetarian'],
      notes: '',
    },
  },
];
