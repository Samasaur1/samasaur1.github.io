---
layout: post
title: Setting up SyncTeX with Neovim and Skim
tags:
- neovim
- latex
---
I have... a lot of feelings towards Neovim, but putting those aside for the time being, it's still my preferred LaTeX editor on my Mac.
What my LaTeX editing setup was missing[^1], though, was the ability to "jump to" a location in the output PDF from the code, or to jump to a location in the code by clicking on the PDF.
That capability is provided by [SyncTeX](https://tex.stackexchange.com/a/118491/251629), which causes the typesetting process to output a `doc.synctex.gz` file[^2] which, when read by a compatible editor/PDF viewer, contains location information to enable the jumping.

First: let's make sure we can typeset while using SyncTeX. Change <kbd>pdflatex log.tex</kbd> to <kbd>pdflatex -synctex=1 log.tex</kbd>. Ensure that a `log.synctex.gz` file is produced. From this point on, I'll assume this part works correctly. Regardless, that wasn't the difficult part, and isn't any good by itself: we need a compatible editor and viewer.

My LaTeX setup of Neovim & macOS's Preview.app didn't work on either end: Neovim doesn't support SyncTeX by default, and Preview.app doesn't support it at all.
Therefore I needed to replace Preview, and add integration to Neovim.

When we break down the requirements, here's what we get:
- The PDF viewer must
  - be able to accept a command from the editor and scroll to a specified point
  - be able to emit an event to the editor telling it to jump to a specified line
- The editor must
  - be able to accept a command from the viewer and jump to a specified line
  - be able to emit an event to the viewer telling it to scroll to a specified point

and something (the editor, the viewer, or an intermediary program) must be able to read the synctex file to convert between locations clicked in the PDF and lines in the tex file.

Since I can't patch Preview to add the ability to scroll to a point[^3], and _definitely_ can't patch it to emit events when a jump button is clicked/the PDF is Command-clicked, I replaced Preview with [Skim](https://skim-app.sourceforge.io).
Skim _does_ support SyncTeX, which is great! It handles reading the synctex file, has a bundled executable that scrolls the viewer, and even supports running a custom executable when the PDF is Shift-Command-clicked.
With that handled for me, all I needed to do is:
1. bind a keymap in Neovim to running Skim's bundled executable to scroll the viewer.
2. figure out how to tell Neovim to jump to a line, and make that an executable

The first step was actually quite easy, since I found [someone else's blog post](https://ka.ge/blog/2021/06/23/neovim-synctex-macos.html) on doing so. Essentially, Neovim lets you run external executables by typing <kbd>:!say hello</kbd> in normal mode, so once we know the path to Skim's bundled executable that scrolls the viewer (which I also learned about from that blog post), you can simply run <kbd>!/Applications/Skim.app/Contents/SharedSupport/displayline &lt;C-r&gt;=line('.')&lt;CR&gt; %<.pdf</kbd> to have Skim jump to the point in the PDF corresponding to the current line.

If you're curious, in Neovim, when in insert mode, `<C-r>` --- a.k.a. Control-r --- allows you to pick a register and insert the contents of that register at the cursor. Generally, that register would be something like a named register, the default register `"`, or the system clipboard `+`. But you can also pick `=`, the "expression register", which then allow you to type an expression and insert the result of that expression. `line('.')` outputs the current line. At the same time, `%<` is the current file name without extension, which then has `.pdf` appended to it, telling Skim which document to scroll in and which line to scroll to.

I bound it to <kbd>&lt;leader&gt;lj</kbd>, and added `:silent` as was done on the blog I found, so that I don't see the output of running the script. I wanted this shortcut to only exist when I was working on TeX files, so I created `~/.config/nvim/ftplugin/tex.lua` and put these as the contents:
```lua
local opts = { noremap = true, silent = true }

vim.api.nvim_buf_set_keymap(0, 'n', '<leader>lj', ":silent !/Applications/Skim.app/Contents/SharedSupport/displayline <C-r>=line('.')<CR> %<.pdf<CR>", opts)
```
As I'm actively writing this blog post, though, I noticed that `silent` is set in both the options and the command itself, so I'm changing the contents of that file to
```lua
local opts = { noremap = true, silent = true }

vim.api.nvim_buf_set_keymap(0, 'n', '<leader>lj', "!/Applications/Skim.app/Contents/SharedSupport/displayline <C-r>=line('.')<CR> %<.pdf<CR>", opts)
```
Tested it a few times with a few documents and a few lines, and it works! yay!

***

Now the hard part: Going from Skim to Neovim. If you pop open Skim's preferences and go to the last tab, here's what I saw as a default:
![default skim sync preferences panel]({{ "/assets/images/blog/setting-up-synctex-with-neovim-and-skim/skim-sync-panel-default.png" | relative_url }})

None of the presets were for Neovim, so I went with Custom. Then, just to make sure that it was working, I set the Command to `say` and the Arguments to `jumping to line %line in "%file"`, Shift-Command-clicked somewhere in the PDF I was testing with, and heard my computer speak to me.
Then I tried setting the Command to a shell script like this:
```sh
say Using shell script
say "$@"
```
and it didn't work, so I concluded that Skim wouldn't work with non-binary files[^4]. **However, I just tested again, and the above file works fine.** So if you need to/prefer to use a shell script, go for it.

That said, since I thought I needed an executable, that's what I went with.

I needed an executable that would jump to the given line in whichever Neovim instance was editing the given file. Fortunately, Neovim has a Msgpack-RPC API that lets you execute commands on previously running instances, if you can find the sockets that it sets up.

By default, Neovim sockets are put in `$XDG_RUNTIME_DIR/nvim.<PID>.<SESSION>`[^5]. Unfortunately for me, I'm on a Mac, so I don't have `$XDG_RUNTIME_DIR` set by default, and I"m stubborn, so I haven't set it myself[^6].
After more looking through the source code, it appears that on macOS, neovim sockets are put in `$TMPDIR/nvim.<USER>/*/nvim.<PID>.<SESSION>`. For example, the address of the Neovim session I'm currently writing this in is `/var/folders/c8/63pzn5sj1bgfffdyr7z88hxr0000gn/T/nvim.sam/dWWS8R/nvim.10842.0`.

I have many thoughts and feelings about the various ways that you can find and connect to these sockets. You can tell Neovim where to place this socket by setting `$NVIM_LISTEN_ADDRESS` in the environment (deprecated), or pass the `--listen` flag to Neovim when you start it. Neither of those seem nice to me, because you'd have to do it every time you start Neovim. And since I refuse to set `$XDG_RUNTIME_DIR`, that means that whatever executable I come up with has to find the sockets. (this rules out [neovim-remote](https://github.com/mhinz/neovim-remote))

Fortunately, I'm aware of the wonderful tool [nvim-ctrl](https://github.com/chmln/nvim-ctrl). I had used it before to great success --- it finds all open neovim sockets, and executes the given command on all of them. Unfortunately, it no longer works: it runs fine, but no commands are executed. Fortunately, however, having just read the Neovim source code to really understand where the sockets are placed, the problem wasn't too difficult to find.

```rust
use anyhow::Result;
use neovim_lib::{Neovim, NeovimApi, Session};
use structopt::StructOpt;

#[derive(StructOpt)]
#[structopt(about = "Control nvim from the CLI!")]
struct Control {
    /// run an arbitrary command
    cmd: String,
}

fn main() -> Result<()> {
    let args = Control::from_args();
    let tmp = std::env::var("TMPDIR").unwrap_or("/tmp".to_owned());

    match std::fs::read_dir(tmp) {
        Ok(dir) => dir
            .filter_map(|f| f.ok())
            .filter(|f| {
                let is_dir =
                    matches!(f.file_type().map(|t| t.is_dir()), Ok(true));
                let name_heuristic =
                    f.file_name().to_string_lossy().starts_with("nvim");
                is_dir && name_heuristic
            })
            .filter_map(|dir| {
                Some(
                    std::fs::read_dir(dir.path())
                        .ok()?
                        .filter_map(Result::ok)
                        .map(|d| d.path()),
                )
            })
            .flatten()
            .filter_map(|d| Session::new_unix_socket(d).ok())
            .map(|mut session| {
                session.start_event_loop();
                Neovim::new(session)
            })
            .for_each(|mut nvim| {
                let _ = nvim
                    .command(&args.cmd)
                    .map_err(|e| eprintln!("Error: {}", e));
            }),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(()),
        Err(e) => Err(e)?,
    }

    Ok(())
}
```
became
```rust
use anyhow::Result;
use neovim_lib::{Neovim, NeovimApi, Session};
use structopt::StructOpt;

#[derive(StructOpt)]
#[structopt(about = "Control nvim from the CLI!")]
struct Control {
    /// run an arbitrary command
    cmd: String,
}

fn main() -> Result<()> {
    let args = Control::from_args();
    let tmp = std::env::var("TMPDIR").unwrap_or("/tmp".to_owned());

    match std::fs::read_dir(tmp) {
        Ok(dir) => dir
            .filter_map(|f| f.ok())
            .filter(|f| {
                let is_dir =
                    matches!(f.file_type().map(|t| t.is_dir()), Ok(true));
                let name_heuristic =
                    f.file_name().to_string_lossy().starts_with("nvim");
                is_dir && name_heuristic
            })
            .filter_map(|dir| {
                Some(
                    std::fs::read_dir(dir.path())
                        .ok()?
                        .filter_map(Result::ok)
                        .map(|d| d.path()),
                )
            })
            .flatten()
            .filter_map(|dir| {
                Some(
                    std::fs::read_dir(dir)
                        .ok()?
                        .filter_map(Result::ok)
                        .map(|d| d.path()),
                )
            })
            .flatten()
            .filter_map(|d| Session::new_unix_socket(d).ok())
            .map(|mut session| {
                session.start_event_loop();
                Neovim::new(session)
            })
            .for_each(|mut nvim| {
                let _ = nvim
                    .command(&args.cmd)
                    .map_err(|e| eprintln!("Error: {}", e));
            }),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(()),
        Err(e) => Err(e)?,
    }

    Ok(())
}
```
A simple difference of
```diff
diff --git a/src/main.rs b/src/main.rs
index aeeeafd..6da21c9 100644
--- a/src/main.rs
+++ b/src/main.rs
@@ -32,6 +32,15 @@ fn main() -> Result<()> {
                 )
             })
             .flatten()
+            .filter_map(|dir| {
+                Some(
+                    std::fs::read_dir(dir)
+                        .ok()?
+                        .filter_map(Result::ok)
+                        .map(|d| d.path()),
+                )
+            })
+            .flatten()
             .filter_map(|d| Session::new_unix_socket(d).ok())
             .map(|mut session| {
                 session.start_event_loop();
```
It was just missing code to get past the directory of random letters between `nvim.<USER>` and the actual socket.

This is great in general, because this tool has come in handy for me in other ways, but it's not exactly what we need in this case, because we want our executable to only scroll in the given file. So I duplicated this project and changed it to this:
```rust
use std::{path::PathBuf, process::CommandArgs};

use anyhow::Result;
use neovim_lib::{Neovim, NeovimApi, Session};
use structopt::StructOpt;

#[derive(StructOpt)]
#[structopt(about = "Control nvim from the CLI!")]
struct Control {
    file: String,
    line: String,
}

fn main() -> Result<()> {
    let args = Control::from_args();
    let tmp = std::env::var("TMPDIR").unwrap_or("/tmp".to_owned());

    let fullfile = std::fs::canonicalize(args.file.clone()).unwrap();

    match std::fs::read_dir(tmp) {
        Ok(dir) => dir
            .filter_map(|f| f.ok())
            .filter(|f| {
                let is_dir =
                    matches!(f.file_type().map(|t| t.is_dir()), Ok(true));
                let name_heuristic =
                    f.file_name().to_string_lossy().starts_with("nvim");
                is_dir && name_heuristic
            })
            .filter_map(|dir| {
                Some(
                    std::fs::read_dir(dir.path())
                        .ok()?
                        .filter_map(Result::ok)
                        .map(|d| d.path()),
                )
            })
            .flatten()
            .filter_map(|dir| {
                Some(
                    std::fs::read_dir(dir)
                        .ok()?
                        .filter_map(Result::ok)
                        .map(|d| d.path()),
                )
            })
            .flatten()
            .filter_map(|d| Session::new_unix_socket(d).ok())
            .map(|mut session| {
                session.start_event_loop();
                Neovim::new(session)
            })
            .for_each(|mut nvim| {
                let bufname = nvim.get_current_buf().unwrap().get_name(&mut nvim).unwrap();
                let fullbufname = std::fs::canonicalize(bufname).unwrap();
                if fullbufname == fullfile {
                    let _ = nvim
                        .command(&args.line)
                        .map_err(|e| eprintln!("Error: {}", e));
                }
            }),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(()),
        Err(e) => Err(e)?,
    }
    Ok(())
}
```
You'll notice that a lot of this looks identical, and that's because it is. What changed? We take a `file` and a `line` instead of a command:
```rust
struct Control {
    file: String,
    line: String,
}
```
we get the absolute file path of the file:
```rust
let fullfile = std::fs::canonicalize(args.file.clone()).unwrap();
```
and then for each Neovim instance, we first check if the current buffer is the file we want to jump in, and if so, we scroll to the given line:
```rust
.for_each(|mut nvim| {
    let bufname = nvim.get_current_buf().unwrap().get_name(&mut nvim).unwrap();
    let fullbufname = std::fs::canonicalize(bufname).unwrap();
    if fullbufname == fullfile {
        let _ = nvim
            .command(&args.line)
            .map_err(|e| eprintln!("Error: {}", e));
    }
}),
```

And this just works! Compile, put the binary in a static location, put that path in the Skim dialog (for me `/Users/sam/.local/bin/nvim-line-jumper`, and set the Arguments option to `"%file" %line`. Go ahead and shift-command-click with abandon.

Obviously there are more things to be done for this program. First would be error handling, as there is a frightening amount of `unwrap()` calls in the Rust code above. Ideally this would be able to scroll buffers that aren't the current buffer, but the Neovim API doesn't support that directly, and the function that lets you temporarily treat another buffer as the active buffer doesn't work over RPC.

[^1]: as compared to [Overleaf](https://www.overleaf.com), which is how I used to work on LaTeX documents
[^2]: assuming a `doc.pdf` output; we could also say that the SyncTeX file is `<filename>.synctex.gz`
[^3]: it _might_ be possible to get Preview to scroll with AppleScript, but it a) would be a pain; b) doesn't solve the other problem
[^4]: yes, I did try with a shebang. I'm still unsure what the problem was when I originally tested it, but it doesn't really matter anymore
[^5]: the session always seems to be `0`. I've literally _never_ seen it be anything else, but I perused the source code, and apparently it's not hardcoded to `0`, so _something's_ going on there.
[^6]: I think there was a good reason I decided not to set `$XDG_RUNTIME_DIR` originally, and even though I've now forgotten it, I'm trusting my past self.
