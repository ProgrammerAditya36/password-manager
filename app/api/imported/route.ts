import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { transformPasswordDataArray } from "@/lib/helper";

// GET all imported passwords and groups for the authenticated user
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

    let result: any = {};

    const [importedPasswords, passwordsCount] = await Promise.all([
      prisma.userPassword.findMany({
        where: {
          user: {
            clerkId: userId,
          },
        },
        include: {
          password: {
            include: {
              user: {
                select: {
                  email: true,
                },
              },
            },
          },
        },
        orderBy: {
          password: {
            name: "asc",
          },
          importedAt: "desc",
        },
        take: limit,
        skip: offset,
      }),
      prisma.userPassword.count({
        where: {
          user: {
            clerkId: userId,
          },
        },
      }),
    ]);

    // Transform passwords (decrypt)
    const transformedPasswords = await transformPasswordDataArray(
      importedPasswords.map((ip) => ip.password)
    );

    result.passwords = importedPasswords.map((ip, index) => ({
      ...ip,
      password: transformedPasswords[index],
    }));

    result.pagination = {
      page,
      limit,
      total: passwordsCount,
      totalPages: Math.ceil(passwordsCount / limit),
      hasNext: page * limit < passwordsCount,
      hasPrev: page > 1,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("[API_IMPORTED_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
