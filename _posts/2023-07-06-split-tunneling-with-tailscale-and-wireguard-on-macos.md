---
layout: post
title: 'Split Tunneling with Tailscale and WireGuard on macOS'
tags:
- macos
- tailscale
- wireguard
- vpn
---
I use [Tailscale](https://tailscale.com) to connect all my devices to each other. In general, this is great. I can access all my machines from anywhere, through NAT, without messing with my firewall, by hostname. And that's just the base level. I'm not here to be a Tailscale ad — go check out their website if you want to know more. Sometimes I want to use a VPN to anonymize my internet traffic, though, and Tailscale does not (currently) support that.

For my other VPN, I'm currently using [Mullvad](https://mullvad.net). It's €5/month, no logs, etc. — this is also not a Mullvad ad, but it also seems pretty great. However, I cannot use the Mullvad app at the same time as the Tailscale app.

What I would like is to be able to access all my devices over Tailscale, while all other traffic goes over Mullvad[^1]. What I have right now is one or the other, but not both.

[^1]: This technically includes the Tailscale traffic, because it has to go over the internet eventually. My desired routing for, say, the Tailscale IP address 100.100.100.101, would be to go through the Tailscale interface, which "resolves" that Tailscale IP to some actual internet IP, which is then connected to the destination device via WireGuard (since Tailscale is built on WireGuard) over the Mullvad tunnel.

As you may have guessed since I'm writing a blog post about it, I did manage to solve this issue. I am now able to connect to my Tailscale devices while also using Mullvad to route all my traffic. Here's how.

### Background on Tailscale

Tailscale is a mesh VPN based on WireGuard. It is designed to connect all your devices to one another, without impacting other traffic[^2]. To do this, it gives each device connected to your network a unique 100.x.y.z IP address[^3], which stays consistent no matter where a device moves to in the real world, or how many times it changes networks. I also use Tailscale's "MagicDNS" feature, which allows me to use machine names across my Tailnet (e.g., I can `ssh blinky` instead of looking up blinky's Tailscale IP myself or running `ssh $(tailscale ip -4 blinky)`).

[^2]: There are other features, but at a base level this is what it does.
[^3]: Technically they give out addresses in the `100.64.0.0/10` subnet. Read more [on their site](https://tailscale.com/kb/1015/100.x-addresses/).

Since Tailscale only routes their subnet of addresses, it seems like split tunneling should work. Tailscale's [support page on using multiple VPNs](https://tailscale.com/kb/1105/other-vpns/) agrees in theory, but notes:

> **Can I use Tailscale alongside other VPNs?**
>
> It depends. In most cases, you can’t use Tailscale alongside other VPNs.
>
> In theory, it should work. Tailscale only routes a small subset of your internet traffic (100.x.y.z addresses and subnets), by default, leaving the rest for other VPNs to manage.
>
> In practice, most VPNs set aggressive firewall rules to ensure all network traffic goes through them. They then drop all Tailscale traffic, which only Tailscale knows how to route. VPNs that don’t use aggressive firewall rules may be able to run alongside Tailscale.

The support site says to exclude the following IP address ranges from your VPN to make it work with Tailscale:

```
100.64.0.0/10
fd7a:115c:a1e0::/48
```

### Background on Mullvad

Mullvad provides a [client app](https://github.com/mullvad/mullvadvpn-app) which supports both OpenVPN and WireGuard. The app builds on top of those protocols, enabling a "kill switch" to ensure that no traffic escapes the VPN, even when it is disconnecting or after the network goes down. However, the app does not allow excluding a range of IP addresses, which is what I need to integrate it with Tailscale. This limitation exists even when using the command-line tool to interact with the Mullvad daemon directly.

It's worth noting that Mullvad has support for split tunneling on Windows and Linux. It seems like this is application-based, rather than by IP address, which isn't exactly what I want, but regardless it doees not help me on my Mac.

However, Mullvad also allows users to download OpenVPN and WireGuard configuration files directly, if you need to use them rather than using the app. The WireGuard files look something like this:

```conf
[Interface]
# Device: <device name>
PrivateKey = <private key of local device>
Address = 10.67.88.33/32,fc00:bbbb:bbbb:bb01::4:5820/128
DNS = 10.64.0.1

[Peer]
PublicKey = bPfJDdgBXlY4w3ACs68zOMMhLUbbzktCKnLOFHqbxl4=
AllowedIPs = 0.0.0.0/0,::0/0
Endpoint = 31.171.153.66:51820
```

### The solution

Essentially, I want to use the Mullvad WireGuard config files, but "subtract" the Tailscale IPs from the Mullvad `AllowedIPs` line so that Tailscale traffic goes through Tailscale, while all other traffic goes through Mullvad. I used [this calculator](https://www.procustodibus.com/blog/2021/03/wireguard-allowedips-calculator/) to determine my desired `AllowedIPs`, by taking the original list (`0.0.0.0/0, ::0/0`) and subtracting the Tailscale range (`100.64.0.0/10, fd7a::115c::a1e0::/48`). Then I substituted that into each Mullvad WireGuard config file, producing:

```conf
[Interface]
# Device: <device name>
PrivateKey = <private key of local device>
Address = 10.67.88.33/32,fc00:bbbb:bbbb:bb01::4:5820/128
DNS = 10.64.0.1

[Peer]
PublicKey = bPfJDdgBXlY4w3ACs68zOMMhLUbbzktCKnLOFHqbxl4=
AllowedIPs = 0.0.0.0/2, 64.0.0.0/3, 96.0.0.0/6, 100.0.0.0/10, 100.128.0.0/9, 101.0.0.0/8, 102.0.0.0/7, 104.0.0.0/5, 112.0.0.0/4, 128.0.0.0/1, ::/1, 8000::/2, c000::/3, e000::/4, f000::/5, f800::/6, fc00::/8, fd00::/10, fd40::/11, fd60::/12, fd70::/13, fd78::/15, fd7a::/20, fd7a:1000::/24, fd7a:1100::/26, fd7a:1140::/28, fd7a:1150::/29, fd7a:1158::/30, fd7a:115c::/33, fd7a:115c:8000::/35, fd7a:115c:a000::/40, fd7a:115c:a100::/41, fd7a:115c:a180::/42, fd7a:115c:a1c0::/43, fd7a:115c:a1e1::/48, fd7a:115c:a1e2::/47, fd7a:115c:a1e4::/46, fd7a:115c:a1e8::/45, fd7a:115c:a1f0::/44, fd7a:115c:a200::/39, fd7a:115c:a400::/38, fd7a:115c:a800::/37, fd7a:115c:b000::/36, fd7a:115c:c000::/34, fd7a:115d::/32, fd7a:115e::/31, fd7a:1160::/27, fd7a:1180::/25, fd7a:1200::/23, fd7a:1400::/22, fd7a:1800::/21, fd7a:2000::/19, fd7a:4000::/18, fd7a:8000::/17, fd7b::/16, fd7c::/14, fd80::/9, fe00::/7
Endpoint = 31.171.153.66:51820
```

You will also have to either subtract subnets that you use over Tailscale, or disable them when using both VPNs.

I messed around with DNS options to try to get everything working nicely, but I was unsuccessful. So to get this to work, disable Tailscale DNS. Then you can run `sudo wg-quick up al-tia-wg-001`, and you'll be using both VPNs!

### Limitations

As I noted above, I couldn't get DNS to work nicely. The approach I ended up on was to use Mullvad's DNS, to avoid leaking DNS requests outside the tunnel, even though this means that MagicDNS and therefore accessing Tailscale nodes by hostname does not work when both VPNs are enabled.

It should be possible to get both working, but DNS is a hellscape. Especially on macOS — `scutil --dns` and `dscacheutil -q host -a name <host>` and mDNSResponder and the fact that some built-in tools ignore the system DNS settings. It's not fun.

I _do_ think it might actually be possible to fix this by setting the Mullvad DNS server as a "global nameserver" for my Tailnet, so that I can leave the Tailscale DNS settings on (which would mean that it immediately resolves MagicDNS names, and forwards all non-Tailscale names to the "global nameserver").
The reason why I would need to set this as a global nameserver and not just rely on Tailscale's default behavior of falling back to the system DNS is due to the order of starting the VPNs. If I start Tailscale first, then it remembers the original DNS, which means it would leak out of the Mullvad tunnel. If I start Mullvad first, I can't change where it resolves DNS and I don't think it lets Tailscale overwrite it.
