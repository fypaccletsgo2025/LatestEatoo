import { Client, Databases, ID } from "react-native-appwrite";
import { APPWRITE_DB_ID, APPWRITE_INVITATIONS_COLLECTION, APPWRITE_FOODLISTS_COLLECTION } from "@env";

// Setup Appwrite client
const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT)
  .setKey(process.env.APPWRITE_API_KEY);

const db = new Databases(client);

export async function getUserInvitations(userId) {
  try {
    const res = await db.listDocuments(
      APPWRITE_DB_ID,
      APPWRITE_INVITATIONS_COLLECTION,
      [
        Query.equal("toUser", userId),
        Query.equal("status", "pending")
      ]
    );
    return res.documents;
  } catch (err) {
    console.log("Error fetching invitations:", err);
    return [];
  }
}

export async function acceptInvitation(invite) {
  // 1. Update foodlist collaborators
  await db.updateDocument(
    APPWRITE_DB_ID,
    APPWRITE_FOODLISTS_COLLECTION,
    invite.foodlistId,
    {
      collaborators: [...invite.collaborators, invite.toUser]
    }
  );

  // 2. Update invitation status
  await db.updateDocument(
    APPWRITE_DB_ID,
    APPWRITE_INVITATIONS_COLLECTION,
    invite.$id,
    { status: "accepted" }
  );
}

export async function declineInvitation(inviteId) {
  await db.updateDocument(
    APPWRITE_DB_ID,
    APPWRITE_INVITATIONS_COLLECTION,
    inviteId,
    { status: "declined" }
  );
}
