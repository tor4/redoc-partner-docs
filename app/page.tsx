import Link from "next/link";
import { listPartnerSlugs, loadPartner } from "@/lib/loadPartner";
import styles from "./page.module.css";

export default async function Home() {
  const slugs = await listPartnerSlugs();
  const partners = await Promise.all(
    slugs.map(async (slug) => ({ slug, partner: await loadPartner(slug) })),
  );

  return (
    <main className={styles.main}>
      <h1>Partner API docs</h1>
      <p>One codebase and one OpenAPI spec, rendered per partner from a config file.</p>
      <ul>
        {partners.map(({ slug, partner }) => (
          <li key={slug}>
            <Link href={`/${slug}`}>{partner?.name ?? slug}</Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
