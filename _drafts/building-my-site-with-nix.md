---
layout: post
title: 'Building My Site With Nix'
date: 2023-11-15 11:28 -0800
tags:
- jekyll
- nix
---
I've had a lot of issues getting my site to build consistently. A while ago, though, I thought I had figured it out and would be able to run `bundle exec jekyll serve` to build my site locally with the same version of Jekyll and its plugins that are used in CI. However, it wouldn't last.

When I was writing my [previous article]({% post_url 2023-11-15-jdks-on-nix-darwin %}), I tried to run my website locally, but I got an error:

<pre>
<span class="user-select-none"><strong><span class="text-danger">[sam]</span><span class="text-primary">(~)</span></strong>$ </span><kbd class="user-select-all">bundle exec jekyll serve</kbd>
Could not find eventmachine-1.2.7, eventmachine-1.2.7, eventmachine-1.2.7, http_parser.rb-0.8.0, http_parser.rb-0.8.0, http_parser.rb-0.8.0, ffi-1.15.5, ffi-1.15.5, ffi-1.15.5 in locally installed gems
Run `bundle install` to install missing gems.
</pre>

At this point, having dealt with this exact same issue many times before, I was fed up. Since I'm already converting lots of the stuff I use to Nix, I figured I'd try to Nixify this as well.

### local builds via Nix

Initially, I looked in nixpkgs for the Jekyll plugins that I use, but while most of them were packaged, one was not. Fortunately, the Nix manual has [a section on Ruby development](https://nixos.org/manual/nixpkgs/stable/#sec-language-ruby).

I followed the instructions under "Using an existing Gemfile":

<pre>
<span class="user-select-none"><strong><span class="text-danger">[sam]</span><span class="text-primary">(~)</span></strong>$ </span><kbd class="user-select-all">nix shell nixpkgs#bundix</kbd>
(2) <span class="user-select-none"><strong><span class="text-danger">[sam]</span><span class="text-primary">(~)</span></strong>$ </span><kbd class="user-select-all">bundix -l</kbd>
</pre>

There was a lot of output from `bundix -l` (the `-l` flag updates `Gemfile.lock` and thus your gem versions), which I have not reproduced here. It generated a file `gemset.nix`, which lists all the gems I am using and their hashes (to ensure reproducibility). The manual also provides "an example you could use for your `shell.nix`":
```nix
let
  gems = bundlerEnv {
    name = "gems-for-some-project";
    gemdir = ./.;
  };
in mkShell { packages = [ gems gems.wrappedRuby ]; }
```

After some false starts, I managed to get that excerpt in the right place:
```nix
{
  description = "A very basic flake";

  outputs = { self, nixpkgs }:
    let
      allSystems = nixpkgs.lib.systems.flakeExposed;
      forAllSystems = nixpkgs.lib.genAttrs allSystems;
    in {
      devShells = forAllSystems (system:
        let gems = nixpkgs.legacyPackages.${system}.bundlerEnv {
          name = "web gems";
          gemdir = ./.;
        }; in
        {
          default = nixpkgs.legacyPackages.${system}.mkShell {
            packages = [ gems gems.wrappedRuby ];
          };
        }
      );
    };
}
```
(that's `flake.nix`, and the only other Nix file in the directory was the generated `gemset.nix`. **they both must be tracked by Git**).

However, when I tried to use the dev shell, I still got errors:

<pre>
<span class="user-select-none"><strong><span class="text-danger">[sam]</span><span class="text-primary">(~)</span></strong>$ </span><kbd class="user-select-all">nix develop .#web</kbd>
error: hash mismatch in fixed-output derivation '/nix/store/wqs5xxvkwjzqibj1p0r1068d89839cpi-sass-embedded-1.59.3.gem.drv':
         specified: sha256-xQovdIRXLQct7pd2/lfvDxjfDUNIqzGOYHKMrd4Om58=
            got:    sha256-e68up83yhtKKVhMYFbS48oAZHjJncu4joPUyB9u45x8=
error: 1 dependencies of derivation '/nix/store/dyibr1fnhpf747pnkmb6mshwc21il6fh-ruby3.1.4-sass-embedded-1.59.3.drv' failed to build
error: 1 dependencies of derivation '/nix/store/7cbnj2wd694i737gfj0qmkhz5gpr9add-web-gems.drv' failed to build
error: 1 dependencies of derivation '/nix/store/5z1ckgpnw2jn855mchlhcvmfhi7lnq1k-nix-shell-env.drv' failed to build
</pre>

[It turns out](https://github.com/nix-community/bundix/issues/88) that sometimes bundler will pick platform-specific versions of gems, which causes issues for Nix/bundix (because it expects the gems to always be the same). The solution that worked for me was:

```
bundler config set --local force_ruby_platform true
rm Gemfile.lock
bundle lock
nix run nixpkgs#bundix -- -l
```

This allowed me to run `nix develop`, after which `jekyll` worked perfectly.

If you don't need a full subshell and only need to run one command, you can do that too:
```bash
nix develop --command jekyll serve --draft --host 0.0.0.0
```
which is equivalent to
```bash
nix develop -c jekyll serve -DH0.0.0.0
```

{:.callout.callout-note}
> ##### Names of Nix Dev Shells
> To make a dev shell, your Nix flake should have an attribute `outputs.devShells.<system>.<name>`.
> In this format, `<system>` should be the system that the dev shell runs on (or you can do what I did, and generate the same dev shell for all systems), while `<name>` can be anything, and is how you call the dev shell.
> 
> For example, let's say I have:
> ```nix
> outputs.devShells = forAllSystems (system:
>   myDevShell = <source of dev shell>
> )
> ```
> which produces `outputs.devShells.aarch64-darwin.myDevShell`, `outputs.devShells.x86_64-linux.myDevShell`, etc.
> Then I can say `nix develop .#myDevShell`, which will pick the system that corresponds to the computer I am running the command on, look for a dev shell named `myDevShell`, and enter it.
> 
> The one special consideration is that you can have a dev shell named `default`, which allows you to say `nix develop` without naming the dev shell. This is the approach I took.

### CI builds via Nix

The nice thing about Nix is that I don't need to take any special steps to reproduce my environment. Once my dev shell is in Git, I can just run the same `nix develop` command, even on a different machine with a different architecture. That said, there is some work to be done to actually install Nix itself and get this setup going on GitHub Actions.

I haven't actually done it yet, but I would follow https://determinate.systems/posts/nix-github-actions, using <https://github.com/marketplace/actions/install-nix>, and <https://github.com/DeterminateSystems/magic-nix-cache-action/>. The one thing to be concerned about is that I need to use the correct Jekyll environment — I want `JEKYLL_ENV` to be set to `production`, but if unset it defaults to `development`. I'm not sure if I want to do this by creating two different dev shells, one that sets `JEKYLL_ENV` to development and one to production, or whether I want to use the same dev shell and just set the env var explicitly. Probably the second, in which case I'd need the `--ignore-environment --keep JEKYLL_ENV` arguments to `nix develop`.
