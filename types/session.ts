
export interface Session {
  id: string;
  campId: string;
  name: string;
  startDate: Date;
  endDate: Date;
  maxCapacity?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Combined type for UI display
export interface SessionWithDetails extends Session {
  camp?: Camp;
  camperCount: number;
  campers: Camper[];
}

// Import types from other files
import { Camp } from './camp';
import { Camper } from './camper';
