---
layout: post
title: 'Building a Discord RSS Bot'
date: 2023-03-09 22:40 -0800
last_updated: 2026-02-15 20:14 -0800
tags:
- python
- discord
- rss
---
In one of the Discord servers I'm in, there's a channel for people to post links to their blogs, so we can all read them. My blog has an RSS feed, so one can subscribe to it using an RSS reader application (I use NetNewsWire) to get updates without having to check the site. However, I figured it'd be nice to have a bot that posts blog updates in a channel, rather than making everyone set up an RSS reader.

My first thought was to look for existing Discord RSS bots — don't reinvent the wheel and all that — but the only one with free unlimited feeds, MonitoRSS, didn't seem to be listening to me when I tried to add feeds with it. Turns out they have disabled all interaction with the bot via Discord, and you have to set up feeds in the web control panel. However, this didn't give me an option to post blog updates in a thread, so it was a bust. I resolved to write my own bot.

My friend had written [oobot](https://github.com/reed-cs-and-friends/oobot), which is in the server I wanted to add an RSS bot to, and since the last time I wrote a Discord bot was so long ago that when I tried to run it, it just _didn't_, I figured I'd build off of oobot. Here's the entire source code for oobot, at the time that I wrote my bot:

```python
from asyncio import create_task, sleep
from os import environ
from random import randrange
from typing import List, Optional

from discord import Client, DMChannel, Game, Intents, Message, Status, TextChannel


def verbose(*args) -> None:
    """Print the specified args only if $VERBOSE is set."""

    if "VERBOSE" in environ.keys():
        print("verbose:", *args)


class OobClient(Client):
    # These delay values control the delay for scheduled oobs.
    DELAY_MIN = 1  # 1 second
    DELAY_MAX = 72 * 60 * 60  # 72 hours
    DELAY_POW = 0.9  # delay = delay ^ 0.9

    def __init__(self, channel_ids: List[int], **options) -> None:
        super().__init__(intents=Intents(guilds=True, messages=True), **options)
        self.scheduled_oobs = {
            channel_id: {"delay_secs": self.DELAY_MAX, "delay_task": None}
            for channel_id in channel_ids
        }

    async def oob(self, channel: TextChannel, message: Optional[Message]) -> None:
        """Send an oob, optionally as a reply to a message."""

        # Get a human-friendly description of the channel.
        channel_desc = (
            "a DM"
            if isinstance(channel, DMChannel)
            else f"#{channel.name} in {channel.guild.name}"
        )

        if message:
            verbose(f"replying to {message.author} in {channel_desc}")
        else:
            verbose(f"sending a scheduled oob to {channel_desc}")

        # Send the message, spending a random amount of time "typing" to make
        # things a little more fun :).
        async with channel.typing():
            await sleep(randrange(1, 5))
            if message:
                await message.reply("oob")
            else:
                await channel.send("oob")

    def schedule_oob(self, channel_id: int) -> None:
        """Schedule an oob to be sent in the future.

        This will replace any existing scheduled oob for this channel. The delay
        will be in the range of [0.5 * self.delay_secs, self.delay_secs)."""

        channel = self.get_channel(channel_id)
        channel_desc = f"#{channel.name} in {channel.guild.name}"

        delay_task = self.scheduled_oobs[channel_id]["delay_task"]
        delay_secs = self.scheduled_oobs[channel_id]["delay_secs"]

        # If there is already an oob scheduled, cancel it.
        if delay_task:
            verbose(f"cancelling existing delay task '{delay_task.get_name()}'")
            delay_task.cancel()

        # Randomize the delay based on self.delay_secs.
        delay_secs = max(self.DELAY_MIN, int(randrange(delay_secs // 2, delay_secs)))

        # Create a task that waits delay seconds before calling oob().
        async def task():
            await sleep(delay_secs)

            # While unlikely, it is possible that schedule_oob() could be called
            # while the current task is in the middle of running oob() (since
            # it has a small delay to simulate typing). Running oob() in a new
            # task should prevent this.
            create_task(self.oob(channel, None))

            # Reset the delay to the maximum and start a new delay task.
            # Restarting the task ensures that the bot will eventually send an
            # oob again even if no one else sends one.
            self.scheduled_oobs[channel_id]["delay_secs"] = self.DELAY_MAX
            self.schedule_oob(channel_id)

        delay_task = create_task(task(), name=f"oob_delay_fn.{channel_id}.{delay_secs}")
        self.scheduled_oobs[channel_id]["delay_task"] = delay_task
        verbose(f"started new delay task '{delay_task.get_name()}'")

        m, s = divmod(delay_secs, 60)
        h, m = divmod(m, 60)
        d, h = divmod(h, 24)
        verbose(
            f"next oob in {channel_desc} will be in {delay_secs}s",
            f"({d}d {h}h {m}m {s}s)",
        )

    async def on_ready(self) -> None:
        """Called when the bot is ready to start."""

        print(f"logged in as {self.user}!")
        await self.change_presence(status=Status.idle, activity=Game("oob"))
        for channel_id in self.scheduled_oobs.keys():
            self.schedule_oob(channel_id)

    async def on_message(self, message: Message) -> None:
        """Called when a message is sent."""

        # Never respond to our own messages.
        if message.author == self.user:
            return

        # Respond immediately if the message is a DM or mentions us.
        if isinstance(message.channel, DMChannel) or self.user.mentioned_in(message):
            await self.oob(message.channel, message)
            return

        # Otherwise, handle the message if it is in $DISCORD_CHANNEL.
        if message.channel.id in self.scheduled_oobs.keys():
            # Reduce the delay by DELAY_POW and start a new delayed oob task.
            self.scheduled_oobs[message.channel.id]["delay_secs"] = int(
                self.scheduled_oobs[message.channel.id]["delay_secs"] ** self.DELAY_POW
            )
            self.schedule_oob(message.channel.id)


if __name__ == "__main__":
    token = environ["DISCORD_TOKEN"]
    channels = [
        int(channel_str.strip())
        for channel_str in environ["DISCORD_CHANNELS"].split(",")
    ]
    print(f"loaded configuration from environment:")
    print(f"     DISCORD_TOKEN=***")
    print(f"  DISCORD_CHANNELS={','.join(map(str, channels))}")
    print("connecting to Discord...")
    OobClient(channels).run(token)
```

I took this oobot code and reworked it so that it would have a list of RSS feeds that it should check. I wrote all the code for handling the feeds and which channels they were being watched in before I touched actually fetching the feeds at all. So the first version looked something like this[^1]:

```python
from os import environ
from random import randrange
from typing import List, Optional, Dict

from discord import Client, Intents, Message, Status, ActivityType, Activity, TextChannel


def verbose(*args) -> None:
    """Print the specified args only if $VERBOSE is set."""

    if "VERBOSE" in environ.keys():
        print("verbose:", *args)

async def say(message: Message, msg: str, maxrange: int = 3) -> None:
    async with message.channel.typing():
        await sleep(randrange(1, maxrange))
        await message.reply(msg)


class RssBot(Client):
    def __init__(self, channel_id: int, feeds: List[str], **options) -> None:
        super().__init__(intents=Intents(guilds=True, messages=True), **options)
        self.feeds = {feed: [channel_id] for feed in feeds}

    async def update_status(self) -> None:
        feed_count = len(self.feeds)
        fstr = "1 feed" if feed_count == 1 else f"{feed_count} feeds"
        await self.change_presence(status=Status.idle, activity=Activity(name=fstr, type=ActivityType.watching))


    async def on_ready(self) -> None:
        """Called when the bot is ready to start."""

        print(f"logged in as {self.user}!")

        await self.update_status()

        await self.get_channel(1080991601502986331).send("Now running")

    async def on_message(self, message: Message) -> None:
        """Called when a message is sent."""

        # Never respond to our own messages.
        if message.author == self.user:
            return

        if message.author.id != 377776843425841153:
            print(f"Request from {message.author} ({message.author.id})")
            await say(message, "Unauthorized user")
            return

        if self.user.mentioned_in(message):
            msg = message.content.split(">", maxsplit=1)[1].strip(" ")
            _msg = msg.split(" ", maxsplit=1)
            cmd = _msg[0]
            if cmd == "add":
                url = _msg[1]
                print(f"Request to add '{url}' to #{message.channel.name} ({message.channel.id}) from {message.author}")
                if url in self.feeds:
                    if message.channel.id in self.feeds[url]:
                        await say(message, f"Already watching {url} in this channel")
                    else:
                        self.feeds[url].append(message.channel.id)
                        await say(message, f"Now watching {url} in this channel")
                else:
                    #TODO: check if URL
                    if True:
                        self.feeds[url] = [message.channel.id]
                        await self.update_status()
                        await say(message, f"Now watching {url} in this channel")
                    else:
                        await say(message, f"Not a valid URL")
            elif cmd == "remove":
                url = _msg[1]
                print(f"Request to remove '{url}' from #{message.channel.name} ({message.channel.id}) from {message.author}")
                if url in self.feeds and message.channel.id in self.feeds[url]:
                    self.feeds[url].remove(message.channel.id)
                    print("Found")
                    if len(self.feeds[url]) == 0:
                        del self.feeds[url]
                        print("Was last url for feed, so feed is removed")
                        await self.update_status()
                    await say(message, f"Removed {url} from the feeds for this channel")
                else:
                    await say(message, f"Could not find {url} in the feeds for this channel")
                    print("Not found")
            elif cmd == "list":
                print(f"Request to list feeds in #{message.channel.name} ({message.channel.id}) from {message.author}")
                feeds_in_channel = []
                for feed in self.feeds:
                    if message.channel.id in self.feeds[feed]:
                        feeds_in_channel.append(feed)
                if len(feeds_in_channel) == 0:
                    await say(message, "No feeds in this channel")
                    return
                fstr = "\n".join(feeds_in_channel)
                await say(message, f"""
**Feeds in this channel**:
{fstr}
""", 5)
            elif cmd == "help":
                print(f"Request for help in #{message.channel.name} ({message.channel.id}) from {message.author}")
                await say(message, """
To add a feed, try "<@1080989856248893521> add https://samasaur1.github.io/feed.xml"
To remove a feed, try "<@1080989856248893521> remove https://samasaur1.github.io/feed.xml"
To list all feeds in this channel, try "<@1080989856248893521> list"
""", 5)
            else:
                print(f"Unknown command in #{message.channel.name} ({message.channel.id}) from {message.author}")
                await say(message, "Unknown command (try \"<@1080989856248893521> help\")")


if __name__ == "__main__":
    token = environ["DISCORD_TOKEN"]
    print(f"loaded configuration from environment:")
    print(f"     DISCORD_TOKEN=***")
    print("connecting to Discord...")
    RssBot(1080991601502986331, []).run(token)
```

To use it, you would <kbd>@RssBot add https://samasaur1.github.io/feed.xml</kbd>, you could <kbd>@RssBot list</kbd> the feeds watched in the current channel, and you could <kbd>@RssBot remove</kbd> a feed from being watched in the current channel.

Notice that this code doesn't verify that added feeds are in fact URLs, and because of that, I decided that it would check every message to make sure it was sent by me, trusting myself to not try and break it. You may also notice that that code has a bug in it, which is that it checks for authorized users before it checks whether RssBot was tagged ... so it replied to _every_ message from anyone but me with "Unauthorized user", not just the ones it was tagged in.

But before I even knew about that bug, I had already written the code to actually perform the RSS fetches. Here are the new parts:

```python
import hashlib
import urllib.request
from asyncio import sleep, create_task
from os import environ
from random import randrange
from typing import List, Optional, Dict

import feedparser
from discord import Client, Intents, Message, Status, ActivityType, Activity, TextChannel

class Entry:
    def __init__(self, entry):
        self.id = entry.get("id", None)
        self.link = entry.get("link", None)
        self.title = entry.get("title", None)
        self.summary_hash = hashlib.md5(entry["summary"].encode()).hexdigest() if "summary" in entry else None
        self.content_hash = hashlib.md5(entry["content"][0].value.encode()).hexdigest() if "content" in entry else None

    def __eq__(self, other):
        print("in __eq__")
        if not other:
            return False
        if self.id and other.id:
            print(f"match by id: {self.id == other.id}")
            return self.id == other.id
        if self.link and other.link:
            print(f"match by link: {self.link == other.link}")
            return self.link == other.link
        if self.title and other.title:
            print(f"match by title: {self.title == other.title}")
            return self.title == other.title
        if self.summary_hash and other.summary_hash:
            print(f"match by s_h: {self.summary_hash == other.summary_hash}")
            return self.summary_hash == other.summary_hash
        print(f"match by c_h: {self.content_hash == other.content_hash}")
        return self.content_hash == other.content_hash

    def output(self):
        if self.title and self.link:
            return f"{self.title} ({self.link})"
        elif self.link:
            return self.link
        return "a post"


class FeedData:
    def __init__(self, url: str):
        self.url: str = url
        self.etag: Optional[str] = None
        self.modified: Optional[str] = None
        self.previous_entry: Optional[Entry] = None #The most recent "nwewst entry" — e.g., entries[0] from the last time we fetched the feed

    def new_entries(self):
        print("in new_entries")
        if self.previous_entry:
            print(f"previous entry {self.previous_entry.title}")
        else:
            print("no prev entry")
        if self.etag or self.modified:
            print("etag/modified")
            d = feedparser.parse(self.url, etag=self.etag, modified=self.modified)
            # if self.etag:
            #     d = feedparser.parse(self.url, etag=self.etag)
            # else:
            #     d = feedparser.parse(self.url, modified=self.modified)
            if d.status == 304:
                print("status 304")
                return []
        else:
            print("parsing normally")
            d = feedparser.parse(self.url)

        print("d has been parsed")
        if "etag" in d:
            if d.etag != self.etag:
                print("new etag")
                self.etag = d.etag
        if "modified" in d:
            if d.modified != self.modified:
                print("new modified")
                self.modified = d.modified

        new_entries = []
        for _entry in d.entries:
            print(f"entry {_entry.get('title', _entry.get('link', '???'))}")
            entry = Entry(_entry)
            print(f"entry class {entry}")
            if entry == self.previous_entry:
                print("equal")
                break
            print("adding to list")
            new_entries.append(entry)

        if len(new_entries) == 0:
            return []

        self.previous_entry = new_entries[0]
        print(self.previous_entry)
        return new_entries

class RssBot(Client):
    def __init__(self, channel_id: int, feeds: List[str], **options) -> None:
        super().__init__(intents=Intents(guilds=True, messages=True), **options)
        self.feeds = {feed: [channel_id] for feed in feeds}
        self.feed_data: Dict[str, FeedData] = {feed: FeedData(feed) for feed in feeds}
        self.task = None

    async def update_status(self) -> None:
        feed_count = len(self.feeds)
        fstr = "1 feed" if feed_count == 1 else f"{feed_count} feeds"
        await self.change_presence(status=Status.idle, activity=Activity(name=fstr, type=ActivityType.watching))

        self.schedule_updates()

    def schedule_updates(self) -> None:
        async def task():
            # await sleep(15)

            await self.change_presence(status=Status.online)
            for feed in self.feeds:
                try:
                    if feed not in self.feed_data:
                        self.feed_data[feed] = FeedData(feed)
                        self.feed_data[feed].new_entries()
                        continue # Assume that newly-added blogs have had all their posts read already
                    entries = self.feed_data[feed].new_entries()
                    print(len(entries))
                    print([e.title for e in entries])

                    for channel_id in self.feeds[feed]:
                        channel = self.get_channel(channel_id)
                        async with channel.typing():
                            await sleep(randrange(1, 3))
                            for entry in entries:
                                await channel.send(f"New post from {feed}:\n{entry.output()}")
                except Exception as err:
                    print(f"Unexpected {err=}, {type(err)=}")
                    raise

            # await sleep(5 * 60) #5 minutes
            await sleep(45) #5 minutes

            self.schedule_updates()

            # While unlikely, it is possible that schedule_oob() could be called
            # while the current task is in the middle of running oob() (since
            # it has a small delay to simulate typing). Running oob() in a new
            # task should prevent this.
            # create_task(self.oob(channel, None))

            # Reset the delay to the maximum and start a new delay task.
            # Restarting the task ensures that the bot will eventually send an
            # oob again even if no one else sends one.
            # self.scheduled_oobs[channel_id]["delay_secs"] = self.DELAY_MAX
            # self.schedule_oob(channel_id)

        if self.task:
            print("Canceling task")
            self.task.cancel()

        delay_task = create_task(task(), name="rssbot.update")
        self.task = delay_task
```

Important things to note: `update_status()` now calls `schedule_updates()`, which means that any time a feed is added or removed, the feeds are re-fetched.

Next, let's look at the `schedule_updates()` method. First, it creates a task that:

1. Sets the status to online
2. For each feed
    1. If the feed has never been fetched before, fetch all the current posts, mark them as fetched, and go to the next feed
    2. Fetch new entries
    3. For every channel watching this feed:
        1. Send a message for every new entry in this feed to this channel
3. Waits for 45 seconds (although there's a commented-out line here that waits for 5 minutes)
4. Calls `schedule_updates()` again

However, the task is _not_ immediately called. First, we check if there is a currently running task, and cancel it if so. Then we run the task we have created.

Also of note are the `FeedData` and `Entry` classes. The `FeedData` class is designed to keep tracke of the last fetch of a feed, so that entries are not repeated. It therefore stores the URL of the feed, the `etag` and last modified date (both of which HTTP uses to not send information more than once), and the most recent previous entry. It is the class that actually does the fetching and parsing of RSS feeds, returning new entries.

The `Entry` class represents one entry in a feed, used to determine whether entries are the same or different. The only reason that this class is necessary is because entries in a feed are essentially not guaranteed to have any field. Ideally they have a post ID, or at least a title, but they don't necessarily have either of those. In that case, I first compare the post title (if it exists), then I compare the hash of the summary (if it exists for both posts), then the hash of the content. If they have no matching fields, then we just assume that they are different. It also handles formatting outputting the entry it represents.

Changes from this initial version of RssBot to the version that's currently running[^2]:

```python
class FeedData:
    @classmethod
    def from_dict(cls, **kwargs):
        self = cls(kwargs['url'])
        self.etag = kwargs['etag']
        self.modified = kwargs['modified']
        self.previous_entry = Entry(kwargs['previous_entry'])
        return self

class RssBot(Client):
    def __init__(self, feeds: Dict[str, List[int]], feed_data: Dict[str, FeedData], **options) -> None:
        super().__init__(intents=Intents(guilds=True, messages=True), **options)
        self.feeds: Dict[str, List[int]] = feeds
        self.feed_data: Dict[str, FeedData] = feed_data

    def dump_feeds_to_file(self):
        print("Updating dump files")
        with open("feeds.json", "w") as file:
            json.dump(self.feeds, file, default=lambda o: o.__dict__, sort_keys=True, indent=4)
        with open("feeddata.json", "w") as file:
            json.dump(self.feed_data, file, default=lambda o: o.__dict__, sort_keys=True, indent=4)

if __name__ == "__main__":
    token = environ["DISCORD_TOKEN"]
    print("loaded configuration from environment...")
    print("searching for feed files in working directory")
    try:
        with open("feeds.json", "r") as file:
            feeds = json.load(file)
            print("...loaded feeds")
    except:
        print("...feeds not found")
        feeds = {}
    try:
        with open("feeddata.json", "r") as file:
            feed_data = json.load(file)
            print("...loaded feed data")
    except:
        print("...feed data not found")
        feed_data = {}
    feed_data = {feed: FeedData.from_dict(**feed_data[feed]) for feed in feed_data.keys()}
    print("connecting to Discord...")
    RssBot(feeds, feed_data).run(token)
```
These changes store the feeds and the channels they're configured to output to, along with the most recent post from these feeds (and their latest modification dates). That way, when the bot restarts, it remembers which channels it's been configured in, and doesn't re-fetch if unnecessary.

Assorted other changes:
```python
async def update_status(self) -> None:
        feed_count = len(self.feeds)
        stat = Status.idle if feed_count == 0 else Status.online
        fstr = "1 feed" if feed_count == 1 else f"{feed_count} feeds"
        await self.change_presence(status=stat, activity=Activity(name=fstr, type=ActivityType.watching))
```
The bot is now online if and only if it is watching any feeds; otherwise it is idle.

```python
if message.author.id != 377776843425841153:
            print(f"Request from {message.author} ({message.author.id})")
            await say(message, "Unauthorized user")
            return
```
This bit above was removed, so that everyone can interact with the bot. At the same time, we validated URLs like so:
```python
if validators.url(url):
    self.feeds[url] = [message.channel.id]
    print("Now watching feed (new feed)")
    self.dump_feeds_to_file()
    await self.update_status()
    await say(message, f"Now watching {url} in this channel")
else:
    print("Invalid URL")
    await say(message, f"Not a valid URL")
```

I also added some admin commands that only I can run, and set the delay to 5 minutes.

***

At the moment, RssBot is running in a `screen` on one of my NixOS servers. If I manage to get it set up properly as a NixOS service, I'll probably write a blog post on that as well.

Furthermore, this post is going to be the first test of this bot on an actual blog, so let's really hope it works!

[^1]: I don't actually have any version of RssBot before it could actually check RSS feeds, so this is a reconstruction from the first commit in my Git repo.
[^2]: I've snipped and clipped the other changes. To actually see the code as it was when I wrote this article, [check out the GitHub](https://github.com/Samasaur1/rssbot/blob/784c3cd3a9d1c297b657edb3628aa2678a8dfc1c/main.py). Or [look at the latest version](https://github.com/Samasaur1/rssbot/blob/main/main.py), in case I've updated it more.
