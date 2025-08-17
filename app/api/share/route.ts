import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { ZodError } from "zod";

// GET all shareable links for the authenticated user
export async function GET(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const offset = (page - 1) * limit;

    const [shareableLinks, totalCount] = await Promise.all([
      prisma.shareableLink.findMany({
        where: {
          user: {
            clerkId: userId,
          },
          isActive: true,
        },
        include: {
          password: {
            select: {
              id: true,
              name: true,
              website: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: limit,
        skip: offset,
      }),
      prisma.shareableLink.count({
        where: {
          user: {
            clerkId: userId,
          },
          isActive: true,
        },
      }),
    ]);

    return NextResponse.json({
      shareableLinks,
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
    console.error("[API_SHARE_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// POST create a new shareable link
export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await request.json();
    const { passwordId, expiresAt } = body;

    // Validate that passwordId is provided
    if (!passwordId) {
      return new NextResponse("passwordId must be provided", {
        status: 400,
      });
    }

    // Find or create the user in your database based on clerkId
    let user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      const clerkUser = await currentUser();
      if (!clerkUser) {
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

    // Verify ownership of the password or group
    if (passwordId) {
      const password = await prisma.password.findFirst({
        where: {
          id: passwordId,
          userId: user.id,
        },
      });

      if (!password) {
        return new NextResponse("Password not found or not owned by user", {
          status: 404,
        });
      }
    }

    // Create the shareable link
    const shareableLink = await prisma.shareableLink.create({
      data: {
        userId: user.id,
        passwordId: passwordId || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
      include: {
        password: passwordId
          ? {
              select: {
                id: true,
                name: true,
                website: true,
              },
            }
          : false,
      },
    });

    return NextResponse.json(shareableLink, { status: 201 });
  } catch (error) {
    console.error("[API_SHARE_POST]", error);
    if (error instanceof ZodError) {
      return new NextResponse(JSON.stringify(error.issues), { status: 400 });
    }
    return new NextResponse("Internal Error", { status: 500 });
  }
}
