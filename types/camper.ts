
export interface Camper {
  id: string;
  campId: string;
  sessionId?: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  registrationStatus: 'pending' | 'incomplete' | 'complete' | 'cancelled';
  wristbandId?: string;
  wristbandAssigned: boolean;
  photoUrl?: string;
  checkInStatus: 'checked-in' | 'checked-out' | 'not-arrived';
  lastCheckIn?: Date;
  lastCheckOut?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CamperMedicalInfo {
  id: string;
  camperId: string;
  allergies: string[];
  medications: string[];
  medicalConditions: string[];
  specialCareInstructions?: string;
  dietaryRestrictions: string[];
  doctorName?: string;
  doctorPhone?: string;
  insuranceProvider?: string;
  insuranceNumber?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmergencyContact {
  id: string;
  camperId: string;
  fullName: string;
  phone: string;
  relationship: string;
  priorityOrder: 1 | 2;
  createdAt: Date;
  updatedAt: Date;
}

// Combined type for UI display
export interface CamperWithDetails extends Camper {
  medicalInfo?: CamperMedicalInfo;
  emergencyContacts: EmergencyContact[];
  parents: ParentGuardian[];
  session?: Session;
  camp?: Camp;
}

// Import types from other files
import { ParentGuardian } from './parent';
import { Session } from './session';
import { Camp } from './camp';
