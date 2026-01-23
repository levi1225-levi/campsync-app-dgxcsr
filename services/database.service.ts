
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
    console.log('Fetching invitation by token');
    
    const { data, error } = await supabase
      .from('parent_invitations')
      .select('*')
      .eq('invitation_token', token)
      .single();

    if (error) {
      console.error('Error fetching invitation:', error);
      throw error;
    }
    
    console.log('Invitation fetched successfully');
    return {
      id: data.id,
      email: data.email,
      fullName: data.full_name,
      relationship: data.relationship,
      camperId: data.camper_id,
      token: data.invitation_token,
      status: data.status,
      expiresAt: data.expires_at,
      createdAt: data.created_at,
    };
  },

  async acceptInvitation(token: string): Promise<void> {
    console.log('Accepting invitation');
    
    const { error } = await supabase
      .from('parent_invitations')
      .update({ 
        status: 'accepted',
        accepted_at: new Date().toISOString()
      })
      .eq('invitation_token', token);

    if (error) {
      console.error('Error accepting invitation:', error);
      throw error;
    }
    
    console.log('Invitation accepted successfully');
  },

  async getByEmail(email: string): Promise<Parent | null> {
    console.log('Fetching parent by email:', email);
    
    const { data, error } = await supabase
      .from('parent_guardians')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log('Parent not found');
        return null;
      }
      console.error('Error fetching parent:', error);
      throw error;
    }

    console.log('Parent fetched successfully');
    return {
      id: data.id,
      email: data.email,
      fullName: data.full_name,
      phone: data.phone,
      createdAt: data.created_at,
    };
  },

  async create(parent: Omit<Parent, 'createdAt'>): Promise<Parent> {
    console.log('Creating parent:', parent.email);
    
    const { data, error } = await supabase
      .from('parent_guardians')
      .insert({
        id: parent.id,
        email: parent.email,
        full_name: parent.fullName,
        phone: parent.phone,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating parent:', error);
      throw error;
    }

    console.log('Parent created successfully');
    return {
      id: data.id,
      email: data.email,
      fullName: data.full_name,
      phone: data.phone,
      createdAt: data.created_at,
    };
  },

  async linkToCamper(parentId: string, camperId: string, relationship: string): Promise<void> {
    console.log('Linking parent to camper');
    
    const { error } = await supabase
      .from('parent_camper_links')
      .insert({
        parent_id: parentId,
        camper_id: camperId,
        relationship,
      });

    if (error) {
      console.error('Error linking parent to camper:', error);
      throw error;
    }
    
    console.log('Parent linked to camper successfully');
  },
};
