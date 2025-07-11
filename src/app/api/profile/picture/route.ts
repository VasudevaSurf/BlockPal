// src/app/api/profile/picture/route.ts - UPDATED with enhanced debugging
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { put, del } from "@vercel/blob";

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.cookies.get("auth-token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      console.log("❌ Unauthorized access attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(
      "📸 Profile picture upload for user:",
      decoded.username,
      "ID:",
      decoded.userId
    );

    // Get the form data
    const formData = await request.formData();
    const file = formData.get("picture") as File;

    if (!file) {
      console.log("❌ No file provided in request");
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      console.log("❌ Invalid file type:", file.type);
      return NextResponse.json(
        { error: "File must be an image" },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      console.log("❌ File too large:", file.size, "bytes");
      return NextResponse.json(
        { error: "File size must be less than 5MB" },
        { status: 400 }
      );
    }

    console.log("📁 File validation passed:", {
      name: file.name,
      type: file.type,
      size: file.size,
      sizeInMB: (file.size / 1024 / 1024).toFixed(2),
    });

    const { db } = await connectToDatabase();
    console.log("🔗 Database connected successfully");

    // Get current user to check for existing avatar
    const user = await db.collection("users").findOne({
      _id: new ObjectId(decoded.userId),
    });

    if (!user) {
      console.log("❌ User not found:", decoded.userId);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.log("👤 User found:", {
      username: user.username,
      currentAvatar: user.avatar,
      hasAvatar: !!user.avatar,
    });

    // Delete old avatar from Vercel Blob if it exists and is not default
    if (user.avatar && user.avatar.includes("blob.vercel-storage.com")) {
      try {
        console.log("🗑️ Deleting old avatar:", user.avatar);
        await del(user.avatar);
        console.log("✅ Old avatar deleted successfully");
      } catch (error) {
        console.warn("⚠️ Could not delete old avatar:", error);
        // Don't fail the upload if deletion fails
      }
    } else {
      console.log("ℹ️ No old avatar to delete or using default avatar");
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split(".").pop() || "jpg";
    const filename = `profile-pictures/${decoded.userId}-${timestamp}.${fileExtension}`;

    console.log("☁️ Uploading to Vercel Blob with filename:", filename);

    // Check if BLOB_READ_WRITE_TOKEN is available
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    if (!blobToken) {
      console.error(
        "❌ BLOB_READ_WRITE_TOKEN not found in environment variables"
      );
      return NextResponse.json(
        { error: "Blob storage not configured" },
        { status: 500 }
      );
    }

    console.log("🔑 Blob token available:", blobToken.substring(0, 10) + "...");

    // Upload to Vercel Blob
    const blob = await put(filename, file, {
      access: "public",
      addRandomSuffix: false,
    });

    console.log("✅ Upload successful:", {
      url: blob.url,
      size: blob.size,
      uploadedAt: blob.uploadedAt,
    });

    // Update user's avatar in database
    const updateResult = await db.collection("users").updateOne(
      { _id: new ObjectId(decoded.userId) },
      {
        $set: {
          avatar: blob.url,
          avatarUpdatedAt: new Date(),
        },
      }
    );

    console.log("📝 Database update result:", {
      matchedCount: updateResult.matchedCount,
      modifiedCount: updateResult.modifiedCount,
      acknowledged: updateResult.acknowledged,
    });

    if (updateResult.modifiedCount === 0) {
      console.warn("⚠️ Database update didn't modify any documents");
    } else {
      console.log("✅ Database updated successfully with new avatar URL");
    }

    // Verify the update by fetching the user again
    const updatedUser = await db.collection("users").findOne(
      {
        _id: new ObjectId(decoded.userId),
      },
      { projection: { avatar: 1, avatarUpdatedAt: 1, username: 1 } }
    );

    console.log("🔍 Verification - Updated user data:", {
      username: updatedUser?.username,
      avatar: updatedUser?.avatar,
      avatarUpdatedAt: updatedUser?.avatarUpdatedAt,
    });

    return NextResponse.json({
      message: "Profile picture updated successfully",
      avatarUrl: blob.url,
      uploadedAt: blob.uploadedAt,
      size: blob.size,
    });
  } catch (error) {
    console.error("❌ Profile picture upload error:", error);

    // More detailed error logging
    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.cookies.get("auth-token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      console.log("❌ Unauthorized delete attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("🗑️ Deleting profile picture for user:", decoded.username);

    const { db } = await connectToDatabase();

    // Get current user
    const user = await db.collection("users").findOne({
      _id: new ObjectId(decoded.userId),
    });

    if (!user) {
      console.log("❌ User not found:", decoded.userId);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.log("👤 User found, current avatar:", user.avatar);

    // Delete from Vercel Blob if it's not a default avatar
    if (user.avatar && user.avatar.includes("blob.vercel-storage.com")) {
      try {
        console.log("🗑️ Deleting avatar from blob:", user.avatar);
        await del(user.avatar);
        console.log("✅ Avatar deleted from blob storage");
      } catch (error) {
        console.warn("⚠️ Could not delete avatar from blob:", error);
        // Continue with database update even if blob deletion fails
      }
    } else {
      console.log("ℹ️ No custom avatar to delete from blob storage");
    }

    // Generate default avatar URL
    const defaultAvatar = `https://avatars.dicebear.com/api/identicon/${user.username}.svg`;

    console.log("🔄 Setting default avatar:", defaultAvatar);

    // Update user's avatar to default
    const updateResult = await db.collection("users").updateOne(
      { _id: new ObjectId(decoded.userId) },
      {
        $set: {
          avatar: defaultAvatar,
          avatarUpdatedAt: new Date(),
        },
      }
    );

    console.log("📝 Database update result:", {
      matchedCount: updateResult.matchedCount,
      modifiedCount: updateResult.modifiedCount,
    });

    // Verify the update
    const updatedUser = await db.collection("users").findOne(
      {
        _id: new ObjectId(decoded.userId),
      },
      { projection: { avatar: 1, avatarUpdatedAt: 1, username: 1 } }
    );

    console.log("🔍 Verification - Updated user data:", {
      username: updatedUser?.username,
      avatar: updatedUser?.avatar,
      avatarUpdatedAt: updatedUser?.avatarUpdatedAt,
    });

    console.log("✅ Profile picture reset to default");

    return NextResponse.json({
      message: "Profile picture removed successfully",
      avatarUrl: defaultAvatar,
    });
  } catch (error) {
    console.error("❌ Profile picture deletion error:", error);

    if (error instanceof Error) {
      console.error("Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
