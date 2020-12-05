---
layout: project
title: Samasaur1 | Projects | REPL
sidebar:
  - title: Install
    children:
      - title: Requirements
      - title: Homebrew
      - title: Mint
      - title: Manual Install
  - title: Usage
  - title: Uninstall
---
# REPL
Prefix any command with a given string, or run a series of subcommands.
### Install
##### Requirements
REPL does not come pre-compiled, so you'll need Swift 5.0 or later in order to build it. (This version of Swift comes with Xcode 10.2 or later).

To download Xcode, get it [from the Mac App Store](https://apps.apple.com/us/app/xcode/id497799835) or download it [from the Apple Developer portal](https://developer.apple.com/download/more/) (requires sign-in).

Alternatively, download Swift [from Swift.org](https://swift.org/download/), using Homebrew, swiftenv, or via some other method.
##### [Homebrew](https://brew.sh/)
Installation:
<pre class="user-select-all">
<code><span class="user-select-none">$ </span>brew install Samasaur1/core/repl</code></pre>
Updating:
<pre class="user-select-all">
<code><span class="user-select-none">$ </span>brew upgrade repl</code></pre>
##### [Mint](https://github.com/yonaskolb/mint)
Installation:
<pre class="user-select-all">
<code><span class="user-select-none">$ </span>mint install Samasaur1/REPL</code></pre>
Updating:
<pre class="user-select-all">
<code><span class="user-select-none">$ </span>mint install REPL</code></pre>
##### Manual Install
Installation & updating:
```
$ git clone https://github.com/Samasaur1/REPL.git
$ cd REPL
$ swift build -c release
$ sudo mv .build/release/repl /usr/local/bin/repl
```
Build and run directly:
```
$ git clone https://github.com/Samasaur1/REPL.git
$ cd REPL
$ swift run REPL git
```

### Usage
  <pre>
<strong><span class="text-danger">[sam]</span><span class="text-primary">(~/Desktop/samasaur1.github.io)</span></strong>$ <kbd>repl git</kbd>
Initializing REPL with command: git
Use ^D to exit

<strong><span class="text-danger">[sam]</span><span class="text-primary">(~/Desktop/samasaur1.github.io)</span><span class="text-success">$ git</span></strong> <kbd>status</kbd>
On branch main
Changes not staged for commit:
  (use "git add &lt;file&gt;..." to update what will be committed)
  (use "git restore &lt;file&gt;..." to discard changes in working directory)
	modified:   _layouts/project.html
	modified:   _sass/main.scss
	modified:   about.md
	modified:   projects/customdieroller.html
	modified:   projects/dicekit.html
	modified:   projects/repl.html

no changes added to commit (use "git add" and/or "git commit -a")
<strong><span class="text-danger">[sam]</span><span class="text-primary">(~/Desktop/samasaur1.github.io)</span><span class="text-success">$ git</span></strong> <kbd>branch</kbd>
* main
<strong><span class="text-danger">[sam]</span><span class="text-primary">(~/Desktop/samasaur1.github.io)</span><span class="text-success">$ git</span></strong> <kbd>^D</kbd>
Exiting REPL
<strong><span class="text-danger">[sam]</span><span class="text-primary">(~/Desktop/samasaur1.github.io)</span></strong>$</pre>

###### Notes:
* While REPL does support the up and down arrow keys with its own internal buffer,
  it does not support any other interaction with your terminal history (such as <kbd>!!</kbd>).
* REPL does not currently forward colors from the output of commands run through it.
* REPL's command prompt is _not_ dynamic — it's based off of my command prompt,
  which means it will always look as it does in the examples above.
  This means that even if your normal prompt is this: `hostname:~/path/to/cwd username$`, in REPL it will show up like this:
  <code><strong><span class="text-danger">[username]</span><span class="text-primary">(~/path/to/cwd)</span><span class="text-success">$ REPLcommand</span></strong></code>.
* Visit the [issues](https://github.com/Samasaur1/REPL/issues) page to see the status of these issues.

### Uninstall
REPL doesn't leave anything behind, so you can use the normal uninstall method:
<pre class="user-select-all">
<code><span class="user-select-none">$ </span>brew uninstall repl</code></pre>
<pre class="user-select-all">
<code><span class="user-select-none">$ </span>mint uninstall REPL</code></pre>
<pre class="user-select-all">
<code><span class="user-select-none">$ </span>sudo rm /usr/local/bin/repl</code></pre>
