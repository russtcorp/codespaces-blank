import { type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { renderToBuffer } from "@react-pdf/renderer";
import QRCode from "qrcode";
import React from "react";
import { Document, Page, Text, View, StyleSheet, Image as PDFImage } from "@react-pdf/renderer";

/**
 * Generate a printable PDF flyer with QR code and WiFi details
 * 
 * GET /api/flyer?tenant_id=xxx
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const tenantId = url.searchParams.get("tenant_id");

  if (!tenantId) {
    return new Response("Missing tenant_id", { status: 400 });
  }

  const env = (request as any).env;

  // Fetch tenant data (including theme logo)
  const tenant = await env.DB.prepare(
    `SELECT t.businessName, t.slug, bs.address, bs.phonePublic, bs.wifiSsid, bs.wifiPassword, tc.logoImageCfId
     FROM tenants t
     LEFT JOIN business_settings bs ON t.id = bs.tenantId
     LEFT JOIN theme_config tc ON t.id = tc.tenantId
     WHERE t.id = ?`
  )
    .bind(tenantId)
    .first();

  if (!tenant) {
    return new Response("Tenant not found", { status: 404 });
  }

  // Generate QR code for the website
  const siteUrl = `https://${tenant.slug}.diner-saas.com`;
  const qrCodeDataUrl = await QRCode.toDataURL(siteUrl, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 200,
  });

  // Generate WiFi QR code if credentials available
  let wifiQrCodeDataUrl = null;
  if (tenant.wifiSsid) {
    const wifiString = `WIFI:T:WPA;S:${tenant.wifiSsid};P:${tenant.wifiPassword || ""};;`;
    wifiQrCodeDataUrl = await QRCode.toDataURL(wifiString, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 200,
    });
  }

  // Optional logo from Cloudflare Images
  const imagesAccountHash = env.CLOUDFLARE_IMAGES_ACCOUNT_HASH;
  const logoUrl = tenant.logoImageCfId && imagesAccountHash
    ? `https://imagedelivery.net/${imagesAccountHash}/${tenant.logoImageCfId}/public`
    : null;

  // Create PDF document
  const FlyerDocument = (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          {logoUrl && <PDFImage src={logoUrl} style={styles.logo} />}
          <Text style={styles.businessName}>{tenant.businessName}</Text>
          {tenant.address && <Text style={styles.address}>{tenant.address}</Text>}
          {tenant.phonePublic && <Text style={styles.phone}>{tenant.phonePublic}</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>View Our Menu Online</Text>
          <View style={styles.qrContainer}>
            <PDFImage src={qrCodeDataUrl} style={styles.qrCode} />
            <Text style={styles.qrLabel}>Scan to view our menu</Text>
            <Text style={styles.url}>{siteUrl}</Text>
          </View>
        </View>

        {wifiQrCodeDataUrl && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Free WiFi</Text>
            <View style={styles.qrContainer}>
              <PDFImage src={wifiQrCodeDataUrl} style={styles.qrCode} />
              <Text style={styles.qrLabel}>Scan to connect</Text>
              <Text style={styles.wifiDetails}>
                Network: {tenant.wifi_ssid}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Thank you for dining with us!
          </Text>
        </View>
      </Page>
    </Document>
  );

  // Render PDF to buffer
  const pdfBuffer = await renderToBuffer(FlyerDocument);

  return new Response(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${tenant.slug}-flyer.pdf"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}

const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#ffffff",
    padding: 40,
  },
  header: {
    marginBottom: 40,
    alignItems: "center",
  },
  businessName: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  address: {
    fontSize: 14,
    color: "#555",
    marginBottom: 5,
    textAlign: "center",
  },
  phone: {
    fontSize: 14,
    color: "#555",
    textAlign: "center",
  },
  section: {
    marginBottom: 40,
    padding: 20,
    borderWidth: 2,
    borderColor: "#dc2626",
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#dc2626",
  },
  qrContainer: {
    alignItems: "center",
  },
  qrCode: {
    width: 200,
    height: 200,
    marginBottom: 15,
  },
  qrLabel: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
  },
  url: {
    fontSize: 12,
    color: "#555",
  },
  wifiDetails: {
    fontSize: 14,
    color: "#555",
    marginTop: 5,
  },
  footer: {
    marginTop: "auto",
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
  },
  footerText: {
    fontSize: 12,
    textAlign: "center",
    color: "#888",
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 12,
    objectFit: "contain",
  },
});
