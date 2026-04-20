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
      excel: {
        Row: {
          address: string | null
          company: string | null
          history: Json | null
          id: number
          image: string | null
          lat: number | null
          latlngaddress: string | null
          lng: number | null
          maker: string | null
          memo: string | null
          name: string | null
          status: string | null
          stocks: number
        }
        Insert: {
          address?: string | null
          company?: string | null
          history?: Json | null
          id?: number
          image?: string | null
          lat?: number | null
          latlngaddress?: string | null
          lng?: number | null
          maker?: string | null
          memo?: string | null
          name?: string | null
          status?: string | null
          stocks: number
        }
        Update: {
          address?: string | null
          company?: string | null
          history?: Json | null
          id?: number
          image?: string | null
          lat?: number | null
          latlngaddress?: string | null
          lng?: number | null
          maker?: string | null
          memo?: string | null
          name?: string | null
          status?: string | null
          stocks?: number
        }
        Relationships: []
      }
      excel_import_staging: {
        Row: {
          created_at: string
          created_by: string
          error_message: string | null
          id: string
          list_id: string
          original_address: string | null
          row_data: Json
          status: string
          stocks: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          error_message?: string | null
          id?: string
          list_id: string
          original_address?: string | null
          row_data: Json
          status?: string
          stocks?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          error_message?: string | null
          id?: string
          list_id?: string
          original_address?: string | null
          row_data?: Json
          status?: string
          stocks?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "excel_import_staging_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "shareholder_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      field_agent_activity_photos: {
        Row: {
          created_at: string
          file_path: string
          id: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          file_path: string
          id?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          file_path?: string
          id?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "field_agent_activity_photos_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      list_rules_acceptances: {
        Row: {
          accepted_at: string
          list_id: string
          rules_version: number
          user_id: string
        }
        Insert: {
          accepted_at?: string
          list_id: string
          rules_version: number
          user_id: string
        }
        Update: {
          accepted_at?: string
          list_id?: string
          rules_version?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "list_rules_acceptances_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "shareholder_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      list_upload_tokens: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          list_id: string
          token: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at: string
          id?: string
          list_id: string
          token: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          list_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "list_upload_tokens_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "shareholder_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_audit_log: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          details: Json | null
          id: string
          resource_id: string | null
          resource_type: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          resource_id?: string | null
          resource_type: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          resource_id?: string | null
          resource_type?: string
        }
        Relationships: []
      }
      resource_requests: {
        Row: {
          created_at: string
          id: string
          requested_by: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          requested_by: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          requested_by?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resource_requests_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      shareholder_change_history: {
        Row: {
          changed_at: string
          changed_by: string
          field: string
          id: string
          new_value: string | null
          old_value: string | null
          shareholder_id: string
        }
        Insert: {
          changed_at?: string
          changed_by: string
          field: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          shareholder_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string
          field?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          shareholder_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shareholder_change_history_shareholder_id_fkey"
            columns: ["shareholder_id"]
            isOneToOne: false
            referencedRelation: "shareholders"
            referencedColumns: ["id"]
          },
        ]
      }
      shareholder_lists: {
        Row: {
          active_from: string | null
          active_to: string | null
          archived_at: string | null
          completed_at: string | null
          contact_note: string | null
          contact_phone: string | null
          created_at: string
          id: string
          is_visible: boolean
          name: string
          rules_version: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          active_from?: string | null
          active_to?: string | null
          archived_at?: string | null
          completed_at?: string | null
          contact_note?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_visible?: boolean
          name: string
          rules_version?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          active_from?: string | null
          active_to?: string | null
          archived_at?: string | null
          completed_at?: string | null
          contact_note?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_visible?: boolean
          name?: string
          updated_at?: string
          rules_version?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shareholder_lists_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      shareholders: {
        Row: {
          address: string | null
          address_original: string | null
          company: string | null
          created_at: string
          geocode_status: string | null
          history: Json | null
          id: string
          image: string | null
          lat: number | null
          latlngaddress: string | null
          list_id: string
          lng: number | null
          maker: string | null
          memo: string | null
          name: string | null
          status: string | null
          stocks: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          address_original?: string | null
          company?: string | null
          created_at?: string
          geocode_status?: string | null
          history?: Json | null
          id?: string
          image?: string | null
          lat?: number | null
          latlngaddress?: string | null
          list_id: string
          lng?: number | null
          maker?: string | null
          memo?: string | null
          name?: string | null
          status?: string | null
          stocks?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          address_original?: string | null
          company?: string | null
          created_at?: string
          geocode_status?: string | null
          history?: Json | null
          id?: string
          image?: string | null
          lat?: number | null
          latlngaddress?: string | null
          list_id?: string
          lng?: number | null
          maker?: string | null
          memo?: string | null
          name?: string | null
          status?: string | null
          stocks?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shareholders_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "shareholder_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      signup_requests: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          created_at: string
          email: string
          id: string
          processed_at: string | null
          processed_by: string | null
          status: Database["public"]["Enums"]["signup_request_status"]
          user_id: string | null
          workspace_name: string
        }
        Insert: {
          account_type: Database["public"]["Enums"]["account_type"]
          created_at?: string
          email: string
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          status?: Database["public"]["Enums"]["signup_request_status"]
          user_id?: string | null
          workspace_name: string
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          created_at?: string
          email?: string
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          status?: Database["public"]["Enums"]["signup_request_status"]
          user_id?: string | null
          workspace_name?: string
        }
        Relationships: []
      }
      workspace_members: {
        Row: {
          allowed_list_ids: string[] | null
          created_at: string
          id: string
          is_team_leader: boolean | null
          role: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          allowed_list_ids?: string[] | null
          created_at?: string
          id?: string
          is_team_leader?: boolean | null
          role: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          allowed_list_ids?: string[] | null
          created_at?: string
          id?: string
          is_team_leader?: boolean | null
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          account_type: Database["public"]["Enums"]["account_type"]
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_read_shareholder: { Args: { sh_id: string }; Returns: boolean }
      can_write_workspace: { Args: { ws_id: string }; Returns: boolean }
      get_distinct_company: {
        Args: never
        Returns: {
          company: string
        }[]
      }
      get_distinct_status: {
        Args: never
        Returns: {
          status: string
        }[]
      }
      is_service_admin: { Args: never; Returns: boolean }
      is_workspace_member: { Args: { ws_id: string }; Returns: boolean }
    }
    Enums: {
      account_type: "listed_company" | "proxy_company"
      signup_request_status: "pending" | "approved" | "rejected" | "revoked"
      workspace_role: "service_admin" | "top_admin" | "admin" | "field_agent"
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
    Enums: {
      account_type: ["listed_company", "proxy_company"],
      signup_request_status: ["pending", "approved", "rejected", "revoked"],
      workspace_role: ["service_admin", "top_admin", "admin", "field_agent"],
    },
  },
} as const

// Convenience types (single source for workspace/role shapes)
export type WorkspaceRow = Tables<"workspaces">
export type WorkspaceMemberRow = Tables<"workspace_members">
export type WorkspaceRole = Enums<"workspace_role">
export type AccountType = Enums<"account_type">

/** Workspace list item from /api/me/workspaces (id, name, account_type) */
export type MyWorkspaceItem = Pick<WorkspaceRow, "id" | "name" | "account_type">

/** Workspace list item from /api/admin/workspaces (includes created_at) */
export type AdminWorkspaceItem = Pick<
  WorkspaceRow,
  "id" | "name" | "account_type" | "created_at"
>
