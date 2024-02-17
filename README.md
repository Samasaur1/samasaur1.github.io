This is the source for [my site](https://samasaur1.github.io).

It's a Jekyll site, and the site is packaged with [Nix](https://nixos.org/). This means that you can enter a dev shell by running `nix develop` in this directory, and then you can run `jekyll build` or `jekyll serve -DH0.0.0.0` as normal.

In CI, you can run:
```
JEKYLL_ENV=production nix develop --ignore-environment --keep JEKYLL_ENV -c jekyll build --baseurl "${{ steps.pages.outputs.base_path }}"
```

If you have direnv and nix-direnv installed, you can create a file called `.envrc` with the following contents:
```
use flake
```
which will then automatically give you access to Jekyll when you `cd` into the directory.
