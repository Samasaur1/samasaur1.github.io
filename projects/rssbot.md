---
layout: project
title: Samasaur1 | Projects | RssBot
sidebar:
  - title: Install
    children:
    - title: Requirements
    - title: Instantiate virtualenv (optional, recommended)
    - title: Enter virtualenv
    - title: Install Dependencies
    - title: Set Discord Token
  - title: Configure
  - title: Usage
    children:
    - title: Server
    - title: In Discord
  - title: Uninstall
---
# RssBot
It's a Discord bot. It watches RSS/Atom feeds. Then it sends new posts as messages.
### Install
##### Requirements
- Python 3. I'm using Python 3.9, but I don't think that the minor version matters.
- A Discord "Application" with a Bot created (make sure to copy the token).

##### Instantiate virtualenv (optional, recommended)
This step only needs to be run the first time.
<pre class="user-select-all">
<code><span class="user-select-none">$ </span>python -m venv .</code></pre>

##### Enter virtualenv
<pre class="user-select-all">
<code><span class="user-select-none">$ </span>source bin/activate</code></pre>

##### Install Dependencies
<pre class="user-select-all">
<code><span class="user-select-none">(rssbot) $ </span>pip install -r requirements.txt</code></pre>

##### Set Discord Token
<pre class="user-select-all">
<code><span class="user-select-none">(rssbot) $ </span>export DISCORD_TOKEN=██████</code></pre>

### Configure

When RssBot starts up, it sends a message in a channel in my Discord server. Furthermore, the help message provides the username of my instance of RssBot, and there are some commands (see below) which only I can use. I suggest that you change these bits of code if running your own instance.

To change the channel that receives the startup message, look in the `on_ready` method in the `RssBot` class. Change the line:

```python
await self.get_channel(1080991601502986331).send("Now running")
```

to use your chosen channel ID (or remove the line entirely). To get a channel ID, type the channel in Discord (with a `#`, so that it turns blue and you can click on it), but before sending, type a backslash (`\`) right before it. Then send the message:

![Typing channel name]({{ "assets/images/rssbot/channel-first.png" | relative_url }})

![Backslash before channel name]({{ "assets/images/rssbot/channel-second.png" | relative_url }})

![Sent message in channel]({{ "assets/images/rssbot/channel-third.png" | relative_url }})

You should also change the user ID for both the bot and for me. To get a user ID, type a message that tags them, but then put a backslash before the `@` and send it. Copy the numbers.

![Typing user name]({{ "assets/images/rssbot/user-first.png" | relative_url }})

![Backslash before user name]({{ "assets/images/rssbot/user-second.png" | relative_url }})

![Sent message in channel]({{ "assets/images/rssbot/user-third.png" | relative_url }})

For these, it's probably easier to find and replace. Replace all instances of `1080989856248893521` with the user ID of your bot (as found above), and replace all instances of `377776843425841153` with your user ID.

### Usage

##### Server
<pre>
(rssbot) $ <kbd>python main.py</kbd>
loaded configuration from environment...
...verbose=False
searching for feed files in working directory
...loaded feeds
...loaded feed data
connecting to Discord...
2023-03-15 16:34:04 INFO     discord.client logging in using static token
2023-03-15 16:34:05 INFO     discord.gateway Shard ID None has connected to Gateway (Session ID: ████)
Logged in as RssBot#8806!
</pre>

This will run until you hit <kbd>^C</kbd>. By default, it logs requests to add, remove, and list feeds, as well as any new posts in feeds.

You can also enable verbose output by setting the environment variable `VERBOSE` to any value (e.g., <kbd>export VERBOSE=1</kbd>). In this mode, a _lot_ of information is logged: every post comparison, every time a feed is checked (for each feed), whenever the dumpfiles are updated, and whenever the feeds are checked (one time total, no matter how may feeds).

##### In Discord
The primary method of interacting with the bot is through Discord. Once you've added it to a server, you interact with it by tagging it and giving it a command (e.g. <kbd>@RssBot help</kbd>).

The commands are:

- `add <feed>`
    - example: <kbd>@RssBot add https://samasaur1.github.io/feed.xml</kbd>
    - output: "Now watching <feed> in this channel", "Already watching <feed> in this channel", or "Not a valid URL"
    - permissions: everyone
- `remove <feed>`
    - example: <kbd>@RssBot remove https://samasaur1.github.io/feed.xml</kbd>
    - output: "Removed <feed> from the feeds for this channel" or "Could not find <feed> in the feeds for this channel"
    - permissions: everyone
- `list`
    - example: <kbd>@RssBot list</kbd>
    - output: "No feeds in this channel" or "**Feeds in this channel**:" followed by a list of feeds in this channel
    - permissions: everyone
- `help`
    - example: <kbd>@RssBot help</kbd>
    - output: Instructions on how to use RssBot.
    - permissions: everyone
- `oob`
    - example: <kbd>@RssBot oob</kbd>
    - output: "@oobot"
    - permissions: everyone
- `status`
    - example: <kbd>@RssBot status</kbd>
    - output: "**Status:**" followed by time since last check, approximate time until next check, feeds being watched, and channels with feeds
    - permissions: only me
- `forcerefresh`
    - example: <kbd>@RssBot forcerefresh</kbd>
    - output: no output, but forces a check for new posts on all feeds
    - permissions: only me

### Uninstall
If you used a virtualenv, then everything is in the rssbot directory that you cloned/downloaded into, so you can simply leave the virtual environment, leave the directory, and remove it:
<pre class="user-select-all">
<code><span class="user-select-none">$ </span>deactivate && cd .. && rm -rf rssbot</code></pre>

If you didn't install with a virtualenv, then the dependencies have been installed wherever Python packages go on your system, but you can remove the actual RssBot code by leaving and removing the directory:
<pre class="user-select-all">
<code><span class="user-select-none">(rssbot) $ </span>cd .. && rm -rf rssbot</code></pre>
