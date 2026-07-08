import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.warn("Supabase の環境変数が未設定です。");
}

export const supabase = createClient(url ?? "", anonKey ?? "", {
  global: {
    headers: {
      Authorization: `Bearer ${anonKey ?? ""}`,
      apikey: anonKey ?? "",
    },
  },
});
