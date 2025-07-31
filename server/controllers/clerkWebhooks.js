import { Webhook } from "svix";
import User from "../models/User.js";

const clerkWebhooks = async (req, res) => {
  console.log("--- Webhook Handler Started ---");

  try {
    const whook = new Webhook(process.env.CLERK_WEBHOOK_SECRET);
    const payload = req.body;
    const headers = {
      "svix-id": req.headers["svix-id"],
      "svix-timestamp": req.headers["svix-timestamp"],
      "svix-signature": req.headers["svix-signature"],
    };

    console.log("Verifying webhook...");
    const evt = whook.verify(JSON.stringify(payload), headers);
    console.log("Webhook verified successfully!");

    const { data, type } = evt;

    // Correctly map the data from Clerk to your User schema
    const userData = {
      _id: data.id,
      email: data.email_addresses[0].email_address,
      username: `${data.first_name || ""} ${data.last_name || ""}`.trim(),
      image: data.image_url,
    };
    
    console.log(`Processing event type: ${type}`);

    if (type === "user.created") {
      console.log("Attempting to create user in database with data:", JSON.stringify(userData));
      await User.create(userData);
      console.log("SUCCESS: User created in database.");
    }

    if (type === "user.updated") {
      console.log("Attempting to update user in database with data:", JSON.stringify(userData));
      await User.findByIdAndUpdate(data.id, userData);
      console.log("SUCCESS: User updated in database.");
    }

    if (type === "user.deleted") {
      console.log("Attempting to delete user from database...");
      await User.findByIdAndDelete(data.id);
      console.log("SUCCESS: User deleted from database.");
    }

    res.status(200).json({ success: true, message: "Webhook received" });

  } catch (error) {
    console.error("!!! ERROR in webhook handler:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

export default clerkWebhooks;
