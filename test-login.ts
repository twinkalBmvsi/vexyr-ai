import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// Load .env.local
const envPath = path.resolve(".env.local");
const envConfig = fs.readFileSync(envPath, "utf8");
envConfig.split("\n").forEach((line) => {
  const match = line.match(/^([^=:#]+?)[=:](.*)/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim();
    process.env[key] = value;
  }
});

async function testLogin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseServiceRole) {
    console.error("Missing credentials");
    return;
  }

  const admin = createClient(supabaseUrl, supabaseServiceRole);
  const client = createClient(supabaseUrl, anonKey);

  // 1. Force update password for John
  const {
    data: { users },
  } = await admin.auth.admin.listUsers();
  const targetUser = users.find((u) => u.email === "priya@yopmail.com");

  if (targetUser) {
    console.log("Found user:", targetUser.email);
    const { error: updateError } = await admin.auth.admin.updateUserById(targetUser.id, {
      password: "Priya@123",
      email_confirm: true,
    });

    if (updateError) {
      console.log("Error updating password:", updateError);
    } else {
      console.log("Successfully reset password to John@123");
    }

    // 2. Try to log in
    const { data: authData, error: loginError } = await client.auth.signInWithPassword({
      email: "Priya@yopmail.com",
      password: "Priya@123",
    });

    if (loginError) {
      console.error("Login failed:", loginError.message);
    } else {
      console.log("Login successful! Session established.");
    }
  } else {
    console.log("User priya@yopmail.com not found!");
  }
}

testLogin();
