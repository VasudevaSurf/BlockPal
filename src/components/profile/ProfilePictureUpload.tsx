// src/components/profile/ProfilePictureUpload.tsx - SUPER SIMPLIFIED VERSION
"use client";

import { useState, useRef } from "react";
import {
  Camera,
  Upload,
  Trash2,
  X,
  AlertCircle,
  User,
  CheckCircle,
} from "lucide-react";
import Button from "@/components/ui/Button";

interface ProfilePictureUploadProps {
  currentAvatarUrl?: string;
  userName?: string;
  onAvatarUpdate: (newAvatarUrl: string) => void;
  className?: string;
}

export default function ProfilePictureUpload({
  currentAvatarUrl,
  userName = "User",
  onAvatarUpdate,
  className = "",
}: ProfilePictureUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // DEBUG: Log current avatar URL
  console.log("🖼️ ProfilePictureUpload - Avatar URL:", currentAvatarUrl);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    setSuccess("");

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5MB");
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setSelectedFile(file);
    setShowModal(true);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();
      formData.append("picture", selectedFile);

      const response = await fetch("/api/profile/picture", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to upload profile picture");
      }

      console.log("✅ Upload successful, new URL:", data.avatarUrl);
      setSuccess("Profile picture updated successfully!");
      onAvatarUpdate(data.avatarUrl);

      setTimeout(() => {
        handleCloseModal();
      }, 1500);
    } catch (error: any) {
      console.error("❌ Upload failed:", error);
      setError(error.message || "Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async () => {
    setIsUploading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/profile/picture", {
        method: "DELETE",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to remove profile picture");
      }

      console.log("✅ Remove successful, new URL:", data.avatarUrl);
      setSuccess("Profile picture removed successfully!");
      onAvatarUpdate(data.avatarUrl);

      setTimeout(() => {
        setShowModal(false);
      }, 1500);
    } catch (error: any) {
      console.error("❌ Remove failed:", error);
      setError(error.message || "Failed to remove image");
    } finally {
      setIsUploading(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setPreviewUrl(null);
    setSelectedFile(null);
    setError("");
    setSuccess("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const isDefaultAvatar = currentAvatarUrl?.includes("dicebear.com");
  const hasCustomAvatar = currentAvatarUrl && !isDefaultAvatar;

  return (
    <>
      <div className={`relative group cursor-pointer ${className}`}>
        {/* Simple Image Display - Direct approach */}
        <div
          onClick={triggerFileInput}
          className="relative w-full h-full rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center"
        >
          {currentAvatarUrl ? (
            <img
              src={currentAvatarUrl}
              alt={`${userName}'s profile`}
              className="w-full h-full object-cover"
              onLoad={() => console.log("✅ Avatar loaded")}
              onError={() => console.log("❌ Avatar failed")}
            />
          ) : (
            <User size={20} className="text-white" />
          )}
        </div>

        {/* Pencil Edit Icon */}
        <button
          onClick={triggerFileInput}
          className="absolute -bottom-0.5 -right-0.5 w-6 h-6 bg-[#E2AF19] hover:bg-[#D4A853] rounded-full flex items-center justify-center shadow-lg transition-colors"
          title="Edit profile picture"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-black"
          >
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Upload Modal */}
      {showModal && (
        <>
          <div className="fixed inset-0 z-40 bg-white/10" />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-3">
            <div className="bg-black border border-[#2C2C2C] rounded-[16px] w-full max-w-md p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-white font-satoshi">
                  Update Profile Picture
                </h3>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-white transition-colors p-1.5 hover:bg-[#2C2C2C] rounded-lg"
                  disabled={isUploading}
                >
                  <X size={18} />
                </button>
              </div>

              {success && (
                <div className="mb-3 p-2.5 bg-green-900/20 border border-green-500/50 rounded-lg">
                  <div className="flex items-start">
                    <CheckCircle
                      size={14}
                      className="text-green-400 mr-2 flex-shrink-0 mt-0.5"
                    />
                    <p className="text-green-400 text-sm font-satoshi">
                      {success}
                    </p>
                  </div>
                </div>
              )}

              {error && (
                <div className="mb-3 p-2.5 bg-red-900/20 border border-red-500/50 rounded-lg">
                  <div className="flex items-start">
                    <AlertCircle
                      size={14}
                      className="text-red-400 mr-2 flex-shrink-0 mt-0.5"
                    />
                    <p className="text-red-400 text-sm font-satoshi">{error}</p>
                  </div>
                </div>
              )}

              {previewUrl && (
                <div className="mb-4">
                  <div className="text-center">
                    <div className="w-24 h-24 mx-auto mb-3 rounded-full overflow-hidden border-2 border-[#2C2C2C]">
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-gray-400 text-sm font-satoshi">
                      Preview of your new profile picture
                    </p>
                  </div>
                </div>
              )}

              {selectedFile && (
                <div className="mb-4 p-2.5 bg-[#0F0F0F] rounded-lg border border-[#2C2C2C]">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400 font-satoshi">File:</span>
                    <span className="text-white font-satoshi">
                      {selectedFile.name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-gray-400 font-satoshi">Size:</span>
                    <span className="text-white font-satoshi">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                </div>
              )}

              {!success && (
                <div className="space-y-2">
                  {selectedFile && (
                    <Button
                      onClick={handleUpload}
                      disabled={isUploading}
                      className="w-full"
                    >
                      {isUploading ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-black mr-2"></div>
                          Uploading...
                        </div>
                      ) : (
                        <div className="flex items-center justify-center">
                          <Upload size={14} className="mr-2" />
                          Upload Picture
                        </div>
                      )}
                    </Button>
                  )}

                  {hasCustomAvatar && !selectedFile && (
                    <Button
                      onClick={handleRemove}
                      disabled={isUploading}
                      variant="secondary"
                      className="w-full bg-red-600 hover:bg-red-700 border-red-600 text-white"
                    >
                      {isUploading ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white mr-2"></div>
                          Removing...
                        </div>
                      ) : (
                        <div className="flex items-center justify-center">
                          <Trash2 size={14} className="mr-2" />
                          Remove Picture
                        </div>
                      )}
                    </Button>
                  )}

                  <Button
                    onClick={triggerFileInput}
                    disabled={isUploading}
                    variant="secondary"
                    className="w-full"
                  >
                    <Camera size={14} className="mr-2" />
                    Choose Different File
                  </Button>

                  <Button
                    onClick={handleCloseModal}
                    disabled={isUploading}
                    variant="secondary"
                    className="w-full"
                  >
                    Cancel
                  </Button>
                </div>
              )}

              <div className="mt-4 p-2.5 bg-blue-900/20 border border-blue-500/50 rounded-lg">
                <p className="text-blue-400 text-xs font-satoshi">
                  <strong>Guidelines:</strong>
                  <br />• Maximum file size: 5MB
                  <br />• Supported formats: JPG, PNG, GIF, WebP
                  <br />• Recommended: Square images (1:1 ratio)
                  <br />• Images will be displayed as circular avatars
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
