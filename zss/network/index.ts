/*

network is all about message scoping ??

going to have different network transport methods ??

1. do we need a p2p network ? what does that get us ?
   can we do larger multi-user experiences ?

2. we want to find other people to connect with [ids]

3. we want to run a server in our browser and run a page with a UI for the server

4. we want to share content we have created

5. we want to share a game we are running

6. we want to have a simple friend list

7. we want to be able to send messages

8. we want to make a "homepage"

side-note:
  there is no global cache of packages, you simply collect read only keys to your friends packages
  which presist even if they're offline

network addressing is like a folder structure 
  a folder can also have tags

  you can send messages up the folder structure by name
  /peer-id/session-id-1/holding/groups/group-id-1 is running code

  /peer-id/session-id-2/holding/groups/group-id-1 is running code
  sends a message to #holding:stop group-id-1

  /peer-id/session-id-3/holding/groups/group-id-1 is running code

  do we care about all or others here ???

*/
