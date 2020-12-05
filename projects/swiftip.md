---
layout: project
title: Samasaur1 | Projects | SwiftIP
sidebar:
  - title: Install
    children:
      - title: Requirements
      - title: Swift Package Manager
      - title: Ice
      - title: Xcode
  - title: Usage
---
# SwiftIP
IP addresses in Swift — public or local, IPv4 or IPv6.
### Install
##### Requirements
SwiftIP is a Swift Package (using [the Swift Package Manager](https://swift.org/package-manager/)), and does not support any other installation methods (you may be able to use some, such as installing manually, but I'm not explicitly supporting them).

You'll need Swift 4.2 or later (this version of Swift comes with Xcode 10 or later). I'd recommend picking a newer version of Swift if you can, though.

To download Xcode, get it [from the Mac App Store](https://apps.apple.com/us/app/xcode/id497799835) or download it [from the Apple Developer portal](https://developer.apple.com/download/more/) (requires sign-in).

Alternatively, download Swift [from Swift.org](https://swift.org/download/), using Homebrew, swiftenv, or via some other method.
##### [Swift Package Manager](https://swift.org/package-manager/)
Add the following to your `Package.swift` file:
<div class="user-select-all">
{% highlight swift %}
.package(url: "https://github.com/Samasaur1/SwiftIP.git", from: "2.0.0"),
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
ice add SwiftIP
```
##### Xcode
Swift Package Manager packages are only supported in Xcode 12+.
See [this link](https://developer.apple.com/documentation/xcode/adding_package_dependencies_to_your_app) for Apple's developer guide for using Swift packages with Xcode.
When asked to choose a package, paste in this url: `https://github.com/Samasaur1/SwiftIP.git`, and we suggest you leave the package options as the default (Version, Up To Next Major, with the current version filled in).

### Usage
```swift
import SwiftIP

guard let localIP = IP.local() ?? IP.local(.IPv6) else {
    fatalError("Could not find local IP, you are not connected to a network.")
}

let publicIP: String? = IP.public() ?? IP.public(.IPv6)

print("Local IP: \(localIP); public IP: \(publicIP ?? "Not connected to the Internet")")
```
The docs are available here: [https://samasaur1.github.io/SwiftIP/](https://samasaur1.github.io/SwiftIP/).

###### Notes:
* SwiftIP uses [icanhazip.com](icanhazip.com) to check your public IP address. I'd like to switch to [ipify.org](ipify.org), or ideally, check both. There's [an issue for that](https://github.com/Samasaur1/SwiftIP/issues/6).
* The public IP call has an unconfigurable timeout of 5 seconds.
* Visit the [issues](https://github.com/Samasaur1/SwiftIP/issues) page to see the status of these issues.
