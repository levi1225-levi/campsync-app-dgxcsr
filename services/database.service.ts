
import { supabase } from '@/app/integrations/supabase/client';
import { Camp, CampStaff } from '@/types/camp';
import { Camper, CamperMedicalInfo, EmergencyContact } from '@/types/camper';
import { ParentGuardian, ParentCamperLink, ParentInvitation } from '@/types/parent';
import { Session } from '@/types/session';
import { AuditLog } from '@/types/audit';

// Camp operations
export const campService = {
  async getAll() {
    const { data, error } = await supabase
      .from('camps')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching camps:', error);
      throw error;
    }
    return data as Camp[];
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('camps')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching camp:', error);
      throw error;
    }
    return data as Camp;
  },

  async create(camp: Omit<Camp, 'id' | 'createdAt' | 'updatedAt'>) {
    const { data, error } = await supabase
      .from('camps')
      .insert(camp)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating camp:', error);
      throw error;
    }
    return data as Camp;
  },

  async update(id: string, updates: Partial<Camp>) {
    const { data, error } = await supabase
      .from('camps')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating camp:', error);
      throw error;
    }
    return data as Camp;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('camps')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting camp:', error);
      throw error;
    }
  },

  async getStaff(campId: string) {
    const { data, error } = await supabase
      .from('camp_staff')
      .select(`
        *,
        user:user_profiles(id, email, full_name, phone)
      `)
      .eq('camp_id', campId);
    
    if (error) {
      console.error('Error fetching camp staff:', error);
      throw error;
    }
    return data;
  },

  async addStaff(campId: string, userId: string, role: 'camp-admin' | 'staff') {
    const { data, error } = await supabase
      .from('camp_staff')
      .insert({ camp_id: campId, user_id: userId, role })
      .select()
      .single();
    
    if (error) {
      console.error('Error adding camp staff:', error);
      throw error;
    }
    return data as CampStaff;
  },

  async removeStaff(campId: string, userId: string) {
    const { error } = await supabase
      .from('camp_staff')
      .delete()
      .eq('camp_id', campId)
      .eq('user_id', userId);
    
    if (error) {
      console.error('Error removing camp staff:', error);
      throw error;
    }
  },
};

// Session operations
export const sessionService = {
  async getAll(campId?: string) {
    let query = supabase
      .from('sessions')
      .select('*')
      .order('start_date', { ascending: true });
    
    if (campId) {
      query = query.eq('camp_id', campId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching sessions:', error);
      throw error;
    }
    return data as Session[];
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching session:', error);
      throw error;
    }
    return data as Session;
  },

  async create(session: Omit<Session, 'id' | 'createdAt' | 'updatedAt'>) {
    const { data, error } = await supabase
      .from('sessions')
      .insert(session)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating session:', error);
      throw error;
    }
    return data as Session;
  },

  async update(id: string, updates: Partial<Session>) {
    const { data, error } = await supabase
      .from('sessions')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating session:', error);
      throw error;
    }
    return data as Session;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting session:', error);
      throw error;
    }
  },
};

// Camper operations
export const camperService = {
  async getAll(campId?: string) {
    let query = supabase
      .from('campers')
      .select('*')
      .order('last_name', { ascending: true });
    
    if (campId) {
      query = query.eq('camp_id', campId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching campers:', error);
      throw error;
    }
    return data as Camper[];
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('campers')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching camper:', error);
      throw error;
    }
    return data as Camper;
  },

  async getByWristbandId(wristbandId: string) {
    const { data, error } = await supabase
      .from('campers')
      .select('*')
      .eq('wristband_id', wristbandId)
      .single();
    
    if (error) {
      console.error('Error fetching camper by wristband:', error);
      throw error;
    }
    return data as Camper;
  },

  async create(camper: Omit<Camper, 'id' | 'createdAt' | 'updatedAt'>) {
    const { data, error } = await supabase
      .from('campers')
      .insert(camper)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating camper:', error);
      throw error;
    }
    return data as Camper;
  },

  async update(id: string, updates: Partial<Camper>) {
    const { data, error } = await supabase
      .from('campers')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating camper:', error);
      throw error;
    }
    return data as Camper;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('campers')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting camper:', error);
      throw error;
    }
  },

  async getMedicalInfo(camperId: string) {
    const { data, error } = await supabase
      .from('camper_medical_info')
      .select('*')
      .eq('camper_id', camperId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching medical info:', error);
      throw error;
    }
    return data as CamperMedicalInfo | null;
  },

  async upsertMedicalInfo(medicalInfo: Omit<CamperMedicalInfo, 'id' | 'createdAt' | 'updatedAt'>) {
    const { data, error } = await supabase
      .from('camper_medical_info')
      .upsert(medicalInfo, { onConflict: 'camper_id' })
      .select()
      .single();
    
    if (error) {
      console.error('Error upserting medical info:', error);
      throw error;
    }
    return data as CamperMedicalInfo;
  },

  async getEmergencyContacts(camperId: string) {
    const { data, error } = await supabase
      .from('emergency_contacts')
      .select('*')
      .eq('camper_id', camperId)
      .order('priority_order', { ascending: true });
    
    if (error) {
      console.error('Error fetching emergency contacts:', error);
      throw error;
    }
    return data as EmergencyContact[];
  },

  async upsertEmergencyContact(contact: Omit<EmergencyContact, 'id' | 'createdAt' | 'updatedAt'>) {
    const { data, error } = await supabase
      .from('emergency_contacts')
      .upsert(contact, { onConflict: 'camper_id,priority_order' })
      .select()
      .single();
    
    if (error) {
      console.error('Error upserting emergency contact:', error);
      throw error;
    }
    return data as EmergencyContact;
  },

  async deleteEmergencyContact(id: string) {
    const { error } = await supabase
      .from('emergency_contacts')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting emergency contact:', error);
      throw error;
    }
  },

  async getParents(camperId: string) {
    const { data, error } = await supabase
      .from('parent_camper_links')
      .select(`
        *,
        parent:parent_guardians(*)
      `)
      .eq('camper_id', camperId);
    
    if (error) {
      console.error('Error fetching parents:', error);
      throw error;
    }
    return data;
  },
};

// Parent operations
export const parentService = {
  async getById(id: string) {
    const { data, error } = await supabase
      .from('parent_guardians')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching parent:', error);
      throw error;
    }
    return data as ParentGuardian;
  },

  async getByEmail(email: string) {
    const { data, error } = await supabase
      .from('parent_guardians')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching parent by email:', error);
      throw error;
    }
    return data as ParentGuardian | null;
  },

  async create(parent: Omit<ParentGuardian, 'createdAt' | 'updatedAt'>) {
    const { data, error } = await supabase
      .from('parent_guardians')
      .insert(parent)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating parent:', error);
      throw error;
    }
    return data as ParentGuardian;
  },

  async update(id: string, updates: Partial<ParentGuardian>) {
    const { data, error } = await supabase
      .from('parent_guardians')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating parent:', error);
      throw error;
    }
    return data as ParentGuardian;
  },

  async getChildren(parentId: string) {
    const { data, error } = await supabase
      .from('parent_camper_links')
      .select(`
        *,
        camper:campers(*)
      `)
      .eq('parent_id', parentId);
    
    if (error) {
      console.error('Error fetching children:', error);
      throw error;
    }
    return data;
  },

  async linkToCamper(parentId: string, camperId: string, relationship: string) {
    const { data, error } = await supabase
      .from('parent_camper_links')
      .insert({ parent_id: parentId, camper_id: camperId, relationship })
      .select()
      .single();
    
    if (error) {
      console.error('Error linking parent to camper:', error);
      throw error;
    }
    return data as ParentCamperLink;
  },

  async createInvitation(invitation: Omit<ParentInvitation, 'id' | 'sentAt' | 'createdAt'>) {
    const { data, error } = await supabase
      .from('parent_invitations')
      .insert(invitation)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating invitation:', error);
      throw error;
    }
    return data as ParentInvitation;
  },

  async getInvitationByToken(token: string) {
    const { data, error } = await supabase
      .from('parent_invitations')
      .select('*')
      .eq('invitation_token', token)
      .single();
    
    if (error) {
      console.error('Error fetching invitation:', error);
      throw error;
    }
    return data as ParentInvitation;
  },

  async acceptInvitation(token: string) {
    const { data, error } = await supabase
      .from('parent_invitations')
      .update({ 
        status: 'accepted', 
        accepted_at: new Date().toISOString() 
      })
      .eq('invitation_token', token)
      .select()
      .single();
    
    if (error) {
      console.error('Error accepting invitation:', error);
      throw error;
    }
    return data as ParentInvitation;
  },
};

// Audit log operations
export const auditService = {
  async log(log: Omit<AuditLog, 'id' | 'createdAt'>) {
    const { data, error } = await supabase
      .from('audit_logs')
      .insert(log)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating audit log:', error);
      throw error;
    }
    return data as AuditLog;
  },

  async getAll(filters?: { tableName?: string; recordId?: string; userId?: string }) {
    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (filters?.tableName) {
      query = query.eq('table_name', filters.tableName);
    }
    if (filters?.recordId) {
      query = query.eq('record_id', filters.recordId);
    }
    if (filters?.userId) {
      query = query.eq('user_id', filters.userId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching audit logs:', error);
      throw error;
    }
    return data as AuditLog[];
  },
};
