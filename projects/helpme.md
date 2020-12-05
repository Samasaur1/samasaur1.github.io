---
layout: project
title: Samasaur1 | Projects | helpme
sidebar:
  - title: Install
    children:
      - title: Requirements
      - title: Homebrew
      - title: Manual Install
  - title: Usage
  - title: Uninstall
---
# helpme
Let past you help future you out. Keep track of configuration and more with command-line tidbits.
### Install
##### Requirements
helpme is a collection of scripts that are interpreted using Python 3. They expect to find a version of Python 3 under `/usr/local/bin/python3`. If you have Python 3 installed anywhere else, you can create a symlink (assuming your Python is at `/usr/local/bin/python`):
```
$ ln -s /usr/local/bin/python /usr/local/bin/python3
```
It's possible that that command will require `sudo` on your system. If it does, you can run `sudo !!` to re-run the previous command using `sudo`.

##### [Homebrew](https://brew.sh/)
Hopefully soon to come ([issue link](https://github.com/Samasaur1/helpme/issues/2))
{% comment %}
Installation:
<pre class="user-select-all">
<code><span class="user-select-none">$ </span>brew install Samasaur1/core/helpme</code></pre>
Updating:
<pre class="user-select-all">
<code><span class="user-select-none">$ </span>brew upgrade helpme</code></pre>
{% endcomment %}
##### Manual Install
Installation & updating:
```
$ git clone https://github.com/Samasaur1/helpme.git
$ cd helpme
$ sh install.sh
```
If you didn't have anything in `~/.bash_completion.d`, you probably aren't sourcing the completion files.<br/>
To do so, add the following line to your `~/.bash_profile` (or equivalent):
```
source .bash_completion
```
and add this script to your home directory as `.bash_completion`:
```bash
for bcfile in ~/.bash_completion.d/* ; do
  source $bcfile
done
```

### Usage
List all helpmes:
```
$ helpme-list
gradle-offline-mode
captivenetwork
open-ports
dnd
java-versions
time
dictionaries
launchd
gem
gcc-include-path
cron
homebrew-broken
do-not-disturb
```
Read a helpme:
<pre>
$ helpme <kbd>&lt;tab&gt;</kbd>
captivenetwork       gcc-include-path     launchd
cron                 gem                  open-ports
dictionaries         gradle-offline-mode  time
dnd                  homebrew-broken      Xample
do-not-disturb       java-versions
$ helpme <kbd>Xample</kbd>
An example helpme.</pre>
Create a helpme. `helpme-create [TOPIC]`. You can also pass `--textedit`, `--vim`, `--nano`, or any of the short forms (`-t`, `-v`, `-n`) to use the specified editor. The default is TextEdit.
```
$ helpme-create example
```
Remove a helpme. This command will autocomplete to your existing helpmes. It will fail (exit code 1) if the given helpme does not exist.
```
$ helpme-delete example
```
Edit an existing helpme. `helpme-edit [TOPIC]`. You can choose any of the editors listed in `helpme-create`. It will not fail if the given helpme does not exist, but while Vim and Nano will create the topic, TextEdit will not (although it will still exit successfully (exit code 0)).
```
$ helpme-edit example
```

###### Notes:
* helpme is not yet on Homebrew. That is planned, however ([issue link](https://github.com/Samasaur1/helpme/issues/2)).
* `helpme-create` and `helpme-edit` do **not** parse command line options correctly. They currently require that the topic be the first argument, and that the flags (if any) are passed after that. The also allow multiple flags, choosing in the following order:
  1. If there is a `--textedit` or `-t` flag, use TextEdit.
  2. If there is a `--vim` or `-v` flag, use Vim.
  3. If there is a `--nano` or `-n` flag, use Nano.
  4. Otherwise, use TextEdit.
* The behavior of `helpme-edit` varies based on the editor you use. Vim and Nano will create nonexisting files, while TextEdit will not. This should be standardized.
* There is nonstandard behavior when the topic does not exist. For one example, see above. The others are `helpme-delete`, `helpme`, and `helpme-create`. They should be standardized across exit code and behavior.
* It should be clearer how to update helpme.
* It should be easier to uninstall helpme (without having to redownload the repository).
* Visit the [issues](https://github.com/Samasaur1/helpme/issues) page to see the status of these issues.

### Uninstall
helpme generates files, but comes with an uninstall script:
{% comment %}
<pre class="user-select-all">
<code><span class="user-select-none">$ </span>brew uninstall repl</code></pre>
{% endcomment %}

<pre>
$ git clone https://github.com/Samasaur1/helpme.git
$ cd helpme
$ sh uninstall.sh
Are you sure you want to uninstall helpme? (y/N) <kbd>y</kbd>
OK, removing scripts from /usr/local/bin/
...done

Removing completion script from ~/.bash_completion.d
...done

Do you also want to delete your helpmes (stored in ~/.helpme)? (y/N) <kbd>n</kbd>
OK, keeping them

Uninstalled
</pre>
