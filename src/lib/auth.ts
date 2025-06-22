import jwt from "jsonwebtoken";

interface DecodedToken {
  userId: string;
  username: string;
}

export function verifyToken(token?: string): DecodedToken | null {
  if (!token) return null;

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key"
    ) as DecodedToken;

    return decoded;
  } catch (error) {
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
