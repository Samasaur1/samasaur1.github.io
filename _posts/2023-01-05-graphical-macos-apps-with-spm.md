---
layout: post
title: Graphical macOS Apps with the Swift Package Manager
tags:
- swift
- swift package manager
---
The [Swift Package Manager](https://www.swift.org/package-manager/) (SPM) is pretty great. You can use it to create libraries, command-line tools, and (since Xcode 11), SPM libraries can be used in apps submitted to Apple App Stores. However, it's not as trivial to make _true_ graphical apps without using Xcode, even if they're written in Swift using SPM.

First, let's take a look at what SPM outputs. I'll be using [my slideshow project](https://github.com/Samasaur1/slideshow) as an example. Given this `Package.swift` file:
```swift
// swift-tools-version: 5.7
// The swift-tools-version declares the minimum version of Swift required to build this package.

import PackageDescription

let package = Package(
    name: "slideshow",
    platforms: [.macOS(.v11)],
    dependencies: [
        // Dependencies declare other packages that this package depends on.
        // .package(url: /* package url */, from: "1.0.0"),
    ],
    targets: [
        // Targets are the basic building blocks of a package. A target can define a module or a test suite.
        // Targets can depend on other targets in this package, and on products in packages this package depends on.
        .executableTarget(
            name: "slideshow",
            dependencies: []),
        .testTarget(
            name: "slideshowTests",
            dependencies: ["slideshow"]),
    ]
)
```
we can see that the executable produced, which will be named `slideshow`, needs no dependencies and runs on macOS 11 (Big Sur) or later. We can produce this executable with either <kbd>swift build</kbd> or <kbd>swift build -c release</kbd> (the implied default is `-c debug`). The product can then be found in `.build/debug/slideshow` or `.build/release/slideshow`.

This is all well and good if you want to run the command-line tool, which _does_ pop up a graphical window. However, if you do so, you'll notice that whatever you do, you can't actually get the window that pops up to take focus. It _always_ has a grayed-out menu bar. In turn, this means that any code listening for key presses will never run, since the program is never focused and therefore never the first responder. To gain these bits of functionality, as well as the ability to have the slideshow _not_ always be the window on top, we need to bundle it in a macOS app.

While they look like a single file, macOS apps are actually a package — a folder with the `.app` extension, with (minimally) the following structure:
```
Slideshow.app/
└── Contents
    ├── Info.plist
    ├── MacOS
    │   └── slideshow
    └── _CodeSignature
        └── CodeResources
```
(yes, that folder is called `_CodeSignature`). In `Contents/MacOS` we see the actual executable that is run, in `Contents/_CodeSignature` the signature for the app is placed (we'll sign the app later in this article), and the `Contents/Info.plist` XML file provides things like the app's bundle identifier, icon, version, and display name (it can specify a lot more, but I went with the minimal `Info.plist` that worked).

My `Info.plist` ended up as:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleExecutable</key>
  <string>slideshow</string>
  <key>CFBundleIndentifier</key>
  <string>com.gauck.sam.slideshow</string>
  <key>CFBundleName</key>
  <string>Slideshow</string>
  <key>CFBundleShortVersionString</key>
  <string>1.0</string>
  <key>CFBundleDisplayName</key>
  <string>Slideshow</string>
  <key>CFBundleIconFile</key>
  <string>AppIcon</string>
</dict>
</plist>
```

It actually wasn't too hard to make this once I knew what I needed:
```
mkdir -p Slideshow.app/Contents/MacOS
cp .build/release/slideshow Slideshow.app/Contents/MacOS
cp Info.plist Slideshow.app/Contents
codesign --remove-signature Slideshow.app
codesign --force --deep --sign - Slideshow.app
```
Note that in the last line, specifying `--sign -` signs the application ad-how, which means that while it will run on the computer you signed it on, it won't be trusted anywhere else. If you have an Apple Developer account, you can replace the dash with your signing certificate (I found mine by opening Key chain Access, going to the login key chain, My Certificates, double-clicking on one, scrolling down to the bottom and using the SHE-1 hash (you'll need to remove the spaces). But unless you, like me, have somehow ended up with multiple certificates, you should be able to use any part of the Common Name). This will allow you to distribute apps to other people.

You can now double-click Slideshow.app and it will run! In the specific case of my slideshow app, it crashes immediately, because it expects that if it does not have a controlling try, then a list of files was passed to it via standard input. While double-clicking an application does not give it a standard input, we can do so using the `open(1)` command:
```
fd . ~/Desktop/Files/Pictures/ -e png -0 > f.f
open Slideshow.app --stdin f.f --stdout g.g --args 3 3 3
```

And of course, if your app doesn't require a TTY or standard input, you should just be able to double-click it normally.

***

It's also worth noting that this should work for any executable that opens a graphical window, not just Swift programs!

***

### Sources:
- [Alacritty's Makefile](https://github.com/alacritty/alacritty/blob/master/Makefile), which shows the commands they use to build their apps.
- [Alacritty's `Info.plist`](https://github.com/alacritty/alacritty/blob/master/extra/osx/Alacritty.app/Contents/Info.plist)
- [Gray's StackOverflow answer](https://apple.stackexchange.com/questions/224394/how-to-make-a-mac-os-x-app-with-a-shell-script)
- [user142019's StackOverflow answer](https://stackoverflow.com/questions/6323445/create-an-application-plist)
The last three sources helped me determine exactly which keys I needed in my `Info.plist`.
