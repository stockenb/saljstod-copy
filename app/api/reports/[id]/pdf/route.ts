import { NextResponse } from "next/server";

import { createServerClientSupabase } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

function escapePdf(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function buildPdf(lines: string[]) {
  const header = "%PDF-1.4\n";
  const objects: string[] = [];

  const content = [
    "BT",
    "/F1 12 Tf",
    "14 TL",
    "50 780 Td",
    ...lines.map((line, index) => {
      if (index === 0) return `(${escapePdf(line)}) Tj`;
      return `T* (${escapePdf(line)}) Tj`;
    }),
    "ET",
  ].join("\n");

  objects.push("1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj");
  objects.push("2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj");
  objects.push("3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 5 0 R /Resources << /Font << /F1 4 0 R >> >> >> endobj");
  objects.push("4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj");
  objects.push(`5 0 obj << /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj`);

  const offsets: number[] = [];
  let body = "";
  let currentOffset = header.length;
  for (const obj of objects) {
    offsets.push(currentOffset);
    const chunk = obj + "\n";
    body += chunk;
    currentOffset += chunk.length;
  }

  const xrefOffset = header.length + body.length;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((off) => {
    xref += `${off.toString().padStart(10, "0")} 00000 n \n`;
  });
  const trailer = `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  const pdfString = header + body + xref + trailer;
  return Buffer.from(pdfString, "binary");
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const supabase = createServerClientSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { data: report } = await supabase
    .from("visit_reports")
    .select(
      "title,customer,customer_address,customer_postal_code,customer_city,customer_email,customer_phone,location,visit_date,attendees,notes,status,next_step,next_step_due,created_at,updated_at"
    )
    .eq("id", params.id)
    .maybeSingle();

  if (!report) {
    return new NextResponse("Not found", { status: 404 });
  }

  const lines = [
    report.title,
    "",
    `Kund: ${report.customer ?? ""}`,
    report.customer_address ? `Adress: ${report.customer_address}` : "",
    report.customer_postal_code || report.customer_city
      ? `Postort: ${(report.customer_postal_code ?? "").trim()} ${report.customer_city ?? ""}`.trim()
      : "",
    report.customer_email ? `E-post: ${report.customer_email}` : "",
    report.customer_phone ? `Telefon: ${report.customer_phone}` : "",
    report.location ? `Mötesplats: ${report.location}` : "",
    report.visit_date ? `Besöksdatum: ${formatDate(report.visit_date)}` : "",
    report.attendees ? `Deltagare: ${report.attendees}` : "",
    `Status: ${report.status ?? ""}`,
    report.next_step ? `Nästa steg: ${report.next_step}` : "",
    report.next_step_due ? `Deadline: ${report.next_step_due}` : "",
    "",
    report.notes ? `Anteckningar: ${report.notes}` : "",
    "",
    `Skapad: ${formatDate(report.created_at)}`,
    `Senast uppdaterad: ${formatDate(report.updated_at)}`,
  ].filter(Boolean);

  const pdfBuffer = buildPdf(lines);

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename=rapport-${params.id}.pdf`,
      "Content-Length": String(pdfBuffer.length),
    },
  });
}
