---
layout: post
title: 'Bee Careful With Sudo'
date: 2023-03-02 12:39 -0800
tags:
- macos
- sudo
- shell
- nixos
---
The first time you use `sudo` on a macOS system (it's probably been so long you don't even remember it!), you're presented with the following dialog:
```
WARNING: Improper use of the sudo command could lead to data loss
or the deletion of important system files. Please double-check your
typing when using sudo. Type "man sudo" for more information.

To proceed, enter your password, or type Ctrl-C to abort.
```
and a password prompt.

One of my friends has this prompt set up:

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="{{ "/assets/images/blog/bee-careful-with-sudo/ex-dark.png" | relative_url }}">
  <source media="(prefers-color-scheme: light)" srcset="{{ "/assets/images/blog/bee-careful-with-sudo/ex-light.png" | relative_url }}">
  <img alt="example" src="{{ "/assets/images/blog/bee-careful-with-sudo/ex-light.png" | relative_url }}">
</picture>

Obviously, I _had_ to set it up.

This message is called the "sudoers lecture", and by default it's shown once per user account. The default lecture is located at `/etc/sudo_lecture`.

They use NixOS, so it's really easy to configure the message and the desired behavior. Add the following to your `/etc/nixos/configuration.nix` (or somewhere in your flake, etc.):
```nix
security.sudo.extraConfig = ''
  Defaults pwfeedback
  Defaults lecture = always
  Defaults lecture_file = ${./sudoers.txt}
'';
```
and put <a href="{{ "/assets/files/blog/bee-careful-with-sudo/lecture.txt" | relative_url }}" download="sudoers.txt">the new sudoers lecture file</a> in that directory as `sudoers.txt`.[^1]

### macOS

But we're on macOS, so because it's not a declarative operative system, we've gotta do some manual configuration.

Grab that same <a href="{{ "/assets/files/blog/bee-careful-with-sudo/lecture.txt" | relative_url }}" download="sudoers.txt">new sudoers lecture file</a>.[^2] I saved it to `/etc/sudo_lecture_bee` so that I didn't overwrite the default message, but you could just overwrite the message. Then you need to edit `/etc/sudoers` to have the following contents
```sudo
Defaults	lecture_file = "/etc/sudo_lecture_bee"
Defaults    lecture=always
Defaults    pwfeedback
```
**You should use `visudo` for this!** If you screw up your sudoers file, you won't be able to `sudo`... including to fix the sudoers file itself. So `sudo visudo`, and then include those lines. Note that the last line is optional, but this way you can see `*` being typed when you're putting in your password.

They try `sudo -k` and then `sudo -v`. You should get the prompt!

[^1]: You should verify that this file is actually what I say it is! I use `file`, which reports `ASCII text, with escape sequences`, and then I `bat` or `cat` it to see that it's what I expect. You can also hexdump it if you're especially concerned. I'll also note here that the MD5 hash is `f1437dc8bb357d1a3b049e006a6349ef` and the SHA-1 hash is `e85d3529ad2a7a84541ba6bc11f7c51f6963ce76`.
[^2]: See above
