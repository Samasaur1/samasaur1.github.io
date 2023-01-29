---
layout: post
title: 'Terminal Apps Respecting System Dark Mode'
tags:
- macos
- neovim
- alacritty
- swift
---
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
