export const metadata = { title: "Privacy Policy — Small Software Workspace" };

export default function PrivacyPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-6 text-sm leading-relaxed">
      <h1 className="text-xl font-semibold">Privacy Policy</h1>
      <p className="text-black/60 dark:text-white/60">
        Last updated {new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}.
        This is a plain-language draft, not reviewed by a lawyer — have one look it over before
        you rely on it for a real launch.
      </p>

      <h2 className="font-semibold">What we collect</h2>
      <ul className="list-disc pl-5">
        <li><strong>Your email address</strong>, when you sign in (we use it only to send you a sign-in link and identify your account — we don&rsquo;t sell it or use it for marketing).</li>
        <li><strong>Content you create</strong> — tool names, the block-based schemas you build or generate, and any data you enter into a tool you&rsquo;ve made (e.g. records in a tracker).</li>
        <li><strong>What you type into &ldquo;Describe a tool&rdquo;</strong> on the Generate page — this text is sent to Anthropic (see below) to produce a schema.</li>
        <li><strong>Basic technical logs</strong> (IP address, timestamps, error logs) collected automatically by our hosting provider, Vercel, for security and debugging.</li>
      </ul>

      <h2 className="font-semibold">Who else sees your data</h2>
      <ul className="list-disc pl-5">
        <li><strong>Supabase</strong> hosts our database and handles sign-in — your email, account, and tool content are stored there.</li>
        <li><strong>Anthropic</strong> processes the text you submit on the Generate page to produce a tool schema, under Anthropic&rsquo;s own API terms and data-use policies.</li>
        <li><strong>Vercel</strong> hosts and serves this website.</li>
        <li>We don&rsquo;t sell your data to anyone, and we don&rsquo;t share it with other third parties beyond what&rsquo;s needed to run the service above.</li>
      </ul>

      <h2 className="font-semibold">Visibility of what you create</h2>
      <p>
        Every tool you make has a visibility setting you choose: <strong>Private</strong> (only
        you), <strong>Workspace</strong> (visible to people you&rsquo;ve invited to your
        workspace), or <strong>Public</strong> (visible to anyone on the internet, including
        people without an account, and listed on the Community page). Changing a tool to Public
        is your choice and can be undone at any time from the builder.
      </p>

      <h2 className="font-semibold">Your rights</h2>
      <p>
        You can delete any tool you own at any time. To delete your account entirely, or request
        a copy of your data, contact us at the address below — we&rsquo;ll act on it within a
        reasonable time.
      </p>

      <h2 className="font-semibold">Contact</h2>
      <p>Questions about this policy? Reach out at [add a contact email here].</p>
    </div>
  );
}
