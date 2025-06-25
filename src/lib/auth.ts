import jwt from "jsonwebtoken";

interface DecodedToken {
  userId: string;
  username: string;
}

const isTestMode = process.env.NEXT_PUBLIC_TEST_MODE === "true";

export function verifyToken(token?: string): DecodedToken | null {
  // In test mode, always return test user if no token provided
  if (isTestMode && !token) {
    console.log("🧪 Test mode: No token provided, returning test user");
    return {
      userId: "test-user-1",
      username: "testuser",
    };
  }

  // In test mode, if token exists, verify it normally
  // In production mode, always require and verify token
  if (!token) return null;

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key"
    ) as DecodedToken;

    return decoded;
  } catch (error) {
    // In test mode, if token verification fails, still return test user
    if (isTestMode) {
      console.log(
        "🧪 Test mode: Token verification failed, returning test user"
      );
      return {
        userId: "test-user-1",
        username: "testuser",
      };
    }

    console.error("Token verification failed:", error);
    return null;
  }
}

export function generateToken(payload: {
  userId: string;
  username: string;
}): string {
  return jwt.sign(payload, process.env.JWT_SECRET || "your-secret-key", {
    expiresIn: "24h",
  });
}
