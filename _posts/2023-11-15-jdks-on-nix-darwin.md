---
layout: post
title: 'Installing JDKs via nix-darwin'
date: 2023-11-15 11:03 -0800
tags:
- nix
- macos
- java
- nix-darwin
---
I'm in the process of moving as many of the installed packages and as much of the configuration of my Mac to [nix-darwin](https://github.com/LnL7/nix-darwin). Among the packages that I want on my Mac are various versions of JDKs[^whyjava]. The way that macOS interacts with JDKs is a bit tricky, so the standard Nix or nix-darwin install doesn't work, but we can make it work.

[^whyjava]: *why*, you may ask. Good question. I don't actually know if there's anything that I still use Java for. I *used* to use it [for FRC]({% post_url 2021-01-16-setting-up-a-blank-2021-frc-project %}), though.

### prelude: installing JDKs on macOS

Using Java on macOS is ... complicated. It didn't used to be — once upon a time, Apple actually provided their own version of Java[^applejava], and Java used to be named alongside Objective-C as a language with which to write Mac OS X apps[^cocoajava]. While neither of these are true anymore, the vestiges of Apple's Java remain.

[^applejava]: <https://www.java.com/en/download/help/java_mac.html#java6>

[^cocoajava]: <https://developer.apple.com/library/archive/documentation/Cocoa/Conceptual/LanguageIntegration/LanguageIntegration.html>

This is most obvious when you look at the `java` command: `which java` points to `/usr/bin/java`, but if you run `java -version` without having installed Java, you'll get this output:
<pre>
<span class="user-select-none"><strong><span class="text-danger">[sam]</span><span class="text-primary">(~)</span></strong>$ </span><kbd class="user-select-all">java -version</kbd>
The operation couldn’t be completed. Unable to locate a Java Runtime.
Please visit http://www.java.com for information on installing Java.

</pre>

At various points in time, I have installed Java via the official Java graphical installer ("3 Billion Devices Run Java"), Homebrew, and MacPorts. The graphical installer installs its JDK to `/Library/Java/JavaVirtualMachines`, while Homebrew gives this message:
```
For the system Java wrappers to find this JDK, symlink it with
    sudo ln -sfn $HOMEBREW_PREFIX/opt/openjdk@11/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-11.jdk
```
and MacPorts gives this message:
```
  If you want to make openjdk11 the default JDK, add this to shell profile:
  export JAVA_HOME=/Library/Java/JavaVirtualMachines/openjdk11/Contents/Home
```

With the help of these messages and some investigation of my own, I was able to figure out that the system Java wrappers (`/usr/bin/java`, `/usr/bin/javac`, etc.) all rely on the value of the environment variable `JAVA_HOME` if it is set, but fall back to the output of `/usr/libexec/java_home` if unset. `/usr/libexec/java_home` searches for Java installations in `/Library/Java/JavaVirtualMachines/` (you can see a list of all Java installations recognized by your system by running `/usr/libexec/java_home -V`).

`/usr/libexec/java_home` can also select a specific version of Java, which you can then set `JAVA_HOME` to[^runningjavadirectly], like so:
<pre>
<span class="user-select-none"><strong><span class="text-danger">[sam]</span><span class="text-primary">(~)</span></strong>$ </span><kbd class="user-select-all">/usr/libexec/java_home</kbd>
/nix/store/nqa1y66833mm5ya9n7wqp5apyxjk91gj-zulu17.44.53-ca-jdk-17.0.8.1/zulu-17.jdk/Contents/Home
<span class="user-select-none"><strong><span class="text-danger">[sam]</span><span class="text-primary">(~)</span></strong>$ </span><kbd class="user-select-all">/usr/libexec/java_home -V</kbd>
Matching Java Virtual Machines (3):
    17.0.8.1 (arm64) "Azul Systems, Inc." - "Zulu 17.44.53" /nix/store/nqa1y66833mm5ya9n7wqp5apyxjk91gj-zulu17.44.53-ca-jdk-17.0.8.1/zulu-17.jdk/Contents/Home
    11.0.20 (arm64) "Azul Systems, Inc." - "Zulu 11.66.15" /nix/store/k2aczrnsi8hs71398vf2zx7ahcslgbhp-zulu11.66.15-ca-jdk-11.0.20/zulu-11.jdk/Contents/Home
    1.8.0_382 (arm64) "Azul Systems, Inc." - "Zulu 8.72.0.17" /nix/store/4d8k1qq9lnrvvck4gjsn8jb33f58ygmf-zulu8.72.0.17-ca-jdk-8.0.382/zulu-8.jdk/Contents/Home
/nix/store/nqa1y66833mm5ya9n7wqp5apyxjk91gj-zulu17.44.53-ca-jdk-17.0.8.1/zulu-17.jdk/Contents/Home
<span class="user-select-none"><strong><span class="text-danger">[sam]</span><span class="text-primary">(~)</span></strong>$ </span><kbd class="user-select-all">/usr/libexec/java_home -v 11</kbd>
/nix/store/k2aczrnsi8hs71398vf2zx7ahcslgbhp-zulu11.66.15-ca-jdk-11.0.20/zulu-11.jdk/Contents/Home
<span class="user-select-none"><strong><span class="text-danger">[sam]</span><span class="text-primary">(~)</span></strong>$ </span><kbd class="user-select-all">java -version</kbd>
openjdk version "17.0.8.1" 2023-08-24 LTS
OpenJDK Runtime Environment Zulu17.44+53-CA (build 17.0.8.1+1-LTS)
OpenJDK 64-Bit Server VM Zulu17.44+53-CA (build 17.0.8.1+1-LTS, mixed mode, sharing)
<span class="user-select-none"><strong><span class="text-danger">[sam]</span><span class="text-primary">(~)</span></strong>$ </span><kbd class="user-select-all">JAVA_HOME=$(/usr/libexec/java_home -v 11) java -version</kbd>
openjdk version "11.0.20" 2023-07-18 LTS
OpenJDK Runtime Environment Zulu11.66+15-CA (build 11.0.20+8-LTS)
OpenJDK 64-Bit Server VM Zulu11.66+15-CA (build 11.0.20+8-LTS, mixed mode)
</pre>
You can set `JAVA_HOME` in your `.bash_profile`/`.bashrc`/`.zprofile`/`.zshenv`, which will work for your shell, but you could do that without putting (or linking) JDKs into `/Library/Java/JavaVirtualMachines`. The reason that we're putting JDKs in there is because graphical apps will not pick up your `JAVA_HOME` variable from your shell init file, so they will use `/usr/libexec/java_home`, and if your Java installations are not in `/Library/Java/JavaVirtualMachines/`, they won't be detected.

[^runningjavadirectly]: You can also run a specific version of Java directly by running `/usr/libexec/java_home -v 11 --exec java -version`

### prologue: what is nix-darwin

Nix is many things at once: a language, a package manager, the main package set for that package manager, a Linux distribution, and, if you're using nix-darwin, a way to declaratively manage your Mac's software and configuration. A quick reference:

**Nix** (the language): a lazy, dynamically typed, purely functional language. As far as I know, the Nix language is _only_ used in the context of the Nix package manager.\\
**Nix** (the package manager): a purely functional package manager, installing everything into `/nix/store`, which allows for multiple concurrent versions, atomic upgrades and rollbacks, perfect reproduciblity, and more.\\
**Nix**pkgs (the package set): the main collection of packages for use with the Nix package manager (over 80,000).\\
**Nix**OS (the linux distribution): a Linux distribution built on the Nix package manager and Nixpkgs, allowing fully declarative systems with the same benefits as the Nix package manager.\\
**nix**-darwin: it's kinda like NixOS, but rather than an entire operating system, it manages packages and configuration on top of macOS.

So, for example, using nix-darwin I could have the following bit of configuration:
```nix
programs.bash.interactiveShellInit = ''
  source ${./prompt.sh}
'';

environment.etc."sudoers.d/prompt".text = ''
  Defaults pwfeedback
  Defaults lecture = always
  Defaults lecture_file = ${./sudoers.txt}
'';
```

which would source `prompt.sh` in every interactive Bash shell, and also create a file `/etc/sudoers.d/prompt` with the above contents[^technicallysymlink] (the current nix-darwin equivalent of [my post on setting the sudo lecture]({% post_url 2023-03-02-bee-careful-with-sudo %}))

[^technicallysymlink]: Technically, this file would be a symlink to a file in the Nix store with those contents, as everything managed by Nix is installed to the Nix store and linked into the proper position.

To add packages to the system-wide `PATH`, you'd do:
```nix
environment.systemPackages = [
  pkgs.hello
  pkgs.coreutils
];

# or
# environment.systemPackages = with pkgs; [
#   hello
#   coreutils
# ];
```

### failed attempt: installing Nix-packaged Java directly

I first tried installing Java by simply putting `jdk11` in `environment.systemPackages`[^sameas], like so:

[^sameas]: As I understand it, this should be equivalent to `nix profile install nixpkgs#jdk11` if you are using Nix on macOS without nix-darwin (but with flakes and nix-command), and is probably about the same as `nix-env -iA jdk11` if you are not using flakes or nix-command (though as I have used flakes and nix-command since I started using Nix, I cannot say for sure)

```nix
environment.systemPackages = with pkgs; [ jdk11 ];
```

and rebuilding. This did make `java` be Java 11, but only via my terminal, since it didn't link the JDK into `/Library/Java/JavaVirtualMachines/`:
<pre>
<span class="user-select-none"><strong><span class="text-danger">[sam]</span><span class="text-primary">(~)</span></strong>$ </span><kbd class="user-select-all">which -a java</kbd>
/nix/store/k2aczrnsi8hs71398vf2zx7ahcslgbhp-zulu11.66.15-ca-jdk-11.0.20/bin/java
/usr/bin/java
</pre>
As we already discussed, this is not what we want.

This method also limits me to one JDK at a time — I tried putting both `jdk11` and `jdk17` in `environment.systemPackages`, but then I got an error since both packages provide `java`, so they conflict.

### a glimmer of hope: linking manually from the nix store

You may notice, in the above output, that the new Java binary is at `/nix/store/k2aczrnsi8hs71398vf2zx7ahcslgbhp-zulu11.66.15-ca-jdk-11.0.20/bin/java`. Let's take a look at that.

{:.callout.callout-note}
> ##### a quick note about `/nix/store` paths
> As mentioned above, Nix installs all packages to the "Nix Store", which is at `/nix/store`. Packages are put in the store with a name that is a combination of the hash of their source *and all their dependencies*, along with the package name, and the package version. This allows for multiple versions of the same package (for example, multiple packages providing `java`) to be installed without conflicts, so long as they aren't all linked into the system PATH. All the outputs of a package <!--(or "derivation", which to my understanding is the "unit" of the Nix package manager — while all packages are produced from derivations, only some derivations produce packages[^pkgsvsdrvsvsexprs])--> must be under the package's Nix store path.
>
> The Nix store is also what allows for atomic upgrades and rollbacks — because everything is in the (read-only) Nix store, upgrades and rollbacks are both just changing symlinks.

[^pkgsvsdrvsvsexprs]: blah blah blah

<pre>
<span class="user-select-none"><strong><span class="text-danger">[sam]</span><span class="text-primary">(~)</span></strong>$ </span><kbd class="user-select-all">eza -al /nix/store/k2aczrnsi8hs71398vf2zx7ahcslgbhp-zulu11.66.15-ca-jdk-11.0.20</kbd>
lrwxr-xr-x  - root 31 Dec  1969 bin -> zulu-11.jdk/Contents/Home/bin
lrwxr-xr-x  - root 31 Dec  1969 conf -> zulu-11.jdk/Contents/Home/conf
lrwxr-xr-x  - root 31 Dec  1969 demo -> zulu-11.jdk/Contents/Home/demo
lrwxr-xr-x@ - root 31 Dec  1969 DISCLAIMER -> zulu-11.jdk/Contents/Home/DISCLAIMER
lrwxr-xr-x  - root 31 Dec  1969 include -> zulu-11.jdk/Contents/Home/include
lrwxr-xr-x  - root 31 Dec  1969 jmods -> zulu-11.jdk/Contents/Home/jmods
lrwxr-xr-x  - root 31 Dec  1969 legal -> zulu-11.jdk/Contents/Home/legal
lrwxr-xr-x  - root 31 Dec  1969 lib -> zulu-11.jdk/Contents/Home/lib
dr-xr-xr-x  - root 31 Dec  1969 nix-support
lrwxr-xr-x  - root 31 Dec  1969 readme.txt -> zulu-11.jdk/Contents/Home/readme.txt
lrwxr-xr-x  - root 31 Dec  1969 release -> zulu-11.jdk/Contents/Home/release
dr-xr-xr-x  - root 31 Dec  1969 share
lrwxr-xr-x  - root 31 Dec  1969 Welcome.html -> zulu-11.jdk/Contents/Home/Welcome.html
dr-xr-xr-x  - root 31 Dec  1969 zulu-11.jdk
</pre>

Careful inspection of `zulu-11.jdk` as compared to the JDKs I already had installed showed that it was the format I wanted. So I *removed* `jdk11` from my nix-darwin config and rebuild, so that the only `java` executable on my `PATH` was `/usr/bin/java`. However, because I had "built" (in this case downloaded from a binary cache) `jdk11` already, and the Nix store doesn't get garbage-collected immediately., I could run
```bash
sudo ln -sf /nix/store/k2aczrnsi8hs71398vf2zx7ahcslgbhp-zulu11.66.15-ca-jdk-11.0.20/zulu-11.jdk /Library/Java/JavaVirtualMachines/
```
which worked!

While I could run:
```bash
nix build nixpkgs#jdk8
ln -s $(realpath $(realpath result/bin)/../../../) /Library/Java/JavaVirtualMachines/
nix build nixpkgs#jdk17
ln -s $(realpath $(realpath result/bin)/../../../) /Library/Java/JavaVirtualMachines/
```
the results would still be temporary, because there's still one more problem to fix[^horrifyingbash].

[^horrifyingbash]: This code is also kind of terrible, but I wrote it this way so that it doesn't matter what the name of the `.jdk` file is.
    
    It's probably equivalent to `ln -s result/*.jdk /Library/Java/JavaVirtualMachines/`


### success: automatic symlinks via nix-darwin

The problem is that nothing in Nix knows that we need those JDKs to remain installed in the Nix store. While there is probably a way to tell Nix not to garbage-collect those packages, I would also like to have these links declared in nix-darwin.

On NixOS, you can use `systemd.tmpfiles.rules` (or `systemd.tmpfiles.settings`) to interact with [`systemd-tmpfiles`](https://www.freedesktop.org/software/systemd/man/latest/tmpfiles.d.html), to create the arbitrary links we need from the Nix store to `/Library/Java/JavaVirtualMachines/`. Unfortunately, there is no equivalent functionality on nix-darwin — while you can create links to files in `/etc`, you cannot create links to arbitrary targets via the nicely-defined options.

I asked the nice people on the "Nix on macOS" Matrix channel ([#macos:nixos.org](https://matrix.to/#/#macos:nixos.org)), who pointed me in the direction of `system.activationScripts`. These are the Bash scripts that actually set up your nix-darwin configuration on the system. There are currently 26 activation scripts (if I counted correctly), most of which perform a specific task and should not be modified (such as `system.activationScripts.applications`, which links all applications installed via nix-darwin to `/Applications/Nix Apps/`). However, there are six activation scripts designed for users to customize:

<script src="https://emgithub.com/embed-v2.js?target=https%3A%2F%2Fgithub.com%2FLnL7%2Fnix-darwin%2Fblob%2Fe67f2bf515343da378c3f82f098df8ca01bccc5f%2Fmodules%2Fsystem%2Factivation-scripts.nix%23L116-L123&style=default&type=code&showBorder=on&showLineNumbers=on&showFileMeta=on&showFullPath=on&showCopy=on"></script>
<noscript markdown="1">
```nix
# Extra activation scripts, that can be customized by users
# don't use this unless you know what you are doing.
system.activationScripts.extraActivation.text = mkDefault "";
system.activationScripts.preActivation.text = mkDefault "";
system.activationScripts.postActivation.text = mkDefault "";
system.activationScripts.extraUserActivation.text = mkDefault "";
system.activationScripts.preUserActivation.text = mkDefault "";
system.activationScripts.postUserActivation.text = mkDefault "";
```
(from <https://github.com/LnL7/nix-darwin/blob/e67f2bf515343da378c3f82f098df8ca01bccc5f/modules/system/activation-scripts.nix#L115-L123>)
</noscript>

I decided to use `extraActivation` (because what I'm doing is in fact extra activation) and did this:
```nix
system.activationScripts.extraActivation.text = ''
  ln -sf "${pkgs.jdk8}/zulu-8.jdk" "/Library/Java/JavaVirtualMachines/"
  ln -sf "${pkgs.jdk11}/zulu-11.jdk" "/Library/Java/JavaVirtualMachines/"
  ln -sf "${pkgs.jdk17}/zulu-17.jdk" "/Library/Java/JavaVirtualMachines/"
'';
```

{:.callout.callout-note}
> ##### another note about how nix works
> Interpolating the expression for a Nix package into a string will output that package's path in the Nix store. **It will also ensure that the built package is actually at that path in the Nix store**. The way that this works is because Nix is a lazy language — the "value" of every package expression is its path in the Nix store, and evaluating that path has a side effect[^sideeffects] of ensuring the package is "realized" (built or downloaded from a cache and put into the Nix store).

[^sideeffects]: While writing this article, I looked this up to double-check, and it turns out this is not how it's officially thought of as working. However, this explanation of side effects makes sense to me as the way I think about it.

### what does the future hold: a nix-darwin Java module?

There's one final problem that I would like to solve before I declare this perfect: Currently, if you *remove* this activation script, the links are not removed. When you think about it, this makes sense: there's nothing that removes the links. However, it's not ideal, because it means that future version of my system would not be perfectly pure and declarative: I might rely on these JDKs being installed even though there is now nothing keeping them installed in the Nix store or indicating to me that I ever set this up in the first place.

Ideally, there would be an option defined that, if enabled, creates these links, but if disabled, removes the links *if they were originally created by the module being enabled*. I'm not currently sure how to implement that, so I left it as is — especially because I do still want these JDKs installed.
