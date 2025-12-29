
export interface Camper {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  cabin: string;
  nfcWristbandId: string;
  photoUrl?: string;
  medicalInfo: MedicalInfo;
  emergencyContacts: EmergencyContact[];
  parentInfo: ParentInfo;
  checkInStatus: 'checked-in' | 'checked-out' | 'not-arrived';
  lastCheckIn?: Date;
  lastCheckOut?: Date;
}

export interface MedicalInfo {
  allergies: string[];
  medications: string[];
  conditions: string[];
  dietaryRestrictions: string[];
  doctorName?: string;
  doctorPhone?: string;
  insuranceProvider?: string;
  insuranceNumber?: string;
  notes?: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  isPrimary: boolean;
}

export interface ParentInfo {
  fatherName?: string;
  fatherPhone?: string;
  fatherEmail?: string;
  motherName?: string;
  motherPhone?: string;
  motherEmail?: string;
}
