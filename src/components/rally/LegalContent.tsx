export function TermsContent() {
  return (
    <div className="space-y-4 text-[13px] leading-relaxed text-foreground">
      <p className="text-muted-foreground">
        Last updated: November 14, 2026
      </p>
      <p>
        Welcome to Rally. By creating an account or using the app, you agree to
        these Terms &amp; Conditions.
      </p>

      <h3 className="font-bold text-[14px] mt-2">1. What Rally is</h3>
      <p>
        Rally is a platform that helps adults and teens (15+) find people to
        play pickup sports with. Rally does not organize, run, supervise,
        officiate, or sponsor any game, meetup, or activity arranged through
        the app.
      </p>

      <h3 className="font-bold text-[14px] mt-2">2. Meetups are at your own risk</h3>
      <p>
        <strong>All games and meetups are between users, at your own risk.</strong>{" "}
        You are solely responsible for your own safety and decisions. Rally
        does not verify the identity, background, skill level, health, or
        conduct of any user. We are not responsible for anything that happens
        before, during, or after an in-person meetup, including injury, loss,
        theft, harassment, or property damage.
      </p>
      <p>
        Use common sense: meet in public places, tell someone where you're
        going, don't share sensitive personal information, and leave if you
        feel unsafe.
      </p>

      <h3 className="font-bold text-[14px] mt-2">3. Eligibility &amp; age separation</h3>
      <p>
        You must be at least 15 years old. Users 15–17 are placed in a separate
        pool from users 18+. You may only interact with users in your own pool.
      </p>

      <h3 className="font-bold text-[14px] mt-2">4. Your conduct — zero tolerance</h3>
      <p>
        There is no tolerance for objectionable content or abusive users. You
        agree not to harass, bully, threaten, discriminate against, or endanger
        other users; not to post hateful, sexual, violent, illegal, or
        misleading content; not to impersonate anyone; and not to use Rally for
        commercial solicitation without permission. We remove content and
        suspend or delete accounts that violate these rules.
      </p>

      <h3 className="font-bold text-[14px] mt-2">5. Reporting and blocking</h3>
      <p>
        You can report any user, message, game, or group from inside the app,
        and you can block any user at any time. Reports are reviewed by the
        Rally team, and we aim to act on them within 24 hours. Blocked users
        can't see you or contact you.
      </p>

      <h3 className="font-bold text-[14px] mt-2">6. Content</h3>
      <p>
        You are responsible for anything you post (game details, messages,
        profile info). Don't share other users' private contact information
        without their consent.
      </p>

      <h3 className="font-bold text-[14px] mt-2">7. No warranty</h3>
      <p>
        Rally is provided "as is" without warranty of any kind. We do not
        guarantee that games will happen, that other players will show up, or
        that the app will always be available.
      </p>

      <h3 className="font-bold text-[14px] mt-2">8. Limitation of liability</h3>
      <p>
        To the maximum extent allowed by law, Rally and its operators are not
        liable for any indirect, incidental, or consequential damages arising
        from your use of the app or any meetup arranged through it.
      </p>

      <h3 className="font-bold text-[14px] mt-2">9. Deleting your account</h3>
      <p>
        You can delete your account at any time from the You tab in the Rally
        iPhone app, or by emailing support@letsrallys.app. This permanently
        removes your profile, games you host, messages, photos, and other data.
      </p>

      <h3 className="font-bold text-[14px] mt-2">10. Changes</h3>
      <p>
        We may update these terms. Continued use after updates means you accept
        the new terms.
      </p>
    </div>
  );
}

export function PrivacyContent() {
  return (
    <div className="space-y-4 text-[13px] leading-relaxed text-foreground">
      <p className="text-muted-foreground">
        Last updated: November 14, 2026
      </p>
      <p>
        This Privacy Policy explains what information Rally collects and how
        it's used.
      </p>

      <h3 className="font-bold text-[14px] mt-2">What we collect</h3>
      <ul className="list-disc pl-5 space-y-1">
        <li>Account info: name, email, date of birth (used to determine your age pool).</li>
        <li>Profile info you add: sports, skill levels, city, and any optional contact info (phone, IG, Snap) you save.</li>
        <li>Location: the city and approximate coordinates you set in your profile, used to show nearby games on the map.</li>
        <li>Content you post: games, messages, and group activity.</li>
      </ul>

      <h3 className="font-bold text-[14px] mt-2">How we use it</h3>
      <ul className="list-disc pl-5 space-y-1">
        <li>To match you with users and games in your own age pool.</li>
        <li>To show relevant games near you.</li>
        <li>To enable chat and groups.</li>
        <li>To keep the platform safe.</li>
      </ul>

      <h3 className="font-bold text-[14px] mt-2">Contact info sharing</h3>
      <p>
        Phone number, Instagram, Snapchat, and other social handles saved in
        your profile are <strong>private by default</strong>. They are only
        shared with another user when you explicitly send them in a chat.
      </p>

      <h3 className="font-bold text-[14px] mt-2">Age pools</h3>
      <p>
        Users under 18 and users 18+ are stored in fully separated pools
        enforced at the database level. Data from one pool is never returned to
        users in the other pool.
      </p>

      <h3 className="font-bold text-[14px] mt-2">Third parties</h3>
      <p>
        Rally uses OpenStreetMap for maps and place search, and a hosted
        backend for authentication and data storage. We don't sell your data.
      </p>

      <h3 className="font-bold text-[14px] mt-2">Your choices</h3>
      <p>
        You can edit your profile, remove contact info, leave games and
        groups, or log out at any time. You can permanently delete your account
        and all of your data from the You tab in the Rally iPhone app, or by
        emailing support@letsrallys.app.
      </p>

      <h3 className="font-bold text-[14px] mt-2">Contact</h3>
      <p>Questions or requests: support@letsrallys.app</p>
    </div>
  );
}
