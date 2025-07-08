// src/api/createUser.ts
import { supabase } from "../lib/supabase"; // client-side session management
import { supabaseAdmin } from "../lib/supabaseAdmin"; // server-side admin client
import { useAuthStore } from "../store/auth";

export async function createUser(
  email: string,
  password: string,
  role: string = "user",
  fullName: string = ""
) {
  try {
    // ✅ Get current admin ID
    const { userId, isAdmin } = useAuthStore.getState();
    if (!userId || !isAdmin) throw new Error("Only admins can add users");

    // ✅ Look up clinic_name from admin's row
    const { data: adminRow, error: adminError } = await supabaseAdmin
      .from("users")
      .select("clinic_name")
      .eq("id", userId)
      .single();

    if (adminError || !adminRow?.clinic_name) {
      throw new Error("Failed to fetch admin's clinic name");
    }

    const clinicName = adminRow.clinic_name;

    // ✅ Create user in Supabase Auth
    const { data: userData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      },
    });

    if (signUpError) throw signUpError;
    if (!userData?.user) throw new Error("User creation failed");

    const newUserId = userData.user.id;

    // ✅ Insert into your custom users table
    const payload = {
      id: newUserId,
      email,
      full_name: fullName,
      clinic_name: clinicName, // ✅ inherited from admin
      role,
      admin_id: userId,
    };

    console.log("🧾 Inserting into users table:", payload);

    const { error: insertError } = await supabaseAdmin.from("users").insert([payload]);
    if (insertError) {
      console.error("❌ Insert error:", insertError.message);
      return { success: false, message: insertError.message };
    }

    // ✅ Do NOT sign out admin anymore — fixed
    // await supabase.auth.signOut(); ← removed to prevent admin logout

    return { success: true, message: "User successfully created!" };
  } catch (err: any) {
    console.error("❌ Error creating user:", err.message);
    return { success: false, message: err.message };
  }
}
