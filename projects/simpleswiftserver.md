---
layout: project
title: Samasaur1 | Projects | SimpleSwiftServer
sidebar:
  - title: Install
    children:
      - title: Requirements
      - title: Homebrew
      - title: Mint
      - title: Manual Install
  - title: Usage
    children:
      - title: Examples
  - title: Uninstall
---
# SimpleSwiftServer
Quick and easy file sharing (direct download or directory browsing) and more.

**Why is it better than Python's SimpleHttpServer?**
* Quicker to type: <kbd>server</kbd> vs <kbd>python3 -m http.server</kbd> or <kbd>python -m SimpleHTTPServer</kbd>.
* Supports additional modes beyond directory browsing.
* Allows you to host from a directory that is not your current working directory.
* You don't have to remember `HTTP` vs `Http` (better in Python 3)
* No need to remember how to run the Python http module. `-m http`? `-m http.server`? `-m SimpleHTTPServer`? Which one goes with which version of Python?

### Install
##### Requirements
SimpleSwiftServer does not come pre-compiled, so you'll need Swift 5.0 or later in order to build it. (This version of Swift comes with Xcode 10.2 or later).

To download Xcode, get it [from the Mac App Store](https://apps.apple.com/us/app/xcode/id497799835) or download it [from the Apple Developer portal](https://developer.apple.com/download/more/) (requires sign-in).

Alternatively, download Swift [from Swift.org](https://swift.org/download/), using Homebrew, swiftenv, or via some other method.
##### [Homebrew](https://brew.sh/)
Installation:
<pre class="user-select-all">
<code><span class="user-select-none">$ </span>brew install Samasaur1/core/simpleswiftserver</code></pre>
Updating:
<pre class="user-select-all">
<code><span class="user-select-none">$ </span>brew upgrade simpleswiftserver</code></pre>
##### [Mint](https://github.com/yonaskolb/mint)
Installation:
<pre class="user-select-all">
<code><span class="user-select-none">$ </span>mint install Samasaur1/SimpleSwiftServer</code></pre>
Updating:
<pre class="user-select-all">
<code><span class="user-select-none">$ </span>mint install SimpleSwiftServer</code></pre>
##### Manual Install
Installation & updating:
```
$ git clone https://github.com/Samasaur1/SimpleSwiftServer.git
$ cd SimpleSwiftServer
$ swift build -c release
$ sudo mv .build/release/server /usr/local/bin/server
```
Build and run directly:
```
$ git clone https://github.com/Samasaur1/SimpleSwiftServer.git
$ cd SimpleSwiftServer
$ swift run server git
```

### Usage
SimpleSwiftServer has four modes: a file downloader and a directory browser, to easily share files, a single-HTML-file host mode, and a website directory host mode. It also allows you to specify your port.

Here's the help information:
```
$ server --help
OVERVIEW: Host a little server.

This command lets you host multiple different types of servers on your local
machine, accessible to anyone on the network.

USAGE: server [--port <port>] [--browse] [--file] [--webserver] [--html] [<path>]

ARGUMENTS:
  <path>                  The path to the file/directory (default: .)

OPTIONS:
  --port <port>           The port for the server to run on (default: 1234)
  --browse/--file/--webserver/--html
                          The server mode (default: directoryBrowser)
  --version               Show the version.
  -h, --help              Show help information.
```
As you can see, the default port is 1234, the default mode is a directory browser, and the default path is the current directory.

##### Examples
Opens a directory browser from the current directory on port 1234
```
$ server
```

Opens a directory browser from the current directory on port 4321
```
$ server --port 4321
```

Opens a directory browser from the `Desktop` subdirectory on port 1234
```
$ server --browse Desktop
```

Opens a file downloader for the file `Package.swift` in the Desktop subdirectory on port 1234
```
$ server --file Desktop/Package.swift
```

Opens a directory browser from the root directory on port 46264. **Warning: this is a terrible idea, as any confidential files (tokens, keys) are publically accessible.** Share the smallest amount of your system that you need.
```
$ server --port 46264 --browse /
```

One full example, with expected output, for serving an HTML file called index.html in the enclosing directory, on port 1337.
<pre>
<strong><span class="text-danger">[sam]</span><span class="text-primary">(~/Desktop/samasaur1.github.io/projects)</span></strong>$ <kbd>server --html ../index.html --port 1337</kbd>
Server has started on port 1337. Try to connect now...

Others can do so by going to "10.0.1.83:1337" in a browser
^C
<strong><span class="text-danger">[sam]</span><span class="text-primary">(~/Desktop/samasaur1.github.io/projects)</span></strong>$</pre>

###### Notes:
* SimpleSwiftServer has plans for more modes to come (chat). [Create an issue](https://github.com/Samasaur1/SimpleSwiftServer/issues/new/choose) to request another mode.
* SimpleSwiftServer does not output received requests. This isn't a bug — it was a deliberate decision — but there's [an issue open](https://github.com/Samasaur1/SimpleSwiftServer/issues/8) to add a `--debug` flag to log some of this information. If you'd like that, please say so.
* Visit the [issues](https://github.com/Samasaur1/SimpleSwiftServer/issues) page to see the status of these issues.

### Uninstall
SimpleSwiftServer doesn't leave anything behind, so you can use the normal uninstall method:
<pre class="user-select-all">
<code><span class="user-select-none">$ </span>brew uninstall simpleswiftserver</code></pre>
<pre class="user-select-all">
<code><span class="user-select-none">$ </span>mint uninstall SimpleSwiftServer</code></pre>
<pre class="user-select-all">
<code><span class="user-select-none">$ </span>sudo rm /usr/local/bin/server</code></pre>
