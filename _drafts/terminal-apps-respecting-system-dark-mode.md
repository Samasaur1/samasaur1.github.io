---
layout: post
title: 'Terminal Apps Respecting System Dark Mode'
tags:
- macos
- neovim
- alacritty
- swift
---
This article is dedicated to Alex, for this glowing review and proving the inspiration to finish this post.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="{{ "/assets/images/blog/terminal-apps-respecting-system-dark-mode/endorsement-dark.png" | relative_url }}">
  <source media="(prefers-color-scheme: light)" srcset="{{ "/assets/images/blog/terminal-apps-respecting-system-dark-mode/endorsement-light.png" | relative_url }}">
  <img alt="endorsement" src="{{ "/assets/images/blog/terminal-apps-respecting-system-dark-mode/endorsement-light.png" | relative_url }}">
</picture>

Since macOS Mojave (10.14) in 2018, macOS has had a system-wide Dark Mode. In macOS Catalina (10.15) (2019), Apple introduced automatic shifting between light and dark modes based on a schedule or sunrise/sunset[^1].

[^1]: While researching which versions of macOS introduced dark mode, I discovered that macOS Ventura (13) apparently will no longer shift into/out of dark mode "until your Mac has been idle for at least a minute," and won't shift at all if "an app is preventing the display from sleeping" ([Apple Support article](https://support.apple.com/guide/mac-help/use-a-light-or-dark-appearance-mchl52e1c2d2/13.0/mac/13.0)). Just another reason not to upgrade.

If you've ever used the stock macOS Terminal.app with no customization, you may have noticed that the default "Basic" profile does in fact shift with dark mode:

![default macos terminal profile shifting in and out of dark mode]({{ "/assets/images/blog/terminal-apps-respecting-system-dark-mode/default.gif" | relative_url }})

but as soon as you configure anything — font, colors, anything at all — it no longer shifts:

![customized macos terminal profile failing to shift into dark mode]({{ "/assets/images/blog/terminal-apps-respecting-system-dark-mode/customized.gif" | relative_url }})

I Do Not Like This.

As it so happens, I'm no longer using Terminal.app (primarily for its lack of 24-bit truecolor support or support for the OSC52 escape code) and I am instead using [my own fork of Alacritty](https://github.com/Samasaur1/alacritty/tree/2b7def0f774e5cfb0b4ed06b5f9d8ffd73f8bf2a). While Alacritty also doesn't support shifting by default, it _does_ support both a feature called "live config reload" (where the configuration file is reloaded upon changes, even if the app is open) and an IPC socket API.

I also want to have my Neovim installation shift with light and dark mode, because even on a light terminal emulator, Neovim puts everything on a dark background.

***

So now we know what we want to do. The next question is how to do it.

***

but the short version is that macOS lets you "listen" for certain system "notifications" (essentially register a callback on some system events, including when the system interface style changes)
so i have a LaunchAgent (essentially a user-scoped systemd service) that literally just waits for that notification (and also the "wake from sleep" notification, just in case the interface mode changed while the computer was asleep, e.g. from scheduled shifts)
when the callback is triggered, it reads a JSON file at ~/.config/dmn/commands.json (it does respect XDG_CONFIG_DIR if you have that set) and then executes those commands
```json
[
    {
        "executable": "/Users/sam/.local/bin/nvim-ctrl",
        "arguments": ["set background={}"]
    },
    {
        "executable": "/usr/bin/env",
        "arguments": ["/Users/sam/.local/bin/alacritty-color-switcher"]
    },
    {
        "executable": "/usr/bin/env",
        "arguments": ["/Users/sam/.local/bin/nvim-starting-color-switcher"]
    }
]
```
mine looks like this
the first one tells all running nvim instances to set their background to light/dark (and my nvim colorscheme, catppuccin, switches to the light version when this happens), the second edits the alacritty config file to switch it to a light theme (and alacritty has live_config_reload, so it takes effect immediately), the third edits my nvim init.lua so that new nvim sessions when the system is in light mode actually start in light mode
