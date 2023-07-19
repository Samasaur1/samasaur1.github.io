---
layout: post
title: 'Forwarding Dark Mode over SSH'
tags:
- nixos
- ssh
- macos
---
My Mac is set up to sync its light/dark mode with the local sunset, so it is in light mode through most of the day, and in dark mode later at night. All my apps sync with the system as well, [including my terminal and terminal applications]({% post_url 2023-03-09-building-a-discord-rss-bot %}). However, what _doesn't_ sync is SSH sessions. If I SSH into one of my Mac Minis, and then run a command such as `bat` (which on my Mac is aliased to `bat --theme=$(defaults read -globalDomain AppleInterfaceStyle &> /dev/null && echo Catppuccin-mocha || echo Catppuccin-latte)` and thus respects dark mode), it always acts as if it is in dark mode (because the Mac Mini _is_ in dark mode).
