import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
// Removed encryption imports
// Import schema for validation - using dynamic import to avoid Turbopack issues
import { ZodError } from "zod";
import { getCurrentUser } from "@/lib/actions/user"; // Reverted import
import { encrypt } from "@/lib/encryption";
import { transformPasswordData } from "@/lib/helper";

// Helper function to check ownership
const checkPasswordOwnership = async (passwordId: string) => {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { error: "Unauthorized", status: 401 };
  }

  const password = await prisma.password.findUnique({
    where: { id: passwordId },
    select: { userId: true },
  });

  if (!password) {
    return { error: "Password not found", status: 404 };
  }

  if (password.userId !== currentUser.id) {
    return { error: "Forbidden", status: 403 };
  }

  return { success: true, currentUser };
};

// GET a single password
export async function GET(
  request: Request,
  { params }: { params: Promise<{ passwordId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { passwordId } = await params;
    const checkResult = await checkPasswordOwnership(passwordId);
    if (checkResult.error) {
      return new NextResponse(checkResult.error, {
        status: checkResult.status,
      });
    }

    const fullPassword = await prisma.password.findUnique({
      where: { id: passwordId },
    });

    if (!fullPassword) {
      return new NextResponse("Password not found", { status: 404 });
    }

    // No decryption needed here
    const returnData = await transformPasswordData(fullPassword);
    return NextResponse.json(returnData);
  } catch (error) {
    console.error("[API_PASSWORD_ID_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// PUT (update) a password
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ passwordId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { passwordId } = await params;
    const checkResult = await checkPasswordOwnership(passwordId);
    if (checkResult.error) {
      return new NextResponse(checkResult.error, {
        status: checkResult.status,
      });
    }

    const body = await request.json();
    const { name, username, email, password, website, description } = body;

    const encryptedPassword = await encrypt(password);
    // No encryption needed for the password field
    const updatedPassword = await prisma.password.update({
      where: { id: passwordId },
      data: {
        name,
        username,
        email,
        password: encryptedPassword,
        website,
        description,
      },
    });

    // No decryption needed here
    const returnData = await transformPasswordData(updatedPassword);
    return NextResponse.json(returnData);
  } catch (error) {
    console.error("[API_PASSWORD_ID_PUT]", error);
    if (error instanceof ZodError) {
      return new NextResponse(JSON.stringify(error.issues), { status: 400 });
    }
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// PATCH - Update a password
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ passwordId: string }> }
) {
  const { userId } = await auth();

  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await request.json();
    const { passwordId } = await params;

    // Verify the password belongs to the authenticated user
    const existingPassword = await prisma.password.findFirst({
      where: {
        id: passwordId,
        user: {
          clerkId: userId,
        },
      },
    });

    if (!existingPassword) {
      return new NextResponse("Password not found", { status: 404 });
    }

    // Prepare update data
    const updateData: any = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.username !== undefined) updateData.username = body.username;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.website !== undefined) updateData.website = body.website;
    if (body.description !== undefined)
      updateData.description = body.description;

    // Encrypt password if it's being updated
    if (body.password) {
      updateData.password = await encrypt(body.password);
    }

    // Update the password
    const updatedPassword = await prisma.password.update({
      where: { id: passwordId },
      data: updateData,
    });

    return NextResponse.json(updatedPassword);
  } catch (error) {
    console.error("[API_PASSWORD_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// DELETE - Delete a password
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ passwordId: string }> }
) {
  const { userId } = await auth();

  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { passwordId } = await params;

    // Verify the password belongs to the authenticated user
    const existingPassword = await prisma.password.findFirst({
      where: {
        id: passwordId,
        user: {
          clerkId: userId,
        },
      },
    });

    if (!existingPassword) {
      return new NextResponse("Password not found", { status: 404 });
    }

    // Delete the password
    await prisma.password.delete({
      where: { id: passwordId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[API_PASSWORD_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
