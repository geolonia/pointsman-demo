# Contributing

Issues and pull requests are welcome. The issues labelled `demo` are the
demo's review queue: they are opened and closed by the demo itself.

1. Set up as in the [README](README.md#development), then make your change with
   tests. Keep pull requests small.
2. Run `pnpm check`. It must pass.
3. Sign off every commit with `git commit -s` and open a pull request.

This is a public repository: no secrets, account ids or resource ids.

## Sign-off (DCO)

`Signed-off-by: Name <email>` in a commit states that you agree to the
[Developer Certificate of Origin](https://developercertificate.org/): you wrote
the change or have the right to submit it, and it may be published under this
repository's license (MIT). The [DCO app](https://github.com/apps/dco) checks
every commit of a pull request (except bots and merge commits).

Forgot it: `git rebase --signoff origin/main`, then `git push --force-with-lease`.
If you would rather not rewrite history, add one follow-up commit whose message
signs off each earlier commit, in the form the DCO app expects (its check
details show the exact text):

```
I, Your Name <you@example.com>, hereby add my Signed-off-by to this commit: <sha of the commit>

Signed-off-by: Your Name <you@example.com>
```
