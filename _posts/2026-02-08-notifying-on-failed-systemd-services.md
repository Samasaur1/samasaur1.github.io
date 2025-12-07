---
layout: post
title: 'Notifying on failed systemd services'
date: 2026-02-08 12:40 -0700
tags:
- nixos
- cliff
---

I manage a fair number of machines, which can make it hard to notice when services fail, especially if they aren't user-facing (e.g. periodic backups). Fortunately, I run a notification service (cliff, post to come) that makes it trivial to be informed when things go wrong.

I'm using NixOS to configure these machines, so I'll start by giving the config I ended up with and then explain it in detail:

```nix
# Set up service that will notify on failed services
systemd.services."notify-failure-of-systemd-service@" = {
  description = "Notify that service %i has failed";

  serviceConfig = {
    Type = "oneshot";
  };

  script = ''
    ${lib.getExe pkgs.curl} cliff/send -d "title=$1 failed on ${config.networking.hostName}"
  '';
  # %i is the argument to this template service, which as you can see in the drop-in below is set to %N
  # %N is the full unit name but with the type suffix (`.service`) removed. It's also what's used in the
  #   example on the man page, so there was no way I was diverging from that.
  scriptArgs = "%i";
};

# Create a "top level drop-in" that applies to all services
# https://www.freedesktop.org/software/systemd/man/latest/systemd.unit.html#:~:text=Example%C2%A03.%C2%A0Top,handler@failure%2Dhandler.service
# (link is equivalent to searching for "Top level drop-ins with template units" in systemd.unit(5))
systemd.units."service.d/10-onfailure-notify-via-cliff.conf".text = /* ini */ ''
  [Unit]
  OnFailure=notify-failure-of-systemd-service@%N.service
'';

# Disable that drop-in for the notification service itself
# enable = false makes it link to /dev/null
systemd.units."notify-failure-of-systemd-service@.service.d/10-onfailure-notify-via-cliff.conf".enable = false;
```

This snippet does three things, described in order below:

1. Define a systemd template service that will be used to notify when other services fail.

    systemd template services, whose names end in `@`, are a way to define systemd services that take an argument. This allows me to start `notify-failure-of-systemd-service@tailscaled.service` and `notify-failure-of-systemd-unit@cliff.service` separately, while defining their implementation only once. Template services take an additional format specifier beyond those that all systemd units have access to, `%i`, which resolves to the instance name (the string between the first `@` and the type suffix).[^capital-i-specifier] In my case, I pass `%i` as an argument to the script, and the script itself uses `curl` to trigger a notification via cliff.

    [^capital-i-specifier]: There's also `%I`, which is the same but "with escaping undone." See `systemd.unit(5)` for more information on these and other format specifiers.

    There's nothing about this service that inherently limits it to being used to notify on failed systemd services (other than the notification message, of course). For example, I can run `sudo systemctl start notify-failure-of-systemd-service@not-a-real-failure.service` and I'll get a notification on my phone saying "not-a-real-failure failed on samputer" (assuming I ran that `systemctl` command on samputer).

2. Create a "top level drop-in" (which applies to all systemd services) that configures the notification service (1) as the `OnFailure` service.

    systemd drop-ins allow you to customize the behavior of systemd units without overwriting the original unit file (very handy when you _cannot_ overwrite the original file, such as when it comes bundled). There are a couple different ways you can use drop-ins, with the most common being overriding a single service. What we're doing here, however, is creating an override that will apply to all `.service` units, which you can only do with a `service.d` or `socket.d` folder.

    The actual drop-in itself is fairly straightforward. It uses the `%N` format specifier to get the name of the unit and uses that name to instantiate an instance of the notification service we set up in step (1) as the `OnFailure` service (which is started when the service fails).

3. Disable the drop-in (2) for the notification service itself (1) to avoid infinite recursion.

    That actually may be enough to be done! systemd claims (in `systemd.unit(5)`) that it will try to automatically remove the infinite dependency cycle that is `foo.service` having its `OnFailure` set to `notify-failure-of-systemd-service@foo.service` which has its `OnFailure` set to `notify-failure-of-systemd-service@notify-failure-of-systemd-service@foo.service` which has its `OnFailure` set to... _ad infinitum_. I didn't even bother checking and instead just applied the fix preemptively, which is to disable that drop-in for the notification service itself.

    systemd drop-ins are resolved by collecting all `.conf` files from the possible drop-in directories, deduplicating files names by taking the file from the higher-priority (more-specific) drop-in directory, and applying them in lexicographical order. This means that to disable a drop-in in the lowest-priority directory (which our top-level drop-in is), we just need to create another drop-in with the same name (`10-onfailure-notify-via-cliff.conf`) in any other drop-in directory. I'm using the highest-priority directory that applies to all instantiated units from our template service. While we could create an empty drop-in file, we can also just create a symlink to `/dev/null`, which tells systemd to ignore the drop-in.

Note that from a systemd perspective, nothing I've done here is particularly interesting --- heck, they even have this as an example in `systemd.unit(5)`!. From a NixOS perspective, however, steps 2 and 3 are less straightforward, because the default tool that you'd reach for to create a `.conf` file or symlink to `/dev/null` under `/etc` is the `environment.etc` option, which won't work in this case.[^why-not-environment-etc] Instead you have to use `systemd.units`, which you rarely interact with, as you'll usually use the type-specific options instead (e.g. `systemd.services`, `systemd.timers`, `systemd.sockets`, etc.).

[^why-not-environment-etc]: This is because `/etc/systemd/system` is a symlink to `/etc/static/systemd/system` which in turn is a symlink to a `systemd-units` derivation containing the directory tree of systemd units, and not a directory tree directly. Thus `environment.etc` will try to put something else at `/etc/static/systemd/system` (a directory), which conflicts.
