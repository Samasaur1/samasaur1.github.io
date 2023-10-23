---
layout: project
title: Samasaur1 | Projects | samasaur1.github.io
# sidebar:
#   - title: Install
#     children:
#     - title: Requirements
#     - title: Instantiate virtualenv (optional, recommended)
#     - title: Enter virtualenv
#     - title: Install Dependencies
#     - title: Set Discord Token
#   - title: Configure
#   - title: Usage
#     children:
#     - title: Server
#     - title: In Discord
#   - title: Uninstall
---
# samasaur1.github.io

This site. It contains project pages for [my projects](/projects), as well as [my blog](/blog)

## Building the site

### Prerequisites

- Ruby
    
    On my Mac, which I use for development, I am apparently using Ruby 3.2.2. However, the GitHub Action that runs production builds is using Ruby 3.1. Therefore, I *think* either should work, but the version of Ruby that I'm using at the time of reading can be seen [here](https://github.com/Samasaur1/samasaur1.github.io/blob/6cef2027c6c630a6d6ad63331674212ee2a36dbe/.github/workflows/jekyll.yml#L39).

    <!-- <script src="https://emgithub.com/embed-v2.js?target=https%3A%2F%2Fgithub.com%2FSamasaur1%2Fsamasaur1.github.io%2Fblob%2F6cef2027c6c630a6d6ad63331674212ee2a36dbe%2F.github%2Fworkflows%2Fjekyll.yml%23L39&style=default&type=code&showBorder=on&showLineNumbers=on&showFileMeta=on&showFullPath=on&showCopy=on"></script> -->

### Install dependencies

Dependencies are managed through [Bundler](https://bundler.io/):

```
bundle install
```

If you don't have Bundler, I *believe* it's installed like so:

```
gem install bundler
```

I'm using Bundler 2.4.8, which should be specified in `Gemfile.lock`

### Development builds

This command will run a local copy of the site:
```
bundle exec jekyll serve -DH 0.0.0.0
```
(the `-D` flag shows draft posts, while the `-H 0.0.0.0` flag allows you to view the site on any device on the local network)

### Production builds

At the time of writing, [my GitHub Actions workflow](https://github.com/Samasaur1/samasaur1.github.io/blob/main/.github/workflows/jekyll.yml#L47) runs the following command:
```
bundle exec jekyll build --baseurl ""
```

## Architectural Notes

I am not a web designer, so this site is really held together with duct tape and prayers. That said, I tried to make relatively sane decisions subject to my level of web design knowledge, and the site should mostly follow the traditional Jekyll site architecture. Still, though, a couple of notes:

- If you're using my site as a model, note that comments are fairly involved to set up. See [the project page for my comments server](/projects/jekyll-comments.html) and [the blog post explaining how I added comments to my blog]({% post_url 2023-07-28-adding-comments-to-the-blog %})
- Be sure to check [any open issues on my site](https://github.com/Samasaur1/samasaur1.github.io/issues)
