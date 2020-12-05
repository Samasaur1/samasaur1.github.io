---
layout: project
title: Samasaur1 | Projects | Typer
sidebar:
  - title: Install
    children:
      - title: Requirements
      - title: Swift Package Manager
      - title: Ice
      - title: Xcode
  - title: Usage
---
# Typer
Type any text, indistinguishably from user input. Not detectable as automated.
### Install
##### Requirements
SwiftIP is a Swift Package (using [the Swift Package Manager](https://swift.org/package-manager/)), and does not support any other installation methods (you may be able to use some, such as installing manually, but I'm not explicitly supporting them).

You'll need Swift 4.0 or later (this version of Swift comes with Xcode 9 or later). I'd *strongly* recommend picking a newer version of Swift if you can, though.

To download Xcode, get it [from the Mac App Store](https://apps.apple.com/us/app/xcode/id497799835) or download it [from the Apple Developer portal](https://developer.apple.com/download/more/) (requires sign-in).

Alternatively, download Swift [from Swift.org](https://swift.org/download/), using Homebrew, swiftenv, or via some other method.
##### [Swift Package Manager](https://swift.org/package-manager/)
Add the following to your `Package.swift` file:
<div class="user-select-all">
{% highlight swift %}
.package(url: "https://github.com/Samasaur1/Typer.git", from: "1.2.0"),
{% endhighlight %}
</div>
{% comment %}
Roughly equivalent to this:
```swift
.package(url: "https://github.com/Samasaur1/SwiftIP.git", from: "2.0.0"),
```
but with user-select-all (you can't wrap a markdown code block in a div)
{% endcomment %}

##### [Ice](https://github.com/jakeheis/Ice)
```
ice add Samasaur1/Typer
```
##### Xcode
Swift Package Manager packages are only supported in Xcode 12+.
See [this link](https://developer.apple.com/documentation/xcode/adding_package_dependencies_to_your_app) for Apple's developer guide for using Swift packages with Xcode.
When asked to choose a package, paste in this url: `https://github.com/Samasaur1/Typer.git`, and we suggest you leave the package options as the default (Version, Up To Next Major, with the current version filled in).

### Usage
```swift
import Typer

Typer.type("Example text, typed at a natural rate")

Typer.type("Example text, typed at a consistent rate", typing: .consistent)

//Types the given text, with 1,000,000 µseconds (1 second) between each character,
//  varying by up to half a second.
//  It also prints the text as it is typed, and logs everything at a debug level.
Typer.type("Example text, typed with a lot of configuration",
  typing: .customVarying(µsecondBaseDelay: 1_000_000, maxVariance: 500_000),
  printAlongWith: true, debug: true)
```
There are currently no hosted docs, but the `Typer` class is well-documented, so your IDE should show you useful information.

###### Notes:
* The `.natural` typing rate has [an open issue](https://github.com/Samasaur1/Typer/issues/2) to make it less detectable.
* Typer uses AppleScript, when it could theoretically (potentially) use `CGEvent`s. This *might* allow it to run on non-Mac platforms.
* Visit the [issues](https://github.com/Samasaur1/Typer/issues) page to see the status of these issues.
