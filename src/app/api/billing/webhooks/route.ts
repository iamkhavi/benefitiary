import { NextRequest, NextResponse } from "next/server";
import { handleWebhookEvent } from "@/lib/dodo-payments";

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    
    // Verify webhook signature (implement signature verification in production)
    const signature = request.headers.get("dodo-signature");
    
    if (!signature) {
      return NextResponse.json(
        { error: "Missing signature" },
        { status: 400 }
      );
    }

    // Handle the webhook event
    handleWebhookEvent(payload);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}