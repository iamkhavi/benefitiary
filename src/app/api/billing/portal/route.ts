import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-utils";
import { createPortalSession } from "@/lib/dodo-payments";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Create portal session with DodoPayments
    const portal = await createPortalSession(session.user.id);

    return NextResponse.json({ 
      portalUrl: portal.url 
    });
  } catch (error) {
    console.error("Portal creation error:", error);
    return NextResponse.json(
      { error: "Failed to create portal session" },
      { status: 500 }
    );
  }
}