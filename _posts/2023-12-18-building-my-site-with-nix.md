---
layout: post
title: 'Building My Site With Nix'
date: 2023-12-18 14:44 -0800
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

Fortunately, that work is pretty easy. To set up Nix, we simply use the Determinate Systems action, and then we also use Determinate Systems' "Magic Nix Cache" action to speed up builds. The one thing to be concerned about is that I need to use the correct Jekyll environment — I want `JEKYLL_ENV` to be set to `production`, but if unset it defaults to `development`. While I could do this by creating separate dev shells for development and production, since the difference is only one environment variable, I instead decided to use the same dev shell and set the env var explicitly, by means of the `--ignore-environment --keep JEKYLL_ENV` arguments to `nix develop`.

This leaves me with the following GitHub Actions workflow file, at `.github/workflows/jekyll.yml`:
```yaml
# This workflow uses actions that are not certified by GitHub.
# They are provided by a third-party and are governed by
# separate terms of service, privacy policy, and support
# documentation.

# Sample workflow for building and deploying a Jekyll site to GitHub Pages
name: Deploy Jekyll site to Pages

on:
  # Runs on pushes targeting the default branch
  push:
    branches: ["main"]

  # Allows you to run this workflow manually from the Actions tab
  workflow_dispatch:

# Sets permissions of the GITHUB_TOKEN to allow deployment to GitHub Pages
permissions:
  contents: read
  pages: write
  id-token: write

# Allow only one concurrent deployment, skipping runs queued between the run in-progress and latest queued.
# However, do NOT cancel in-progress runs as we want to allow these production deployments to complete.
concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  # Build job
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: DeterminateSystems/nix-installer-action@main
      - uses: DeterminateSystems/magic-nix-cache-action@main
      - name: Setup Pages
        id: pages
        uses: actions/configure-pages@v3
      - name: Build with Jekyll (via Nix)
        # Outputs to the './_site' directory by default
        run: nix develop --ignore-environment --keep JEKYLL_ENV -c jekyll build --baseurl "${{ steps.pages.outputs.base_path }}"
        env:
          JEKYLL_ENV: production
      - name: Upload artifact
        # Automatically uploads an artifact from the './_site' directory by default
        uses: actions/upload-pages-artifact@v2

  # Deployment job
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v2
```

and that should be it. I pushed this workflow to GitHub, and watched the action run.

#### the final issue

Although the dev shell worked on my local machine, it did *not* work on GitHub Actions, nor did it work in a fresh clone with the *exact* command I was using on GitHub Actions:
<pre>
<span class="user-select-none"><strong><span class="text-danger">[sam]</span><span class="text-primary">(~)</span></strong>$ </span><kbd class="user-select-all">nix develop --ignore-environment --keep JEKYLL_ENV -c jekyll build --baseurl ""</kbd>
Configuration file: /private/tmp/samasaur1.github.io/_config.yml
To use retry middleware with Faraday v2.0+, install `faraday-retry` gem
            Source: /private/tmp/samasaur1.github.io
       Destination: /private/tmp/samasaur1.github.io/_site
 Incremental build: disabled. Enable with --incremental
      Generating...
                    ------------------------------------------------
      Jekyll 4.3.2   Please append `--trace` to the `build` command
                     for any additional information or backtrace.
                    ------------------------------------------------
/nix/store/7nmjczmxhiynn62khdjl88d8sgsmvm6c-ruby3.1.4-jekyll-git-hash-0.1.0/lib/ruby/gems/3.1.0/gems/jekyll-git-hash-0.1.0/lib/jekyll-git-hash.rb:43:in ``': No such file or directory - git (Errno::ENOENT)
	from /nix/store/7nmjczmxhiynn62khdjl88d8sgsmvm6c-ruby3.1.4-jekyll-git-hash-0.1.0/lib/ruby/gems/3.1.0/gems/jekyll-git-hash-0.1.0/lib/jekyll-git-hash.rb:43:in `generate'
	from /nix/store/68z26a9562fksk28d5cjjkii50h67b8v-ruby3.1.4-jekyll-4.3.2/lib/ruby/gems/3.1.0/gems/jekyll-4.3.2/lib/jekyll/site.rb:193:in `block in generate'
	from /nix/store/68z26a9562fksk28d5cjjkii50h67b8v-ruby3.1.4-jekyll-4.3.2/lib/ruby/gems/3.1.0/gems/jekyll-4.3.2/lib/jekyll/site.rb:191:in `each'
	from /nix/store/68z26a9562fksk28d5cjjkii50h67b8v-ruby3.1.4-jekyll-4.3.2/lib/ruby/gems/3.1.0/gems/jekyll-4.3.2/lib/jekyll/site.rb:191:in `generate'
	from /nix/store/68z26a9562fksk28d5cjjkii50h67b8v-ruby3.1.4-jekyll-4.3.2/lib/ruby/gems/3.1.0/gems/jekyll-4.3.2/lib/jekyll/site.rb:79:in `process'
	from /nix/store/68z26a9562fksk28d5cjjkii50h67b8v-ruby3.1.4-jekyll-4.3.2/lib/ruby/gems/3.1.0/gems/jekyll-4.3.2/lib/jekyll/command.rb:28:in `process_site'
	from /nix/store/68z26a9562fksk28d5cjjkii50h67b8v-ruby3.1.4-jekyll-4.3.2/lib/ruby/gems/3.1.0/gems/jekyll-4.3.2/lib/jekyll/commands/build.rb:65:in `build'
	from /nix/store/68z26a9562fksk28d5cjjkii50h67b8v-ruby3.1.4-jekyll-4.3.2/lib/ruby/gems/3.1.0/gems/jekyll-4.3.2/lib/jekyll/commands/build.rb:36:in `process'
	from /nix/store/68z26a9562fksk28d5cjjkii50h67b8v-ruby3.1.4-jekyll-4.3.2/lib/ruby/gems/3.1.0/gems/jekyll-4.3.2/lib/jekyll/command.rb:91:in `block in process_with_graceful_fail'
	from /nix/store/68z26a9562fksk28d5cjjkii50h67b8v-ruby3.1.4-jekyll-4.3.2/lib/ruby/gems/3.1.0/gems/jekyll-4.3.2/lib/jekyll/command.rb:91:in `each'
	from /nix/store/68z26a9562fksk28d5cjjkii50h67b8v-ruby3.1.4-jekyll-4.3.2/lib/ruby/gems/3.1.0/gems/jekyll-4.3.2/lib/jekyll/command.rb:91:in `process_with_graceful_fail'
	from /nix/store/68z26a9562fksk28d5cjjkii50h67b8v-ruby3.1.4-jekyll-4.3.2/lib/ruby/gems/3.1.0/gems/jekyll-4.3.2/lib/jekyll/commands/build.rb:18:in `block (2 levels) in init_with_program'
	from /nix/store/yjd83mi8nn976421frdm4ph9wamfmkn5-ruby3.1.4-mercenary-0.4.0/lib/ruby/gems/3.1.0/gems/mercenary-0.4.0/lib/mercenary/command.rb:221:in `block in execute'
	from /nix/store/yjd83mi8nn976421frdm4ph9wamfmkn5-ruby3.1.4-mercenary-0.4.0/lib/ruby/gems/3.1.0/gems/mercenary-0.4.0/lib/mercenary/command.rb:221:in `each'
	from /nix/store/yjd83mi8nn976421frdm4ph9wamfmkn5-ruby3.1.4-mercenary-0.4.0/lib/ruby/gems/3.1.0/gems/mercenary-0.4.0/lib/mercenary/command.rb:221:in `execute'
	from /nix/store/yjd83mi8nn976421frdm4ph9wamfmkn5-ruby3.1.4-mercenary-0.4.0/lib/ruby/gems/3.1.0/gems/mercenary-0.4.0/lib/mercenary/program.rb:44:in `go'
	from /nix/store/yjd83mi8nn976421frdm4ph9wamfmkn5-ruby3.1.4-mercenary-0.4.0/lib/ruby/gems/3.1.0/gems/mercenary-0.4.0/lib/mercenary.rb:21:in `program'
	from /nix/store/dl5vgv19bl5lvndbhq8aa8bckv4vshyq-web-gems/lib/ruby/gems/3.1.0/gems/jekyll-4.3.2/exe/jekyll:15:in `<top (required)>'
	from /nix/store/dl5vgv19bl5lvndbhq8aa8bckv4vshyq-web-gems/bin/jekyll:35:in `load'
	from /nix/store/dl5vgv19bl5lvndbhq8aa8bckv4vshyq-web-gems/bin/jekyll:35:in `<main>'
</pre>

I looked at the source code for the plugin that was causing an error, and in retrospect, the issue was clear: that plugin attempts to call `git rev-parse --short HEAD`, but the `git` executable wasn't in the dev shell. For some reason, `nix develop` doesn't clear the `$PATH`, so it worked on my machine by using the global git on my computer, but it didn't work in CI. I added git to the dev shell:

```diff
commit d1cbbdca744dc6a27ba83914400aeb3e9a69f5cb
Author: Sam <30577766+Samasaur1@users.noreply.github.com>
Date:   Mon Dec 18 14:21:15 2023 -0800

    Add git to dev shell (a plugin requires it)

diff --git a/flake.nix b/flake.nix
index dd388c7..e722862 100644
--- a/flake.nix
+++ b/flake.nix
@@ -13,7 +13,7 @@
       }; in
         {
         default = nixpkgs.legacyPackages.${system}.mkShell {
-          packages = [ gems gems.wrappedRuby ];
+          packages = [ gems gems.wrappedRuby nixpkgs.legacyPackages.${system}.git ];
           # shellHook = ''
           #   export DEBUG=1
           # '';
```

and that fixed my issue. I now have totally reproducible builds of my site, on any machine.
