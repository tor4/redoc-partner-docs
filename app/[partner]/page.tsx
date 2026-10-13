import type { Metadata } from "next";
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

  return partner ?{ title: `${partner.name} API Docs` } : {};
}

export default async function PartnerDocsPage({
  params,
}: {
  params: Promise<{ partner: string }>;
}) {
  const { partner: slug } = await params;
  const partner = await loadPartner(slug);

  if (!partner) notFound();

  const spec = filterSpec(await loadSpec(partner.spec), partner);

  return <RedocView spec={spec} options={partner.options} theme={partner.theme} />;
}
