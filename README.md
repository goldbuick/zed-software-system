# zed software system 
A zzt-inspired web based software framework

## brain dump kanban
https://trello.com/invite/b/fCgw9JWS/ATTI5dd28eb3e32cffabffe26939fbe1ed64B421F81F/zss

## versioning workflow

https://github.com/phips28/gh-action-bump-version/tree/master?tab=readme-ov-file#workflow

* Based on the commit messages, increment the version from the latest release.
  * If the string "BREAKING CHANGE", "major" or the Attention pattern `refactor!: drop support for Node 6` is found anywhere in any of the commit messages or descriptions the major
    version will be incremented.
  * If a commit message begins with the string "feat" or includes "minor" then the minor version will be increased. This works
    for most common commit metadata for feature additions: `"feat: new API"` and `"feature: new API"`.
  * If a commit message contains the word "pre-alpha" or "pre-beta" or "pre-rc" then the pre-release version will be increased (for example specifying pre-alpha: 1.6.0-alpha.1 -> 1.6.0-alpha.2 or, specifying pre-beta: 1.6.0-alpha.1 -> 1.6.0-beta.0)
  * All other changes will increment the patch version.
* Push the bumped npm version in package.json back into the repo.
* Push a tag for the new version back into the repo.

## notes for later

for when I want to go crazy for speed
https://romgrk.com/posts/optimizing-javascript

  #play r4i3-a0+e0b0a5exaxgxexax+cx-bxgxaxex+cxz4-gx-dxax+dxexgxf#xdxaxgxexdxf#xd0dac

  #play r6cxxaxxfxx+fxx6xx6xx

  #play r4i3-a7+e4bxa7e4axg7e4ax+c7-b4gxa7e4+cxz4-g7-d4ax+d7e4gxf#7d4axg7e4dxf#7d4dac
