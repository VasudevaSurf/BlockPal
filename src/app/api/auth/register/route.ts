export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json();

    const { db } = await connectToDatabase();

    // Check if user already exists
    const existingUser = await db.collection("users").findOne({
      gmail: email,
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 409 }
      );
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create username from email
    const username =
      email.split("@")[0] + "_" + Math.random().toString(36).substr(2, 4);

    // Create new user
    const newUser = {
      username,
      gmail: email,
      displayName: name,
      avatar: `https://avatars.dicebear.com/api/identicon/${username}.svg`,
      passwordHash,
      preferences: { notifications: true },
      currency: "USD",
      Holder: false,
      createdAt: new Date(),
      lastLoginAt: new Date(),
    };

    const result = await db.collection("users").insertOne(newUser);

    // Create JWT token
    const token = jwt.sign(
      { userId: result.insertedId, username: newUser.username },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "24h" }
    );

    const userData = {
      id: result.insertedId,
      username: newUser.username,
      displayName: newUser.displayName,
      email: newUser.gmail,
      avatar: newUser.avatar,
      currency: newUser.currency,
    };

    const response = NextResponse.json({
      user: userData,
      token,
    });

    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000,
    });

    return response;
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
