export const metadata = { title: "Terms of Service — Small Software Workspace" };

export default function TermsPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-6 text-sm leading-relaxed">
      <h1 className="text-xl font-semibold">Terms of Service</h1>
      <p className="text-black/60 dark:text-white/60">
        Last updated {new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}.
      </p>

      <h2 className="font-semibold">What this is</h2>
      <p>
        Small Software Workspace lets you build small tools from a fixed set of building blocks
        (inputs, tables, views, actions, and rules), by hand or from a plain-language description.
        It&rsquo;s provided as-is, without warranty of any kind — we do our best to keep it
        working, but we don&rsquo;t guarantee uptime, data durability, or fitness for any
        particular purpose.
      </p>

      <h2 className="font-semibold">Your content</h2>
      <p>
        You own what you create here. By setting a tool to &ldquo;Public,&rdquo; you&rsquo;re
        choosing to let anyone view it. Don&rsquo;t publish anything you don&rsquo;t have the
        right to share, or anything illegal, harassing, or intended to deceive.
      </p>

      <h2 className="font-semibold">Acceptable use</h2>
      <ul className="list-disc pl-5">
        <li>No automated abuse of the service — scripted spam, attempts to bypass rate limits, or excessive load intended to disrupt it.</li>
        <li>No using the &ldquo;Describe a tool&rdquo; feature to generate content unrelated to building a tool, or to attempt to extract, jailbreak, or abuse the underlying AI model.</li>
        <li>No impersonating another person or organization.</li>
      </ul>
      <p>We may suspend or remove accounts or content that violate these terms.</p>

      <h2 className="font-semibold">No liability for public content</h2>
      <p>
        Tools marked &ldquo;Public&rdquo; are created by users, not by us. We don&rsquo;t review
        public tools before they&rsquo;re listed on the Community page and aren&rsquo;t
        responsible for their content — but you can report anything concerning to us at the
        contact below, or flag it directly from the tool&rsquo;s page.
      </p>

      <h2 className="font-semibold">Copyright complaints</h2>
      <p>
        If content published on this site infringes your copyright, email{" "}
        <a href="mailto:contact@effant.tech" className="underline">
          contact@effant.tech
        </a>{" "}
        with (1) a description of the copyrighted work, (2) the URL of the infringing tool, (3)
        your contact information, and (4) a statement that you have a good-faith belief the use
        isn&rsquo;t authorized. We&rsquo;ll investigate and remove infringing content we confirm.
      </p>

      <h2 className="font-semibold">Cancellation</h2>
      <p>
        Cancel a Pro subscription any time from{" "}
        <a href="/settings" className="underline">
          Settings
        </a>{" "}
        — it stays active through the end of the period you&rsquo;ve already paid for, then
        doesn&rsquo;t renew. No cancellation fee, no need to contact us. Billing questions:{" "}
        <a href="mailto:billing@effant.tech" className="underline">
          billing@effant.tech
        </a>
        .
      </p>

      <h2 className="font-semibold">Changes</h2>
      <p>
        We may update these terms as the product changes. Continued use after an update means you
        accept the new terms.
      </p>

      <h2 className="font-semibold">Contact</h2>
      <p>
        Questions, or want to report content? Reach out at{" "}
        <a href="mailto:contact@effant.tech" className="underline">
          contact@effant.tech
        </a>
        .
      </p>
    </div>
  );
}
