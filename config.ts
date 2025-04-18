import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config();

const URL = process.env.SUPABASE_URL || "";
const KEY = process.env.SUPABASE_KEY || "";

const apiClient = createClient(URL, KEY);

export default apiClient;
