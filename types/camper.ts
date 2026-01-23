
// Camper type definitions
export type CheckInStatus = 'not-arrived' | 'checked-in' | 'checked-out';

export interface MedicalInfo {
  allergies: string[];
  medications: string[];
  conditions: string[];
  dietaryRestrictions: string[];
  notes: string;
}

export interface Camper {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  cabin: string;
  checkInStatus: CheckInStatus;
  wristbandId: string;
  lastCheckIn?: string;
  lastCheckOut?: string;
  medicalInfo: MedicalInfo;
}
