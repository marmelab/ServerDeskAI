import { signIn, signUp, signOut } from "../services/auth";

export const useAuth = () => ({ signIn, signUp, signOut });
