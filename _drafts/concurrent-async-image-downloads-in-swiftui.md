---
layout: post
title: 'Concurrent AsyncImage downloads in SwiftUI'
# date: 2024-05-31 19:27 -0700
tags:
- swift
- swiftui
---
Since iOS 15 in 2021, SwiftUI has provided the [`AsyncImage` view](https://developer.apple.com/documentation/swiftui/asyncimage), which is a super-handy way to fetch and display images from remote URLs. It's as e
asy as:

```swift
struct ContentView: View {
    var body: some View {
        AsyncImage(url: URL(string: "https://samasaur1.github.io/assets/images/icons/favicon.ico"))
    }
}
```

and you'll see a placeholder image while the URL is fetched in the background, which is then replaced with the actual image once it is downloaded.

There's a lot of customization you can do --- I often find myself doing this:

```swift
struct ContentView: View {
    var body: some View {
        AsyncImage(url: URL(string: "https://samasaur1.github.io/assets/images/icons/favicon.ico")) {
            image.resizable().scaledToFit()
        } placeholder: {
            ProgressView()
        }
    }
}
```

which will use a spinner as the placeholder instead of a gray rectangle, and will scale up the image to the largest size that fits in the enclosing view.

***

### the problem

In this post, we're going to focus on a specific use case, where you are only showing one image at a time, but there's an entire list of images that you want to show in sequence. Although you can use `AsyncImage` for this, each image will wait to start loading until it appears ... which means that there is a delay after every time you swap between images, while the new image is downloaded. I wanted to avoid this by downloading the next two images after the current one, so that delays are minimized.

{:.callout.callout-note}
> ##### Ordering and Concurrency
> In my use case, it wasn't super important for the images to appear in any specific order, so my solution **does not** guarantee that they do appear in the order they are given. That said, anecdotally I would say that the only time that images appear out of order is in the first _n_ pictures, where _n_ is the depth of your queue.
>
> Regardless, I may address this shortcoming at some point in the future.
<!-- > When you start dealing with concurrent code, you need to make sure that everything happens in the right order.  -->

### what we're starting with

Here's the version of this view using `AsyncImage`, where only one image is downloaded at a time:

```swift
struct ContentView: View {
    @State var urls: [URL]
    @State var index = 0

    init(urls: [URL]) {
        self._urls = State(wrappedValue: urls)
    }

    var body: some View {
        VStack {
            Button {
                self.index += 1
            } label: {
                Text("Next Image")
            }
            AsyncImage(url: urls[index]) { image in
                image.resizable().scaledToFit()
            } placeholder: {
                ProgressView()
            }
        }
    }
}
```

<!--
{:.callout.callout-info}
> ##### What's going on with that initializer?
> 
-->

If you stick this in an app and run it<!--  (making sure to fill in the list of URLs) -->, you'll notice that a loading icon appears after every time you advance images, before the next image appears.

{:.callout.callout-error}
> ##### Sample code and simplicity
> In the interest of making sample code clear and easy to understand, I've left out important safety checks.
> For example, this view doesn't check whether the index is in range, so the app will crash when you run out of images.
> I'll try to note these omissions, but just be aware that the code listings I provide are not complete apps.

### the solution

We could probably do this directly inside a view using a bunch of `@State` variables, but it's nicer to wrap this up inside an `ObservableObject`[^observableobject] class. Let's start by designing what we want the interface of that class to look like, which we'll do by writing the view:

[^observableobject]: Apple is currently changing how state is observed in SwiftUI, from the `ObservableObject` protocol to the `Observable` macro. It seems like this will also include the removal of the `@ObservedObject`, `@StateObject`, `@EnvironmentObject`, and possibly even `@State` property wrappers. This is a big change and it's exciting, but I'm not super familiar with it yet, so I'm sticking with `ObservableObject` for now. If you're interested, you can read more [here](https://developer.apple.com/documentation/Observation).

#### the view

```swift
struct ContentView: View {
    @StateObject var downloader: Downloader

    init(urls: [URL]) {
        self._downloader = StateObject(wrappedValue: Downloader(urls))
    }

    var body: some View {
        VStack {
            Button {
                downloader.next()
            } label: {
                Text("Next Image")
            }
            switch downloader.state {
            case .ready:
                Image(downloader.image!)
                    .resizable()
                    .scaledToFit()
            case .loading:
                ProgressView()
            }
        }
    }
}
```

As you can see, I've designed it so that you create a `@StateObject`[^statevsobservedobject] variable that holds a `Downloader`. It exposes two variables, `image` (the data of the image) and `state` (the current state of the image at the front of the queue), and one method, `next()`, which advances to the next image. That's really all it needs to make `public`ly available.

[^statevsobservedobject]: When I was originally trying to do this, I used `@ObservedObject` instead of `@StateObject`, but for some reason I was only able to see the first _n_ images, repeating indefinitely, in no particular order. I eventually realized that the issue was that the `Downloader` was being recreated every time the view changed, which meant that it would forget its state, re-send off requests for the first _n_ images, and show whichever one arrived first, before repeating the process indefinitely. The root cause was due to the fact that `@ObservedObject` is for objects which are not the source of truth (i.e., are passed in from elsewhere) — comparable to `@Binding`. Using `@StateObject` instead (the parallel of `@State`) tells SwiftUI to create one `Downloader` instance and "reconnect" it to the view every time it updates, allowing it to persist state.

A couple notes before we look at the implementation of the `Downloader` class:
- Note that the `image` property is optional and force-unwrapped here. This is how I decided to handle the state when the current image is still being downloaded, though there are alternative possible approaches. I'll talk about some possibilities in the [room for improvement section](#room-for-improvement).
- What happens when the downloader is done with all the images? I've left it out of the simplified example above, but in my current implementation, I have the `next()` method return a `Bool` indicating whether there are still more images to display. Again, there are other ways to handle this, which will be discussed in the [room for improvement section](#room-for-improvement).
- Constructing a SwiftUI `Image` from the `image` property (which is of type `Data`[^optionaldata]) requires an extension on `Image`, which can be found [here](#extensions).

[^optionaldata]: Yes, technically it is of type `Data?`. You understood what I meant.

#### the downloader

##### initial idea

Typically when you're writing an `ObservableObject` class, it will have some combination of these three things:
- `@Published` variables that are used by the view
- private variables that represent the internal state of the object
- methods that allow the view to change the state of the object

Based on this experience, my initial idea was to have something like this:

```swift
class Downloader: ObservableObject {
    enum State {
        case ready, loading
    }

    @Published var image: Data?
    @Published var state: State

    private let urls: [URL]

    init(urls: [URL]) {
        self.urls = urls

        // Kick off n background download tasks
    }

    @discardableResult func next() -> Bool {
        self.state = .loading
        self.image = nil

        // Kick off another background download task
    }
}
```

I could live with the fact that editing `image` and `state` sends multiple view updates when only one is required, but the issue is how to store the queued images. I considered having _n_ private image/state variable combos, like so:
```swift
private var queuedImage1: Data?
private var queuedState1: State
private var queuedImage2: Data?
private var queuedState2: State
private var queuedImage3: Data?
private var queuedState3: State
```
but then a) the value of _n_ is irritating and/or difficult to change; b) the background download tasks need to coordinate which spots are empty; c) the logic for updating the `@Published` variables and clearing out the spots becomes complex as well.

##### idea number two

```swift
@Published var image: Data? {
    imageArray[idx]
}
@Published var state: State {
    stateArray[idx]
}
```
You can't apply `@Published` to computed properties.[^wrappedcomputedproperties]

[^wrappedcomputedproperties]: In retrospect, if you've ever implemented a property wrapper, this makes total sense. In this specific case, I still wish it were possible, since the only part of `@Published` I'm using is that it _essentially_ calls `objectWillChange.send()` inside `willSet`. There's more details on how `@Published` actually triggers an update [here](https://www.swiftbysundell.com/articles/accessing-a-swift-property-wrappers-enclosing-instance/).

##### using a backing array

Just because I can't combine `@Published` and computed properties doesn't mean that I can't use an array for storage. 

{:.callout.callout-note}
> ##### ordering and concurrency, part 2
> If I wanted to maintain strict ordering of the list of images, then I would use an array instead.
> It would actually be pretty easy — you're essentially just mapping the list of URLs to a list of `Data`, and when you kick off a background task you use the same index for fetching the URL out of the URL array as you do for storing the downloaded `Data` in the data array.

##### what i'm doing is basically a queue anyway

#### extensions

As I mentioned above, `Image` needs an extension to be initialized from `Data`. Here it is:

```swift
import Foundation
import SwiftUI
#if canImport(AppKit)
import AppKit
#elseif canImport(UIKit)
import UIKit
#endif

extension Image {
    /// Initializes a SwiftUI `Image` from data.
    init?(data: Data) {
        #if canImport(AppKit)
        if let nsImage = NSImage(data: data) {
            self.init(nsImage: nsImage)
        } else {
            return nil
        }
        #elseif canImport(UIKit)
        if let uiImage = UIImage(data: data) {
            self.init(uiImage: uiImage)
        } else {
            return nil
        }
        #else
        return nil
        #endif
    }
}
```

### room for improvement

- I don't like having to force-unwrap `downloader.image`
    - Maybe have `downloader.view` let you do something similar to `AsyncImage` where you write a closure that takes a real image.
    - Or we could remove `state` entirely and just have it be optional, and then you `if-let` it.
- indicating that the downloader is done
    - have another state, `.finished`?
    - what happens when you call `next()` if you are done? I don't want to `fatalError()` as I am doing right now.
- the _number_ of queued images and the number of download tasks do not need to be the same. For example, we could have 3 queued images but only 2 download tasks going at the same time. This would smooth out the curve at initial startup. probably doesn't have a huge impact, though.

{:.callout.callout-note}
> ##### ordering and concurrency, the final part
> In practice, almost every image fetched in order anyway (so long as you take longer looking at each individual image than it takes to fetch an image). 
> Because of this, it's probably worth the possible slight delay to just do it in order using an array instead of a queue.
