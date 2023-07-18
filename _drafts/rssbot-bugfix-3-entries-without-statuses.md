---
layout: post
title: 'RssBot Bugfix 3: Entries Without Statuses'
# date: 0
tags:
- rssbot
- python
- discord
- rss
- draft
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
