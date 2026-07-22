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
      ai_artifacts: {
        Row: {
          created_at: string
          id: string
          kind: string
          payload: Json
          ref_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          payload?: Json
          ref_id?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          payload?: Json
          ref_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_usage: {
        Row: {
          created_at: string
          day: string
          id: string
          kind: string
          model: string
          month: string
          plan: string | null
          tokens_in: number
          tokens_out: number
          user_id: string
        }
        Insert: {
          created_at?: string
          day?: string
          id?: string
          kind?: string
          model: string
          month?: string
          plan?: string | null
          tokens_in?: number
          tokens_out?: number
          user_id: string
        }
        Update: {
          created_at?: string
          day?: string
          id?: string
          kind?: string
          model?: string
          month?: string
          plan?: string | null
          tokens_in?: number
          tokens_out?: number
          user_id?: string
        }
        Relationships: []
      }
      assignments: {
        Row: {
          created_at: string
          description: string
          due: string | null
          id: string
          notes: string
          priority: string
          resources: Json
          status: string
          subtasks: Json
          tags: string[]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string
          due?: string | null
          id?: string
          notes?: string
          priority?: string
          resources?: Json
          status?: string
          subtasks?: Json
          tags?: string[]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          due?: string | null
          id?: string
          notes?: string
          priority?: string
          resources?: Json
          status?: string
          subtasks?: Json
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      card_trades: {
        Row: {
          created_at: string
          from_user: string
          id: string
          offer_user_card_id: string
          request_card_id: number
          resolved_at: string | null
          status: string
          to_user: string
        }
        Insert: {
          created_at?: string
          from_user: string
          id?: string
          offer_user_card_id: string
          request_card_id: number
          resolved_at?: string | null
          status?: string
          to_user: string
        }
        Update: {
          created_at?: string
          from_user?: string
          id?: string
          offer_user_card_id?: string
          request_card_id?: number
          resolved_at?: string | null
          status?: string
          to_user?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_trades_offer_user_card_id_fkey"
            columns: ["offer_user_card_id"]
            isOneToOne: false
            referencedRelation: "user_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          sender_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          user_a?: string
          user_b?: string
        }
        Relationships: []
      }
      doc_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          doc_id: string
          id: string
          resolved: boolean
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          doc_id: string
          id?: string
          resolved?: boolean
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          doc_id?: string
          id?: string
          resolved?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "doc_comments_doc_id_fkey"
            columns: ["doc_id"]
            isOneToOne: false
            referencedRelation: "docs"
            referencedColumns: ["id"]
          },
        ]
      }
      doc_events: {
        Row: {
          chars: number
          created_at: string
          doc_id: string
          id: string
          kind: string
          user_id: string
        }
        Insert: {
          chars?: number
          created_at?: string
          doc_id: string
          id?: string
          kind: string
          user_id: string
        }
        Update: {
          chars?: number
          created_at?: string
          doc_id?: string
          id?: string
          kind?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "doc_events_doc_id_fkey"
            columns: ["doc_id"]
            isOneToOne: false
            referencedRelation: "docs"
            referencedColumns: ["id"]
          },
        ]
      }
      doc_shares: {
        Row: {
          created_at: string
          doc_id: string
          id: string
          invite_token: string
          owner_id: string
          role: string
          shared_with_email: string
        }
        Insert: {
          created_at?: string
          doc_id: string
          id?: string
          invite_token?: string
          owner_id: string
          role: string
          shared_with_email: string
        }
        Update: {
          created_at?: string
          doc_id?: string
          id?: string
          invite_token?: string
          owner_id?: string
          role?: string
          shared_with_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "doc_shares_doc_id_fkey"
            columns: ["doc_id"]
            isOneToOne: false
            referencedRelation: "docs"
            referencedColumns: ["id"]
          },
        ]
      }
      docs: {
        Row: {
          content_html: string
          created_at: string
          edit_seconds: number
          id: string
          paste_count: number
          share_token: string | null
          title: string
          updated_at: string
          user_id: string
          word_count: number
        }
        Insert: {
          content_html?: string
          created_at?: string
          edit_seconds?: number
          id?: string
          paste_count?: number
          share_token?: string | null
          title?: string
          updated_at?: string
          user_id: string
          word_count?: number
        }
        Update: {
          content_html?: string
          created_at?: string
          edit_seconds?: number
          id?: string
          paste_count?: number
          share_token?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          word_count?: number
        }
        Relationships: []
      }
      feed_post_likes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_posts: {
        Row: {
          body: string
          created_at: string
          id: string
          like_count: number
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          like_count?: number
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          like_count?: number
          user_id?: string
        }
        Relationships: []
      }
      plan_code_redemptions: {
        Row: {
          code_id: string
          id: string
          redeemed_at: string
          user_id: string
        }
        Insert: {
          code_id: string
          id?: string
          redeemed_at?: string
          user_id: string
        }
        Update: {
          code_id?: string
          id?: string
          redeemed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_code_redemptions_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "plan_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_codes: {
        Row: {
          active: boolean
          code: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          max_redemptions: number
          monthly_credit_override: number | null
          plan: string
          redeemed_count: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          max_redemptions?: number
          monthly_credit_override?: number | null
          plan: string
          redeemed_count?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          max_redemptions?: number
          monthly_credit_override?: number | null
          plan?: string
          redeemed_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          author_id: string
          body: string
          cover_url: string | null
          created_at: string
          id: string
          published: boolean
          slug: string
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          cover_url?: string | null
          created_at?: string
          id?: string
          published?: boolean
          slug: string
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          cover_url?: string | null
          created_at?: string
          id?: string
          published?: boolean
          slug?: string
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          accepted_content_policy_at: string | null
          accepted_privacy_at: string | null
          accepted_terms_at: string | null
          avatar_url: string | null
          coins: number
          created_at: string
          display_name: string | null
          id: string
          legal_version: string | null
          monthly_credit_override: number | null
          pack_opens_day: string | null
          pack_opens_today: number
          plan: string
          updated_at: string
        }
        Insert: {
          accepted_content_policy_at?: string | null
          accepted_privacy_at?: string | null
          accepted_terms_at?: string | null
          avatar_url?: string | null
          coins?: number
          created_at?: string
          display_name?: string | null
          id: string
          legal_version?: string | null
          monthly_credit_override?: number | null
          pack_opens_day?: string | null
          pack_opens_today?: number
          plan?: string
          updated_at?: string
        }
        Update: {
          accepted_content_policy_at?: string | null
          accepted_privacy_at?: string | null
          accepted_terms_at?: string | null
          avatar_url?: string | null
          coins?: number
          created_at?: string
          display_name?: string | null
          id?: string
          legal_version?: string | null
          monthly_credit_override?: number | null
          pack_opens_day?: string | null
          pack_opens_today?: number
          plan?: string
          updated_at?: string
        }
        Relationships: []
      }
      shared_list_items: {
        Row: {
          completed: boolean
          created_at: string
          created_by: string
          due_at: string | null
          id: string
          list_id: string
          title: string
          updated_at: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          created_by: string
          due_at?: string | null
          id?: string
          list_id: string
          title: string
          updated_at?: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          created_by?: string
          due_at?: string | null
          id?: string
          list_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_list_items_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "shared_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_list_members: {
        Row: {
          created_at: string
          id: string
          list_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          list_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          list_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_list_members_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "shared_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_lists: {
        Row: {
          created_at: string
          id: string
          owner_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          owner_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          owner_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      support_usage: {
        Row: {
          created_at: string
          day: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_cards: {
        Row: {
          card_id: number
          id: string
          obtained_at: string
          user_id: string
        }
        Insert: {
          card_id: number
          id?: string
          obtained_at?: string
          user_id: string
        }
        Update: {
          card_id?: number
          id?: string
          obtained_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_files: {
        Row: {
          content: string
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      doc_role_for: {
        Args: { _doc_id: string; _user_id: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_list_member: {
        Args: { _list_id: string; _user_id: string }
        Returns: boolean
      }
      redeem_plan_code: { Args: { _code: string }; Returns: Json }
      redeem_plan_code_for_user: {
        Args: { _code: string; _user_id: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
