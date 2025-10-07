import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import * as nodemailer from "nodemailer";

admin.initializeApp();
const db = admin.firestore();

interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string;
  photoURL: string;
  role: string[];
  createdAt: FirebaseFirestore.FieldValue;
  lastLogin: FirebaseFirestore.FieldValue;
}

export const createUserProfile = functions.auth.user().onCreate(async (user) => {
  const { uid, email = "", displayName = "", photoURL = "" } = user;
  const userRef = db.collection("users").doc(user.uid);

  const newUser: UserProfile = {
    uid,
    email,
    displayName,
    photoURL,
    role: ["user"],
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    lastLogin: admin.firestore.FieldValue.serverTimestamp(),
  };

  await userRef.set(newUser);
  console.log(`✅ Created Firestore profile for ${user.uid}`);

  // send a welcome email (optional)
  if (!email) {
    console.log(`ℹ️ No email provided for user ${user.uid}, skipping welcome email.`);
    return;
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Welcome to Chef Andel!",
    text: `Hello ${displayName},\n\nWelcome to Chef Andel! We're glad to have you on board.\n\nBest,\nThe Team`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Sent welcome email to ${email}`);
  } catch (error) {
    console.error(`❌ Failed to send welcome email to ${email}:`, error);
  }
});
