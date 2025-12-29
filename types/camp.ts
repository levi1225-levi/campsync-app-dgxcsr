
export type CampStatus = 'Planning' | 'Active' | 'Completed' | 'Cancelled';

export interface Camp {
  id: string;
  name: string;
  description?: string;
  location: string;
  startDate: Date;
  endDate: Date;
  status: CampStatus;
  maxCapacity: number;
  parentRegistrationDeadline?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CampStaff {
  id: string;
  campId: string;
  userId: string;
  role: 'camp-admin' | 'staff';
  assignedAt: Date;
}

// Combined type for UI display
export interface CampWithDetails extends Camp {
  staff: CampStaffWithUser[];
  sessions: Session[];
  camperCount: number;
  staffCount: number;
}

export interface CampStaffWithUser extends CampStaff {
  user: {
    id: string;
    email: string;
    fullName: string;
    phone?: string;
  };
}

// Import types from other files
import { Session } from './session';
