# Deploying to GitHub Pages

The code is committed and ready. What remains needs **your GitHub login**,
which Claude does not have, so the account steps below are yours to run.

Current state of this folder:

- 3 commits on `main`, working tree clean
- the `origin` remote still points at `shalni-upvc-enterprises/uPvc_Door_Window`,
  which is **not your repository** — nothing has been pushed anywhere
- every path in the site is relative, so it works at
  `https://<you>.github.io/<repo>/` without changes

---

## Option A — Browser, then push from here

1. Go to <https://github.com/new>.
2. Repository name: `sspl-upvc`. Public. **Do not** tick "Add a README",
   ".gitignore" or "licence" — this folder already has commits, and an
   initial commit on their side would collide with yours.
3. Create repository, then run here (replace `YOUR-USERNAME`):

```bash
git remote add sspl https://github.com/YOUR-USERNAME/sspl-upvc.git
```

```bash
git push -u sspl main
```

Windows will pop up a GitHub sign-in the first time; that is Git
Credential Manager, and it is expected.

4. In the repository: **Settings → Pages → Source: Deploy from a branch
   → Branch: `main` → Folder: `/ (root)` → Save.**

## Option B — GitHub CLI

The CLI is already installed (`gh` 2.103.3, on the machine PATH, so any
new terminal has it). It is not signed in. If you would rather use it:

```bash
gh auth login --hostname github.com --git-protocol https --web
```

Answer `Y` to "Authenticate Git with your GitHub credentials?", then
paste the one-time code it prints into the browser page it opens.

Once signed in, this creates the repository and pushes in one command:

```bash
gh repo create sspl-upvc --public --source=. --remote=sspl --push
```

`--source=.` uses this folder, `--remote=sspl` adds a *new* remote rather
than overwriting the Shalni one, and `--push` sends `main` up.

Then turn Pages on:

```bash
gh api -X POST repos/:owner/sspl-upvc/pages -f "source[branch]=main" -f "source[path]=/"
```

---

## After either option

The site appears at `https://<you>.github.io/sspl-upvc/` within a minute
or two. The admin panel is at `https://<you>.github.io/sspl-upvc/admin.html`.

Check straight away:

- [ ] the SSPL logo loads in the header
- [ ] all 21 products show with their drawings
- [ ] the quotation builder adds items and the PDF downloads
- [ ] `admin.html` accepts your password

### If you set up Firebase

Add the Pages host to the allow-list or sign-in will be refused:
**Firebase Console → Authentication → Settings → Authorized domains →
Add domain → `<you>.github.io`.**

See `FIREBASE-SETUP.md` step 7.

---

## Two things worth deciding first

**1. The git history is inherited.** The first three commits of this
repository are the original Shalni Aluminium House upload, which include
that firm's logo and banner artwork. Pushing as-is publishes their files
in your public history, even though the current version no longer uses
them. If you would rather start clean:

```bash
git checkout --orphan clean-start && git add -A && git commit -m "SSPL uPVC quotation system"
```

```bash
git branch -M clean-start main
```

That leaves a single commit with only the current files. You lose the
record of what changed, which is a fair trade for a shop website.

**2. Public or private.** GitHub Pages on a free account requires a
**public** repository. Public means anyone can read the source, including
`firebase-config.js` — which is fine, those values are meant to be public
and your Firestore rules are what protect the data. It also means your
rates are readable once you set them, but they are visible from the live
site in any case. Private repositories can serve Pages only on a paid
GitHub plan.

**Never commit** a Firebase service-account JSON key, a personal access
token, or your admin password. Nothing like that is in this folder today.

---

## Custom domain (optional, later)

To serve the quotation system from something like
`quote.sanisteels.in`:

1. Create a file named `CNAME` in this folder containing just that
   hostname, and push it.
2. At your DNS provider add a `CNAME` record for `quote` pointing to
   `<you>.github.io`.
3. **Settings → Pages → Custom domain**, enter it, and tick
   **Enforce HTTPS** once the certificate is issued.
4. Add the custom domain to Firebase authorised domains too.
