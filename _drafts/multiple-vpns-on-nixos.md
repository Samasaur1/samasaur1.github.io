---
layout: post
title: 'Multiple VPNs on NixOS'
# date: 
tags:
- tailscale
- wireguard
- vpn
- nixos
---

Back in July, I wrote [a post]({% post_url 2023-07-06-split-tunneling-with-tailscale-and-wireguard-on-macos %}) on how to set up split tunneling between Tailscale and a WireGuard VPN --- in my case, Mullvad --- on macOS. In general, it worked as desired, with all traffic going through Mullvad, except for Tailscale traffic. However, there were some limitations: I had to disable Tailscale DNS in order to prevent DNS leaks, so I had to access Tailscale hosts via their Tailscale IP addresses; I had to manually clear the DNS settings on all my interfaces after disconnecting from the VPN; and crucially, I never completely trusted that the VPN setup was leak-free. Let's see if we can do better this time.

Before we begin, I want to note that my goals for the VPN setup on this Linux machine are not exactly the same. In this case, I'm considering three types of traffic instead of two. First, Tailscale traffic, which should go over Tailscale (and Tailscale DNS should work properly); second, normal traffic, which simply goes out over the Ethernet interface; and third, "VPN traffic", which I want to go out over the VPN, with no chance of leaking. As we'll see, we can actually meet all of these goals at once.

First, let's recall that although Mullvad provides their own client app, they _also_ provide WireGuard configuration files. These are what we'll be using, since it gives us more control. I went reading on [the WireGuard site](https://www.wireguard.com/), where I found [this page](https://www.wireguard.com/netns/) on network namespaces. I'd never heard of these before, so i did some reading, and they seem super cool! You can essentially have multiple entirely distinct network stacks — firewalls, interfaces, routing rules, etc. And WireGuard has a fancy behavior when you move a WireGuard interface between network namespaces, which is that the outgoing tunnel connection goes out from the namespace the interface was created in, while the unencrypted tunneled connection is usable only in the namespace the interface is moved to:

![WireGuard diagram showing a `wg0` interface as the only way out of a "container" network namespace](https://www.wireguard.com/img/netns-container.svg)

(from [this page on WireGuard.com](https://www.wireguard.com/netns/))

***

## setting up the vpn

This is pretty straightforward to do manually, but I want it to be declarative in my NixOS config. Here's what's necessary:

The systemd service that creates the network namespace:
```nix
  systemd.services."netns@" = {
    description = "%I network namespace";
    before = [ "network.target" ];
    serviceConfig = {
      Type = "oneshot";
      RemainAfterExit = true;
      ExecStart = "${pkgs.iproute}/bin/ip netns add %I";
      ExecStop = "${pkgs.iproute}/bin/ip netns del %I";
    };
  };
```
This is a parameterized service, which means when other services reference it, they call it like `netns@mullvad.service`. This allows you to use it to make more than one network namespace, like `netns@vpn1.service` and `netns@vpn2.service`.

Here's the actual WireGuard interface:
```nix
  systemd.services.wg-mullvad = {
    description = "wg network interface (mullvad)";
    bindsTo = [ "netns@mullvad.service" ];
    requires = [ "network-online.target" ];
    after = [ "netns@mullvad.service" ];
    wantedBy = [ "multi-user.target" ];
    serviceConfig = {
      Type = "oneshot";
      RemainAfterExit = true;
      ExecStart = with pkgs; writers.writeBash "wg-up" ''
        set -e
        ${iproute}/bin/ip link add wg0 type wireguard
        ${iproute}/bin/ip link set wg0 netns mullvad
        ${iproute}/bin/ip -n mullvad address add <IPv4 address/CIDR> dev wg0
        ${iproute}/bin/ip -n mullvad -6 address add <IPv6 address/CIDR> dev wg0
        ${iproute}/bin/ip netns exec mullvad \
        ${wireguard-tools}/bin/wg setconf wg0 /path/to/wg.conf
        ${iproute}/bin/ip -n mullvad link set wg0 up
        ${iproute}/bin/ip -n mullvad route add default dev wg0
        ${iproute}/bin/ip -n mullvad -6 route add default dev wg0
        '';
      ExecStop = with pkgs; writers.writeBash "wg-down" ''
        ${iproute}/bin/ip -n mullvad route del default dev wg0
        ${iproute}/bin/ip -n mullvad -6 route del default dev wg0
        ${iproute}/bin/ip -n mullvad link del wg0
        '';
    };
  };
```
It requires `netns@mullvad.service`, which ensures that there's a network namespace named "mullvad" that exists before this service runs. Then, it creates the WireGuard interface, moves it to the mullvad netns, configures its IP addresses, sets its WireGuard configuration, enables the interface, and sets the default route. A few things to note:

1. The `<IPv4 address/CIDR>` should look like `10.20.123.111/32` or so

2. The contents of `/path/to/wg.conf` should look like this:
    ```conf
    [Interface]
    PrivateKey = <MyPrivateKey>

    [Peer]
    PublicKey = <PeerPublicKey>
    AllowedIPs = 0.0.0.0/0,::0/0
    Endpoint = <PeerEndpoint>
    ```

and both the IP address and `.conf` file will be provided by your VPN provider.

## using the vpn

That's really all you need! You can now run arbitrary commands through the VPN like so:
```bash
sudo ip netns exec <netns name> sudo -u <username> <command>
```
so for me:
```bash
sudo ip netns exec mullvad sudo -u $(whoami) curl https://api.ipify.com
```
You can even launch an entire shell that can only see the VPN interface, with:
```bash
sudo ip netns exec mullvad sudo -u $(whoami) bash
```

#### systemd services

While these methods work well enough for running one-off programs or running programs in `screen`s, you may want to run systemd services inside the VPN. Fortunately, that is possible as well, by setting `NetworkNamespacePath` to `/var/run/netns/<netns name>` in the service's `serviceConfig`. For example:

```nix
services.rssbot.enable = true;
systemd.services.rssbot.serviceConfig.NetworkNamespacePath = "/var/run/netns/mullvad";
```

## extra steps

#### dns

With the setup detailed above, there's one thing we forgot to do. When you visit a website by domain name, the DNS lookup still uses the default system DNS settings. Fortunately, we can change this too, by creating a file at `/etc/netns/<netns name>/resolv.conf`. My NixOS setup looks like this:

```nix
environment.etc."netns/mullvad/resolv.conf".text = "nameserver 10.64.0.1";
```

#### web UIs and local ports

Some programs automatically open an HTTP server on the local machine (or can be configured to do so), letting them be controlled via a given port. The issue, though, is that when these programs are run inside the VPN, the `localhost` that they bind to is _not_ the "normal" `localhost` — because we have a loopback interface for each network namespace. Unfortunately, this means that if a program in the VPN netns is listening on `localhost:9000`, it can only be connected to by other programs running in that netns. Fortunately, we can bridge the two.
