import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// Import schema for validation - using dynamic import to avoid Turbopack issues
import { ZodError } from "zod";
import { encrypt } from "@/lib/encryption";
import { transformPasswordDataArray } from "@/lib/helper";

// GET all passwords for the authenticated user
export async function GET(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    // Parse query parameters for pagination
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";

    // Calculate offset
    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause: any = {
      user: {
        clerkId: userId,
      },
    };

    // Add search filter if provided
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { username: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { website: { contains: search, mode: "insensitive" } },
      ];
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    // Execute query with pagination - include both owned and imported passwords
    const [ownedPasswords, importedPasswords, ownedCount, importedCount] =
      await Promise.all([
        // User's own passwords
        prisma.password.findMany({
          where: whereClause,

          orderBy: {
            name: "asc",
          },
          take: limit,
          skip: offset,
        }),
        // User's imported passwords
        prisma.userPassword.findMany({
          where: {
            userId: user.id,
            password: search
              ? {
                  OR: [
                    { name: { contains: search, mode: "insensitive" } },
                    { username: { contains: search, mode: "insensitive" } },
                    { email: { contains: search, mode: "insensitive" } },
                    { website: { contains: search, mode: "insensitive" } },
                  ],
                }
              : undefined,
          },
          include: {
            password: true,
          },
          orderBy: {
            importedAt: "desc",
          },
          take: limit,
          skip: offset,
        }),
        prisma.password.count({
          where: whereClause,
        }),
        prisma.userPassword.count({
          where: {
            userId: user.id,
            password: search
              ? {
                  OR: [
                    { name: { contains: search, mode: "insensitive" } },
                    { username: { contains: search, mode: "insensitive" } },
                    { email: { contains: search, mode: "insensitive" } },
                    { website: { contains: search, mode: "insensitive" } },
                  ],
                }
              : undefined,
          },
        }),
      ]);

    // Combine owned and imported passwords
    const allPasswords = [
      ...ownedPasswords,
      ...(importedPasswords?.map((ip) => ({
        ...ip.password,
        isImported: true,
        importedAt: ip.importedAt,
      })) || []),
    ];

    const totalCount = ownedCount + importedCount;

    // Transform passwords (decrypt)
    const transformedPasswords = await transformPasswordDataArray(allPasswords);

    return NextResponse.json({
      passwords: transformedPasswords,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: page * limit < totalCount,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("[API_PASSWORDS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// POST a new password
export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await request.json();

    const { name, username, email, password, website, description } = body;

    // Find or create the user in your database based on clerkId
    let user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      // This should ideally be handled by a webhook or middleware when user signs up
      // For now, create if not found
      const clerkUser = await currentUser();
      if (!clerkUser || !clerkUser.emailAddresses[0]?.emailAddress) {
        return new NextResponse("User data missing for new user", {
          status: 400,
        });
      }
      user = await prisma.user.create({
        data: {
          clerkId: userId,
        },
      });
    }

    const encryptedPassword = await encrypt(password);

    const newPassword = await prisma.password.create({
      data: {
        name,
        username,
        email,
        password: encryptedPassword,
        website,
        description,
        userId: user.id,
      },
    });

    return NextResponse.json(newPassword, { status: 201 });
  } catch (error) {
    console.error("[API_PASSWORDS_POST]", error);
    if (error instanceof ZodError) {
      return new NextResponse(JSON.stringify(error.issues), { status: 400 });
    }
    return new NextResponse("Internal Error", { status: 500 });
  }
}
