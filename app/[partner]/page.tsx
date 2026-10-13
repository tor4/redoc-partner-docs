import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import RedocView from "@/components/RedocView";
import { filterSpec } from "@/lib/filterSpec";
import { listPartnerSlugs, loadPartner, loadSpec } from "@/lib/loadPartner";

export async function generateStaticParams() {
  return (await listPartnerSlugs()).map((partner) => ({ partner }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ partner: string }>;
}): Promise<Metadata> {
  const { partner: slug } = await params;
  const partner = await loadPartner(slug);

  return partner ? { title: `${partner.name} API Docs` } : {};
}

type PartnerParams = Promise<{ partner: string }>;

export default function PartnerDocsPage({ params }: { params: PartnerParams }) {
  return (
    <Suspense fallback={<p>Loading API docs…</p>}>
      <PartnerDocs params={params} />
    </Suspense>
  );
}

async function PartnerDocs({ params }: { params: PartnerParams }) {
  const { partner: slug } = await params;
  const partner = await loadPartner(slug);

  if (!partner) notFound();

  const spec = filterSpec(await loadSpec(partner.spec), partner);

  return (
    <RedocView spec={spec} options={partner.options} theme={partner.theme} />
  );
}
