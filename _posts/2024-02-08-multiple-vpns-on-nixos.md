---
layout: post
title: 'Multiple VPNs on NixOS'
date: 2024-02-08 19:00 -0800
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

Here's the actual WireGuard interface:<a name="systemd.services.wg-mullvad"/>
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

The way we do this is with a "virtual Ethernet" (`veth`) interface. Virtual Ethernet interfaces can allegedly be used as standalone network devices, but their main use case is to bridge network namespaces. When you create veths, you always get an interconnected pair of interfaces — packets sent on one interface are immediately received on the other, and vice versa. By creating a pair of interfaces and moving one to a different netns, you can communicate between the namepaces via the veth interfaces. This is so common that there is a specific form of the creation command to place the two interfaces in different namespaces, which we'll use:

```
${iproute}/bin/ip link add veth0 type veth peer name veth1 netns mullvad
```

This creates the `veth0` interface in the default netns, paired to `veth1` in the `mullvad` netns. Then we give them IP addresses[^ipaddr]:
```
${iproute}/bin/ip -n mullvad addr add 10.0.0.2/24 dev veth1
${iproute}/bin/ip addr add 10.0.0.1/24 dev veth0
```

[^ipaddr]: I'm using `10.0.0.x` addresses because my local network uses a different range. If your local network uses `10.0.0.x` addresses, then you should pick a different subnet for the addresses of your `veth` interfaces.

and bring them online:
```
${iproute}/bin/ip -n mullvad link set dev veth1 up
${iproute}/bin/ip link set dev veth0 up
```

Assigning IP addresses with a `/24` subnet mask also means that any `10.0.0.x` address will be routed through the `veth`.

While this does technically let us communicate between network interfaces, it's not _useful_ communication at this point. We'd like incoming connections on a given port (we'll use 9000 as our example) to be forwarded over the `veth` pair into the VPN netns, where it should connect to the same given port on the loopback interface inside that netns. Then, any packets in response to that incoming connection should exit the nets over the `veth` in the other direction, bypassing the VPN. Crucially, we need to make sure that 1) all other outgoing data from the netns still goes over the VPN, including any requests made in the process of responding to the incoming connection; 2) programs running inside the netns cannot establish these connections: they are only created by incoming packets, and do not persist once the connection is closed.

To do so, we'll need to mess with packet routing. Here's what we had:
```
${iproute}/bin/ip -n mullvad route add default dev wg0
```

It's pretty straightforward: we set the default route (and thus all outgoing connections) for the netns to be the WireGuard socket — i.e., the VPN.

Here's what we'll do instead:

1. Create a routing table that routes all traffic through the `wg` interface:

    ```
    ${iproute}/bin/ip -n mullvad route add default dev wg0 table 2468
    ```

2. Set all non-marked packets to use this routing table:

    ```
    ${iproute}/bin/ip -n mullvad rule add not fwmark 1 table 2468
    ```

3. Set all marked packets to access the rest of the internet via the `veth` interface:

    ```
    ${iproute}/bin/ip -n mullvad route add default via 10.0.0.1 dev veth1
    ```

    Note that although this sets the default route, it only applies to marked packets because all unmarked packets have already been routed on table 2468.

4. Set packets coming in to port 9000 to bypass normal routing and NAT via the `veth` to the netns:

    This is actually more complicated. [The site that I originally got this from](https://broadband.forum/threads/vpn-network-isolation-and-policy-routing-for-apps-like-qbittorrent.210005/) had this command:
    ```
    ${iptables}/bin/iptables -t nat -A PREROUTING -p tcp --dport 9000 -j DNAT --to 10.0.0.2
    ```
    which sends all incoming TCP packets on port 9000 over the `veth` to the netns. In practice, this means that whatever service you are running is accessible on the local network, and possibly more[^pf]. This is probably not what you want, and is definitely not what I wanted, so I went with this instead:
    ```
    ${iptables}/bin/iptables -t nat -A PREROUTING -p tcp --dst 127.0.0.1 --dport 9000 -j DNAT --to 10.0.0.2
    ${iptables}/bin/iptables -t nat -A PREROUTING -p tcp --dst 100.114.224.96 --dport 9000 -j DNAT --to 10.0.0.2
    ```
    which sends all incoming TCP packets (`-p tcp`) on port 9000 `(--dport 9000`) over the `veth` to the netns, but only if the destination address is `127.0.0.1` (localhost, indicating that this request came from a service running in the main netns on this machine), or `100.114.224.96` (this machine's Tailscale IP address, indicating that this request came from one of my other machines).

[^pf]: For example, if you are port forwarding to this port on this machine, then the service will be publicly available.

5. Mark packets coming in on the veth:

    ```
    ${iproute}/bin/ip netns exec mullvad ${iptables}/bin/iptables -A PREROUTING -t mangle -i veth1 -p tcp --dport 9000 -j MARK --set-mark 1
    ```

    The `--dport 9000` here is probably redundant in practice. <!-- , but it prevents anything on the machine from connecting to the `veth` on a different port. -->

6. Match those marked packets, and apply the same mark to the connection as a whole:

    ```
    ${iproute}/bin/ip netns exec mullvad ${iptables}/bin/iptables -A PREROUTING -t mangle -m mark --mark 0x1 -j CONNMARK --save-mark
    ```

7. Match packets with the connection mark, and restore the packet mark:

    ```
    ${iproute}/bin/ip netns exec mullvad ${iptables}/bin/iptables -A OUTPUT -t mangle -j CONNMARK --restore-mark
    ```

    This is what actually allows outgoing packets to exit the netns via the `veth`, since otherwise only incoming packets would be marked.

We'll also need to undo some of this configuration, or you'll get `RTNETLINK answers: File exists` when restarting this service, unless you reboot.

Here's the updated version of the WireGuard interface:
```nix
# Creates the actual wg interface, then moves it into the "mullvad" netns
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
      # Lots of this was copied from https://broadband.forum/threads/vpn-network-isolation-and-policy-routing-for-apps-like-qbittorrent.210005/
      set -ex
      ${iproute}/bin/ip link add wg0 type wireguard
      ${iproute}/bin/ip link set wg0 netns mullvad
      ${iproute}/bin/ip -n mullvad address add <IPv4 address/CIDR> dev wg0
      ${iproute}/bin/ip -n mullvad -6 address add <IPv6 address/CIDR> dev wg0
      ${iproute}/bin/ip netns exec mullvad \
      ${wireguard-tools}/bin/wg setconf wg0 /path/to/wg.conf
      ${iproute}/bin/ip -n mullvad link set wg0 up
      ${iproute}/bin/ip -n mullvad -6 route add default dev wg0

      # Create a routing table that routes all traffic through the wg interface
      ${iproute}/bin/ip -n mullvad route add default dev wg0 table 2468
      # Set all non-marked (non-fwmarked) traffic use that table
      ${iproute}/bin/ip -n mullvad rule add not fwmark 1 table 2468
      # Create a virtual ethernet (veth) interface between the main and VPN network namespaces
      ${iproute}/bin/ip link add veth0 type veth peer name veth1 netns mullvad
      # Add IP addresses for the veth pair
      ${iproute}/bin/ip -n mullvad addr add 10.0.0.2/24 dev veth1
      ${iproute}/bin/ip addr add 10.0.0.1/24 dev veth0
      # Bring up the veth pair
      ${iproute}/bin/ip -n mullvad link set dev veth1 up
      ${iproute}/bin/ip link set dev veth0 up
      # Set all marked/fwmarked packets to access the rest of the internet via 10.0.0.1 (the veth)
      # This applies to only marked packets because all unmarked packets have already been routed on table 2468
      ${iproute}/bin/ip -n mullvad route add default via 10.0.0.1 dev veth1
      # Set packets coming in to port 9000 to bypass normal routing and NAT via veth to netns, but only if from this machine or Tailscale
      ${iptables}/bin/iptables -t nat -A PREROUTING -p tcp --dst 127.0.0.1 --dport 9000 -j DNAT --to 10.0.0.2
      ${iptables}/bin/iptables -t nat -A PREROUTING -p tcp --dst 100.114.224.96 --dport 9000 -j DNAT --to 10.0.0.2
      # Mark incoming packets from veth1 on port 9000 with 0x1
      ${iproute}/bin/ip netns exec mullvad ${iptables}/bin/iptables -A PREROUTING -t mangle -i veth1 -p tcp --dport 9000 -j MARK --set-mark 1
      # Match those marked packets, and apply the same mark to the connection as a whole
      ${iproute}/bin/ip netns exec mullvad ${iptables}/bin/iptables -A PREROUTING -t mangle -m mark --mark 0x1 -j CONNMARK --save-mark
      # Restore the mark from the connection as a whole to the specific packet, allowing it to actually exit via the veth
      ${iproute}/bin/ip netns exec mullvad ${iptables}/bin/iptables -A OUTPUT -t mangle -j CONNMARK --restore-mark
    '';
    ExecStop = with pkgs; writers.writeBash "wg-down" ''
      set -ex
      # Delete the firewall rules created above (`-A` is "append to chain", `-D` is "delete matching rule from chain")
      ${iproute}/bin/ip netns exec mullvad ${iptables}/bin/iptables -D PREROUTING -t mangle -i veth1 -p tcp --dport 9000 -j MARK --set-mark 1
      ${iproute}/bin/ip netns exec mullvad ${iptables}/bin/iptables -D PREROUTING -t mangle -m mark --mark 0x1 -j CONNMARK --save-mark
      ${iproute}/bin/ip netns exec mullvad ${iptables}/bin/iptables -D OUTPUT -t mangle -j CONNMARK --restore-mark
      ${iptables}/bin/iptables -t nat -D PREROUTING -p tcp --dst 127.0.0.1 --dport 9000 -j DNAT --to 10.0.0.2
      ${iptables}/bin/iptables -t nat -D PREROUTING -p tcp --dst 100.114.224.96 --dport 9000 -j DNAT --to 10.0.0.2

      ${iproute}/bin/ip link del veth0

      ${iproute}/bin/ip -n mullvad rule del not fwmark 1 table 2468

      # Delete the default routes. I don't even think this is necessary
      # ${iproute}/bin/ip -n mullvad route del default dev wg0
      # ${iproute}/bin/ip -n mullvad -6 route del default dev wg0
      # Delete the WireGuard interface itself
      ${iproute}/bin/ip -n mullvad link del wg0
    '';
  };
};
```

As of right now, I still need to configure any services running on the machine itself to look at `10.0.0.2:9000`, rather than `localhost:9000`, and I don't understand why. Regardless, they *will* work when using IP of the netns side of the `veth` (in my case 10.0.0.2). Please let me know if you can explain why using `localhost:9000` does not work.
