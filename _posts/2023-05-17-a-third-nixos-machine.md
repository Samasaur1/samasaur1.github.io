---
layout: post
title: 'A Third NixOS Machine'
date: 2023-05-17 16:09 -0700
last_updated: 2023-07-18 19:15:00 -0700
tags:
- nixos
- ssh
---
As I mentioned in the previous post, I have two set-up Mac Minis dual-booting NixOS. Howver, because they're so old, they're really, really slow. When I had another service that I wanted to run (details to come), I decided to set up a third. One of NixOS's strengths is that it's very easy to deploy an identical machine. I was still getting used to NixOS when I set up my second machine, but now that I'm more comfortable (relatively speaking), I wanted to see how easy it was.

Turns out it was actually pretty easy. Here's what I did:

1. Create an entry for the new machine in my flake

    My NixOS configuration is [a "flake", which is an experimental feature of NixOS](https://nixos.wiki/wiki/Flakes). Essentially, it's a Git repo with the following `flake.nix` file (shown before adding the third machine):

    ```nix
    {
      description = "My NixOS configurations";

      inputs.nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable-small";

      outputs = { self, nixpkgs }: {
        nixosConfigurations.blinky = nixpkgs.lib.nixosSystem {
          system = "x86_64-linux";
          modules = [ ./common.nix ./blinky ];
        };
        nixosConfigurations.pinky = nixpkgs.lib.nixosSystem {
          system = "x86_64-linux";
          modules = [ ./common.nix ./pinky ];
        };

        formatter.x86_64-linux = nixpkgs.legacyPackages.x86_64-linux.nixfmt;
      };
    }
    ```
    and the following file structure:
    ```
    .
    ├── authorized_keys
    ├── blinky
    │   ├── default.nix
    │   └── hardware-configuration.nix
    ├── common.nix
    ├── flake.lock
    ├── flake.nix
    └── pinky
        ├── default.nix
        └── hardware-configuration.nix
    ```
    (some files omitted for clarity). All I had to do to add a third machine was add an entry to `flake.nix`:
    ```nix
    nixosConfigurations.pinky = nixpkgs.lib.nixosSystem {
      system = "x86_64-linux";
      modules = [ ./common.nix ./pinky ];
    };
    ```
    copy the `pinky` directory to the `inky` directory:
    <pre><code><span class="user-select-none">$ </span>cp -r pinky inky</code></pre>
    and, in `inky/default.nix`, change the line
    ```nix
    networking.hostName = "pinky";
    ```
    to
    ```nix
    networking.hostName = "inky";
    ```
    I did actually make other changes to `inky/default.nix`, because I didn't actually want an identical machine, but you don't _need_ to make any other changes, and if you want a new machine that's truly identical, you shouldn't.

1. Download NixOS minimal ISO
    
    Because I'm using these machines as servers only (and they're so slow already), I don't want them to have graphical user interfaces. So very close to the bottom of [the download page](https://nixos.org/download.html) is the link for "Download (64-bit Intel/AMD)", which I downloaded and flashed to a USB drive.

1. Boot from ISO

    On the first two machines, they are dual-booted macOS and NixOS using rEFInd, but for this third one I am putting only NixOS on it. This meant that I had no reason to install rEFInd, so I simply used the Mac firmware boot manager (hold Option on startup) to boot from the ISO.
1. Connect to network

    I think the installer tells you you need to be connected to the network, but I know that I at least need to be connected so that I can copy over my configuration. In my case, the computer was connected via Ethernet, so it was easy, but it's presumably possibly to connect via Wi-Fi as well.

    If you prefer to perform the rest of the steps from the comfort of your own computer (via SSH), you can do so. Skip to [the section on fetching SSH keys](#fetching-ssh-keys) to get SSH access, and then you can run the rest of the commands over SSH.
1. Create partitions

    Although we are planning to use a predefined configuration, there is one part of each machine's configuration that is unique and must be generated on the machine: the hardware configuration. This file describes the architecture, hardware support, disk partitions, etc. We'll partition the disk, and the NixOS installer will detect the other options for us.

    I basically followed the instructions [on the NixOS wiki page](https://nixos.org/manual/nixos/stable/index.html#sec-installation-manual-partitioning), with a couple of changes:

    <pre>
<code><span class="user-select-none"># </span>parted /dev/sda -- mklabel gpt</code>
<code><span class="user-select-none"># </span>parted /dev/sda -- mkpart ESP fat32 1MB 512MB</code>
<code><span class="user-select-none"># </span>parted /dev/sda -- set 1 esp on</code>
<code><span class="user-select-none"># </span>parted /dev/sda -- mkpart primary 512MB 100%</code></pre>

    I made the EFI partition the first partition, which I don't _think_ matters, but seems to be the standard on every machine I've ever used. Also, I didn't create a swap partition.
1. Formatting partition filesystems

    Next, we choose filesystems for these two partitions and format them. I'm using `btrfs` for my main partition, and the EFI partition has to be FAT32[^1]:

    <pre>
<code><span class="user-select-none"># </span>mkfs.fat -F 32 -n boot /dev/sda1</code>
<code><span class="user-select-none"># </span>mkfs.btrfs -L nixos /dev/sda2</code></pre>

    [^1]: According to [the UEFI specification](https://uefi.org/specs/UEFI/2.10/13_Protocols_Media_Access.html#file-system-format), "EFI encompasses the use of FAT32 for a system partition, and FAT12 or FAT16 for removable media."
1. Mounting the filesystems

    Now that they have been created, we can mount the filesystems:

    <pre>
<code><span class="user-select-none"># </span>mount /dev/disk/by-label/nixos /mnt</code>
<code><span class="user-select-none"># </span>mkdir -p /mnt/boot</code>
<code><span class="user-select-none"># </span>mount /dev/disk/by-label/boot /mnt/boot</code></pre>

    Again, I differ from the manual only in that I do not have a swap partition.
1. Generate hardware configuration

    Now we generate the configuration. This command generates "an initial configuration file for you":

    <pre>
<code><span class="user-select-none"># </span>nixos-generate-config --root /mnt</code></pre>

    Although this will generate `/mnt/etc/nixos/configuration.nix`, we actually don't care about that file. What we _do_ care about is the hardware configuration file that has been generated alongside it, which we'll copy over shortly.
1. <a name="fetching-ssh-keys"></a>Fetch SSH keys

    My SSH keys are on GitHub, so I simply ran
    <pre><code><span class="user-select-none"># </span>curl https://github.com/Samasaur1.keys > ~/.ssh/authorized_keys</code></pre>

    You can get your keys from anywhere, but they should be put in `~/.ssh/authorized_keys` (or `/root/.ssh/authorized_keys` if you want). If you don't have an SSH key, you can set the password for either `root` or `nixos` using `passwd`, but I strongly recommend SSH keys.
1. Copy over the flake

    Now that I had SSH access, I copied over my flake:

    <pre>
<code><span class="user-select-none"># </span>ip a</code>
<code><span class="user-select-none">[sam]$ </span>scp -r ~/nixos 134.10.131.233:nixos</code></pre>

    I probably could have referred to the new machine by hostname, but it was easier to just find its IP address and then (**from my main machine**) copy over my flake.
1. Retrieve generated hardware configuration

    Now that the flake is on the new machine, we need only add the `hardware-configuration.nix` file to it before we build:

    <pre>
<code><span class="user-select-none"># </span>cp /mnt/etc/nixos/hardware-configuration.nix ~/nixos/inky/hardware-configuration.nix</code></pre>

    Note how this replaces pinky's `hardware-configuration.nix` from step 1.
1. Install

    We're ready! Run:

    <pre>
<code><span class="user-select-none"># </span>nixos-install --flake ~/nixos#inky</code></pre>

    If you leave out the `--flake` argument, `nixos-install` will instead use the generatedd config at `/etc/nixos/configuration.nix`. We also specify the path to the flake (`~/nixos`) and which machine to build out of those that the flake specifies (`inky`)[^2]

[^2]: Apparently if you put the flake at `/etc/nixos/flake.nix`, it will be read by `nixos-rebuild` (and thus presumably `nixos-install`), but I only learned then when writing this article, and I haven't tested it.

There are two important manual configuration steps: set the timezone (with `sudo timedatectl set-timezone <your time zone>`) and authenticate with Tailscale (with `sudo tailscale up`). At the moment, I also need to clone my dotfiles, because I do not yet have home-manager set up, but that can be done at any point in the future.

I was actually pleasantly surprised at how easy this was! To be fair, it was my third NixOS machine (even before counting various NixOS VMs I've played with before), so I had more experience than when starting out, but now that I _do_ have experience, it would be _super_ easy to set up more machines.

***

Edits:
- 2023-07-18:
    - Correctly put the boot partition on `/dev/sda1` rather than `/dev/sda3`
    - Add note about setting timezone and authenticating with Tailscale
