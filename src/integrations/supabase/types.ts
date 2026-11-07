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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      blocks: {
        Row: {
          blocked_user_id: string
          blocker_user_id: string
          created_at: string
          id: string
          pool: Database["public"]["Enums"]["app_pool"]
        }
        Insert: {
          blocked_user_id: string
          blocker_user_id: string
          created_at?: string
          id?: string
          pool: Database["public"]["Enums"]["app_pool"]
        }
        Update: {
          blocked_user_id?: string
          blocker_user_id?: string
          created_at?: string
          id?: string
          pool?: Database["public"]["Enums"]["app_pool"]
        }
        Relationships: []
      }
      buddies: {
        Row: {
          buddy_user_id: string
          created_at: string
          pool: Database["public"]["Enums"]["app_pool"]
          user_id: string
        }
        Insert: {
          buddy_user_id: string
          created_at?: string
          pool: Database["public"]["Enums"]["app_pool"]
          user_id: string
        }
        Update: {
          buddy_user_id?: string
          created_at?: string
          pool?: Database["public"]["Enums"]["app_pool"]
          user_id?: string
        }
        Relationships: []
      }
      friend_requests: {
        Row: {
          created_at: string
          from_user_id: string
          id: string
          pool: Database["public"]["Enums"]["app_pool"]
          responded_at: string | null
          status: string
          to_user_id: string
        }
        Insert: {
          created_at?: string
          from_user_id: string
          id?: string
          pool: Database["public"]["Enums"]["app_pool"]
          responded_at?: string | null
          status?: string
          to_user_id: string
        }
        Update: {
          created_at?: string
          from_user_id?: string
          id?: string
          pool?: Database["public"]["Enums"]["app_pool"]
          responded_at?: string | null
          status?: string
          to_user_id?: string
        }
        Relationships: []
      }
      game_players: {
        Row: {
          game_id: string
          joined_at: string
          pool: Database["public"]["Enums"]["app_pool"]
          user_id: string | null
        }
        Insert: {
          game_id: string
          joined_at?: string
          pool: Database["public"]["Enums"]["app_pool"]
          user_id?: string | null
        }
        Update: {
          game_id?: string
          joined_at?: string
          pool?: Database["public"]["Enums"]["app_pool"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_players_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          created_at: string
          group_id: string | null
          host_avatar_seed: string
          host_name: string
          host_user_id: string
          id: string
          is_past: boolean
          lat: number | null
          lng: number | null
          location: string
          notes: string | null
          pool: Database["public"]["Enums"]["app_pool"]
          skill: string | null
          sport: string
          spots_taken: number
          spots_total: number
          when_at: string | null
          when_label: string
        }
        Insert: {
          created_at?: string
          group_id?: string | null
          host_avatar_seed: string
          host_name: string
          host_user_id: string
          id?: string
          is_past?: boolean
          lat?: number | null
          lng?: number | null
          location: string
          notes?: string | null
          pool: Database["public"]["Enums"]["app_pool"]
          skill?: string | null
          sport: string
          spots_taken?: number
          spots_total: number
          when_at?: string | null
          when_label: string
        }
        Update: {
          created_at?: string
          group_id?: string | null
          host_avatar_seed?: string
          host_name?: string
          host_user_id?: string
          id?: string
          is_past?: boolean
          lat?: number | null
          lng?: number | null
          location?: string
          notes?: string | null
          pool?: Database["public"]["Enums"]["app_pool"]
          skill?: string | null
          sport?: string
          spots_taken?: number
          spots_total?: number
          when_at?: string | null
          when_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "games_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_invites: {
        Row: {
          code: string
          created_at: string
          created_by: string
          group_id: string
          id: string
          pool: Database["public"]["Enums"]["app_pool"]
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          group_id: string
          id?: string
          pool: Database["public"]["Enums"]["app_pool"]
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          group_id?: string
          id?: string
          pool?: Database["public"]["Enums"]["app_pool"]
        }
        Relationships: [
          {
            foreignKeyName: "group_invites_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_join_requests: {
        Row: {
          created_at: string
          group_id: string
          id: string
          pool: Database["public"]["Enums"]["app_pool"]
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          pool: Database["public"]["Enums"]["app_pool"]
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          pool?: Database["public"]["Enums"]["app_pool"]
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_join_requests_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          joined_at: string
          pool: Database["public"]["Enums"]["app_pool"]
          role: string
          user_id: string
        }
        Insert: {
          group_id: string
          joined_at?: string
          pool: Database["public"]["Enums"]["app_pool"]
          role?: string
          user_id: string
        }
        Update: {
          group_id?: string
          joined_at?: string
          pool?: Database["public"]["Enums"]["app_pool"]
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          city: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_public: boolean
          lat: number | null
          lng: number | null
          name: string
          photo_url: string | null
          pool: Database["public"]["Enums"]["app_pool"]
          sports: Json
        }
        Insert: {
          city?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_public?: boolean
          lat?: number | null
          lng?: number | null
          name: string
          photo_url?: string | null
          pool: Database["public"]["Enums"]["app_pool"]
          sports?: Json
        }
        Update: {
          city?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_public?: boolean
          lat?: number | null
          lng?: number | null
          name?: string
          photo_url?: string | null
          pool?: Database["public"]["Enums"]["app_pool"]
          sports?: Json
        }
        Relationships: []
      }
      kudos: {
        Row: {
          created_at: string
          from_user_id: string
          game_id: string
          id: string
          kind: Database["public"]["Enums"]["kudo_type"]
          pool: Database["public"]["Enums"]["app_pool"]
          to_user_id: string
        }
        Insert: {
          created_at?: string
          from_user_id: string
          game_id: string
          id?: string
          kind: Database["public"]["Enums"]["kudo_type"]
          pool: Database["public"]["Enums"]["app_pool"]
          to_user_id: string
        }
        Update: {
          created_at?: string
          from_user_id?: string
          game_id?: string
          id?: string
          kind?: Database["public"]["Enums"]["kudo_type"]
          pool?: Database["public"]["Enums"]["app_pool"]
          to_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kudos_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachments: Json | null
          author_name: string
          author_user_id: string
          id: string
          kind: string
          payload: Json | null
          pool: Database["public"]["Enums"]["app_pool"]
          text: string
          thread_id: string
          ts: string
        }
        Insert: {
          attachments?: Json | null
          author_name: string
          author_user_id: string
          id?: string
          kind?: string
          payload?: Json | null
          pool: Database["public"]["Enums"]["app_pool"]
          text: string
          thread_id: string
          ts?: string
        }
        Update: {
          attachments?: Json | null
          author_name?: string
          author_user_id?: string
          id?: string
          kind?: string
          payload?: Json | null
          pool?: Database["public"]["Enums"]["app_pool"]
          text?: string
          thread_id?: string
          ts?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_seed: string
          avatar_url: string | null
          bio: string | null
          city: string | null
          created_at: string
          discoverable: boolean
          dob: string
          full_name: string
          id: string
          instagram: string | null
          lat: number | null
          lng: number | null
          other_social: string | null
          phone: string | null
          pool: Database["public"]["Enums"]["app_pool"]
          show_activity: boolean
          show_location: boolean
          show_skill: boolean
          show_sports: boolean
          snapchat: string | null
          sports: Json
        }
        Insert: {
          avatar_seed?: string
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          discoverable?: boolean
          dob: string
          full_name: string
          id: string
          instagram?: string | null
          lat?: number | null
          lng?: number | null
          other_social?: string | null
          phone?: string | null
          pool: Database["public"]["Enums"]["app_pool"]
          show_activity?: boolean
          show_location?: boolean
          show_skill?: boolean
          show_sports?: boolean
          snapchat?: string | null
          sports?: Json
        }
        Update: {
          avatar_seed?: string
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          discoverable?: boolean
          dob?: string
          full_name?: string
          id?: string
          instagram?: string | null
          lat?: number | null
          lng?: number | null
          other_social?: string | null
          phone?: string | null
          pool?: Database["public"]["Enums"]["app_pool"]
          show_activity?: boolean
          show_location?: boolean
          show_skill?: boolean
          show_sports?: boolean
          snapchat?: string | null
          sports?: Json
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          pool: Database["public"]["Enums"]["app_pool"]
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_user_id: string
          status: string
          target_id: string
          target_type: Database["public"]["Enums"]["report_target"]
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          pool: Database["public"]["Enums"]["app_pool"]
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_user_id: string
          status?: string
          target_id: string
          target_type: Database["public"]["Enums"]["report_target"]
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          pool?: Database["public"]["Enums"]["app_pool"]
          reason?: Database["public"]["Enums"]["report_reason"]
          reporter_user_id?: string
          status?: string
          target_id?: string
          target_type?: Database["public"]["Enums"]["report_target"]
        }
        Relationships: []
      }
      thread_reads: {
        Row: {
          last_read_at: string
          thread_id: string
          user_id: string
        }
        Insert: {
          last_read_at?: string
          thread_id: string
          user_id: string
        }
        Update: {
          last_read_at?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "thread_reads_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
      threads: {
        Row: {
          created_at: string
          game_id: string | null
          group_id: string | null
          id: string
          kind: string
          owner_user_id: string | null
          peer_user_id: string | null
          pool: Database["public"]["Enums"]["app_pool"]
          title: string | null
        }
        Insert: {
          created_at?: string
          game_id?: string | null
          group_id?: string | null
          id?: string
          kind: string
          owner_user_id?: string | null
          peer_user_id?: string | null
          pool: Database["public"]["Enums"]["app_pool"]
          title?: string | null
        }
        Update: {
          created_at?: string
          game_id?: string | null
          group_id?: string | null
          id?: string
          kind?: string
          owner_user_id?: string | null
          peer_user_id?: string | null
          pool?: Database["public"]["Enums"]["app_pool"]
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "threads_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "threads_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      pool_profiles_public: {
        Row: {
          avatar_seed: string | null
          bio: string | null
          city: string | null
          created_at: string | null
          dob: string | null
          full_name: string | null
          id: string | null
          lat: number | null
          lng: number | null
          pool: Database["public"]["Enums"]["app_pool"] | null
          sports: Json | null
        }
        Insert: {
          avatar_seed?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string | null
          dob?: string | null
          full_name?: string | null
          id?: string | null
          lat?: number | null
          lng?: number | null
          pool?: Database["public"]["Enums"]["app_pool"] | null
          sports?: Json | null
        }
        Update: {
          avatar_seed?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string | null
          dob?: string | null
          full_name?: string | null
          id?: string | null
          lat?: number | null
          lng?: number | null
          pool?: Database["public"]["Enums"]["app_pool"] | null
          sports?: Json | null
        }
        Relationships: []
      }
    }
    Functions: {
      blocked_between: { Args: { _a: string; _b: string }; Returns: boolean }
      compute_pool: {
        Args: { _dob: string }
        Returns: Database["public"]["Enums"]["app_pool"]
      }
      consume_group_invite: { Args: { _code: string }; Returns: string }
      is_group_admin: { Args: { _gid: string }; Returns: boolean }
      is_group_member: { Args: { _gid: string }; Returns: boolean }
      is_thread_participant: { Args: { _tid: string }; Returns: boolean }
      my_pool: { Args: never; Returns: Database["public"]["Enums"]["app_pool"] }
    }
    Enums: {
      app_pool: "minor" | "adult"
      kudo_type:
        | "good_sport"
        | "skilled"
        | "friendly"
        | "on_time"
        | "great_teammate"
      report_reason:
        | "harassment"
        | "hate_speech"
        | "spam"
        | "inappropriate"
        | "safety"
        | "impersonation"
        | "other"
      report_target: "user" | "message" | "game" | "group"
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
      app_pool: ["minor", "adult"],
      kudo_type: [
        "good_sport",
        "skilled",
        "friendly",
        "on_time",
        "great_teammate",
      ],
      report_reason: [
        "harassment",
        "hate_speech",
        "spam",
        "inappropriate",
        "safety",
        "impersonation",
        "other",
      ],
      report_target: ["user", "message", "game", "group"],
    },
  },
} as const
