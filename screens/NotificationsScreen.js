// screens/NotificationsScreen.js

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

import BackButton from "../components/BackButton";
import { Query } from "appwrite";
import { account, db, DB_ID, COL } from "../appwrite";

const DATABASE_ID = DB_ID;
const INVITATIONS_ID = "invitations";
const FOODLISTS_ID = COL.foodlists || "foodlists";

const BRAND = {
  primary: "#FF4D00",
  accent: "#FDAA48",
  bg: "#FFF5ED",
  card: "#FFFFFF",
  line: "#FFE3C6",
  ink: "#1F2937",
  inkMuted: "#6B7280",
};

export default function NotificationsScreen() {
  const navigation = useNavigation();

  const [currentUser, setCurrentUser] = useState(null);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);

  // --------------------------------------------------
  // 1. FETCH INVITATIONS FROM APPWRITE
  // --------------------------------------------------
  const loadInvitations = async (targetUserId = currentUser?.$id) => {
    if (!targetUserId) {
      setInvites([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await db.listDocuments(DATABASE_ID, INVITATIONS_ID, [
        Query.equal("toUser", targetUserId),
        Query.equal("status", "pending"),
      ]);

      setInvites(Array.isArray(res.documents) ? res.documents : []);
    } catch (err) {
      console.log("Error fetching invitations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const fetchUserAndInvites = async () => {
      try {
        const profile = await account.get();
        if (!isMounted) return;

        setCurrentUser(profile);
        await loadInvitations(profile.$id);
      } catch (err) {
        console.log("Error loading current user:", err);
        if (isMounted) {
          setCurrentUser(null);
          setInvites([]);
          setLoading(false);
        }
      }
    };

    fetchUserAndInvites();

    return () => {
      isMounted = false;
    };
  }, []);

  // --------------------------------------------------
  // 2. ACCEPT INVITE
  // --------------------------------------------------
  const acceptInvite = async (invite) => {
    if (!currentUser) return;

    try {
      const foodlist = await db.getDocument(
        DATABASE_ID,
        FOODLISTS_ID,
        invite.foodlistId
      );
      const existingCollaborators = Array.isArray(foodlist?.collaborators)
        ? foodlist.collaborators
        : [];
      const collaborators = Array.from(
        new Set([
          ...existingCollaborators,
          invite.fromUser,
          currentUser.$id,
        ].filter(Boolean))
      );

      await db.updateDocument(
        DATABASE_ID,
        INVITATIONS_ID,
        invite.$id,
        { status: "accepted" }
      );

      await db.updateDocument(
        DATABASE_ID,
        FOODLISTS_ID,
        invite.foodlistId,
        { collaborators }
      );

      setInvites((prev) => prev.filter((i) => i.$id !== invite.$id));
    } catch (err) {
      console.log("Accept invite failed:", err);
    }
  };

  // --------------------------------------------------
  // 3. DECLINE INVITE
  // --------------------------------------------------
  const declineInvite = async (invite) => {
    try {
      await db.updateDocument(
        DATABASE_ID,
        INVITATIONS_ID,
        invite.$id,
        { status: "declined" }
      );

      setInvites((prev) => prev.filter((i) => i.$id !== invite.$id));
    } catch (err) {
      console.log("Decline invite failed:", err);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BRAND.bg }}>
      {/* --------------------------------------- */}
      {/* HEADER */}
      {/* --------------------------------------- */}
      <View style={styles.header}>
        <BackButton onPress={() => navigation.goBack()} />
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Notifications</Text>
          <Text style={styles.headerSubtitle}>
            Stay up to date with invites, updates, and announcements.
          </Text>
        </View>
      </View>

      {/* --------------------------------------- */}
      {/* CONTENT */}
      {/* --------------------------------------- */}
      <View style={styles.container}>
        {loading ? (
          <ActivityIndicator size="large" color={BRAND.primary} />
        ) : invites.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>You're all caught up!</Text>
            <Text style={styles.emptyBody}>
              No new invitations right now.
            </Text>
          </View>
        ) : (
          <FlatList
            data={invites}
            keyExtractor={(item) => item.$id}
            contentContainerStyle={{ paddingVertical: 20, gap: 14 }}
            renderItem={({ item }) => (
              <InviteCard
                invite={item}
                onAccept={() => acceptInvite(item)}
                onDecline={() => declineInvite(item)}
              />
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

// --------------------------------------------------
// INVITE CARD
// --------------------------------------------------
function InviteCard({ invite, onAccept, onDecline }) {
  return (
    <View style={styles.inviteCard}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={styles.inviteTitle}>Foodlist Invite</Text>
        <Text style={styles.inviteBody}>
          User {invite.fromUser} wants to share a foodlist with you.
        </Text>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity onPress={onDecline} style={styles.declineBtn}>
          <Text style={styles.declineText}>Decline</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onAccept} style={styles.acceptBtn}>
          <Text style={styles.acceptText}>Accept</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// --------------------------------------------------
// STYLES
// --------------------------------------------------
const styles = StyleSheet.create({
  header: {
    backgroundColor: BRAND.primary,
    paddingHorizontal: 22,
    paddingTop: 30,
    paddingBottom: 26,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "800" },
  headerSubtitle: { color: "#FFEBD8", fontSize: 14, lineHeight: 20 },
  container: {
    flex: 1,
    backgroundColor: BRAND.bg,
    paddingHorizontal: 20,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    gap: 8,
  },
  emptyTitle: { color: BRAND.ink, fontWeight: "800", fontSize: 16 },
  emptyBody: { color: BRAND.inkMuted, textAlign: "center", lineHeight: 20 },
  inviteCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    backgroundColor: BRAND.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BRAND.line,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    gap: 12,
  },
  inviteTitle: { color: BRAND.ink, fontWeight: "800", fontSize: 15 },
  inviteBody: {
    color: BRAND.inkMuted,
    marginTop: 6,
    lineHeight: 20,
    fontSize: 13,
  },
  actionRow: { gap: 10 },
  declineBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FFB4A6",
    backgroundColor: "#FFF5F4",
  },
  declineText: { color: "#D73717", fontWeight: "700", fontSize: 12 },
  acceptBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#60D39A",
    backgroundColor: "#E6FFF2",
  },
  acceptText: { color: "#0F9158", fontWeight: "700", fontSize: 12 },
});
