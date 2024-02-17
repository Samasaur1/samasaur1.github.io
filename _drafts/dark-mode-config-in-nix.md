---
layout: post
title: 'Dark Mode config with dmn in Nix'
# date: 2023-12-19 09:00 -0800
tags:
- nix
- nix-darwin
- home-manager
- macos
- dmn
---
Last year, I finally published (nearly seven months after I got it working) [the details of `dmn`, my dark-mode-notifier program]({% post_url 2023-08-22-terminal-apps-respecting-system-dark-mode %}) that allows you to write scripts adding dark mode support to arbitrary programs. Over the past month, I've been converting `dmn` to a Nix-based project, and configuring it via nix-darwin/home-manager. Here's how that process went, and the current state of `dmn`/how you could use it in your Nix config, if you so desire.

### pre-nixification: a recap

describe the state of dmn as it was at the end of my last blog post, before commit `617660f49455a465e078ea2734c8441c0a5b3986` in my nixos config

### initial Nixification

#### getting dmn running via Nix

#### providing a nix-darwin module

###?# moving scripts into nix-darwin

#### the first three (easy)

#### nvim-ctrl

### dmn runs as root

explain that despite being in /Library/LaunchAgents, dmn ran as root anyway (discovered bc of TMPDIR shenanigans with nvim-ctrl), so I moved it to launchd.user.agents

### moving to home-manager

### how you can set this up yourself

flake only

Start by adding the `dmn` flake as an input to your config: in `flake.nix`, add this block to the `inputs` section:
```nix
dmn = {
  url = "github:Samasaur1/dmn";
  inputs.nixpkgs.follows = "nixpkgs";
};
```

Next, we'll add `inputs.dmn.homeManagerModules.default` to your home-manager configuration. There are many ways to do this, but the way I do it is to ensure that you have your flake inputs in the `extraSpecialArgs` to your home-manager config, and then to add `inputs.dmn.homeManagerModules.default` to the `imports` section of some file in your home-manager config. For example, here's how I declare a home-manager configuration in my `flake.nix`:
```nix
"sam@aarch64-darwin" = home-manager.lib.homeManagerConfiguration {
  modules = [
    ./home
  ];
  pkgs = import nixpkgs {
    system = "aarch64-darwin";
    config.allowUnfree = true;
  };
  extraSpecialArgs = { inherit inputs; };
};
```
and then in `./home/default.nix`, I have:
```nix
{ inputs, ... }:
{
  imports = [
    inputs.dmn.homeManagerModules.default
  ];
}
```

Now that we've imported the dmn module, we can set `services.dmn` (though of course only on Darwin). Here's a minimal example:
```nix
services.dmn = {
  enable = true;
  commands = [
    { executable = "/usr/bin/say"; arguments = [ "Now switching to {} mode" ]; }
  ];
};
```
which will announce whenever your computer shifts between light and dark mode.

Put together, here is a totally minimal `flake.nix` with dmn configured via home-manager:
```nix
{
  description = "Minimal dmn example";
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    home-manager = {
      url = "github:nix-community/home-manager";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    dmn = {
      url = "github:Samasaur1/dmn";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };
  outputs = inputs@{ self, nixpkgs, home-manager, dmn, ... }: {
    homeConfigurations."minimal" = home-manager.lib.homeManagerConfiguration {
      modules = [
        dmn.homeManagerModules.default
        ({ ... }: {
          services.dmn = {
            enable = true;
            commands = [ { executable = "/usr/bin/say"; arguments = [ "Now switching to {} mode" ]; } ];
          };
        })
      ];
      pkgs = import nixpkgs {
        system = "aarch64-darwin";
      };
    };
  };
}
```
