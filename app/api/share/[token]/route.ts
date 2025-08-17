import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { transformPasswordDataArray } from "@/lib/helper";

// GET shared content by token (public access)
export async function GET(
  request: Request,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;

    const shareableLink = await prisma.shareableLink.findUnique({
      where: {
        token,
        isActive: true,
      },
      include: {
        password: true,
        passwordGroup: {
          include: {
            passwords: true,
          },
        },
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    if (!shareableLink) {
      return new NextResponse("Shared link not found or expired", {
        status: 404,
      });
    }

    // Check if the link has expired
    if (shareableLink.expiresAt && shareableLink.expiresAt < new Date()) {
      return new NextResponse("Shared link has expired", { status: 410 });
    }

    let responseData: any = {
      id: shareableLink.id,
      createdAt: shareableLink.createdAt,
      expiresAt: shareableLink.expiresAt,
      sharedBy: shareableLink.user.email,
    };

    if (shareableLink.password) {
      // Transform password (decrypt)
      const [transformedPassword] = await transformPasswordDataArray([
        shareableLink.password,
      ]);
      responseData.password = transformedPassword;
      responseData.type = "password";
    }

    if (shareableLink.passwordGroup) {
      // Transform passwords (decrypt)
      const transformedPasswords = await transformPasswordDataArray(
        shareableLink.passwordGroup.passwords
      );
      responseData.passwordGroup = {
        ...shareableLink.passwordGroup,
        passwords: transformedPasswords,
      };
      responseData.type = "group";
    }

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("[API_SHARE_GET_TOKEN]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// POST import shared content
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

    const shareableLink = await prisma.shareableLink.findUnique({
      where: {
        token,
        isActive: true,
      },
      include: {
        password: true,
        passwordGroup: {
          include: {
            passwords: true,
          },
        },
      },
    });

    if (!shareableLink) {
      return new NextResponse("Shared link not found or expired", {
        status: 404,
      });
    }

    // Check if the link has expired
    if (shareableLink.expiresAt && shareableLink.expiresAt < new Date()) {
      return new NextResponse("Shared link has expired", { status: 410 });
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

    let result: any = {};

    if (shareableLink.password) {
      // Check if user already imported this password
      const existingImport = await prisma.userPassword.findUnique({
        where: {
          userId_passwordId: {
            userId: user.id,
            passwordId: shareableLink.password.id,
          },
        },
      });

      if (existingImport) {
        return new NextResponse("Password already imported", { status: 409 });
      }

      // Import the password
      const importedPassword = await prisma.userPassword.create({
        data: {
          userId: user.id,
          passwordId: shareableLink.password.id,
        },
        include: {
          password: true,
        },
      });

      result = {
        type: "password",
        imported: importedPassword,
      };
    }

    if (shareableLink.passwordGroup) {
      // Check if user already imported this group
      const existingImport = await prisma.userPasswordGroup.findUnique({
        where: {
          userId_passwordGroupId: {
            userId: user.id,
            passwordGroupId: shareableLink.passwordGroup.id,
          },
        },
      });

      if (existingImport) {
        return new NextResponse("Password group already imported", {
          status: 409,
        });
      }

      // Import the password group
      const importedGroup = await prisma.userPasswordGroup.create({
        data: {
          userId: user.id,
          passwordGroupId: shareableLink.passwordGroup.id,
        },
        include: {
          passwordGroup: {
            include: {
              passwords: true,
            },
          },
        },
      });

      result = {
        type: "group",
        imported: importedGroup,
      };
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("[API_SHARE_POST_TOKEN]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
