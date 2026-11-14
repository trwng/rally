# Rally — how reports are reviewed

Apple (guideline 1.2) requires apps with user-generated content to have: a way to report content, a way to block users, terms that ban objectionable content, and a developer who acts on reports quickly (within 24 hours).

## What's in the app
- Report buttons on users, messages, games and groups (`reports` table).
- Block on any player profile (`blocks` table). Blocked users disappear from chats, friends, groups and "People near you".
- Terms & Conditions say there is zero tolerance for objectionable content and that reports are reviewed within 24 hours.

## Your review routine (once a day)
1. Open the Supabase dashboard → **Table editor → reports** (or the SQL editor) and look at rows where `status = 'open'`.
2. Look at what was reported:
   - `target_type = 'message'` → `select * from messages where id = '<target_id>';`
   - `target_type = 'user'`    → `select * from profiles where id = '<target_id>';`
   - `target_type = 'game'`    → `select * from games where id = '<target_id>';`
   - `target_type = 'group'`   → `select * from groups where id = '<target_id>';`
3. Act:
   - Remove a message: `delete from messages where id = '<id>';`
   - Remove a game / group: `delete from games where id = '<id>';`
   - Remove a user (deletes all their data): Supabase → **Authentication → Users →** delete, or `delete from auth.users where id = '<user id>';`
4. Close the report: `update reports set status = 'resolved' where id = '<report id>';`

When App Review asks "how do you moderate?", this is the answer.
