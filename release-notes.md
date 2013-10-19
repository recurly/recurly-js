
To build a release:

0) change the version in the [version](/version) file.
1) update [changelog.md](./changelog.md) based on commits. be sure to give credit to the contributors by including a link to their github profile. you might like to use [git changelog](https://github.com/visionmedia/git-extras).
2) make release
3) git add the updated files
4) git commit -m 'release x.x.x'
5) git tag x.x.x
6) git push origin master --tags
7) announce on https://groups.google.com/forum/#!forum/recurly-api
8) announce in the #recurly room on freenode
8) tweet it from @recurly
