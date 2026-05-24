# Opaque Boundaries

> **Status:** implemented. Live as `zss/memory/boundaries.ts` (the keyed slice store) and `zss/memory/boundaryrouting.ts` (`memorycollectboundaryidsforboard`). The boardrunner worker ([`zss/device/boardrunner.ts`](zss/device/boardrunner.ts) entry, [`zss/device/boardrunner/`](zss/device/boardrunner/) modules) and the sim VM (`zss/device/vm/boardrunnermemorysync.ts`, `zss/device/vm/boardrunnerboundarysync.ts`) ship them through `jsonpipe` (see `zss/feature/jsonpipe/README.md`).

What is an opaque boundary?
a way to isolate parts of a nested tree for more concise diffing 

1. We have a top-level key => value map.
2. We start with 'root' => value 
3. All other entries __should__ be a guid 

So the idea is that when we get down to book.pages
instead of pages being an array of objects. it's an array of guids
such that we look at the given guid entry to continue to the tree

So that is how it works, its slicing up the tree and the guids
show you how to read it as a single tree

The intent here is to remove the overlap when trying to diff 
the nested tree at different levels.

We do want to jsonpipe the root memory doc.
BUT we do not have to include codedpage data in said diff

We also want to have the mainbook flags key => value
be key => opaque boundry key

opaque boundry key => flags{} value 

opaque boundry ids also double as jsonpipe stream ids


