---
layout: post
title: 'Forwarding Dark Mode over SSH'
tags:
- nixos
- ssh
- macos
---
My Mac is set up to sync its light/dark mode with the local sunset, so it is in light mode through most of the day, and in dark mode later at night. All my apps sync with the system as well, [including my terminal and terminal applications]({% post_url 2023-08-22-terminal-apps-respecting-system-dark-mode %}). However, what _doesn't_ sync is SSH sessions. If I SSH into one of my Mac Minis, and then run a command such as `bat` (which on my Mac is aliased to `bat --theme=$(defaults read -globalDomain AppleInterfaceStyle &> /dev/null && echo Catppuccin-mocha || echo Catppuccin-latte)` and thus respects dark mode), it always acts as if it is in dark mode (because the Mac Mini _is_ in dark mode).

Clearly, I need to communicate the dark mode status from my computer to the computer I'm SSHing into. Fortunately, OpenSSH allows you to send environment variables using the `SendEnv` or `SetEnv` directives. I decided that I would send an environment variable named `DARKMODE`, so I added the following line to my `~/.ssh/config` file[^testing]:

```ssh
Host *
    SendEnv DARKMODE
```

[^testing]: For testing purposes, instead of modifying your SSH config file, you can add `-o "SendEnv DARKMODE"` to your SSH command invocations.

I would have liked to use `SetEnv` and had the value of `DARKMODE` be set to the output of a command, but OpenSSH does not appear to support running commands, only fixed values. Because I was not able to set the value of `DARKMODE` in my SSH config, I needed to determine it each time SSH was run. To do this, I aliased `ssh` to `DARKMODE=$(defaults read -globalDomain AppleInterfaceStyle &> /dev/null && echo YES || echo NO) ssh`, which sets `DARKMODE` to either `YES` or `NO` depending on the current system theme, before falling back to the actual SSH command.

This is great for sending the current theme, but currently the server will reject it. This is because the default behavior for SSH servers is to accept a very limited list of environment variables — essentially `TERM` and a few `LC_*` variables, such as `LC_ALL`[^lcexploit].

[^lcexploit]: The default used to be that _every_ `LC_*` variable was allowed, but this allowed clients to set variables with names like `LC_MY_VAR`, which were allowed, so the default was changed. Personally, it doesn't seem like much of a security risk to me (since clients need to choose to do it, and no program is going to be reading random `LC_WHATEVER` variables), but whatever.

To accept environment variables, you simply use the `AcceptEnv` directive in your sshd config. On NixOS, which is what all my Mac Minis are running, I simply change my SSH configuration to look like this:
```nix
# Enable the OpenSSH daemon.
services.openssh = {
  enable = true;
  settings = {
    PasswordAuthentication = false;
    KbdInteractiveAuthentication = false;
  };
  extraConfig = ''
    StreamLocalBindUnlink yes
    AcceptEnv DARKMODE
  '';
};
```

and run `nixos-rebuild`. Then all my terminal apps on the remote servers have a `DARKMODE` environment variable that they can check. For example, I have aliased `bat` on the Mac Minis to `bat --theme=$([ "$DARKMODE" = "NO" ] && echo GitHub || echo default)`.

***

There is one major problem with this solution: if my Mac changes to or from Dark Mode (e.g., via a scheduled sync), the change is not propagated to any SSH sessions. I haven't really looked into solutions to this problem, since I'm pretty sure any solution would need a program running in the background on either my Mac or the server I'm connecting to. Plus, I can just run `export DARKMODE=YES` or `export DARKMODE=NO` manually when necessary.
