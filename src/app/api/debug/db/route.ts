import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Test database connection
    await prisma.$connect();
    
    // Check if required tables exist
    const userCount = await prisma.user.count();
    const accountCount = await prisma.account.count();
    const sessionCount = await prisma.session.count();
    
    return NextResponse.json({
      status: "connected",
      tables: {
        users: userCount,
        accounts: accountCount,
        sessions: sessionCount,
      },
      message: "Database connection successful"
    });
  } catch (error) {
    console.error("Database connection error:", error);
    return NextResponse.json({
      status: "error",
      error: error instanceof Error ? error.message : "Unknown database error",
      message: "Database connection failed"
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}