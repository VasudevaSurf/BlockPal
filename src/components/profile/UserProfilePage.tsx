// src/components/profile/UserProfilePage.tsx - COMPLETE UPDATED VERSION
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
  QrCode, // Add QrCode import
} from "lucide-react";
import { RootState, AppDispatch } from "@/store";
import { logoutUser } from "@/store/slices/authSlice";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import TwoFactorSetupModal from "./TwoFactorSetupModal";
import ProfilePictureUpload from "./ProfilePictureUpload";
import UserQRCodeModal from "./UserQRCodeModal"; // Add QR Modal import
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
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-[#0F0F0F] rounded-lg p-2 border border-[#2C2C2C]"
            >
              <div className="flex items-center mb-1">
                <Skeleton variant="circular" className="w-3.5 h-3.5 mr-1.5" />
                <Skeleton className="h-2.5 w-12" />
              </div>
              <Skeleton className="h-4 w-6" />
            </div>
          ))}
        </div>
      </div>

      {/* Desktop Stats */}
      <div className="hidden xl:block">
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-[#0F0F0F] rounded-lg p-3 border border-[#2C2C2C] text-center"
            >
              <Skeleton variant="circular" className="w-5 h-5 mx-auto mb-1.5" />
              <Skeleton className="h-4 w-6 mx-auto mb-1" />
              <Skeleton className="h-2.5 w-16 mx-auto" />
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
      <div className="flex items-center justify-between mb-3 lg:mb-4">
        <Skeleton className="h-4 lg:h-5 w-24" />
        <Skeleton variant="rounded" className="h-6 lg:h-8 w-16 lg:w-24" />
      </div>

      {/* Mobile Layout */}
      <div className="block xl:hidden">
        <div className="flex items-center mb-4">
          <Skeleton variant="circular" className="w-12 h-12 mr-3" />
          <div>
            <Skeleton className="h-5 w-24 mb-1" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-3 w-32" />
          </div>
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden xl:block">
        <div className="flex items-start space-x-4">
          <Skeleton variant="circular" className="w-20 h-20" />
          <div className="flex-1">
            <Skeleton className="h-6 w-40 mb-1.5" />
            <Skeleton className="h-3 w-20 mb-3" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Skeleton className="h-2.5 w-10 mb-1" />
                <Skeleton className="h-3 w-24" />
              </div>
              <div>
                <Skeleton className="h-2.5 w-16 mb-1" />
                <Skeleton className="h-3 w-20" />
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
      <Skeleton className="h-4 lg:h-5 w-24 mb-3 lg:mb-4" />

      <div className="space-y-3 lg:space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center">
              <Skeleton
                variant="circular"
                className="w-3.5 h-3.5 lg:w-4 lg:h-4 mr-2"
              />
              <div>
                <Skeleton className="h-3 w-24 mb-0.5" />
                {i === 2 && <Skeleton className="h-2.5 w-12" />}
              </div>
            </div>
            <Skeleton variant="rounded" className="h-5 lg:h-6 w-10 lg:w-12" />
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
  const [showQRModal, setShowQRModal] = useState(false); // Add QR modal state

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

    if (profile) {
      const updatedProfile = {
        ...profile,
        avatar: newAvatarUrl,
      };
      console.log("🔄 Updating profile state with new avatar");
      setProfile(updatedProfile);
    }

    try {
      console.log("🔄 Refreshing profile data to ensure consistency...");
      await fetchUserProfile();
      console.log("✅ Profile data refreshed successfully");
    } catch (error) {
      console.error("❌ Error refreshing profile:", error);
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
      <div className="h-full bg-[#0F0F0F] rounded-[12px] lg:rounded-[16px] p-2 sm:p-2.5 lg:p-3 flex flex-col overflow-hidden">
        {/* Mobile Layout Skeleton */}
        <div className="flex flex-col xl:hidden gap-3 flex-1 min-h-0 overflow-y-auto scrollbar-hide">
          <ProfileHeaderSkeleton />
          <SkeletonCard>
            <Skeleton className="h-4 w-24 mb-3" />
            <ProfileStatsSkeleton />
          </SkeletonCard>
          <SettingsSectionSkeleton />
          <SettingsSectionSkeleton />
          <SettingsSectionSkeleton />
        </div>

        {/* Desktop Layout Skeleton */}
        <div className="hidden xl:flex gap-4 flex-1 min-h-0">
          <div className="flex-1 space-y-4 overflow-y-auto scrollbar-hide">
            <ProfileHeaderSkeleton />
            <SkeletonCard>
              <Skeleton className="h-5 w-24 mb-4" />
              <ProfileStatsSkeleton />
            </SkeletonCard>
          </div>
          <div className="w-[320px] space-y-4 overflow-y-auto scrollbar-hide">
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
      <div className="h-full bg-[#0F0F0F] rounded-[12px] lg:rounded-[16px] p-4 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-bold text-white mb-2">
            Profile not found
          </h2>
          <p className="text-gray-400">Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  console.log("🖼️ Rendering profile with avatar:", profile.avatar);

  return (
    <>
      {/* Backdrop for all modals */}
      {(showPasswordModal ||
        showContactModal ||
        show2FAModal ||
        showQRModal) && <div className="fixed inset-0 z-40 bg-white/10" />}

      <div className="h-full bg-[#0F0F0F] rounded-[12px] lg:rounded-[16px] p-2 sm:p-3 lg:p-4 flex flex-col overflow-hidden">
        {/* Mobile Layout */}
        <div className="flex flex-col xl:hidden gap-3 flex-1 min-h-0 overflow-y-auto scrollbar-hide">
          {/* Profile Header - Mobile */}
          <div className="bg-black rounded-[12px] border border-[#2C2C2C] p-3 flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-white font-satoshi">
                Profile Information
              </h2>
              <div className="flex items-center space-x-1.5">
                {/* QR Code Button - Mobile */}
                <button
                  onClick={() => setShowQRModal(true)}
                  className="bg-[#2C2C2C] text-white p-1.5 rounded-lg hover:bg-[#3C3C3C] transition-colors"
                  title="View QR Code"
                >
                  <QrCode size={14} />
                </button>

                <button
                  onClick={() =>
                    editing ? handleSaveProfile() : setEditing(true)
                  }
                  className="bg-[#E2AF19] text-black px-2.5 py-1 rounded-lg text-sm font-satoshi font-medium hover:bg-[#D4A853] transition-colors flex items-center"
                >
                  {editing ? (
                    <Save size={12} className="mr-1" />
                  ) : (
                    <Edit3 size={12} className="mr-1" />
                  )}
                  {editing ? "Save" : "Edit"}
                </button>
              </div>
            </div>

            <div className="flex items-center mb-4">
              <ProfilePictureUpload
                currentAvatarUrl={profile.avatar}
                userName={profile.displayName || profile.username}
                onAvatarUpdate={handleAvatarUpdate}
                className="w-12 h-12 mr-3"
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
                    className="mb-1.5 font-satoshi"
                    placeholder="Display Name"
                  />
                ) : (
                  <h3 className="text-lg font-bold text-white font-satoshi">
                    {profile.displayName}
                  </h3>
                )}
                <p className="text-gray-400 text-sm font-satoshi">
                  @{profile.username}
                </p>
                <div className="flex items-center mt-0.5">
                  {profile.authProvider === "google" ||
                  profile.hasGoogleAuth ? (
                    <span className="text-xs text-blue-400 font-satoshi bg-blue-900/20 px-1.5 py-0.5 rounded">
                      🔗 Google Account
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400 font-satoshi bg-gray-800/20 px-1.5 py-0.5 rounded">
                      📧 Email Account
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
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
          <div className="bg-black rounded-[12px] border border-[#2C2C2C] p-3 flex-shrink-0">
            <h3 className="text-base font-semibold text-white mb-3 font-satoshi">
              Account Statistics
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#0F0F0F] rounded-lg p-2 border border-[#2C2C2C]">
                <div className="flex items-center mb-1">
                  <CreditCard size={14} className="text-[#E2AF19] mr-1.5" />
                  <span className="text-gray-400 text-xs font-satoshi">
                    Total Transactions
                  </span>
                </div>
                <div className="text-white text-base font-bold font-satoshi">
                  {profile.totalTransactions}
                </div>
              </div>

              <div className="bg-[#0F0F0F] rounded-lg p-2 border border-[#2C2C2C]">
                <div className="flex items-center mb-1">
                  <Calendar size={14} className="text-[#E2AF19] mr-1.5" />
                  <span className="text-gray-400 text-xs font-satoshi">
                    Completed Schedules
                  </span>
                </div>
                <div className="text-white text-base font-bold font-satoshi">
                  {profile.scheduledPayments}
                </div>
              </div>

              <div className="bg-[#0F0F0F] rounded-lg p-2 border border-[#2C2C2C]">
                <div className="flex items-center mb-1">
                  <Users size={14} className="text-[#E2AF19] mr-1.5" />
                  <span className="text-gray-400 text-xs font-satoshi">
                    Friends
                  </span>
                </div>
                <div className="text-white text-base font-bold font-satoshi">
                  {profile.friendsCount}
                </div>
              </div>

              <div className="bg-[#0F0F0F] rounded-lg p-2 border border-[#2C2C2C]">
                <div className="flex items-center mb-1">
                  <WalletIcon size={14} className="text-[#E2AF19] mr-1.5" />
                  <span className="text-gray-400 text-xs font-satoshi">
                    Wallets
                  </span>
                </div>
                <div className="text-white text-base font-bold font-satoshi">
                  {wallets.length}
                </div>
              </div>
            </div>
          </div>

          {/* Account & Security - Mobile */}
          <div className="bg-black rounded-[12px] border border-[#2C2C2C] p-3 flex-shrink-0">
            <h3 className="text-base font-semibold text-white mb-3 font-satoshi">
              Account & Security
            </h3>

            <div className="space-y-3">
              {canChangePassword && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Lock size={14} className="text-gray-400 mr-2" />
                    <span className="text-white font-satoshi text-sm">
                      Change Password
                    </span>
                  </div>
                  <button
                    onClick={() => setShowPasswordModal(true)}
                    className="bg-[#E2AF19] text-black px-2.5 py-1 rounded-lg text-sm font-satoshi font-medium hover:bg-[#D4A853] transition-colors"
                  >
                    Change
                  </button>
                </div>
              )}

              {!canChangePassword && (
                <div className="flex items-center justify-between p-2.5 bg-blue-900/20 border border-blue-500/50 rounded-lg">
                  <div className="flex items-center">
                    <Lock size={14} className="text-blue-400 mr-2" />
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
                  <Shield size={14} className="text-gray-400 mr-2" />
                  <div>
                    <span className="text-white font-satoshi text-sm">
                      2-Factor Authentication
                    </span>
                    {/* {profile.twoFactorEnabled && (
                      <div className="text-green-400 text-xs font-satoshi">
                        ✅ Enabled
                      </div>
                    )}
                    {!profile.twoFactorEnabled && (
                      <div className="text-gray-400 text-xs font-satoshi">
                        ❌ Disabled
                      </div>
                    )} */}
                  </div>
                </div>
                <button
                  onClick={handleToggle2FA}
                  className={`px-2.5 py-1 rounded-lg text-sm font-satoshi font-medium transition-colors ${
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
          {/* <div className="bg-black rounded-[12px] border border-[#2C2C2C] p-3 flex-shrink-0">
            <h3 className="text-base font-semibold text-white mb-3 font-satoshi">
              Notifications
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Smartphone size={14} className="text-gray-400 mr-2" />
                  <span className="text-white font-satoshi text-sm">
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
                  className={`relative w-10 h-5 rounded-full transition-colors ${
                    profile.preferences.pushNotifications
                      ? "bg-[#E2AF19]"
                      : "bg-gray-600"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                      profile.preferences.pushNotifications
                        ? "translate-x-5"
                        : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Mail size={14} className="text-gray-400 mr-2" />
                  <span className="text-white font-satoshi text-sm">
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
                  className={`relative w-10 h-5 rounded-full transition-colors ${
                    profile.preferences.emailNotifications
                      ? "bg-[#E2AF19]"
                      : "bg-gray-600"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                      profile.preferences.emailNotifications
                        ? "translate-x-5"
                        : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <UserPlus size={14} className="text-gray-400 mr-2" />
                  <span className="text-white font-satoshi text-sm">
                    Friend Requests
                  </span>
                </div>
                <div className="relative">
                  <select
                    value={profile.preferences.friendRequests}
                    onChange={(e) =>
                      handleNotificationToggle("friendRequests", e.target.value)
                    }
                    className="appearance-none bg-[#1A1A1A] text-white px-2.5 py-1 pr-6 rounded-lg text-sm font-satoshi border border-[#2C2C2C] focus:border-[#E2AF19] outline-none cursor-pointer"
                  >
                    <option value="everyone">Everyone</option>
                    <option value="none">No One</option>
                  </select>
                  <ChevronDown
                    size={12}
                    className="absolute right-1.5 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Globe size={14} className="text-gray-400 mr-2" />
                  <span className="text-white font-satoshi text-sm">
                    Currency Display
                  </span>
                </div>
                <div className="relative">
                  <select
                    value={profile.preferences.currency}
                    onChange={(e) =>
                      handleNotificationToggle("currency", e.target.value)
                    }
                    className="appearance-none bg-[#1A1A1A] text-white px-2.5 py-1 pr-6 rounded-lg text-sm font-satoshi border border-[#2C2C2C] focus:border-[#E2AF19] outline-none cursor-pointer"
                  >
                    <option value="USD">USD</option>
                    <option value="INR">INR</option>
                    <option value="EUR">EUR</option>
                  </select>
                  <ChevronDown
                    size={12}
                    className="absolute right-1.5 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                </div>
              </div>
            </div>
          </div> */}

          {/* Support & Feedback - Mobile */}
          <div className="bg-black rounded-[12px] border border-[#2C2C2C] p-3 flex-shrink-0">
            <h3 className="text-base font-semibold text-white mb-3 font-satoshi">
              Support & Feedback
            </h3>

            <div className="space-y-2">
              <button
                onClick={() => setShowContactModal(true)}
                className="w-full flex items-center justify-between p-2.5 bg-[#0F0F0F] rounded-lg border border-[#2C2C2C] hover:border-[#E2AF19] transition-colors"
              >
                <div className="flex items-center">
                  <MessageSquare size={14} className="text-gray-400 mr-2" />
                  <span className="text-white font-satoshi text-sm">
                    Contact Support
                  </span>
                </div>
                <span className="text-gray-400">→</span>
              </button>

              <button className="w-full flex items-center justify-between p-2.5 bg-[#0F0F0F] rounded-lg border border-[#2C2C2C] hover:border-[#E2AF19] transition-colors">
                <div className="flex items-center">
                  <Settings size={14} className="text-gray-400 mr-2" />
                  <span className="text-white font-satoshi text-sm">
                    Report a Bug
                  </span>
                </div>
                <span className="text-gray-400">→</span>
              </button>
            </div>
          </div>

          {/* Account Actions - Mobile */}
          <div className="bg-black rounded-[12px] border border-[#2C2C2C] p-3 flex-shrink-0">
            <h3 className="text-base font-semibold text-white mb-3 font-satoshi">
              Account Actions
            </h3>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center p-2.5 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              <LogOut size={14} className="text-white mr-2" />
              <span className="text-white font-satoshi font-medium text-sm">
                Log Out of All Devices
              </span>
            </button>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden xl:flex gap-4 flex-1 min-h-0">
          {/* Left Column */}
          <div className="flex-1 space-y-4 overflow-y-auto scrollbar-hide">
            {/* Profile Header - Desktop */}
            <div className="bg-black rounded-[16px] border border-[#2C2C2C] p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white font-satoshi">
                  Profile Information
                </h2>
                <div className="flex items-center space-x-2">
                  {/* QR Code Button - Desktop */}
                  <button
                    onClick={() => setShowQRModal(true)}
                    className="bg-[#2C2C2C] text-white p-1.5 rounded-lg hover:bg-[#3C3C3C] transition-colors"
                    title="View QR Code"
                  >
                    <QrCode size={16} />
                  </button>

                  <button
                    onClick={() =>
                      editing ? handleSaveProfile() : setEditing(true)
                    }
                    className="bg-[#E2AF19] text-black px-3 py-1.5 rounded-lg font-satoshi font-medium hover:bg-[#D4A853] transition-colors flex items-center"
                  >
                    {editing ? (
                      <Save size={14} className="mr-1.5" />
                    ) : (
                      <Edit3 size={14} className="mr-1.5" />
                    )}
                    {editing ? "Save Changes" : "Edit Profile"}
                  </button>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <ProfilePictureUpload
                  currentAvatarUrl={profile.avatar}
                  userName={profile.displayName || profile.username}
                  onAvatarUpdate={handleAvatarUpdate}
                  className="w-20 h-20"
                />

                <div className="flex-1">
                  {editing ? (
                    <div className="space-y-3">
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
                      <h3 className="text-xl font-bold text-white font-satoshi mb-1.5">
                        {profile.displayName}
                      </h3>
                      <p className="text-gray-400 font-satoshi mb-1.5">
                        @{profile.username}
                      </p>

                      <div className="flex items-center mb-3">
                        {profile.authProvider === "google" ||
                        profile.hasGoogleAuth ? (
                          <span className="text-sm text-blue-400 font-satoshi bg-blue-900/20 px-2.5 py-0.5 rounded-full">
                            🔗 Google Account
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400 font-satoshi bg-gray-800/20 px-2.5 py-0.5 rounded-full">
                            📧 Email Account
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span className="text-gray-400 text-sm font-satoshi">
                            Email:
                          </span>
                          <p className="text-white font-satoshi text-sm">
                            {profile.gmail}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-400 text-sm font-satoshi">
                            Member Since:
                          </span>
                          <p className="text-white font-satoshi text-sm">
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
            <div className="bg-black rounded-[16px] border border-[#2C2C2C] p-4">
              <h3 className="text-lg font-semibold text-white mb-4 font-satoshi">
                Account Statistics
              </h3>

              <div className="grid grid-cols-4 gap-3">
                <div className="bg-[#0F0F0F] rounded-lg p-3 border border-[#2C2C2C] text-center">
                  <CreditCard
                    size={20}
                    className="text-[#E2AF19] mx-auto mb-1.5"
                  />
                  <div className="text-white text-lg font-bold font-satoshi mb-0.5">
                    {profile.totalTransactions}
                  </div>
                  <div className="text-gray-400 text-sm font-satoshi">
                    Total Transactions
                  </div>
                </div>

                <div className="bg-[#0F0F0F] rounded-lg p-3 border border-[#2C2C2C] text-center">
                  <Calendar
                    size={20}
                    className="text-[#E2AF19] mx-auto mb-1.5"
                  />
                  <div className="text-white text-lg font-bold font-satoshi mb-0.5">
                    {profile.scheduledPayments}
                  </div>
                  <div className="text-gray-400 text-sm font-satoshi">
                    Completed Schedules
                  </div>
                </div>

                <div className="bg-[#0F0F0F] rounded-lg p-3 border border-[#2C2C2C] text-center">
                  <Users size={20} className="text-[#E2AF19] mx-auto mb-1.5" />
                  <div className="text-white text-lg font-bold font-satoshi mb-0.5">
                    {profile.friendsCount}
                  </div>
                  <div className="text-gray-400 text-sm font-satoshi">
                    Friends
                  </div>
                </div>

                <div className="bg-[#0F0F0F] rounded-lg p-3 border border-[#2C2C2C] text-center">
                  <WalletIcon
                    size={20}
                    className="text-[#E2AF19] mx-auto mb-1.5"
                  />
                  <div className="text-white text-lg font-bold font-satoshi mb-0.5">
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
          <div className="w-[320px] space-y-4 overflow-y-auto scrollbar-hide">
            {/* Account & Security - Desktop */}
            <div className="bg-black rounded-[16px] border border-[#2C2C2C] p-4">
              <h3 className="text-lg font-semibold text-white mb-4 font-satoshi">
                Account & Security
              </h3>

              <div className="space-y-4">
                {canChangePassword && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Lock size={18} className="text-gray-400 mr-2" />
                      <span className="text-white font-satoshi">
                        Change Password
                      </span>
                    </div>
                    <button
                      onClick={() => setShowPasswordModal(true)}
                      className="bg-[#E2AF19] text-black px-3 py-1.5 rounded-lg font-satoshi font-medium hover:bg-[#D4A853] transition-colors"
                    >
                      Change
                    </button>
                  </div>
                )}

                {!canChangePassword && (
                  <div className="flex items-center justify-between p-3 bg-blue-900/20 border border-blue-500/50 rounded-lg">
                    <div className="flex items-center">
                      <Lock size={18} className="text-blue-400 mr-2" />
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
                    <Shield size={18} className="text-gray-400 mr-2" />
                    <div>
                      <span className="text-white font-satoshi">
                        2-Factor Authentication
                      </span>
                      {/* {profile.twoFactorEnabled && (
                        <div className="text-green-400 text-sm font-satoshi">
                          Currently Enabled
                        </div>
                      )}
                      {!profile.twoFactorEnabled && (
                        <div className="text-gray-400 text-sm font-satoshi">
                          Currently Disabled
                        </div>
                      )} */}
                    </div>
                  </div>
                  <button
                    onClick={handleToggle2FA}
                    className={`px-3 py-1.5 rounded-lg font-satoshi font-medium transition-colors ${
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

            {/* Notifications - Desktop */}
            {/* <div className="bg-black rounded-[16px] border border-[#2C2C2C] p-4">
              <h3 className="text-lg font-semibold text-white mb-4 font-satoshi">
                Notifications
              </h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Smartphone size={18} className="text-gray-400 mr-2" />
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
                      className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                        profile.preferences.pushNotifications
                          ? "translate-x-6"
                          : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Mail size={18} className="text-gray-400 mr-2" />
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
                      className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                        profile.preferences.emailNotifications
                          ? "translate-x-6"
                          : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <UserPlus size={18} className="text-gray-400 mr-2" />
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
                      className="appearance-none bg-[#1A1A1A] text-white px-2.5 py-1.5 pr-6 rounded-lg font-satoshi border border-[#2C2C2C] focus:border-[#E2AF19] outline-none cursor-pointer"
                    >
                      <option value="everyone">Everyone</option>
                      <option value="none">No One</option>
                    </select>
                    <ChevronDown
                      size={14}
                      className="absolute right-1.5 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Globe size={18} className="text-gray-400 mr-2" />
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
                      className="appearance-none bg-[#1A1A1A] text-white px-2.5 py-1.5 pr-6 rounded-lg font-satoshi border border-[#2C2C2C] focus:border-[#E2AF19] outline-none cursor-pointer"
                    >
                      <option value="USD">USD</option>
                      <option value="INR">INR</option>
                      <option value="EUR">EUR</option>
                    </select>
                    <ChevronDown
                      size={14}
                      className="absolute right-1.5 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
                    />
                  </div>
                </div>
              </div>
            </div> */}

            {/* Support & Account Actions - Desktop */}
            <div className="bg-black rounded-[16px] border border-[#2C2C2C] p-4">
              <h3 className="text-lg font-semibold text-white mb-4 font-satoshi">
                Support & Actions
              </h3>

              <div className="space-y-3">
                <button
                  onClick={() => setShowContactModal(true)}
                  className="w-full flex items-center justify-between p-2.5 bg-[#0F0F0F] rounded-lg border border-[#2C2C2C] hover:border-[#E2AF19] transition-colors"
                >
                  <div className="flex items-center">
                    <MessageSquare size={16} className="text-gray-400 mr-2" />
                    <span className="text-white font-satoshi">
                      Contact Support
                    </span>
                  </div>
                  <span className="text-gray-400">→</span>
                </button>

                <button className="w-full flex items-center justify-between p-2.5 bg-[#0F0F0F] rounded-lg border border-[#2C2C2C] hover:border-[#E2AF19] transition-colors">
                  <div className="flex items-center">
                    <Settings size={16} className="text-gray-400 mr-2" />
                    <span className="text-white font-satoshi">
                      Report a Bug
                    </span>
                  </div>
                  <span className="text-gray-400">→</span>
                </button>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center p-2.5 bg-red-600 hover:bg-red-700 rounded-lg transition-colors mt-4"
                >
                  <LogOut size={16} className="text-white mr-2" />
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
          <div className="fixed inset-0 flex items-center justify-center z-50 p-3">
            <div className="bg-black border border-[#2C2C2C] rounded-[16px] w-full max-w-md p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-white font-satoshi">
                  Change Password
                </h3>
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3">
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

                <div className="flex gap-2 pt-3">
                  <button
                    onClick={() => setShowPasswordModal(false)}
                    className="flex-1 px-3 py-1.5 bg-[#2C2C2C] text-white rounded-lg font-satoshi hover:bg-[#3C3C3C] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePasswordChange}
                    className="flex-1 px-3 py-1.5 bg-[#E2AF19] text-black rounded-lg font-satoshi font-medium hover:bg-[#D4A853] transition-colors"
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
          <div className="fixed inset-0 flex items-center justify-center z-50 p-3">
            <div className="bg-black border border-[#2C2C2C] rounded-[16px] w-full max-w-md p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-white font-satoshi">
                  Contact Support
                </h3>
                <button
                  onClick={() => setShowContactModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3">
                <Input
                  type="text"
                  placeholder="Subject"
                  className="font-satoshi"
                />
                <textarea
                  placeholder="Describe your issue..."
                  className="w-full p-2.5 bg-black border border-[#2C2C2C] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#E2AF19] font-satoshi resize-none"
                  rows={3}
                />

                <div className="flex gap-2 pt-3">
                  <button
                    onClick={() => setShowContactModal(false)}
                    className="flex-1 px-3 py-1.5 bg-[#2C2C2C] text-white rounded-lg font-satoshi hover:bg-[#3C3C3C] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setShowContactModal(false);
                      alert("Support request submitted successfully!");
                    }}
                    className="flex-1 px-3 py-1.5 bg-[#E2AF19] text-black rounded-lg font-satoshi font-medium hover:bg-[#D4A853] transition-colors"
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

        {/* QR Code Modal */}
        <UserQRCodeModal
          isOpen={showQRModal}
          onClose={() => setShowQRModal(false)}
        />

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
