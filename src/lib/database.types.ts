export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          user_id: string;
          name: string;
          role: Database["public"]["Enums"]["app_role"];
          created_at: string;
        };
        Insert: {
          user_id: string;
          name: string;
          role: Database["public"]["Enums"]["app_role"];
          created_at?: string;
        };
        Update: {
          user_id?: string;
          name?: string;
          role?: Database["public"]["Enums"]["app_role"];
          created_at?: string;
        };
      };
      companies: {
        Row: {
          id: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_companies: {
        Row: {
          user_id: string;
          company_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          company_id: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          company_id?: string;
          created_at?: string;
        };
      };
      invites: {
        Row: {
          id: string;
          email: string;
          role: Database["public"]["Enums"]["app_role"];
          token: string;
          invited_by: string;
          used_at: string | null;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          role: Database["public"]["Enums"]["app_role"];
          token: string;
          invited_by: string;
          used_at?: string | null;
          expires_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          role?: Database["public"]["Enums"]["app_role"];
          token?: string;
          invited_by?: string;
          used_at?: string | null;
          expires_at?: string;
          created_at?: string;
        };
      };
      invite_companies: {
        Row: {
          invite_id: string;
          company_id: string;
          created_at: string;
        };
        Insert: {
          invite_id: string;
          company_id: string;
          created_at?: string;
        };
        Update: {
          invite_id?: string;
          company_id?: string;
          created_at?: string;
        };
      };
      customers: {
        Row: {
          id: string;
          email: string;
          name: string;
          company_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          name: string;
          company_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          company_id?: string;
          created_at?: string;
        };
      };
      tickets: {
        Row: {
          id: string;
          subject: string;
          description: string | null;
          status: Database["public"]["Enums"]["ticket_status"];
          priority: Database["public"]["Enums"]["ticket_priority"];
          customer_id: string;
          company_id: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          subject: string;
          description?: string | null;
          status?: Database["public"]["Enums"]["ticket_status"];
          priority?: Database["public"]["Enums"]["ticket_priority"];
          customer_id: string;
          company_id: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          subject?: string;
          description?: string | null;
          status?: Database["public"]["Enums"]["ticket_status"];
          priority?: Database["public"]["Enums"]["ticket_priority"];
          customer_id?: string;
          company_id?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      ticket_messages: {
        Row: {
          id: string;
          ticket_id: string;
          sender_type: Database["public"]["Enums"]["sender_type"];
          sender_id: string | null;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          ticket_id: string;
          sender_type: Database["public"]["Enums"]["sender_type"];
          sender_id?: string | null;
          body: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          ticket_id?: string;
          sender_type?: Database["public"]["Enums"]["sender_type"];
          sender_id?: string | null;
          body?: string;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      app_role: "admin" | "agent" | "customer_manager";
      ticket_status: "open" | "in_progress" | "waiting" | "resolved" | "closed";
      ticket_priority: "low" | "medium" | "high" | "urgent";
      sender_type: "customer" | "agent" | "system";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
