import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-utils";
import { createCheckoutSession } from "@/lib/dodo-payments";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { productId, successUrl, cancelUrl } = await request.json();

    if (!productId) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 }
      );
    }

    // Create checkout session with DodoPayments
    const checkout = await createCheckoutSession({
      productId,
      successUrl,
      cancelUrl,
      customerId: session.user.id, // Use user ID as customer ID for now
    });

    return NextResponse.json({ 
      checkoutUrl: checkout.url,
      checkoutId: checkout.id 
    });
  } catch (error) {
    console.error("Checkout creation error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}