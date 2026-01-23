
// Database service for parent-related operations
import { supabase } from '@/app/integrations/supabase/client';

export interface ParentInvitation {
  id: string;
  email: string;
  fullName: string;
  relationship: string;
  camperId: string;
  token: string;
  status: 'pending' | 'accepted' | 'expired';
  expiresAt: string;
  createdAt: string;
}

export interface Parent {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  createdAt: string;
}

export interface ParentCamperLink {
  parentId: string;
  camperId: string;
  relationship: string;
}

export const parentService = {
  async getInvitationByToken(token: string): Promise<ParentInvitation> {
    const { data, error } = await supabase
      .from('parent_invitations')
      .select('*')
      .eq('token', token)
      .single();

    if (error) throw error;
    
    return {
      id: data.id,
      email: data.email,
      fullName: data.full_name,
      relationship: data.relationship,
      camperId: data.camper_id,
      token: data.token,
      status: data.status,
      expiresAt: data.expires_at,
      createdAt: data.created_at,
    };
  },

  async acceptInvitation(token: string): Promise<void> {
    const { error } = await supabase
      .from('parent_invitations')
      .update({ status: 'accepted' })
      .eq('token', token);

    if (error) throw error;
  },

  async getByEmail(email: string): Promise<Parent | null> {
    const { data, error } = await supabase
      .from('parents')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return {
      id: data.id,
      email: data.email,
      fullName: data.full_name,
      phone: data.phone,
      createdAt: data.created_at,
    };
  },

  async create(parent: Omit<Parent, 'createdAt'>): Promise<Parent> {
    const { data, error } = await supabase
      .from('parents')
      .insert({
        id: parent.id,
        email: parent.email,
        full_name: parent.fullName,
        phone: parent.phone,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      email: data.email,
      fullName: data.full_name,
      phone: data.phone,
      createdAt: data.created_at,
    };
  },

  async linkToCamper(parentId: string, camperId: string, relationship: string): Promise<void> {
    const { error } = await supabase
      .from('parent_camper_links')
      .insert({
        parent_id: parentId,
        camper_id: camperId,
        relationship,
      });

    if (error) throw error;
  },
};
