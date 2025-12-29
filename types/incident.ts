
export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus = 'open' | 'in-progress' | 'resolved' | 'closed';
export type IncidentType = 'medical' | 'behavioral' | 'safety' | 'other';

export interface Incident {
  id: string;
  camperId: string;
  camperName: string;
  type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  title: string;
  description: string;
  location: string;
  reportedBy: string;
  reportedAt: Date;
  resolvedAt?: Date;
  followUpRequired: boolean;
  followUpNotes?: string;
  witnessNames?: string[];
  actionsTaken?: string;
  parentNotified: boolean;
  parentNotifiedAt?: Date;
}
