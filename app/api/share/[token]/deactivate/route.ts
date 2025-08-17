import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// POST deactivate a shareable link
export async function POST(
  request: Request,
  { params }: { params: { token: string } }
) {
  const { userId } = await auth();

  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { token } = params;

    // Verify the shareable link belongs to the user
    const shareableLink = await prisma.shareableLink.findFirst({
      where: {
        token,
        user: {
          clerkId: userId,
        },
      },
    });

    if (!shareableLink) {
      return new NextResponse("Shareable link not found", { status: 404 });
    }

    // Deactivate the link
    const updatedLink = await prisma.shareableLink.update({
      where: {
        id: shareableLink.id,
      },
      data: {
        isActive: false,
      },
      include: {
        password: {
          select: {
            id: true,
            name: true,
            website: true,
          },
        },
        passwordGroup: {
          select: {
            id: true,
            name: true,
            _count: {
              select: {
                passwords: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(updatedLink);
  } catch (error) {
    console.error("[API_SHARE_DEACTIVATE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
