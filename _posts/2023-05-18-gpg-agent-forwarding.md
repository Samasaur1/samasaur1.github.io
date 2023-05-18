---
layout: post
title: 'GPG Agent Forwarding'
tags:
- nixos
- gnupg
- ssh
- macos
---
As I've mentioned before, I have a bunch of Mac Minis running NixOS hosting various services. I have SSH access set up to them all with my SSH key, but I don't have access to my GPG keys on those machines. And since these are the only NixOS machines that I have, things like updating my flake lockfile become annoyingly complicated:

<pre>
<code><span class="user-select-none">[sam](~/nixos) $ </span>ssh blinky</code>
<code><span class="user-select-none">[sam@blinky](~) $ </span>cd nixos</code>
<code><span class="user-select-none">[sam@blinky](~/nixos) $ </span>nix flake update</code>
<code><span class="user-select-none">[sam@blinky](~/nixos) $ </span>exit</code>
<code><span class="user-select-none">[sam](~/nixos) $ </span>scp blinky:nixos/flake.lock .</code>
<code><span class="user-select-none">[sam](~/nixos) $ </span>git commit -m "Update lock file" flake.lock</code>
<code><span class="user-select-none">[sam](~/nixos) $ </span>git push</code>
<code><span class="user-select-none">[sam](~/nixos) $ </span>ssh blinky</code>
<code><span class="user-select-none">[sam@blinky](~) $ </span>cd nixos</code>
<code><span class="user-select-none">[sam@blinky](~) $ </span>NIX_SSHOPTS="-t" nixos-rebuild boot --target-host pinky --flake .#pinky --use-remote-sudo</code>
</pre>

since I want to sign all the commits, which can only be done with access to my GPG keys, but I also can only update the lockfile and perform NixOS rebuilds on a NixOS machine.

Fortunately, GnuPG supports [forwarding `gpg-agent` over SSH connections](https://wiki.gnupg.org/AgentForwarding), just like you can forward your SSH agent with `ForwardAgent`. That's what we're doing today.

Following the instructions on the linked GnuPG wiki page, we first ensure that my public keys are on the remote machines:

<pre>
<code><span class="user-select-none">[sam] $ </span>gpg --export "Samasaur1" "OTHER_KEY_NAME" --armor > keys.gpg</code>
<code><span class="user-select-none">[sam] $ </span>scp keys.gpg blinky:</code>
<code><span class="user-select-none">[sam@blinky](~) $ </span>gpg --import keys.gpg</code>
</pre>

Then, take note of the location of the "extra" socket on the **local** machine (the machine you are SSHing from, which has the GPG secret keys on it):

<pre>
<code><span class="user-select-none">[sam] $ </span>gpgconf --list-dir agent-extra-socket</code>
</pre>

For me on my Mac, this is `/Users/sam/.gnupg/S.gpg-agent.extra`.

Then, on the **remote** machine (that which you are SSHing into, which does not have the GPG keys):

<pre>
<code><span class="user-select-none">[sam@blinky] $ </span>gpgconf --list-dir agent-socket</code>
</pre>

For me on blinky, pinky, and inky (the three NixOS Mac Minis), this is `/run/user/1000/gnupg/S.gpg-agent`. I believe this is true (with your user ID instead of 1000 — find it with `id -u`) of any systemd machine.

Next, modify your SSH config. I didn't have an explicit config for any of these three machines, so I created an entry for each of them in my `~/.ssh/config` file:

```ssh
Host blinky
    RemoteForward /run/user/1000/gnupg/S.gpg-agent /Users/sam/.gnupg/S.gpg-agent.extra
Host pinky
    RemoteForward /run/user/1000/gnupg/S.gpg-agent /Users/sam/.gnupg/S.gpg-agent.extra
Host inky
    RemoteForward /run/user/1000/gnupg/S.gpg-agent /Users/sam/.gnupg/S.gpg-agent.extra
```

This is enough for it to work given some specific preconditions. If the directory `/run/user/1000/gnupg/` exists on the remote machine but there is no `S.gpg-agent` socket even though that is the location that the GPG agent will look for a socket (which means that the agent is not running on the remote machine), connecting via SSH _should_ forward the GPG agent and let you use your private keys.

To make it so that `/run/user/1000/gnupg/` always exists, I added `gpgconf --create-socketdir` to my `bashrc`. I don't have my NixOS machines set up with `home-manager` yet, and I haven't started messing with the `programs.bach.*shellInit` options, so I just put that as the last line in my actual `~/.bashrc` file.

So that we succeed even if `S.gpg-agent` exists, you can set `StreamLocalBindUnlink yes` in the sshd config. On NixOS, I simply modified my `common.nix` file in my flake:

```nix
  services.openssh = {
    enable = true;
    settings = {
      PasswordAuthentication = false;
      KbdInteractiveAuthentication = false;
    };
    extraConfig = ''
      StreamLocalBindUnlink yes
    '';
  };
```

I was also running into issues when I had multiple SSH connections to the same machine. If I SSHed in with connection 1, the agent would be correctly forwarded and I could use secret keys. If I then SSHed in with connection 2, I could use the agent on both connections. But if I closed connection 1 before connection 2[^1], then the forwarded agent would no longer be accessible on the remote machine, and attempting to use `gpg` would start a local agent. This was solved by enabling SSH multiplexing (post to come).

[^1]: Or possibly vice versa, I don't remember. One way worked fine and the other way caused this issue.

Finally, there is an issue that I'm still having where if `gpg` is used on the remote machine when the agent is not forwarded (e.g., when physically logging in, or when SSHing in from a machine that does not forward its agent), so that the agent starts locally, it takes multiple connect-disconnects and some indeterminate amount of time for the forwarded agent to properly take priority.

***

Useful sources:
- <https://wiki.gnupg.org/AgentForwarding> (linked above as well)
- <https://gist.github.com/TimJDFletcher/85fafd023c81aabfad57454111c1564d>
