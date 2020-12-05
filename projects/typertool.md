---
layout: project
title: Samasaur1 | Projects | TyperTool
sidebar:
  - title: Install
    children:
      - title: Requirements
      - title: Homebrew
      - title: Mint
      - title: Install Script
      - title: Manual Install
  - title: Usage
  - title: Uninstall
---
# TyperTool
A basic implementation using Typer — give it text and a delay, then lean back and watch.
### Install
##### Requirements
TyperTool does not come pre-compiled, so you'll need Swift 4.0 or later in order to build it. (This version of Swift comes with Xcode 9 or later).

To download Xcode, get it [from the Mac App Store](https://apps.apple.com/us/app/xcode/id497799835) or download it [from the Apple Developer portal](https://developer.apple.com/download/more/) (requires sign-in).

Alternatively, download Swift [from Swift.org](https://swift.org/download/), using Homebrew, swiftenv, or via some other method.
##### [Homebrew](https://brew.sh/)
Installation:
<pre class="user-select-all">
<code><span class="user-select-none">$ </span>brew install Samasaur1/core/typer</code></pre>
Updating:
<pre class="user-select-all">
<code><span class="user-select-none">$ </span>brew upgrade typer</code></pre>
##### [Mint](https://github.com/yonaskolb/mint)
Installation:
<pre class="user-select-all">
<code><span class="user-select-none">$ </span>mint install Samasaur1/TyperTool</code></pre>
Updating:
<pre class="user-select-all">
<code><span class="user-select-none">$ </span>mint install TyperTool</code></pre>
##### Install Script
This method is not recommended, but will work for installing v1.0.0.
<pre class="user-select-all">
<code><span class="user-select-none">$ </span>curl -fsSL https://raw.githubusercontent.com/Samasaur1/TyperTool/master/install.sh | bash</code></pre>
##### Manual Install
Installation & updating:
```
$ git clone https://github.com/Samasaur1/TyperTool.git
$ cd TyperTool
$ swift build -c release
$ sudo mv .build/release/typer /usr/local/bin/typer
```
If you were using a Swift version before 5.0, replace line 3 with the following:
```
$ swift build -c release -Xswiftc -static-stdlib
```
Build and run directly:
```
$ git clone https://github.com/Samasaur1/TyperTool.git
$ cd TyperTool
$ swift run TyperTool
```

### Usage
```
$ typer <text> [delay]
```
(This gif may be slow, and I don't know why)
<img src="https://github.com/Samasaur1/TyperTool/raw/master/typer-demo.gif" style="width:100%;"/>
Here's a video version:
<video controls style="width:100%;">
  <source src="https://github.com/Samasaur1/TyperTool/raw/master/typer-demo.mov" type="video/mp4">
</video>

###### Notes:
* TyperTool doesn't let you change the typing rate ([issue link](https://github.com/Samasaur1/TyperTool/issues/1)).
* You can't set defaults (for the delay, or eventually for the rate) ([issue link](https://github.com/Samasaur1/TyperTool/issues/2)).
* It's difficult to paste text in, especially if the text has single or double quotes in it.
* To mitigate this, TyperTool is planning to accept text form standard input (via pipes, e.g. `echo "hello" | typer` or `pbpaste | typer`) ([issue link](https://github.com/Samasaur1/TyperTool/issues/3)).
* Visit the [issues](https://github.com/Samasaur1/TyperTool/issues) page to see the status of these issues.

### Uninstall
TyperTool doesn't leave anything behind, so you can use the normal uninstall method:
<pre class="user-select-all">
<code><span class="user-select-none">$ </span>brew uninstall typer</code></pre>
<pre class="user-select-all">
<code><span class="user-select-none">$ </span>mint uninstall TyperTool</code></pre>
<pre class="user-select-all">
<code><span class="user-select-none">$ </span>sudo rm /usr/local/bin/typer</code></pre>
