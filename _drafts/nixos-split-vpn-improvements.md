---
layout: post
title: 'NixOS Split VPN Improvements'
# date: 2024-11-08 21:55 -0800
tags:
- tailscale
- wireguard
- vpn
- nixos
---

In the nine months since [my previous post on my split-VPN setup]({% post_url 2024-02-08-multiple-vpns-on-nixos %}), I've made a number of improvements to my configuration. I'll detail them below:

### Set MTU

At some point 

### allow packets heading to tailscale devices to escape

### anything on port 53 (DNS) goes to the VPN dns server

### resolvconf symlink

### BindReadOnlyPaths in systemd services
