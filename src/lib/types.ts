import type { Database } from "./database.types";

// Database row types
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Company = Database["public"]["Tables"]["companies"]["Row"];
export type UserCompany = Database["public"]["Tables"]["user_companies"]["Row"];
export type Invite = Database["public"]["Tables"]["invites"]["Row"];
export type InviteCompany = Database["public"]["Tables"]["invite_companies"]["Row"];
export type Customer = Database["public"]["Tables"]["customers"]["Row"];
export type Ticket = Database["public"]["Tables"]["tickets"]["Row"];
export type TicketMessage = Database["public"]["Tables"]["ticket_messages"]["Row"];

// Enum types
export type AppRole = Database["public"]["Enums"]["app_role"];
export type TicketStatus = Database["public"]["Enums"]["ticket_status"];
export type TicketPriority = Database["public"]["Enums"]["ticket_priority"];
export type SenderType = Database["public"]["Enums"]["sender_type"];
