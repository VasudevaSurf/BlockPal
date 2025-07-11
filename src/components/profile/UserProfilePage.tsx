// src/components/profile/UserProfilePage.tsx - UPDATED with enhanced 2FA support
"use client";

import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  Bell,
  HelpCircle,
  User,
  Mail,
  Calendar,
  Wallet as WalletIcon,
  Users,
  CreditCard,
  Edit3,
  Save,
  X,
  Shield,
  Globe,
  MessageSquare,
  LogOut,
  Eye,
  EyeOff,
  Copy,
  Smartphone,
  AtSign,
  UserPlus,
  Settings,
  Lock,
  ChevronDown,
} from "lucide-react";
import { RootState, AppDispatch } from "@/store";
import { logoutUser } from "@/store/slices/authSlice";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import TwoFactorSetupModal from "./TwoFactorSetupModal";
import ProfilePictureUpload from "./ProfilePictureUpload";
import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

interface UserProfile {
  username: string;
  displayName: string;
  gmail: string;
  avatar: string;
  walletAddress?: string;
  accountCreated: string;
  totalTransactions: number;
  scheduledPayments: number;
  friendsCount: number;
  preferences: {
    notifications: boolean;
    pushNotifications: boolean;
    emailNotifications: boolean;
    friendRequests: "everyone" | "none";
    currency: "USD" | "INR" | "EUR";
  };
  twoFactorEnabled: boolean;
  authProvider?: "email" | "google";
  hasPassword?: boolean;
  hasGoogleAuth?: boolean;
}

// Profile Statistics Skeleton Component
function ProfileStatsSkeleton() {
  return (
    <>
      {/* Mobile Stats */}
      <div className="block xl:hidden">
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-[#0F0F0F] rounded-lg p-3 border border-[#2C2C2C]"
            >
              <div className="flex items-center mb-2">
                <Skeleton variant="circular" className="w-4 h-4 mr-2" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-6 w-8" />
            </div>
          ))}
        </div>
      </div>

      {/* Desktop Stats */}
      <div className="hidden xl:block">
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-[#0F0F0F] rounded-lg p-4 border border-[#2C2C2C] text-center"
            >
              <Skeleton variant="circular" className="w-6 h-6 mx-auto mb-2" />
              <Skeleton className="h-5 w-8 mx-auto mb-1" />
              <Skeleton className="h-3 w-20 mx-auto" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// Profile Header Skeleton Component
function ProfileHeaderSkeleton() {
  return (
    <SkeletonCard>
      <div className="flex items-center justify-between mb-4 lg:mb-6">
        <Skeleton className="h-5 lg:h-6 w-32" />
        <Skeleton variant="rounded" className="h-8 lg:h-10 w-20 lg:w-32" />
      </div>

      {/* Mobile Layout */}
      <div className="block xl:hidden">
        <div className="flex items-center mb-6">
          <Skeleton variant="circular" className="w-16 h-16 mr-4" />
          <div>
            <Skeleton className="h-6 w-32 mb-1" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden xl:block">
        <div className="flex items-start space-x-6">
          <Skeleton variant="circular" className="w-24 h-24" />
          <div className="flex-1">
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-24 mb-4" />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Skeleton className="h-3 w-12 mb-1" />
                <Skeleton className="h-4 w-32" />
              </div>
              <div>
                <Skeleton className="h-3 w-20 mb-1" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </SkeletonCard>
  );
}

// Settings Section Skeleton
function SettingsSectionSkeleton() {
  return (
    <SkeletonCard>
      <Skeleton className="h-5 lg:h-6 w-32 mb-4 lg:mb-6" />

      <div className="space-y-4 lg:space-y-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center">
              <Skeleton
                variant="circular"
                className="w-4 h-4 lg:w-5 lg:h-5 mr-3"
              />
              <div>
                <Skeleton className="h-4 w-32 mb-1" />
                {i === 2 && <Skeleton className="h-3 w-16" />}
              </div>
            </div>
            <Skeleton variant="rounded" className="h-6 lg:h-8 w-12 lg:w-16" />
          </div>
        ))}
      </div>
    </SkeletonCard>
  );
}

export default function UserProfilePage() {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { wallets, activeWallet } = useSelector(
    (state: RootState) => state.wallet
  );

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<Partial<UserProfile>>({});
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);

  // 2FA Modal State
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [is2FAEnabling, setIs2FAEnabling] = useState(false);

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [copied, setCopied] = useState<string>("");

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      console.log("📡 Fetching user profile...");

      const response = await fetch("/api/profile", {
        credentials: "include",
        // Add cache busting to ensure fresh data
        headers: {
          "Cache-Control": "no-cache",
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log("✅ Profile loaded with avatar:", data.profile.avatar);
        setProfile(data.profile);
      } else {
        console.error("❌ Failed to fetch profile:", response.status);
      }
    } catch (error) {
      console.error("💥 Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  // Enhanced avatar update handler
  const handleAvatarUpdate = async (newAvatarUrl: string) => {
    console.log("🖼️ Avatar update received:", newAvatarUrl);

    // Update state immediately for instant UI feedback
    if (profile) {
      const updatedProfile = {
        ...profile,
        avatar: newAvatarUrl,
      };
      console.log("🔄 Updating profile state with new avatar");
      setProfile(updatedProfile);
    }

    // Also refresh the entire profile to ensure consistency
    try {
      console.log("🔄 Refreshing profile data to ensure consistency...");
      await fetchUserProfile();
      console.log("✅ Profile data refreshed successfully");
    } catch (error) {
      console.error("❌ Error refreshing profile:", error);
      // If refresh fails, the immediate state update above will still show the new avatar
    }
  };

  const handleSaveProfile = async () => {
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editedProfile),
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data.profile);
        setEditing(false);
        setEditedProfile({});
      }
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert("New passwords don't match");
      return;
    }

    try {
      const response = await fetch("/api/profile/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
        credentials: "include",
      });

      if (response.ok) {
        setShowPasswordModal(false);
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        alert("Password updated successfully");
      } else {
        alert("Failed to update password");
      }
    } catch (error) {
      console.error("Error updating password:", error);
    }
  };

  // 2FA Toggle Handler
  const handleToggle2FA = async () => {
    if (!profile) {
      console.log("❌ No profile available");
      return;
    }

    console.log("🔒 2FA Toggle clicked", {
      currentlyEnabled: profile.twoFactorEnabled,
      willEnable: !profile.twoFactorEnabled,
    });

    setIs2FAEnabling(!profile.twoFactorEnabled);
    setShow2FAModal(true);
  };

  // 2FA Complete Handler
  const handle2FAComplete = async () => {
    console.log("🎉 2FA Setup completed, refreshing profile...");
    await fetchUserProfile();
  };

  const handleNotificationToggle = async (type: string, value: boolean) => {
    try {
      const response = await fetch("/api/profile/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [type]: value }),
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setProfile((prev) =>
          prev ? { ...prev, preferences: data.preferences } : null
        );
      }
    } catch (error) {
      console.error("Error updating notifications:", error);
    }
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(""), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleLogout = async () => {
    await dispatch(logoutUser());
  };

  // Check if user can change password
  const canChangePassword =
    profile &&
    (profile.authProvider === "email" ||
      profile.hasPassword === true ||
      (!profile.authProvider && !profile.hasGoogleAuth));

  // Show skeleton loading when loading
  if (loading) {
    return (
      <div className="h-full bg-[#0F0F0F] rounded-[16px] lg:rounded-[20px] p-2 sm:p-3 lg:p-4 flex flex-col overflow-hidden">
        {/* Mobile Layout Skeleton */}
        <div className="flex flex-col xl:hidden gap-4 flex-1 min-h-0 overflow-y-auto scrollbar-hide">
          <ProfileHeaderSkeleton />
          <SkeletonCard>
            <Skeleton className="h-5 w-32 mb-4" />
            <ProfileStatsSkeleton />
          </SkeletonCard>
          <SettingsSectionSkeleton />
          <SettingsSectionSkeleton />
          <SettingsSectionSkeleton />
        </div>

        {/* Desktop Layout Skeleton */}
        <div className="hidden xl:flex gap-6 flex-1 min-h-0">
          <div className="flex-1 space-y-6 overflow-y-auto scrollbar-hide">
            <ProfileHeaderSkeleton />
            <SkeletonCard>
              <Skeleton className="h-6 w-32 mb-6" />
              <ProfileStatsSkeleton />
            </SkeletonCard>
          </div>
          <div className="w-[400px] space-y-6 overflow-y-auto scrollbar-hide">
            <SettingsSectionSkeleton />
            <SettingsSectionSkeleton />
            <SettingsSectionSkeleton />
          </div>
        </div>

        <style jsx global>{`
          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
        `}</style>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="h-full bg-[#0F0F0F] rounded-[16px] lg:rounded-[20px] p-6 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-2">
            Profile not found
          </h2>
          <p className="text-gray-400">Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  // DEBUG: Log current profile avatar
  console.log("🖼️ Rendering profile with avatar:", profile.avatar);

  return (
    <>
      {/* Backdrop for all modals */}
      {(showPasswordModal || showContactModal || show2FAModal) && (
        <div className="fixed inset-0 z-40 bg-white/10" />
      )}

      <div className="h-full bg-[#0F0F0F] rounded-[16px] lg:rounded-[20px] p-3 sm:p-4 lg:p-6 flex flex-col overflow-hidden">
        {/* Mobile Layout */}
        <div className="flex flex-col xl:hidden gap-4 flex-1 min-h-0 overflow-y-auto scrollbar-hide">
          {/* Profile Header - Mobile */}
          <div className="bg-black rounded-[16px] border border-[#2C2C2C] p-4 flex-shrink-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white font-satoshi">
                Profile Information
              </h2>
              <button
                onClick={() =>
                  editing ? handleSaveProfile() : setEditing(true)
                }
                className="bg-[#E2AF19] text-black px-3 py-1.5 rounded-lg text-sm font-satoshi font-medium hover:bg-[#D4A853] transition-colors flex items-center"
              >
                {editing ? (
                  <Save size={14} className="mr-1" />
                ) : (
                  <Edit3 size={14} className="mr-1" />
                )}
                {editing ? "Save" : "Edit"}
              </button>
            </div>

            <div className="flex items-center mb-6">
              {/* Profile Picture Upload - Mobile */}
              <ProfilePictureUpload
                currentAvatarUrl={profile.avatar}
                userName={profile.displayName || profile.username}
                onAvatarUpdate={handleAvatarUpdate}
                className="w-16 h-16 mr-4"
              />

              <div>
                {editing ? (
                  <Input
                    type="text"
                    value={editedProfile.displayName || profile.displayName}
                    onChange={(e) =>
                      setEditedProfile({
                        ...editedProfile,
                        displayName: e.target.value,
                      })
                    }
                    className="mb-2 font-satoshi"
                    placeholder="Display Name"
                  />
                ) : (
                  <h3 className="text-xl font-bold text-white font-satoshi">
                    {profile.displayName}
                  </h3>
                )}
                <p className="text-gray-400 text-sm font-satoshi">
                  @{profile.username}
                </p>
                {/* Authentication method indicator */}
                <div className="flex items-center mt-1">
                  {profile.authProvider === "google" ||
                  profile.hasGoogleAuth ? (
                    <span className="text-xs text-blue-400 font-satoshi bg-blue-900/20 px-2 py-1 rounded">
                      🔗 Google Account
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400 font-satoshi bg-gray-800/20 px-2 py-1 rounded">
                      📧 Email Account
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm font-satoshi">
                  Gmail:
                </span>
                <span className="text-white text-sm font-satoshi">
                  {profile.gmail}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm font-satoshi">
                  Member Since:
                </span>
                <span className="text-white text-sm font-satoshi">
                  {profile.accountCreated}
                </span>
              </div>
            </div>
          </div>

          {/* Account Statistics - Mobile */}
          <div className="bg-black rounded-[16px] border border-[#2C2C2C] p-4 flex-shrink-0">
            <h3 className="text-lg font-semibold text-white mb-4 font-satoshi">
              Account Statistics
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#0F0F0F] rounded-lg p-3 border border-[#2C2C2C]">
                <div className="flex items-center mb-2">
                  <CreditCard size={16} className="text-[#E2AF19] mr-2" />
                  <span className="text-gray-400 text-xs font-satoshi">
                    Total Transactions
                  </span>
                </div>
                <div className="text-white text-lg font-bold font-satoshi">
                  {profile.totalTransactions}
                </div>
              </div>

              <div className="bg-[#0F0F0F] rounded-lg p-3 border border-[#2C2C2C]">
                <div className="flex items-center mb-2">
                  <Calendar size={16} className="text-[#E2AF19] mr-2" />
                  <span className="text-gray-400 text-xs font-satoshi">
                    Completed Schedules
                  </span>
                </div>
                <div className="text-white text-lg font-bold font-satoshi">
                  {profile.scheduledPayments}
                </div>
              </div>

              <div className="bg-[#0F0F0F] rounded-lg p-3 border border-[#2C2C2C]">
                <div className="flex items-center mb-2">
                  <Users size={16} className="text-[#E2AF19] mr-2" />
                  <span className="text-gray-400 text-xs font-satoshi">
                    Friends
                  </span>
                </div>
                <div className="text-white text-lg font-bold font-satoshi">
                  {profile.friendsCount}
                </div>
              </div>

              <div className="bg-[#0F0F0F] rounded-lg p-3 border border-[#2C2C2C]">
                <div className="flex items-center mb-2">
                  <WalletIcon size={16} className="text-[#E2AF19] mr-2" />
                  <span className="text-gray-400 text-xs font-satoshi">
                    Wallets
                  </span>
                </div>
                <div className="text-white text-lg font-bold font-satoshi">
                  {wallets.length}
                </div>
              </div>
            </div>
          </div>

          {/* Account & Security - Mobile */}
          <div className="bg-black rounded-[16px] border border-[#2C2C2C] p-4 flex-shrink-0">
            <h3 className="text-lg font-semibold text-white mb-4 font-satoshi">
              Account & Security
            </h3>

            <div className="space-y-4">
              {canChangePassword && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Lock size={16} className="text-gray-400 mr-3" />
                    <span className="text-white font-satoshi">
                      Change Password
                    </span>
                  </div>
                  <button
                    onClick={() => setShowPasswordModal(true)}
                    className="bg-[#E2AF19] text-black px-3 py-1.5 rounded-lg text-sm font-satoshi font-medium hover:bg-[#D4A853] transition-colors"
                  >
                    Change
                  </button>
                </div>
              )}

              {!canChangePassword && (
                <div className="flex items-center justify-between p-3 bg-blue-900/20 border border-blue-500/50 rounded-lg">
                  <div className="flex items-center">
                    <Lock size={16} className="text-blue-400 mr-3" />
                    <div>
                      <span className="text-blue-400 font-satoshi text-sm">
                        Password Management
                      </span>
                      <div className="text-blue-300 text-xs font-satoshi">
                        Managed by Google
                      </div>
                    </div>
                  </div>
                  <span className="text-blue-400 text-xs font-satoshi">
                    Sign in with Google
                  </span>
                </div>
              )}

              {/* 2FA Section - Mobile */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Shield size={16} className="text-gray-400 mr-3" />
                  <div>
                    <span className="text-white font-satoshi">
                      Two-Factor Authentication
                    </span>
                    {profile.twoFactorEnabled && (
                      <div className="text-green-400 text-xs font-satoshi">
                        ✅ Enabled
                      </div>
                    )}
                    {!profile.twoFactorEnabled && (
                      <div className="text-gray-400 text-xs font-satoshi">
                        ❌ Disabled
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleToggle2FA}
                  className={`px-3 py-1.5 rounded-lg text-sm font-satoshi font-medium transition-colors ${
                    profile.twoFactorEnabled
                      ? "bg-red-600 hover:bg-red-700 text-white"
                      : "bg-[#E2AF19] hover:bg-[#D4A853] text-black"
                  }`}
                >
                  {profile.twoFactorEnabled ? "Disable" : "Enable"}
                </button>
              </div>
            </div>
          </div>

          {/* Notifications - Mobile */}
          <div className="bg-black rounded-[16px] border border-[#2C2C2C] p-4 flex-shrink-0">
            <h3 className="text-lg font-semibold text-white mb-4 font-satoshi">
              Notifications
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Smartphone size={16} className="text-gray-400 mr-3" />
                  <span className="text-white font-satoshi">
                    Push Notifications
                  </span>
                </div>
                <button
                  onClick={() =>
                    handleNotificationToggle(
                      "pushNotifications",
                      !profile.preferences.pushNotifications
                    )
                  }
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    profile.preferences.pushNotifications
                      ? "bg-[#E2AF19]"
                      : "bg-gray-600"
                  }`}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      profile.preferences.pushNotifications
                        ? "translate-x-7"
                        : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Mail size={16} className="text-gray-400 mr-3" />
                  <span className="text-white font-satoshi">
                    Email Notifications
                  </span>
                </div>
                <button
                  onClick={() =>
                    handleNotificationToggle(
                      "emailNotifications",
                      !profile.preferences.emailNotifications
                    )
                  }
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    profile.preferences.emailNotifications
                      ? "bg-[#E2AF19]"
                      : "bg-gray-600"
                  }`}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      profile.preferences.emailNotifications
                        ? "translate-x-7"
                        : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <UserPlus size={16} className="text-gray-400 mr-3" />
                  <span className="text-white font-satoshi">
                    Friend Requests
                  </span>
                </div>
                <div className="relative">
                  <select
                    value={profile.preferences.friendRequests}
                    onChange={(e) =>
                      handleNotificationToggle("friendRequests", e.target.value)
                    }
                    className="appearance-none bg-[#1A1A1A] text-white px-3 py-1.5 pr-8 rounded-lg text-sm font-satoshi border border-[#2C2C2C] focus:border-[#E2AF19] outline-none cursor-pointer"
                  >
                    <option value="everyone">Everyone</option>
                    <option value="none">No One</option>
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Globe size={16} className="text-gray-400 mr-3" />
                  <span className="text-white font-satoshi">
                    Currency Display
                  </span>
                </div>
                <div className="relative">
                  <select
                    value={profile.preferences.currency}
                    onChange={(e) =>
                      handleNotificationToggle("currency", e.target.value)
                    }
                    className="appearance-none bg-[#1A1A1A] text-white px-3 py-1.5 pr-8 rounded-lg text-sm font-satoshi border border-[#2C2C2C] focus:border-[#E2AF19] outline-none cursor-pointer"
                  >
                    <option value="USD">USD</option>
                    <option value="INR">INR</option>
                    <option value="EUR">EUR</option>
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Support & Feedback - Mobile */}
          <div className="bg-black rounded-[16px] border border-[#2C2C2C] p-4 flex-shrink-0">
            <h3 className="text-lg font-semibold text-white mb-4 font-satoshi">
              Support & Feedback
            </h3>

            <div className="space-y-3">
              <button
                onClick={() => setShowContactModal(true)}
                className="w-full flex items-center justify-between p-3 bg-[#0F0F0F] rounded-lg border border-[#2C2C2C] hover:border-[#E2AF19] transition-colors"
              >
                <div className="flex items-center">
                  <MessageSquare size={16} className="text-gray-400 mr-3" />
                  <span className="text-white font-satoshi">
                    Contact Support
                  </span>
                </div>
                <span className="text-gray-400">→</span>
              </button>

              <button className="w-full flex items-center justify-between p-3 bg-[#0F0F0F] rounded-lg border border-[#2C2C2C] hover:border-[#E2AF19] transition-colors">
                <div className="flex items-center">
                  <Settings size={16} className="text-gray-400 mr-3" />
                  <span className="text-white font-satoshi">Report a Bug</span>
                </div>
                <span className="text-gray-400">→</span>
              </button>
            </div>
          </div>

          {/* Account Actions - Mobile */}
          <div className="bg-black rounded-[16px] border border-[#2C2C2C] p-4 flex-shrink-0">
            <h3 className="text-lg font-semibold text-white mb-4 font-satoshi">
              Account Actions
            </h3>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center p-3 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              <LogOut size={16} className="text-white mr-2" />
              <span className="text-white font-satoshi font-medium">
                Log Out of All Devices
              </span>
            </button>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden xl:flex gap-6 flex-1 min-h-0">
          {/* Left Column */}
          <div className="flex-1 space-y-6 overflow-y-auto scrollbar-hide">
            {/* Profile Header - Desktop */}
            <div className="bg-black rounded-[20px] border border-[#2C2C2C] p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white font-satoshi">
                  Profile Information
                </h2>
                <button
                  onClick={() =>
                    editing ? handleSaveProfile() : setEditing(true)
                  }
                  className="bg-[#E2AF19] text-black px-4 py-2 rounded-lg font-satoshi font-medium hover:bg-[#D4A853] transition-colors flex items-center"
                >
                  {editing ? (
                    <Save size={16} className="mr-2" />
                  ) : (
                    <Edit3 size={16} className="mr-2" />
                  )}
                  {editing ? "Save Changes" : "Edit Profile"}
                </button>
              </div>

              <div className="flex items-start space-x-6">
                {/* Profile Picture Upload - Desktop */}
                <ProfilePictureUpload
                  currentAvatarUrl={profile.avatar}
                  userName={profile.displayName || profile.username}
                  onAvatarUpdate={handleAvatarUpdate}
                  className="w-24 h-24"
                />

                <div className="flex-1">
                  {editing ? (
                    <div className="space-y-4">
                      <Input
                        type="text"
                        value={editedProfile.displayName || profile.displayName}
                        onChange={(e) =>
                          setEditedProfile({
                            ...editedProfile,
                            displayName: e.target.value,
                          })
                        }
                        className="font-satoshi"
                        placeholder="Display Name"
                        label="Display Name"
                      />
                    </div>
                  ) : (
                    <div>
                      <h3 className="text-2xl font-bold text-white font-satoshi mb-2">
                        {profile.displayName}
                      </h3>
                      <p className="text-gray-400 font-satoshi mb-2">
                        @{profile.username}
                      </p>

                      {/* Authentication method indicator - Desktop */}
                      <div className="flex items-center mb-4">
                        {profile.authProvider === "google" ||
                        profile.hasGoogleAuth ? (
                          <span className="text-sm text-blue-400 font-satoshi bg-blue-900/20 px-3 py-1 rounded-full">
                            🔗 Google Account
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400 font-satoshi bg-gray-800/20 px-3 py-1 rounded-full">
                            📧 Email Account
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-gray-400 text-sm font-satoshi">
                            Email:
                          </span>
                          <p className="text-white font-satoshi">
                            {profile.gmail}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-400 text-sm font-satoshi">
                            Member Since:
                          </span>
                          <p className="text-white font-satoshi">
                            {profile.accountCreated}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Account Statistics - Desktop */}
            <div className="bg-black rounded-[20px] border border-[#2C2C2C] p-6">
              <h3 className="text-xl font-semibold text-white mb-6 font-satoshi">
                Account Statistics
              </h3>

              <div className="grid grid-cols-4 gap-4">
                <div className="bg-[#0F0F0F] rounded-lg p-4 border border-[#2C2C2C] text-center">
                  <CreditCard
                    size={24}
                    className="text-[#E2AF19] mx-auto mb-2"
                  />
                  <div className="text-white text-xl font-bold font-satoshi mb-1">
                    {profile.totalTransactions}
                  </div>
                  <div className="text-gray-400 text-sm font-satoshi">
                    Total Transactions
                  </div>
                </div>

                <div className="bg-[#0F0F0F] rounded-lg p-4 border border-[#2C2C2C] text-center">
                  <Calendar size={24} className="text-[#E2AF19] mx-auto mb-2" />
                  <div className="text-white text-xl font-bold font-satoshi mb-1">
                    {profile.scheduledPayments}
                  </div>
                  <div className="text-gray-400 text-sm font-satoshi">
                    Completed Schedules
                  </div>
                </div>

                <div className="bg-[#0F0F0F] rounded-lg p-4 border border-[#2C2C2C] text-center">
                  <Users size={24} className="text-[#E2AF19] mx-auto mb-2" />
                  <div className="text-white text-xl font-bold font-satoshi mb-1">
                    {profile.friendsCount}
                  </div>
                  <div className="text-gray-400 text-sm font-satoshi">
                    Friends
                  </div>
                </div>

                <div className="bg-[#0F0F0F] rounded-lg p-4 border border-[#2C2C2C] text-center">
                  <WalletIcon
                    size={24}
                    className="text-[#E2AF19] mx-auto mb-2"
                  />
                  <div className="text-white text-xl font-bold font-satoshi mb-1">
                    {wallets.length}
                  </div>
                  <div className="text-gray-400 text-sm font-satoshi">
                    Wallets
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Desktop */}
          <div className="w-[400px] space-y-6 overflow-y-auto scrollbar-hide">
            {/* Account & Security - Desktop */}
            <div className="bg-black rounded-[20px] border border-[#2C2C2C] p-6">
              <h3 className="text-xl font-semibold text-white mb-6 font-satoshi">
                Account & Security
              </h3>

              <div className="space-y-6">
                {canChangePassword && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Lock size={20} className="text-gray-400 mr-3" />
                      <span className="text-white font-satoshi">
                        Change Password
                      </span>
                    </div>
                    <button
                      onClick={() => setShowPasswordModal(true)}
                      className="bg-[#E2AF19] text-black px-4 py-2 rounded-lg font-satoshi font-medium hover:bg-[#D4A853] transition-colors"
                    >
                      Change
                    </button>
                  </div>
                )}

                {!canChangePassword && (
                  <div className="flex items-center justify-between p-4 bg-blue-900/20 border border-blue-500/50 rounded-lg">
                    <div className="flex items-center">
                      <Lock size={20} className="text-blue-400 mr-3" />
                      <div>
                        <span className="text-blue-400 font-satoshi">
                          Password Management
                        </span>
                        <div className="text-blue-300 text-sm font-satoshi">
                          Your password is managed by Google
                        </div>
                      </div>
                    </div>
                    <span className="text-blue-400 text-sm font-satoshi">
                      Google Sign-In
                    </span>
                  </div>
                )}

                {/* 2FA Section - Desktop */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Shield size={20} className="text-gray-400 mr-3" />
                    <div>
                      <span className="text-white font-satoshi">
                        Two-Factor Authentication
                      </span>
                      {profile.twoFactorEnabled && (
                        <div className="text-green-400 text-sm font-satoshi">
                          Currently Enabled ✅
                        </div>
                      )}
                      {!profile.twoFactorEnabled && (
                        <div className="text-gray-400 text-sm font-satoshi">
                          Currently Disabled ❌
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={handleToggle2FA}
                    className={`px-4 py-2 rounded-lg font-satoshi font-medium transition-colors ${
                      profile.twoFactorEnabled
                        ? "bg-red-600 hover:bg-red-700 text-white"
                        : "bg-[#E2AF19] hover:bg-[#D4A853] text-black"
                    }`}
                  >
                    {profile.twoFactorEnabled ? "Disable 2FA" : "Enable 2FA"}
                  </button>
                </div>
              </div>
            </div>

            {/* Rest of the desktop layout sections... */}
            {/* Notifications - Desktop */}
            <div className="bg-black rounded-[20px] border border-[#2C2C2C] p-6">
              <h3 className="text-xl font-semibold text-white mb-6 font-satoshi">
                Notifications
              </h3>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Smartphone size={20} className="text-gray-400 mr-3" />
                    <span className="text-white font-satoshi">
                      Push Notifications
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      handleNotificationToggle(
                        "pushNotifications",
                        !profile.preferences.pushNotifications
                      )
                    }
                    className={`relative w-14 h-7 rounded-full transition-colors ${
                      profile.preferences.pushNotifications
                        ? "bg-[#E2AF19]"
                        : "bg-gray-600"
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                        profile.preferences.pushNotifications
                          ? "translate-x-8"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Mail size={20} className="text-gray-400 mr-3" />
                    <span className="text-white font-satoshi">
                      Email Notifications
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      handleNotificationToggle(
                        "emailNotifications",
                        !profile.preferences.emailNotifications
                      )
                    }
                    className={`relative w-14 h-7 rounded-full transition-colors ${
                      profile.preferences.emailNotifications
                        ? "bg-[#E2AF19]"
                        : "bg-gray-600"
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                        profile.preferences.emailNotifications
                          ? "translate-x-8"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <UserPlus size={20} className="text-gray-400 mr-3" />
                    <span className="text-white font-satoshi">
                      Friend Requests
                    </span>
                  </div>
                  <div className="relative">
                    <select
                      value={profile.preferences.friendRequests}
                      onChange={(e) =>
                        handleNotificationToggle(
                          "friendRequests",
                          e.target.value
                        )
                      }
                      className="appearance-none bg-[#1A1A1A] text-white px-3 py-2 pr-8 rounded-lg font-satoshi border border-[#2C2C2C] focus:border-[#E2AF19] outline-none cursor-pointer"
                    >
                      <option value="everyone">Everyone</option>
                      <option value="none">No One</option>
                    </select>
                    <ChevronDown
                      size={16}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Globe size={20} className="text-gray-400 mr-3" />
                    <span className="text-white font-satoshi">
                      Currency Display
                    </span>
                  </div>
                  <div className="relative">
                    <select
                      value={profile.preferences.currency}
                      onChange={(e) =>
                        handleNotificationToggle("currency", e.target.value)
                      }
                      className="appearance-none bg-[#1A1A1A] text-white px-3 py-2 pr-8 rounded-lg font-satoshi border border-[#2C2C2C] focus:border-[#E2AF19] outline-none cursor-pointer"
                    >
                      <option value="USD">USD</option>
                      <option value="INR">INR</option>
                      <option value="EUR">EUR</option>
                    </select>
                    <ChevronDown
                      size={16}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Support & Account Actions - Desktop */}
            <div className="bg-black rounded-[20px] border border-[#2C2C2C] p-6">
              <h3 className="text-xl font-semibold text-white mb-6 font-satoshi">
                Support & Actions
              </h3>

              <div className="space-y-4">
                <button
                  onClick={() => setShowContactModal(true)}
                  className="w-full flex items-center justify-between p-3 bg-[#0F0F0F] rounded-lg border border-[#2C2C2C] hover:border-[#E2AF19] transition-colors"
                >
                  <div className="flex items-center">
                    <MessageSquare size={18} className="text-gray-400 mr-3" />
                    <span className="text-white font-satoshi">
                      Contact Support
                    </span>
                  </div>
                  <span className="text-gray-400">→</span>
                </button>

                <button className="w-full flex items-center justify-between p-3 bg-[#0F0F0F] rounded-lg border border-[#2C2C2C] hover:border-[#E2AF19] transition-colors">
                  <div className="flex items-center">
                    <Settings size={18} className="text-gray-400 mr-3" />
                    <span className="text-white font-satoshi">
                      Report a Bug
                    </span>
                  </div>
                  <span className="text-gray-400">→</span>
                </button>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center p-3 bg-red-600 hover:bg-red-700 rounded-lg transition-colors mt-6"
                >
                  <LogOut size={18} className="text-white mr-2" />
                  <span className="text-white font-satoshi font-medium">
                    Log Out of All Devices
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modals */}
        {/* Password Change Modal - Only show if user can change password */}
        {showPasswordModal && canChangePassword && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-black border border-[#2C2C2C] rounded-[20px] w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white font-satoshi">
                  Change Password
                </h3>
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <Input
                  type="password"
                  placeholder="Current Password"
                  value={passwordData.currentPassword}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      currentPassword: e.target.value,
                    })
                  }
                  className="font-satoshi"
                />
                <Input
                  type="password"
                  placeholder="New Password"
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      newPassword: e.target.value,
                    })
                  }
                  className="font-satoshi"
                />
                <Input
                  type="password"
                  placeholder="Confirm New Password"
                  value={passwordData.confirmPassword}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      confirmPassword: e.target.value,
                    })
                  }
                  className="font-satoshi"
                />

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowPasswordModal(false)}
                    className="flex-1 px-4 py-2 bg-[#2C2C2C] text-white rounded-lg font-satoshi hover:bg-[#3C3C3C] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePasswordChange}
                    className="flex-1 px-4 py-2 bg-[#E2AF19] text-black rounded-lg font-satoshi font-medium hover:bg-[#D4A853] transition-colors"
                  >
                    Update Password
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Contact Support Modal */}
        {showContactModal && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-black border border-[#2C2C2C] rounded-[20px] w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white font-satoshi">
                  Contact Support
                </h3>
                <button
                  onClick={() => setShowContactModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <Input
                  type="text"
                  placeholder="Subject"
                  className="font-satoshi"
                />
                <textarea
                  placeholder="Describe your issue..."
                  className="w-full p-3 bg-black border border-[#2C2C2C] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#E2AF19] font-satoshi resize-none"
                  rows={4}
                />

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowContactModal(false)}
                    className="flex-1 px-4 py-2 bg-[#2C2C2C] text-white rounded-lg font-satoshi hover:bg-[#3C3C3C] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setShowContactModal(false);
                      alert("Support request submitted successfully!");
                    }}
                    className="flex-1 px-4 py-2 bg-[#E2AF19] text-black rounded-lg font-satoshi font-medium hover:bg-[#D4A853] transition-colors"
                  >
                    Send Message
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2FA Setup Modal with user profile data */}
        {show2FAModal && (
          <TwoFactorSetupModal
            isOpen={show2FAModal}
            onClose={() => {
              console.log("🔒 Closing 2FA modal");
              setShow2FAModal(false);
            }}
            onComplete={handle2FAComplete}
            isEnabling={is2FAEnabling}
            userProfile={{
              email: profile.gmail,
              displayName: profile.displayName,
              authProvider: profile.authProvider,
              hasPassword: profile.hasPassword,
            }}
          />
        )}

        <style jsx global>{`
          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
        `}</style>
      </div>
    </>
  );
}
