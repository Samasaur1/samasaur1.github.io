---
layout: post
title: 'RssBot Bugfix 2: Unpostable Channels'
date: 2023-07-18
tags:
- python
- discord
- rss
- rssbot
---
RssBot has mostly been working really well. However, every once in a while it would just stop posting. The worst part about this is that I wouldn't _notice_ until I restarted the machine that it is on, incidentally restarting RssBot. This time, however, I caught it in the log, and I was determined to fix the issue.

I saw this in the rssbot log (`journalctl -u rssbot`):
```
Jul 06 15:32:04 blinky rssbot-start[96745]: verbose: adding to list
Jul 06 15:32:04 blinky rssbot-start[96745]: verbose: entry GPG Agent Forwarding
Jul 06 15:32:04 blinky rssbot-start[96745]: verbose: entry class <__main__.Entry object at 0x7efcd7e27400>
Jul 06 15:32:04 blinky rssbot-start[96745]: verbose: in __eq__
Jul 06 15:32:04 blinky rssbot-start[96745]: verbose: match by id: True
Jul 06 15:32:04 blinky rssbot-start[96745]: verbose: equal
Jul 06 15:32:04 blinky rssbot-start[96745]: verbose: <__main__.Entry object at 0x7efcdd0a5090>
Jul 06 15:32:04 blinky rssbot-start[96745]: verbose: 1 entries
Jul 06 15:32:04 blinky rssbot-start[96745]: New post on https://samasaur1.github.io/feed.xml: Split Tunneling with Tailscale and WireGuard on macOS (https://samasaur1.github.io/blog/split-tunneling-with-tailscale-and-wireguard-on-macos)
Jul 06 15:32:04 blinky rssbot-start[96745]: Unexpected err=AttributeError("'NoneType' object has no attribute 'typing'"), type(err)=<class 'AttributeError'>
```

I tracked this down to this bit of code:

```py
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
        verbose(f"{len(entries)} entries")
        if len(entries) == 0:
            continue
        for entry in entries:
            print(f"New post on {feed}: {entry.output()}")

        for channel_id in self.feeds[feed]:
            channel = self.get_channel(channel_id)
            async with channel.typing():
                await sleep(randrange(1, 3))
                for entry in entries:
                    await channel.send(f"New post from {feed}:\n{entry.output()}")
    except Exception as err:
        print(f"Unexpected {err=}, {type(err)=}")
        raise

self.dump_feeds_to_file()
await sleep(RSS_FETCH_INTERVAL)

self.schedule_updates()
```

([permalink on GitHub](https://github.com/Samasaur1/rssbot/blob/46288ba3eafd198342dd6c5a6fe036250da4a0c4/rssbot.py#L301C4-L331))

What I believe is going on here is that rssbot is checking the feeds, finds a new post, but then gets an error when trying to show the typing indicator in that channel. Further investigation showed that this error only occurred when rssbot was trying to post into threads that had "gone to sleep". It seems that bots cannot bring threads back to life.

I added a check as to whether the channel existed:

```py
if not channel:
    print(f"ERR: Cannot get channel <#{channel_id}> to update {feed}")
    self.notify(f"Error! Cannot get channel <#{channel_id}> to update {feed}")
    continue
```

which also notifies the person running the bot (i.e., me) via this new notify method:

```py
async def notify(self, msg: str) -> None:
    await self.get_channel(int(os.getenv('DEBUG_CHANNEL', 1080991601502986331))).send(msg)
```

I have yet to receive any messages in this channel. However, publishing this post _should_ make rssbot try to send a post in a deactivated thread, which means I will get to test this behavior.

***

Note that I did not have rssbot take any action upon discovering channels it cannot post to. This allows people to reanimate threads that have gone to sleep. I did add a prune command, which removes all channels that no longer exist.

```py
elif cmd == "prune":
    log("Request to prune")
    if message.author.id != 377776843425841153:
        await say(message, "Unauthorized user")
        return
    pruned_channels = set()
    pruned_feeds = set()
    needs_status_update = False
    for feed in self.feeds:
        for channel_id in self.feeds[feed]:
            if self.get_channel(channel_id) is None:
                self.feeds[feed].remove(channel_id)
                pruned_channels.add(channel_id)
        if len(self.feeds[feed]) == 0:
            pruned_feeds.add(feed)
            needs_status_update = True
    for feed in pruned_feeds:
        del self.feeds[feed]
    verbose(f"Pruned [{', '.join((str(x) for x in pruned_channels))}]")
    if needs_status_update:
        verbose(f"...which pruned [{', '.join(pruned_feeds)}]")
    pc = f"{len(pruned_channels)} channel{'s' if len(pruned_channels) != 1 else ''}"
    pf = f", {len(pruned_feeds)} feed{'s' if len(pruned_feeds) != 1 else ''}" if needs_status_update else ""
    await say(message, f"Pruned {pc}{pf}")
```
