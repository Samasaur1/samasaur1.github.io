---
layout: post
title: 'RssBot Bugfix 3: Entries Without Statuses'
date: 2023-07-19 10:43 -0700
tags:
- rssbot
- python
- discord
- rss
---
Even after [I fixed the bug I was seeing with RssBot]({% post_url 2023-07-18-rssbot-bugfix-2-unpostable-channels %}), I continued to see errors. Diving into the log again, I saw the following error:

```
Unexpected err=AttributeError("object has no attribute 'status'"), type(err)=<class 'AttributeError'>
```

which I narrowed down to [this line](https://github.com/Samasaur1/rssbot/blob/cc21b0699b8248c676f0244532863e103ff4cd85/rssbot.py#L86):

```py
if d.status == 304:
```

Showing that in context:

```py
def new_entries(self):
    verbose("in new_entries")
    if self.previous_entry:
        verbose(f"previous entry {self.previous_entry.title}")
    else:
        verbose("no prev entry")
    if self.etag or self.modified:
        verbose("etag/modified")
        d = feedparser.parse(self.url, etag=self.etag, modified=self.modified)
        # if self.etag:
        #     d = feedparser.parse(self.url, etag=self.etag)
        # else:
        #     d = feedparser.parse(self.url, modified=self.modified)
        if d.status == 304:
            verbose("status 304")
            return []
    else:
        verbose("parsing normally")
        d = feedparser.parse(self.url)


    verbose("d has been parsed")
    if "etag" in d:
        if d.etag != self.etag:
            verbose("new etag")
            self.etag = d.etag
    if "modified" in d:
        if d.modified != self.modified:
            verbose("new modified")
            self.modified = d.modified


    new_entries = []
    for _entry in d.entries:
        verbose(f"entry {_entry.get('title', _entry.get('link', '???'))}")
        entry = Entry(_entry)
        verbose(f"entry class {entry}")
        if entry == self.previous_entry:
            verbose("equal")
            break
        verbose("adding to list")
        new_entries.append(entry)


    if len(new_entries) == 0:
        return []


    self.previous_entry = new_entries[0]
    verbose(self.previous_entry)
    return new_entries
```

According to [the documentation](https://feedparser.readthedocs.io/en/latest/reference-status.html):

<!-- > [!info] -->
> `status` will only be present if the feed was retrieved from a web server. If the feed was parsed from a local file or from a string in memory, `status` will not be present.

I have _no idea_ why this would be happening, because rssbot has only been used with feeds from web servers. Regardless, I have made the following change:

```diff
commit a8f007af5e709811b7561eebe865370f7aa2a411
Author: Sam <30577766+Samasaur1@users.noreply.github.com>
Date:   Tue Jul 18 14:17:44 2023 -0700

    Log more information when there is no status
    
    According to the documentation
    (https://feedparser.readthedocs.io/en/latest/reference-status.html),
    this should only happen when the feed is not retrieved from a web
    server, but I have no idea when that would be. _Maybe_ caching?

diff --git a/rssbot.py b/rssbot.py
index ca021b9..1db5da6 100644
--- a/rssbot.py
+++ b/rssbot.py
@@ -83,6 +83,13 @@ class FeedData:
             #     d = feedparser.parse(self.url, etag=self.etag)
             # else:
             #     d = feedparser.parse(self.url, modified=self.modified)
+            if not hasattr(d, "status"):
+                print("ERR: no status attribute")
+                print(self.url)
+                print(self.previous_entry)
+                print(self.etag)
+                print(self.modified)
+                print(d)
             if d.status == 304:
                 verbose("status 304")
                 return []
```

and we'll see what conditions cause this error.

***

I got a notification, checked the log, and saw this:

```
Jul 19 00:16:23 blinky rssbot-start[3078]: verbose: in new_entries
Jul 19 00:16:23 blinky rssbot-start[3078]: verbose: previous entry InternetUnexplorer created a branch auto-update/flake-inputs in InternetUnexplorer/nixpkgs-overlay
Jul 19 00:16:23 blinky rssbot-start[3078]: verbose: etag/modified
Jul 19 00:16:23 blinky rssbot-start[3078]: ERR: no status attribute
Jul 19 00:16:23 blinky rssbot-start[3078]: https://github.com/InternetUnexplorer.atom
Jul 19 00:16:23 blinky rssbot-start[3078]: <__main__.Entry object at 0x7fdf6d25bbb0>
Jul 19 00:16:23 blinky rssbot-start[3078]: W/"16c112a4d92fa61607ac7ebc0e015cfe"
Jul 19 00:16:23 blinky rssbot-start[3078]: None
Jul 19 00:16:23 blinky rssbot-start[3078]: {'bozo': True, 'entries': [], 'feed': {}, 'headers': {}, 'bozo_exception': URLError(gaierror(-2, 'Name or service not known'))}
Jul 19 00:16:23 blinky rssbot-start[3078]: Unexpected err=AttributeError("object has no attribute 'status'"), type(err)=<class 'AttributeError'>
```

The `URLError(gaierror(-2, 'Name or service not known'))` is what is returned from a socket when DNS fails, or when the connection is down temporarily. To the best of my knowledge, the solution here is simply to wait and retry the request.

Rather than delay and retry the request in this function, which would slow down the parsing of all feeds, I will simply log that the feed is unreachable and then return no new entries, which will ensure that rssbot does not miss any entries in the feed, and it will check again the next time that it checks its feeds.

However, I also want to be notified when this happens. So rather than simply returning an empty list, I decided to return `None` and handle that case when the feeds are checked:

```diff
diff --git a/rssbot.py b/rssbot.py
index 1db5da6..c97538c 100644
--- a/rssbot.py
+++ b/rssbot.py
@@ -83,20 +83,21 @@ class FeedData:
             #     d = feedparser.parse(self.url, etag=self.etag)
             # else:
             #     d = feedparser.parse(self.url, modified=self.modified)
             if not hasattr(d, "status"):
                 print("ERR: no status attribute")
                 print(self.url)
                 print(self.previous_entry)
                 print(self.etag)
                 print(self.modified)
                 print(d)
+                return None
             if d.status == 304:
                 verbose("status 304")
                 return []
         else:
             verbose("parsing normally")
             d = feedparser.parse(self.url)
 
         verbose("d has been parsed")
         if "etag" in d:
             if d.etag != self.etag:
@@ -336,20 +337,23 @@ Channels with feeds: {', '.join(map(desc, [item for sublist in self.feeds.values
             verbose("Checking feeds...")
             for feed in self.feeds:
                 verbose(f"...{feed}")
                 try:
                     if feed not in self.feed_data:
                         verbose("(first time checking; marking all posts as read)")
                         self.feed_data[feed] = FeedData(feed)
                         self.feed_data[feed].new_entries()
                         # Assume that newly-added blogs have had all their posts read already
                     entries = self.feed_data[feed].new_entries()
+                    if entries is None:
+                        await self.notify(f"Error! Feed {feed} could not be reached!")
+                        continue
                     verbose(f"{len(entries)} entries")
                     if len(entries) == 0:
                         continue
                     for entry in entries:
                         print(f"New post on {feed}: {entry.output()}")
 
                     for channel_id in self.feeds[feed]:
                         channel = self.get_channel(channel_id)
                         if not channel:
                             # Consider automatically removing this channel?
```

I'll watch for these notifications to see if there's a pattern, but if it does turn out to just be intermittent internet connection issues, I may remove the logging and simply have the method return no new articles.
