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
    PostgrestVersion: "12.2.3 (519615d)"
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
      workspaces: {
        Row: {
          id: string
          name: string
          account_type: Database["public"]["Enums"]["account_type"]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          account_type: Database["public"]["Enums"]["account_type"]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          account_type?: Database["public"]["Enums"]["account_type"]
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      workspace_members: {
        Row: {
          id: string
          workspace_id: string | null
          user_id: string
          role: Database["public"]["Enums"]["workspace_role"]
          allowed_list_ids: string[]
          is_team_leader: boolean
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id?: string | null
          user_id: string
          role: Database["public"]["Enums"]["workspace_role"]
          allowed_list_ids?: string[]
          is_team_leader?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string | null
          user_id?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          allowed_list_ids?: string[]
          is_team_leader?: boolean
          created_at?: string
        }
        Relationships: []
      }
      shareholder_lists: {
        Row: {
          id: string
          workspace_id: string
          name: string
          active_from: string | null
          active_to: string | null
          is_visible: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          name: string
          active_from?: string | null
          active_to?: string | null
          is_visible?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          name?: string
          active_from?: string | null
          active_to?: string | null
          is_visible?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      shareholders: {
        Row: {
          id: string
          list_id: string
          name: string | null
          address: string | null
          lat: number | null
          lng: number | null
          latlngaddress: string | null
          company: string | null
          status: string | null
          stocks: number
          memo: string | null
          maker: string | null
          image: string | null
          history: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          list_id: string
          name?: string | null
          address?: string | null
          lat?: number | null
          lng?: number | null
          latlngaddress?: string | null
          company?: string | null
          status?: string | null
          stocks?: number
          memo?: string | null
          maker?: string | null
          image?: string | null
          history?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          list_id?: string
          name?: string | null
          address?: string | null
          lat?: number | null
          lng?: number | null
          latlngaddress?: string | null
          company?: string | null
          status?: string | null
          stocks?: number
          memo?: string | null
          maker?: string | null
          image?: string | null
          history?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      shareholder_change_history: {
        Row: {
          id: string
          shareholder_id: string
          changed_by: string
          changed_at: string
          field: string
          old_value: string | null
          new_value: string | null
        }
        Insert: {
          id?: string
          shareholder_id: string
          changed_by: string
          changed_at?: string
          field: string
          old_value?: string | null
          new_value?: string | null
        }
        Update: {
          id?: string
          shareholder_id?: string
          changed_by?: string
          changed_at?: string
          field?: string
          old_value?: string | null
          new_value?: string | null
        }
        Relationships: []
      }
      signup_requests: {
        Row: {
          id: string
          email: string
          account_type: Database["public"]["Enums"]["account_type"]
          workspace_name: string
          user_id: string | null
          status: Database["public"]["Enums"]["signup_request_status"]
          processed_by: string | null
          processed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          account_type: Database["public"]["Enums"]["account_type"]
          workspace_name: string
          user_id?: string | null
          status?: Database["public"]["Enums"]["signup_request_status"]
          processed_by?: string | null
          processed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          account_type?: Database["public"]["Enums"]["account_type"]
          workspace_name?: string
          user_id?: string | null
          status?: Database["public"]["Enums"]["signup_request_status"]
          processed_by?: string | null
          processed_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      field_agent_activity_photos: {
        Row: {
          id: string
          workspace_id: string
          user_id: string
          file_path: string
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          user_id: string
          file_path: string
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          user_id?: string
          file_path?: string
          created_at?: string
        }
        Relationships: []
      }
      resource_requests: {
        Row: {
          id: string
          workspace_id: string | null
          requested_by: string
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id?: string | null
          requested_by: string
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string | null
          requested_by?: string
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_distinct_company: {
        Args: Record<PropertyKey, never>
        Returns: {
          company: string
        }[]
      }
      get_distinct_status: {
        Args: Record<PropertyKey, never>
        Returns: {
          status: string
        }[]
      }
    }
    Enums: {
      account_type: "listed_company" | "proxy_company"
      workspace_role: "service_admin" | "top_admin" | "admin" | "field_agent"
      signup_request_status: "pending" | "approved" | "rejected"
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
      account_type: ["listed_company", "proxy_company"] as const,
      workspace_role: [
        "service_admin",
        "top_admin",
        "admin",
        "field_agent",
      ] as const,
      signup_request_status: ["pending", "approved", "rejected"] as const,
    },
  },
} as const
