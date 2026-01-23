
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      authorization_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          linked_camper_ids: string[] | null
          max_uses: number | null
          role: string
          updated_at: string
          used_count: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          linked_camper_ids?: string[] | null
          max_uses?: number | null
          role: string
          updated_at?: string
          used_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          linked_camper_ids?: string[] | null
          max_uses?: number | null
          role?: string
          updated_at?: string
          used_count?: number
        }
        Relationships: []
      }
      camp_staff: {
        Row: {
          assigned_at: string | null
          camp_id: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          camp_id: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          camp_id?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "camp_staff_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
        ]
      }
      camper_medical_info: {
        Row: {
          allergies: string[] | null
          camper_id: string
          created_at: string | null
          dietary_restrictions: string[] | null
          doctor_name: string | null
          doctor_phone: string | null
          id: string
          insurance_number: string | null
          insurance_provider: string | null
          medical_conditions: string[] | null
          medications: string[] | null
          notes: string | null
          special_care_instructions: string | null
          updated_at: string | null
        }
        Insert: {
          allergies?: string[] | null
          camper_id: string
          created_at?: string | null
          dietary_restrictions?: string[] | null
          doctor_name?: string | null
          doctor_phone?: string | null
          id?: string
          insurance_number?: string | null
          insurance_provider?: string | null
          medical_conditions?: string[] | null
          medications?: string[] | null
          notes?: string | null
          special_care_instructions?: string | null
          updated_at?: string | null
        }
        Update: {
          allergies?: string[] | null
          camper_id?: string
          created_at?: string | null
          dietary_restrictions?: string[] | null
          doctor_name?: string | null
          doctor_phone?: string | null
          id?: string
          insurance_number?: string | null
          insurance_provider?: string | null
          medical_conditions?: string[] | null
          medications?: string[] | null
          notes?: string | null
          special_care_instructions?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "camper_medical_info_camper_id_fkey"
            columns: ["camper_id"]
            isOneToOne: true
            referencedRelation: "campers"
            referencedColumns: ["id"]
          },
        ]
      }
      campers: {
        Row: {
          cabin_assignment: string | null
          camp_id: string
          check_in_status: string | null
          created_at: string | null
          date_of_birth: string
          first_name: string
          id: string
          last_check_in: string | null
          last_check_out: string | null
          last_name: string
          photo_url: string | null
          registration_status: string
          session_id: string | null
          swim_level: string | null
          updated_at: string | null
          wristband_assigned: boolean | null
          wristband_id: string | null
        }
        Insert: {
          cabin_assignment?: string | null
          camp_id: string
          check_in_status?: string | null
          created_at?: string | null
          date_of_birth: string
          first_name: string
          id?: string
          last_check_in?: string | null
          last_check_out?: string | null
          last_name: string
          photo_url?: string | null
          registration_status: string
          session_id?: string | null
          swim_level?: string | null
          updated_at?: string | null
          wristband_assigned?: boolean | null
          wristband_id?: string | null
        }
        Update: {
          cabin_assignment?: string | null
          camp_id?: string
          check_in_status?: string | null
          created_at?: string | null
          date_of_birth?: string
          first_name?: string
          id?: string
          last_check_in?: string | null
          last_check_out?: string | null
          last_name?: string
          photo_url?: string | null
          registration_status?: string
          session_id?: string | null
          swim_level?: string | null
          updated_at?: string | null
          wristband_assigned?: boolean | null
          wristband_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campers_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      camps: {
        Row: {
          created_at: string | null
          description: string | null
          end_date: string
          id: string
          location: string
          max_capacity: number
          name: string
          parent_registration_deadline: string | null
          start_date: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_date: string
          id?: string
          location: string
          max_capacity: number
          name: string
          parent_registration_deadline?: string | null
          start_date: string
          status: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_date?: string
          id?: string
          location?: string
          max_capacity?: number
          name?: string
          parent_registration_deadline?: string | null
          start_date?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      emergency_contacts: {
        Row: {
          camper_id: string
          created_at: string | null
          email: string | null
          full_name: string
          id: string
          phone: string
          priority_order: number
          relationship: string
          updated_at: string | null
        }
        Insert: {
          camper_id: string
          created_at?: string | null
          email?: string | null
          full_name: string
          id?: string
          phone: string
          priority_order: number
          relationship: string
          updated_at?: string | null
        }
        Update: {
          camper_id?: string
          created_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          phone?: string
          priority_order?: number
          relationship?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "emergency_contacts_camper_id_fkey"
            columns: ["camper_id"]
            isOneToOne: false
            referencedRelation: "campers"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_camper_links: {
        Row: {
          camper_id: string
          created_at: string | null
          id: string
          parent_id: string
          relationship: string
        }
        Insert: {
          camper_id: string
          created_at?: string | null
          id?: string
          parent_id: string
          relationship: string
        }
        Update: {
          camper_id?: string
          created_at?: string | null
          id?: string
          parent_id?: string
          relationship?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_camper_links_camper_id_fkey"
            columns: ["camper_id"]
            isOneToOne: false
            referencedRelation: "campers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_camper_links_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "parent_guardians"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_guardians: {
        Row: {
          created_at: string | null
          email: string
          full_name: string
          home_address: string | null
          id: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name: string
          home_address?: string | null
          id: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string
          home_address?: string | null
          id?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      parent_invitations: {
        Row: {
          accepted_at: string | null
          camper_id: string
          created_at: string | null
          email: string
          expires_at: string
          full_name: string
          id: string
          invitation_token: string
          relationship: string
          sent_at: string | null
          status: string
        }
        Insert: {
          accepted_at?: string | null
          camper_id: string
          created_at?: string | null
          email: string
          expires_at: string
          full_name: string
          id?: string
          invitation_token: string
          relationship: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          accepted_at?: string | null
          camper_id?: string
          created_at?: string | null
          email?: string
          expires_at?: string
          full_name?: string
          id?: string
          invitation_token?: string
          relationship?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_invitations_camper_id_fkey"
            columns: ["camper_id"]
            isOneToOne: false
            referencedRelation: "campers"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          camp_id: string
          created_at: string | null
          end_date: string
          id: string
          max_capacity: number | null
          name: string
          start_date: string
          updated_at: string | null
        }
        Insert: {
          camp_id: string
          created_at?: string | null
          end_date: string
          id?: string
          max_capacity?: number | null
          name: string
          start_date: string
          updated_at?: string | null
        }
        Update: {
          camp_id?: string
          created_at?: string | null
          end_date?: string
          id?: string
          max_capacity?: number | null
          name?: string
          start_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_camp_id_fkey"
            columns: ["camp_id"]
            isOneToOne: false
            referencedRelation: "camps"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          created_at: string | null
          email: string
          full_name: string
          id: string
          phone: string | null
          registration_complete: boolean | null
          role: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name: string
          id: string
          phone?: string | null
          registration_complete?: boolean | null
          role: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          registration_complete?: boolean | null
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auto_assign_first_admin: { Args: never; Returns: undefined }
      bootstrap_first_admin: { Args: never; Returns: undefined }
      create_camper_bypass_rls: {
        Args: {
          p_camp_id: string
          p_date_of_birth: string
          p_first_name: string
          p_last_name: string
          p_wristband_id?: string
        }
        Returns: string
      }
      get_admin_camp_ids: { Args: never; Returns: string[] }
      get_all_authorization_codes: {
        Args: never
        Returns: {
          code: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          linked_camper_ids: string[] | null
          max_uses: number | null
          role: string
          updated_at: string
          used_count: number
        }[]
        SetofOptions: {
          from: "*"
          to: "authorization_codes"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_all_campers: {
        Args: never
        Returns: {
          camp_id: string
          check_in_status: string
          date_of_birth: string
          first_name: string
          id: string
          last_name: string
          wristband_id: string
        }[]
      }
      get_all_user_profiles: {
        Args: never
        Returns: {
          created_at: string | null
          email: string
          full_name: string
          id: string
          phone: string | null
          registration_complete: boolean | null
          role: string
          updated_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "user_profiles"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_camper_by_id: {
        Args: { p_camper_id: string }
        Returns: {
          cabin_assignment: string
          camp_id: string
          check_in_status: string
          created_at: string
          date_of_birth: string
          first_name: string
          id: string
          last_check_in: string
          last_check_out: string
          last_name: string
          registration_status: string
          session_id: string
          swim_level: string
          updated_at: string
          wristband_id: string
        }[]
      }
      get_comprehensive_camper_data: {
        Args: { p_camper_id: string }
        Returns: {
          allergies: string[]
          cabin_assignment: string
          check_in_status: string
          date_of_birth: string
          first_name: string
          id: string
          last_name: string
          medications: string[]
          session_id: string
          swim_level: string
        }[]
      }
      get_first_camp: {
        Args: never
        Returns: {
          id: string
          name: string
        }[]
      }
      get_first_camp_id: { Args: never; Returns: string }
      get_user_camp_ids: { Args: never; Returns: string[] }
      has_any_staff_assignments: { Args: never; Returns: boolean }
      increment_code_usage: { Args: { p_code_id: string }; Returns: undefined }
      validate_authorization_code: { Args: { p_code: string }; Returns: Json }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
