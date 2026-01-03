
import { Camper } from './camper';

export interface ParentGuardian {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  homeAddress?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ParentCamperLink {
  id: string;
  parentId: string;
  camperId: string;
  relationship: string;
  createdAt: Date;
}

export interface ParentInvitation {
  id: string;
  camperId: string;
  email: string;
  fullName: string;
  relationship: string;
  invitationToken: string;
  status: 'pending' | 'accepted' | 'expired';
  sentAt: Date;
  acceptedAt?: Date;
  expiresAt: Date;
  createdAt: Date;
}

// Combined type for UI display
export interface ParentGuardianWithChildren extends ParentGuardian {
  children: ParentCamperLinkWithCamper[];
}

export interface ParentCamperLinkWithCamper extends ParentCamperLink {
  camper: Camper;
}
