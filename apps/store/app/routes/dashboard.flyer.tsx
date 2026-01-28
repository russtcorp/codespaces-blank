import { type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { renderToStream } from "@react-pdf/renderer";
import { getAuthenticator } from "~/services/auth.server";
import { drizzle } from "drizzle-orm/d1";
import { businessSettings, themeConfig } from "@diner-saas/db";
import { eq } from "drizzle-orm";
import QRCode from "qrcode";
import { FlyerDocument } from "~/components/FlyerDocument";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = (context as any).cloudflare?.env;
  const user = await getAuthenticator(env).isAuthenticated(request);
  const db = drizzle(env.DB);
  
  if (!user) {
    throw new Response("Unauthorized", { status: 401 });
  }

  try {
    // Fetch business settings
    const settings = await db
      .select()
      .from(businessSettings)
      .where(eq(businessSettings.tenantId, user.tenantId))
      .get();

    // Fetch theme config for logo
    const theme = await db
      .select()
      .from(themeConfig)
      .where(eq(themeConfig.tenantId, user.tenantId))
      .get();

    if (!settings) {
      throw new Response("Settings not found", { status: 404 });
    }

    // Get the public URL (from custom domain or subdomain)
    const env = (request as any).env;
    const publicUrl = settings.address 
      ? `https://${user.tenantId}.diner-saas.com` 
      : "https://example.com"; // TODO: Get from tenant config

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(publicUrl, {
      width: 300,
      margin: 2,
      errorCorrectionLevel: "M",
    });

    // Render PDF
    const stream = await renderToStream(
      <FlyerDocument
        businessName={settings.address?.split(",")[0] || "Your Diner"}
        address={settings.address || ""}
        phone={settings.phone_public || ""}
        qrCodeDataUrl={qrCodeDataUrl}
        publicUrl={publicUrl}
      />
    );

    // Convert stream to response
    const body = new ReadableStream({
      start(controller) {
        stream.on("data", (chunk) => controller.enqueue(chunk));
        stream.on("end", () => controller.close());
        stream.on("error", (err) => controller.error(err));
      },
    });

    return new Response(body, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="diner-flyer.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    throw new Response("Failed to generate PDF", { status: 500 });
  }
}
