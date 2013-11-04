# Build a release

_These are notes for Recurly employes to create new releases_

0. Change the version in the [version](/version) file.
1. Update [changelog.md](./changelog.md) based on commits. Be sure to give
   credit to the contributors by including a link to their GitHub profile. You
   might like to use [git changelog](https://github.com/visionmedia/git-extras).
2. Execute `make release`
3. `git add` the updated files
4. `git commit -m 'release x.x.x'`
5. `git tag x.x.x`
6. `git push origin master --tags`
7. Announce on https://groups.google.com/forum/#!forum/recurly-api
8. Announce in the #recurly room on Freenode
9. Tweet it from @recurly
