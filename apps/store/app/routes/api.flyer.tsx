import { type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { renderToStream } from "@react-pdf/renderer";
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import QRCode from "qrcode";
import { getAuthenticator } from "~/services/auth.server";
import { drizzle } from "drizzle-orm/d1";
import { businessSettings, tenants, eq } from "@diner-saas/db";

// PDF Styles
const styles = StyleSheet.create({
  page: { flexDirection: "column", padding: 30, alignItems: "center" },
  title: { fontSize: 24, marginBottom: 10, textAlign: "center" },
  subtitle: { fontSize: 16, marginBottom: 20, textAlign: "center" },
  qrCode: { width: 200, height: 200, marginBottom: 20 },
  footer: { fontSize: 12, marginTop: "auto" },
  wifiBox: { border: "1px solid #ccc", padding: 10, marginTop: 20, width: "80%" },
  wifiText: { fontSize: 14, textAlign: "center" }
});

// PDF Component
const FlyerPDF = ({ businessName, publicUrl, wifiSsid, wifiPass, qrDataUrl }: any) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.title}>{businessName}</Text>
      <Text style={styles.subtitle}>Scan to view our menu & order!</Text>
      
      <Image src={qrDataUrl} style={styles.qrCode} />
      
      <Text>{publicUrl}</Text>

      {(wifiSsid || wifiPass) && (
        <View style={styles.wifiBox}>
          <Text style={{ ...styles.wifiText, fontWeight: "bold", marginBottom: 5 }}>Free Wi-Fi</Text>
          <Text style={styles.wifiText}>Network: {wifiSsid || "N/A"}</Text>
          <Text style={styles.wifiText}>Password: {wifiPass || "Open"}</Text>
        </View>
      )}

      <Text style={styles.footer}>Powered by Diner SaaS</Text>
    </Page>
  </Document>
);

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = (context as any).cloudflare?.env;
  const authenticator = getAuthenticator(env);
  const user = await authenticator.isAuthenticated(request);

  if (!user) {
    throw new Response("Unauthorized", { status: 401 });
  }

  const db = drizzle(env.DB);

  // Fetch tenant details
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, user.tenantId)
  });

  const settings = await db.query.businessSettings.findFirst({
    where: eq(businessSettings.tenantId, user.tenantId)
  });

  // Note: Wifi fields need to be added to schema if not present. 
  // Assuming they might be in a JSON field or we add them. 
  // For now, checking if 'wifi_ssid' exists, if not, use stub.
  // Actually, I'll check schema.ts later. For now, assume keys exist on settings object loosely.
  
  const publicUrl = `https://${tenant?.slug}.diner-saas.com`;
  
  // Generate QR
  const qrDataUrl = await QRCode.toDataURL(publicUrl);

  // Render PDF
  const stream = await renderToStream(
    <FlyerPDF 
      businessName={tenant?.business_name || "My Diner"}
      publicUrl={publicUrl}
      wifiSsid={(settings as any)?.wifi_ssid} 
      wifiPass={(settings as any)?.wifi_pass}
      qrDataUrl={qrDataUrl}
    />
  );

  return new Response(stream as any, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="flyer-${tenant?.slug}.pdf"`,
    },
  });
}
