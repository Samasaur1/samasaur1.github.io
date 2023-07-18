---
layout: post
title: 'RssBot Bugfix 1: Reposting on Restart'
date: 2023-03-16
last_updated: 2023-07-18
tags:
- python
- discord
- rss
- rssbot
---
I published [my post on RssBot]({% post_url 2023-03-09-building-a-discord-rss-bot %}) two days ago. It worked successfully on that post — huzzah! — and everything else appeared to be working as well. However, when I stopped RssBot, moved it to a different directory on the server, and restarted it, it sent the post again.

I actually saw this error a couple of days ago, but didn't have a chance to investigate immediately. That investigation took the form of running <kbd>export VERBOSE=1</kbd>, and then running RssBot again. The verbose logs showed that feeds were registering as having a new `etag` and last modified time, and most importantly, **that their previous entry was one entry behind**[^1].

Since the error was only happening after a restart, and only happening once per restart, I was fairly certain that the issue was with the dumpfiles — the files that store which feeds are being watched in which channels and the most recent post for each of these feeds between restarts — and my suspicion fell on the `dump_feeds_to_file()` function. Here's the source code for that function:

```python
def dump_feeds_to_file(self):
    print("Updating dump files")
    with open("feeds.json", "w") as file:
        json.dump(self.feeds, file, default=lambda o: o.__dict__, sort_keys=True, indent=4)
    with open("feeddata.json", "w") as file:
        json.dump(self.feed_data, file, default=lambda o: o.__dict__, sort_keys=True, indent=4)
```

That function is pretty straightforward, however, and there don't appear to be any bugs in it. So I looked at where it was being called. `dump_feeds_to_file()` was only called in three places:

1. After an existing feed is added to a new channel
2. After a new feed is added to a channel
3. After a feed is removed from the last channel it is being watched in, and is therefore removed entirely.

These _are_ all places that the dumpfiles need to be written. However, they're not the _only_ places. Looking at that list again now as I'm writing this blog post, it seems as if these places are the places where it would be necessary to write the `feeds.json` file, but not necessarily the `feeddata.json` file.

This oversight — writing the dumpfiles to disk only when a feed was added or removed — meant that entries could be repeated under the following circumstances:

1. The feed is configured to post to at least one channel. Other feeds can also be configured, but our target feed must be.
2. When the feed is added, the dumpfiles are saved to disk (existing behavior)
3. There is a new entry in the feed, which is sent to the channel.
4. RssBot stops (e.g., to be updated) before the dumpfiles are written again (i.e., no feeds are added or removed)
5. RssBot is restarted
6. The entry is sent to the channel again

To fix this problem, I simply added another `dump_feeds_to_file()` call in the async task, right after the feeds have been fetched. This isn't optimal efficiency-wise, because it writes no matter whether there were new entries every five minutes, but performance is not my main goal here. And this change did actually solve the problem!

[^1]: As I'll go on to explain, the fact that it was one entry behind was specific to my circumstances, but the important part was that the previous entry could lag behind the most recent entry that had been sent to Discord.
